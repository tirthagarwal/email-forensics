"""
Database Models for Email Forensics Framework.
==============================================
Normalized relational schema using SQLAlchemy ORM.
Supports SQLite and PostgreSQL.
"""

from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    Text,
    DateTime,
    ForeignKey,
    Index,
)
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()


class AnalysisRun(Base):
    """Represents a discrete forensic pipeline analysis execution."""
    __tablename__ = "analysis_runs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    run_uuid = Column(String(64), unique=True, index=True, nullable=False)
    analysis_scope = Column(String(32), nullable=False, default="MULTI_PCAP")
    started_at = Column(String(64), nullable=True)
    completed_at = Column(String(64), nullable=True)
    pcap_count = Column(Integer, nullable=False, default=0)
    session_count = Column(Integer, nullable=False, default=0)
    tls_session_count = Column(Integer, nullable=False, default=0)
    baseline_score = Column(Float, nullable=False, default=0.0)
    cryptographic_score = Column(Float, nullable=False, default=0.0)
    overall_risk_score = Column(Float, nullable=False, default=0.0)
    risk_level = Column(String(32), nullable=False, default="MINIMAL")
    pipeline_version = Column(String(32), nullable=False, default="1.0.0")
    model_version = Column(String(32), nullable=False, default="3.0.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    captures = relationship("Capture", back_populates="analysis_run", cascade="all, delete-orphan")
    email_sessions = relationship("EmailSession", back_populates="analysis_run", cascade="all, delete-orphan")
    tls_sessions = relationship("TLSSession", back_populates="analysis_run", cascade="all, delete-orphan")
    cryptographic_features = relationship("CryptographicFeature", back_populates="analysis_run", cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="analysis_run", cascade="all, delete-orphan")
    ml_results = relationship("MLResult", back_populates="analysis_run", cascade="all, delete-orphan")
    risk_assessment = relationship("RiskAssessment", back_populates="analysis_run", uselist=False, cascade="all, delete-orphan")

    def __repr__(self):
        return f"<AnalysisRun(uuid='{self.run_uuid}', scope='{self.analysis_scope}', risk={self.overall_risk_score})>"


class Capture(Base):
    """Represents a PCAP packet capture file ingested in an analysis run."""
    __tablename__ = "captures"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False, index=True)
    file_hash = Column(String(64), nullable=True, index=True)
    packet_count = Column(Integer, nullable=True)
    file_size = Column(Integer, nullable=True)
    capture_timestamp = Column(String(64), nullable=True)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="captures")
    email_sessions = relationship("EmailSession", back_populates="capture")

    def __repr__(self):
        return f"<Capture(filename='{self.filename}', run_id={self.analysis_run_id})>"


class EmailSession(Base):
    """Represents a reconstructed email protocol session (SMTP, IMAP, POP3)."""
    __tablename__ = "email_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    capture_id = Column(Integer, ForeignKey("captures.id", ondelete="SET NULL"), nullable=True, index=True)
    uid = Column(String(64), nullable=False, index=True)
    protocol = Column(String(32), nullable=False, index=True)
    source_ip = Column(String(64), nullable=True)
    source_port = Column(Integer, nullable=True)
    destination_ip = Column(String(64), nullable=True)
    destination_port = Column(Integer, nullable=True)
    duration = Column(Float, nullable=True)
    client_bytes = Column(Integer, nullable=True)
    server_bytes = Column(Integer, nullable=True)
    client_packets = Column(Integer, nullable=True)
    server_packets = Column(Integer, nullable=True)
    tls_established = Column(Boolean, default=False, nullable=False)
    starttls_detected = Column(Boolean, default=False, nullable=False)
    plaintext_auth_risk = Column(Boolean, default=False, nullable=False)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="email_sessions")
    capture = relationship("Capture", back_populates="email_sessions")
    tls_session = relationship("TLSSession", back_populates="email_session", uselist=False, cascade="all, delete-orphan")
    cryptographic_feature = relationship("CryptographicFeature", back_populates="email_session", uselist=False, cascade="all, delete-orphan")
    findings = relationship("Finding", back_populates="email_session")
    ml_result = relationship("MLResult", back_populates="email_session", uselist=False)

    def __repr__(self):
        return f"<EmailSession(uid='{self.uid}', proto='{self.protocol}', tls={self.tls_established})>"


