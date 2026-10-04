import os
import sys
import json
import time
import argparse
import subprocess
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from email_protocol_parser import EmailProtocolParser
from tls_analyzer import analyze_zeek_logs
from crypto_features import extract_crypto_features
from security_rules import SecurityRuleEngine
from risk_engine import RiskEngine
from finding_correlation import FindingCorrelationEngine
from ai_anomaly_detector import AIAnomalyDetector
from explainability import SessionExplainabilityEngine
from enterprise_aggregator import EnterprisePostureAggregator
from report_generator import ForensicReportGenerator
from security_assessment import SecurityAssessmentBuilder
from tls_keylog_decryptor import decrypt_tls13_pcap_certificates

DEFAULT_PCAP = Path("part1/pcaps/smtp_starttls_real.pcap")
DEFAULT_ZEEK_DIR = Path("part1/output/zeek_real_tls")
OUTPUT_REPORT_JSON = Path("part1/output/forensic_report.json")
OUTPUT_REPORT_HTML = Path("part1/output/forensic_report.html")
OUTPUT_REPORT_PDF = Path("part1/output/forensic_report.pdf")

def run_zeek_analysis(pcap_path, output_dir):
    os.makedirs(output_dir, exist_ok=True)
    rel_pcap = os.path.relpath(Path(pcap_path).resolve(), Path(output_dir).resolve())
    cmd = ["zeek", "-r", rel_pcap, "local"]
    
    proc = subprocess.run(cmd, cwd=output_dir, capture_output=True, text=True)
    if proc.returncode != 0:
        print(f"[Pipeline Warning] Zeek exited with code {proc.returncode}: {proc.stderr}")

