import json
from collections import Counter

class EnterprisePostureAggregator:
    def __init__(self):
        pass

    def aggregate_enterprise_posture(self, all_sessions, all_features, all_findings, overall_risk):
        total_sessions = len(all_sessions)

        # 1. Group by Protocol
        proto_counts = Counter()
        for f in all_features:
            proto_counts[f.get("protocol", "UNKNOWN")] += 1

        # 2. Group by Server Destination IP
        server_counts = Counter()
        server_findings = Counter()
        for s in all_sessions:
            conn = s.get("connection", {})
            dest_ip = conn.get("destination_ip") or "Unknown"
            dest_port = conn.get("destination_port")
            server_key = f"{dest_ip}:{dest_port}" if dest_port else dest_ip
            server_counts[server_key] += 1

        for f in all_findings:
            conn_str = f.get("affected_connection", "")
            if "->" in conn_str:
                dest_part = conn_str.split("->")[1].split("(")[0].strip()
                server_findings[dest_part] += 1

        # 3. Group by TLS Versions & Ciphers
        tls_versions = Counter()
        ciphers = Counter()
        for f in all_features:
            ver = f.get("tls_version") or "Plaintext / None"
            ciph = f.get("cipher_suite") or "None"
            tls_versions[ver] += 1
            ciphers[ciph] += 1

        # 4. Group by Certificate Fingerprint / Subject
        certificates = Counter()
        for s in all_sessions:
            cert = s.get("certificate")
            if cert:
                cert_key = cert.get("subject") or cert.get("fingerprint_sha256") or "Unknown"
                certificates[cert_key] += 1

        # 5. Recurring Weaknesses Identification
        recurring_weaknesses = []
        rule_counts = Counter(f.get("rule_id") for f in all_findings)

        if rule_counts.get("TLS_DEPRECATED_VERSION", 0) > 0:
            recurring_weaknesses.append(f"{rule_counts['TLS_DEPRECATED_VERSION']} session(s) use deprecated TLS versions.")

        if rule_counts.get("CERT_SELF_SIGNED", 0) > 0:
            recurring_weaknesses.append(f"{rule_counts['CERT_SELF_SIGNED']} session(s) utilize self-signed X.509 certificates.")

        if rule_counts.get("PLAINTEXT_AUTH_EXPOSURE", 0) > 0:
            recurring_weaknesses.append(f"{rule_counts['PLAINTEXT_AUTH_EXPOSURE']} session(s) expose authentication credentials over plaintext.")

        if rule_counts.get("SMTP_NO_STARTTLS", 0) + rule_counts.get("IMAP_NO_STARTTLS", 0) + rule_counts.get("POP3_NO_STLS", 0) > 0:
            total_no_starttls = rule_counts.get("SMTP_NO_STARTTLS", 0) + rule_counts.get("IMAP_NO_STARTTLS", 0) + rule_counts.get("POP3_NO_STLS", 0)
            recurring_weaknesses.append(f"{total_no_starttls} session(s) operate without STARTTLS/STLS encryption.")

        if rule_counts.get("TLS_NO_FORWARD_SECRECY", 0) > 0:
            recurring_weaknesses.append(f"{rule_counts['TLS_NO_FORWARD_SECRECY']} session(s) lack Perfect Forward Secrecy (PFS).")

        # Top Affected Systems
        top_affected_systems = [
            {"server": s, "finding_count": count} for s, count in server_findings.most_common(5)
        ]

        return {
            "enterprise_risk_score": overall_risk.get("overall_risk_score", 0),
            "enterprise_risk_level": overall_risk.get("risk_level", "MINIMAL"),
            "total_email_sessions": total_sessions,
            "protocol_breakdown": dict(proto_counts),
            "tls_version_distribution": dict(tls_versions),
            "cipher_suite_distribution": dict(ciphers),
            "server_distribution": dict(server_counts),
            "certificate_distribution": dict(certificates),
            "top_affected_systems": top_affected_systems,
            "recurring_weaknesses": recurring_weaknesses
        }

    def compare_reports(self, baseline_report, current_report):
        if not baseline_report or not current_report:
            return None

        base_summary = baseline_report.get("summary", {})
        curr_summary = current_report.get("summary", {})

        base_findings = baseline_report.get("findings", [])
        curr_findings = current_report.get("findings", [])

        base_keys = {f"{f.get('rule_id')}_{f.get('affected_connection')}" for f in base_findings}
        curr_keys = {f"{f.get('rule_id')}_{f.get('affected_connection')}" for f in curr_findings}

        new_findings = [f for f in curr_findings if f"{f.get('rule_id')}_{f.get('affected_connection')}" not in base_keys]
        resolved_findings = [f for f in base_findings if f"{f.get('rule_id')}_{f.get('affected_connection')}" not in curr_keys]

        base_risk = base_summary.get("overall_risk_score", 0.0)
        curr_risk = curr_summary.get("overall_risk_score", 0.0)
        risk_score_delta = round(curr_risk - base_risk, 2)

        base_proto = baseline_report.get("enterprise_posture", {}).get("protocol_breakdown", {})
        curr_proto = current_report.get("enterprise_posture", {}).get("protocol_breakdown", {})

        base_tls = baseline_report.get("enterprise_posture", {}).get("tls_version_distribution", {})
        curr_tls = current_report.get("enterprise_posture", {}).get("tls_version_distribution", {})

        base_certs = set(baseline_report.get("enterprise_posture", {}).get("certificate_distribution", {}).keys())
        curr_certs = set(current_report.get("enterprise_posture", {}).get("certificate_distribution", {}).keys())
        new_certs = list(curr_certs - base_certs)

        return {
            "baseline_pcap": baseline_report.get("pcap", {}).get("files_analyzed", ["Baseline"]),
            "current_pcap": current_report.get("pcap", {}).get("files_analyzed", ["Current"]),
            "baseline_timestamp": baseline_report.get("report_metadata", {}).get("generated_at"),
            "current_timestamp": current_report.get("report_metadata", {}).get("generated_at"),
            "risk_score_delta": risk_score_delta,
            "risk_score_trend": "INCREASED" if risk_score_delta > 0 else ("DECREASED" if risk_score_delta < 0 else "UNCHANGED"),
            "new_findings": new_findings,
            "resolved_findings": resolved_findings,
            "protocol_changes": {
                "baseline": base_proto,
                "current": curr_proto
            },
            "tls_version_changes": {
                "baseline": base_tls,
                "current": curr_tls
            },
            "new_certificates": new_certs
        }

def main():
    aggregator = EnterprisePostureAggregator()
    sample_sessions = [{"connection": {"destination_ip": "192.168.1.20", "destination_port": 25}}]
    sample_feats = [{"protocol": "SMTP", "tls_version": "TLSv12", "cipher_suite": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384"}]
    sample_findings = [{"rule_id": "CERT_SELF_SIGNED", "affected_connection": "192.168.1.50:54321 -> 192.168.1.20:25 (UID: test)"}]
    sample_risk = {"overall_risk_score": 15, "risk_level": "LOW"}

    res = aggregator.aggregate_enterprise_posture(sample_sessions, sample_feats, sample_findings, sample_risk)
    print("Enterprise Aggregator Test:")
    print(json.dumps(res, indent=2))

if __name__ == "__main__":
    main()
