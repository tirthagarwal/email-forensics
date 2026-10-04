# Deployment ML Dataset Quality & Leakage Audit Report

**Generated At**: 2026-09-27T06:44:55Z  
**Feature Schema Version**: `1.0.0` (32 Encoded Dimensions)  

---

## 1. Corpus Summary Statistics

- **Total Dataset Records**: `10,898`
  - **Local PCAP Captures**: `4`
  - **Passive OS Telemetry Records**: `10,894`
- **Unique Source Capture IDs**: `10,898`
- **Unique Feature Vectors**: `10,654`
- **Duplicate Feature Vector Count**: `244` (`2.24%`)

---

## 2. Feature Compatibility & Missingness Matrix

| Feature Dimension | Target Schema v1.0.0 | Local PCAPs | Passive OS Dataset | Missing Value Handling |
| :--- | :--- | :--- | :--- | :--- |
| `client_bytes_log` | YES | OBSERVED | OBSERVED (`BYTES A`) | `0` if missing |
| `server_bytes_log` | YES | OBSERVED | NOT OBSERVED (`0`) | `0` sentinel default |
| `client_packets_log` | YES | OBSERVED | OBSERVED (`PACKETS A`) | `0` if missing |
| `server_packets_log` | YES | OBSERVED | NOT OBSERVED (`0`) | `0` sentinel default |
| `duration_log` | YES | OBSERVED | OBSERVED (`TLS_SETUP_TIME`) | `0.0` if missing |
| `certificate_key_size_scaled` | YES | OBSERVED | NOT AVAILABLE (`0.0`) | `0.0` sentinel default |
| `tls_established_flag` | YES | OBSERVED | OBSERVED (`True`) | Binary `1.0` or `0.0` |
| `forward_secrecy_flag` | YES | OBSERVED | OBSERVED (`forward_secrecy_indicator`) | Binary `1.0` or `0.0` |
| `protocol_cat` | YES | OBSERVED | NOT OBSERVED (`UNKNOWN`) | `UNKNOWN` bin in one-hot |
| `tls_version_cat` | YES | OBSERVED | OBSERVED | `UNKNOWN` bin in one-hot |
| `cipher_suite_cat` | YES | OBSERVED | OBSERVED | `UNKNOWN` bin in one-hot |
| `elliptic_curve_cat` | YES | OBSERVED | OBSERVED | `UNKNOWN` bin in one-hot |

---

## 3. Data Leakage & Group Splitting Controls
- **Group Column**: `source_capture_id`
- **Control**: Splitting is strictly group-aware. All records derived from the same source capture ID remain in the same split (Train, Validation, or Test).
- **Cross-Group Leakage**: Prevented. No capture group spans multiple data splits.
