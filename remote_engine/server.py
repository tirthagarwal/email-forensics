#!/usr/bin/env python3
"""
Remote Forensic Engine HTTP Server.
Provides containerized/remote API endpoints for the web dashboard (e.g. Vercel)
to execute the Python + Zeek forensic pipeline on uploaded PCAP files.

Endpoints:
- GET  /health          Comprehensive health check, runtime info, and model status
- GET  /ping            Lightweight readiness probe
- POST /analyze         Accepts PCAP upload (multipart or binary), runs forensic pipeline,
                        returns complete forensic analysis JSON, cleans up temporary files.
"""

import argparse
import json
import mimetypes
import os
import shutil
import subprocess
import sys
import tempfile
import time
import warnings
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path

# Suppress minor cryptography/scapy deprecation warnings
warnings.filterwarnings("ignore")

# Setup paths
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PART1_SRC = PROJECT_ROOT / "part1" / "src"

for p in [str(PROJECT_ROOT), str(PART1_SRC)]:
    if p not in sys.path:
        sys.path.insert(0, p)

# Import forensic pipeline function
from forensic_pipeline import analyze_pcap_files

PORT = int(os.environ.get("PORT", 8000))
MAX_UPLOAD_SIZE = int(os.environ.get("MAX_UPLOAD_SIZE", 4 * 1024 * 1024))  # 4 MB limit for Vercel deployment

# Standard PCAP and PCAPNG magic signatures
PCAP_MAGIC_NUMBERS = [
    b"\xd4\xc3\xb2\xa1",  # Standard pcap (microsecond, big-endian)
    b"\xa1\xb2\xc3\xd4",  # Standard pcap (microsecond, little-endian)
    b"\x4d\x3c\xb2\xa1",  # Standard pcap (nanosecond, big-endian)
    b"\xa1\xb2\x3c\x4d",  # Standard pcap (nanosecond, little-endian)
    b"\x0a\x0d\x0d\x0a",  # PCAPNG block header
]


def detect_zeek() -> dict:
    """Detect presence and version of Zeek binary."""
    try:
        proc = subprocess.run(["zeek", "--version"], capture_output=True, text=True, timeout=5)
        if proc.returncode == 0:
            version_str = proc.stdout.strip() or proc.stderr.strip()
            return {"available": True, "version": version_str}
        return {"available": False, "version": None, "error": f"Zeek exited with code {proc.returncode}"}
    except FileNotFoundError:
        return {"available": False, "version": None, "error": "zeek binary not found in PATH"}
    except Exception as e:
        return {"available": False, "version": None, "error": str(e)}


# Static frontend asset directories (built Next.js export)
STATIC_DIRS = [
    PROJECT_ROOT / "web_static",
    PROJECT_ROOT / "web" / "out",
    Path("/app/web_static"),
]


def find_static_dir() -> Path | None:
    for d in STATIC_DIRS:
        if d.is_dir() and (d / "index.html").is_file():
            return d
    return None


