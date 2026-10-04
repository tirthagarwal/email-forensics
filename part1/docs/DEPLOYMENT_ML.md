# Deployment ML Architecture & Operations Guide

## 1. Purpose & Overview
The **Deployment ML Anomaly Detector** (`AIAnomalyDetector` v2.0.0) provides unsupervised statistical anomaly detection for network traffic observed in passive email security captures. Its purpose is to flag sessions that deviate statistically from baseline traffic distributions without relying on rule-based security policy flags.

---

## 2. Key Architectural Principles & Separation

| Property | Passive OS Dataset ML PoC (Frozen) | Deployment ML Baseline (Live) |
| :--- | :--- | :--- |
| **Location** | `part1/datasets/processed/anomaly_models/` | `part1/models/deployment_ml/` |
| **Training Source** | `passive_os_tls_clean.csv` (1,020 profiles) | PCAP/Zeek network captures (`part1/pcaps/`) |
| **Features** | 8 profile features (`tls_setup_time_log`, `ec_curve_count`, `has_x25519`, `content_type_*`, `ja3_frequency`) | 32 encoded flow/crypto features (`client_bytes_log`, `duration_log`, `protocol`, `tls_version`, etc.) |
| **Threshold** | `-0.114666` (Frozen) | `0.171667` (Validation lower-tail percentile) |
| **Rule Coupling** | Zero | Zero |

### Strict Rule-Engine Separation Rule
The Deployment ML model **MUST NOT** consume output flags from `security_rules.py` or `risk_engine.py` (e.g., `weak_cipher`, `weak_tls_version`, `missing_starttls`, `certificate_self_signed`, `plaintext_auth_risk`). Deterministic security findings and statistical ML anomalies operate independently.

---

## 3. Feature Schema (v1.0.0)
The deployment feature vector consists of **32 encoded dimensions**:

1. **Flow Metrics (log1p transformed)**: `client_bytes_log`, `server_bytes_log`, `client_packets_log`, `server_packets_log`, `duration_log`.
2. **Safe Ratios**: `bytes_ratio` ($client\_bytes / (server\_bytes + 1)$), `packets_ratio` ($client\_packets / (server\_packets + 1)$).
3. **Certificate Property**: `certificate_key_size_scaled` ($key\_size / 4096.0$; 0.0 if missing).
4. **Structural Flags**: `tls_established_flag` (1.0 or 0.0), `forward_secrecy_flag` (1.0 or 0.0 derived from cipher suite string).
5. **One-Hot Categoricals**:
   - `protocol_cat` (`SMTP`, `IMAP`, `POP3`, `UNKNOWN`)
   - `tls_version_cat` (`TLSv13`, `TLSv12`, `TLSv11`, `TLSv10`, `SSLv3`, `UNKNOWN`)
   - `cipher_suite_cat` (Top cipher suites + `UNKNOWN`)
   - `elliptic_curve_cat` (`x25519`, `secp256r1`, `secp384r1`, `secp521r1`, `UNKNOWN`)

---

## 4. Preprocessing & Robustness
- **Negative Values**: Clamped to `0` or `0.0`.
- **Missing Categoricals**: Mapped to the `UNKNOWN` bin in one-hot encoding.
- **Missing Certificate**: `certificate_key_size_scaled` defaults to `0.0`.
- **Division by Zero**: Prevented via `+ 1` denom offset.

---

## 5. Training & Threshold Selection
- **Algorithm**: `sklearn.ensemble.IsolationForest` ($n\_estimators=200$, $contamination='auto'$, $random\_state=42$).
- **Grouping**: Group-aware split by PCAP source capture to prevent session cross-leakage.
- **Threshold Selection**: Computed from 10th percentile of validation raw scores (`decision_function`). Test data is **NEVER** used to select the threshold.

---

## 6. Score Interpretation & Disclaimer
- **Raw Score**: `decision_function(X)[0]` (lower = more anomalous).
- **Normalized Anomaly Score**: $\text{clip}(0.5 - \text{raw\_score}, 0.0, 1.0)$.
- **Is Anomaly Flag**: `raw_score <= threshold`.

> [!IMPORTANT]
> The ML Anomaly Score is a model-derived relative score and is **NOT a probability**. An ML anomaly flag indicates statistical novelty relative to baseline traffic, **NOT an automatic security vulnerability**.

---

## 7. Artifact Integrity
Model artifacts in `part1/models/deployment_ml/` are protected with SHA-256 digests stored in `deployment_training_metadata.json`:
- `deployment_isolation_forest.joblib`
- `deployment_threshold.json`
- `deployment_feature_schema.json`

At inference time, `AIAnomalyDetector` verifies these checksums and sets `integrity_status: "VERIFIED_OK"`.

---

## 8. Retraining Procedure
To retrain the deployment ML model:
```bash
python3 part1/src/train_deployment_ml.py
```
This updates the joblib model, recalculates the validation threshold, records feature schema v1.0.0 metadata, and updates SHA-256 hashes.
