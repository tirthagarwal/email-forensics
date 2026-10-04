"""
Forensic Data Service & Repository Layer.
=========================================
Provides clean query interfaces for retrieving normalized forensic analysis
records, risk scores, cryptographic parameters, security findings, and ML metrics.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from db_models import (
    AnalysisRun,
    Capture,
    EmailSession,
    TLSSession,
    Certificate,
    CryptographicFeature,
    Finding,
    MLResult,
    RiskAssessment,
    ModelRegistry,
    DatasetSource,
    HistoricalRecord,
)


class ForensicDataService:
    """Service layer providing query operations over the email forensics relational schema."""

    def __init__(self, session: Session):
        self.session = session

    # ── Analysis Runs ────────────────────────────────────────────────────────
    def get_run_by_uuid(self, run_uuid: str) -> Optional[AnalysisRun]:
        """Fetch an analysis run by its unique UUID."""
        return self.session.query(AnalysisRun).filter_by(run_uuid=run_uuid).first()

    def get_run_by_id(self, run_id: int) -> Optional[AnalysisRun]:
        """Fetch an analysis run by its primary key ID."""
        return self.session.query(AnalysisRun).filter_by(id=run_id).first()

    def list_analysis_runs(self, limit: int = 50) -> List[AnalysisRun]:
        """List recent analysis runs sorted descending by creation time."""
        return self.session.query(AnalysisRun).order_by(AnalysisRun.created_at.desc()).limit(limit).all()

    # ── Captures ─────────────────────────────────────────────────────────────
    def get_captures_for_run(self, run_id: int) -> List[Capture]:
        """Retrieve all ingested PCAP capture records for an analysis run."""
        return self.session.query(Capture).filter_by(analysis_run_id=run_id).all()

    # ── Email Sessions ───────────────────────────────────────────────────────
    def get_email_sessions_for_run(self, run_id: int) -> List[EmailSession]:
        """Retrieve all reconstructed email sessions for an analysis run."""
        return (
            self.session.query(EmailSession)
            .filter_by(analysis_run_id=run_id)
            .options(
                joinedload(EmailSession.tls_session),
                joinedload(EmailSession.cryptographic_feature),
                joinedload(EmailSession.ml_result),
            )
            .all()
        )

    def get_session_by_uid(self, run_id: int, uid: str) -> Optional[EmailSession]:
        """Retrieve an email session by its Zeek connection UID within an analysis run."""
        return self.session.query(EmailSession).filter_by(analysis_run_id=run_id, uid=uid).first()

    # ── TLS & Cryptography ───────────────────────────────────────────────────
    def get_tls_sessions_for_run(self, run_id: int) -> List[TLSSession]:
        """Retrieve all TLS handshake sessions for an analysis run."""
        return (
            self.session.query(TLSSession)
            .filter_by(analysis_run_id=run_id)
            .options(joinedload(TLSSession.certificates))
            .all()
        )

    def get_certificates_for_run(self, run_id: int) -> List[Certificate]:
        """Retrieve all X.509 certificate records extracted in an analysis run."""
        return self.session.query(Certificate).filter_by(analysis_run_id=run_id).all()

    def get_crypto_features_for_run(self, run_id: int) -> List[CryptographicFeature]:
        """Retrieve structured cryptographic feature vectors for an analysis run."""
        return self.session.query(CryptographicFeature).filter_by(analysis_run_id=run_id).all()

    # ── Security Findings ────────────────────────────────────────────────────
    def get_findings_for_run(
        self,
        run_id: int,
        severity: Optional[str] = None,
        rule_id: Optional[str] = None,
    ) -> List[Finding]:
        """Retrieve prioritized deterministic security findings with optional filtering."""
        query = self.session.query(Finding).filter_by(analysis_run_id=run_id)
        if severity:
            query = query.filter_by(severity=severity.upper())
        if rule_id:
            query = query.filter_by(rule_id=rule_id)
        return query.all()

    # ── ML Results ───────────────────────────────────────────────────────────
    def get_ml_results_for_run(self, run_id: int, anomalies_only: bool = False) -> List[MLResult]:
        """Retrieve AI anomaly detection results for an analysis run."""
        query = self.session.query(MLResult).filter_by(analysis_run_id=run_id)
        if anomalies_only:
            query = query.filter_by(is_anomaly=True)
        return query.all()

    # ── Risk Assessment ──────────────────────────────────────────────────────
    def get_risk_assessment_for_run(self, run_id: int) -> Optional[RiskAssessment]:
        """Retrieve the overall two-stage risk calculation summary for an analysis run."""
        return self.session.query(RiskAssessment).filter_by(analysis_run_id=run_id).first()

    # ── Aggregate Run Summary ────────────────────────────────────────────────
    def get_run_summary_dict(self, run_id: int) -> Optional[Dict[str, Any]]:
        """Generates a consolidated summary dictionary for an analysis run."""
        run = self.get_run_by_id(run_id)
        if not run:
            return None

        captures = self.get_captures_for_run(run_id)
        sessions = self.get_email_sessions_for_run(run_id)
        tls_sessions = self.get_tls_sessions_for_run(run_id)
        findings = self.get_findings_for_run(run_id)
        ml_results = self.get_ml_results_for_run(run_id)
        risk = self.get_risk_assessment_for_run(run_id)

        return {
            "run_id": run.id,
            "run_uuid": run.run_uuid,
            "analysis_scope": run.analysis_scope,
            "started_at": run.started_at,
            "completed_at": run.completed_at,
            "pcap_count": len(captures),
            "session_count": len(sessions),
            "tls_session_count": len(tls_sessions),
            "total_findings": len(findings),
            "total_ml_anomalies": sum(1 for m in ml_results if m.is_anomaly),
            "baseline_score": risk.baseline_score if risk else run.baseline_score,
            "cryptographic_score": risk.cryptographic_score if risk else run.cryptographic_score,
            "overall_risk_score": risk.final_score if risk else run.overall_risk_score,
            "risk_level": risk.risk_level if risk else run.risk_level,
            "score_delta": risk.score_delta if risk else (run.overall_risk_score - run.baseline_score),
            "protocols": sorted(list(set(s.protocol for s in sessions if s.protocol))),
            "pipeline_version": run.pipeline_version,
            "model_version": run.model_version,
        }

    # ── Training Records & Dataset Extraction ─────────────────────────────────
    def get_all_training_records(self, include_historical: bool = True) -> List[Dict[str, Any]]:
        """
        Extract normalized raw feature dictionaries for all sessions in the DB with provenance.
        
        Zero Leakage Guarantee:
        Strictly excludes any findings, risk scores, or security rule outputs.
        """
        sessions = (
            self.session.query(EmailSession)
            .options(
                joinedload(EmailSession.tls_session).joinedload(TLSSession.certificates),
                joinedload(EmailSession.capture),
                joinedload(EmailSession.analysis_run),
            )
            .all()
        )
        records = []
        for s in sessions:
            tls = s.tls_session
            cert = tls.certificates[0] if (tls and tls.certificates) else None
            cap = s.capture
            
            # Derive forward secrecy purely from cipher suite text if TLS exists
            cipher_suite = tls.cipher_suite if tls else None
            forward_secrecy = None
            if cipher_suite:
                upper = cipher_suite.upper()
                forward_secrecy = any(kw in upper for kw in ("ECDHE", "DHE", "EDH"))
            
            cap_name = cap.filename if cap else f"run_{s.analysis_run_id}"
            rec = {
                # Provenance metadata / Splitting groups
                "source_dataset": "local_email_pcap",
                "source_type": "LOCAL_PCAP",
                "source_capture_id": cap_name,
                "source_file": cap_name,
                "source_record_id": s.uid,
                "session_id": s.id,
                "session_uid": s.uid,
                "analysis_run_id": s.analysis_run_id,
                "capture_id": s.capture_id,
                "capture_filename": cap_name,
                # Flow metrics
                "client_bytes": s.client_bytes or 0,
                "server_bytes": s.server_bytes or 0,
                "client_packets": s.client_packets or 0,
                "server_packets": s.server_packets or 0,
                "duration": s.duration or 0.0,
                "certificate_key_size": cert.public_key_size if cert else None,
                # Boolean flags
                "tls_established": bool(s.tls_established),
                "forward_secrecy": forward_secrecy,
                # Categorical features
                "protocol": (s.protocol or "UNKNOWN").upper(),
                "tls_version": tls.tls_version if tls else None,
                "cipher_suite": cipher_suite,
                "elliptic_curve": tls.elliptic_curve if tls else None,
            }
            records.append(rec)

        # Include historical records if requested
        if include_historical:
            hist_records = self.session.query(HistoricalRecord).all()
            for h in hist_records:
                h_rec = {
                    "source_dataset": h.source_dataset,
                    "source_type": h.source_type,
                    "source_capture_id": h.source_capture_id,
                    "source_file": h.source_file,
                    "source_record_id": h.source_record_id,
                    "session_id": h.id,
                    "session_uid": h.source_record_id or f"hist_{h.id}",
                    "analysis_run_id": None,
                    "capture_id": None,
                    "capture_filename": h.source_capture_id,
                    # Flow metrics
                    "client_bytes": h.client_bytes or 0,
                    "server_bytes": h.server_bytes or 0,
                    "client_packets": h.client_packets or 0,
                    "server_packets": h.server_packets or 0,
                    "duration": h.duration or 0.0,
                    "certificate_key_size": h.certificate_key_size,
                    # Boolean flags
                    "tls_established": bool(h.tls_established),
                    "forward_secrecy": h.forward_secrecy,
                    # Categorical features
                    "protocol": (h.protocol or "UNKNOWN").upper(),
                    "tls_version": h.tls_version,
                    "cipher_suite": h.cipher_suite,
                    "elliptic_curve": h.elliptic_curve,
                }
                records.append(h_rec)

        return records

    # ── Dataset Provenance Management ────────────────────────────────────────
    def get_dataset_source(self, source_dataset: str, source_version: Optional[str] = None) -> Optional[DatasetSource]:
        """Retrieve a dataset source record by name and version."""
        query = self.session.query(DatasetSource).filter_by(source_dataset=source_dataset)
        if source_version:
            query = query.filter_by(source_version=source_version)
        return query.first()

    def list_dataset_sources(self) -> List[DatasetSource]:
        """List all registered dataset sources."""
        return self.session.query(DatasetSource).order_by(DatasetSource.imported_at.desc()).all()

    def get_historical_records(
        self,
        source_dataset: Optional[str] = None,
        limit: Optional[int] = None,
    ) -> List[HistoricalRecord]:
        """Retrieve historical records, optionally filtered by source dataset."""
        query = self.session.query(HistoricalRecord)
        if source_dataset:
            query = query.filter_by(source_dataset=source_dataset)
        if limit:
            query = query.limit(limit)
        return query.all()

    def create_or_update_dataset_source(
        self,
        source_dataset: str,
        source_type: str,
        source_version: Optional[str] = None,
        source_file: Optional[str] = None,
        source_hash: Optional[str] = None,
        record_count: int = 0,
        description: Optional[str] = None,
    ) -> DatasetSource:
        """Create or update a dataset source catalog entry."""
        existing = self.get_dataset_source(source_dataset, source_version)
        if existing:
            existing.source_type = source_type
            existing.source_file = source_file
            existing.source_hash = source_hash
            existing.record_count = record_count
            existing.description = description
            self.session.commit()
            return existing

        source = DatasetSource(
            source_dataset=source_dataset,
            source_type=source_type,
            source_version=source_version,
            source_file=source_file,
            source_hash=source_hash,
            record_count=record_count,
            description=description,
        )
        self.session.add(source)
        self.session.commit()
        return source

    # ── Model Registry Management ────────────────────────────────────────────
    def list_registered_models(self, status: Optional[str] = None) -> List[ModelRegistry]:
        """List all registered models in the registry, optionally filtered by status."""
        query = self.session.query(ModelRegistry).order_by(ModelRegistry.created_at.desc())
        if status:
            query = query.filter_by(status=status.upper())
        return query.all()

    def get_model_by_version(self, model_version: str) -> Optional[ModelRegistry]:
        """Retrieve a registered model by its version string."""
        return self.session.query(ModelRegistry).filter_by(model_version=model_version).first()

    def get_deployed_model(self) -> Optional[ModelRegistry]:
        """Retrieve the currently DEPLOYED model from the registry."""
        return self.session.query(ModelRegistry).filter_by(status="DEPLOYED").first()

    def register_model(
        self,
        model_version: str,
        threshold: float,
        model_name: str = "deployment_isolation_forest",
        model_variant: str = "expanded_v3",
        algorithm: str = "IsolationForest",
        feature_schema_version: str = "1.0.0",
        training_dataset_version: Optional[str] = None,
        n_estimators: int = 200,
        random_state: int = 42,
        training_record_count: int = 0,
        validation_record_count: int = 0,
        test_record_count: int = 0,
        artifact_path: Optional[str] = None,
        artifact_sha256: Optional[str] = None,
        status: str = "CANDIDATE",
        metrics_json: Optional[str] = None,
    ) -> ModelRegistry:
        """Register a new model entry or update an existing version."""
        existing = self.get_model_by_version(model_version)
        if existing:
            existing.model_name = model_name
            existing.model_variant = model_variant
            existing.algorithm = algorithm
            existing.feature_schema_version = feature_schema_version
            existing.training_dataset_version = training_dataset_version
            existing.threshold = threshold
            existing.n_estimators = n_estimators
            existing.random_state = random_state
            existing.training_record_count = training_record_count
            existing.validation_record_count = validation_record_count
            existing.test_record_count = test_record_count
            existing.artifact_path = artifact_path
            existing.artifact_sha256 = artifact_sha256
            existing.status = status.upper()
            existing.metrics_json = metrics_json
            self.session.commit()
            return existing

        entry = ModelRegistry(
            model_name=model_name,
            model_version=model_version,
            model_variant=model_variant,
            algorithm=algorithm,
            feature_schema_version=feature_schema_version,
            training_dataset_version=training_dataset_version,
            threshold=threshold,
            n_estimators=n_estimators,
            random_state=random_state,
            training_record_count=training_record_count,
            validation_record_count=validation_record_count,
            test_record_count=test_record_count,
            artifact_path=artifact_path,
            artifact_sha256=artifact_sha256,
            status=status.upper(),
            metrics_json=metrics_json,
        )
        self.session.add(entry)
        self.session.commit()
        return entry

    def set_model_status(self, model_version: str, status: str) -> Optional[ModelRegistry]:
        """
        Transition a model's status (CANDIDATE, VALIDATED, DEPLOYED, RETIRED).
        If promoting to DEPLOYED, all other DEPLOYED models are transitioned to RETIRED.
        """
        model = self.get_model_by_version(model_version)
        if not model:
            return None

        status_norm = status.upper()
        if status_norm == "DEPLOYED":
            # Retire any existing deployed model
            deployed = self.session.query(ModelRegistry).filter_by(status="DEPLOYED").all()
            for dep in deployed:
                if dep.model_version != model_version:
                    dep.status = "RETIRED"

        model.status = status_norm
        self.session.commit()
        return model

    # ── Deletion ─────────────────────────────────────────────────────────────
    def delete_analysis_run(self, run_id: int) -> bool:
        """Deletes an analysis run and cascades deletion across all related child records."""
        run = self.get_run_by_id(run_id)
        if run:
            self.session.delete(run)
            self.session.commit()
            return True
        return False