def analyze_pcap_files(pcap_paths, zeek_dir_base, tls_keylog=None):
    rule_engine = SecurityRuleEngine()
    risk_engine = RiskEngine()
    correlation_engine = FindingCorrelationEngine()
    ml_detector = AIAnomalyDetector()
    explain_engine = SessionExplainabilityEngine()
    aggregator = EnterprisePostureAggregator()

    all_sessions_master = []
    connections_summary = []
    email_sessions_summary = []
    tls_sessions_summary = []
    certificates_summary = []
    features_list = []
    all_findings = []
    session_risks = []
    ml_results = []
    explanations = []

    overall_decryption_status = "NOT_APPLICABLE"
    if tls_keylog:
        overall_decryption_status = "NO_MATCH"

    for idx, pcap_path in enumerate(pcap_paths, 1):
        zeek_out = zeek_dir_base / f"zeek_pcap_{idx}"
        run_zeek_analysis(pcap_path, zeek_out)
        zeek_data = analyze_zeek_logs(zeek_out)
        sessions = zeek_data.get("sessions", [])
        all_sessions_master.extend(sessions)

        # Authorized TLS 1.3 Keylog Decryption if supplied
        decryption_res = None
        if tls_keylog:
            decryption_res = decrypt_tls13_pcap_certificates(pcap_path, tls_keylog)
            if decryption_res.get("success"):
                overall_decryption_status = "DECRYPTED"
            elif overall_decryption_status != "DECRYPTED":
                overall_decryption_status = decryption_res.get("decryption_status", "FAILED")

        for s in sessions:
            conn = s.get("connection", {})
            email_proto = s.get("email_protocol", {})
            tls = s.get("tls", {})
            cert = s.get("certificate")

            if tls_keylog and not cert:
                if decryption_res and decryption_res.get("success") and decryption_res.get("certificates"):
                    s["certificate"] = decryption_res["certificates"][0]
                    cert = s["certificate"]
                    if not tls.get("version"):
                        tls["version"] = "TLSv13"
                    tls["decryption_status"] = "DECRYPTED"
                    tls["keylog_used"] = True
                else:
                    tls["decryption_status"] = decryption_res.get("decryption_status", "FAILED") if decryption_res else "FAILED"
                    tls["keylog_used"] = True

            connections_summary.append({
                "uid": s.get("uid"),
                "pcap_source": str(pcap_path),
                "source": f"{conn.get('source_ip')}:{conn.get('source_port')}",
                "destination": f"{conn.get('destination_ip')}:{conn.get('destination_port')}",
                "protocol": conn.get("transport_protocol"),
                "service": conn.get("service"),
                "duration_seconds": conn.get("duration"),
                "client_bytes": conn.get("client_bytes"),
                "server_bytes": conn.get("server_bytes"),
                "conn_state": conn.get("conn_state")
            })

            email_sessions_summary.append({
                "uid": s.get("uid"),
                "protocol": email_proto.get("protocol"),
                "encryption_mode": email_proto.get("encryption_mode"),
                "starttls_attempted": email_proto.get("starttls_attempted"),
                "starttls_accepted": email_proto.get("starttls_accepted"),
                "implicit_tls": email_proto.get("implicit_tls"),
                "tls_established": email_proto.get("tls_established"),
                "authentication_observed": email_proto.get("authentication_observed"),
                "plaintext_auth_risk": email_proto.get("plaintext_auth_risk"),
                "extracted_commands": email_proto.get("extracted_commands", []),
                "tls_version": tls.get("version"),
                "cipher_suite": tls.get("cipher"),
                "ml_anomaly_score": None
            })

            if tls.get("version"):
                tls_sessions_summary.append({
                    "uid": s.get("uid"),
                    "version": tls.get("version"),
                    "cipher": tls.get("cipher"),
                    "curve": tls.get("curve"),
                    "server_name": tls.get("server_name"),
                    "established": tls.get("established"),
                    "validation_status": tls.get("validation_status"),
                    "sni_matches_cert": tls.get("sni_matches_cert")
                })

            if cert:
                certificates_summary.append({
                    "fingerprint_sha256": cert.get("fingerprint_sha256"),
                    "subject": cert.get("subject"),
                    "issuer": cert.get("issuer"),
                    "serial": cert.get("serial"),
                    "key_length": cert.get("key_length"),
                    "key_algorithm": cert.get("key_algorithm"),
                    "signature_algorithm": cert.get("signature_algorithm")
                })

            feats = extract_crypto_features(s)

            # ── Inject raw flow metrics into feats for deployment ML ───────
            # These are prefixed with '_' to distinguish them from the
            # crypto-feature namespace. The ML model uses them; deterministic
            # security rules do NOT.
            feats["_client_bytes"]   = conn.get("client_bytes",   0) or 0
            feats["_server_bytes"]   = conn.get("server_bytes",   0) or 0
            feats["_client_packets"] = conn.get("client_packets", 0) or 0
            feats["_server_packets"] = conn.get("server_packets", 0) or 0
            feats["_duration"]       = conn.get("duration",       0.0) or 0.0
            # ─────────────────────────────────────────────────────────────

            features_list.append(feats)

            findings = rule_engine.evaluate_session(s, feats)
            all_findings.extend(findings)

            s_risk = risk_engine.calculate_session_risk(findings)
            session_risks.append(s_risk)

            ml_res = ml_detector.predict_anomaly(feats)
            ml_results.append(ml_res)
            email_sessions_summary[-1]["ml_anomaly_score"] = ml_res.get("ml_anomaly_score")

            expl = explain_engine.generate_explanation(s, feats, findings, s_risk, ml_res)
            explanations.append(expl)

    correlation_res = correlation_engine.correlate_and_prioritize(all_findings)
    overall_risk_res = risk_engine.calculate_overall_risk(session_risks)
    enterprise_res = aggregator.aggregate_enterprise_posture(all_sessions_master, features_list, all_findings, overall_risk_res)
    
    assessment_builder = SecurityAssessmentBuilder()
    sec_assessment = assessment_builder.build_assessment(all_sessions_master, features_list, all_findings, overall_risk_res)

    master_report = {
        "report_metadata": {
            "framework_name": "AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment",
            "version": "1.0.0",
            "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "tls_keylog_supplied": tls_keylog is not None,
            "tls_keylog_decryption_status": overall_decryption_status
        },
        "pcap": {
            "total_pcaps": len(pcap_paths),
            "files_analyzed": [str(p) for p in pcap_paths],
            "analyzed_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "total_connections": len(all_sessions_master)
        },
        "summary": {
            "total_pcaps": len(pcap_paths),
            "total_sessions": len(all_sessions_master),
            "total_findings": len(all_findings),
            "baseline_score": sec_assessment["baseline_score"],
            "cryptographic_score": sec_assessment["cryptographic_score"],
            "overall_risk_score": overall_risk_res.get("overall_risk_score"),
            "score_delta": sec_assessment["score_delta"],
            "risk_level": overall_risk_res.get("risk_level"),
            "total_ml_anomalies": sum(1 for m in ml_results if m.get("is_anomaly"))
        },
        "security_assessment": sec_assessment,
        "connections": connections_summary,
        "email_sessions": email_sessions_summary,
        "tls_sessions": tls_sessions_summary,
        "certificates": certificates_summary,
        "cryptographic_features": features_list,
        "findings": correlation_res.get("prioritized_findings", []),
        "finding_groups": correlation_res.get("finding_groups", {}),
        "risk_assessment": overall_risk_res,
        "ml_analysis": {
            "model_name":    ml_results[0].get("model_name", "IsolationForest") if ml_results else "IsolationForest",
            "model_version": ml_results[0].get("model_version", "2.0.0")        if ml_results else "2.0.0",
            "feature_schema_version": ml_results[0].get("feature_schema_version", "unknown") if ml_results else "unknown",
            "total_anomalies_detected": sum(1 for m in ml_results if m.get("is_anomaly")),
            "results": ml_results
        },
        "session_explanations": explanations,
        "recommendations": correlation_res.get("recommended_remediation_order", []),
        "enterprise_posture": enterprise_res
    }

    return master_report

