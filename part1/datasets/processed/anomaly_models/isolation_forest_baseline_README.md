# Isolation Forest Baseline Model Documentation

**Model Artifact:** `part1/datasets/processed/anomaly_models/isolation_forest_baseline.joblib`  
**Algorithm:** `sklearn.ensemble.IsolationForest`  
**scikit-learn Version:** `1.9.1`  
**Random Seed:** `42`  
**Contamination Setting:** `'auto'`  
**Training Set Size:** 816 unique TLS profiles (`part1/datasets/processed/anomaly_splits/train.csv`)  

---

## 1. Model Features & Exclusions

### Included Model Features (8 Features)
1. `tls_setup_time_log` (Standardized log setup time)
2. `ec_curve_count` (Parsed count of advertised elliptic curves)
3. `has_x25519` (Binary indicator for Curve25519 support)
4. `content_type_13` (One-Hot flag for record content type 13)
5. `content_type_15` (One-Hot flag for record content type 15)
6. `content_type_5` (One-Hot flag for record content type 5)
7. `content_type_7` (One-Hot flag for record content type 7)
8. `ja3_frequency` (Relative frequency rate of JA3 fingerprint)

### Excluded Non-Model Columns & Security Labels
- `profile_id`: **EXCLUDED**. Included in score CSVs as an audit-only key; not passed to `model.fit()`.
- Security ground-truth labels (`weak_cipher`, `deprecated_tls_version`, `forward_secrecy_indicator`): **EXCLUDED**.
- Domain and deterministic rule identifiers (`TLS_SNI`, `TLS_SERVER_VERSION`, `TLS_CLIENT_VERSION`, `TLS_CIPHER_SUITE`): **EXCLUDED**.

---

## 2. Model Hyperparameters

```python
IsolationForest(
    bootstrap=False,
    contamination='auto',
    max_features=1.0,
    max_samples='auto',
    n_estimators=100,
    n_jobs=None,
    random_state=42,
    verbose=0,
    warm_start=False
)
```

---

## 3. Anomaly Score Definition & Interpretation

Scores in `train_scores.csv`, `validation_scores.csv`, and `test_scores.csv` are computed using `model.decision_function(X)` from `sklearn.ensemble.IsolationForest`:

$$\text{anomaly\_score} = \text{decision\_function}(X)$$

- **Mathematical Meaning:** `decision_function(X)` computes the average depth of samples in the ensemble of isolation trees relative to expected path lengths.
- **Score Scale:**
  - **Negative Values ($< 0$):** Indicate lower path lengths (anomalies / outliers). The more negative the score, the more anomalous the profile is relative to the training distribution.
  - **Positive Values ($> 0$):** Indicate longer path lengths (inliers / normal profiles).
  - **Value around $0$:** The default decision threshold under `contamination='auto'`.
- **Classification Status:** Raw scores are saved directly. No binary anomaly/normal classification threshold has been applied.

---

## 4. Exact Python Training Script

```python
import os
import joblib
import pandas as pd
from sklearn.ensemble import IsolationForest

# 1. Load splits
splits_dir = 'part1/datasets/processed/anomaly_splits'
train_df = pd.read_csv(os.path.join(splits_dir, 'train.csv'))
val_df = pd.read_csv(os.path.join(splits_dir, 'validation.csv'))
test_df = pd.read_csv(os.path.join(splits_dir, 'test.csv'))

# 2. Select 8 model features
feature_cols = [
    'tls_setup_time_log',
    'ec_curve_count',
    'has_x25519',
    'content_type_13',
    'content_type_15',
    'content_type_5',
    'content_type_7',
    'ja3_frequency'
]

X_train = train_df[feature_cols]
X_val = val_df[feature_cols]
X_test = test_df[feature_cols]

# 3. Train model on training set only
model = IsolationForest(contamination='auto', random_state=42)
model.fit(X_train)

# 4. Save model artifact
models_dir = 'part1/datasets/processed/anomaly_models'
os.makedirs(models_dir, exist_ok=True)
joblib.dump(model, os.path.join(models_dir, 'isolation_forest_baseline.joblib'))

# 5. Compute & save raw decision_function scores
for name, df_split, X_split in [('train', train_df, X_train), ('validation', val_df, X_val), ('test', test_df, X_test)]:
    score_df = pd.DataFrame({
        'profile_id': df_split['profile_id'],
        'anomaly_score': model.decision_function(X_split)
    })
    score_df.to_csv(os.path.join(models_dir, f'{name}_scores.csv'), index=False)
```
