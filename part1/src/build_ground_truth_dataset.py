"""
build_ground_truth_dataset.py
──────────────────────────────
Constructs an independent, controlled ground-truth anomaly dataset for ML evaluation.

IMPORTANT:
  - Anomaly definitions are established PRIOR to model evaluation.
  - Ground truth labels reflect statistical network/cryptographic structure anomalies.
  - Security-policy rule results (e.g. weak_cipher flag) are NOT used as ML labels.
"""

import json
import time
from pathlib import Path

ROOT = Path(__file__).parent.parent.parent
GT_DIR = ROOT / "part1" / "datasets" / "ground_truth"
GT_FILE = GT_DIR / "deployment_ml_ground_truth.json"


def main():
    GT_DIR.mkdir(parents=True, exist_ok=True)

    fixtures = [
        {
            "sample_id": "GT_01_NORMAL_SMTP_TLS12",
            "source_capture_id": "gt_pcap_01",
            "description": "Standard SMTP session over TLS 1.2 with normal flow volume.",
            "ground_truth_anomaly": False,
            "anomaly_category": "NORMAL",
            "label_reason": "Session parameters fall within normal expected baseline distributions.",
            "raw_features": {
                "protocol": "SMTP", "tls_version": "TLSv12",
                "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                "elliptic_curve": "x25519", "tls_established": True,
                "certificate_key_size": 2048, "_client_bytes": 413,
                "_server_bytes": 1838, "_client_packets": 17,
                "_server_packets": 15, "_duration": 2.3
            }
        },
        {
            "sample_id": "GT_02_NORMAL_IMAP_TLS13",
            "source_capture_id": "gt_pcap_02",
            "description": "Standard IMAP session over TLS 1.3 with normal flow volume.",
            "ground_truth_anomaly": False,
            "anomaly_category": "NORMAL",
            "label_reason": "Standard TLS 1.3 IMAP session with typical byte ratios.",
            "raw_features": {
                "protocol": "IMAP", "tls_version": "TLSv13",
                "cipher_suite": "TLS_AES_256_GCM_SHA384",
                "elliptic_curve": "x25519", "tls_established": True,
                "certificate_key_size": 2048, "_client_bytes": 1200,
                "_server_bytes": 4500, "_client_packets": 22,
                "_server_packets": 25, "_duration": 4.1
            }
        },
        {
            "sample_id": "GT_03_ABNORMAL_TRAFFIC_RATIO_ANOMALY",
            "source_capture_id": "gt_pcap_03",
            "description": "Extremely distorted client-to-server byte ratio anomaly (burst upload).",
            "ground_truth_anomaly": True,
            "anomaly_category": "TRAFFIC_RATIO_ANOMALY",
            "label_reason": "Client byte volume is 2,000x greater than server response volume.",
            "raw_features": {
                "protocol": "SMTP", "tls_version": "TLSv12",
                "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                "elliptic_curve": "x25519", "tls_established": True,
                "certificate_key_size": 2048, "_client_bytes": 50_000_000, # 50 MB upload
                "_server_bytes": 250, "_client_packets": 35000,
                "_server_packets": 10, "_duration": 12.0
            }
        },
        {
            "sample_id": "GT_04_ABNORMAL_DURATION_ANOMALY",
            "source_capture_id": "gt_pcap_04",
            "description": "Abnormally long session duration anomaly (hanging connection).",
            "ground_truth_anomaly": True,
            "anomaly_category": "DURATION_ANOMALY",
            "label_reason": "Session duration exceeds 86,400 seconds (24 hours) with minimal data exchange.",
            "raw_features": {
                "protocol": "POP3", "tls_version": "TLSv12",
                "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                "elliptic_curve": "x25519", "tls_established": True,
                "certificate_key_size": 2048, "_client_bytes": 120,
                "_server_bytes": 80, "_client_packets": 3,
                "_server_packets": 3, "_duration": 86400.0 # 24 hrs
            }
        },
        {
            "sample_id": "GT_05_ZERO_BYTE_FLOW_ANOMALY",
            "source_capture_id": "gt_pcap_05",
            "description": "Zero-byte connection established without protocol exchange.",
            "ground_truth_anomaly": True,
            "anomaly_category": "ZERO_BYTE_ANOMALY",
            "label_reason": "Connection contains zero bytes exchanged in both directions.",
            "raw_features": {
                "protocol": "UNKNOWN", "tls_version": None,
                "cipher_suite": None, "elliptic_curve": None,
                "tls_established": False, "certificate_key_size": None,
                "_client_bytes": 0, "_server_bytes": 0,
                "_client_packets": 0, "_server_packets": 0,
                "_duration": 0.0
            }
        }
    ]

    dataset = {
        "dataset_name": "Controlled Deployment ML Ground Truth Anomaly Benchmark",
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "total_samples": len(fixtures),
        "normal_samples": sum(1 for f in fixtures if not f["ground_truth_anomaly"]),
        "anomalous_samples": sum(1 for f in fixtures if f["ground_truth_anomaly"]),
        "annotation_method": "Pre-established statistical network/cryptographic anomaly definitions prior to model inference.",
        "samples": fixtures
    }

    with open(GT_FILE, "w", encoding="utf-8") as f:
        json.dump(dataset, f, indent=2)

    print(f"[Ground Truth] Created controlled ground-truth dataset → {GT_FILE}")
    print(f"  Total samples: {len(fixtures)} ({dataset['normal_samples']} normal, {dataset['anomalous_samples']} anomalous)")


if __name__ == "__main__":
    main()
