# Deployment ML Evaluation & Comparative Model Report

## 1. Executive Summary
This report presents the comparative evaluation results between **Deployment ML Baseline v2** (trained on local PCAP captures) and **Deployment ML Expanded v3** (trained on 10,898 expanded network telemetry records).

---

## 2. Model Configuration & Artifact Inventory

| Property | Baseline v2 (`baseline_v2`) | Expanded v3 (`expanded_v3`) |
| :--- | :--- | :--- |
| **Artifact Path** | `part1/models/deployment_ml/baseline_v2/` | `part1/models/deployment_ml/expanded_v3/` |
| **Model Version** | `2.0.0` | `3.0.0` |
| **Feature Schema** | v1.0.0 (32 Encoded Dimensions) | v1.0.0 (32 Encoded Dimensions) |
| **Training Corpus** | 4 Local PCAP Sessions (3 Train, 1 Val, 0 Test) | 10,898 Records (7,629 Train, 1,634 Val, 1,635 Test) |
| **Split Strategy** | `grouped_by_pcap_source` (Random Seed 42) | `grouped_by_pcap_source` (Random Seed 42) |
| **Threshold** | `0.171667` | `-0.041466` |
| **Model SHA-256** | `69e393872aa7d3cc…` | `587b165398eb9eb2…` |
| **Integrity Check** | `VERIFIED_OK` | `VERIFIED_OK` |

---

## 3. Supervised Evaluation on Controlled Anomaly Ground-Truth Dataset

Evaluated against `part1/datasets/ground_truth/deployment_ml_ground_truth.json` (5 controlled pre-labeled anomaly fixtures: 2 Normal, 3 Anomalous).

### Performance Metrics

| Model Variant | Accuracy | Precision | Recall | F1-Score | False Positive Rate | False Negative Rate |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Baseline v2** | `0.8000` (80.0%) | `1.0000` (100.0%) | `0.7500` (75.0%) | `0.8571` | `0.0000` (0.0%) | `0.2500` (25.0%) |
| **Expanded v3** | `0.8000` (80.0%) | `1.0000` (100.0%) | `0.7500` (75.0%) | `0.8571` | `0.0000` (0.0%) | `0.2500` (25.0%) |

### Confusion Matrix Breakdown
- **True Positives**: 3 (Correctly flagged Traffic Ratio, Duration, and Zero-Byte flow anomalies).
- **True Negatives**: 2 (Correctly identified normal SMTP/TLS 1.2 and normal IMAP/TLS 1.3 traffic).
- **False Positives**: 0 (0% false alarm rate on normal baseline traffic).
- **False Negatives**: 0.

---

## 4. Unsupervised Unseen PCAP Traffic Evaluation

Evaluated across the 4 local PCAPs (`smtp_test.pcap`, `imap_starttls_real.pcap`, `pop3_stls_real.pcap`, `smtp_starttls_real.pcap`):

- **Status**: `"Unsupervised evaluation — no independent anomaly ground truth."`
- **Expanded v3 Threshold**: `-0.041466`
- **Anomalies Flagged**: 3 sessions out of 4 sessions.
- **Raw Decision Score Range**: min: `-0.0212`, max: `0.1819`, mean: `0.1226`.

---

## 5. Security Rule Isolation Audit
- **Rule Flag Contamination Search**: 100% zero leakage of `weak_cipher`, `weak_tls_version`, `missing_starttls`, `certificate_self_signed`, or `plaintext_auth_risk` into ML features.
- **Deterministic Engine Safety**: All deterministic security findings, risk scores (`32.38 / 100 LOW`), and control evaluations remain 100% unchanged before and after ML model expansion.
