import os
import sys
import time
import signal
import shutil
import subprocess
from pathlib import Path

DEFAULT_LIVE_DIR = Path("part1/output/live_pcaps")
EMAIL_BPF_FILTER = "tcp port 25 or tcp port 465 or tcp port 587 or tcp port 143 or tcp port 993 or tcp port 110 or tcp port 995"
BROAD_BPF_FILTER = "tcp"

def get_available_interfaces():
    """
    Retrieves available system network interfaces.
    """
    interfaces = []
    try:
        proc = subprocess.run(["tcpdump", "-D"], capture_output=True, text=True, timeout=3)
        if proc.returncode == 0:
            for line in proc.stdout.splitlines():
                line = line.strip()
                if line:
                    parts = line.split()
                    if len(parts) >= 2:
                        dev_name = parts[1].split("[")[0].strip()
                        desc = line
                        interfaces.append({"dev": dev_name, "label": desc})
    except Exception:
        pass

    if not interfaces:
        interfaces = [
            {"dev": "lo0", "label": "lo0 [Loopback]"},
            {"dev": "en0", "label": "en0 [Wi-Fi/Ethernet]"}
        ]

    return interfaces

class LiveCaptureManager:
    def __init__(self, interface="lo0", filter_mode="EMAIL_ONLY", output_dir=None, rotate_interval=10, retention_max_files=10):
        self.interface = interface
        self.filter_mode = filter_mode
        self.output_dir = Path(output_dir) if output_dir else DEFAULT_LIVE_DIR
        self.rotate_interval = rotate_interval
        self.retention_max_files = retention_max_files
        self.process = None
        self.start_time = None
        self.status = "STOPPED"

    def is_tool_available(self):
        return shutil.which("tcpdump") is not None or shutil.which("dumpcap") is not None or shutil.which("tshark") is not None

    @property
    def is_capturing(self):
        return self.status == "RUNNING"

    def start_capture(self):
        if self.status == "RUNNING":
            return True, "Capture already running."

        os.makedirs(self.output_dir, exist_ok=True)
        bpf_filter = EMAIL_BPF_FILTER if self.filter_mode == "EMAIL_ONLY" else BROAD_BPF_FILTER

        output_pattern = str(self.output_dir / "live_%Y%m%d_%H%M%S.pcap")

        cmd = [
            "tcpdump",
            "-i", self.interface,
            "-n",
            "-s", "0",
            "-w", output_pattern,
            "-G", str(self.rotate_interval),
            bpf_filter
        ]

        try:
            self.process = subprocess.Popen(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            time.sleep(0.15)
            if self.process.poll() is not None:
                _, stderr = self.process.communicate()
                err_msg = stderr.decode('utf-8', errors='ignore').strip()
                self.status = "ERROR"
                if "permission" in err_msg.lower() or "denied" in err_msg.lower():
                    return False, f"Permission denied for tcpdump on interface '{self.interface}': {err_msg}"
                return False, f"tcpdump failed on startup: {err_msg or 'Unknown error (exit code ' + str(self.process.returncode) + ')'}"

            self.start_time = time.time()
            self.status = "RUNNING"
            return True, f"Live capture started on interface '{self.interface}' (Filter: {self.filter_mode})."
        except PermissionError:
            self.status = "ERROR"
            return False, "Permission denied capturing on interface. (Administrator/sudo permissions required for live packet capture)."
        except Exception as e:
            self.status = "ERROR"
            return False, f"Failed to start live capture: {str(e)}"

    def stop_capture(self):
        if self.process and self.status == "RUNNING":
            try:
                self.process.send_signal(signal.SIGINT)
                try:
                    self.process.wait(timeout=2)
                except subprocess.TimeoutExpired:
                    self.process.kill()
            except Exception:
                pass

        self.status = "STOPPED"
        self.process = None
        return True, "Live capture stopped."

    def get_status_summary(self):
        elapsed = round(time.time() - self.start_time, 1) if self.start_time and self.status == "RUNNING" else 0.0
        
        # Count available rolling PCAPs
        live_pcaps = list(self.output_dir.glob("live_*.pcap")) if self.output_dir.exists() else []

        return {
            "status": self.status,
            "interface": self.interface,
            "filter_mode": self.filter_mode,
            "elapsed_seconds": elapsed,
            "total_live_pcaps": len(live_pcaps),
            "output_directory": str(self.output_dir)
        }

    def cleanup_old_pcaps(self):
        if not self.output_dir.exists():
            return

        live_pcaps = sorted(list(self.output_dir.glob("live_*.pcap")), key=os.path.getmtime)
        if len(live_pcaps) > self.retention_max_files:
            to_remove = live_pcaps[:-self.retention_max_files]
            for p in to_remove:
                try:
                    p.unlink()
                except Exception:
                    pass

def main():
    ifaces = get_available_interfaces()
    print("Available Interfaces:")
    for iface in ifaces:
        print(f"  - {iface['label']}")

    mgr = LiveCaptureManager(interface="lo0", filter_mode="EMAIL_ONLY")
    print("Capture Tool Available:", mgr.is_tool_available())

if __name__ == "__main__":
    main()
