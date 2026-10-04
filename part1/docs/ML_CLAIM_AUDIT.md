# MACHINE LEARNING & PROJECT CLAIM AUDIT

**Framework**: AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment  
**Audit Scope**: Project Documentation, Code Comments, Benchmark Reports, Dashboard Claims  
**Date**: September 2026  

---

## 1. Executive Summary

This document establishes a formal scientific audit of all capability, accuracy, and operational claims made across the codebase, documentation, reports, and interactive UI of this framework.

To maintain scientific integrity and defensibility for Smart India Hackathon (SIH) presentation, every claim is classified into one of four strict categories:
1. **`VALIDATED`**: Supported by reproducible empirical code, automated unit tests, and empirical runtime verification.
2. **`CONTROLLED ONLY`**: Validated strictly within controlled benchmark environments or pre-labeled ground-truth fixtures.
3. **`UNSUPERVISED`**: Measures relative statistical anomaly distribution; does not claim absolute ground-truth classification.
4. **`NOT YET VALIDATED`**: Unsupported by current empirical evidence; prohibited from being presented as a production capability.

---

## 2. Claim Classification Registry

| # | Claim | Classification | Supporting Evidence / Methodological Rationale |
| :--- | :--- | :--- | :--- |
| **1** | Automated PCAP & Zeek log ingestion | `VALIDATED` | Verified by `analyze_pcap_files()` across 4 local PCAP fixtures and live capture pipeline. |
| **2** | Email protocol detection (SMTP, IMAP, POP3) | `VALIDATED` | Parsed via `EmailProtocolParser` and verified by 30 unit tests. |
| **3** | STARTTLS & STLS handshake analysis | `VALIDATED` | State-machine extraction in `email_protocol_parser.py` and `tls_analyzer.py`. |
| **4** | Cryptographic posture & certificate extraction | `VALIDATED` | X.509 parsing, key size, algorithm, issuer, and self-signed status extracted cleanly. |
| **5** | TLS 1.3 Visibility Limitation Handling | `VALIDATED` | Assigns `VISIBILITY_LIMITED` when TLS 1.3 encrypted handshake prevents out-of-band certificate inspection without keylog. |
| **6** | Authorized TLS 1.3 NSS Keylog Decryption | `VALIDATED` | `decrypt_tls13_pcap_certificates()` decrypts encrypted handshakes when authorized keylog is provided (`test_tls13_keylog_decryption_module_valid`). |
| **7** | Deterministic Security Policy Scoring | `VALIDATED` | 100% exact rule execution (Baseline 80.0, Crypto 65.0, Risk 32.38 LOW, 6 prioritized findings). |
| **8** | 32-Dimensional Deployment ML Feature Vector | `VALIDATED` | Schema v1.0.0 verified via `validate_deployment_feature_schema()` in 30 unit tests. |
| **9** | SHA-256 Artifact Integrity Verification | `VALIDATED` | `AIAnomalyDetector` computes file SHA-256 digests and enforces `VERIFIED_OK` status on load. |
| **10** | Strict Rule-ML Separation | `VALIDATED` | Automated test `test_strict_security_rule_flag_isolation` proves zero security policy flags enter ML features. |
| **11** | Model Training Reproducibility | `VALIDATED` | Fixed seed (`random_state=42`) produces identical model weights, decision scores, and thresholds. |
| **12** | Controlled Anomaly Ground-Truth Benchmark (F1=0.8571, Precision=100%, Recall=75%, FPR=0%, FNR=25%) | `CONTROLLED ONLY` | Validated on 5 pre-labeled ground-truth fixtures (`part1/datasets/ground_truth/deployment_ml_ground_truth.json`). **MUST NOT be claimed as real-world accuracy.** |
| **13** | Unseen PCAP Anomaly Detection | `UNSUPERVISED` | Scores relative statistical distance using IsolationForest decision function. Ground truth unavailable for unannotated live traffic. |
| **14** | Live Packet Acquisition (`live_capture.py`) | `VALIDATED` | `tcpdump` subprocess management, BPF filtering (`EMAIL_ONLY`, `BROAD`), directory creation, and status monitoring verified. |
| **15** | Real-World Anomaly Precision & Recall | `NOT YET VALIDATED` | Requires large-scale independently labeled production network traffic datasets. |
| **16** | Cross-Enterprise ML Generalization | `NOT YET VALIDATED` | Requires multi-enterprise deployment telemetry across diverse infrastructure environments. |

---

## 3. Mandatory Presentation & Language Guidelines

### Approved Terminology for Demonstrations
- *"Deterministic Security Rules assess policy compliance against RFC standards."*
- *"Deployment ML provides unsupervised statistical anomaly detection for traffic flow structure."*
- *"Controlled Ground-Truth Benchmark achieved F1=0.8571 on 5 pre-labeled test fixtures."*
- *"ML Anomaly Score indicates statistical divergence relative to the baseline training distribution, NOT a confirmed security vulnerability."*

### Prohibited Claims (Strictly Banned)
- ❌ *"Our AI detects 100% of malicious network attacks in production."*
- ❌ *"The ML model has 99.9% real-world accuracy."*
- ❌ *"ML anomaly score equals vulnerability probability."*
- ❌ *"The AI replaces deterministic security policy rules."*
