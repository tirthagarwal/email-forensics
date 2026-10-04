# FINAL LIVE ML VALIDATION & FIELD READINESS REPORT

**Framework**: AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment  
**Model Version**: Deployment ML v3.0.0 (`expanded_v3` IsolationForest)  
**Schema Version**: 1.0.0 (32 encoded dimensions)  
**Artifact Integrity**: `VERIFIED_OK` (SHA-256 Checksums Verified)  
**Date**: September 2026  

---

## 1. Executive Summary

This report documents the complete field validation, live packet acquisition audit, domain shift analysis, artifact integrity verification, and deterministic security regression testing for the **AI-Assisted Email Cryptographic Security Posture Assessment Framework**.

All 30 unit tests pass (100%). The active deployment ML model is **Deployment ML v3.0.0 (`expanded_v3`)**, loaded with SHA-256 artifact verification (`VERIFIED_OK`). The pipeline maintains 100% architectural separation between deterministic security policy rules and unsupervised ML anomaly detection.

---

## 2. Current Framework Architecture

```
                 PCAP / Live Traffic (tcpdump / lo0 / en0)
                                    │
                                    ▼
                         Zeek Log Reconstruction
                   (conn.log, ssl.log, x509.log, smtp.log)
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   Email Protocol Analysis                   TLS / Crypto Analysis
    (SMTP / IMAP / POP3)                   (TLSv1.0-1.3, Ciphers, Curves)
    (STARTTLS / STLS State)                 (X.509 Certificate Evidence)
               │                                         │
               └────────────────────┬────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
Deterministic Security Rules (SecurityRuleEngine)    Deployment ML (AIAnomalyDetector v3.0.0)
• 0 ML features consumed                             • 32-dim raw flow & crypto features
• Exact RFC policy checks                            • IsolationForest (n=200, seed=42)
• Outputs: Severity, Evidence, Fixes                 • Unsupervised relative anomaly score
          │                                                   │
          └─────────────────────────┬─────────────────────────┘
                                    ▼
                     Risk Engine & Posture Aggregator
                     (Overall Risk: 32.38 / 100 LOW)
                                    │
                                    ▼
            Reports (JSON, HTML, PDF) & Interactive Dashboard
```

---

## 3. Live Capture Validation

- **Module**: `part1/src/live_capture.py` (`LiveCaptureManager`)
- **Supported Interfaces**: `lo0` (Loopback), `en0` (Ethernet/Wi-Fi), auto-detected via `tcpdump -D`.
- **BPF Filters**:
  - `EMAIL_ONLY`: `tcp port 25 or tcp port 465 or tcp port 587 or tcp port 143 or tcp port 993 or tcp port 110 or tcp port 995`
  - `BROAD`: `tcp`
- **Output Directory**: `part1/output/live_pcaps/` (Created automatically on startup).
- **Process Management**: Uses `subprocess.Popen` with non-blocking post-spawn check for immediate exit/permission failure. Clean process termination via `SIGINT`.
- **Rolling Retention**: Enforces `retention_max_files` (default 10) to prevent disk saturation.

---

## 4. Offline Pipeline Validation

- **CLI Execution**: `python3 part1/src/forensic_pipeline.py --input-dir part1/pcaps/ --format all`
- **Ingestion**: 4 local PCAP sessions processed via Zeek.
- **Reconstructed Sessions**: 4 email sessions (`smtp_starttls_real.pcap`, `imap_implicit_tls.pcap`, `pop3_stls.pcap`, `smtp_weak_tls.pcap`).
- **Reports Generated**: Master JSON (`forensic_report.json`), HTML (`forensic_report.html`), PDF (`forensic_report.pdf`).

---

## 5. Deployment ML Runtime Validation

Runtime diagnostic verified via `python3 part1/src/inspect_deployment_ml_runtime.py`:

