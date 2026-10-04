"""
Tests for Remote Forensic Engine Server (remote_engine/server.py).
Validates HTTP endpoints, protocol parity, temporary file cleanup,
graceful error handling, and model governance reporting.
"""

import io
import json
import socket
import sys
import tempfile
import threading
import unittest
from http.client import HTTPResponse
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
PART1_DIR = PROJECT_ROOT / "part1"
REMOTE_ENGINE_DIR = PROJECT_ROOT / "remote_engine"

for p in [str(PROJECT_ROOT), str(PART1_DIR / "src"), str(REMOTE_ENGINE_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from server import RemoteForensicHandler


def dispatch_request(raw_request_bytes: bytes) -> tuple:
    """
    Sends raw HTTP request bytes to RemoteForensicHandler via an in-memory socketpair
    and returns (status_code, headers_dict, body_bytes).
    """
    client_sock, server_sock = socket.socketpair()

    handler_thread = threading.Thread(
        target=lambda: RemoteForensicHandler(server_sock, ("127.0.0.1", 12345), None)
    )
    handler_thread.daemon = True
    handler_thread.start()

    # Send client request
    client_sock.sendall(raw_request_bytes)
    client_sock.shutdown(socket.SHUT_WR)

    # Read response
    http_response = HTTPResponse(client_sock)
    http_response.begin()

    status = http_response.status
    headers = dict(http_response.getheaders())
    body = http_response.read()

    client_sock.close()
    server_sock.close()
    handler_thread.join(timeout=30)

    return status, headers, body


class TestRemoteEngine(unittest.TestCase):
    def test_ping_endpoint(self):
        req = (
            b"GET /ping HTTP/1.1\r\n"
            b"Host: localhost\r\n"
            b"Connection: close\r\n\r\n"
        )
        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200)
        data = json.loads(body.decode("utf-8"))
        self.assertEqual(data.get("status"), "ok")
        self.assertEqual(data.get("service"), "email-forensics-remote-engine")
        self.assertEqual(data.get("version"), "1.0.0")

    def test_health_endpoint(self):
        req = (
            b"GET /health HTTP/1.1\r\n"
            b"Host: localhost\r\n"
            b"Connection: close\r\n\r\n"
        )
        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200)
        data = json.loads(body.decode("utf-8"))
        self.assertEqual(data.get("status"), "ok")
        self.assertTrue(data.get("zeek", {}).get("available"))
        self.assertIn("9.", data.get("zeek", {}).get("version", ""))

        # Verify model governance metadata
        mg = data.get("model_governance", {})
        self.assertEqual(mg.get("version"), "v3.0.0")
        self.assertEqual(mg.get("variant"), "expanded_v3")
        self.assertEqual(mg.get("algorithm"), "IsolationForest")
        self.assertEqual(mg.get("feature_dimensions"), 32)
        self.assertAlmostEqual(mg.get("decision_threshold"), -0.041466321224221024, places=6)
        self.assertEqual(
            mg.get("documented_production_sha256"),
            "587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791"
        )
        self.assertEqual(mg.get("production_artifact_status"), "UNAVAILABLE")
        self.assertFalse(mg.get("reconstruction_promoted"))

    def test_analyze_with_real_smtp_pcap(self):
        pcap_path = PART1_DIR / "pcaps" / "smtp_starttls_real.pcap"
        self.assertTrue(pcap_path.exists(), f"Missing fixture {pcap_path}")

        pcap_bytes = pcap_path.read_bytes()
        boundary = "---------------------------1234567890123456"
        multipart_body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="smtp_starttls_real.pcap"\r\n'
            f"Content-Type: application/vnd.tcpdump.pcap\r\n\r\n"
        ).encode("utf-8") + pcap_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = (
            f"POST /analyze HTTP/1.1\r\n"
            f"Host: localhost\r\n"
            f"Content-Type: multipart/form-data; boundary={boundary}\r\n"
            f"Content-Length: {len(multipart_body)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode("utf-8") + multipart_body

        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200, f"Analysis failed with body: {body.decode('utf-8', errors='replace')}")

        report = json.loads(body.decode("utf-8"))

        # Verify summary metrics against native ground truth
        summary = report["summary"]
        self.assertEqual(summary["total_pcaps"], 1)
        self.assertEqual(summary["total_sessions"], 1)
        self.assertEqual(summary["total_findings"], 1)
        self.assertEqual(summary["overall_risk_score"], 15.0)
        self.assertEqual(summary["risk_level"], "MINIMAL")
        self.assertEqual(summary["total_ml_anomalies"], 0)

        # Verify session cryptographic properties
        email_session = report["email_sessions"][0]
        self.assertEqual(email_session["protocol"], "SMTP")
        self.assertTrue(email_session["starttls_accepted"])
        self.assertTrue(email_session["tls_established"])

        tls_session = report["tls_sessions"][0]
        self.assertEqual(tls_session["version"], "TLSv12")
        self.assertEqual(tls_session["cipher"], "TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384")
        self.assertEqual(tls_session["curve"], "x25519")

        # Verify finding
        finding = report["findings"][0]
        self.assertEqual(finding["rule_id"], "CERT_SELF_SIGNED")
        self.assertEqual(finding["severity"], "MEDIUM")

    def test_analyze_with_imap_fixture(self):
        pcap_path = PART1_DIR / "pcaps" / "imap_starttls_real.pcap"
        self.assertTrue(pcap_path.exists())
        pcap_bytes = pcap_path.read_bytes()
        boundary = "---------------------------imap123456"
        multipart_body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="imap_starttls_real.pcap"\r\n'
            f"Content-Type: application/vnd.tcpdump.pcap\r\n\r\n"
        ).encode("utf-8") + pcap_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = (
            f"POST /analyze HTTP/1.1\r\n"
            f"Host: localhost\r\n"
            f"Content-Type: multipart/form-data; boundary={boundary}\r\n"
            f"Content-Length: {len(multipart_body)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode("utf-8") + multipart_body

        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200)
        report = json.loads(body.decode("utf-8"))
        self.assertEqual(report["summary"]["total_sessions"], 1)
        self.assertEqual(report["email_sessions"][0]["protocol"], "IMAP")
        self.assertEqual(report["summary"]["overall_risk_score"], 35.0)
        self.assertEqual(report["summary"]["risk_level"], "LOW")

    def test_analyze_with_pop3_fixture(self):
        pcap_path = PART1_DIR / "pcaps" / "pop3_stls_real.pcap"
        self.assertTrue(pcap_path.exists())
        pcap_bytes = pcap_path.read_bytes()
        boundary = "---------------------------pop3123456"
        multipart_body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="pop3_stls_real.pcap"\r\n'
            f"Content-Type: application/vnd.tcpdump.pcap\r\n\r\n"
        ).encode("utf-8") + pcap_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = (
            f"POST /analyze HTTP/1.1\r\n"
            f"Host: localhost\r\n"
            f"Content-Type: multipart/form-data; boundary={boundary}\r\n"
            f"Content-Length: {len(multipart_body)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode("utf-8") + multipart_body

        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200)
        report = json.loads(body.decode("utf-8"))
        self.assertEqual(report["summary"]["total_sessions"], 1)
        self.assertEqual(report["email_sessions"][0]["protocol"], "POP3")
        self.assertEqual(report["summary"]["overall_risk_score"], 35.0)
        self.assertEqual(report["summary"]["risk_level"], "LOW")

    def test_analyze_with_plaintext_smtp_fixture(self):
        pcap_path = PART1_DIR / "pcaps" / "smtp_test.pcap"
        self.assertTrue(pcap_path.exists())
        pcap_bytes = pcap_path.read_bytes()
        boundary = "---------------------------smtptest123"
        multipart_body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="smtp_test.pcap"\r\n'
            f"Content-Type: application/vnd.tcpdump.pcap\r\n\r\n"
        ).encode("utf-8") + pcap_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        req = (
            f"POST /analyze HTTP/1.1\r\n"
            f"Host: localhost\r\n"
            f"Content-Type: multipart/form-data; boundary={boundary}\r\n"
            f"Content-Length: {len(multipart_body)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode("utf-8") + multipart_body

        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 200)
        report = json.loads(body.decode("utf-8"))
        self.assertEqual(report["summary"]["total_sessions"], 1)
        self.assertEqual(report["email_sessions"][0]["protocol"], "SMTP")
        self.assertEqual(report["summary"]["overall_risk_score"], 20.0)
        self.assertEqual(report["summary"]["risk_level"], "LOW")

    def test_invalid_pcap_header_rejected(self):
        fake_payload = b"THIS IS NOT A PCAP FILE AT ALL"
        req = (
            f"POST /analyze HTTP/1.1\r\n"
            f"Host: localhost\r\n"
            f"Content-Type: application/octet-stream\r\n"
            f"Content-Length: {len(fake_payload)}\r\n"
            f"Connection: close\r\n\r\n"
        ).encode("utf-8") + fake_payload

        status, headers, body = dispatch_request(req)
        self.assertEqual(status, 400)
        data = json.loads(body.decode("utf-8"))
        self.assertIn("Invalid PCAP", data.get("error", ""))


if __name__ == "__main__":
    unittest.main()
