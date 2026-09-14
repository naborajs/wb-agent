# 09. Production Deployment Checklist & Go-Live Runbook

This guide details the pre-flight, deployment, and post-flight verification steps required to deploy **WB-Agent** in a production environment.

---

## 1. Pre-Flight Infrastructure Requirements

- [ ] **Compute**: Linux VM (Ubuntu 22.04 LTS or later) with minimum 4 vCPUs, 8 GB RAM, and 50 GB SSD storage.
- [ ] **Python**: Python 3.11+ installed (`python3 --version`).
- [ ] **Node.js**: Node.js 20+ and npm 10+ (`node --version`).
- [ ] **PostgreSQL**: PostgreSQL 16 with the `pgvector` extension installed (`CREATE EXTENSION IF NOT EXISTS vector;`).
- [ ] **Domain & SSL**: Valid domain with HTTPS/TLS configured (Let's Encrypt / Certbot / Cloudflare).

---

## 2. Secrets & Environment Configuration

Copy `.env.example` to `.env` and configure production parameters:

- [ ] `APP_ENV=production`
- [ ] `SECRET_KEY`: Generate a high-entropy secret token (e.g. `openssl rand -hex 32`).
- [ ] `DATABASE_URL`: Connection string with connection pool tuning (`DB_POOL_SIZE=20`, `DB_MAX_OVERFLOW=40`).
- [ ] `NVIDIA_NIM_API_KEY_PRIMARY` & `NVIDIA_NIM_API_KEY_FALLBACK`: Verified NVIDIA keys with Nemotron models enabled.
- [ ] `GEMINI_API_KEY`: Production Google AI Gemini key for Friday executive voice/copilot tasks.
- [ ] `WHATSAPP_PROVIDER`: Set to `meta_cloud` or `bridge` with active credentials.
- [ ] `OWNER_WHATSAPP_NUMBER`: Verified E.164 phone number for escalation dispatch.

---

## 3. Database Schema Initialization & Migrations

```bash
# Run database migrations
$env:PYTHONPATH="backend"
python -m alembic upgrade head

# Seed verified product catalog and pricing rules
python scripts/seed_demo.py
```

---

## 4. Reverse Proxy & Service Configuration (Nginx / Caddy)

Configure reverse proxy to route traffic securely:
- `/api` -> `http://127.0.0.1:8000` (FastAPI backend)
- `/` -> `http://127.0.0.1:3000` (Next.js dashboard)
- WebSocket `/api/v1/ws` -> Upgrade connection headers enabled

---

## 5. Post-Flight Verification Checklist

Run system healthcheck script:
```bash
python scripts/check_health.py
```
- [ ] Database connectivity returns `OK [HEALTHY]`.
- [ ] WhatsApp provider health probe returns `OK`.
- [ ] Run Pytest test suite to confirm zero regressions:
  ```bash
  python -m pytest backend/tests/test_edith_sales_pipeline.py backend/tests/unit -v --tb=short
  ```
- [ ] Access `/settings` on the operator dashboard and verify the AI status pill shows **SYSTEM ONLINE**.
