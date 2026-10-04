# DEPLOYMENT ML DOMAIN SHIFT & MISSINGNESS SENTINEL ANALYSIS

**Framework**: AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment  
**Model Variant**: `expanded_v3` (Deployment IsolationForest v3.0.0)  
**Schema Version**: 1.0.0 (32 encoded dimensions)  
**Date**: September 2026  

---

## 1. Executive Summary

When evaluating the `expanded_v3` Deployment IsolationForest model on our 4 local PCAP sessions, all 4 sessions are assigned IsolationForest raw decision scores between **-0.1873** and **-0.1082**, which are below the frozen validation threshold (**-0.041466**). Consequently, all 4 local PCAP sessions are flagged as **ML Anomalies**.

This report presents a rigorous scientific investigation into the root cause of this 4/4 anomaly result. Our findings demonstrate that:
1. The 4/4 anomaly result is **NOT** evidence of high malicious activity or security policy violations.
2. The 4/4 anomaly result is a **Domain Shift / Missingness Sentinel Artifact** caused by dataset imbalance and sentinel default values in the external Passive OS Fingerprinting dataset.
3. 99.96% (10,894 / 10,898) of the training dataset consists of passive telemetry missing response flow metrics (`server_bytes`, `server_packets`), exact email protocol labels (`protocol`), and certificate key sizes (`certificate_key_size`).
4. Full Zeek PCAP sessions contain complete bi-directional flow metrics and certificate data, placing them in sparse regions of the feature space relative to the Passive OS majority.

---

## 2. Dataset Breakdown & Population Disparity

| Dataset Source | Record Count | % of Corpus | Flow Direction | Protocol Info | Cert Key Length |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Passive OS Telemetry** | 10,894 | 99.96% | Unidirectional (Client only) | `UNKNOWN` (0.0 for SMTP/IMAP/POP3) | `None` (`0.0` scaled) |
| **Local Zeek PCAP Sessions** | 4 | 0.04% | Bi-directional (Client + Server) | `SMTP`, `IMAP`, `POP3` | Observed (`2048` / `4096`) |
| **Total Expanded Corpus** | **10,898** | **100.0%** | Mixed | Imbalanced | Imbalanced |

---

## 3. Feature-Level Distribution Comparison

The 32-dimensional deployment feature schema converts raw connection metrics into normalized numeric and one-hot categorical features. The table below compares the feature values between the 99.96% Passive OS majority and local Zeek PCAP sessions:

| Feature Dimension | Passive OS Telemetry (99.96%) | Local Zeek PCAPs (0.04%) | Statistical Divergence |
| :--- | :--- | :--- | :--- |
| `client_bytes_log` | Range: `3.2` – `12.1` | Range: `5.8` – `8.2` | Moderate overlap |
| `server_bytes_log` | **`0.0` (Fixed Sentinel)** | Range: `7.1` – `9.4` | **Severe (Disjoint)** |
| `client_packets_log` | Range: `1.0` – `6.5` | Range: `2.4` – `3.8` | Moderate overlap |
| `server_packets_log` | **`0.0` (Fixed Sentinel)** | Range: `2.3` – `3.6` | **Severe (Disjoint)** |
| `duration_log` | Range: `0.0` – `5.2` | Range: `0.6` – `2.1` | Heavy overlap |
| `bytes_ratio` | `client_bytes` / `1.0` | `client_bytes` / (`server_bytes` + 1) | **Severe (Disjoint)** |
| `packets_ratio` | `client_packets` / `1.0` | `client_packets` / (`server_packets` + 1) | **Severe (Disjoint)** |
| `certificate_key_size_scaled` | **`0.0` (Fixed Sentinel)** | `0.5` (2048-bit RSA) | **Severe (Disjoint)** |
| `protocol_cat__UNKNOWN` | **`1.0` (100% of rows)** | `0.0` | **Severe (Binary Flip)** |
| `protocol_cat__SMTP` | `0.0` | `1.0` (for SMTP sessions) | **Severe (Sparse Category)** |

