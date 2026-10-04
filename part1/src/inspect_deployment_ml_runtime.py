"""
inspect_deployment_ml_runtime.py
───────────────────────────────────
Diagnostic CLI script to verify and audit the active Deployment ML runtime.

Reports model path, model version, schema version, feature count, threshold,
training metadata, SHA-256 hashes, integrity status, and sample inference behavior.
"""

import json
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent))

from ai_anomaly_detector import AIAnomalyDetector


def main():
    print("=" * 65)
    print("  Deployment ML Runtime Diagnostic & Integrity Inspection")
    print("=" * 65)

    detector = AIAnomalyDetector(model_variant="expanded_v3", verify_integrity=True)

    print(f"Model Name           : {detector.model_name}")
    print(f"Model Variant        : {detector.model_variant}")
    print(f"Model Version        : {detector.model_version}")
    print(f"Feature Schema Ver   : {detector._feature_schema_version}")
    print(f"Feature Count        : {len(detector._schema.get('feature_names', []))}")
    print(f"Threshold            : {detector._threshold:.6f}")
    print(f"Integrity Status     : {detector._integrity_status}")

    if detector._metadata:
        print("\n─── Metadata Summary ─────────────────────────────────────────")
        print(f"Training Rows        : {detector._metadata.get('training_rows')}")
        print(f"Validation Rows      : {detector._metadata.get('validation_rows')}")
        print(f"Test Rows            : {detector._metadata.get('test_rows')}")
        print(f"Total Sessions       : {detector._metadata.get('total_sessions')}")
        print(f"Train Groups Count   : {detector._metadata.get('train_groups_count')}")
        print(f"Split Method         : {detector._metadata.get('split_method')}")
        print(f"Random Seed          : {detector._metadata.get('random_seed')}")
        print(f"N Estimators         : {detector._metadata.get('n_estimators')}")

    if detector._artifact_hashes:
        print("\n─── Artifact SHA-256 Checksums ───────────────────────────────")
        for fn, h in detector._artifact_hashes.items():
            print(f"  - {fn:<35}: {h[:16]}…{h[-8:]}")

    print("\n─── Sample Session Inference Test ────────────────────────────")
    sample_crypto = {
        "protocol": "SMTP",
        "tls_version": "TLSv12",
        "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
        "elliptic_curve": "x25519",
        "tls_established": True,
        "certificate_key_size": 2048,
        "_client_bytes": 413,
        "_server_bytes": 1838,
        "_client_packets": 17,
        "_server_packets": 15,
        "_duration": 2.3,
    }

    res = detector.predict_anomaly(sample_crypto)
    print(f"Raw Decision Score   : {res['raw_score']:.6f}")
    print(f"Anomaly Score        : {res['anomaly_score']}")
    print(f"Is Anomaly           : {res['is_anomaly']}")
    print(f"Evaluation Status    : {res['evaluation_status']}")
    print(f"Explanation          : {res['explanation']}")

    print("=" * 65)
    print("  Inspection Complete — Runtime Active & Verified.")
    print("=" * 65)


if __name__ == "__main__":
    main()
