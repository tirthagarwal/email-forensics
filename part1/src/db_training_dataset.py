"""
Database Training Dataset Extractor.
====================================
Extracts and transforms training datasets from normalized SQLite database tables
(email_sessions, tls_sessions, certificates, captures) into 32-dimensional
feature matrices for IsolationForest training and evaluation.

Zero Leakage Guarantee:
Ensures findings, risk scores, and security rules are never included.
"""

from typing import Any, Dict, List, Optional, Tuple
import numpy as np

from database import get_db_manager
from db_service import ForensicDataService
import deployment_ml_features as dmf
import feature_schema as fs


class DBTrainingDataset:
    """Extracts, validates, and prepares ML training datasets from relational database records."""

    def __init__(self, db_url: Optional[str] = None):
        self.db_manager = get_db_manager(db_url)

    def extract_dataset(
        self,
        include_historical: bool = True,
        means: Optional[Dict[str, float]] = None,
        stds: Optional[Dict[str, float]] = None,
    ) -> Dict[str, Any]:
        """
        Extract all sessions from DB, transform into 32D features, and return structured dataset.
        """
        with self.db_manager.session_scope() as session:
            service = ForensicDataService(session)
            raw_records = service.get_all_training_records(include_historical=include_historical)

        records = []
        vectors = []
        groups = []
        group_counts: Dict[str, int] = {}

        encoded_names = fs.ENCODED_FEATURE_NAMES

        for raw_rec in raw_records:
            # Enforce zero-leakage check on raw record
            fs.assert_no_forbidden_features(raw_rec)

            # Extract raw feature dictionary matching dmf format
            raw_feat = {
                "client_bytes": raw_rec.get("client_bytes", 0),
                "server_bytes": raw_rec.get("server_bytes", 0),
                "client_packets": raw_rec.get("client_packets", 0),
                "server_packets": raw_rec.get("server_packets", 0),
                "duration": raw_rec.get("duration", 0.0),
                "certificate_key_size": raw_rec.get("certificate_key_size"),
                "tls_established": raw_rec.get("tls_established", False),
                "forward_secrecy": raw_rec.get("forward_secrecy"),
                "protocol": raw_rec.get("protocol", "UNKNOWN"),
                "tls_version": raw_rec.get("tls_version"),
                "cipher_suite": raw_rec.get("cipher_suite"),
                "elliptic_curve": raw_rec.get("elliptic_curve"),
            }

            # Transform into 32-dimensional encoded dict
            transformed_dict = dmf.transform_deployment_features(raw_feat, means=means, stds=stds)

            # Validate against schema and forbidden leakage
            fs.validate_feature_schema(transformed_dict)

            # Convert to ordered vector
            vec = dmf.feature_dict_to_vector(transformed_dict)
            vectors.append(vec)

            # Group assignment for capture-aware splitting
            src_ds = raw_rec.get("source_dataset", "local_email_pcap")
            src_cap = raw_rec.get("source_capture_id") or raw_rec.get("capture_filename") or f"run_{raw_rec.get('analysis_run_id', 'unknown')}"
            group_id = f"{src_ds}::{src_cap}"
            groups.append(group_id)
            group_counts[group_id] = group_counts.get(group_id, 0) + 1

            records.append({
                "source_dataset": src_ds,
                "source_type": raw_rec.get("source_type", "LOCAL_PCAP"),
                "source_capture_id": src_cap,
                "source_file": raw_rec.get("source_file"),
                "source_record_id": raw_rec.get("source_record_id"),
                "session_id": raw_rec.get("session_id"),
                "session_uid": raw_rec.get("session_uid"),
                "analysis_run_id": raw_rec.get("analysis_run_id"),
                "capture_filename": src_cap,
                "group_id": group_id,
                "raw_features": raw_feat,
                "transformed_features": transformed_dict,
                "feature_vector": vec,
            })

        X = np.array(vectors, dtype=float) if vectors else np.empty((0, len(encoded_names)))

        return {
            "records": records,
            "X": X,
            "groups": groups,
            "group_counts": group_counts,
            "feature_names": encoded_names,
            "sample_count": len(records),
            "unique_groups_count": len(group_counts),
            "schema_version": fs.FEATURE_SCHEMA_VERSION,
        }


def extract_db_training_dataset(db_url: Optional[str] = None, include_historical: bool = True) -> Dict[str, Any]:
    """Convenience helper to extract dataset from DB."""
    extractor = DBTrainingDataset(db_url=db_url)
    return extractor.extract_dataset(include_historical=include_historical)

