"""
train_deployment_ml.py
────────────────────────
Reproducible training script for Deployment ML baseline_v2 and expanded_v3 models.

PURPOSE:
  Fits IsolationForest models on deployment traffic feature vectors (32 encoded dimensions).

MODEL VERSIONS:
  1. baseline_v2: Trained on 4 local PCAP sessions. Saved to part1/models/deployment_ml/baseline_v2/
  2. expanded_v3: Trained on expanded dataset (10,898 records). Saved to part1/models/deployment_ml/expanded_v3/

ARTIFACT INTEGRITY:
  SHA-256 checksums of the generated model, threshold, and schema files
  are computed and recorded in metadata JSON files for runtime integrity checks.
"""

import csv
import hashlib
import json
import math
import os
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from dataset_adapters import GenericPCAPZeekAdapter, PassiveOSDatasetAdapter
from deployment_ml_features import (
    FEATURE_SCHEMA_VERSION,
    build_deployment_features,
    feature_dict_to_vector,
    get_feature_names_encoded,
    transform_deployment_features,
)
from tls_analyzer import analyze_zeek_logs

# ─── Paths ──────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent.parent
PCAP_DIR = ROOT / "part1" / "pcaps"
PASSIVE_OS_CSV = ROOT / "part1" / "datasets" / "processed" / "passive_os_tls_clean.csv"
ZEEK_CACHE_DIR = ROOT / "part1" / "output" / "zeek_train_cache"

MODEL_BASE_DIR = ROOT / "part1" / "models" / "deployment_ml"
BASELINE_DIR   = MODEL_BASE_DIR / "baseline_v2"
EXPANDED_DIR   = MODEL_BASE_DIR / "expanded_v3"

PCAP_EXTENSIONS = {".pcap", ".pcapng"}
RANDOM_SEED = 42
N_ESTIMATORS = 200
CONTAMINATION = "auto"

TRAIN_FRAC = 0.70
VAL_FRAC   = 0.15


def compute_file_sha256(filepath: Path) -> str:
    """Compute SHA-256 hex digest of a file."""
    h = hashlib.sha256()
    with open(filepath, "rb") as f:
        while chunk := f.read(8192):
            h.update(chunk)
    return h.hexdigest()


def discover_pcap_sessions(pcap_dir: Path, zeek_cache: Path) -> tuple:
    """Run Zeek on local PCAPs and return session dicts and group labels."""
    import subprocess
    sessions_all = []
    groups_all = []
    pcap_files = sorted(p for p in pcap_dir.iterdir() if p.suffix.lower() in PCAP_EXTENSIONS)

    for idx, pcap in enumerate(pcap_files, 1):
        zeek_out = zeek_cache / f"zeek_train_{idx}"
        zeek_out.mkdir(parents=True, exist_ok=True)
        rel_pcap = os.path.relpath(str(pcap), str(zeek_out))
        subprocess.run(["zeek", "-r", rel_pcap, "local"], cwd=str(zeek_out), capture_output=True)

        zeek_data = analyze_zeek_logs(zeek_out)
        pcap_sessions = zeek_data.get("sessions", [])
        for s in pcap_sessions:
            sessions_all.append(s)
            groups_all.append(pcap.name)

    return sessions_all, groups_all


def reproducible_group_split(groups: list, train_frac: float, val_frac: float, seed: int):
    """Perform group-aware splitting by capture source ID."""
    unique_groups = sorted(list(set(groups)))
    rng = np.random.default_rng(seed)
    shuffled_groups = rng.permutation(unique_groups)

    n_groups = len(shuffled_groups)
    n_train = max(1, int(round(n_groups * train_frac)))
    n_val   = max(1, int(round(n_groups * val_frac))) if n_groups >= 3 else (1 if n_groups == 2 else 0)

    train_groups = set(shuffled_groups[:n_train])
    val_groups   = set(shuffled_groups[n_train:n_train + n_val])
    test_groups  = set(shuffled_groups[n_train + n_val:])

    train_idx = [i for i, g in enumerate(groups) if g in train_groups]
    val_idx   = [i for i, g in enumerate(groups) if g in val_groups]
    test_idx  = [i for i, g in enumerate(groups) if g in test_groups]

    return np.array(train_idx, dtype=int), np.array(val_idx, dtype=int), np.array(test_idx, dtype=int), train_groups, val_groups, test_groups


