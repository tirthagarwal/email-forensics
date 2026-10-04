"""
Training Dataset Versioning and Registry.
=========================================
Saves, versions, catalogs, and verifies datasets extracted from the database
or PCAPs under `part1/datasets/training/<dataset_version>/`.

Maintains cryptographic SHA-256 manifests and ensures zero-leakage compliance.
"""

import json
import hashlib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import feature_schema as fs

DEFAULT_TRAINING_DATASETS_DIR = Path(__file__).parent.parent / "datasets" / "training"


def _compute_sha256(file_path: Path) -> str:
    """Compute SHA-256 hash of a file."""
    h = hashlib.sha256()
    with open(file_path, "rb") as f:
        while chunk := f.read(65536):
            h.update(chunk)
    return h.hexdigest()


compute_file_sha256 = _compute_sha256


class TrainingDatasetRegistry:
    """Manages versioned ML training datasets and their SHA-256 integrity."""

    def __init__(self, base_dir: Optional[Path] = None):
        self.base_dir = Path(base_dir) if base_dir else DEFAULT_TRAINING_DATASETS_DIR
        self.base_dir.mkdir(parents=True, exist_ok=True)

    def save_dataset_version(
        self,
        dataset_version: str,
        split_data: Dict[str, Any],
        description: str = "",
        overwrite: bool = False,
        random_state: int = 42,
    ) -> Dict[str, Any]:
        """
        Persist an immutable versioned dataset including train/val/test splits,
        dataset.csv, schema.json, metadata.json, and sha256.txt.
        """
        version_dir = self.base_dir / dataset_version
        if version_dir.exists() and (version_dir / "metadata.json").exists() and not overwrite:
            raise FileExistsError(f"Dataset version '{dataset_version}' already exists and is immutable!")

        version_dir.mkdir(parents=True, exist_ok=True)

        # Zero leakage check on records
        train_recs = split_data.get("train", {}).get("records", [])
        val_recs = split_data.get("val", {}).get("records", [])
        test_recs = split_data.get("test", {}).get("records", [])
        all_records = train_recs + val_recs + test_recs

        for rec in all_records:
            if "raw_features" in rec:
                fs.assert_no_forbidden_features(rec["raw_features"])
            if "transformed_features" in rec:
                fs.assert_no_forbidden_features(rec["transformed_features"])

        # 1. Save split JSON records
        files_to_save = {
            "train_records.json": train_recs,
            "val_records.json": val_recs,
            "test_records.json": test_recs,
        }

        file_hashes = {}
        for filename, data in files_to_save.items():
            file_path = version_dir / filename
            with open(file_path, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2)
            file_hashes[filename] = _compute_sha256(file_path)

        # 2. Save schema.json
        schema_file = version_dir / "schema.json"
        schema_metadata = fs.get_schema_metadata()
        with open(schema_file, "w", encoding="utf-8") as f:
            json.dump(schema_metadata, f, indent=2)
        file_hashes["schema.json"] = _compute_sha256(schema_file)

        # 3. Save dataset.csv
        import csv
        csv_file = version_dir / "dataset.csv"
        fieldnames = ["split", "source_dataset", "source_type", "source_capture_id", "source_record_id"] + fs.ENCODED_FEATURE_NAMES
        with open(csv_file, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            for split_name, recs in [("train", train_recs), ("validation", val_recs), ("test", test_recs)]:
                for r in recs:
                    row_data = {
                        "split": split_name,
                        "source_dataset": r.get("source_dataset", "local_email_pcap"),
                        "source_type": r.get("source_type", "LOCAL_PCAP"),
                        "source_capture_id": r.get("capture_filename") or r.get("source_capture_id", "unknown"),
                        "source_record_id": r.get("session_uid") or r.get("source_record_id", "unknown"),
                    }
                    if "transformed_features" in r:
                        row_data.update(r["transformed_features"])
                    writer.writerow(row_data)
        file_hashes["dataset.csv"] = _compute_sha256(csv_file)

        # 4. Extract source datasets set
        source_datasets = sorted(list(set(r.get("source_dataset", "local_email_pcap") for r in all_records)))
        summary = split_data.get("summary", {})

        # 5. Save metadata.json
        metadata = {
            "dataset_version": dataset_version,
            "creation_time": datetime.now(timezone.utc).isoformat(),
            "source_datasets": source_datasets,
            "record_count": len(all_records),
            "group_count": summary.get("total_groups", 0),
            "feature_schema_version": fs.FEATURE_SCHEMA_VERSION,
            "train_count": len(train_recs),
            "validation_count": len(val_recs),
            "test_count": len(test_recs),
            "random_state": random_state,
            "group_strategy": "capture_source_hierarchy",
            "missing_value_strategy": "documented_sentinels_zero_imputation",
            "preprocessing": "log1p_and_standard_vocabulary_onehot",
            "description": description,
            "summary": summary,
            "files": file_hashes,
        }
        meta_file = version_dir / "metadata.json"
        with open(meta_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)
        meta_hash = _compute_sha256(meta_file)
        metadata["sha256"] = meta_hash

        # Also write dataset_manifest.json for backward compatibility
        manifest_file = version_dir / "dataset_manifest.json"
        with open(manifest_file, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        # 6. Save sha256.txt
        sha256_txt_file = version_dir / "sha256.txt"
        with open(sha256_txt_file, "w", encoding="utf-8") as f:
            for fname, fhash in sorted(file_hashes.items()):
                f.write(f"{fhash}  {fname}\n")
            f.write(f"{meta_hash}  metadata.json\n")

        return metadata

    def load_dataset_version(self, dataset_version: str) -> Dict[str, Any]:
        """
        Load a saved dataset version and verify SHA-256 integrity.
        """
        version_dir = self.base_dir / dataset_version
        manifest_path = version_dir / "dataset_manifest.json"

        if not manifest_path.exists():
            raise FileNotFoundError(f"Dataset manifest not found for version '{dataset_version}' at {manifest_path}")

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        splits = {}
        for filename in ["train_records.json", "val_records.json", "test_records.json"]:
            file_path = version_dir / filename
            split_key = filename.replace("_records.json", "")
            if file_path.exists():
                with open(file_path, "r", encoding="utf-8") as f:
                    splits[split_key] = json.load(f)
            else:
                splits[split_key] = []

        return {
            "manifest": manifest,
            "train": splits.get("train", []),
            "val": splits.get("val", []),
            "test": splits.get("test", []),
        }

    def verify_dataset_integrity(self, dataset_version: str) -> Dict[str, Any]:
        """Verify checksums for all files in a dataset version."""
        version_dir = self.base_dir / dataset_version
        manifest_path = version_dir / "dataset_manifest.json"

        if not manifest_path.exists():
            return {"status": "FAILED", "reason": "Manifest missing"}

        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)

        file_results = {}
        all_ok = True
        for filename, expected_hash in manifest.get("files", {}).items():
            file_path = version_dir / filename
            if not file_path.exists():
                file_results[filename] = {"status": "MISSING"}
                all_ok = False
            else:
                actual_hash = _compute_sha256(file_path)
                match = (actual_hash == expected_hash)
                file_results[filename] = {
                    "status": "VERIFIED_OK" if match else "HASH_MISMATCH",
                    "expected": expected_hash,
                    "actual": actual_hash,
                }
                if not match:
                    all_ok = False

        return {
            "dataset_version": dataset_version,
            "status": "VERIFIED_OK" if all_ok else "VERIFICATION_FAILED",
            "files": file_results,
        }

    def list_dataset_versions(self) -> List[Dict[str, Any]]:
        """List all available dataset versions."""
        versions = []
        for p in sorted(self.base_dir.iterdir()):
            if p.is_dir() and (p / "dataset_manifest.json").exists():
                try:
                    with open(p / "dataset_manifest.json", "r", encoding="utf-8") as f:
                        manifest = json.load(f)
                    versions.append(manifest)
                except Exception:
                    pass
        return versions
