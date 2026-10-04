# Unsupervised TLS Anomaly Detection Feature Matrix Documentation

**File Path:** `part1/datasets/processed/passive_os_anomaly_features.csv`  
**Source Dataset:** `part1/datasets/processed/passive_os_tls_clean.csv` (10,894 original TLS sessions)  
**Row Count:** 1,020 unique TLS feature profiles  
**Column Count:** 9 columns (1 audit identifier + 8 numerical/binary model features)

---

## 1. Objective & Design Philosophy

This feature matrix is designed strictly for **UNSUPERVISED TLS ANOMALY-DETECTION** proof-of-concept (PoC) experiments.

- **Unsupervised Modeling Matrix:** No target labels, ground-truth classification columns, or security rule outputs are used as model inputs.
- **No Data Leakage:** All features that directly or deterministically encode security labels (e.g. `weak_cipher`, `deprecated_tls_version`) have been strictly excluded.
- **Deduplicated Profile Representation:** The raw dataset was deduplicated to 1,020 unique core TLS profiles to prevent high-frequency domain/flow repetition from biasing anomaly scoring.
- **No Model Trained Yet:** This artifact represents only feature preparation and engineering. No ML model (Isolation Forest, LOF, One-Class SVM, etc.) has been trained, fitted, or evaluated.

---

## 2. Deduplication Methodology

The source dataset (`passive_os_tls_clean.csv`, 10,894 rows) was deduplicated using the core TLS feature profile tuple:
`('TLS_CLIENT_VERSION', 'TLS_SERVER_VERSION', 'TLS_HANDSHAKE_TYPE', 'TLS_CONTENT_TYPE', 'TLS_ELLIPTIC_CURVES', 'TLS_JA3_FINGERPRINT', 'TLS_CIPHER_SUITE', 'TLS_SNI')`

This deduplication reduced 10,894 session records to exactly **1,020 unique TLS feature profiles**, eliminating artificial weighting caused by dominant domain repeat requests (e.g. 92.67% of raw sessions coming from 3 domains).

---

## 3. Feature Definitions & Transformations Applied

| Column Name | Type | Model Input? | Transformation / Parsing Applied | Description |
| :--- | :--- | :--- | :--- | :--- |
| `profile_id` | `object` (string) | **NO** (Identifier Only) | Formatted string `P_0001` to `P_1020` | Audit identifier for tracking unique profiles across evaluations. |
| `tls_setup_time_log` | `float64` | **YES** | $z = \frac{\ln(1 + \text{TLS\_SETUP\_TIME}) - \mu}{\sigma}$ | Log-transformed (`log1p`) and Z-score standardized setup time (ms). |
| `ec_curve_count` | `int64` | **YES** | Hex string parsed: $\lfloor \text{len(clean\_hex)} / 4 \rfloor$ | Number of advertised elliptic curve/group entries in ClientHello. |
| `has_x25519` | `int64` | **YES** | Binary indicator: `1` if `'1D00'` / Curve25519 present, else `0` | Flag indicating support for modern Curve25519 elliptic curve. |
| `content_type_13` | `int64` | **YES** | One-Hot Indicator: `1` if `TLS_CONTENT_TYPE == 13`, else `0` | Binary indicator for record content type 13. |
| `content_type_15` | `int64` | **YES** | One-Hot Indicator: `1` if `TLS_CONTENT_TYPE == 15`, else `0` | Binary indicator for record content type 15. |
| `content_type_5` | `int64` | **YES** | One-Hot Indicator: `1` if `TLS_CONTENT_TYPE == 5`, else `0` | Binary indicator for record content type 5. |
| `content_type_7` | `int64` | **YES** | One-Hot Indicator: `1` if `TLS_CONTENT_TYPE == 7`, else `0` | Binary indicator for record content type 7. |
| `ja3_frequency` | `float64` | **YES** | $\text{Frequency} = \frac{\text{Profile Count for JA3}_i}{1020}$ | Relative frequency of the client's JA3 fingerprint within the deduplicated PoC dataset. |

---

## 4. Excluded Features & Rationale

| Excluded Feature | Rationale for Exclusion |
| :--- | :--- |
| `TLS_SNI` | High domain memorization risk (92.67% of raw flows belong to 3 domains). |
| `TLS_CLIENT_VERSION` | 99.91% constant (`771.0` / TLS 1.2); 100% correlated with `TLS_SERVER_VERSION`. |
| `TLS_SERVER_VERSION` | 99.91% constant (`771.0`); direct deterministic leakage for `deprecated_tls_version`. |
| `TLS_CIPHER_SUITE` / `cipher_suite_name` | Direct deterministic leakage for ground-truth `weak_cipher` label. |
| `tls_server_version_name`, `tls_client_version_name`, `cipher_suite_numeric`, `tls_version_numeric` | Duplicate categorical/numeric representations of excluded version & cipher features. |
| `weak_cipher` | Deterministic security rule ground-truth label (MUST NOT be an input feature). |
| `deprecated_tls_version` | Deterministic security rule ground-truth label (MUST NOT be an input feature). |
| `forward_secrecy_indicator` | 100% constant (`True`) across all records. |
| `TLS_HANDSHAKE_TYPE` | Effectively constant (99.94% `6.0`). |
| `TLS_ALPN` | Extremely sparse (95.02% missing values across raw records). |

---

## 5. Formal Validation Statements

1. **Unsupervised Status:** This feature matrix contains ZERO security ground-truth labels or rule output columns (`weak_cipher`, `deprecated_tls_version`, etc.).
2. **Model Training Status:** NO machine learning model (Isolation Forest, One-Class SVM, LOF, Autoencoder, etc.) has been trained on this feature matrix.
3. **Split Status:** NO train/validation/test splits have been generated.
