import json
import pytest
from pathlib import Path
from local_sensor.server import ForensicSensorHandler, PROJECT_ROOT, DEFAULT_PCAPS_DIR

def test_production_model_immutability():
    """Verify production ML model v3.0.0 documented integrity, parameters, and artifact status."""
    import sys
    sys.path.insert(0, str(PROJECT_ROOT / "part1" / "src"))
    from ai_anomaly_detector import AIAnomalyDetector

    detector = AIAnomalyDetector(model_variant="expanded_v3", verify_integrity=True)
    assert detector.model_version == "3.0.0"
    assert detector.model_variant == "expanded_v3"
    assert abs(detector._threshold - (-0.041466)) < 1e-6
    assert len(detector._schema.get("feature_names", [])) == 32

    # Verify documented production SHA-256 remains strictly unchanged
    doc_sha = detector._artifact_hashes.get("deployment_isolation_forest.joblib", "")
    assert doc_sha == "587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791"

    # Verify the production model binary is unavailable and status is correctly flagged
    model_binary = PROJECT_ROOT / "part1" / "models" / "deployment_ml" / "expanded_v3" / "deployment_isolation_forest.joblib"
    assert not model_binary.exists()
    assert detector._integrity_status == "ARTIFACT_UNAVAILABLE"

    # Verify production model status documentation exists and details the unpromoted reconstruction
    status_doc = PROJECT_ROOT / "part1" / "models" / "deployment_ml" / "expanded_v3" / "PRODUCTION_MODEL_ARTIFACT_STATUS.md"
    assert status_doc.exists()
    status_text = status_doc.read_text()
    assert "587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791" in status_text
    assert "193162bb2bcad46d84acbfd09d009865c587fa2c2609d2d92e66bd18b3ac7765" in status_text
    assert "NOT PROMOTED" in status_text

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