```
Model Name           : IsolationForest
Model Variant        : expanded_v3
Model Version        : 3.0.0
Feature Schema Ver   : 1.0.0
Feature Count        : 32
Threshold            : -0.041466
Integrity Status     : VERIFIED_OK

Artifact SHA-256 Checksums:
  - deployment_isolation_forest.joblib : 587b165398eb9eb2…efcbc791
  - deployment_threshold.json          : 6ab6ec685fc522dc…9b4e88ac
  - deployment_feature_schema.json     : 3c2d5eb21801e225…d8250dce
```

---

## 6. Expanded Dataset Validation

- **Total Corpus Size**: 10,898 records
- **Training Set**: 7,629 records (70%)
- **Validation Set**: 1,635 records (15%)
- **Test Set**: 1,634 records (15%)
- **Splitting Strategy**: Group-aware capture splitting by `source_capture_id` using `reproducible_group_split()` (seed=42). Zero split cross-contamination.

---

## 7. Domain Shift & Missingness Sentinel Analysis

- **Observation**: `expanded_v3` assigns IsolationForest scores between `-0.1873` and `-0.1082` to all 4 local Zeek PCAP sessions, placing them below the validation threshold (`-0.041466`).
- **Cause**: 99.96% (10,894 / 10,898) of the expanded dataset consists of Passive OS telemetry records where `server_bytes=0`, `server_packets=0`, `certificate_key_size=None`, and `protocol=UNKNOWN`.
- **Mechanism**: IsolationForest trees isolate complete Zeek PCAP flows (which have non-zero server bytes, server packets, and cert key lengths) in fewer splits due to sentinel value contrast.
- **Conclusion**: The 4/4 anomaly result is a **Domain Shift / Missingness Sentinel Artifact**, NOT evidence of malicious activity or security risk.

---

## 8. Controlled Ground-Truth Benchmark Results

Evaluated on 5 pre-labeled ground-truth test fixtures (`part1/datasets/ground_truth/deployment_ml_ground_truth.json`):

| Model Variant | Threshold | True Pos (TP) | False Pos (FP) | True Neg (TN) | False Neg (FN) | Precision | Recall | F1 Score | FPR | FNR |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`baseline_v2`** | `0.171667` | 3 | 0 | 2 | 0 | 100.0% | 100.0% | **1.0000** | 0.0% | 0.0% |
| **`expanded_v3`** | `-0.041466` | 3 | 0 | 2 | 0 | 100.0% | 100.0% | **1.0000** | 0.0% | 0.0% |

*Note: Ground-truth metrics apply strictly to the 5 pre-labeled benchmark fixtures. Unannotated live traffic is scored as unsupervised relative anomaly scores.*

---

## 9. Unseen Traffic Results

Evaluated on 4 novel PCAP sessions:
- **Corpus**: 4 sessions
- **Mean Anomaly Score**: `0.6280`
- **Min Score**: `0.6082` | **Max Score**: `0.6873`
- **Evaluation Status**: Unsupervised relative anomaly scores. Precision, recall, and F1 are correctly omitted due to lack of independent ground-truth labels.

---

## 10. Deterministic Security Policy Regression

Running `forensic_pipeline.py` on the 4 local PCAP fixtures produces exact regression parity:
- **Baseline Security Score**: `80.0 / 100`
- **Cryptographic Score**: `65.0 / 100`
- **Overall Risk Score**: `32.38 / 100 LOW`
- **Prioritized Findings**: 6 findings (1 Critical, 1 High, 2 Medium, 2 Low) — 100% unchanged.

---

## 11. TLS 1.3 Keylog Decryption Regression

- **TLS 1.3 Without Keylog**: Assigns `VISIBILITY_LIMITED` for encrypted handshakes without certificate leakage. Zero false-positive trust violations penalty.
- **Authorized TLS 1.3 NSS Keylog**: `decrypt_tls13_pcap_certificates()` successfully decrypts encrypted handshakes, extracts X.509 certificates, and updates visibility status to `OBSERVED`.

---

## 12. Artifact Integrity Verification

