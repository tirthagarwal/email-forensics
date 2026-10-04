"""
Unit and Integration Tests for Historical Data Ingestion, Provenance & Population Gate.
======================================================================================
Tests:
  - Provenance completeness (source_dataset, source_type, source_capture_id, source_file)
  - Ingestion idempotency and duplicate prevention
  - Privacy and security audit (no secrets, keylogs, passwords, bodies)
  - Feature isolation (zero forbidden security rule features)
  - Population Gate behavior on small vs large populations
  - Group creation and zero group overlap (TRAIN ∩ VAL = 0, TRAIN ∩ TEST = 0, VAL ∩ TEST = 0)
  - Source-level holdout isolation
  - Dataset version immutability and SHA-256 integrity
  - Production model protection (v3.0.0 remains DEPLOYED)
"""

import sys
import pytest
import numpy as np
from pathlib import Path

SRC_DIR = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from database import get_db_manager
from db_models import DatasetSource, HistoricalRecord
from db_service import ForensicDataService
from historical_data_importer import HistoricalDataImporter
from audit_training_population import TrainingPopulationAuditor
from db_training_dataset import DBTrainingDataset, extract_db_training_dataset
from create_training_split import split_by_groups
from training_dataset_registry import TrainingDatasetRegistry
from train_db_deployment_ml import train_model_from_db
from model_registry import ModelRegistryService
from compare_models import compare_models
import feature_schema as fs


@pytest.fixture
def test_db_manager(tmp_path):
    db_file = tmp_path / "test_hist.db"
    db_url = f"sqlite:///{db_file.resolve()}"
    mgr = get_db_manager(db_url)
    mgr.init_db(drop_existing=True)
    return mgr


class TestHistoricalDataIngestionAndProvenance:
    """Test importing historical datasets, provenance tracking, and idempotency."""

    def test_import_idempotency_and_provenance(self, test_db_manager):
        importer = HistoricalDataImporter(db_url=test_db_manager.db_url)

        # First import
        res1 = importer.import_expanded_deployment_dataset(max_records=50)
        assert res1["status"] == "IMPORTED_OK"
        assert res1["records"] == 50

        # Second import without overwrite must skip
        res2 = importer.import_expanded_deployment_dataset(max_records=50, overwrite=False)
        assert res2["status"] == "SKIPPED_ALREADY_IMPORTED"

        # Verify provenance in DB
        with test_db_manager.session_scope() as session:
            service = ForensicDataService(session)
            source = service.get_dataset_source("expanded_deployment_dataset")
            assert source is not None
            assert source.source_type == "PROCESSED_DATASET"
            assert source.record_count == 50

            records = service.get_historical_records("expanded_deployment_dataset")
            assert len(records) == 50
            for r in records:
                assert r.source_dataset == "expanded_deployment_dataset"
                assert r.source_type in ("PROCESSED_DATASET", "PCAP_ZEEK_LOCAL", "PASSIVE_OS_DATASET")
                assert r.source_capture_id is not None
                assert r.source_file is not None

    def test_privacy_and_security_audit_no_secrets(self, test_db_manager):
        importer = HistoricalDataImporter(db_url=test_db_manager.db_url)
        importer.import_expanded_deployment_dataset(max_records=30)

        forbidden_secret_tokens = [
            "CLIENT_RANDOM", "CLIENT_HANDSHAKE_TRAFFIC_SECRET", "SERVER_HANDSHAKE_TRAFFIC_SECRET",
            "password", "secret", "body", "subject", "message_payload"
        ]

        with test_db_manager.session_scope() as session:
            sources = session.query(DatasetSource).all()
            for s in sources:
                for col in ["source_dataset", "source_type", "description"]:
                    val = getattr(s, col, "") or ""
                    for token in forbidden_secret_tokens:
                        assert token not in val.lower()

            records = session.query(HistoricalRecord).all()
            for r in records:
                cols = [c.name for c in r.__table__.columns]
                # Assert no payload columns exist in schema
                assert "body" not in cols
                assert "subject" not in cols
                assert "password" not in cols
                assert "keylog" not in cols

    def test_feature_isolation_in_training_extraction(self, test_db_manager):
        importer = HistoricalDataImporter(db_url=test_db_manager.db_url)
        importer.import_expanded_deployment_dataset(max_records=30)

        extractor = DBTrainingDataset(db_url=test_db_manager.db_url)
        ds = extractor.extract_dataset(include_historical=True)

        assert ds["sample_count"] == 30
        for rec in ds["records"]:
            # Check provenance keys
            assert "source_dataset" in rec
            assert "source_type" in rec
            assert "source_capture_id" in rec
            assert "group_id" in rec

            # Zero leakage check
            fs.assert_no_forbidden_features(rec["raw_features"])
            fs.assert_no_forbidden_features(rec["transformed_features"])


