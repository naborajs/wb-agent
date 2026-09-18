# Production Deployment Runbook: WB-Agent Platform

This runbook describes the production deployment process for the WB-Agent autonomous AI sales platform.

---

## 1. System Requirements & Prerequisites

| Component | Minimum Specification | Recommended Production |
| :--- | :--- | :--- |
| **CPU** | 2 Cores | 4+ Cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB SSD | 50+ GB NVMe |
| **Operating System** | Ubuntu 22.04 LTS / Debian 12 / Windows Server | Ubuntu 22.04 LTS |
| **Python** | 3.11+ | 3.12 or 3.14 |
| **Node.js** | 18.x LTS | 20.x LTS |
| **Database** | SQLite 3.35+ (Edge) | PostgreSQL 15+ with pgvector |

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

3. Configure essential security and tenant keys in `.env`:
   - Set `APP_ENV=production`
   - Generate a strong random token for `SECRET_KEY` (e.g. `openssl rand -hex 32`)
   - Specify normalized owner phone: `OWNER_WHATSAPP_NUMBER=+918900653250`
   - Configure AI provider credentials (`NVIDIA_NIM_API_KEY_PRIMARY` or `GEMINI_API_KEY`)
   - Configure WhatsApp channel credentials (`meta_cloud` or `bridge`)

---

## 3. Database Schema Initialization & Upgrades

Ensure all tables and columns are up to date:

```bash
# Activate Python virtualenv
source venv/bin/activate

# Execute automated schema migrations and sanity checks
python backend/scripts/upgrade_sqlite_schema.py
python scripts/verify_db_integrity.py
```

---

## 4. Containerized Deployment (Docker Compose)

Deploy the full stack (FastAPI Backend, Next.js Dashboard, WhatsApp Bridge, and PostgreSQL):

```bash
docker-compose up -d --build
```

Verify service containers are healthy:
```bash
docker-compose ps
```

---

## 5. Post-Deployment Verification

Execute the health verification CLI:

```bash
python scripts/check_health.py
```

Expected output:
```text
[PASS] API Server Health: ONLINE
[PASS] Database Integrity: HEALTHY
[PASS] WhatsApp Provider: READY
```

---

## 6. Automated Backup Scheduling

Configure a daily cron job for lock-free database snapshots and retention pruning:

```cron
0 2 * * * cd /opt/wb-agent && /opt/wb-agent/venv/bin/python scripts/backup_db.py >> /var/log/wb-agent-backup.log 2>&1
```

---

## 7. Zero-Downtime Rollback Procedure

If issues are detected post-deployment:
1. Revert Git tag: `git checkout <previous-stable-tag>`
2. Re-run schema verification: `python backend/scripts/upgrade_sqlite_schema.py`
3. Restart containers: `docker-compose restart`
