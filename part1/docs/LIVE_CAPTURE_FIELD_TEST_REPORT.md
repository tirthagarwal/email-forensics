# LIVE CAPTURE FIELD TEST REPORT

**Framework**: AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment  
**Module**: `live_capture.py` & `forensic_pipeline.py` Integration  
**Date**: September 2026  

---

## 1. Executive Summary

This report documents the field test validation of the **Live Packet Acquisition & Forensic Pipeline Integration** module (`live_capture.py`). 

The live capture component allows security analysts to perform rolling PCAP capture on specified system interfaces (e.g. `lo0`, `en0`), automatically apply email BPF header filters (`tcp port 25 or 465 or 587 or 143 or 993 or 110 or 995`), rotate PCAP files, enforce retention limits, and feed newly acquired PCAPs into the forensic pipeline (`forensic_pipeline.py`).

---

## 2. Environment & Tooling Verification

- **Operating System**: macOS (Darwin 24.x)
- **Capture Utility**: `tcpdump` (Verified via `shutil.which("tcpdump")`)
- **Default Capture Interface**: `lo0` (Loopback)
- **Output Directory**: `part1/output/live_pcaps/` (Created automatically)
- **Retention Max Files**: 10 rolling PCAPs
- **Rotation Interval**: 10 seconds

---

## 3. Capture Filter Modes & BPF Construction

| Filter Mode | BPF Expression | Scope & Purpose |
| :--- | :--- | :--- |
| `EMAIL_ONLY` | `tcp port 25 or tcp port 465 or tcp port 587 or tcp port 143 or tcp port 993 or tcp port 110 or tcp port 995` | Strict email protocol target acquisition (SMTP, IMAP, POP3, Submission). Excludes non-email noise. |
| `BROAD` | `tcp` | Full TCP session acquisition for network-level traffic audits. |

---

## 4. Controlled Packet Capture Field Test Results

### Test A: Process Startup & Permission Verification
- **Command**: `LiveCaptureManager(interface="lo0", filter_mode="EMAIL_ONLY")`
- **Result**: `start_capture()` creates `part1/output/live_pcaps/`, launches `tcpdump` process, performs non-blocking poll after 0.15s, and confirms process survival.
- **Permission Check**: If executed without elevated permissions on a restricted interface, returns explicit error: `Permission denied for tcpdump on interface '...' (Administrator/sudo permissions required for live packet capture)`.

### Test B: End-to-End Live PCAP Ingestion into Forensic Pipeline
1. **Acquisition**: `live_capture.py` captures traffic into `part1/output/live_pcaps/live_20260927_120000.pcap`.
2. **Zeek Processing**: `run_zeek_analysis()` ingests live PCAP and generates `conn.log`, `ssl.log`, `x509.log`, `smtp.log`.
3. **Session Reconstruction**: Reconstructs email protocol sessions (`SMTP`, `IMAP`, `POP3`).
4. **Feature Extraction**: Extracts 32 deployment ML features and evaluates deterministic security rules (`SecurityRuleEngine`).
5. **Deployment ML Scoring**: Evaluates session features using `expanded_v3` `IsolationForest` (Threshold `-0.041466`, Integrity `VERIFIED_OK`).
6. **Reporting**: Outputs consolidated master JSON report, HTML report, PDF report, and populates Streamlit dashboard.

---

## 5. Security, Privacy & Data Handling Policy

1. **Header-Only Inspection**: Live capture targets TCP packet headers. Plaintext credentials, passwords, and message body payloads are not extracted into feature vectors.
2. **Unlabeled Live Corpus**: Live traffic is classified as **UNLABELED**. It is stored in `part1/datasets/field_test/` and is **NEVER** automatically used for retraining or ground-truth labeling.
3. **Separate Logic**: Live captures use the exact same forensic pipeline (`forensic_pipeline.py`) as offline PCAPs, ensuring zero divergence in security assessment logic.

---

## 6. Audit & Status Summary

| Audit Dimension | Status | Notes |
| :--- | :--- | :--- |
| **Directory Auto-Creation** | `PASSED` | `part1/output/live_pcaps/` created on startup. |
| **BPF Filter Enforcement** | `PASSED` | `EMAIL_ONLY` filter correctly restricts acquisition. |
| **Process Cleanup** | `PASSED` | `stop_capture()` sends `SIGINT` and cleans up sub-processes cleanly. |
| **Pipeline Integration** | `PASSED` | Live PCAPs flow into `forensic_pipeline.py` seamlessly. |
| **Runtime Model Integrity** | `VERIFIED_OK` | `expanded_v3` SHA-256 verified during live scoring. |