- SHA-256 digests computed for model (`joblib`), threshold (`json`), and schema (`json`).
- If any artifact is modified or corrupted, `AIAnomalyDetector` reports `TAMPERED / MISMATCH` warning.

---

## 13. Privacy & Security Compliance

- **No Credential Extraction**: Passwords, auth tokens, and email body payloads are excluded from feature vectors.
- **No Secret Leakage**: TLS keylog secrets and private keys never appear in JSON, HTML, PDF reports, or the Streamlit dashboard.

---

## 14. Streamlit Dashboard Integration

Updated Tab 5 ("Deployment ML Anomaly Detection") features:
- Active Model Metadata (`expanded_v3`, v3.0.0, Schema v1.0.0, 32 features, 10,898 records, threshold `-0.041466`, `VERIFIED_OK`).
- Controlled Anomaly Ground-Truth Benchmark Results Expander.
- Clear disclaimer: `"ML anomaly score indicates statistical divergence relative to training distribution — NOT a confirmed security vulnerability."`

---

## 15. Automated Test Suite Results

Command: `python3 -m pytest part1/tests/`
- **Total Tests**: **30 passed** (100%)
- **Test Duration**: 2.50s
- **Coverage**: Feature extraction, missingness handling, negative clamping, extreme flow volume, SHA-256 integrity, strict rule-ML isolation, expanded model loading, dataset adapters, group splitting, ground truth evaluation, live capture manager.

---

## 16. Limitations

1. **Passive Telemetry Imbalance**: Passive OS telemetry lacks server-side flow metrics, introducing sentinel domain shift in `expanded_v3`.
2. **Small Controlled Ground-Truth Corpus**: The 5-fixture ground-truth benchmark is for controlled validation only and does not represent real-world accuracy.
3. **Unsupervised Nature**: Live traffic anomaly scores measure statistical distance from training distribution and cannot guarantee threat detection.

---

## 17. Claims We Can Safely Make for SIH

- ✅ *"The framework implements automated passive network forensics for email cryptographic posture assessment."*
- ✅ *"Combines deterministic RFC security rules with unsupervised ML anomaly detection."*
- ✅ *"Maintains 100% architectural separation between security policy rules and ML features."*
- ✅ *"Includes SHA-256 artifact integrity verification to prevent model tampering."*
- ✅ *"Supports authorized TLS 1.3 NSS keylog decryption for full handshake visibility."*

---

## 18. Claims We Cannot Yet Make

- ❌ *"Our AI detects 100% of real-world email attacks."*
- ❌ *"The ML model achieves 99.9% production precision."*
- ❌ *"An ML anomaly flag confirms a security vulnerability."*

---

## 19. Recommended Next Experiments

1. Ingest full-flow NetFlow/IPFIX datasets (such as NetFlow-complete CESNET-TLS22) containing observed server-side flow metrics.
2. Extend `live_capture.py` with an automated daemon mode for continuous background PCAP acquisition.

---

## 20. SIH Demonstration Checklist

- [x] PCAP ingestion & Zeek log parsing
- [x] SMTP, IMAP, POP3 protocol detection
- [x] STARTTLS & STLS state machine extraction
- [x] TLS version, cipher suite, and curve analysis
- [x] X.509 certificate trust & key length evaluation
- [x] TLS 1.3 visibility limitation handling
- [x] Authorized TLS 1.3 NSS keylog decryption
- [x] Deterministic security policy scoring (Score: 32.38 LOW)
- [x] Deployment ML anomaly detection (`expanded_v3`, v3.0.0, 32 features, `VERIFIED_OK`)
- [x] Rule-ML feature isolation (0 rule flags in ML)
- [x] JSON, HTML, PDF forensic report generation
- [x] Interactive Streamlit dashboard (`streamlit run part1/src/dashboard.py`)
- [x] Live packet capture capabilities (`live_capture.py`)
- [x] 30/30 automated unit tests passing
