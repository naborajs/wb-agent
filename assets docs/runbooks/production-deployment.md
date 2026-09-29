# Production Deployment Runbook: WhatsApp AI Agent by NS

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Engineered by Naboraj Sarkar (NS)*  
> This runbook describes the production deployment process for the autonomous Dual-Brain AI sales and operations platform.

---

## 1. System Requirements & Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **CPU** | 2 Cores | 4+ Cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB SSD | 50+ GB NVMe |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / Windows Server | Ubuntu 22.04+ LTS |
| **Python** | 3.10+ | 3.11 or 3.12+ |
| **Node.js** | 18.x LTS | 20.x LTS |
| **Database** | Built-in SQLite 3 WAL (`wb_agent.db`) | PostgreSQL 16 with `pgvector` (for multi-node cloud) |

---

## 2. Environment Configuration

1. Clone the repository to the deployment directory:
   ```bash
   git clone https://github.com/naborajs/wb-agent.git /opt/wb-agent
   cd /opt/wb-agent
   ```

2. Copy and configure production environment variables:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```

3. Configure essential security and tenant keys in `.env` (or via `/settings` in the UI):
   - Set `APP_ENV=production`
   - Generate a strong random token for `SECRET_KEY` (e.g. `openssl rand -hex 32`)
   - Specify your normalized owner escalation phone: `OWNER_WHATSAPP_NUMBER=<YOUR_OWNER_WHATSAPP_NUMBER>`
   - Configure AI provider credentials (`NVIDIA_API_KEY` and `GEMINI_API_KEY`)
   - Configure WhatsApp channel credentials (`bridge` for Unofficial Baileys QR/Pairing or `meta_cloud` for Official Meta Cloud API v20.0)

---

## 3. Option A: 1-Command Headless Deployment (`python run.py --no-open`)

On a Linux VPS or cloud VM, the master orchestrator automatically installs dependencies, initializes the database, and supervises all 4 services:

```bash
python3 run.py --no-open
```

---

## 4. Option B: Containerized Deployment (Docker Compose)

Deploy the full stack (FastAPI Backend, Next.js Dashboard, Worker, and PostgreSQL 16 + `pgvector`):

```bash
docker compose up -d --build
```

Verify service containers are healthy:
```bash
docker compose ps
```

---

## 5. Post-Deployment Verification

Execute the health verification CLI or run the 5-point End-to-End Verification from the Dashboard (`⚙️ Setup, WhatsApp & Features` → Step 3):

```bash
python scripts/check_health.py
python scripts/smoke_test.py
```

---

## 6. Automated Backup Scheduling

Configure a daily cron job for lock-free database snapshots and retention pruning:

```cron
0 2 * * * cd /opt/wb-agent && /usr/bin/python3 scripts/backup_db.py >> /var/log/wb-agent-backup.log 2>&1
```

---

## 7. Zero-Downtime Rollback Procedure

If issues are detected post-deployment:
1. Revert Git tag: `git checkout <previous-stable-tag>`
2. Re-run schema verification: `python backend/scripts/upgrade_sqlite_schema.py`
3. Restart services: `python3 run.py --no-open` or `docker compose restart`
