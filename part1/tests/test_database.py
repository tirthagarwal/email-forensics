"""
test_database.py
================
Comprehensive unit and integration tests for Email Forensics Database Layer:
  - Database initialization & schema creation.
  - Normalized 9-table schema verification.
  - JSON-to-database dynamic importer execution.
  - Idempotency & duplicate prevention.
  - Foreign-key cascading & relationships.
  - Data privacy & security checks (no TLS keylogs, no email bodies).
  - Single-PCAP vs Multi-PCAP scope ingestion.
  - Repository / Service query layer.
"""

import sys
import json
import pytest
from pathlib import Path
from sqlalchemy import inspect

SRC_DIR = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from database import DatabaseManager, init_db
from db_models import (
    Base,
    AnalysisRun,
    Capture,
    EmailSession,
    TLSSession,
    Certificate,
    CryptographicFeature,
    Finding,
    MLResult,
    RiskAssessment,
)
from db_service import ForensicDataService
from db_importer import ReportImporter, import_report_file


@pytest.fixture
def memory_db():
    """Provides a fresh in-memory SQLite database manager for isolated testing."""
    mgr = DatabaseManager("sqlite:///:memory:")
    mgr.init_db()
    return mgr


@pytest.fixture
def master_report_data():
    """Loads the verified 4-PCAP master forensic report."""
    rep_path = Path(__file__).parent.parent / "output" / "forensic_report.json"
    if not rep_path.exists():
        pytest.skip("forensic_report.json not found — run pipeline first.")
    with open(rep_path, "r", encoding="utf-8") as f:
        return json.load(f)


class TestDatabaseInitialization:
    """Verifies database initialization and table metadata creation."""

    def test_database_initialization(self, memory_db):
        inspector = inspect(memory_db.engine)
        tables = inspector.get_table_names()
        assert len(tables) >= 9

    def test_schema_tables_exist(self, memory_db):
        inspector = inspect(memory_db.engine)
        table_names = set(inspector.get_table_names())
        expected_tables = {
            "analysis_runs",
            "captures",
            "email_sessions",
            "tls_sessions",
            "certificates",
            "cryptographic_features",
            "findings",
            "ml_results",
            "risk_assessments",
            "model_registry",
        }
        assert expected_tables.issubset(table_names), f"Missing tables: {expected_tables - table_names}"


