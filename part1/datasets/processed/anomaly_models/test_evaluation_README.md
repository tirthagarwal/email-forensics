# Held-Out Test Evaluation Documentation (Isolation Forest Baseline)

**Model:** `sklearn.ensemble.IsolationForest`  
**Model Artifact:** `part1/datasets/processed/anomaly_models/isolation_forest_baseline.joblib`  
**Frozen Threshold:** `-0.11466631869919935` (Derived from 10th percentile lower-tail of validation scores)  
**Threshold Metadata:** `part1/datasets/processed/anomaly_models/isolation_forest_threshold.json`  
**Test Set Source:** `part1/datasets/processed/anomaly_splits/test.csv` (102 unique held-out profiles)  
**Predictions Output:** `part1/datasets/processed/anomaly_models/test_predictions.csv`  

---

## 1. Frozen Threshold Application & Results

The frozen threshold ($\text{anomaly\_score} \le -0.11466631869919935$) was applied directly to the 102 held-out test profiles without modification, tuning, or re-fitting.

| Prediction Class | Definition | Profile Count | Percentage |
| :--- | :--- | :--- | :--- |
| **`ML_ANOMALOUS`** | $\text{anomaly\_score} \le -0.11466631869919935$ | **3** | **2.94%** |
| **`ML_NORMAL`** | $\text{anomaly\_score} > -0.11466631869919935$ | **99** | **97.06%** |
| **Total** | | **102** | **100.00%** |

---

## 2. Test Anomaly Score Statistics

- **Total Test Profiles:** 102
- **Minimum Score:** `-0.163691`
- **Maximum Score:** `+0.122825`
- **Mean Score:** `+0.046240`
- **Median Score:** `+0.063784`

---

## 3. Ground-Truth Availability & Supervised Classification Metrics

**Ground-Truth Status:**  
Independent ground-truth anomaly labels are not currently available for the held-out test profiles; therefore precision, recall, F1, accuracy, FPR, and FNR cannot be validly calculated at this stage.

- **No Manufactured Labels:** Security rule indicators (`weak_cipher`, `deprecated_tls_version`) and rule evaluation flags were not used as surrogate ground-truth labels.
- **No Self-Evaluation:** Model predictions (`ML_ANOMALOUS` / `ML_NORMAL`) were not evaluated against themselves.

---

## 4. Key Limitations & Methodological Distinctions

1. **ML Anomaly vs. Security Vulnerability:** An `ML_ANOMALOUS` designation indicates that a profile's feature combination (setup time, curve count, content type, JA3 frequency) lies in a low-density region of the model's feature space. **An ML anomaly does NOT automatically mean a security vulnerability, policy violation, or cyber threat.**
2. **Data Concentration & Deduplication:** The test set represents 102 unique feature profiles derived from passive OS network captures. Results reflect statistical outlier behavior relative to this specific PoC feature distribution and do not constitute a real-world enterprise generalization benchmark.
3. **No Retraining or Tuning:** The model weights, hyperparameters (`contamination='auto'`, `random_state=42`), and decision threshold remained strictly frozen throughout evaluation.
