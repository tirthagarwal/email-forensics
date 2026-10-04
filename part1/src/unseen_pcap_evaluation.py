"""
unseen_pcap_evaluation.py
───────────────────────────
Evaluation module for scoring unseen PCAP/session traffic patterns on the
Deployment ML IsolationForest model.

IMPORTANT:
  - This evaluation measures statistical distribution deviation of unseen traffic.
  - Independent anomaly ground truth DOES NOT exist for unsupervised traffic.
  - Precision, Recall, F1, FPR, and FNR are NOT computed here.
  - Scores are model-derived relative anomaly scores and NOT probabilities.
  - An ML anomaly flag DOES NOT automatically equal a security vulnerability.
"""

import json
import os
import sys
import time
from pathlib import Path
from typing import Any, Dict, List

sys.path.insert(0, str(Path(__file__).parent))

from ai_anomaly_detector import AIAnomalyDetector
from tls_analyzer import analyze_zeek_logs


class UnseenPCAPEvaluator:
    """Evaluates unseen PCAPs on the deployment ML model."""

    def __init__(self):
        self.detector = AIAnomalyDetector()

    def evaluate_unseen_pcap_directory(self, pcap_dir: Path, zeek_cache_dir: Path) -> Dict[str, Any]:
        """
        Ingest and score all PCAPs in pcap_dir.
        """
        import subprocess

        pcap_files = sorted(
            p for p in pcap_dir.iterdir()
            if p.suffix.lower() in {".pcap", ".pcapng"}
        )
        if not pcap_files:
            return {"error": f"No PCAP files found in {pcap_dir}"}

        results = []
        for idx, pcap in enumerate(pcap_files, 1):
            zeek_out = zeek_cache_dir / f"zeek_unseen_{idx}"
            zeek_out.mkdir(parents=True, exist_ok=True)

            rel_pcap = os.path.relpath(str(pcap), str(zeek_out))
            cmd = ["zeek", "-r", rel_pcap, "local"]
            proc = subprocess.run(cmd, cwd=str(zeek_out), capture_output=True, text=True)

            zeek_data = analyze_zeek_logs(zeek_out)
            sessions = zeek_data.get("sessions", [])

            for s in sessions:
                conn = s.get("connection", {})
                email_proto = s.get("email_protocol", {})
                tls = s.get("tls", {})
                cert = s.get("certificate", {})

                crypto_feats = {
                    "protocol": email_proto.get("protocol", "UNKNOWN"),
                    "tls_version": tls.get("version"),
                    "cipher_suite": tls.get("cipher"),
                    "elliptic_curve": tls.get("curve"),
                    "tls_established": email_proto.get("tls_established", False),
                    "certificate_key_size": cert.get("key_length") if cert else None,
                    "_client_bytes": conn.get("client_bytes", 0) or 0,
                    "_server_bytes": conn.get("server_bytes", 0) or 0,
                    "_client_packets": conn.get("client_packets", 0) or 0,
                    "_server_packets": conn.get("server_packets", 0) or 0,
                    "_duration": conn.get("duration", 0.0) or 0.0,
                }

                ml_res = self.detector.predict_anomaly(crypto_feats)
                results.append({
                    "pcap_source": pcap.name,
                    "session_uid": s.get("uid"),
                    "protocol": email_proto.get("protocol"),
                    "tls_version": tls.get("version"),
                    "cipher_suite": tls.get("cipher"),
                    "raw_score": ml_res["raw_score"],
                    "anomaly_score": ml_res["anomaly_score"],
                    "threshold": ml_res["threshold"],
                    "is_anomaly": ml_res["is_anomaly"],
                    "explanation": ml_res["explanation"],
                })

        total_sessions = len(results)
        anomalies_flagged = sum(1 for r in results if r["is_anomaly"])
        anomaly_rate = round(anomalies_flagged / total_sessions, 4) if total_sessions > 0 else 0.0

        scores = [r["raw_score"] for r in results] if results else [0.0]

        return {
            "evaluation_type": "Unseen PCAP Statistical Evaluation",
            "eval_timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "model_version": self.detector.model_version,
            "feature_schema_version": self.detector._feature_schema_version,
            "integrity_status": self.detector._integrity_status,
            "total_unseen_pcaps": len(pcap_files),
            "total_unseen_sessions": total_sessions,
            "anomalies_flagged": anomalies_flagged,
            "anomaly_rate": anomaly_rate,
            "raw_score_stats": {
                "min": min(scores),
                "max": max(scores),
                "mean": round(sum(scores) / len(scores), 4) if scores else 0.0,
                "threshold_used": self.detector._threshold,
            },
            "ground_truth_status": "Unsupervised evaluation — no independent anomaly ground truth.",
            "session_evaluations": results,
        }


def main():
    evaluator = UnseenPCAPEvaluator()
    pcap_dir = Path(__file__).parent.parent / "pcaps"
    cache_dir = Path(__file__).parent.parent / "output" / "zeek_unseen_cache"
    res = evaluator.evaluate_unseen_pcap_directory(pcap_dir, cache_dir)
    print("Unseen PCAP ML Evaluation Results:")
    print(json.dumps(res, indent=2))


if __name__ == "__main__":
    main()
