# Future Real-World ML Evaluation Plan

## 1. Objective
Establish a scientifically sound, leak-free evaluation methodology for certifying future machine learning models in email network security posture assessment.

---

## 2. Experimental Requirements for Real-World Accuracy Claims

To claim precision, recall, F1-score, or false-positive rates for deployment ML, the evaluation protocol MUST fulfill all of the following:

### A. Independent Ground-Truth Anomaly Labels
- Anomaly labels must be established **prior to model evaluation** through expert annotation or controlled anomaly injection.
- Security vulnerability labels (from rules) must remain separate from statistical network traffic anomaly labels.

### B. Capture & Environment Grouped Splitting
- Train, validation, and test splits **MUST NOT** share sessions from the same PCAP file, host IP range, or network capture environment.
- Splitting must occur at the **capture environment level** to test cross-network generalization.

### C. Threshold Freeze Protocol
- Model decision thresholds must be frozen on the validation split prior to running test evaluation.
- Test set predictions must be evaluated strictly using the frozen threshold.

### D. Diversity Requirements
The test corpus must cover diverse operational parameters:
- **Traffic Volume**: Micro-bursts, zero-byte connections, multi-gigabyte transfers.
- **Protocols**: SMTP, IMAP, POP3, Submission (Port 587), SMTPS (Port 465).
- **TLS Versions**: TLS 1.0, 1.1, 1.2, 1.3, and plain text.
- **Cipher Suites**: Modern AEAD (AES-GCM, CHACHA20-POLY1305), legacy CBC, weak ciphers (RC4, 3DES).
- **Certificates**: Public CA, Private Enterprise CA, Self-Signed, Expired, Revoked, Missing.

---

## 3. Claim Standardization Format
Future performance claims must follow this exact standard:

> *"Model achieved X% Precision and Y% Recall at a False Positive Rate of Z% on a held-out test corpus of N sessions across M independent network environments under Experimental Protocol v1.0."*

No claim of "99.9% real-world accuracy" or "100% production accuracy" shall be made without fulfilling this protocol.
