# Deployment ML Dataset Strategy & Compatibility Architecture

## 1. Overview & Dataset Sources
This document details the data ingestion, schema adapter architecture, and dataset strategy for the Deployment ML anomaly detection engine (`AIAnomalyDetector` v3.0.0).

### Ingested & Evaluated Datasets

| Dataset Source | Purpose | Total Records | Compatibility Status | Adapter Class |
| :--- | :--- | :--- | :--- | :--- |
| **Local PCAP/Zeek Captures** | Primary local domain email network traffic | 4 sessions / 4 PCAPs | `100% Native Schema v1.0.0` | `GenericPCAPZeekAdapter` |
| **Passive OS Fingerprinting** | Large-scale passive TLS network telemetry | 10,894 records | `Compatible Subset` | `PassiveOSDatasetAdapter` |
| **CESNET-TLS22** | NetFlow / IPFIX + TLS handshake telemetry | Benchmark research corpus | `Compatible Schema Mapping` | `CESNETTLS22Adapter` |
| **CipherSpectrum** | Cipher suite distribution research data | Reference TLS telemetry | `Research Reference Only` | N/A |

---

## 2. Feature Compatibility & Missingness Matrix

| Feature Dimension | Target Schema v1.0.0 | Local PCAPs | Passive OS Dataset | CESNET-TLS22 | Missing Value Strategy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `client_bytes_log` | YES | OBSERVED | OBSERVED (`BYTES A`) | OBSERVED (`BYTES_IN`) | `0` sentinel default |
| `server_bytes_log` | YES | OBSERVED | NOT OBSERVED (`0`) | OBSERVED (`BYTES_OUT`) | `0` sentinel default |
| `client_packets_log` | YES | OBSERVED | OBSERVED (`PACKETS A`) | OBSERVED (`PKTS_IN`) | `0` sentinel default |
| `server_packets_log` | YES | OBSERVED | NOT OBSERVED (`0`) | OBSERVED (`PKTS_OUT`) | `0` sentinel default |
| `duration_log` | YES | OBSERVED | OBSERVED (`TLS_SETUP_TIME`) | OBSERVED (`DURATION`) | `0.0` sentinel default |
| `certificate_key_size_scaled` | YES | OBSERVED | NOT AVAILABLE (`0.0`) | OBSERVED (`TLS_KEY_LENGTH`) | `0.0` sentinel default |
| `tls_established_flag` | YES | OBSERVED | OBSERVED (`True`) | OBSERVED (`TLS_ESTABLISHED`) | Binary `1.0` / `0.0` |
| `forward_secrecy_flag` | YES | OBSERVED (Derived) | OBSERVED (`forward_secrecy_indicator`) | OBSERVED (`TLS_PFS`) | Binary `1.0` / `0.0` |
| `protocol_cat` | YES | OBSERVED (`SMTP`/`IMAP`/`POP3`) | NOT OBSERVED (`UNKNOWN`) | OBSERVED (`APPLICATION_PROTOCOL`) | `UNKNOWN` bin |
| `tls_version_cat` | YES | OBSERVED | OBSERVED | OBSERVED | `UNKNOWN` bin |
| `cipher_suite_cat` | YES | OBSERVED | OBSERVED | OBSERVED | `UNKNOWN` bin |
| `elliptic_curve_cat` | YES | OBSERVED | OBSERVED | OBSERVED | `UNKNOWN` bin |

---

## 3. Data Leakage & Group-Aware Splitting Architecture

### Prevention of Cross-Group Leakage
- **Source Identifier**: Every record carries `source_capture_id` (e.g. PCAP filename or passive OS flow ID).
- **Split Mechanism**: `reproducible_group_split` uses group-aware splitting (`grouped_by_pcap_source`). All records derived from the same source capture remain in the **same split** (Train, Validation, or Test).
- **No Random Row Splitting**: Prevents correlated flow sessions from spanning across train and test splits.

---

## 4. Ingestion Architecture & Pipeline

```
External Dataset (Passive OS / CESNET / PCAPs)
        ↓
dataset_adapters.py (GenericPCAPZeekAdapter / PassiveOSDatasetAdapter / CESNETTLS22Adapter)
        ↓
Canonical Feature Schema (32 Encoded Dimensions, v1.0.0)
        ↓
generate_expanded_dataset.py (Quality Audit & Duplicate Detection)
        ↓
expanded_deployment_dataset.csv (10,898 records)
        ↓
train_deployment_ml.py (IsolationForest v3.0.0 & Group-Aware Splitting)
```
