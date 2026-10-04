# Vercel Fullstack Deployment Guide

## Overview

This document describes the complete fullstack deployment of the Email Forensics
project on Vercel using a single Fluid compute container.

---

## Architecture

```
PUBLIC VERCEL URL
        │
        ▼
 Vercel Fluid Compute Container (Dockerfile.vercel)
        │
   ┌────┴────────────┐
   │                 │
   ▼                 ▼
Static Next.js    Forensic API
dashboard         /analyze  /health  /ping
(web_static/)          │
                        ▼
                  Python forensic pipeline
                        │
                        ▼
                     Zeek 9.x
                        │
                        ▼
                  JSON forensic report
                        │
                        ▼
                  Dashboard renders
```

---

## How the Frontend Works

- The Next.js app is pre-built as a static export (`web/out/` → committed as `web_static/`).
- The container serves the static files from `web_static/` for all non-API paths.
- The JavaScript in the browser detects that it is running on a non-localhost domain and
  automatically uses `window.location.origin` as the backend URL — no env var needed.
- See: `getEffectiveRemoteEngineUrl()` in `web/src/pages/index.tsx` and
  `web/src/components/SourceSelector.tsx`.

---

## How the Backend Works

- `remote_engine/server.py` starts a `ThreadingHTTPServer` on `$PORT` (Vercel default: 80).
- Routes:
  - `GET /`           → serves `web_static/index.html`
  - `GET /*`          → serves static asset files from `web_static/`
  - `GET /ping`       → `{"status":"ok",...}`
  - `GET /health`     → Zeek status + model governance metadata
  - `POST /analyze`   → accepts PCAP upload, runs Zeek + forensic pipeline, returns JSON

---

## How Zeek Runs

- Zeek 9.x is installed in the container from the OpenSUSE Build Service (OBS) Debian 12 repo.
- For each `/analyze` request, a temporary directory is created, the PCAP is written there,
  Zeek is invoked via `subprocess.run(["zeek", "-r", pcap_path, "local"])`, and the resulting
  logs are parsed by `tls_analyzer.py`.
- The temporary directory is cleaned up after every request (stateless).

---

## How PCAP Analysis Works

1. Browser uploads PCAP to `POST /analyze` as `multipart/form-data` (field name: `file`).
2. Container validates PCAP magic number, enforces 4 MB size limit.
3. Forensic pipeline runs: Zeek → email protocol parser → TLS analyzer →
   crypto features → security rules → risk engine → ML anomaly detector →
   enterprise aggregator → report generator.
4. JSON report returned and displayed in the existing dashboard.

---

## Local Development Mode

The local sensor continues to work exactly as before:

```bash
# Terminal 1 — frontend dev server
cd web
npm run dev   # → http://localhost:3000

# Terminal 2 — local forensic sensor
./venv/bin/python3 local_sensor/server.py  # → http://localhost:5001
```

When the frontend detects `localhost:5001` is reachable, it uses it automatically.
When offline, it falls back to the Vercel backend (`window.location.origin/analyze`).

---

## Public Vercel Mode

- Open the Vercel production URL.
- The browser is not running on localhost, so `getEffectiveRemoteEngineUrl()` returns
  `window.location.origin`.
- All forensic analysis goes to the same-origin container — no CORS issues.
- The "Remote Forensic Engine Available" blue card appears automatically.

---

## PCAP Upload Size Limitation

**Current limit: 4 MB.**

If the user uploads a larger PCAP, the backend returns:

```json
{"error": "PCAP is too large for the current Vercel deployment. Please use a PCAP smaller than 4 MB."}
```

This limit can be increased via the `MAX_UPLOAD_SIZE` environment variable in the
Vercel container settings (default: `4194304` bytes = 4 MB).

---

## Security Considerations

- No secrets, credentials, API keys, TLS keylogs, or private keys are committed.
- PCAP files uploaded by users are written to a `tempfile.mkdtemp()` directory that is
  unconditionally deleted after each request (`shutil.rmtree` in `finally`).
- Path traversal protection: `os.path.basename()` on uploaded filenames.
- The container runs as non-root user `forensic` (UID 1000).
- Private filesystem paths are sanitized from the JSON response.

---

## Rollback Instructions

To return to the pre-deployment state:

```bash
git checkout pre-vercel-fullstack-deployment
```

Or reset the branch to the backup tag:

```bash
git reset --hard pre-vercel-fullstack-deployment
```

The rollback tag points to commit `4a70726`.

---

## Production URL

| | |
|---|---|
| **Vercel Project** | `emailforensics` |
| **Production URL** | (set after deployment — see below) |

---

## Vercel Project Name

The new project is deployed as `emailforensics` (or `emailforensics-web` if unavailable).
This is separate from the old `web` project at `web-one-sigma-vudhfub4re.vercel.app`.

---

## Deployment Date

2026-10-04

## Git Branch

`deployment/vercel-fullstack`

## Git Tag (safety backup)

`pre-vercel-fullstack-deployment` → commit `4a70726`

## Post-deployment tag

`vercel-fullstack-deployed`

---

## Files Added/Modified

| File | Purpose |
|---|---|
| `Dockerfile.vercel` | Vercel Fluid compute container: Python 3.11 + Zeek 9.x |
| `requirements.vercel.txt` | Minimal Python deps for the forensic engine |
| `vercel.json` | Routes all traffic to the backend container service |
| `web_static/` | Pre-built Next.js static export (committed, not gitignored here) |
| `remote_engine/server.py` | Updated: serves static dashboard, 4 MB limit, friendly error |
| `web/next.config.js` | Added `output: 'export'` for static export |
| `web/src/pages/index.tsx` | `getEffectiveRemoteEngineUrl()` — auto-detects Vercel deployment |
| `web/src/components/SourceSelector.tsx` | Same auto-detection, updated status card |
| `web/src/components/pages/LiveMonitorPage.tsx` | Updated note for public Vercel deployment |
