import json
from pathlib import Path
from security_knowledge_base import get_rule_knowledge

class SecurityRuleEngine:
    def evaluate_session(self, session_data, features):
        findings = []
        uid = features.get("uid")
        conn = session_data.get("connection", {})
        protocol = features.get("protocol", "UNKNOWN")
        affected_conn = f"{conn.get('source_ip')}:{conn.get('source_port')} -> {conn.get('destination_ip')}:{conn.get('destination_port')} (UID: {uid})"

        def create_finding(rule_id, severity, evidence, confidence="HIGH"):
            kb = get_rule_knowledge(rule_id)
            return {
                "rule_id": rule_id,
                "severity": severity,
                "title": kb["title"],
                "description": kb["description"],
                "evidence": evidence,
                "affected_connection": affected_conn,
                "affected_protocol": protocol,
                "confidence": confidence,
                "security_impact": kb["security_impact"],
                "references": kb["references"],
                "recommendation": kb["technical_remediation"],
                "technical_remediation": kb["technical_remediation"]
            }

        # 1. Missing STARTTLS / STLS Rules
        if features.get("missing_starttls"):
            rule_id = f"{protocol}_NO_STARTTLS" if protocol in ["SMTP", "IMAP", "POP3"] else "SMTP_NO_STARTTLS"
            if protocol == "POP3":
                rule_id = "POP3_NO_STLS"
            findings.append(create_finding(
                rule_id, "HIGH",
                f"{protocol} session on port {conn.get('destination_port')} transmitted in cleartext without STARTTLS/STLS upgrade."
            ))

        # 2. Plaintext Authentication Exposure Rule
        if features.get("plaintext_auth_risk"):
            findings.append(create_finding(
                "PLAINTEXT_AUTH_EXPOSURE", "CRITICAL",
                f"Authentication commands observed over unencrypted {protocol} connection."
            ))

        # 3. Deprecated TLS Version Rule
        if features.get("weak_tls_version") is True:
            findings.append(create_finding(
                "TLS_DEPRECATED_VERSION", "HIGH",
                f"Session negotiated deprecated protocol version '{features.get('tls_version')}'."
            ))

        # 4. Weak Cipher Suite Rule
        if features.get("weak_cipher") is True:
            findings.append(create_finding(
                "TLS_WEAK_CIPHER", "HIGH",
                f"Session negotiated weak cipher suite '{features.get('cipher_suite')}'."
            ))

        # 5. Lack of Forward Secrecy Rule
        if features.get("forward_secrecy_indicator") is False and features.get("tls_version"):
            findings.append(create_finding(
                "TLS_NO_FORWARD_SECRECY", "MEDIUM",
                f"Cipher suite '{features.get('cipher_suite')}' uses static key exchange without ephemeral Diffie-Hellman (ECDHE/DHE)."
            ))

        # 6. Self-Signed Certificate Rule
        if features.get("certificate_self_signed") is True:
            findings.append(create_finding(
                "CERT_SELF_SIGNED", "MEDIUM",
                f"Certificate subject '{session_data.get('certificate', {}).get('subject')}' matches issuer."
            ))

        # 7. Expired Certificate Rule
        if features.get("certificate_expired") is True:
            findings.append(create_finding(
                "CERT_EXPIRED", "CRITICAL",
                f"Certificate expired. Days remaining: {features.get('certificate_days_remaining')}."
            ))

        # 8. Certificate Not Yet Valid Rule
        if features.get("certificate_not_yet_valid") is True:
            findings.append(create_finding(
                "CERT_NOT_YET_VALID", "HIGH",
                "Certificate activation timestamp is set in the future."
            ))

        # 9. Weak Key Length Rule
        if features.get("weak_key_size") is True:
            findings.append(create_finding(
                "CERT_WEAK_KEY_SIZE", "HIGH",
                f"Public key size of {features.get('certificate_key_size')} bits is below security threshold."
            ))

        # 10. Weak Signature Algorithm Rule
        if features.get("weak_signature_algorithm") is True:
            findings.append(create_finding(
                "CERT_WEAK_SIG_ALG", "HIGH",
                f"Certificate uses weak signature algorithm '{features.get('certificate_signature_algorithm')}'."
            ))

        # 11. Hostname Mismatch Rule
        if features.get("certificate_hostname_match") is False:
            findings.append(create_finding(
                "CERT_HOSTNAME_MISMATCH", "HIGH",
                f"SNI/Hostname '{features.get('server_name')}' does not match certificate subject."
            ))

        return findings

def main():
    from crypto_features import extract_crypto_features

    input_file = Path("part1/output/tls_analysis.json")
    if not input_file.exists():
        print(f"Error: {input_file} not found.")
        return

    with open(input_file, "r") as f:
        data = json.load(f)

    engine = SecurityRuleEngine()
    all_findings = []

    for session in data.get("sessions", []):
        features = extract_crypto_features(session)
        findings = engine.evaluate_session(session, features)
        all_findings.extend(findings)

    print("Evaluated Security Findings:")
    print(json.dumps(all_findings, indent=2))

if __name__ == "__main__":
    main()
