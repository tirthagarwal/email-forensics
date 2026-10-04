# Unsupervised Anomaly Threshold Selection Documentation

**Model:** `sklearn.ensemble.IsolationForest`  
**Artifact:** `part1/datasets/processed/anomaly_models/isolation_forest_baseline.joblib`  
**Threshold File:** `part1/datasets/processed/anomaly_models/isolation_forest_threshold.json`  
**Validation Scores Source:** `part1/datasets/processed/anomaly_models/validation_scores.csv` (102 unique validation profiles)  

---

## 1. Threshold Selection Methodology & Principles

1. **Validation Data Isolation:** Threshold selection was performed exclusively using the 102 hold-out validation scores (`validation_scores.csv`). Training scores were omitted to avoid over-fitting to training density, and test scores were strictly isolated to preserve test set purity.
2. **Unsupervised Lower-Tail Percentile Policy:** In scikit-learn's `IsolationForest`, lower (more negative) `decision_function` values indicate shorter path lengths in isolation trees (i.e. profiles that are easier to isolate). Under our primary unsupervised policy, the anomaly threshold is defined by the lower-tail 10th percentile of validation anomaly scores.
3. **No Target / Security Label Tuning:** Zero security ground-truth labels (`weak_cipher`, `deprecated_tls_version`, etc.) were used to select, tune, or optimize this threshold.
4. **ML Anomaly vs. Security Vulnerability:** An ML-flagged profile ($\text{anomaly\_score} \le \text{threshold}$) indicates statistical outlier behavior within the feature space. **An ML anomaly does NOT automatically imply a security vulnerability or malicious intent.**

---

## 2. Validation Score Distribution Statistics

Calculated across all 102 validation profiles in `validation_scores.csv`:

- **Min:** `-0.193892`
- **Max:** `+0.122416`
- **Mean:** `+0.036938`
- **Median:** `+0.065894`
- **Standard Deviation:** `0.088002`
- **1st Percentile:** `-0.190723`
- **5th Percentile:** `-0.131563`
- **10th Percentile:** `-0.114666`
- **15th Percentile:** `-0.076687`
- **20th Percentile:** `-0.042834`
- **25th Percentile:** `-0.008615`

---

## 3. Candidate Percentile Thresholds Evaluation

| Candidate Percentile | Lower-Tail Threshold | Number Flagged | Percentage Flagged | Selection Status |
| :--- | :--- | :--- | :--- | :--- |
| **Bottom 1%** | `-0.190723` | 2 | 1.96% | Evaluated |
| **Bottom 5%** | `-0.131563` | 6 | 5.88% | Evaluated |
| **Bottom 10%** | **`-0.114666`** | **11** | **10.78%** | **SELECTED (Primary PoC Policy)** |
| **Bottom 15%** | `-0.076687` | 16 | 15.69% | Evaluated |
| **Bottom 20%** | `-0.042834` | 21 | 20.59% | Evaluated |

---

## 4. Selected Threshold Metadata (`isolation_forest_threshold.json`)

```json
{
  "model": "IsolationForest",
  "threshold_method": "validation_lower_tail_percentile",
  "percentile": 10,
  "threshold": -0.11466631869919935,
  "validation_size": 102,
  "random_seed": 42,
  "labels_used_for_threshold_selection": false
}
```

---

## 5. Formal Validation Statements

1. **Test Set Isolation:** Test scores (`test_scores.csv`, 102 profiles) were **NOT** inspected, referenced, or used during threshold selection.
2. **No Model Re-Training:** The Isolation Forest model was not re-trained or modified.
3. **No Metric Optimization:** Accuracy, precision, recall, F1 score, and ROC-AUC were **NOT** computed or optimized.
4. **Final Evaluation Pending:** Final model evaluation on the test set has NOT occurred yet.
