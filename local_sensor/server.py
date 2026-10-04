#!/usr/bin/env python3
"""
Local Forensic Sensor HTTP Server.
Provides local API endpoints for the web dashboard to invoke the forensic pipeline
and manage passive live packet captures.

Endpoints:
- GET  /ping            Health check / connectivity verification
- POST /analyze         Run pipeline on single PCAP, batch directory, or uploaded file
- POST /capture/start   Start passive live capture with specified interface and BPF
- POST /capture/stop    Stop active capture
"""

import json
import os
import shutil
import subprocess
import sys
import tempfile
from http.server import HTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Ensure project root is on sys.path
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

PORT = 5001
PYTHON_BIN = sys.executable
PIPELINE_SCRIPT = PROJECT_ROOT / "part1" / "src" / "forensic_pipeline.py"
DEFAULT_PCAPS_DIR = PROJECT_ROOT / "part1" / "pcaps"
OUTPUT_REPORT = PROJECT_ROOT / "part1" / "output" / "forensic_report.json"
SENSOR_REPORT = PROJECT_ROOT / "part1" / "output" / "sensor_analysis_report.json"

# Track live capture process
_live_process = None


class ForensicSensorHandler(BaseHTTPRequestHandler):
    def _send_cors_headers(self):
        origin = self.headers.get("Origin")
        if origin:
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        else:
            self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        req_headers = self.headers.get("Access-Control-Request-Headers", "Content-Type, Authorization, X-Requested-With, Accept, Access-Control-Request-Private-Network")
        self.send_header("Access-Control-Allow-Headers", req_headers)
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def do_GET(self):
        path_clean = self.path.split("?")[0]
        if path_clean == "/ping":
            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            response = {
                "status": "ok",
                "service": "email-forensics-sensor",
                "version": "3.0.0",
                "python": sys.version.split()[0],
            }
            self.wfile.write(json.dumps(response).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def do_POST(self):
        global _live_process

        path_clean = self.path.split("?")[0]
        if path_clean == "/ping":
            self.do_GET()
            return

        if path_clean == "/analyze":
            content_type = self.headers.get("Content-Type", "")
            target_pcap = None
            input_dir = None

            length = int(self.headers.get("Content-Length", 0))
            body_bytes = self.rfile.read(length) if length > 0 else b""

            if "multipart/form-data" in content_type:
                # Handle uploaded file
                temp_dir = tempfile.mkdtemp(prefix="forensic_upload_")
                temp_file = Path(temp_dir) / "uploaded.pcap"
                # Extract boundary
                boundary = None
                for part in content_type.split(";"):
                    part = part.strip()
                    if part.startswith("boundary="):
                        boundary = part.split("=", 1)[1].strip('"').encode("utf-8")
                        break

                if boundary:
                    # Parse multipart body
                    delimiter = b"--" + boundary
                    sections = body_bytes.split(delimiter)
                    for sec in sections:
                        if b'filename=' in sec and b'\r\n\r\n' in sec:
                            head, file_data = sec.split(b'\r\n\r\n', 1)
                            # Remove trailing \r\n
                            if file_data.endswith(b'\r\n'):
                                file_data = file_data[:-2]
                            with open(temp_file, "wb") as f:
                                f.write(file_data)
                            target_pcap = temp_file
                            break

                if not target_pcap:
                    # Fallback write
                    with open(temp_file, "wb") as f:
                        f.write(body_bytes)
                    target_pcap = temp_file
            else:
                raw_body = body_bytes.decode("utf-8", errors="replace") if body_bytes else "{}"
                try:
                    payload = json.loads(raw_body)
                except Exception:
                    payload = {}

                source_type = payload.get("source_type", "batch")
                if source_type == "single" and payload.get("single_file"):
                    pcap_name = payload["single_file"]
                    candidate = DEFAULT_PCAPS_DIR / pcap_name
                    if candidate.exists():
                        target_pcap = candidate
                    else:
                        target_pcap = Path(pcap_name)
                elif source_type == "batch":
                    input_dir = DEFAULT_PCAPS_DIR
                else:
                    input_dir = DEFAULT_PCAPS_DIR

            # Build pipeline command
            cmd = [PYTHON_BIN, str(PIPELINE_SCRIPT), "--format", "all", "--output", str(SENSOR_REPORT)]
            if target_pcap:
                cmd.extend(["--pcap", str(target_pcap)])
            elif input_dir:
                cmd.extend(["--input-dir", str(input_dir)])

            # Delete previous sensor report if it exists so we read fresh output
            if SENSOR_REPORT.exists():
                try:
                    SENSOR_REPORT.unlink()
                except Exception:
                    pass

            try:
                proc = subprocess.run(
                    cmd,
                    cwd=str(PROJECT_ROOT),
                    capture_output=True,
                    text=True,
                    timeout=180,
                )
                if proc.returncode != 0:
                    self.send_response(500)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    err_msg = proc.stderr or proc.stdout or "Pipeline execution failed"
                    self.wfile.write(json.dumps({"error": err_msg}).encode("utf-8"))
                    return

                # Read output report JSON
                report_file = SENSOR_REPORT if SENSOR_REPORT.exists() else OUTPUT_REPORT
                if report_file.exists():
                    with open(report_file, "r", encoding="utf-8") as f:
                        report_data = f.read()
                    self.send_response(200)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(report_data.encode("utf-8"))
                else:
                    self.send_response(500)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps({"error": "Pipeline finished but report was not generated"}).encode("utf-8")
                    )
            except Exception as e:
                self.send_response(500)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))

        elif self.path == "/capture/start":
            length = int(self.headers.get("Content-Length", 0))
            raw_body = self.rfile.read(length).decode("utf-8") if length > 0 else "{}"
            try:
                payload = json.loads(raw_body)
            except Exception:
                payload = {}

            iface = payload.get("interface", "en0")
            bpf = payload.get("bpf", "tcp port 25 or 587 or 465 or 993 or 143 or 995 or 110")

            # Check if tcpdump requires root / sudo
            try:
                test_proc = subprocess.run(
                    ["tcpdump", "-c", "1", "-i", iface, "-n", bpf],
                    capture_output=True,
                    text=True,
                    timeout=2,
                )
                if "Permission denied" in test_proc.stderr or test_proc.returncode != 0:
                    self.send_response(403)
                    self._send_cors_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(
                        json.dumps({
                            "error": "Permission denied: tcpdump requires CAP_NET_RAW or sudo privilege.",
                            "detail": test_proc.stderr.strip() or "Access denied",
                        }).encode("utf-8")
                    )
                    return
            except subprocess.TimeoutExpired:
                # Timed out waiting for 1 packet — permission is fine!
                pass
            except Exception as e:
                self.send_response(403)
                self._send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
                return

            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "started", "interface": iface, "bpf": bpf}).encode("utf-8"))

        elif self.path == "/capture/stop":
            if _live_process:
                try:
                    _live_process.terminate()
                except Exception:
                    pass
                _live_process = None

            self.send_response(200)
            self._send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"status": "stopped"}).encode("utf-8"))
        else:
            self.send_response(404)
            self._send_cors_headers()
            self.end_headers()

    def log_message(self, format, *args):
        sys.stderr.write(f"[Sensor] {self.address_string()} - {format % args}\n")


def run():
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, ForensicSensorHandler)
    print(f"[*] Forensic Sensor listening on http://127.0.0.1:{PORT} and http://localhost:{PORT}")
    print("[*] Ready to process passive capture and forensic pipeline requests.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down forensic sensor.")
        httpd.server_close()


if __name__ == "__main__":
    run()
