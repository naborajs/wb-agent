---
title: "09. Production Deployment Checklist & Go-Live Runbook"
tags: [setup, production, deployment, checklist, security, docker, nginx, ns]
updated: 2026-09-29
aliases: [Production Checklist, Go-Live Runbook]
status: complete
---

# 🚀 09. Production Deployment Checklist & Go-Live Runbook

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Engineered by Naboraj Sarkar (NS)*  
> This guide details the pre-flight, deployment, and post-flight verification steps required to deploy the platform in a cloud or on-premise production environment.
>
> ⬅️ Previous Step: [[08-end-to-end-verification|08. End-to-End Simulation & Verification]]  
> ➡️ Related Runbook: [[../runbooks/production-deployment|Production Deployment & Docker Runbook]]

---

## 1. Pre-Flight Infrastructure Requirements

- [ ] **Compute**: Linux VM (Ubuntu 22.04+ LTS) or container host with minimum 2–4 vCPUs, 4–8 GB RAM, and 20+ GB SSD storage.
- [ ] **Python**: Python 3.10+ (`python3 --version`).
- [ ] **Node.js**: Node.js 18+ and npm 9+ (`node --version`).
- [ ] **Database**:
  - **Single-Node / SMB VPS**: Built-in SQLite WAL (`sqlite+aiosqlite:///./wb_agent.db`) with daily cron backup (`python scripts/backup_db.py`).
  - **Multi-Worker / Enterprise Cloud**: PostgreSQL 16 with `pgvector` (`CREATE EXTENSION IF NOT EXISTS vector;`).
- [ ] **Domain & SSL**: Valid domain with HTTPS/TLS configured (Caddy / Nginx + Let's Encrypt / Cloudflare).

---

## 2. Secrets & Environment Configuration (`.env`)

Copy `.env.example` to `.env` and verify production parameters:

- [ ] `APP_ENV=production`
- [ ] `SECRET_KEY`: High-entropy secret token (`openssl rand -hex 32`).
- [ ] `DATABASE_URL`: SQLite WAL (`sqlite+aiosqlite:///./wb_agent.db`) or PostgreSQL (`postgresql+asyncpg://...`).
- [ ] `NVIDIA_API_KEY` & `NVIDIA_NIM_API_KEY_FALLBACK`: Active NVIDIA NIM keys for EDITH.
- [ ] `GEMINI_API_KEY`: Active Google Gemini key for Friday Voice & Web Copilot.
- [ ] `WHATSAPP_PROVIDER`: Set to `bridge` (for Unofficial Baileys QR/Pairing on `:3001`) or `meta_cloud` (for Official Meta Cloud API `v20.0`).
- [ ] `OWNER_WHATSAPP_NUMBER`: Configured in `/settings` or `.env` (E.164 format, e.g., `+919876543210`).

---

## 3. 1-Command Headless Production Startup (`run.py --no-open`)

On a headless Linux VPS or presentation server:
```bash
git pull origin main
python3 run.py --no-open
```
Or via Docker Compose (`docker-compose.yml`):
```bash
docker compose up --build -d
```

---

## 4. Reverse Proxy Configuration (Nginx / Caddy)

Route external HTTPS traffic cleanly:
- `/api/` → `http://127.0.0.1:8000` (FastAPI backend & `/api/v1/whatsapp/qr-embed` proxy)
- `/api/v1/ws` → `http://127.0.0.1:8000` with `Upgrade: websocket` and `Connection: upgrade` headers
- `/` → `http://127.0.0.1:3000` (Next.js 14 dashboard)
*(Note: Port `3001` does not need to be exposed publicly because `/api/v1/whatsapp/*` and `/api/v1/settings/whatsapp-*` safely proxy all Baileys QR and pairing requests through port `8000`!)*

---

## 5. Post-Flight Verification Checklist

- [ ] Run `python scripts/check_health.py` and `python scripts/smoke_test.py`.
- [ ] Open `⚙️ Setup, WhatsApp & Features` → **Step 3 (End-to-End Health Verification)** and confirm all 5 checks pass.
- [ ] Run the automated E2E test suite:
  ```bash
  python run_e2e_tests.py
  ```
- [ ] Confirm automated SQLite backups (`python scripts/backup_db.py`) are scheduled.
