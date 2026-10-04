# Unsupervised TLS Anomaly Detection Data Splits Documentation

**Source File:** `part1/datasets/processed/passive_os_anomaly_features.csv`  
**Output Directory:** `part1/datasets/processed/anomaly_splits/`  
**Exact Random Seed:** `42` (`sklearn.model_selection.train_test_split` with `random_state=42`)  
**Split Ratio:** 80% Training / 10% Validation / 10% Test  

---

## 1. Split Distribution & Row Counts

| Split File | Path | Row Count | Percentage | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **`train.csv`** | `part1/datasets/processed/anomaly_splits/train.csv` | 816 | 80.0% | Unsupervised model fitting / baseline density estimation |
| **`validation.csv`** | `part1/datasets/processed/anomaly_splits/validation.csv` | 102 | 10.0% | Hyperparameter tuning & threshold calibration |
| **`test.csv`** | `part1/datasets/processed/anomaly_splits/test.csv` | 102 | 10.0% | Final baseline score evaluation |
| **Total** | | **1,020** | **100.0%** | **Complete Deduplicated Profile Dataset** |

---

## 2. Retained Schema & Column Definitions

All three CSV files share the exact same 9-column schema:

| Column Name | Type | Model Feature? | Description |
| :--- | :--- | :--- | :--- |
| `profile_id` | `object` (string) | **NO** (Audit-Only) | Unique profile identifier (e.g. `P_0001` to `P_1020`) preserved for auditability across splits. Must be excluded from model inputs. |
| `tls_setup_time_log` | `float64` | **YES** | Standardized $\ln(1 + \text{TLS\_SETUP\_TIME})$ |
| `ec_curve_count` | `int64` | **YES** | Parsed number of advertised elliptic curves |
| `has_x25519` | `int64` | **YES** | Binary indicator for Curve25519 (`1D00`) support |
| `content_type_13` | `int64` | **YES** | One-Hot indicator for record content type 13 |
| `content_type_15` | `int64` | **YES** | One-Hot indicator for record content type 15 |
| `content_type_5` | `int64` | **YES** | One-Hot indicator for record content type 5 |
| `content_type_7` | `int64` | **YES** | One-Hot indicator for record content type 7 |
| `ja3_frequency` | `float64` | **YES** | JA3 fingerprint frequency relative to 1,020 profiles |

---

## 3. Formal Methodological Statements

1. **No Labels Used:** Zero security ground-truth labels (`weak_cipher`, `deprecated_tls_version`, etc.) or target columns were used for stratification or partitioning. The dataset was split purely randomly using a uniform random seed.
2. **No Model Trained:** NO machine learning model (Isolation Forest, LOF, One-Class SVM, etc.) has been trained on any split.
3. **No Evaluation Performed:** NO anomaly scores, thresholds, accuracy, precision, recall, F1, ROC-AUC, or performance metrics have been computed.
4. **Audit Identifier Non-Leakage:** `profile_id` is included solely to enable tracking of individual profiles across splits. It is non-numeric/identifier string data and MUST NOT be passed to any ML algorithm.
5. **Limited PoC Scope:** This partitioning represents a limited proof-of-concept (PoC) split over deduplicated unique profiles. It is designed to evaluate unsupervised anomaly scoring mechanics and is NOT a real-world generalization benchmark for enterprise TLS traffic.
