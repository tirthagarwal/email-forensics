# AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment

This repository contains the complete implementation for the **AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment**.

---

## 1. Quick Demonstration Guide

Follow these steps to demonstrate the framework end-to-end:

### Step 1: Run Automated Test Suite
```bash
python3 -m pytest part1/tests/
```
*(Executes 25 unit test suites covering protocol parsing, feature extraction, security rules, risk engine, finding correlation, deployment ML robustness, and SHA-256 artifact integrity).*

### Step 2: Run Controlled Evaluation Benchmark
```bash
python3 part1/src/controlled_evaluation.py
```
*(Evaluates deterministic rule accuracy against labeled fixtures: 5/5 exact matches, 100% accuracy).*

### Step 3: Run Deployment ML Unseen PCAP Evaluation
```bash
python3 part1/src/unseen_pcap_evaluation.py
```
*(Evaluates unseen traffic distributions using IsolationForest v2.0.0).*

### Step 4: Execute Multi-PCAP Forensic Pipeline
```bash
python3 part1/src/forensic_pipeline.py --input-dir part1/pcaps/ --format all
```
*Generates master forensic reports:*
- **Master JSON**: `part1/output/forensic_report.json`
- **Executive HTML**: `part1/output/forensic_report.html`
- **Printable PDF**: `part1/output/forensic_report.pdf`

### Step 5: Retrain Deployment ML Baseline Model
```bash
python3 part1/src/train_deployment_ml.py
```
*(Retrains IsolationForest on PCAP capture corpus, updates threshold, schema v1.0.0, and SHA-256 hashes).*

### Step 6: Launch Interactive Streamlit Dashboard
```bash
streamlit run part1/src/dashboard.py
```
*Opens the interactive Cybersecurity Posture Platform UI in your browser.*

---

## 2. Architecture Overview

```
PCAP Capture Files / Authorized Live Traffic
       ↓
Zeek Network Protocol Engine (conn.log, smtp.log, ssl.log, x509.log, notice.log)
       ↓
Log Normalizer & Protocol Parser (email_protocol_parser.py / tls_analyzer.py)
       ↓
Cryptographic Feature Extraction Layer (crypto_features.py)
       ↓
 ┌──────────────────────────────────────────────┐
 │                                              │
 ↓                                              ↓
Deterministic Security Rules                Deployment ML IsolationForest
(security_rules.py & Knowledge Base)        (deployment_ml_features.py / v2.0.0)
 ↓                                              ↓
Security Policy Findings                    Statistical Traffic Anomalies
 │                                              │
 └──────────────────────┬───────────────────────┘
                        ↓
             Risk & Explainability Engine (0–100 Risk Score)
                        ↓
       Master JSON / Executive HTML / Printable PDF / Streamlit Dashboard
```

---

## 3. Key Components & Responsibilities

| File Path | Component Description |
| :--- | :--- |
| [part1/src/deployment_ml_features.py](file:///Users/tirth/email-forensics/part1/src/deployment_ml_features.py) | PCAP/Zeek deployment feature extractor (32 encoded dimensions). Zero security-rule leakage. |
| [part1/src/train_deployment_ml.py](file:///Users/tirth/email-forensics/part1/src/train_deployment_ml.py) | Reproducible training script with PCAP grouped splitting and SHA-256 artifact hashing. |
| [part1/src/ai_anomaly_detector.py](file:///Users/tirth/email-forensics/part1/src/ai_anomaly_detector.py) | Deployment ML IsolationForest detector (v2.0.0) with SHA-256 integrity verification. |
| [part1/src/tls_keylog_decryptor.py](file:///Users/tirth/email-forensics/part1/src/tls_keylog_decryptor.py) | Authorized TLS 1.3 handshake decryptor and X.509 DER certificate extractor. |
| [part1/src/dataset_adapters.py](file:///Users/tirth/email-forensics/part1/src/dataset_adapters.py) | Data ingestion schema adapters for external datasets (CESNET-TLS22, Passive OS, etc.). |
| [part1/src/controlled_evaluation.py](file:///Users/tirth/email-forensics/part1/src/controlled_evaluation.py) | Controlled labeled benchmark evaluator for deterministic security rules. |
| [part1/src/unseen_pcap_evaluation.py](file:///Users/tirth/email-forensics/part1/src/unseen_pcap_evaluation.py) | Evaluates unseen PCAP traffic on the deployment ML model. |
| [part1/src/email_protocol_parser.py](file:///Users/tirth/email-forensics/part1/src/email_protocol_parser.py) | Classifies SMTP, IMAP, and POP3 protocols, encryption modes, and STARTTLS/STLS. |
| [part1/src/tls_analyzer.py](file:///Users/tirth/email-forensics/part1/src/tls_analyzer.py) | Parses Zeek TSV logs into normalized session JSON data. |
| [part1/src/crypto_features.py](file:///Users/tirth/email-forensics/part1/src/crypto_features.py) | Extracts 25+ structured cryptographic feature vector metrics per session. |
| [part1/src/security_rules.py](file:///Users/tirth/email-forensics/part1/src/security_rules.py) | Evaluates 12 deterministic security policy rules against feature vectors. |
| [part1/src/risk_engine.py](file:///Users/tirth/email-forensics/part1/src/risk_engine.py) | Calculates 0–100 risk scores with point contributor attribution. |
| [part1/src/explainability.py](file:///Users/tirth/email-forensics/part1/src/explainability.py) | Generates structured offline explanations detailing why a session is suspicious. |
| [part1/src/forensic_pipeline.py](file:///Users/tirth/email-forensics/part1/src/forensic_pipeline.py) | Main CLI driver for running end-to-end forensic analysis. |