class TLSSession(Base):
    """Represents negotiated TLS cryptographic handshake parameters for an email session."""
    __tablename__ = "tls_sessions"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    email_session_id = Column(Integer, ForeignKey("email_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    tls_version = Column(String(32), nullable=True)
    cipher_suite = Column(String(128), nullable=True)
    elliptic_curve = Column(String(64), nullable=True)
    forward_secrecy = Column(Boolean, default=False, nullable=False)
    server_name = Column(String(255), nullable=True)
    established = Column(Boolean, default=True, nullable=False)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="tls_sessions")
    email_session = relationship("EmailSession", back_populates="tls_session")
    certificates = relationship("Certificate", back_populates="tls_session", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<TLSSession(version='{self.tls_version}', cipher='{self.cipher_suite}', pfs={self.forward_secrecy})>"


class Certificate(Base):
    """Represents an X.509 certificate extracted from a TLS handshake."""
    __tablename__ = "certificates"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    tls_session_id = Column(Integer, ForeignKey("tls_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    subject = Column(String(512), nullable=True)
    issuer = Column(String(512), nullable=True)
    public_key_algorithm = Column(String(64), nullable=True)
    public_key_size = Column(Integer, nullable=True)
    signature_algorithm = Column(String(64), nullable=True)
    valid_from = Column(String(64), nullable=True)
    valid_until = Column(String(64), nullable=True)
    self_signed = Column(Boolean, nullable=True)
    hostname_match = Column(Boolean, nullable=True)
    visibility_status = Column(String(32), nullable=True)

    # Relationships
    tls_session = relationship("TLSSession", back_populates="certificates")

    def __repr__(self):
        return f"<Certificate(subject='{self.subject}', key_size={self.public_key_size}, self_signed={self.self_signed})>"


class CryptographicFeature(Base):
    """Represents structured cryptographic security features extracted from network traffic."""
    __tablename__ = "cryptographic_features"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    email_session_id = Column(Integer, ForeignKey("email_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    tls_version = Column(String(32), nullable=True)
    cipher_suite = Column(String(128), nullable=True)
    elliptic_curve = Column(String(64), nullable=True)
    forward_secrecy = Column(Boolean, default=False, nullable=False)
    certificate_key_size = Column(Integer, nullable=True)
    certificate_self_signed = Column(Boolean, nullable=True)
    certificate_hostname_match = Column(Boolean, nullable=True)
    weak_tls_version = Column(Boolean, default=False, nullable=False)
    weak_cipher = Column(Boolean, default=False, nullable=False)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="cryptographic_features")
    email_session = relationship("EmailSession", back_populates="cryptographic_feature")

    def __repr__(self):
        return f"<CryptographicFeature(session_id={self.email_session_id}, tls='{self.tls_version}')>"


class Finding(Base):
    """Represents a deterministic security rule finding / policy violation."""
    __tablename__ = "findings"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("email_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    rule_id = Column(String(64), nullable=False, index=True)
    severity = Column(String(32), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    recommendation = Column(Text, nullable=True)
    confidence = Column(String(32), nullable=True)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="findings")
    email_session = relationship("EmailSession", back_populates="findings")

    def __repr__(self):
        return f"<Finding(rule='{self.rule_id}', severity='{self.severity}')>"


class MLResult(Base):
    """Represents AI-assisted anomaly detection results from IsolationForest."""
    __tablename__ = "ml_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    session_id = Column(Integer, ForeignKey("email_sessions.id", ondelete="SET NULL"), nullable=True, index=True)
    model_name = Column(String(64), nullable=True)
    model_version = Column(String(32), nullable=True)
    model_variant = Column(String(32), nullable=True)
    raw_score = Column(Float, nullable=True)
    anomaly_score = Column(Float, nullable=True)
    is_anomaly = Column(Boolean, default=False, nullable=False)
    threshold = Column(Float, nullable=True)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="ml_results")
    email_session = relationship("EmailSession", back_populates="ml_result")

    def __repr__(self):
        return f"<MLResult(score={self.anomaly_score}, is_anomaly={self.is_anomaly})>"


class RiskAssessment(Base):
    """Represents two-stage risk calculation summary for an analysis run."""
    __tablename__ = "risk_assessments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    analysis_run_id = Column(Integer, ForeignKey("analysis_runs.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    baseline_score = Column(Float, nullable=False, default=0.0)
    cryptographic_score = Column(Float, nullable=False, default=0.0)
    final_score = Column(Float, nullable=False, default=0.0)
    risk_level = Column(String(32), nullable=False, default="MINIMAL")
    score_delta = Column(Float, nullable=True, default=0.0)

    # Relationships
    analysis_run = relationship("AnalysisRun", back_populates="risk_assessment")

    def __repr__(self):
        return f"<RiskAssessment(final={self.final_score}, level='{self.risk_level}')>"


class ModelRegistry(Base):
    """Represents a registered, validated, or deployed Machine Learning model artifact."""
    __tablename__ = "model_registry"

    id = Column(Integer, primary_key=True, autoincrement=True)
    model_name = Column(String(64), nullable=False, default="deployment_isolation_forest", index=True)
    model_version = Column(String(32), unique=True, index=True, nullable=False)
    model_variant = Column(String(32), nullable=False, default="expanded_v3")
    algorithm = Column(String(64), nullable=False, default="IsolationForest")
    feature_schema_version = Column(String(32), nullable=False, default="1.0.0")
    training_dataset_version = Column(String(64), nullable=True)
    threshold = Column(Float, nullable=False)
    n_estimators = Column(Integer, nullable=False, default=200)
    random_state = Column(Integer, nullable=False, default=42)
    training_record_count = Column(Integer, nullable=False, default=0)
    validation_record_count = Column(Integer, nullable=False, default=0)
    test_record_count = Column(Integer, nullable=False, default=0)
    artifact_path = Column(String(255), nullable=True)
    artifact_sha256 = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="CANDIDATE", index=True)  # CANDIDATE, VALIDATED, DEPLOYED, RETIRED
    metrics_json = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc), nullable=False)

    def __repr__(self):
        return f"<ModelRegistry(version='{self.model_version}', status='{self.status}', threshold={self.threshold})>"


class DatasetSource(Base):
    """Represents an ingested historical or public dataset source cataloging provenance."""
    __tablename__ = "dataset_sources"

    id = Column(Integer, primary_key=True, autoincrement=True)
    source_dataset = Column(String(64), nullable=False, index=True)
    source_type = Column(String(32), nullable=False, index=True)  # PUBLIC_DATASET, LOCAL_PCAP, PROCESSED_DATASET
    source_version = Column(String(32), nullable=True)
    source_file = Column(String(255), nullable=True)
    source_hash = Column(String(64), nullable=True)
    record_count = Column(Integer, nullable=False, default=0)
    imported_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    description = Column(Text, nullable=True)

    # Relationships
    records = relationship("HistoricalRecord", back_populates="dataset_source", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<DatasetSource(dataset='{self.source_dataset}', type='{self.source_type}', records={self.record_count})>"


class HistoricalRecord(Base):
    """Represents a discrete session record extracted from a historical or public dataset with complete provenance."""
    __tablename__ = "historical_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    dataset_source_id = Column(Integer, ForeignKey("dataset_sources.id", ondelete="CASCADE"), nullable=False, index=True)
    source_dataset = Column(String(64), nullable=False, index=True)
    source_type = Column(String(32), nullable=False, index=True)
    source_capture_id = Column(String(128), nullable=False, index=True)  # Grouping key
    source_file = Column(String(255), nullable=True)
    source_record_id = Column(String(128), nullable=True, index=True)

    # Structural flow features
    protocol = Column(String(32), nullable=True, default="UNKNOWN")
    tls_established = Column(Boolean, default=False, nullable=False)
    tls_version = Column(String(32), nullable=True)
    cipher_suite = Column(String(128), nullable=True)
    elliptic_curve = Column(String(64), nullable=True)
    forward_secrecy = Column(Boolean, nullable=True)
    client_bytes = Column(Integer, nullable=True, default=0)
    server_bytes = Column(Integer, nullable=True, default=0)
    client_packets = Column(Integer, nullable=True, default=0)
    server_packets = Column(Integer, nullable=True, default=0)
    duration = Column(Float, nullable=True, default=0.0)
    certificate_key_size = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    # Relationships
    dataset_source = relationship("DatasetSource", back_populates="records")

    def __repr__(self):
        return f"<HistoricalRecord(dataset='{self.source_dataset}', capture='{self.source_capture_id}', proto='{self.protocol}')>"


