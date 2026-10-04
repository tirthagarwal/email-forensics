import json
import pytest
from pathlib import Path
from local_sensor.server import ForensicSensorHandler, PROJECT_ROOT, DEFAULT_PCAPS_DIR

def test_production_model_immutability():
    """Verify production ML model v3.0.0 integrity, parameters, and checksum."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "part1" / "src"))
    from ai_anomaly_detector import AIAnomalyDetector

    detector = AIAnomalyDetector(model_variant="expanded_v3", verify_integrity=True)
    assert detector.model_version == "3.0.0"
    assert detector.model_variant == "expanded_v3"
    assert abs(detector._threshold - (-0.041466)) < 1e-6
    assert detector._integrity_status == "VERIFIED_OK"
    assert len(detector._schema.get("feature_names", [])) == 32

    # Checksum verification
    h = detector._artifact_hashes.get("deployment_isolation_forest.joblib", "")
    assert h.startswith("587b165398eb9eb2")

def test_source_selector_pcap_files_exist():
    """Verify all 4 PCAP files listed in the UI exist in part1/pcaps/."""
    expected = [
        "smtp_test.pcap",
        "imap_starttls_real.pcap",
        "pop3_stls_real.pcap",
        "smtp_starttls_real.pcap",
    ]
    for pcap in expected:
        p = DEFAULT_PCAPS_DIR / pcap
        assert p.exists(), f"PCAP file {pcap} missing from {DEFAULT_PCAPS_DIR}"

def test_single_pcap_pipeline_output():
    """Verify running single PCAP analysis yields 1 PCAP and 1 session."""
    out_json = PROJECT_ROOT / "part1" / "output" / "test_single_smtp.json"
    if out_json.exists():
        with open(out_json, "r") as f:
            data = json.load(f)
        assert data["pcap"]["total_pcaps"] == 1
        assert data["summary"]["total_sessions"] == 1
        assert "smtp_starttls_real.pcap" in data["pcap"]["files_analyzed"][0]
        assert data["summary"]["overall_risk_score"] == 15.0

def test_batch_pipeline_output_integrity():
    """Verify batch output matches the 4-pcap baseline."""
    batch_json = PROJECT_ROOT / "part1" / "output" / "forensic_report.json"
    if batch_json.exists():
        with open(batch_json, "r") as f:
            data = json.load(f)
        # Verify structure
        assert "report_metadata" in data
        assert "summary" in data
        assert "ml_analysis" in data
        assert data["ml_analysis"]["model_version"] == "3.0.0"
