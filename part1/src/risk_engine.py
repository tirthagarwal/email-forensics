import json

DEFAULT_WEIGHTS = {
    "PLAINTEXT_AUTH_EXPOSURE": 40,
    "CERT_EXPIRED": 35,
    "TLS_DEPRECATED_VERSION": 30,
    "TLS_WEAK_CIPHER": 25,
    "CERT_WEAK_SIG_ALG": 25,
    "CERT_WEAK_KEY_SIZE": 20,
    "CERT_HOSTNAME_MISMATCH": 20,
    "SMTP_NO_STARTTLS": 20,
    "IMAP_NO_STARTTLS": 20,
    "POP3_NO_STLS": 20,
    "CERT_NOT_YET_VALID": 15,
    "CERT_SELF_SIGNED": 15,
    "TLS_NO_FORWARD_SECRECY": 10
}

class RiskEngine:
    def __init__(self, custom_weights=None):
        self.weights = DEFAULT_WEIGHTS.copy()
        if custom_weights:
            self.weights.update(custom_weights)

    def calculate_session_risk(self, findings):
        raw_score = 0
        contributors = []

        for f in findings:
            rule_id = f.get("rule_id")
            weight = self.weights.get(rule_id, 10)
            raw_score += weight
            contributors.append({
                "rule_id": rule_id,
                "title": f.get("title"),
                "points_added": weight
            })

        bounded_score = min(100, raw_score)
        risk_level = self.get_risk_level(bounded_score)

        return {
            "risk_score": bounded_score,
            "risk_level": risk_level,
            "contributors": contributors
        }

    def calculate_overall_risk(self, session_risk_results):
        if not session_risk_results:
            return {
                "overall_risk_score": 0,
                "risk_level": "MINIMAL",
                "max_session_score": 0,
                "average_session_score": 0,
                "contributors": []
            }

        scores = [r["risk_score"] for r in session_risk_results]
        max_score = max(scores)
        avg_score = round(sum(scores) / len(scores), 2)

        # Overall score prioritizes highest risk session with average smoothing
        overall_score = min(100, round((max_score * 0.7) + (avg_score * 0.3), 2))
        risk_level = self.get_risk_level(overall_score)

        contrib_map = {}
        for r in session_risk_results:
            for c in r.get("contributors", []):
                rule_id = c.get("rule_id")
                if rule_id not in contrib_map:
                    contrib_map[rule_id] = {
                        "rule_id": rule_id,
                        "title": c.get("title"),
                        "points_added": c.get("points_added"),
                        "occurrences": 1
                    }
                else:
                    contrib_map[rule_id]["points_added"] += c.get("points_added")
                    contrib_map[rule_id]["occurrences"] += 1

        all_contributors = sorted(list(contrib_map.values()), key=lambda x: x["points_added"], reverse=True)

        return {
            "overall_risk_score": overall_score,
            "risk_level": risk_level,
            "max_session_score": max_score,
            "average_session_score": avg_score,
            "contributors": all_contributors
        }

    @staticmethod
    def get_risk_level(score):
        if score >= 80:
            return "CRITICAL"
        elif score >= 60:
            return "HIGH"
        elif score >= 40:
            return "MODERATE"
        elif score >= 20:
            return "LOW"
        else:
            return "MINIMAL"

def main():
    engine = RiskEngine()
    sample_findings = [
        {"rule_id": "CERT_SELF_SIGNED", "title": "Self-Signed Certificate in Use"},
        {"rule_id": "TLS_NO_FORWARD_SECRECY", "title": "Lack of Perfect Forward Secrecy (PFS)"}
    ]
    res = engine.calculate_session_risk(sample_findings)
    print("Risk Engine Output Test:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
