import json
from pathlib import Path

sys_path = Path(__file__).parent
import sys
sys.path.insert(0, str(sys_path))

from security_rules import SecurityRuleEngine
from risk_engine import RiskEngine
from ai_anomaly_detector import AIAnomalyDetector

GROUND_TRUTH_FILE = Path("part1/test_fixtures/labeled_ground_truth.json")

class ControlledEvaluator:
    def __init__(self, ground_truth_path=None):
        self.path = Path(ground_truth_path) if ground_truth_path else GROUND_TRUTH_FILE
        self.rule_engine = SecurityRuleEngine()
        self.risk_engine = RiskEngine()
        self.ml_detector = AIAnomalyDetector()

    def evaluate_benchmark(self):
        if not self.path.exists():
            return {"error": f"Ground truth dataset {self.path} not found."}

        with open(self.path, "r", encoding="utf-8") as f:
            fixtures = json.load(f)

        tp, fp, tn, fn = 0, 0, 0, 0
        rule_eval_results = []

        for fix in fixtures:
            fix_id = fix.get("fixture_id")
            expected_findings = set(fix.get("expected_finding_ids", []))
            features = fix.get("features", {})

            # Mock session wrapper
            session_data = {
                "uid": fix_id,
                "connection": {"source_ip": "192.168.1.50", "source_port": 54321, "destination_ip": "192.168.1.20", "destination_port": 25},
                "certificate": {"subject": "CN=mail.example.local"} if features.get("certificate_self_signed") else {}
            }

            predicted_findings = self.rule_engine.evaluate_session(session_data, features)
            predicted_rule_ids = set(f.get("rule_id") for f in predicted_findings)

            has_expected_issue = len(expected_findings) > 0
            has_predicted_issue = len(predicted_rule_ids) > 0

            if has_expected_issue and has_predicted_issue:
                tp += 1
            elif not has_expected_issue and not has_predicted_issue:
                tn += 1
            elif not has_expected_issue and has_predicted_issue:
                fp += 1
            elif has_expected_issue and not has_predicted_issue:
                fn += 1

            rule_eval_results.append({
                "fixture_id": fix_id,
                "expected": list(expected_findings),
                "predicted": list(predicted_rule_ids),
                "exact_match": expected_findings == predicted_rule_ids
            })

        total = tp + fp + tn + fn
        accuracy = round((tp + tn) / total, 4) if total > 0 else 0.0
        precision = round(tp / (tp + fp), 4) if (tp + fp) > 0 else 0.0
        recall = round(tp / (tp + fn), 4) if (tp + fn) > 0 else 0.0
        f1 = round((2 * precision * recall) / (precision + recall), 4) if (precision + recall) > 0 else 0.0
        fpr = round(fp / (fp + tn), 4) if (fp + tn) > 0 else 0.0
        fnr = round(fn / (fn + tp), 4) if (fn + tp) > 0 else 0.0

        return {
            "evaluation_type": "Controlled Labeled Benchmark",
            "total_fixtures": total,
            "metrics": {
                "accuracy": accuracy,
                "precision": precision,
                "recall": recall,
                "f1_score": f1,
                "false_positive_rate": fpr,
                "false_negative_rate": fnr
            },
            "confusion_matrix": {
                "true_positives": tp,
                "false_positives": fp,
                "true_negatives": tn,
                "false_negatives": fn
            },
            "fixture_results": rule_eval_results
        }

def main():
    evaluator = ControlledEvaluator()
    res = evaluator.evaluate_benchmark()
    print("Controlled Labeled Benchmark Evaluation Results:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
