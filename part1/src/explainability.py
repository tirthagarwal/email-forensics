import json

class SessionExplainabilityEngine:
    def __init__(self):
        pass

    def generate_explanation(self, session_data, features, findings, risk_result, ml_result):
        conn = session_data.get("connection", {})
        proto = features.get("protocol", "UNKNOWN")
        uid = features.get("uid")

        src = f"{conn.get('source_ip')}:{conn.get('source_port')}"
        dst = f"{conn.get('destination_ip')}:{conn.get('destination_port')}"

        # 1. Why Suspicious
        suspicious_points = []
        for f in findings:
            suspicious_points.append(f"{f.get('title')} ({f.get('severity')})")

        if ml_result and ml_result.get("is_anomaly"):
            ml_expl = ml_result.get("explanation") or (
                f"Statistical ML Anomaly Detected (Score: {ml_result.get('ml_anomaly_score')}). "
                "Session characteristics differ statistically from the deployment baseline."
            )
            suspicious_points.append(f"[Statistical ML Anomaly] {ml_expl}")

        if not suspicious_points:
            why_suspicious = ["Session exhibits standard secure cryptographic posture."]
        else:
            why_suspicious = suspicious_points

        # 2. Evidence Summary
        evidence = []
        if features.get("starttls_detected"):
            evidence.append("STARTTLS/STLS command negotiated.")
        else:
            evidence.append("No STARTTLS/STLS negotiation detected.")

        if features.get("tls_version"):
            evidence.append(f"TLS Version: {features.get('tls_version')}, Cipher: {features.get('cipher_suite')}")

        if session_data.get("certificate"):
            cert = session_data.get("certificate")
            evidence.append(f"Certificate Subject: {cert.get('subject')}, Issuer: {cert.get('issuer')}, Key Length: {cert.get('key_length')} bits")

        # 3. Security Impact
        impacts = []
        for f in findings:
            impacts.append(f.get("security_impact"))

        if not impacts:
            security_impact = "No adverse cryptographic security impacts detected."
        else:
            security_impact = " ".join(list(dict.fromkeys(impacts)))

        # 4. Action Plan
        action_plan = []
        for f in findings:
            action_plan.append(f.get("recommendation"))

        return {
            "session_uid": uid,
            "session_summary": f"{proto} session from {src} to {dst}",
            "risk_score": risk_result.get("risk_score"),
            "risk_level": risk_result.get("risk_level"),
            "ml_anomaly": ml_result.get("is_anomaly"),
            "ml_anomaly_score": ml_result.get("ml_anomaly_score"),
            "why_suspicious": why_suspicious,
            "evidence_breakdown": evidence,
            "security_impact": security_impact,
            "recommended_action_plan": list(dict.fromkeys(action_plan))
        }

def main():
    engine = SessionExplainabilityEngine()
    sample_session = {"connection": {"source_ip": "192.168.1.50", "source_port": 54321, "destination_ip": "192.168.1.20", "destination_port": 25}}
    sample_feats = {"protocol": "SMTP", "uid": "abc123", "starttls_detected": True, "tls_version": "TLSv12", "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"}
    sample_findings = [{"title": "Self-Signed Certificate in Use", "severity": "MEDIUM", "security_impact": "Clients cannot verify identity.", "recommendation": "Replace self-signed cert."}]
    sample_risk = {"risk_score": 15, "risk_level": "LOW"}
    sample_ml = {"is_anomaly": False, "ml_anomaly_score": 0.12}

    res = engine.generate_explanation(sample_session, sample_feats, sample_findings, sample_risk, sample_ml)
    print("Explainability Engine Output Test:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