def main():
    parser = argparse.ArgumentParser(description="AI-Assisted Email Cryptographic Security Posture Forensic Framework")
    parser.add_argument("--pcap", type=str, help="Path to single target PCAP file")
    parser.add_argument("--input-dir", type=str, help="Directory containing PCAP files")
    parser.add_argument("--output", type=str, default=str(OUTPUT_REPORT_JSON), help="Output JSON report path")
    parser.add_argument("--format", choices=["json", "html", "pdf", "all"], default="all", help="Report output format")
    parser.add_argument("--tls-keylog", type=str, help="Optional path to authorized TLS NSS Keylog file for session decryption")
    parser.add_argument("--dashboard", action="store_true", help="Launch interactive Streamlit dashboard")

    args = parser.parse_args()

    if args.dashboard:
        print("[Pipeline] Launching Streamlit Dashboard...")
        os.system("streamlit run part1/src/dashboard.py")
        sys.exit(0)

    pcap_paths = []
    if args.input_dir:
        input_dir = Path(args.input_dir)
        pcap_paths = list(input_dir.glob("*.pcap"))
        if not pcap_paths:
            print(f"Error: No .pcap files found in directory {input_dir}")
            sys.exit(1)
    elif args.pcap:
        pcap_path = Path(args.pcap)
        if not pcap_path.exists():
            print(f"Error: PCAP file {pcap_path} not found.")
            sys.exit(1)
        pcap_paths = [pcap_path]
    else:
        pcap_paths = [DEFAULT_PCAP]

    if args.tls_keylog:
        keylog_path = Path(args.tls_keylog)
        if keylog_path.exists():
            print(f"[TLS Keylog] Loaded authorized key material from: {keylog_path}")
            print(f"[TLS Keylog] Authorized TLS 1.3 handshake decryption active.")
        else:
            print(f"[TLS Keylog Warning] Keylog file specified ({keylog_path}) does not exist.")

    print(f"\n================ STARTING FORENSIC PIPELINE ================")
    print(f"Analyzing {len(pcap_paths)} PCAP file(s): {[p.name for p in pcap_paths]}")
    
    report = analyze_pcap_files(pcap_paths, DEFAULT_ZEEK_DIR, tls_keylog=args.tls_keylog)

    json_path = Path(args.output)
    os.makedirs(json_path.parent, exist_ok=True)
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)

    generator = ForensicReportGenerator()
    if args.format in ["html", "all"]:
        generator.generate_html_report(report, OUTPUT_REPORT_HTML)
    if args.format in ["pdf", "all"]:
        generator.generate_pdf_report(report, OUTPUT_REPORT_PDF)

    print(f"\n================ FORENSIC REPORT COMPLETE ================")
    print(f"Total PCAPs Analyzed: {report['summary']['total_pcaps']}")
    print(f"Analyzed Sessions   : {report['summary']['total_sessions']}")
    print(f"Overall Risk Score  : {report['summary']['overall_risk_score']} / 100 ({report['summary']['risk_level']})")
    print(f"Total Findings      : {report['summary']['total_findings']}")
    print(f"ML Anomalies        : {report['summary']['total_ml_anomalies']}")
    print(f"Master JSON Report  : {json_path}")
    print(f"HTML Report         : {OUTPUT_REPORT_HTML}")
    print(f"PDF Report          : {OUTPUT_REPORT_PDF}\n")

if __name__ == "__main__":
    main()
