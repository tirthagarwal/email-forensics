"""
Feature Schema Definitions & Isolation Guard for Deployment ML.
===============================================================
Defines the canonical 32-dimensional deployment feature schema,
validation utilities, and zero-leakage enforcement against security rules.

Schema Version: 1.0.0
Dimensions: 32 (10 numeric/ratio/flag + 22 one-hot categorical)
"""

from typing import Any, Dict, List, Set
import deployment_ml_features as dmf

# Canonical Schema Version
FEATURE_SCHEMA_VERSION = dmf.FEATURE_SCHEMA_VERSION  # "1.0.0"
FEATURE_DIMENSIONS = len(dmf.get_feature_names_encoded())  # 32

# Raw Feature Names
NUMERIC_FEATURE_NAMES: List[str] = dmf.NUMERIC_FEATURE_NAMES
CATEGORICAL_FEATURE_NAMES: List[str] = dmf.CATEGORICAL_FEATURE_NAMES
ALL_RAW_FEATURE_NAMES: List[str] = dmf.ALL_FEATURE_NAMES

# Vocabularies
PROTOCOL_VOCAB = dmf.PROTOCOL_VOCAB
TLS_VERSION_VOCAB = dmf.TLS_VERSION_VOCAB
CIPHER_SUITE_VOCAB = dmf.CIPHER_SUITE_VOCAB
CURVE_VOCAB = dmf.CURVE_VOCAB

# Encoded feature column names (ordered 32 elements)
ENCODED_FEATURE_NAMES: List[str] = dmf.get_feature_names_encoded()

# ── Zero-Leakage Forbidden Features List ─────────────────────────────────────
# These features represent deterministic security rules, risk scores, or target labels.
# They MUST NEVER appear in training, validation, or inference ML feature vectors.
FORBIDDEN_FEATURES: Set[str] = {
    "weak_cipher",
    "weak_tls_version",
    "weak_key_size",
    "missing_starttls",
    "plaintext_auth_risk",
    "certificate_problem",
    "certificate_self_signed",
    "certificate_hostname_match",
    "risk_score",
    "baseline_score",
    "cryptographic_score",
    "overall_risk_score",
    "severity",
    "rule_id",
    "confidence",
    "is_anomaly",
    "anomaly_score",
    "raw_score",
}


def assert_no_forbidden_features(features: Dict[str, Any]) -> None:
    """
    Verify that none of the forbidden security rule or label fields exist
    in the feature dictionary.
    
    Raises
    ------
    ValueError
        If any forbidden feature is detected in the input dictionary.
    """
    found_forbidden = set(features.keys()) & FORBIDDEN_FEATURES
    if found_forbidden:
        raise ValueError(
            f"Security rule / label leakage detected! Forbidden features present: {sorted(found_forbidden)}"
        )


def validate_feature_schema(feat_dict: Dict[str, float]) -> bool:
    """
    Validate that an encoded feature dictionary contains all expected 32 features
    and no forbidden features.
    """
    assert_no_forbidden_features(feat_dict)
    return dmf.validate_deployment_feature_schema(feat_dict)


def get_schema_metadata() -> Dict[str, Any]:
    """Return schema specification metadata dictionary."""
    return {
        "schema_version": FEATURE_SCHEMA_VERSION,
        "total_dimensions": FEATURE_DIMENSIONS,
        "numeric_features": NUMERIC_FEATURE_NAMES,
        "categorical_features": CATEGORICAL_FEATURE_NAMES,
        "encoded_feature_names": ENCODED_FEATURE_NAMES,
        "vocabularies": {
            "protocol": PROTOCOL_VOCAB,
            "tls_version": TLS_VERSION_VOCAB,
            "cipher_suite": CIPHER_SUITE_VOCAB,
            "elliptic_curve": CURVE_VOCAB,
        },
        "forbidden_features_count": len(FORBIDDEN_FEATURES),
    }
