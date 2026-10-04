"""
Model Registry & Dataset Inspection CLI.
=========================================
CLI tool to inspect registered ML models, active deployment status,
cryptographic SHA-256 artifact integrity, and dataset manifests.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Optional

from model_registry import ModelRegistryService
from training_dataset_registry import TrainingDatasetRegistry


def inspect_registry(db_url: Optional[str] = None) -> None:
    """Print formatted summary of all models in the database registry."""
    reg = ModelRegistryService(db_url=db_url)
    reg.seed_production_model()

    models = reg.list_all_models()
    deployed = reg.get_deployed_model()

    print("\n" + "=" * 80)
    print("                      FORENSIC MODEL REGISTRY")
    print("=" * 80)

    if deployed:
        print(f"\n[★ ACTIVE DEPLOYED MODEL]")
        print(f"  Version:        {deployed['model_version']}")
        print(f"  Variant:        {deployed['model_variant']}")
        print(f"  Algorithm:      {deployed['algorithm']}")
        print(f"  Feature Schema: {deployed['feature_schema_version']} (32-dim)")
        print(f"  Threshold:      {deployed['threshold']:.6f}")
        print(f"  Training Rows:  {deployed['training_record_count']}")
        print(f"  Status:         {deployed['status']}")
        print(f"  Artifact Path:  {deployed['artifact_path']}")
        print(f"  SHA-256 Hash:   {deployed['artifact_sha256']}")
        print(f"  Last Updated:   {deployed['updated_at']}")

    print("\n[ALL REGISTERED MODELS]")
    print(f"{'Version':<12} {'Variant':<16} {'Status':<12} {'Threshold':<12} {'Train Rows':<12} {'Artifact Hash'}")
    print("-" * 80)
    for m in models:
        hash_short = (m['artifact_sha256'][:16] + "...") if m['artifact_sha256'] else "N/A"
        print(f"{m['model_version']:<12} {m['model_variant']:<16} {m['status']:<12} {m['threshold']:<12.6f} {m['training_record_count']:<12} {hash_short}")

    print("\n[ARTIFACT INTEGRITY CHECK]")
    for m in models:
        integrity = reg.verify_artifact_integrity(m["model_version"])
        status_flag = "[✓ VERIFIED_OK]" if integrity.get("status") == "VERIFIED_OK" else f"[✗ {integrity.get('status')}]"
        print(f"  - {m['model_version']}: {status_flag}")

    # Dataset Registry
    ds_reg = TrainingDatasetRegistry()
    ds_list = ds_reg.list_dataset_versions()
    print("\n[DATASET REGISTRY VERSIONS]")
    if ds_list:
        for ds in ds_list:
            print(f"  - Version: {ds.get('dataset_version')} | Schema: {ds.get('feature_schema_version')} | Created: {ds.get('created_at')}")
    else:
        print("  (No discrete dataset packages registered yet)")

    print("=" * 80 + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Inspect Model Registry & Datasets")
    parser.add_argument("--db-url", type=str, default=None, help="Custom database connection URL")
    args = parser.parse_args()
    inspect_registry(db_url=args.db_url)
