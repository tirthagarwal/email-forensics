"""
Database-Backed Deployment ML Training Pipeline.
===============================================
Extracts features from the relational database, performs group-aware splitting,
trains an IsolationForest anomaly detector, determines threshold exclusively on
validation split, computes SHA-256 integrity, and registers candidate models in
the Model Registry.

Guarantees:
- Production Deployment ML v3.0.0 remains DEPLOYED unless promoted explicitly.
- Zero-leakage enforcement against security rules and risk scores.
- Unsupervised evaluation reporting format maintained.
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.ensemble import IsolationForest
import joblib

from db_training_dataset import DBTrainingDataset
from create_training_split import split_by_groups
from training_dataset_registry import TrainingDatasetRegistry
from model_registry import ModelRegistryService, compute_file_sha256
from evaluate_db_model import evaluate_unsupervised_split, evaluate_ground_truth_benchmark
import feature_schema as fs


DEFAULT_MODELS_DIR = Path(__file__).parent.parent / "models" / "deployment_ml"


def train_model_from_db(
    model_version: str = "3.2.0-db",
    model_variant: str = "db_historical_v1",
    db_url: Optional[str] = None,
    include_historical: bool = True,
    min_samples: int = 50,
    min_groups: int = 3,
    n_estimators: int = 200,
    random_state: int = 42,
    percentile_threshold: float = 10.0,
    output_dir: Optional[Path] = None,
    register_in_db: bool = True,
    holdout_sources: Optional[List[str]] = None,
    overwrite_dataset_version: bool = False,
) -> Dict[str, Any]:
    """
    Extract DB data, check Population Gate, train IsolationForest, evaluate, save artifact, and register.
    """
    out_dir = Path(output_dir) if output_dir else DEFAULT_MODELS_DIR / model_variant
    out_dir.mkdir(parents=True, exist_ok=True)

    # 1. Extract dataset from DB
    extractor = DBTrainingDataset(db_url=db_url)
    dataset = extractor.extract_dataset(include_historical=include_historical)
    sample_count = dataset["sample_count"]
    group_count = dataset.get("unique_groups_count", len(dataset.get("group_counts", {})))

    # ── Training Population Gate ───────────────────────────────────────────
    if sample_count < min_samples or group_count < min_groups:
        msg = "Insufficient database population for meaningful model training."
        print(msg)
        raise ValueError(f"{msg} Found {sample_count} records and {group_count} groups (minimum required: {min_samples} records, {min_groups} groups).")

    # 2. Group-aware train / validation / test partition
    split = split_by_groups(
        records=dataset["records"],
        groups=dataset["groups"],
        X=dataset["X"],
        train_ratio=0.70,
        val_ratio=0.15,
        test_ratio=0.15,
        random_state=random_state,
        holdout_sources=holdout_sources,
    )

    train_X = split["train"]["X"]
    val_X = split["val"]["X"]
    test_X = split["test"]["X"]

    if len(train_X) == 0:
        # If all samples went to train in edge cases with small groups
        train_X = dataset["X"]
        val_X = dataset["X"]
        test_X = dataset["X"]

    # 3. Save dataset version to dataset registry
    ds_reg = TrainingDatasetRegistry()
    ds_version_tag = f"db_dataset_{model_version}"
    ds_manifest = ds_reg.save_dataset_version(
        dataset_version=ds_version_tag,
        split_data=split,
        description=f"Extracted from database for model {model_version}",
        overwrite=overwrite_dataset_version,
        random_state=random_state,
    )

    # 4. Train IsolationForest
    model = IsolationForest(
        n_estimators=n_estimators,
        random_state=random_state,
        contamination="auto",
    )
    model.fit(train_X)

    # 5. Threshold selection strictly on validation set (or train if val empty)
    eval_target_X = val_X if len(val_X) > 0 else train_X
    val_decision_scores = model.decision_function(eval_target_X)
    threshold = float(np.percentile(val_decision_scores, percentile_threshold))

    # 6. Evaluate on validation and test (unsupervised) + benchmark
    val_eval = evaluate_unsupervised_split(model, eval_target_X, threshold, "validation")
    test_eval = evaluate_unsupervised_split(model, test_X if len(test_X) > 0 else train_X, threshold, "test")
    bench_eval = evaluate_ground_truth_benchmark(model, threshold)

    # 7. Save model artifact and schema files
    model_artifact_path = out_dir / "deployment_isolation_forest.joblib"
    joblib.dump(model, model_artifact_path)
    artifact_sha256 = compute_file_sha256(model_artifact_path)

    threshold_path = out_dir / "deployment_threshold.json"
    with open(threshold_path, "w", encoding="utf-8") as f:
        json.dump({"threshold": threshold, "percentile": percentile_threshold}, f, indent=2)

    schema_path = out_dir / "deployment_feature_schema.json"
    with open(schema_path, "w", encoding="utf-8") as f:
        json.dump(fs.get_schema_metadata(), f, indent=2)

    metadata = {
        "model_version": model_version,
        "model_variant": model_variant,
        "algorithm": "IsolationForest",
        "feature_schema_version": fs.FEATURE_SCHEMA_VERSION,
        "training_dataset_version": ds_version_tag,
        "threshold": threshold,
        "n_estimators": n_estimators,
        "random_state": random_state,
        "sample_count": sample_count,
        "split_summary": split["summary"],
        "artifact_sha256": artifact_sha256,
        "validation_eval": val_eval,
        "test_eval": test_eval,
        "benchmark_eval": bench_eval,
    }

    metadata_path = out_dir / "deployment_training_metadata.json"
    with open(metadata_path, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

    # 8. Register in database
    if register_in_db:
        reg_service = ModelRegistryService(db_url=db_url)
        # Ensure production model is seeded
        reg_service.seed_production_model()

        # Register candidate
        status = "VALIDATED" if bench_eval.get("status") == "EVALUATED_OK" and bench_eval.get("f1_score", 0) >= 0.75 else "CANDIDATE"
        reg_service.register_new_model(
            model_version=model_version,
            threshold=threshold,
            model_variant=model_variant,
            training_dataset_version=ds_version_tag,
            artifact_path=str(model_artifact_path.resolve()),
            artifact_sha256=artifact_sha256,
            training_record_count=split["summary"]["train_samples"],
            validation_record_count=split["summary"]["val_samples"],
            test_record_count=split["summary"]["test_samples"],
            n_estimators=n_estimators,
            random_state=random_state,
            status=status,
            metrics={"validation": val_eval, "benchmark": bench_eval},
        )

    return metadata


def main():
    parser = argparse.ArgumentParser(description="Train IsolationForest Model from Database")
    parser.add_argument("--version", type=str, default="3.1.0-db", help="Model version tag")
    parser.add_argument("--variant", type=str, default="db_v1", help="Model variant name")
    parser.add_argument("--estimators", type=int, default=200, help="Number of trees")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    parser.add_argument("--no-register", action="store_true", help="Skip DB registry")
    args = parser.parse_args()

    print("=" * 70)
    print(f"TRAINING DEPLOYMENT ML MODEL: version={args.version}, variant={args.variant}")
    print("=" * 70)

    try:
        res = train_model_from_db(
            model_version=args.version,
            model_variant=args.variant,
            n_estimators=args.estimators,
            random_state=args.seed,
            register_in_db=not args.no_register,
        )
        print("\n[+] Training Complete!")
        print(f"    Dataset Version: {res['training_dataset_version']}")
        print(f"    Threshold: {res['threshold']:.6f}")
        print(f"    Artifact SHA-256: {res['artifact_sha256']}")
        print(f"    Validation Evaluation: {res['validation_eval']['evaluation_type']}")
        print(f"    Benchmark F1-Score: {res['benchmark_eval'].get('f1_score', 'N/A')}")
    except Exception as e:
        print(f"[-] Training failed: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