class RemoteForensicHandler(BaseHTTPRequestHandler):
    """HTTP request handler for remote forensic analysis."""

    def _send_cors_headers(self):
        allowed_origin_env = os.environ.get("CORS_ORIGIN", "*")
        origin = self.headers.get("Origin")
        if allowed_origin_env != "*":
            # Strict origin matching
            if origin and (origin == allowed_origin_env or origin.endswith(".vercel.app")):
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            else:
                self.send_header("Access-Control-Allow-Origin", allowed_origin_env)
        else:
            if origin:
                self.send_header("Access-Control-Allow-Origin", origin)
                self.send_header("Vary", "Origin")
            else:
                self.send_header("Access-Control-Allow-Origin", "*")

        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        req_headers = self.headers.get(
            "Access-Control-Request-Headers",
            "Content-Type, Authorization, X-Requested-With, Accept, Access-Control-Request-Private-Network",
        )
        self.send_header("Access-Control-Allow-Headers", req_headers)
        self.send_header("Access-Control-Allow-Private-Network", "true")
        self.send_header("Access-Control-Max-Age", "86400")

    def _send_json_response(self, status_code: int, data: dict):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self._send_cors_headers()
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self._send_cors_headers()
        self.send_header("Content-Length", "0")
        self.end_headers()

    def _serve_file(self, file_path: Path, status_code: int = 200):
        try:
            with open(file_path, "rb") as f:
                content = f.read()
            mime_type, _ = mimetypes.guess_type(str(file_path))
            if not mime_type:
                mime_type = "application/octet-stream"
            if mime_type.startswith("text/") or mime_type in ("application/javascript", "application/json"):
                mime_type += "; charset=utf-8"

            self.send_response(status_code)
            self._send_cors_headers()
            self.send_header("Content-Type", mime_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self._send_json_response(500, {"error": f"Failed to serve file: {e}"})

    def do_GET(self):
        path_clean = self.path.split("?")[0].rstrip("/")
        if not path_clean:
            path_clean = "/"

        if path_clean in ("/ping", "/api/ping"):
            self._send_json_response(200, {
                "status": "ok",
                "service": "email-forensics-remote-engine",
                "version": "1.0.0",
                "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            return

        if path_clean in ("/health", "/api/health"):
            zeek_info = detect_zeek()
            self._send_json_response(200, {
                "status": "ok",
                "service": "email-forensics-remote-engine",
                "version": "1.0.0",
                "zeek": zeek_info,
                "python": sys.version.split()[0],
                "model_governance": {
                    "version": "v3.0.0",
                    "variant": "expanded_v3",
                    "algorithm": "IsolationForest",
                    "n_estimators": 200,
                    "random_state": 42,
                    "feature_dimensions": 32,
                    "decision_threshold": -0.041466321224221024,
                    "documented_production_sha256": "587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791",
                    "production_artifact_status": "UNAVAILABLE",
                    "reconstructed_artifact_sha256": "193162bb2bcad46d84acbfd09d009865c587fa2c2609d2d92e66bd18b3ac7765",
                    "reconstruction_promoted": False,
                    "runtime_fallback": "Deterministic rules + metadata preservation active",
                },
                "server_time": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            })
            return

        # Serve static web dashboard if bundled (Next.js static export)
        static_dir = find_static_dir()
        if static_dir:
            req_path = self.path.split("?")[0]
            clean_rel = req_path.lstrip("/")
            if not clean_rel:
                target_file = static_dir / "index.html"
            else:
                target_file = (static_dir / clean_rel).resolve()
                # Security: prevent directory traversal
                if not str(target_file).startswith(str(static_dir.resolve())):
                    self._send_json_response(403, {"error": "Forbidden"})
                    return
                if target_file.is_dir():
                    target_file = target_file / "index.html"

            if target_file.is_file():
                self._serve_file(target_file)
                return

            fallback_404 = static_dir / "404.html"
            if fallback_404.is_file():
                self._serve_file(fallback_404, status_code=404)
                return

        # Fallback if no static frontend: root returns health
        if path_clean == "/":
            zeek_info = detect_zeek()
            self._send_json_response(200, {
                "status": "ok",
                "service": "email-forensics-remote-engine",
                "message": "Forensic Engine API online.",
                "zeek": zeek_info,
            })
            return

        self._send_json_response(404, {"error": "Not Found", "path": self.path})

    def do_POST(self):
        path_clean = self.path.split("?")[0].rstrip("/")

        if path_clean in ("/ping", "/api/ping"):
            self.do_GET()
            return

        if path_clean in ("/analyze", "/api/analyze"):
            content_length_header = self.headers.get("Content-Length")
            if not content_length_header:
                self._send_json_response(411, {"error": "Length Required: Missing Content-Length header."})
                return

            try:
                content_length = int(content_length_header)
            except ValueError:
                self._send_json_response(400, {"error": "Invalid Content-Length header."})
                return

            if content_length > MAX_UPLOAD_SIZE:
                self._send_json_response(413, {
                    "error": "PCAP is too large for the current Vercel deployment. Please use a PCAP smaller than 4 MB.",
                    "details": f"Upload size {content_length} bytes exceeds {MAX_UPLOAD_SIZE} bytes limit."
                })
                return

            if content_length == 0:
                self._send_json_response(400, {"error": "Empty upload payload."})
                return

            # Read request body
            body_bytes = self.rfile.read(content_length)
            content_type = self.headers.get("Content-Type", "")

            # Extract PCAP payload
            pcap_bytes = None
            filename = "uploaded.pcap"

            if "multipart/form-data" in content_type:
                boundary = None
                for part in content_type.split(";"):
                    part = part.strip()
                    if part.startswith("boundary="):
                        boundary = part.split("=", 1)[1].strip('"').encode("utf-8")
                        break

                if boundary:
                    delimiter = b"--" + boundary
                    sections = body_bytes.split(delimiter)
                    for sec in sections:
                        if b"filename=" in sec and b"\r\n\r\n" in sec:
                            head, file_data = sec.split(b"\r\n\r\n", 1)
                            # Extract safe filename from Content-Disposition
                            for line in head.split(b"\r\n"):
                                if b"filename=" in line:
                                    try:
                                        raw_fn = line.split(b"filename=")[1].strip().strip(b'"\'').decode("utf-8", errors="ignore")
                                        # Strict basename to prevent path traversal
                                        safe_name = os.path.basename(raw_fn).strip()
                                        if safe_name:
                                            filename = safe_name
                                    except Exception:
                                        filename = "uploaded.pcap"
                                    break

                            # Strip trailing boundary artifacts
                            if file_data.endswith(b"\r\n"):
                                file_data = file_data[:-2]
                            pcap_bytes = file_data
                            break

                if pcap_bytes is None:
                    # Fallback: could not parse multipart boundary cleanly
                    pcap_bytes = body_bytes
            else:
                # Raw binary upload
                pcap_bytes = body_bytes

            # Validate PCAP magic number
            is_valid_magic = any(pcap_bytes.startswith(magic) for magic in PCAP_MAGIC_NUMBERS)
            if not is_valid_magic and len(pcap_bytes) >= 4:
                # Also accept if size > 24 and ends with standard pcap patterns, or allow user file with warning
                magic_prefix = pcap_bytes[:4].hex()
                self._send_json_response(400, {
                    "error": "Invalid PCAP file format.",
                    "details": f"File does not start with standard PCAP/PCAPNG header (observed magic 0x{magic_prefix}).",
                })
                return

            # Check Zeek availability before execution
            zeek_info = detect_zeek()
            if not zeek_info.get("available"):
                self._send_json_response(503, {
                    "error": "Zeek network security monitor is not available on this engine.",
                    "details": zeek_info.get("error"),
                })
                return

            # Run forensic pipeline in an isolated temporary directory
            temp_dir = tempfile.mkdtemp(prefix="remote_forensic_")
            try:
                temp_pcap = Path(temp_dir) / filename
                with open(temp_pcap, "wb") as f:
                    f.write(pcap_bytes)

                zeek_cache_dir = Path(temp_dir) / "zeek_output"
                zeek_cache_dir.mkdir(parents=True, exist_ok=True)

                # Execute forensic pipeline
                report = analyze_pcap_files([temp_pcap], zeek_cache_dir)

                # Sanitize private filesystem paths from client response
                if isinstance(report, dict) and "pcap" in report and "files_analyzed" in report["pcap"]:
                    report["pcap"]["files_analyzed"] = [filename]

                # Return result
                self._send_json_response(200, report)

            except Exception as e:
                self._send_json_response(500, {
                    "error": "Forensic pipeline execution failed.",
                    "details": str(e),
                })
            finally:
                # Strictly clean up temporary directory and all intermediate files
                try:
                    shutil.rmtree(temp_dir, ignore_errors=True)
                except Exception as e:
                    sys.stderr.write(f"[Warning] Failed to clean up temp dir {temp_dir}: {e}\n")

            return

        self._send_json_response(404, {"error": "Not Found", "path": self.path})

    def log_message(self, format, *args):
        sys.stderr.write(f"[RemoteEngine] {self.address_string()} - {format % args}\n")


def run(port: int = PORT):
    server_address = ("0.0.0.0", port)
    httpd = ThreadingHTTPServer(server_address, RemoteForensicHandler)
    print(f"[*] Email Forensics Remote Engine listening on http://0.0.0.0:{port}")
    print(f"[*] API ready: GET /health, GET /ping, POST /analyze")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[*] Shutting down Remote Forensic Engine.")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Remote Forensic Engine Server")
    parser.add_argument("--port", type=int, default=PORT, help=f"Port to bind (default: {PORT})")
    args = parser.parse_args()
    run(args.port)
