"""
ai_anomaly_detector.py  (DEPLOYMENT ML — v2.0.0)
──────────────────────────────────────────────────
Loads the trained PCAP/Zeek deployment IsolationForest model and
applies it to individual session feature dicts.

CHANGE LOG
  v1.0.0  — Original SYNTHETIC DEPLOYMENT MODEL (REMOVED).
             Used hardcoded training rows and deterministic security-rule
             flags (weak_cipher, missing_starttls, etc.) as ML features.

  v2.0.0  — DEPLOYMENT ML BASELINE (this file).
             Loads pre-trained model artifact.
             Uses PCAP/Zeek-native traffic, session, and cryptographic
             structural features ONLY.
             Does NOT use deterministic security-rule outputs.
             Includes SHA-256 artifact integrity verification.
             Fails with a clear error if model artifacts are absent or tampered.

IMPORTANT ARCHITECTURAL SEPARATION
  This deployment model is SEPARATE from the frozen Passive OS
  Dataset ML PoC at:
      part1/datasets/processed/anomaly_models/

SCORE INTERPRETATION
  anomaly_score: float in [0.0, 1.0]
    Higher value → more anomalous relative to deployment baseline.
    Derived from IsolationForest decision_function:
        raw_score  = decision_function(X)[0]
        anomaly_score = clip(0.5 - raw_score, 0.0, 1.0)
    This score is a model-derived relative anomaly score and is NOT a probability.

  is_anomaly: bool
    True when raw_score <= frozen threshold (from deployment_threshold.json).
    An ML anomaly does NOT automatically constitute a security vulnerability.
"""

import hashlib
import json
import math
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np

# ─── Paths ──────────────────────────────────────────────────────────────────
_THIS_DIR   = Path(__file__).parent
_ROOT       = _THIS_DIR.parent.parent
_MODEL_DIR  = _ROOT / "part1" / "models" / "deployment_ml"

MODEL_PATH     = _MODEL_DIR / "deployment_isolation_forest.joblib"
THRESHOLD_PATH = _MODEL_DIR / "deployment_threshold.json"
SCHEMA_PATH    = _MODEL_DIR / "deployment_feature_schema.json"
METADATA_PATH  = _MODEL_DIR / "deployment_training_metadata.json"

TRAIN_COMMAND = "python3 part1/src/train_deployment_ml.py"


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


