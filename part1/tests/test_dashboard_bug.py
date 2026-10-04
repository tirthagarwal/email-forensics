"""
test_dashboard_bug.py
=====================
Regression tests for the dashboard data-flow / scope bug:

    BUG: When the user ran a single-PCAP analysis from the dashboard,
    the security_assessment controls (TLS Version, Cipher Suite, PFS,
    Curve, Certificates) showed NOT OBSERVED even though the full
    4-PCAP forensic_report.json had those controls passing.

    ROOT CAUSE: The forensic_report.json was overwritten with a
    single-session report; the dashboard reads sec_assessment directly
    from that stored JSON. No bug in SecurityAssessmentBuilder itself.

TESTS VERIFY:
  1. Multi-PCAP input aggregates TLS/non-TLS sessions correctly.
  2. TLS controls are marked OBSERVED (PASS) if any session has TLS.
  3. Cleartext controls count all applicable sessions.
  4. Single-PCAP scope (smtp_test.pcap) is accurately NOT OBSERVED for TLS.
  5. has_tls13_lim derivation logic is correct.
  6. Analysis scope metadata field is set correctly.
"""
import sys
import os
import json
import pytest
from pathlib import Path

# Ensure the src directory is on sys.path for direct imports
SRC_DIR = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(SRC_DIR))

from security_assessment import SecurityAssessmentBuilder
from risk_engine import RiskEngine


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def _make_session(uid, protocol="SMTP", tls_version=None, cipher_suite=None,
                  forward_secrecy=False, curve=None, has_starttls=True):
    """Minimal feature dict mimicking cryptographic_features entries."""
    return {
        "uid": uid,
        "protocol": protocol,
        "tls_version": tls_version,
        "cipher_suite": cipher_suite,
        "forward_secrecy_indicator": forward_secrecy,
        "elliptic_curve": curve,
        "starttls_accepted": has_starttls,
        "certificate_key_size": None,
        "certificate_signature_algorithm": None,
        "certificate_self_signed": None,
        "certificate_days_remaining": None,
        "certificate_public_key_algorithm": None,
        "certificate_hostname_match": None,
        "certificate_visibility_status": None,
    }


def _make_finding(rule_id, uid, protocol="SMTP", severity="HIGH"):
    return {
        "rule_id": rule_id,
        "affected_connection": uid,
        "affected_protocol": protocol,
        "severity": severity,
        "title": f"Test finding {rule_id}",
        "evidence": f"Evidence for {rule_id}",
    }


def _build_assessment(features_list, findings):
    """Shortcut: build a security assessment and return its controls as a dict keyed by control_id."""
    builder = SecurityAssessmentBuilder()
    risk_engine = RiskEngine()
    session_risks = [risk_engine.calculate_session_risk(
        [f for f in findings if f.get("affected_connection") == feat.get("uid")]
    ) for feat in features_list]
    overall = risk_engine.calculate_overall_risk(session_risks)
    result = builder.build_assessment(features_list, features_list, findings, overall)
    return {c["control_id"]: c for c in result["controls"]}