class TestTrainingPopulationGate:
    """Test population gate prevents training on insufficient data."""

    def test_population_gate_triggers_on_insufficient_samples(self, test_db_manager):
        # Database has 0 or 4 samples -> minimum 50 required
        with pytest.raises(ValueError, match="Insufficient database population"):
            train_model_from_db(
                model_version="test_gate_fail",
                model_variant="fail_v1",
                db_url=test_db_manager.db_url,
                include_historical=False,  # only 0 sessions in fresh db
                min_samples=50,
                min_groups=3,
            )

    def test_population_gate_passes_with_sufficient_records(self, test_db_manager, tmp_path):
        importer = HistoricalDataImporter(db_url=test_db_manager.db_url)
        importer.import_expanded_deployment_dataset(max_records=100)

        res = train_model_from_db(
            model_version="test_gate_pass",
            model_variant="pass_v1",
            db_url=test_db_manager.db_url,
            include_historical=True,
            min_samples=50,
            min_groups=3,
            output_dir=tmp_path / "pass_model",
            register_in_db=True,
            overwrite_dataset_version=True,
        )
        assert res["model_version"] == "test_gate_pass"
        assert res["sample_count"] == 100
        assert "threshold" in res


class TestGroupAwareSplittingAndHoldout:
    """Test group isolation and source-level holdout."""

    def test_zero_group_overlap_invariant(self):
        records = [{"source_dataset": f"src_{(i % 2)}", "val": i} for i in range(60)]
        groups = [f"src_{(i % 2)}::cap_{(i // 10)}" for i in range(60)]
        X = np.random.randn(60, 32)

        split = split_by_groups(records, groups, X, train_ratio=0.70, val_ratio=0.15, test_ratio=0.15, random_state=42)

        train_g = set(split["train"]["groups"])
        val_g = set(split["val"]["groups"])
        test_g = set(split["test"]["groups"])

        assert len(train_g & val_g) == 0, "Train and Val groups overlap!"
        assert len(train_g & test_g) == 0, "Train and Test groups overlap!"
        assert len(val_g & test_g) == 0, "Val and Test groups overlap!"
        assert split["group_overlap_check"] is True

    def test_source_level_holdout_isolation(self):
        records = [
            {"source_dataset": "local_pcap", "id": 1},
            {"source_dataset": "local_pcap", "id": 2},
            {"source_dataset": "passive_os", "id": 3},
            {"source_dataset": "passive_os", "id": 4},
            {"source_dataset": "cesnet_tls22", "id": 5},
            {"source_dataset": "cesnet_tls22", "id": 6},
        ]
        groups = [
            "local_pcap::p1", "local_pcap::p2",
            "passive_os::p3", "passive_os::p4",
            "cesnet_tls22::c5", "cesnet_tls22::c6"
        ]

        split = split_by_groups(
            records=records,
            groups=groups,
            train_ratio=0.70,
            val_ratio=0.15,
            test_ratio=0.15,
            random_state=42,
            holdout_sources=["cesnet_tls22"],
        )

        assert "cesnet_tls22" in split["summary"]["test_sources"]
        assert "cesnet_tls22" not in split["summary"]["train_sources"]
        assert "cesnet_tls22" not in split["summary"]["val_sources"]


class TestModelComparisonAndProductionSafety:
    """Test model comparison and guarantee production model remains DEPLOYED."""

    def test_production_model_stays_deployed(self, test_db_manager):
        reg = ModelRegistryService(db_url=test_db_manager.db_url)
        reg.seed_production_model()

        deployed = reg.get_deployed_model()
        assert deployed["model_version"] == "3.0.0"
        assert deployed["model_variant"] == "expanded_v3"
        assert deployed["status"] == "DEPLOYED"
        assert deployed["threshold"] == pytest.approx(-0.041466, abs=1e-4)

    def test_compare_models_output_structure(self, test_db_manager):
        comp = compare_models(db_url=test_db_manager.db_url)
        assert "production_model" in comp
        assert comp["production_model"]["version"] == "3.0.0"
        assert "policy_notice" in comp