class TestDatabaseImporter:
    """Tests the JSON-to-database importer with the master 4-PCAP report."""

    def test_import_master_report_counts(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)

            srv = ForensicDataService(session)
            captures = srv.get_captures_for_run(run.id)
            sessions = srv.get_email_sessions_for_run(run.id)
            tls_sessions = srv.get_tls_sessions_for_run(run.id)
            certificates = srv.get_certificates_for_run(run.id)
            findings = srv.get_findings_for_run(run.id)
            ml_results = srv.get_ml_results_for_run(run.id)
            crypto_feats = srv.get_crypto_features_for_run(run.id)

            assert len(captures) == 4, f"Expected 4 captures, got {len(captures)}"
            assert len(sessions) == 4, f"Expected 4 email sessions, got {len(sessions)}"
            assert len(tls_sessions) == 3, f"Expected 3 TLS sessions, got {len(tls_sessions)}"
            assert len(certificates) == 3, f"Expected 3 certificates, got {len(certificates)}"
            assert len(findings) == 6, f"Expected 6 findings, got {len(findings)}"
            assert len(ml_results) == 4, f"Expected 4 ML results, got {len(ml_results)}"
            assert len(crypto_feats) == 4, f"Expected 4 crypto feature rows, got {len(crypto_feats)}"

    def test_risk_score_and_metrics_integrity(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)

            srv = ForensicDataService(session)
            summary = srv.get_run_summary_dict(run.id)

            assert abs(summary["overall_risk_score"] - 32.38) < 0.05
            assert abs(summary["baseline_score"] - 18.5) < 0.05
            assert abs(summary["cryptographic_score"] - 13.88) < 0.05
            assert summary["risk_level"] == "LOW"
            assert summary["analysis_scope"] == "MULTI_PCAP"
            assert summary["protocols"] == ["IMAP", "POP3", "SMTP"]

    def test_idempotency_prevents_duplicate_runs(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run1 = importer.import_report(master_report_data, overwrite_existing=False)
            run2 = importer.import_report(master_report_data, overwrite_existing=False)

            srv = ForensicDataService(session)
            runs = srv.list_analysis_runs()

            assert len(runs) == 1, f"Expected 1 run, got {len(runs)}"
            assert run1.id == run2.id
            assert run1.run_uuid == run2.run_uuid

    def test_overwrite_updates_existing_run(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run1 = importer.import_report(master_report_data, overwrite_existing=False)
            run2 = importer.import_report(master_report_data, overwrite_existing=True)

            srv = ForensicDataService(session)
            runs = srv.list_analysis_runs()

            assert len(runs) == 1
            assert run2.run_uuid == run1.run_uuid


class TestDataPrivacyAndSecurity:
    """Verifies that no secrets or raw message payloads are persisted."""

    def test_no_tls_keylog_secrets_stored(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)

            # Query all table rows and verify no keylog string tokens exist
            secret_tokens = ["CLIENT_RANDOM", "CLIENT_HANDSHAKE_TRAFFIC_SECRET", "SERVER_HANDSHAKE_TRAFFIC_SECRET"]
            for table_cls in (AnalysisRun, Capture, EmailSession, TLSSession, Certificate, CryptographicFeature, Finding, MLResult):
                rows = session.query(table_cls).all()
                for row in rows:
                    for col in row.__table__.columns.keys():
                        val = getattr(row, col)
                        if isinstance(val, str):
                            for token in secret_tokens:
                                assert token not in val, f"Leaked keylog token '{token}' in {table_cls.__name__}.{col}"

    def test_no_email_message_bodies_stored(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)

            sessions = session.query(EmailSession).all()
            for s in sessions:
                # Table columns should not have body or message payload fields
                col_names = s.__table__.columns.keys()
                assert "body" not in col_names
                assert "message" not in col_names
                assert "raw_payload" not in col_names


class TestScopeAndRelationshipIntegrity:
    """Tests single vs multi-PCAP scope handling and foreign-key integrity."""

    def test_single_pcap_import(self, memory_db):
        single_pcap_report = {
            "report_metadata": {"version": "1.0.0", "generated_at": "2026-09-28T12:00:00Z"},
            "pcap": {"total_pcaps": 1, "files_analyzed": ["part1/pcaps/smtp_test.pcap"], "analyzed_at": "2026-09-28T12:00:00Z"},
            "summary": {
                "total_pcaps": 1,
                "total_sessions": 1,
                "total_findings": 1,
                "baseline_score": 20.0,
                "cryptographic_score": 0.0,
                "overall_risk_score": 20.0,
                "risk_level": "LOW",
                "total_ml_anomalies": 1,
            },
            "email_sessions": [{"uid": "C_smtp_test", "protocol": "SMTP", "tls_established": False}],
            "connections": [{"uid": "C_smtp_test", "pcap_source": "smtp_test.pcap", "source": "192.168.1.1:50000", "destination": "192.168.1.2:25"}],
            "tls_sessions": [],
            "certificates": [],
            "cryptographic_features": [{"uid": "C_smtp_test", "protocol": "SMTP", "tls_version": None}],
            "findings": [{"rule_id": "SMTP_NO_STARTTLS", "severity": "HIGH", "title": "Cleartext SMTP", "affected_connection": "C_smtp_test"}],
            "ml_analysis": {"model_name": "IsolationForest", "model_version": "3.0.0", "results": [{"is_anomaly": True, "anomaly_score": 0.65}]},
        }

        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(single_pcap_report)

            srv = ForensicDataService(session)
            summary = srv.get_run_summary_dict(run.id)

            assert summary["analysis_scope"] == "SINGLE_PCAP"
            assert summary["pcap_count"] == 1
            assert summary["session_count"] == 1
            assert summary["tls_session_count"] == 0
            assert summary["protocols"] == ["SMTP"]

    def test_foreign_key_cascading_deletion(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)
            run_id = run.id

            srv = ForensicDataService(session)
            deleted = srv.delete_analysis_run(run_id)
            assert deleted is True

            # Verify that child records are deleted
            assert len(session.query(Capture).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(EmailSession).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(TLSSession).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(Certificate).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(Finding).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(MLResult).filter_by(analysis_run_id=run_id).all()) == 0
            assert len(session.query(RiskAssessment).filter_by(analysis_run_id=run_id).all()) == 0

    def test_service_query_filtering(self, memory_db, master_report_data):
        with memory_db.session_scope() as session:
            importer = ReportImporter(session)
            run = importer.import_report(master_report_data)

            srv = ForensicDataService(session)
            high_findings = srv.get_findings_for_run(run.id, severity="HIGH")
            med_findings = srv.get_findings_for_run(run.id, severity="MEDIUM")

            assert len(high_findings) == 3
            assert len(med_findings) == 3

            anomalies = srv.get_ml_results_for_run(run.id, anomalies_only=True)
            assert len(anomalies) == 4