# ─────────────────────────────────────────────────────────────────────────────
# TEST 1: Multi-PCAP — TLS observed in at least one session → PASS controls
# ─────────────────────────────────────────────────────────────────────────────
class TestMultiPcapTLSAggregation:
    """
    Simulate 4 sessions:
      - smtp_test   : SMTP cleartext, no TLS
      - imap_tls    : IMAP TLSv12, strong cipher, ECDHE, curve x25519
      - pop3_tls    : POP3 TLSv12, strong cipher, ECDHE, curve x25519
      - smtp_tls    : SMTP TLSv12 (STARTTLS), strong cipher, ECDHE, curve x25519
    """

    @pytest.fixture
    def multi_pcap_data(self):
        features = [
            _make_session("smtp_uid",  "SMTP", tls_version=None,    has_starttls=False),
            _make_session("imap_uid",  "IMAP", tls_version="TLSv12",
                          cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                          forward_secrecy=True, curve="x25519"),
            _make_session("pop3_uid",  "POP3", tls_version="TLSv12",
                          cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                          forward_secrecy=True, curve="x25519"),
            _make_session("smtp_tls_uid", "SMTP", tls_version="TLSv12",
                          cipher_suite="TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384",
                          forward_secrecy=True, curve="x25519"),
        ]
        findings = [
            _make_finding("SMTP_NO_STARTTLS", "smtp_uid", "SMTP", "HIGH"),
        ]
        return features, findings

    def test_tls_version_observed_in_multi_pcap(self, multi_pcap_data):
        """CTRL_TLS_VERSION should be PASS when any session has TLS."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_TLS_VERSION"]
        assert ctrl["status"] == "PASS", (
            f"Expected PASS but got {ctrl['status']}: {ctrl['observed']}"
        )
        assert "TLSv12" in ctrl["observed"] or "TLS" in ctrl["observed"]

    def test_cipher_suite_observed_in_multi_pcap(self, multi_pcap_data):
        """CTRL_CIPHER_SUITE should be PASS when any session has a cipher suite."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_CIPHER_SUITE"]
        assert ctrl["status"] == "PASS", (
            f"Expected PASS but got {ctrl['status']}: {ctrl['observed']}"
        )

    def test_forward_secrecy_observed_in_multi_pcap(self, multi_pcap_data):
        """CTRL_FORWARD_SECRECY should be PASS when TLS sessions have ECDHE."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_FORWARD_SECRECY"]
        assert ctrl["status"] == "PASS", (
            f"Expected PASS but got {ctrl['status']}: {ctrl['observed']}"
        )

    def test_elliptic_curve_observed_in_multi_pcap(self, multi_pcap_data):
        """CTRL_ELLIPTIC_CURVE should be PASS with curve x25519."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_ELLIPTIC_CURVE"]
        assert ctrl["status"] == "PASS", (
            f"Expected PASS but got {ctrl['status']}: {ctrl['observed']}"
        )
        assert "x25519" in ctrl["observed"]

    def test_cleartext_violation_counted_in_multi_pcap(self, multi_pcap_data):
        """CTRL_STARTTLS should be VIOLATION with 1 cleartext session."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_STARTTLS"]
        assert ctrl["status"] == "VIOLATION"
        assert "1 session" in ctrl["observed"]

    def test_protocols_all_detected(self, multi_pcap_data):
        """CTRL_EMAIL_PROTOCOL observed value must include all three protocols."""
        features, findings = multi_pcap_data
        controls = _build_assessment(features, findings)
        ctrl = controls["CTRL_EMAIL_PROTOCOL"]
        assert ctrl["status"] == "PASS"
        assert "SMTP" in ctrl["observed"]
        assert "IMAP" in ctrl["observed"]
        assert "POP3" in ctrl["observed"]


# ─────────────────────────────────────────────────────────────────────────────
# TEST 2: Single-PCAP (smtp_test.pcap only) — TLS NOT OBSERVED is correct
# ─────────────────────────────────────────────────────────────────────────────
class TestSinglePcapSmtpOnlyScope:
    """When only smtp_test.pcap (cleartext SMTP) is analyzed, TLS controls
    should legitimately report NOT OBSERVED. This is not a bug — it is
    correct behaviour for a single cleartext-SMTP-only capture."""

    @pytest.fixture
    def smtp_only_data(self):
        features = [
            _make_session("smtp_uid", "SMTP", tls_version=None, has_starttls=False),
        ]
        findings = [
            _make_finding("SMTP_NO_STARTTLS", "smtp_uid", "SMTP", "HIGH"),
        ]
        return features, findings

    def test_tls_not_observed_single_smtp_pcap(self, smtp_only_data):
        """TLS controls correctly show NOT OBSERVED for smtp_test.pcap only."""
        features, findings = smtp_only_data
        controls = _build_assessment(features, findings)
        assert controls["CTRL_TLS_VERSION"]["status"] == "NOT OBSERVED"
        assert controls["CTRL_CIPHER_SUITE"]["status"] == "NOT OBSERVED"
        assert controls["CTRL_FORWARD_SECRECY"]["status"] == "NOT OBSERVED"
        assert controls["CTRL_ELLIPTIC_CURVE"]["status"] == "NOT OBSERVED"

    def test_starttls_violation_single_smtp_pcap(self, smtp_only_data):
        """CTRL_STARTTLS is a VIOLATION for the smtp_test.pcap single-PCAP view."""
        features, findings = smtp_only_data
        controls = _build_assessment(features, findings)
        assert controls["CTRL_STARTTLS"]["status"] == "VIOLATION"


# ─────────────────────────────────────────────────────────────────────────────
# TEST 3: has_tls13_lim derivation logic
# ─────────────────────────────────────────────────────────────────────────────
class TestHasTls13LimDerivation:
    """Tests the has_tls13_lim logic that was previously undefined (causing
    a NameError on line 566 of the old dashboard.py)."""

    def _derive_has_tls13_lim(self, crypto_feats):
        """Replicate the exact logic now used in dashboard.py lines 302-316."""
        return any(
            f.get("certificate_visibility_status") == "VISIBILITY_LIMITED" or
            (f.get("tls_version") in ("TLSv13", "TLSv1.3") and not any(
                f.get(k) is not None for k in (
                    "certificate_key_size", "certificate_signature_algorithm",
                    "certificate_self_signed", "certificate_days_remaining",
                    "certificate_public_key_algorithm",
                )
            ))
            for f in crypto_feats
        )

    def test_false_for_tls12_sessions(self):
        """TLS 1.2 sessions should NOT trigger has_tls13_lim."""
        feats = [
            {"tls_version": "TLSv12", "certificate_key_size": 2048,
             "certificate_signature_algorithm": "sha256WithRSAEncryption",
             "certificate_self_signed": False, "certificate_days_remaining": 364,
             "certificate_public_key_algorithm": "RSAEncryption",
             "certificate_visibility_status": None},
        ]
        assert self._derive_has_tls13_lim(feats) is False

    def test_false_for_cleartext_sessions(self):
        """Cleartext sessions (no TLS) should NOT trigger has_tls13_lim."""
        feats = [
            {"tls_version": None, "certificate_visibility_status": None},
        ]
        assert self._derive_has_tls13_lim(feats) is False

    def test_true_for_visibility_limited_status(self):
        """VISIBILITY_LIMITED flag should trigger has_tls13_lim."""
        feats = [
            {"tls_version": "TLSv13", "certificate_visibility_status": "VISIBILITY_LIMITED"},
        ]
        assert self._derive_has_tls13_lim(feats) is True

    def test_true_for_tls13_without_cert_fields(self):
        """TLS 1.3 session with no cert fields should trigger has_tls13_lim."""
        feats = [
            {"tls_version": "TLSv13", "certificate_visibility_status": None,
             "certificate_key_size": None, "certificate_signature_algorithm": None,
             "certificate_self_signed": None, "certificate_days_remaining": None,
             "certificate_public_key_algorithm": None},
        ]
        assert self._derive_has_tls13_lim(feats) is True

    def test_false_for_tls13_with_cert_fields_present(self):
        """TLS 1.3 with cert fields (e.g., from keylog decryption) should be False."""
        feats = [
            {"tls_version": "TLSv13", "certificate_visibility_status": None,
             "certificate_key_size": 2048, "certificate_signature_algorithm": "sha256",
             "certificate_self_signed": False, "certificate_days_remaining": 300,
             "certificate_public_key_algorithm": "RSA"},
        ]
        assert self._derive_has_tls13_lim(feats) is False

    def test_mixed_tls12_and_tls13_no_certs_triggers_limit(self):
        """If any session triggers visibility limit, the overall flag is True."""
        feats = [
            {"tls_version": "TLSv12", "certificate_key_size": 2048,
             "certificate_signature_algorithm": "sha256", "certificate_self_signed": False,
             "certificate_days_remaining": 300, "certificate_public_key_algorithm": "RSA",
             "certificate_visibility_status": None},
            {"tls_version": "TLSv13", "certificate_visibility_status": None,
             "certificate_key_size": None, "certificate_signature_algorithm": None,
             "certificate_self_signed": None, "certificate_days_remaining": None,
             "certificate_public_key_algorithm": None},
        ]
        assert self._derive_has_tls13_lim(feats) is True


# ─────────────────────────────────────────────────────────────────────────────
# TEST 4: Analysis scope metadata — analysis_scope field
# ─────────────────────────────────────────────────────────────────────────────
class TestAnalysisScopeMetadata:
    """Verifies the analysis_scope field logic (mirrors dashboard.py meta dict)."""

    def _build_meta(self, n_pcaps):
        return {
            "total_pcaps": n_pcaps,
            "analysis_scope": "MULTI_PCAP" if n_pcaps > 1 else "SINGLE_PCAP",
        }

    def test_single_pcap_scope_label(self):
        meta = self._build_meta(1)
        assert meta["analysis_scope"] == "SINGLE_PCAP"

    def test_multi_pcap_scope_label(self):
        meta = self._build_meta(4)
        assert meta["analysis_scope"] == "MULTI_PCAP"

    def test_two_pcap_scope_is_multi(self):
        meta = self._build_meta(2)
        assert meta["analysis_scope"] == "MULTI_PCAP"


# ─────────────────────────────────────────────────────────────────────────────
# TEST 5: Integration — verify live forensic_report.json is 4-PCAP scope
# ─────────────────────────────────────────────────────────────────────────────
class TestLiveReportIntegrity:
    """Reads the actual forensic_report.json to confirm it was generated from
    all 4 PCAPs and that Security Assessment controls show correct values."""

    REPORT_PATH = Path(__file__).parent.parent / "output" / "forensic_report.json"

    @pytest.fixture
    def live_report(self):
        if not self.REPORT_PATH.exists():
            pytest.skip("forensic_report.json not found — run pipeline first.")
        with open(self.REPORT_PATH) as f:
            return json.load(f)

    def test_report_covers_all_4_pcaps(self, live_report):
        total = live_report.get("summary", {}).get("total_pcaps", 0)
        assert total == 4, f"Expected 4 PCAPs in report, got {total}"

    def test_report_covers_4_sessions(self, live_report):
        total = live_report.get("summary", {}).get("total_sessions", 0)
        assert total == 4, f"Expected 4 sessions, got {total}"

    def test_tls_version_control_is_pass(self, live_report):
        sa = live_report.get("security_assessment", {})
        ctrls = {c["control_id"]: c for c in sa.get("controls", [])}
        ctrl = ctrls.get("CTRL_TLS_VERSION", {})
        assert ctrl.get("status") == "PASS", (
            f"CTRL_TLS_VERSION should be PASS for 4-PCAP run, got: {ctrl.get('status')}: {ctrl.get('observed')}"
        )

    def test_cipher_suite_control_is_pass(self, live_report):
        sa = live_report.get("security_assessment", {})
        ctrls = {c["control_id"]: c for c in sa.get("controls", [])}
        ctrl = ctrls.get("CTRL_CIPHER_SUITE", {})
        assert ctrl.get("status") == "PASS", (
            f"CTRL_CIPHER_SUITE should be PASS for 4-PCAP run, got: {ctrl.get('status')}"
        )

    def test_forward_secrecy_control_is_pass(self, live_report):
        sa = live_report.get("security_assessment", {})
        ctrls = {c["control_id"]: c for c in sa.get("controls", [])}
        ctrl = ctrls.get("CTRL_FORWARD_SECRECY", {})
        assert ctrl.get("status") == "PASS", (
            f"CTRL_FORWARD_SECRECY should be PASS for 4-PCAP run, got: {ctrl.get('status')}"
        )

    def test_starttls_violation_exists(self, live_report):
        sa = live_report.get("security_assessment", {})
        ctrls = {c["control_id"]: c for c in sa.get("controls", [])}
        ctrl = ctrls.get("CTRL_STARTTLS", {})
        assert ctrl.get("status") == "VIOLATION", (
            f"CTRL_STARTTLS should be VIOLATION (smtp_test.pcap), got: {ctrl.get('status')}"
        )

    def test_overall_risk_score_is_32_38(self, live_report):
        score = live_report.get("summary", {}).get("overall_risk_score", 0)
        assert abs(score - 32.38) < 0.1, f"Expected risk score ~32.38, got {score}"


# ─────────────────────────────────────────────────────────────────────────────
# TEST 6: Scope Transition — Multi-PCAP -> Single-PCAP -> Multi-PCAP
# ─────────────────────────────────────────────────────────────────────────────
class TestDashboardScopeTransition:
    """Tests that the dashboard loader correctly reflects scope transitions:
    Multi-PCAP (all controls observed) -> Single-PCAP (TLS not observed) -> Multi-PCAP."""

    def test_scope_transition_multi_to_single_to_multi(self, tmp_path):
        from dashboard import load_report_from_disk
        from forensic_pipeline import analyze_pcap_files

        pcap_dir = Path(__file__).parent.parent / "pcaps"
        all_pcaps = sorted(list(pcap_dir.glob("*.pcap")))
        smtp_single = [pcap_dir / "smtp_test.pcap"]
        report_file = tmp_path / "forensic_report.json"

        # 1. Multi-PCAP Run
        multi_report = analyze_pcap_files(all_pcaps, tmp_path / "zeek_multi")
        with open(report_file, "w") as f:
            json.dump(multi_report, f)

        loaded_report, loaded_meta = load_report_from_disk(report_file)
        assert loaded_meta["analysis_scope"] == "MULTI_PCAP"
        assert loaded_meta["total_pcaps"] == 4
        assert loaded_meta["total_sessions"] == 4

        ctrls_multi = {c["control_id"]: c for c in loaded_report["security_assessment"]["controls"]}
        assert ctrls_multi["CTRL_TLS_VERSION"]["status"] == "PASS"
        assert ctrls_multi["CTRL_CIPHER_SUITE"]["status"] == "PASS"
        assert ctrls_multi["CTRL_FORWARD_SECRECY"]["status"] == "PASS"
        assert ctrls_multi["CTRL_ELLIPTIC_CURVE"]["status"] == "PASS"
        assert ctrls_multi["CTRL_CERT_TRUST"]["status"] in ("PASS", "WARNING")
        assert ctrls_multi["CTRL_STARTTLS"]["status"] == "VIOLATION"

        # 2. Single-PCAP Run (smtp_test.pcap)
        single_report = analyze_pcap_files(smtp_single, tmp_path / "zeek_single")
        with open(report_file, "w") as f:
            json.dump(single_report, f)

        loaded_single_report, loaded_single_meta = load_report_from_disk(report_file)
        assert loaded_single_meta["analysis_scope"] == "SINGLE_PCAP"
        assert loaded_single_meta["total_pcaps"] == 1
        assert loaded_single_meta["total_sessions"] == 1

        ctrls_single = {c["control_id"]: c for c in loaded_single_report["security_assessment"]["controls"]}
        assert ctrls_single["CTRL_TLS_VERSION"]["status"] == "NOT OBSERVED"
        assert ctrls_single["CTRL_CIPHER_SUITE"]["status"] == "NOT OBSERVED"
        assert ctrls_single["CTRL_FORWARD_SECRECY"]["status"] == "NOT OBSERVED"
        assert ctrls_single["CTRL_ELLIPTIC_CURVE"]["status"] == "NOT OBSERVED"
        assert ctrls_single["CTRL_CERT_TRUST"]["status"] == "NOT OBSERVED"
        assert ctrls_single["CTRL_STARTTLS"]["status"] == "VIOLATION"

        # 3. Switch back to Multi-PCAP
        with open(report_file, "w") as f:
            json.dump(multi_report, f)

        reloaded_multi_report, reloaded_multi_meta = load_report_from_disk(report_file)
        assert reloaded_multi_meta["analysis_scope"] == "MULTI_PCAP"
        assert reloaded_multi_meta["total_pcaps"] == 4

        ctrls_reloaded = {c["control_id"]: c for c in reloaded_multi_report["security_assessment"]["controls"]}
        assert ctrls_reloaded["CTRL_TLS_VERSION"]["status"] == "PASS"
        assert ctrls_reloaded["CTRL_CIPHER_SUITE"]["status"] == "PASS"
        assert ctrls_reloaded["CTRL_FORWARD_SECRECY"]["status"] == "PASS"
        assert ctrls_reloaded["CTRL_ELLIPTIC_CURVE"]["status"] == "PASS"
        assert ctrls_reloaded["CTRL_STARTTLS"]["status"] == "VIOLATION"

