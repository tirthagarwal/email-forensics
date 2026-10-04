# Production Model Artifact Status

## Specification & Integrity Reference
- **Model Name**: Deployment IsolationForest (`expanded_v3`)
- **Model Version**: `3.0.0`
- **Feature Schema Version**: `1.0.0` (32 encoded dimensions)
- **Algorithm**: `IsolationForest`
- **Estimators (`n_estimators`)**: `200`
- **Contamination**: `auto`
- **Random Seed (`random_state`)**: `42`
- **Split Strategy**: Group-aware by capture source (`grouped_by_pcap_source`, 70% Train / 15% Val / 15% Test)
- **Training Population**: 10,898 total sessions (7,629 Train / 1,635 Validation / 1,634 Test)
- **Calibrated Anomaly Decision Threshold**: `-0.041466321224221024`
- **Documented Production SHA-256 Checksum**:
  ```
  587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791
  ```
- **Documented Artifact Size**: `2,129,933` bytes

---

## Artifact Availability Notice
The original compiled binary artifact (`deployment_isolation_forest.joblib`) was initially tracked through Git LFS during development. Because the remote Git LFS storage object is currently unavailable from the host repository, the plain text LFS pointer has been removed from active Git tracking to prevent broken pointer references (`GH008`).

### Deterministic Reconstruction Audit
A deterministic local reconstruction was executed using the exact preserved dataset split (`7,629` training records from `part1/datasets/training/deployment_dataset_v4_clean/train_records.json`) and identical hyperparameters:
- **Reconstruction Output**: `193162bb2bcad46d84acbfd09d009865c587fa2c2609d2d92e66bd18b3ac7765`
- **Production Status**: **NOT PROMOTED**.
  Because the serialized bytecode hash differs from the documented canonical production reference (due to runtime joblib/pickle serialization variations across environments), the reconstructed binary has intentionally **not** been substituted for the production model. All production metadata, threshold files, and schema manifests remain unchanged.

---

## Instructions for Restoring Production Artifact
When the verified original binary artifact is obtained:
1. Place the verified binary at:
   `part1/models/deployment_ml/expanded_v3/deployment_isolation_forest.joblib`
2. Verify its SHA-256 checksum:
   ```bash
   shasum -a 256 part1/models/deployment_ml/expanded_v3/deployment_isolation_forest.joblib
   # Expected: 587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791
   ```
3. Run diagnostic verification:
   ```bash
   python3 part1/src/inspect_deployment_ml_runtime.py
   ```
