# Live Capture Field Test Data Directory

This directory stores metadata and forensic logs from live packet capture field tests.

## Data Retention & Privacy Policy

1. **Unlabeled Traffic**: All live traffic acquired via `live_capture.py` is treated as **UNLABELED**.
2. **No Automatic Retraining**: Field test captures are **NEVER** automatically added to the training corpus.
3. **No Credential Logging**: Live captures operate strictly using BPF header-filtering (`EMAIL_ONLY` or `BROAD`). Plaintext email payloads, authentication passwords, and private key material are excluded.
4. **Metadata Structure**: Each field test entry records:
   - `capture_id`: Unique identifier for the test run.
   - `timestamp`: UTC timestamp of capture.
   - `interface`: Network interface (e.g., `lo0`, `en0`).
   - `bpf_filter`: Active BPF filter string.
   - `pcap_sha256`: SHA-256 hash of the captured PCAP file.
   - `model_version`: Active ML model version (`3.0.0`).
   - `threshold`: Active anomaly threshold (`-0.041466`).
   - `ml_anomalies_detected`: Count of ML statistical anomalies.
   - `deterministic_findings_count`: Count of security rule findings.
