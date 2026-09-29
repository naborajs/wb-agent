---
title: "02. Database Setup Guide (Zero-Config SQLite WAL & PostgreSQL 16 pgvector)"
tags: [setup, database, sqlite, postgresql, pgvector, migrations, obsidian, ns]
updated: 2026-09-29
aliases: [Database Setup, SQLite Setup, PostgreSQL Setup, pgvector Setup]
status: complete
---

# 🗄️ 02. Database Setup Guide (Zero-Config SQLite WAL & PostgreSQL 16)

> [!NOTE]
> **WhatsApp AI Agent by NS** features a dialect-agnostic persistence layer (`UniversalJSON` and `VectorType`) supporting **35 relational and vector domain models**. By default, it runs with **Zero-Config SQLite WAL (`wb_agent.db`)** out of the box, and seamlessly scales to **PostgreSQL 16 + `pgvector`** for cloud production.
>
> ⬅️ Previous Step: [[01-prerequisites-and-system-requirements|01. Prerequisites & System Requirements]]  
> ➡️ Next Step: [[03-backend-setup|03. FastAPI Backend Setup]]

---

## 🏗️ Database Setup Architecture

```mermaid
flowchart TD
    Choice{"Select Storage Mode"} -->|Default / Zero-Config| SQLite["Option A: SQLite WAL Mode\n(wb_agent.db via python run.py)"]
    Choice -->|Docker Container| Docker["Option B: Docker Compose\n(pgvector/pgvector:pg16)"]
    Choice -->|Cloud / Bare Metal| Native["Option C: Managed PostgreSQL 16\n(Supabase / Neon / RDS / Ubuntu)"]

    SQLite --> AutoMig["Auto Schema Init & Upgrade\n(upgrade_sqlite_schema.py)"]
    Docker --> Ext["Enable pgvector Extension"]
    Native --> Ext

    AutoMig --> Seed["Seed Starter Catalog & Presets\n(scripts/seed_demo.py or AI Auto-Fill)"]
    Ext --> Seed

    Seed --> Ready["35 Domain Tables Ready for Operations"]
```

---

## ⚡ Option A: Zero-Config SQLite WAL Mode (Default — Recommended for Quick Start)

Out of the box, `.env.example` and `backend/app/config.py` default to local SQLite in Write-Ahead Logging (`WAL`) mode:

```ini
DATABASE_URL=sqlite+aiosqlite:///./wb_agent.db
DATABASE_URL_SYNC=sqlite:///./wb_agent.db
```

When you run `python run.py`, the orchestrator automatically:
1. Creates `wb_agent.db` with `PRAGMA journal_mode=WAL` and `PRAGMA synchronous=NORMAL`.
2. Runs idempotent schema migrations (`backend/scripts/upgrade_sqlite_schema.py`).
3. Seeds starter products, volume discount tiers, and 7 modular prompt sections (`scripts/seed_demo.py`).

### Useful SQLite Maintenance Utilities:
```bash
python backend/scripts/upgrade_sqlite_schema.py   # Upgrade tables & columns safely
python scripts/verify_db_integrity.py             # Run PRAGMA integrity_check
python scripts/backup_db.py                       # Lock-free C-API online backup to backups/
python scripts/optimize_db.py                     # VACUUM & index optimization
```

---

## 🐳 Option B: Docker Compose PostgreSQL 16 + `pgvector`

The repository provides a pre-configured `docker-compose.yml` equipped with PostgreSQL 16 and the official `pgvector/pgvector:pg16` image.

### 1. Start the PostgreSQL Container
```bash
docker compose up -d postgres
```

### 2. Verify Container Health & `vector` Extension
```bash
docker compose ps
docker compose exec postgres psql -U postgres -d wb_agent -c "\dx"
```

---

## 💻 Option C: Native or Cloud PostgreSQL 16 (Supabase / Neon / Railway / Ubuntu)

If you are connecting to a managed cloud PostgreSQL database (such as **Supabase**, **Neon**, **Render**, or **Railway**) or native Ubuntu PostgreSQL 16:

### 1. Enable Extensions in SQL
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;
```

### 2. Configure `.env` Connection Strings
```ini
# Note: Even if you paste a standard postgres:// or postgresql:// URL,
# backend/app/config.py automatically upgrades it to postgresql+asyncpg://!
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wb_agent
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/wb_agent

DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

---

## 🌱 Initializing Schema & Seeding Business Data

To manually initialize the schema and seed starter catalog data:

```bash
# On Windows PowerShell:
$env:PYTHONPATH="backend"
python scripts/seed_demo.py

# On Linux / macOS Bash:
PYTHONPATH="backend" python scripts/seed_demo.py
```

> [!TIP]
> **Switching Industries Anytime**: Once the server is running, open `http://localhost:3000/settings` (or the top-bar **`⚙️ Setup, WhatsApp & Features`** modal) to switch between **6 built-in Industry Presets** or use the **✨ AI Business Auto-Fill Architect** to generate a custom product catalog for any business in 10 seconds!

---

## 🚨 Troubleshooting Common Database Errors

If you encounter connection refusals or missing extensions, consult:
- [[../troubleshooting/error-catalog-and-solutions#1-database-connection-refused|Error: Database Connection Refused]]
- [[../troubleshooting/error-catalog-and-solutions#2-type-vector-does-not-exist|Error: Type "vector" does not exist]]
- [[../troubleshooting/error-catalog-and-solutions#3-asyncpg-pool-timeout|Error: Asyncpg Connection Pool Timeout]]

---

## 🔀 Next Step
Once the database is ready:
👉 Proceed to **[[03-backend-setup|03. FastAPI Backend Setup]]** to run the backend API service.
