# Dataset Artifacts & Provenance Status

## Dataset Manifests & Preserved Records
All dataset records, schemas, metadata, and split definitions are fully preserved and intact in structured JSON formats within the repository:

1. **Clean Deployment Dataset v4 (`part1/datasets/training/deployment_dataset_v4_clean/`)**:
   - `train_records.json` (7,629 records with full 32-dimensional feature vectors)
   - `val_records.json` (1,635 records)
   - `test_records.json` (1,634 records)
   - `metadata.json`, `schema.json`, and `provenance_manifest.json`

2. **Database Training Datasets (`part1/datasets/training/db_dataset_*/`)**:
   - `train_records.json`, `val_records.json`, `test_records.json`
   - Complete schema definitions and split manifests

3. **Ground Truth Benchmark (`part1/datasets/ground_truth/deployment_ml_ground_truth.json`)**:
   - Controlled 5-fixture labeled anomaly dataset

---

## CSV Flat Exports Notice
Flat `.csv` exports of these datasets were originally tracked via Git LFS pointers. Because the remote LFS storage objects for these redundant CSV exports are unavailable, the plain text LFS pointers have been removed from active Git tracking. All underlying training data is fully accessible via the preserved JSON record files.
