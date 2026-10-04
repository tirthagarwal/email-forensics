import json
import pytest
import tempfile
from pathlib import Path
from local_sensor.server import ForensicSensorHandler

def test_sensor_imports_and_constants():
    from local_sensor.server import PORT, PIPELINE_SCRIPT, DEFAULT_PCAPS_DIR
    assert PORT == 5001
    assert PIPELINE_SCRIPT.exists()
    assert DEFAULT_PCAPS_DIR.exists()

def test_sensor_handler_cors():
    # Verify handler defines CORS methods
    assert hasattr(ForensicSensorHandler, "_send_cors_headers")
    assert hasattr(ForensicSensorHandler, "do_OPTIONS")
    assert hasattr(ForensicSensorHandler, "do_GET")
    assert hasattr(ForensicSensorHandler, "do_POST")