class AIAnomalyDetector:
    """
    Deployment IsolationForest anomaly detector.

    Loads a pre-trained model from part1/models/deployment_ml/.
    Supports selecting between 'expanded_v3' (default) and 'baseline_v2' variants.
    """

    def __init__(self, model_variant: str = "expanded_v3", verify_integrity: bool = True):
        self.model_name    = "IsolationForest"
        self.model_variant = model_variant
        self.model_version = "3.0.0" if model_variant == "expanded_v3" else "2.0.0"
        self._model        = None
        self._threshold    = None
        self._schema       = None
        self._metadata     = None
        self._feature_schema_version = "unknown"
        self._artifact_hashes = {}
        self._integrity_status = "UNVERIFIED"

        self._load_artifacts(verify_integrity=verify_integrity)

    # ── Artifact loading & Integrity Verification ──────────────────────────

    def _load_artifacts(self, verify_integrity: bool = True) -> None:
        """Load model, threshold, schema, and metadata from disk and check integrity."""
        variant_dir = _MODEL_DIR / self.model_variant
        if not variant_dir.exists():
            variant_dir = _MODEL_DIR

        model_path     = variant_dir / "deployment_isolation_forest.joblib"
        threshold_path = variant_dir / "deployment_threshold.json"
        schema_path    = variant_dir / "deployment_feature_schema.json"
        metadata_path  = variant_dir / "deployment_training_metadata.json"

        missing = [
            str(p) for p in [model_path, threshold_path, schema_path]
            if not p.exists()
        ]
        if missing:
            raise RuntimeError(
                f"[AIAnomalyDetector] Deployment ML artifacts not found for '{self.model_variant}':\n"
                + "\n".join(f"  {m}" for m in missing)
                + f"\n\nRun the training script first:\n  {TRAIN_COMMAND}"
            )

        import joblib
        self._model = joblib.load(model_path)

        with open(threshold_path) as f:
            thresh_data = json.load(f)
        self._threshold = float(thresh_data["threshold"])

        with open(schema_path) as f:
            self._schema = json.load(f)
        self._feature_schema_version = self._schema.get(
            "feature_schema_version", "unknown"
        )

        if metadata_path.exists():
            with open(metadata_path) as f:
                self._metadata = json.load(f)
            self._artifact_hashes = self._metadata.get("artifact_hashes_sha256", {})

        # Optional SHA-256 verification
        if verify_integrity and self._artifact_hashes:
            current_model_sha = compute_file_sha256(model_path)
            expected_model_sha = self._artifact_hashes.get("deployment_isolation_forest.joblib")

            current_thresh_sha = compute_file_sha256(threshold_path)
            expected_thresh_sha = self._artifact_hashes.get("deployment_threshold.json")

            current_schema_sha = compute_file_sha256(schema_path)
            expected_schema_sha = self._artifact_hashes.get("deployment_feature_schema.json")

            mismatch = []
            if expected_model_sha and current_model_sha != expected_model_sha:
                mismatch.append(f"Model file digest mismatch: {current_model_sha[:12]} != {expected_model_sha[:12]}")
            if expected_thresh_sha and current_thresh_sha != expected_thresh_sha:
                mismatch.append(f"Threshold file digest mismatch: {current_thresh_sha[:12]} != {expected_thresh_sha[:12]}")
            if expected_schema_sha and current_schema_sha != expected_schema_sha:
                mismatch.append(f"Schema file digest mismatch: {current_schema_sha[:12]} != {expected_schema_sha[:12]}")

            if mismatch:
                self._integrity_status = "TAMPERED / MISMATCH"
                print(f"[AIAnomalyDetector Warning] Artifact integrity verification failure: {'; '.join(mismatch)}")
            else:
                self._integrity_status = "VERIFIED_OK"
        elif not verify_integrity:
            self._integrity_status = "INTEGRITY_CHECK_DISABLED"

    # ── Public API ────────────────────────────────────────────────────────

    def predict_anomaly(self, crypto_features: Dict[str, Any]) -> Dict[str, Any]:
        """
        Score one session using the deployment ML model.

        Parameters
        ----------
        crypto_features : dict
            Output of crypto_features.extract_crypto_features(session).
            Security-rule flags (weak_cipher, etc.) are IGNORED here.

        Returns
        -------
        dict with keys:
            model_name
            model_version
            feature_schema_version
            raw_score
            anomaly_score
            threshold
            is_anomaly
            feature_values_used
            training_source
            evaluation_status
            explanation
            integrity_status
        """
        feat_dict = self._extract_deployment_features_from_crypto(crypto_features)
        feature_names = self._schema.get("feature_names", [])
        x_vec = np.array([[feat_dict.get(n, 0.0) for n in feature_names]])

        raw_score = float(self._model.decision_function(x_vec)[0])
        anomaly_score = round(float(np.clip(0.5 - raw_score, 0.0, 1.0)), 4)
        is_anomaly = bool(raw_score <= self._threshold)

        training_source = "PCAP/Zeek deployment corpus"
        if self._metadata:
            training_source = self._metadata.get("training_source", training_source)

        explanation = self._build_explanation(is_anomaly, feat_dict, raw_score)

        return {
            "model_name":             self.model_name,
            "model_version":          self.model_version,
            "feature_schema_version": self._feature_schema_version,
            "raw_score":              round(raw_score, 6),
            "anomaly_score":          anomaly_score,
            "ml_anomaly_score":       anomaly_score,
            "threshold":              round(self._threshold, 6),
            "is_anomaly":             is_anomaly,
            "feature_values_used":    {k: round(v, 4) for k, v in feat_dict.items()},
            "training_source":        training_source,
            "integrity_status":       self._integrity_status,
            "evaluation_status": (
                "Unsupervised baseline. No independent ground-truth anomaly "
                "labels available. Precision, recall, F1, and FPR/FNR NOT claimed."
            ),
            "explanation":            explanation,
            "anomalous_features":     [],
        }

    # ── Internal Feature Extraction & Robustness Sanitization ──────────────

    def _extract_deployment_features_from_crypto(
        self, cf: Dict[str, Any]
    ) -> Dict[str, float]:
        """
        Pull deployment ML features from the crypto_features dict.
        Robustly sanitizes negative numbers, missing values, and invalid types.
        DOES NOT use deterministic security-rule flags.
        """
        # Raw packet/byte counts passed from connection dictionary
        # Sanitize: reject negative values by clamping to 0
        client_bytes   = max(0, _safe_int(cf.get("_client_bytes",   0)))
        server_bytes   = max(0, _safe_int(cf.get("_server_bytes",   0)))
        client_packets = max(0, _safe_int(cf.get("_client_packets", 0)))
        server_packets = max(0, _safe_int(cf.get("_server_packets", 0)))
        duration       = max(0.0, _safe_float(cf.get("_duration",     0.0)))

        tls_version  = cf.get("tls_version")  or None
        cipher_suite = cf.get("cipher_suite") or None
        curve        = cf.get("elliptic_curve") or None

        raw_key_size = cf.get("certificate_key_size")
        cert_key_sz  = max(0, _safe_int(raw_key_size, 0)) if raw_key_size is not None else None
        tls_est      = bool(cf.get("tls_established", False))

        # Forward secrecy derived from cipher name alone
        fwd_sec: Optional[bool] = None
        if cipher_suite and isinstance(cipher_suite, str):
            fwd_sec = any(
                kw in cipher_suite.upper() for kw in ("ECDHE", "DHE", "EDH")
            )

        raw_proto = cf.get("protocol")
        protocol = (str(raw_proto).upper() if raw_proto else "UNKNOWN")

        # Numeric log-transformations
        cb_log   = math.log1p(client_bytes)
        sb_log   = math.log1p(server_bytes)
        cp_log   = math.log1p(client_packets)
        sp_log   = math.log1p(server_packets)
        dur_log  = math.log1p(duration)
        b_ratio  = client_bytes   / (server_bytes   + 1)
        p_ratio  = client_packets / (server_packets + 1)
        ck_scaled = (float(cert_key_sz) / 4096.0) if cert_key_sz else 0.0
        tls_flag = 1.0 if tls_est else 0.0
        fs_flag  = 1.0 if fwd_sec else 0.0

        feat: Dict[str, float] = {
            "client_bytes_log":            cb_log,
            "server_bytes_log":            sb_log,
            "client_packets_log":          cp_log,
            "server_packets_log":          sp_log,
            "duration_log":                dur_log,
            "bytes_ratio":                 b_ratio,
            "packets_ratio":               p_ratio,
            "certificate_key_size_scaled": ck_scaled,
            "tls_established_flag":        tls_flag,
            "forward_secrecy_flag":        fs_flag,
        }

        # One-hot protocol
        proto_vocab = ["SMTP", "IMAP", "POP3", "UNKNOWN"]
        proto_norm  = protocol if protocol in proto_vocab else "UNKNOWN"
        for v in proto_vocab:
            feat[f"protocol_cat__{v}"] = 1.0 if proto_norm == v else 0.0

        # One-hot TLS version
        tls_vocab = ["TLSv13", "TLSv12", "TLSv11", "TLSv10", "SSLv3", "UNKNOWN"]
        tls_norm  = tls_version if (tls_version and tls_version in tls_vocab) else "UNKNOWN"
        for v in tls_vocab:
            feat[f"tls_version_cat__{v}"] = 1.0 if tls_norm == v else 0.0

        # One-hot cipher suite
        cipher_vocab = [
            "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
            "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
            "TLS_ECDHE_RSA_WITH_AES_256_CBC_SHA384",
            "TLS_ECDHE_RSA_WITH_AES_128_CBC_SHA256",
            "TLS_AES_256_GCM_SHA384",
            "TLS_AES_128_GCM_SHA256",
            "UNKNOWN",
        ]
        cipher_norm = cipher_suite if (cipher_suite and cipher_suite in cipher_vocab) else "UNKNOWN"
        for v in cipher_vocab:
            feat[f"cipher_suite_cat__{v}"] = 1.0 if cipher_norm == v else 0.0

        # One-hot elliptic curve
        curve_vocab = ["x25519", "secp256r1", "secp384r1", "secp521r1", "UNKNOWN"]
        curve_norm  = curve if (curve and curve in curve_vocab) else "UNKNOWN"
        for v in curve_vocab:
            feat[f"elliptic_curve_cat__{v}"] = 1.0 if curve_norm == v else 0.0

        return feat

    def _build_explanation(
        self,
        is_anomaly: bool,
        feat_dict: Dict[str, float],
        raw_score: float,
    ) -> str:
        """
        Produce a human-readable ML explanation that references only
        ML feature dimensions — NEVER security rule findings.
        """
        if not is_anomaly:
            return (
                "Session flow volume, cryptographic/session structure, and "
                "connection characteristics are consistent with the deployment "
                "baseline distribution. No statistical anomaly detected."
            )

        numeric_keys = [
            "client_bytes_log", "server_bytes_log", "duration_log",
            "bytes_ratio", "packets_ratio", "certificate_key_size_scaled",
        ]
        notable = []
        for k in numeric_keys:
            v = feat_dict.get(k, 0.0)
            if v == 0.0:
                notable.append(k.replace("_log", "").replace("_", " "))

        detail = (
            "Observed flow volume and/or cryptographic/session characteristics "
            "differ statistically from the deployment baseline. "
        )
        if notable:
            detail += (
                f"Zero values noted for: {', '.join(notable[:3])} "
                "(these may be missing or unobserved in the passive capture). "
            )
        detail += (
            "An ML anomaly does NOT automatically constitute a security "
            "vulnerability — consult the deterministic security findings "
            "for policy-level assessment."
        )
        return detail


# ─── Internal helpers ────────────────────────────────────────────────────────

def _safe_int(v: Any, default: int = 0) -> int:
    if v is None:
        return default
    try:
        return int(v)
    except (TypeError, ValueError):
        return default


def _safe_float(v: Any, default: float = 0.0) -> float:
    if v is None:
        return default
    try:
        return float(v)
    except (TypeError, ValueError):
        return default


if __name__ == "__main__":
    detector = AIAnomalyDetector()
    sample = {
        "protocol": "SMTP", "tls_version": "TLSv12",
        "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
        "elliptic_curve": "x25519", "tls_established": True,
        "certificate_key_size": 2048, "_client_bytes": 413,
        "_server_bytes": 1838, "_client_packets": 17,
        "_server_packets": 15, "_duration": 2.3
    }
    res = detector.predict_anomaly(sample)
    print("AI Anomaly Detector Result:")
    print(json.dumps({k: v for k, v in res.items() if k != "feature_values_used"}, indent=2))