def train_model_variant(model_name_tag: str, X: np.ndarray, groups: list, target_dir: Path, note: str):
    """Fit IsolationForest, select threshold on validation split, compute SHA-256 hashes, and save artifacts."""
    target_dir.mkdir(parents=True, exist_ok=True)
    feature_names = get_feature_names_encoded()

    train_idx, val_idx, test_idx, train_g, val_g, test_g = reproducible_group_split(
        groups, TRAIN_FRAC, VAL_FRAC, RANDOM_SEED
    )

    X_train = X[train_idx]
    X_val   = X[val_idx]
    X_test  = X[test_idx]

    print(f"\n[{model_name_tag}] Training model on {len(X_train)} samples across {len(train_g)} capture group(s)…")
    model = IsolationForest(
        n_estimators=N_ESTIMATORS,
        contamination=CONTAMINATION,
        random_state=RANDOM_SEED,
    )
    model.fit(X_train)

    if len(X_val) > 0:
        val_raw_scores = model.decision_function(X_val)
        threshold = float(np.percentile(val_raw_scores, 10))
        val_stats = {
            "min": float(val_raw_scores.min()),
            "max": float(val_raw_scores.max()),
            "mean": float(val_raw_scores.mean()),
            "p10": threshold,
        }
    else:
        threshold = 0.0
        val_stats = {"note": "Validation split empty — threshold set to 0.0"}

    test_stats = {}
    if len(X_test) > 0:
        test_raw_scores = model.decision_function(X_test)
        test_stats = {
            "min": float(test_raw_scores.min()),
            "max": float(test_raw_scores.max()),
            "mean": float(test_raw_scores.mean()),
            "flagged_anomalies": int(np.sum(test_raw_scores <= threshold)),
        }

    # Save artifacts
    model_path     = target_dir / "deployment_isolation_forest.joblib"
    threshold_path = target_dir / "deployment_threshold.json"
    schema_path    = target_dir / "deployment_feature_schema.json"
    metadata_path  = target_dir / "deployment_training_metadata.json"

    joblib.dump(model, model_path)

    threshold_data = {
        "model_name": "IsolationForest",
        "threshold_method": "validation_lower_tail_percentile",
        "percentile": 10 if len(X_val) > 0 else None,
        "threshold": threshold,
        "validation_size": int(len(X_val)),
        "random_seed": RANDOM_SEED,
        "labels_used": False,
    }
    with open(threshold_path, "w") as f:
        json.dump(threshold_data, f, indent=2)

    schema_data = {
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "feature_names": feature_names,
        "total_features": len(feature_names),
    }
    with open(schema_path, "w") as f:
        json.dump(schema_data, f, indent=2)

    model_sha     = compute_file_sha256(model_path)
    threshold_sha = compute_file_sha256(threshold_path)
    schema_sha    = compute_file_sha256(schema_path)

    metadata = {
        "model_name": f"Deployment IsolationForest ({model_name_tag})",
        "model_version": "2.0.0" if "baseline" in model_name_tag else "3.0.0",
        "feature_schema_version": FEATURE_SCHEMA_VERSION,
        "random_seed": RANDOM_SEED,
        "n_estimators": N_ESTIMATORS,
        "contamination": str(CONTAMINATION),
        "split_method": "grouped_by_pcap_source",
        "train_groups_count": len(train_g),
        "val_groups_count": len(val_g),
        "test_groups_count": len(test_g),
        "training_rows": int(len(train_idx)),
        "validation_rows": int(len(val_idx)),
        "test_rows": int(len(test_idx)),
        "total_sessions": len(X),
        "threshold": threshold,
        "validation_scores": val_stats,
        "test_scores": test_stats,
        "artifact_hashes_sha256": {
            "deployment_isolation_forest.joblib": model_sha,
            "deployment_threshold.json": threshold_sha,
            "deployment_feature_schema.json": schema_sha,
        },
        "training_note": note,
        "labels_used": False,
        "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    with open(metadata_path, "w") as f:
        json.dump(metadata, f, indent=2)

    # Also copy artifacts to legacy top-level MODEL_BASE_DIR for backwards compatibility
    if "expanded" in model_name_tag:
        joblib.dump(model, MODEL_BASE_DIR / "deployment_isolation_forest.joblib")
        with open(MODEL_BASE_DIR / "deployment_threshold.json", "w") as f:
            json.dump(threshold_data, f, indent=2)
        with open(MODEL_BASE_DIR / "deployment_feature_schema.json", "w") as f:
            json.dump(schema_data, f, indent=2)
        with open(MODEL_BASE_DIR / "deployment_training_metadata.json", "w") as f:
            json.dump(metadata, f, indent=2)

    print(f"[{model_name_tag}] Saved model to {target_dir}")
    print(f"  Threshold: {threshold:.6f} | SHA-256: {model_sha[:16]}…")


def main():
    print("=" * 60)
    print("  Deployment ML Training (Baseline v2 & Expanded v3)")
    print("=" * 60)

    # 1. Train Baseline v2 (4 local PCAPs)
    sessions_pcap, groups_pcap = discover_pcap_sessions(PCAP_DIR, ZEEK_CACHE_DIR)
    raw_dicts_pcap = [build_deployment_features(s) for s in sessions_pcap]
    X_pcap = np.array([feature_dict_to_vector(transform_deployment_features(rd)) for rd in raw_dicts_pcap])
    train_model_variant(
        "baseline_v2", X_pcap, groups_pcap, BASELINE_DIR,
        "Trained on 4 local PCAP sessions (baseline corpus)."
    )

    # 2. Train Expanded v3 (Local PCAPs + Passive OS Telemetry)
    all_raw = list(raw_dicts_pcap)
    all_groups = list(groups_pcap)

    if PASSIVE_OS_CSV.exists():
        with open(PASSIVE_OS_CSV, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for idx, row in enumerate(reader, 1):
                td = PassiveOSDatasetAdapter.adapt_row(row)
                vec = feature_dict_to_vector(td)
                flow_id = row.get("flow_ID") or f"pos_{idx}"
                all_raw.append(vec)
                all_groups.append(f"passive_os_flow_{flow_id}")

        X_expanded = np.array([r if isinstance(r, list) else feature_dict_to_vector(r) for r in all_raw])
        train_model_variant(
            "expanded_v3", X_expanded, all_groups, EXPANDED_DIR,
            "Trained on 10,898 records from local PCAPs and passive OS telemetry."
        )

    print("=" * 60)
    print("  Training complete for all model variants.")
    print("=" * 60)


if __name__ == "__main__":
    main()
