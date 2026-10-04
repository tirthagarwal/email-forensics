"""
Model Comparison Engine & Side-by-Side Diagnostic Report.
=========================================================
Compares the active production model (Deployment ML v3.0.0) against candidate
models across feature schemas, training populations, validation thresholds,
unsupervised score distributions, and controlled ground-truth benchmarks.

Safety Policy:
- Does NOT automatically declare a winner.
- Does NOT automatically promote any candidate model to production.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

from model_registry import ModelRegistryService
from evaluate_db_model import evaluate_model_artifact, evaluate_ground_truth_benchmark
import feature_schema as fs


DEFAULT_MODELS_DIR = Path(__file__).parent.parent / "models" / "deployment_ml"


def compare_models(
    candidate_version: Optional[str] = None,
    candidate_variant: Optional[str] = None,
    db_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Compare active production model with specified candidate."""
    reg = ModelRegistryService(db_url=db_url)
    prod = reg.get_deployed_model()
    if not prod:
        prod = reg._to_dict(reg.seed_production_model())

    # Find candidate
    models = reg.list_all_models()
    cand = None
    if candidate_version:
        cand = next((m for m in models if m["model_version"] == candidate_version), None)
    elif candidate_variant:
        cand = next((m for m in models if m["model_variant"] == candidate_variant), None)
    else:
        # Pick the most recent non-deployed model
        cand = next((m for m in models if m["status"] in ("CANDIDATE", "VALIDATED")), None)

    # Evaluate production on benchmark
    prod_bench = None
    if prod.get("artifact_path") and Path(prod["artifact_path"]).exists():
        prod_bench = evaluate_ground_truth_benchmark(
            joblib.load(prod["artifact_path"]),
            prod["threshold"],
        )

    # Evaluate candidate on benchmark
    cand_bench = None
    if cand and cand.get("artifact_path") and Path(cand["artifact_path"]).exists():
        cand_bench = evaluate_ground_truth_benchmark(
            joblib.load(cand["artifact_path"]),
            cand["threshold"],
        )

    return {
        "comparison_title": "Deployment ML Production vs Candidate Comparison",
        "production_model": {
            "version": prod.get("model_version"),
            "variant": prod.get("model_variant"),
            "status": prod.get("status"),
            "algorithm": prod.get("algorithm"),
            "feature_schema": prod.get("feature_schema_version"),
            "threshold": prod.get("threshold"),
            "training_rows": prod.get("training_record_count"),
            "artifact_sha256": prod.get("artifact_sha256"),
            "benchmark_evaluation": prod_bench,
        },
        "candidate_model": {
            "version": cand.get("model_version") if cand else "NONE_AVAILABLE",
            "variant": cand.get("model_variant") if cand else "NONE",
            "status": cand.get("status") if cand else "NONE",
            "algorithm": cand.get("algorithm") if cand else "NONE",
            "feature_schema": cand.get("feature_schema_version") if cand else "NONE",
            "threshold": cand.get("threshold") if cand else None,
            "training_rows": cand.get("training_record_count") if cand else 0,
            "artifact_sha256": cand.get("artifact_sha256") if cand else "NONE",
            "benchmark_evaluation": cand_bench,
        } if cand else None,
        "policy_notice": "Scientific evaluation only. No automated promotion performed.",
    }


def print_comparison_report(comp: Dict[str, Any]) -> None:
    """Print formatted terminal side-by-side comparison table."""
    prod = comp["production_model"]
    cand = comp.get("candidate_model")

    print("\n" + "=" * 80)
    print("           DEPLOYMENT ML: PRODUCTION VS CANDIDATE COMPARISON")
    print("=" * 80)

    p_bench = prod.get("benchmark_evaluation") or {}
    c_bench = (cand.get("benchmark_evaluation") or {}) if cand else {}

    print(f"\n{'Metric / Property':<30} {'Production (' + str(prod.get('version')) + ')':<25} {'Candidate (' + str(cand.get('version') if cand else 'N/A') + ')'}")
    print("-" * 80)
    print(f"{'Status':<30} {prod.get('status', 'DEPLOYED'):<25} {(cand.get('status') if cand else 'N/A')}")
    print(f"{'Variant':<30} {prod.get('variant', 'expanded_v3'):<25} {(cand.get('variant') if cand else 'N/A')}")
    print(f"{'Algorithm':<30} {prod.get('algorithm', 'IsolationForest'):<25} {(cand.get('algorithm') if cand else 'N/A')}")
    print(f"{'Feature Schema':<30} {prod.get('feature_schema', '1.0.0')} (32-dim){'':<14} {(cand.get('feature_schema') if cand else 'N/A')}")
    print(f"{'Training Population':<30} {str(prod.get('training_rows')) + ' rows':<25} {(str(cand.get('training_rows')) + ' rows') if cand else 'N/A'}")
    print(f"{'Validation Threshold':<30} {prod.get('threshold', 0.0):<25.6f} {(cand.get('threshold', 0.0) if cand and cand.get('threshold') is not None else 'N/A')}")

    p_hash = (prod.get('artifact_sha256')[:16] + '...') if prod.get('artifact_sha256') else 'N/A'
    c_hash = (cand.get('artifact_sha256')[:16] + '...') if cand and cand.get('artifact_sha256') else 'N/A'
    print(f"{'Artifact SHA-256':<30} {p_hash:<25} {c_hash}")

    print("\n[CONTROLLED LABELED BENCHMARK METRICS]")
    print(f"  Notice: Performance measured on a controlled labeled benchmark.")
    print(f"{'Metric':<30} {'Production':<25} {'Candidate'}")
    print("-" * 80)
    print(f"{'Sample Count':<30} {p_bench.get('sample_count', 'N/A'):<25} {c_bench.get('sample_count', 'N/A')}")
    print(f"{'Precision':<30} {str(p_bench.get('precision', 'N/A')):<25} {c_bench.get('precision', 'N/A')}")
    print(f"{'Recall':<30} {str(p_bench.get('recall', 'N/A')):<25} {c_bench.get('recall', 'N/A')}")
    print(f"{'F1 Score':<30} {str(p_bench.get('f1_score', 'N/A')):<25} {c_bench.get('f1_score', 'N/A')}")
    print(f"{'False Positive Rate (FPR)':<30} {str(p_bench.get('fpr', 'N/A')):<25} {c_bench.get('fpr', 'N/A')}")
    print(f"{'False Negative Rate (FNR)':<30} {str(p_bench.get('fnr', 'N/A')):<25} {c_bench.get('fnr', 'N/A')}")

    print("\n[UNSUPERVISED EVALUATION POLICY]")
    print("  'Unsupervised evaluation — no independent anomaly ground truth.'")
    print("  'Production model Deployment ML v3.0.0 remains DEPLOYED.'")
    print("=" * 80 + "\n")


def main():
    parser = argparse.ArgumentParser(description="Compare Deployment ML Production vs Candidate")
    parser.add_argument("--candidate", type=str, default=None, help="Candidate model version string")
    parser.add_argument("--variant", type=str, default=None, help="Candidate model variant string")
    parser.add_argument("--db-url", type=str, default=None, help="Database URL")
    parser.add_argument("--json", action="store_true", help="Output JSON report")
    args = parser.parse_args()

    comp = compare_models(candidate_version=args.candidate, candidate_variant=args.variant, db_url=args.db_url)
    if args.json:
        print(json.dumps(comp, indent=2))
    else:
        print_comparison_report(comp)


if __name__ == "__main__":
    main()
