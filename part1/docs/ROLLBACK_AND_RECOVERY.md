# Rollback and Disaster Recovery Guide

**Framework:** AI-Assisted Passive Network Forensic Framework for Email Cryptographic Security Posture Assessment  
**Date:** October 2026  
**Status:** ACTIVE VERIFIED ROLLBACK POINT

---

## 1. Verified Stable Milestones

| Milestone | Git Identifier | Commit / Tag SHA | Description |
| :--- | :--- | :--- | :--- |
| **Phase 1 Complete (Baseline)** | Commit `4f9a273` | `4f9a2736b67879923f84938fcf5c48dd8f1f8675` | Complete safe repository published to GitHub with Next.js dashboard, dataset manifests, architecture documentation, and zero broken LFS pointers. |
| **Phase 2 Checkpoint 2 (Stable)** | Annotated Tag | `phase-2-checkpoint-2-stable` | Containerized headless remote forensic engine (`remote_engine/server.py`), `Dockerfile`, `docker-compose.yml`, `.dockerignore`, and 8/8 passing automated tests. |

---

## 2. Current Deployment State

- **Vercel Frontend:** Running static Next.js export (`https://web-one-sigma-vudhfub4re.vercel.app`), configured for local sensor mode (`http://localhost:5001`).
- **Remote Backend Deployment:** **NOT YET DEPLOYED**. Checkpoint 2 establishes containerization and local parity only. No live cloud instances have been provisioned.
- **Production ML Governance:**
  - Version: `v3.0.0` / `expanded_v3`
  - Dimensions: 32
  - Decision Threshold: `-0.041466321224221024`
  - Documented SHA-256: `587b165398eb9eb2ec82213699c5fb96bb67f85fdfd61467a021ae2befcbc791`
  - Binary Artifact Status: `UNAVAILABLE` (documented in [`part1/models/deployment_ml/expanded_v3/PRODUCTION_MODEL_ARTIFACT_STATUS.md`](file:///Users/tirth/email-forensics/part1/models/deployment_ml/expanded_v3/PRODUCTION_MODEL_ARTIFACT_STATUS.md))
  - Reconstructed SHA-256: `193162bb2bcad46d84acbfd09d009865c587fa2c2609d2d92e66bd18b3ac7765` is **NOT PROMOTED**.

---

## 3. Recovery Procedures

### 3.1 Restore to Phase 2 Checkpoint 2 (Containerized Working State)

From an existing clone:
```bash
git fetch --all --tags
git checkout phase-2-checkpoint-2-stable
```

From a fresh clone:
```bash
git clone https://github.com/tirthagarwal/email-forensics.git
cd email-forensics
git checkout phase-2-checkpoint-2-stable
```

Verify tests after checkout:
```bash
PYTHONPATH=. pytest part1/tests/test_remote_engine.py part1/tests/test_acceptance_workflow.py -v
```

### 3.2 Rollback to Phase 1 Baseline (Pre-Containerization)

If Phase 2 container assets must be completely rolled back to the original Phase 1 publication:
```bash
git checkout 4f9a2736b67879923f84938fcf5c48dd8f1f8675
```

Verify Phase 1 test suite:
```bash
PYTHONPATH=. pytest part1/tests/test_acceptance_workflow.py -v
```

---

## 4. Local External Backup Storage

In addition to Git tags, a local non-git archive snapshot is maintained outside the active repository at:
`~/email-forensics-backups/`

Contains complete source code, configurations, documentation, test fixtures, schemas, manifests, and deployment assets, excluding temporary virtualenvs, node_modules, and build caches.