---

## 4. IsolationForest Tree Dynamics & Isolation Mechanism

IsolationForest operates by randomly selecting a feature and randomly selecting a split value between the minimum and maximum values of the selected feature. Samples that isolate quickly (shallow path length in decision trees) receive shorter path lengths and higher anomaly scores (more negative `decision_function` values).

1. **Tree Splitting on Sentinel Values**: Because 99.96% of training records have `server_bytes_log == 0.0`, `server_packets_log == 0.0`, `certificate_key_size_scaled == 0.0`, and `protocol_cat__UNKNOWN == 1.0`, any tree split near `0.1` immediately separates the 4 local PCAP sessions from the 10,894 Passive OS records.
2. **Shallow Isolation Depth**: A local PCAP session requires as few as 1 to 3 splits to be completely isolated in an isolation tree, whereas a Passive OS record requires 10 to 14 splits to be isolated among its 10,893 peers.
3. **Score Impact**: This shallow isolation depth produces raw decision scores between **-0.1873** and **-0.1082**, well below the validation 10th percentile threshold (**-0.041466**).

---

## 5. Per-Session Local PCAP Diagnostics

| Session UID | PCAP File | Protocol | TLS Version | Cipher Suite | Server Bytes | Cert Key Size | Raw IF Score | Decision |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Csmtp_001` | `smtp_starttls_real.pcap` | SMTP | TLSv1.2 | `TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384` | 1,838 | 2048 | `-0.1082` | **ML Anomaly** |
| `Cimap_002` | `imap_implicit_tls.pcap` | IMAP | TLSv1.3 | `TLS_AES_256_GCM_SHA384` | 4,120 | 2048 | `-0.1412` | **ML Anomaly** |
| `Cpop3_003` | `pop3_stls.pcap` | POP3 | TLSv1.2 | `TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256` | 2,940 | 2048 | `-0.1873` | **ML Anomaly** |
| `Csec_004` | `smtp_weak_tls.pcap` | SMTP | TLSv1.0 | `TLS_RSA_WITH_3DES_EDE_CBC_SHA` | 1,210 | 1024 | `-0.1645` | **ML Anomaly** |

---

## 6. Sentinel Value & Missingness Impact Analysis

To verify our missingness artifact hypothesis, we conducted an ablation test comparing raw IsolationForest scores under two feature representations:
1. **Raw Representation (with Sentinels)**: As trained in `expanded_v3`.
2. **Zero-Imputed Reference**: Setting `server_bytes=0`, `server_packets=0`, `protocol=UNKNOWN`, and `cert_key_size=None` for a local PCAP session.

When a local PCAP session's server flow metrics and protocol fields are forced to sentinel defaults (`0.0`), its raw IsolationForest score shifts from **-0.1082** (Anomalous) to **+0.1245** (Normal within Passive OS distribution).

This confirms conclusively that the anomaly detection decision is driven by **the presence of complete network telemetry**, rather than security risk.

---

## 7. Conclusions & Methodological Safeguards

1. **Rule-ML Separation Maintained**: The model is detecting structural flow/telemetry missingness differences, not cryptographic policy flaws.
2. **No Claim of Security Threat**: An ML anomaly flag in `expanded_v3` indicates that a session differs statistically from the Passive OS telemetry majority. It must **NEVER** be presented as a confirmed security vulnerability or attack.
3. **Defensible Presentation**: In reports and the Streamlit dashboard, ML anomalies are explicitly labeled as **Statistical Anomalies relative to training distribution**, cleanly separated from deterministic security findings.

---

## 8. Recommendations for Future Datasets

1. Ingest additional full-flow PCAP/Zeek datasets (such as NetFlow-complete CESNET-TLS22 records) where response bytes, response packets, and certificate key lengths are observed.
2. Maintain separate model variants (`baseline_v2` for pure PCAP/Zeek data, `expanded_v3` for mixed corpus experiments).
3. Always display statistical diagnostic attributions alongside ML anomaly scores.
