"""
Model Evaluation Engine for Database-Backed Models.
===================================================
Evaluates IsolationForest deployment models across unsupervised splits
and controlled ground-truth test benchmarks.

Strict Compliance:
- Outputs clear notice for unsupervised sets:
  "Unsupervised evaluation — no independent anomaly ground truth"
- Never fabricates labels for unlabeled network traffic.
"""

import json
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import joblib

import feature_schema as fs
import deployment_ml_features as dmf


DEFAULT_GROUND_TRUTH_PATH = Path(__file__).parent.parent / "test_fixtures" / "labeled_ground_truth.json"


def evaluate_unsupervised_split(
    model: Any,
    X: np.ndarray,
    threshold: float,
    split_name: str = "validation",
) -> Dict[str, Any]:
    """
    Compute statistical distributions and anomaly rates on an unlabeled partition.
    """
    if X is None or len(X) == 0:
        return {
            "split_name": split_name,
            "sample_count": 0,
            "evaluation_type": "Unsupervised evaluation — no independent anomaly ground truth",
            "anomalies_detected": 0,
            "anomaly_rate_percent": 0.0,
            "score_distribution": {},
        }

    scores = model.decision_function(X)
    is_anomaly = (scores < threshold)
    anomaly_count = int(np.sum(is_anomaly))
    anomaly_rate = float(anomaly_count / len(X) * 100.0)

    # Score bounds check [-1.0, 1.0]
    scores_bounded = bool(np.all((scores >= -1.0) & (scores <= 1.0)))

    return {
        "split_name": split_name,
        "sample_count": len(X),
        "evaluation_type": "Unsupervised evaluation — no independent anomaly ground truth",
        "threshold": float(threshold),
        "anomalies_detected": anomaly_count,
        "anomaly_rate_percent": round(anomaly_rate, 2),
        "scores_bounded": scores_bounded,
        "score_distribution": {
            "min": float(np.min(scores)),
            "max": float(np.max(scores)),
            "mean": float(np.mean(scores)),
            "std": float(np.std(scores)),
            "p5": float(np.percentile(scores, 5)),
            "p10": float(np.percentile(scores, 10)),
            "p50": float(np.percentile(scores, 50)),
            "p90": float(np.percentile(scores, 90)),
            "p95": float(np.percentile(scores, 95)),
        },
    }


def evaluate_ground_truth_benchmark(
    model: Any,
    threshold: float,
    benchmark_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """
    Evaluate model against the labeled controlled benchmark.
    Computes precision, recall, F1, FPR, FNR, TP, FP, TN, FN.
    """
    bench_file = Path(benchmark_path) if benchmark_path else DEFAULT_GROUND_TRUTH_PATH
    if not bench_file.exists():
        return {"status": "BENCHMARK_NOT_FOUND", "path": str(bench_file)}

    with open(bench_file, "r", encoding="utf-8") as f:
        bench_data = json.load(f)

    if isinstance(bench_data, list):
        samples = bench_data
    elif isinstance(bench_data, dict):
        samples = bench_data.get("samples", bench_data.get("fixtures", []))
    else:
        samples = []

    if not samples:
        return {"status": "EMPTY_BENCHMARK"}

    vectors = []
    y_true = []
    for s in samples:
        f_dict = s.get("features", s)
        # Extract features
        raw_feat = {
            "client_bytes": f_dict.get("client_bytes") or f_dict.get("_client_bytes", 0),
            "server_bytes": f_dict.get("server_bytes") or f_dict.get("_server_bytes", 0),
            "client_packets": f_dict.get("client_packets") or f_dict.get("_client_packets", 0),
            "server_packets": f_dict.get("server_packets") or f_dict.get("_server_packets", 0),
            "duration": f_dict.get("duration", 0.0),
            "certificate_key_size": f_dict.get("certificate_key_size"),
            "tls_established": bool(f_dict.get("tls_established", False)),
            "forward_secrecy": bool(f_dict.get("forward_secrecy") or f_dict.get("forward_secrecy_indicator", False)),
            "protocol": (f_dict.get("protocol") or "UNKNOWN").upper(),
            "tls_version": f_dict.get("tls_version"),
            "cipher_suite": f_dict.get("cipher_suite"),
            "elliptic_curve": f_dict.get("elliptic_curve"),
        }
        # Zero leakage check
        fs.assert_no_forbidden_features(raw_feat)
        transformed = dmf.transform_deployment_features(raw_feat)
        vec = dmf.feature_dict_to_vector(transformed)
        vectors.append(vec)
        exp_anomaly = s.get("expected_is_anomaly") if "expected_is_anomaly" in s else s.get("expected_anomaly", False)
        y_true.append(1 if exp_anomaly else 0)

    X = np.array(vectors)
    scores = model.decision_function(X)
    y_pred = (scores < threshold).astype(int)

    tp = int(np.sum((y_pred == 1) & (np.array(y_true) == 1)))
    fp = int(np.sum((y_pred == 1) & (np.array(y_true) == 0)))
    tn = int(np.sum((y_pred == 0) & (np.array(y_true) == 0)))
    fn = int(np.sum((y_pred == 0) & (np.array(y_true) == 1)))

    precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
    recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
    f1 = float(2 * precision * recall / (precision + recall)) if (precision + recall) > 0 else 0.0
    fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
    fnr = float(fn / (tp + fn)) if (tp + fn) > 0 else 0.0

    return {
        "status": "EVALUATED_OK",
        "benchmark_file": bench_file.name,
        "sample_count": len(samples),
        "threshold": float(threshold),
        "tp": tp,
        "fp": fp,
        "tn": tn,
        "fn": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "fpr": round(fpr, 4),
        "fnr": round(fnr, 4),
    }


def evaluate_model_artifact(
    model_path: Path,
    threshold: float,
    validation_X: Optional[np.ndarray] = None,
    test_X: Optional[np.ndarray] = None,
    benchmark_path: Optional[Path] = None,
) -> Dict[str, Any]:
    """Load model artifact and run full evaluation."""
    model = joblib.load(model_path)

    results: Dict[str, Any] = {
        "model_artifact": str(model_path),
        "threshold": threshold,
    }

    if validation_X is not None and len(validation_X) > 0:
        results["validation_unsupervised"] = evaluate_unsupervised_split(model, validation_X, threshold, "validation")

    if test_X is not None and len(test_X) > 0:
        results["test_unsupervised"] = evaluate_unsupervised_split(model, test_X, threshold, "test")

    results["ground_truth_benchmark"] = evaluate_ground_truth_benchmark(model, threshold, benchmark_path)

    return results


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Evaluate Deployment ML Model")
    parser.add_argument("--model-path", type=str, default="part1/models/deployment_ml/deployment_isolation_forest.joblib")
    parser.add_argument("--threshold", type=float, default=-0.041466321224221024)
    args = parser.parse_args()

    model_file = Path(args.model_path)
    if model_file.exists():
        res = evaluate_model_artifact(model_file, args.threshold)
        print("=" * 60)
        print("MODEL EVALUATION RESULTS")
        print("=" * 60)
        print(json.dumps(res, indent=2))
    else:
        print(f"Error: Model file {model_file} not found.")
