# Phase 2 — Remote Deployment Report

**Generated:** 2026-10-04  
**Status:** Frontend integration complete — pending Cloud Run URL from user

---

## Architecture

```
PUBLIC VERCEL FRONTEND (Next.js)
        │
        │  HTTPS (multipart /analyze)
        ▼
GOOGLE CLOUD RUN (us-central1)
  Docker container:
    - python:3.11-slim-bookworm
    - Zeek 9.x (OpenSUSE OBS repo)
    - remote_engine/server.py (ThreadingHTTPServer, port 8000)
        │
        │  subprocess: zeek + forensic_pipeline.py
        ▼
REAL PCAP ANALYSIS
  → Zeek passive parsing
  → Crypto feature extraction
  → Security rules evaluation (RFC 8314)
  → IsolationForest ML anomaly detection (v3.0.0 governance)
  → JSON forensic report
        │
        ▼
VERCEL DASHBOARD (real results, never mocked)
```

---

## Deployment Method

User-selected: **Google Cloud Console → Continuous Deployment from GitHub**

### Steps to deploy Cloud Run service

1. Go to: https://console.cloud.google.com/run
2. Click **Create Service**
3. Choose **Continuously deploy from a repository**
4. Connect GitHub repo: `tirthagarwd/email-forensics`
5. Branch: `main`
6. Build type: **Dockerfile** (root `Dockerfile`)
7. Region: `us-central1`
8. Port: `8000`
9. CPU: 1 vCPU minimum (2 recommended — Zeek is memory-intensive)
10. Memory: 2 GB recommended
11. Min instances: `0` (cold start acceptable for demo)
12. Max instances: `3`
13. Allow unauthenticated invocations: **Yes** (public API for demo)

After creating the service, obtain the URL:
```
https://<service-name>-<hash>-uc.a.run.app
```

---

## Vercel Environment Variable

In the Vercel dashboard for the `web` project, set:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_FORENSIC_API_URL` | `https://<actual-cloud-run-url>` |

This must be set as a **Production** environment variable (and optionally Preview).

After setting it, trigger a new Vercel deployment (push a commit or redeploy from Vercel dashboard).

---

## Backend Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/ping` | GET | Health check — returns `{"status":"ok","service":"remote-forensic-engine"}` |
| `/health` | GET | Full health + model governance metadata |
| `/analyze` | POST | Accepts multipart `file=<pcap>` — returns forensic JSON report |

### Upload limit
50 MB (enforced server-side before Zeek invocation)

### PCAP magic validation
Server validates PCAP magic bytes before processing:
- `d4 c3 b2 a1` (standard little-endian)
- `a1 b2 c3 d4` (standard big-endian)
- `0a 0d 0d 0a` (pcapng)
- `4d 3c 2b 1a` (modified little-endian)
- `1a 2b 3c 4d` (modified big-endian)

---

## Frontend Dual-Mode Architecture

### Mode Detection

```typescript
const REMOTE_ENGINE_URL = process.env.NEXT_PUBLIC_FORENSIC_API_URL || ''
// Remote mode: no local sensor verified AND remote URL configured
const useRemote = !verifiedSensorUrl && !!REMOTE_ENGINE_URL
```

### Mode A — Local Sensor (existing, unchanged)
- `SourceSelector` detects `localhost:5001` via `/ping`
- `handleRun` receives `verifiedSensorUrl`
- JSON body for batch/single; multipart for upload
- All source types (batch, single, upload) work

### Mode B — Remote Engine (new)
- `SourceSelector` shows blue "Remote Forensic Engine Available" card
- Run button enabled without local sensor
- `handleRun` receives `verifiedSensorUrl = undefined`
- All source types become multipart file upload to `REMOTE_ENGINE_URL/analyze`
- Fixture PCAPs fetched from GitHub raw before upload
- Batch sends first selected PCAP (one-at-a-time limitation in remote mode)

### Live Monitor
- Capture code (`http://localhost:5001/capture/start`) unchanged
- Informational note added when `NEXT_PUBLIC_FORENSIC_API_URL` is set:
  "Live Capture — Local / Enterprise Sensor Required"

---

## ML Model Governance (unchanged)

| Property | Value |
|---|---|
| Version | v3.0.0 / expanded_v3 |
| Schema | 1.0.0 |
| Dimensions | 32 |
| Threshold | `-0.041466321224221024` |
| Production SHA-256 | `587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791` |
| Reconstruction SHA-256 | `193162bb2bcad46d84acbfd09d009865c587fa2c2609d2d92e66bd18b3ac7765` |
| Reconstruction promoted | **NO** |

---

## Verification Checklist

After Cloud Run URL is obtained and Vercel env var is set:

- [ ] `curl https://<URL>/ping` → `{"status":"ok"}`
- [ ] `curl https://<URL>/health` → includes `model_governance` block
- [ ] `curl -X POST https://<URL>/analyze -F "file=@part1/pcaps/smtp_starttls_real.pcap"` → `risk_level: MINIMAL`, `overall_risk_score: 15.0`
- [ ] Vercel production page loads
- [ ] Vercel shows "Remote Forensic Engine Available" (blue card) when no local sensor
- [ ] Run analysis from Vercel → real JSON result returned (not `defaultReport.json`)
- [ ] Local sensor mode still works (no regression)
- [ ] Live Monitor shows remote-mode note
- [ ] 13 core tests passing

---

## Rollback Points

| Tag | Commit | Description |
|---|---|---|
| `phase-2-checkpoint-2-stable` | `a26150729f83998a87b874dd44fc8f5a66ba0fed` | Pre-deployment stable (Checkpoint 2) |
| Phase 1 | `4f9a2736b67879923f84938fcf5c48dd8f1f8675` | Initial publication |
| Local backup | `~/email-forensics-backups/snapshot_phase2_cp2_20261004/` | 84 MB timestamped snapshot |
