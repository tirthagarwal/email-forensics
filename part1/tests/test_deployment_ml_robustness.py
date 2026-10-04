"""
test_deployment_ml_robustness.py
───────────────────────────────────
Robustness, edge-case, and security-isolation unit test suite for the
Deployment ML IsolationForest model.

Categories Tested:
  A. Feature Extraction & Schema Compliance
  B. Missing Values & Invalid/Corrupted Inputs (negative values, None, bad types)
  C. Zero-Byte & Extreme Flow Volume Handling
  D. SHA-256 Artifact Integrity Verification
  E. Strict Security-Rule Flag Isolation (No Leakage)
  F. Anomaly Score Bounding & Threshold Bounding
"""

import json
import pytest
from pathlib import Path
import sys

src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from ai_anomaly_detector import AIAnomalyDetector, compute_file_sha256
from deployment_ml_features import (
    FEATURE_SCHEMA_VERSION,
    build_deployment_features,
    get_feature_names_encoded,
    transform_deployment_features,
    validate_deployment_feature_schema,
)


@pytest.fixture
def detector():
    return AIAnomalyDetector()


# ─── Category A: Feature Extraction & Schema Compliance ─────────────────────

def test_deployment_feature_schema_encoded_names():
    names = get_feature_names_encoded()
    assert isinstance(names, list)
    assert len(names) == 32
    assert "client_bytes_log" in names
    assert "protocol_cat__SMTP" in names
    assert "cipher_suite_cat__UNKNOWN" in names


def test_transform_deployment_features_schema_valid():
    raw = {
        "client_bytes": 500, "server_bytes": 1200,
        "client_packets": 10, "server_packets": 12,
        "duration": 1.5, "certificate_key_size": 2048,
        "tls_established": True, "forward_secrecy": True,
        "protocol": "SMTP", "tls_version": "TLSv12",
        "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
        "elliptic_curve": "x25519",
    }
    feats = transform_deployment_features(raw)
    assert validate_deployment_feature_schema(feats) is True


# ─── Category B: Missing Values & Corrupted Inputs ──────────────────────────

def test_robustness_none_and_empty_inputs(detector):
    empty_crypto = {}
    res = detector.predict_anomaly(empty_crypto)
    assert res["is_anomaly"] in (True, False)
    assert 0.0 <= res["anomaly_score"] <= 1.0
    assert res["model_version"] in ("2.0.0", "3.0.0")


def test_robustness_negative_counts(detector):
    negative_crypto = {
        "protocol": "SMTP",
        "_client_bytes": -9999,
        "_server_bytes": -50,
        "_client_packets": -10,
        "_server_packets": -1,
        "_duration": -30.0,
    }
    res = detector.predict_anomaly(negative_crypto)
    # Negative counts must be clamped to 0 without throwing an exception
    assert res["feature_values_used"]["client_bytes_log"] == 0.0
    assert res["feature_values_used"]["duration_log"] == 0.0


def test_robustness_garbage_types(detector):
    garbage_crypto = {
        "protocol": 12345,
        "tls_version": ["TLSv12"],
        "cipher_suite": {"bad": "dict"},
        "certificate_key_size": "INVALID_INT_STRING",
        "_client_bytes": "NOT_AN_INT",
        "_duration": None,
    }
    res = detector.predict_anomaly(garbage_crypto)
    assert res["is_anomaly"] in (True, False)
    assert 0.0 <= res["anomaly_score"] <= 1.0


# ─── Category C: Zero-Byte & Extreme Flow Volume ────────────────────────────

def test_robustness_zero_byte_flow(detector):
    zero_crypto = {
        "protocol": "SMTP",
        "tls_version": None,
        "cipher_suite": None,
        "_client_bytes": 0,
        "_server_bytes": 0,
        "_client_packets": 0,
        "_server_packets": 0,
        "_duration": 0.0,
    }
    res = detector.predict_anomaly(zero_crypto)
    assert res["feature_values_used"]["bytes_ratio"] == 0.0
    assert res["feature_values_used"]["packets_ratio"] == 0.0


def test_robustness_extreme_high_volume_flow(detector):
    extreme_crypto = {
        "protocol": "SMTP",
        "tls_version": "TLSv13",
        "cipher_suite": "TLS_AES_256_GCM_SHA384",
        "_client_bytes": 10_000_000_000,   # 10 GB
        "_server_bytes": 50_000_000_000,   # 50 GB
        "_client_packets": 5_000_000,
        "_server_packets": 25_000_000,
        "_duration": 86400.0,               # 24 hours
    }
    res = detector.predict_anomaly(extreme_crypto)
    assert res["feature_values_used"]["client_bytes_log"] > 20.0
    assert res["feature_values_used"]["duration_log"] > 11.0


