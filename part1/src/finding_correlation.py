import json

SEVERITY_ORDER = {"CRITICAL": 1, "HIGH": 2, "MEDIUM": 3, "LOW": 4, "INFO": 5}

CATEGORY_MAPPING = {
    "CERT_SELF_SIGNED": "Certificate Trust & Validation",
    "CERT_EXPIRED": "Certificate Trust & Validation",
    "CERT_NOT_YET_VALID": "Certificate Trust & Validation",
    "CERT_HOSTNAME_MISMATCH": "Certificate Identity & Hostname",
    "CERT_WEAK_KEY_SIZE": "Cryptographic Strength & Key Length",
    "CERT_WEAK_SIG_ALG": "Cryptographic Strength & Signature Hashing",
    "TLS_DEPRECATED_VERSION": "Legacy Protocol & Transport Security",
    "TLS_WEAK_CIPHER": "Legacy Cipher Suite Security",
    "TLS_NO_FORWARD_SECRECY": "Forward Secrecy Configuration",
    "SMTP_NO_STARTTLS": "Unencrypted Transport Exposure",
    "IMAP_NO_STARTTLS": "Unencrypted Transport Exposure",
    "POP3_NO_STLS": "Unencrypted Transport Exposure",
    "PLAINTEXT_AUTH_EXPOSURE": "Plaintext Credential Exposure"
}

class FindingCorrelationEngine:
    def __init__(self):
        pass

    def correlate_and_prioritize(self, findings):
        if not findings:
            return {
                "prioritized_findings": [],
                "finding_groups": {},
                "recommended_remediation_order": []
            }

        # 1. Sort findings deterministically by severity
        sorted_findings = sorted(
            findings,
            key=lambda f: (SEVERITY_ORDER.get(f.get("severity", "LOW"), 99), f.get("rule_id", ""))
        )

        # 2. Group findings by security category
        groups = {}
        for f in sorted_findings:
            rule_id = f.get("rule_id")
            category = CATEGORY_MAPPING.get(rule_id, "General Security Posture")
            if category not in groups:
                groups[category] = []
            groups[category].append(f)

        # 3. Build recommended remediation order
        remediation_order = []
        seen_rules = set()

        for f in sorted_findings:
            rule_id = f.get("rule_id")
            if rule_id not in seen_rules:
                seen_rules.add(rule_id)
                remediation_order.append({
                    "priority_step": len(remediation_order) + 1,
                    "rule_id": rule_id,
                    "severity": f.get("severity"),
                    "action_summary": f.get("title"),
                    "recommendation": f.get("recommendation")
                })

        return {
            "prioritized_findings": sorted_findings,
            "finding_groups": groups,
            "recommended_remediation_order": remediation_order
        }

def main():
    engine = FindingCorrelationEngine()
    sample_findings = [
        {"rule_id": "CERT_SELF_SIGNED", "severity": "MEDIUM", "title": "Self-Signed Certificate in Use"},
        {"rule_id": "PLAINTEXT_AUTH_EXPOSURE", "severity": "CRITICAL", "title": "Plaintext Auth"}
    ]
    res = engine.correlate_and_prioritize(sample_findings)
    print("Finding Correlation Engine Test:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
