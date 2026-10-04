import sys
from pathlib import Path

# Add src to python path for testing
src_path = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_path))

from email_protocol_parser import EmailProtocolParser
from crypto_features import extract_crypto_features
from security_rules import SecurityRuleEngine
from risk_engine import RiskEngine
from finding_correlation import FindingCorrelationEngine
from ai_anomaly_detector import AIAnomalyDetector
from security_assessment import SecurityAssessmentBuilder
from live_capture import LiveCaptureManager

def test_email_protocol_parser_smtp():
    parser = EmailProtocolParser()
    conn = {"id.orig_h": "192.168.1.50", "id.orig_p": 54321, "id.resp_h": "192.168.1.20", "id.resp_p": 25, "service": "smtp,ssl"}
    smtp = {"helo": "client.example.local", "tls": True, "last_reply": "220 2.0.0 Ready to start TLS"}
    ssl_info = {"established": True}
    
    res = parser.analyze_session(conn, smtp, ssl_info)
    assert res["protocol"] == "SMTP"
    assert res["starttls_attempted"] is True
    assert res["starttls_accepted"] is True
    assert res["encryption_mode"] == "STARTTLS_ACCEPTED"

def test_crypto_feature_extraction():
    session_data = {
        "uid": "test1234",
        "connection": {"service": "smtp,ssl"},
        "email_protocol": {"protocol": "SMTP", "starttls_attempted": True, "starttls_accepted": True, "tls_established": True},
        "tls": {"version": "TLSv12", "cipher": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", "curve": "x25519", "sni_matches_cert": True},
        "certificate": {"subject": "CN=mail.example.local", "issuer": "CN=mail.example.local", "key_length": 2048, "key_algorithm": "rsaEncryption"}
    }
    feats = extract_crypto_features(session_data)
    assert feats["protocol"] == "SMTP"
    assert feats["tls_version"] == "TLSv12"
    assert feats["forward_secrecy_indicator"] is True
    assert feats["certificate_self_signed"] is True
    assert feats["weak_tls_version"] is False

def test_security_rule_engine():
    engine = SecurityRuleEngine()
    session_data = {"connection": {"source_ip": "192.168.1.50", "source_port": 54321, "destination_ip": "192.168.1.20", "destination_port": 25}, "certificate": {"subject": "CN=mail.example.local"}}
    feats = {
        "uid": "test1234",
        "protocol": "SMTP",
        "certificate_self_signed": True,
        "weak_tls_version": False,
        "weak_cipher": False
    }
    findings = engine.evaluate_session(session_data, feats)
    assert len(findings) == 1
    assert findings[0]["rule_id"] == "CERT_SELF_SIGNED"
    assert findings[0]["severity"] == "MEDIUM"

def test_risk_engine():
    engine = RiskEngine()
    findings = [{"rule_id": "CERT_SELF_SIGNED"}, {"rule_id": "TLS_NO_FORWARD_SECRECY"}]
    res = engine.calculate_session_risk(findings)
    assert res["risk_score"] == 25
    assert res["risk_level"] == "LOW"

def test_finding_correlation():
    engine = FindingCorrelationEngine()
    findings = [
        {"rule_id": "CERT_SELF_SIGNED", "severity": "MEDIUM", "title": "Self-Signed Cert"},
        {"rule_id": "PLAINTEXT_AUTH_EXPOSURE", "severity": "CRITICAL", "title": "Plaintext Auth"}
    ]
    res = engine.correlate_and_prioritize(findings)
    assert res["prioritized_findings"][0]["severity"] == "CRITICAL"
    assert len(res["recommended_remediation_order"]) == 2

def test_ai_anomaly_detector():
    """Verify new deployment ML detector v2.0 contract."""
    detector = AIAnomalyDetector()

    # Supply flow metrics via underscore-prefixed keys (as pipeline injects)
    feats = {
        "protocol":             "SMTP",
        "tls_version":          "TLSv12",
        "cipher_suite":         "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
        "elliptic_curve":       "x25519",
        "tls_established":      True,
        "certificate_key_size": 2048,
        # Raw flow metrics injected by forensic_pipeline
        "_client_bytes":   413,
        "_server_bytes":   1838,
        "_client_packets": 17,
        "_server_packets": 15,
        "_duration":       2.3,
        # Security-rule flags below — must NOT appear in feature_values_used
        "weak_cipher":            False,
        "weak_tls_version":       False,
        "missing_starttls":       False,
        "plaintext_auth_risk":    False,
        "certificate_self_signed": True,
        "certificate_problem":    True,
    }
    res = detector.predict_anomaly(feats)

    # Required keys in response
    assert "ml_anomaly_score"       in res
    assert "is_anomaly"             in res
    assert "raw_score"              in res
    assert "anomaly_score"          in res
    assert "threshold"              in res
    assert "model_version"          in res
    assert "feature_schema_version" in res
    assert "feature_values_used"    in res
    assert "explanation"            in res
    assert "evaluation_status"      in res

    # Scores are valid floats in expected range
    assert isinstance(res["ml_anomaly_score"], float)
    assert 0.0 <= res["ml_anomaly_score"] <= 1.0
    assert isinstance(res["is_anomaly"], bool)

    # Security-rule flags MUST NOT be present in feature_values_used
    forbidden = [
        "weak_cipher", "weak_tls_version", "missing_starttls",
        "plaintext_auth_risk", "certificate_self_signed",
        "certificate_problem",
    ]
    used_keys = set(res["feature_values_used"].keys())
    for flag in forbidden:
        assert flag not in used_keys, (
            f"Security-rule flag '{flag}' MUST NOT be a deployment ML feature"
        )

    # Model version is v2.0
    assert res["model_version"] in ("2.0.0", "3.0.0")

def test_security_assessment_builder():
    builder = SecurityAssessmentBuilder()
    sessions = [{"uid": "test1"}]
    feats = [{"uid": "test1", "protocol": "SMTP", "missing_starttls": True, "certificate_self_signed": True}]
    findings = [
        {"rule_id": "SMTP_NO_STARTTLS", "title": "Missing STARTTLS", "affected_connection": "UID: test1"},
        {"rule_id": "CERT_SELF_SIGNED", "title": "Self Signed Cert", "affected_connection": "UID: test1"}
    ]
    overall_risk = RiskEngine().calculate_overall_risk([RiskEngine().calculate_session_risk(findings)])
    
    assessment = builder.build_assessment(sessions, feats, findings, overall_risk)
    assert "baseline_score" in assessment
    assert "final_score" in assessment
    assert "score_delta" in assessment
    assert len(assessment["controls"]) == 13
    assert len(assessment["violations"]) >= 1

def test_live_capture_is_capturing():
    mgr = LiveCaptureManager(interface="lo0")
    assert mgr.is_capturing is False
    mgr.status = "RUNNING"
    assert mgr.is_capturing is True

def test_live_capture_status_summary_and_filter():
    import tempfile
    with tempfile.TemporaryDirectory() as tmpdir:
        mgr = LiveCaptureManager(interface="lo0", filter_mode="EMAIL_ONLY", output_dir=tmpdir)
        summary = mgr.get_status_summary()
        assert summary["status"] == "STOPPED"
        assert summary["interface"] == "lo0"
        assert summary["filter_mode"] == "EMAIL_ONLY"
        assert summary["total_live_pcaps"] == 0

        mgr_broad = LiveCaptureManager(interface="en0", filter_mode="BROAD", output_dir=tmpdir)
        summary_broad = mgr_broad.get_status_summary()
        assert summary_broad["filter_mode"] == "BROAD"


def test_tls12_certificate_observed():
    session_data = {
        "uid": "tls12_sess",
        "connection": {"service": "smtp,ssl"},
        "email_protocol": {"protocol": "SMTP", "starttls_attempted": True, "starttls_accepted": True, "tls_established": True},
        "tls": {"version": "TLSv12", "cipher": "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384", "curve": "x25519", "sni_matches_cert": True},
        "certificate": {"subject": "CN=mail.example.local", "issuer": "CN=mail.example.local", "key_length": 2048, "key_algorithm": "rsaEncryption", "signature_algorithm": "sha256WithRSAEncryption"}
    }
    feats = extract_crypto_features(session_data)
    assert feats["certificate_visibility_status"] == "OBSERVED"
    assert feats["certificate_visibility_reason"] == "Certificate fields extracted from X.509 evidence"

def test_tls13_certificate_visibility_limited():
    session_data = {
        "uid": "tls13_sess",
        "connection": {"service": "smtp,ssl"},
        "email_protocol": {"protocol": "SMTP", "starttls_attempted": True, "starttls_accepted": True, "tls_established": True},
        "tls": {"version": "TLSv13", "cipher": "TLS_AES_256_GCM_SHA384", "curve": "x25519", "server_name": "mail.example.local"},
        "certificate": None
    }
    feats = extract_crypto_features(session_data)
    assert feats["certificate_visibility_status"] == "VISIBILITY_LIMITED"
    assert "TLS 1.3" in feats["certificate_visibility_reason"]

    builder = SecurityAssessmentBuilder()
    assessment = builder.build_assessment([{"uid": "tls13_sess"}], [feats], [], RiskEngine().calculate_overall_risk([]))
    cert_trust_ctrl = next(c for c in assessment["controls"] if c["control_id"] == "CTRL_CERT_TRUST")
    assert cert_trust_ctrl["status"] == "VISIBILITY LIMITED"
    assert cert_trust_ctrl["score_contribution"] == 0
    assert len(assessment["violations"]) == 0

def test_tls13_certificate_observed():
    session_data = {
        "uid": "tls13_obs",
        "connection": {"service": "smtp,ssl"},
        "email_protocol": {"protocol": "SMTP", "starttls_attempted": True, "starttls_accepted": True, "tls_established": True},
        "tls": {"version": "TLSv13", "cipher": "TLS_AES_256_GCM_SHA384", "curve": "x25519", "sni_matches_cert": True},
        "certificate": {"subject": "CN=mail.example.local", "issuer": "CN=CA Trust", "key_length": 2048, "key_algorithm": "rsaEncryption", "signature_algorithm": "sha256WithRSAEncryption"}
    }
    feats = extract_crypto_features(session_data)
    assert feats["certificate_visibility_status"] == "OBSERVED"

def test_tls13_weak_cipher_not_suppressed():
    session_data = {
        "uid": "tls13_weak",
        "connection": {"source_ip": "10.0.0.1", "source_port": 1000, "destination_ip": "10.0.0.2", "destination_port": 25},
        "tls": {"version": "TLSv13", "cipher": "TLS_RSA_WITH_RC4_128_SHA"}
    }
    feats = extract_crypto_features(session_data)
    assert feats["certificate_visibility_status"] == "VISIBILITY_LIMITED"
    engine = SecurityRuleEngine()
    findings = engine.evaluate_session(session_data, feats)
    assert any(f["rule_id"] == "TLS_WEAK_CIPHER" for f in findings)

def test_tls13_keylog_decryption_module_valid():
    from tls_keylog_decryptor import decrypt_tls13_pcap_certificates
    pcap = "part1/test_fixtures/tls13_keylog_real.pcap"
    keylog = "part1/test_fixtures/tls13_keylog_real.txt"
    res = decrypt_tls13_pcap_certificates(pcap, keylog)
    assert res["success"] is True
    assert res["decryption_status"] == "DECRYPTED"
    assert len(res["certificates"]) >= 1
    assert "mail.example.local" in res["certificates"][0]["subject"]

def test_tls13_keylog_decryption_module_missing_file():
    from tls_keylog_decryptor import decrypt_tls13_pcap_certificates
    pcap = "part1/test_fixtures/tls13_keylog_real.pcap"
    res = decrypt_tls13_pcap_certificates(pcap, "non_existent_keylog.txt")
    assert res["success"] is False
    assert res["decryption_status"] == "KEYLOG_NOT_FOUND"
    assert res["certificates"] == []

def test_pipeline_tls13_keylog_decryption_integration():
    from forensic_pipeline import analyze_pcap_files
    pcap = Path("part1/test_fixtures/tls13_keylog_real.pcap")
    keylog = Path("part1/test_fixtures/tls13_keylog_real.txt")
    zeek_dir = Path("part1/output/test_zeek_tls13")
    
    report = analyze_pcap_files([pcap], zeek_dir, tls_keylog=str(keylog))
    assert report["report_metadata"]["tls_keylog_supplied"] is True
    assert report["report_metadata"]["tls_keylog_decryption_status"] == "DECRYPTED"
    assert len(report["certificates"]) >= 1
    assert report["cryptographic_features"][0]["certificate_visibility_status"] == "OBSERVED"