# ─── Category D: SHA-256 Artifact Integrity Verification ─────────────────────

def test_artifact_sha256_integrity_status(detector):
    assert detector._integrity_status in ("VERIFIED_OK", "INTEGRITY_CHECK_DISABLED")


# ─── Category E: Strict Security-Rule Flag Isolation ────────────────────────

def test_strict_security_rule_flag_isolation(detector):
    crypto_with_all_rule_flags = {
        "protocol": "SMTP",
        "tls_version": "TLSv10",
        "cipher_suite": "TLS_RSA_WITH_RC4_128_SHA",
        "_client_bytes": 100,
        "_server_bytes": 200,
        # Rule flags that MUST NOT leak into ML features
        "weak_cipher": True,
        "weak_tls_version": True,
        "missing_starttls": True,
        "plaintext_auth_risk": True,
        "certificate_self_signed": True,
        "certificate_problem": True,
        "weak_key_size": True,
    }
    res = detector.predict_anomaly(crypto_with_all_rule_flags)
    used = set(res["feature_values_used"].keys())

    forbidden = [
        "weak_cipher", "weak_tls_version", "missing_starttls",
        "plaintext_auth_risk", "certificate_self_signed",
        "certificate_problem", "weak_key_size"
    ]
    for flag in forbidden:
        assert flag not in used, f"Rule output '{flag}' leaked into deployment ML features!"


# ─── Category F: Anomaly Score Bounding ──────────────────────────────────────

def test_anomaly_score_bounding(detector):
    sample = {
        "protocol": "SMTP",
        "tls_version": "TLSv12",
        "_client_bytes": 500,
        "_server_bytes": 1000,
    }
    res = detector.predict_anomaly(sample)
    assert 0.0 <= res["anomaly_score"] <= 1.0
    assert 0.0 <= res["ml_anomaly_score"] <= 1.0
    assert isinstance(res["is_anomaly"], bool)
    assert isinstance(res["raw_score"], float)
    assert res["evaluation_status"].startswith("Unsupervised baseline")


# ─── Category G: Expanded Model v3 & Adapters & Group Splitting ─────────────

def test_expanded_v3_model_variant_loading():
    det_expanded = AIAnomalyDetector(model_variant="expanded_v3")
    assert det_expanded.model_version == "3.0.0"
    assert det_expanded._integrity_status in ("VERIFIED_OK", "INTEGRITY_CHECK_DISABLED")

    sample = {"protocol": "SMTP", "tls_version": "TLSv12", "_client_bytes": 100, "_server_bytes": 200}
    res = det_expanded.predict_anomaly(sample)
    assert "anomaly_score" in res
    assert res["model_version"] == "3.0.0"


def test_dataset_adapters_transformations():
    from dataset_adapters import GenericPCAPZeekAdapter, PassiveOSDatasetAdapter, CESNETTLS22Adapter

    # Passive OS adapter test
    pos_row = {"BYTES A": 1463, "PACKETS A": 9, "TLS_SETUP_TIME": 24001.0, "tls_server_version_name": "TLS 1.2", "cipher_suite_name": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"}
    pos_transformed = PassiveOSDatasetAdapter.adapt_row(pos_row)
    assert validate_deployment_feature_schema(pos_transformed) is True

    # CESNET adapter test
    cesnet_row = {"BYTES_IN": 2000, "BYTES_OUT": 8000, "PKTS_IN": 20, "PKTS_OUT": 30, "DURATION": 3.5, "APPLICATION_PROTOCOL": "SMTP", "TLS_VERSION": "TLSv12", "TLS_CIPHER": "TLS_AES_256_GCM_SHA384"}
    cesnet_transformed = CESNETTLS22Adapter.adapt_row(cesnet_row)
    assert validate_deployment_feature_schema(cesnet_transformed) is True


def test_reproducible_group_split_prevents_leakage():
    from train_deployment_ml import reproducible_group_split
    groups = ["pcap1", "pcap1", "pcap2", "pcap2", "pcap3", "pcap4"]
    train_idx, val_idx, test_idx, train_g, val_g, test_g = reproducible_group_split(groups, 0.5, 0.25, 42)

    # Intersection between train, val, and test group sets must be empty
    assert len(train_g.intersection(val_g)) == 0
    assert len(train_g.intersection(test_g)) == 0
    assert len(val_g.intersection(test_g)) == 0


def test_ground_truth_comparative_evaluation():
    from evaluated_model_comparison import evaluate_variant_on_ground_truth
    res_v3 = evaluate_variant_on_ground_truth("expanded_v3")
    assert "supervised_metrics" in res_v3
    assert res_v3["supervised_metrics"]["f1_score"] > 0.0
    assert res_v3["supervised_metrics"]["accuracy"] > 0.0

