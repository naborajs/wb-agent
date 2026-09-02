---
title: 02. PostgreSQL 16 & pgvector Setup Guide
tags: [setup, database, postgresql, pgvector, migrations, obsidian]
updated: 2026-09-02
aliases: [Database Setup, PostgreSQL Setup, pgvector Setup]
status: complete
---

# 🗄️ 02. PostgreSQL 16 & pgvector Setup Guide

> [!NOTE]
> WB-Agent relies on PostgreSQL 16 as its single source of truth for all transactional CRM tables, conversation threads, long-term customer memories, and high-dimensional semantic vectors via `pgvector`.
>
> ⬅️ Previous Step: [[01-prerequisites-and-system-requirements|01. Prerequisites & System Requirements]]  
> ➡️ Next Step: [[03-backend-setup|03. FastAPI Backend Setup]]

---

## 🏗️ Database Setup Architecture

```mermaid
flowchart TD
    Choice{"Select Setup Mode"} -->|Recommended / Local Dev| Docker["Option A: Docker Compose (Automated)"]
    Choice -->|Production / Bare Metal| Native["Option B: Native PostgreSQL 16"]
    Choice -->|Zero-Dependency / Offline| SQLite["Option C: SQLite Fallback Mode"]

    Docker --> Ext["Enable pgvector Extension"]
    Native --> Ext
    SQLite --> Mock["UniversalJSON & Mock Vectors"]

    Ext --> Migrate["Run Schema Init & Seeding: scripts/seed_demo.py"]
    Mock --> Migrate

    Migrate --> Ready["30 Relational Tables Ready in Database"]
```

---

## 🐳 Option A: Docker Compose (Recommended for Local Dev)

The repository provides a pre-configured `docker-compose.yml` equipped with PostgreSQL 16 and the official `pgvector/pgvector:pg16` image.

### 1. Start the PostgreSQL Container
```bash
docker compose up -d postgres
```

### 2. Verify Container Health
```bash
docker compose ps
# Ensure the status displays: Up (healthy)
```

### 3. Connect via psql in Docker
```bash
docker compose exec postgres psql -U postgres -d wb_agent -c "\dx"
# Output will confirm the 'vector' extension is installed:
#   Name   | Version | Schema | Description
#  --------+---------+--------+---------------------------------------------------
#   vector | 0.7.0   | public | vector data type and ivfflat and hnsw access methods
```

---

## 💻 Option B: Native PostgreSQL Installation

If you prefer installing PostgreSQL natively on Ubuntu, Debian, macOS, or Windows:

### 1. Ubuntu / Debian
```bash
# Add official PostgreSQL APT repository
sudo apt install -y postgresql-common
sudo /usr/share/postgresql-common/pgdg/apt.postgresql.org.sh
sudo apt update
sudo apt install -y postgresql-16 postgresql-16-pgvector

# Start service
sudo systemctl enable --now postgresql
```

### 2. macOS (Homebrew)
```bash
brew install postgresql@16
brew install pgvector
brew services start postgresql@16
```

### 3. Create Database & Enable Extension
Open the PostgreSQL interactive shell:
```bash
sudo -u postgres psql
```
Execute SQL configuration:
```sql
CREATE DATABASE wb_agent;
CREATE USER postgres WITH ENCRYPTED PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE wb_agent TO postgres;

\c wb_agent;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify pgvector
SELECT * FROM pg_extension WHERE extname = 'vector';
```

---

## 📴 Option C: SQLite Fallback (Zero-Dependency Offline Mode)

If you are running in a lightweight container or offline Windows environment without Docker or PostgreSQL installed, WB-Agent has built-in support for dialect-agnostic SQLite:

- Column types use `UniversalJSON` (resolves to `JSONB` on PostgreSQL, standard `JSON` on SQLite).
- Vector types use `VectorType` (resolves to `Vector(1536)` on PostgreSQL, serialized `JSON` array on SQLite).
- Set in `.env`:
  ```bash
  DATABASE_URL=sqlite+aiosqlite:///./wb_agent.db
  DATABASE_URL_SYNC=sqlite:///./wb_agent.db
  ```

---

## 🔑 Database Connection String Format

Configure in your `.env` file:

```ini
# Asynchronous URL used by FastAPI, SQLAlchemy AsyncSession, and Asyncpg
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wb_agent

# Synchronous URL used for migrations or administrative CLI tools
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/wb_agent

# Connection Pool Limits (ADR-001)
DB_POOL_SIZE=10
DB_MAX_OVERFLOW=20
DB_POOL_TIMEOUT=30
```

> [!WARNING]
> Always prefix asynchronous connection strings with `postgresql+asyncpg://`. Using `postgresql://` directly in async mode will trigger a `NoSuchModuleError: Can't load plugin: sqlalchemy.dialects:postgresql.asyncpg`.

---

## 🌱 Initializing Schema & Seeding Demo Data

Once the database is running and reachable, populate the initial catalog, pricing tiers, knowledge documents, and default organization using the automated seed script:

```bash
# Set Python path to backend directory
# On PowerShell:
$env:PYTHONPATH="backend"
python scripts/seed_demo.py

# On Linux / macOS Bash:
PYTHONPATH="backend" python scripts/seed_demo.py
```

Expected output:
```text
2026-09-02 23:27:44 [ INFO  ] wb_agent: Initializing database schema...
2026-09-02 23:27:44 [ INFO  ] wb_agent: Database engine initialized for URL dialect: postgresql
2026-09-02 23:27:44 [ INFO  ] wb_agent: Database seeding successfully completed for North Bengal Tea Co.!
```

---

## 🚨 Troubleshooting Common Database Errors

If you encounter connection refusals or missing extensions, consult:
- [[error-catalog-and-solutions#1-database-connection-refused|Error: Database Connection Refused]]
- [[error-catalog-and-solutions#2-type-vector-does-not-exist|Error: Type "vector" does not exist]]
- [[error-catalog-and-solutions#3-asyncpg-pool-timeout|Error: Asyncpg Connection Pool Timeout]]

---

## 🔀 Next Step
Once the database is seeded and verified:
👉 Proceed to **[[03-backend-setup|03. FastAPI Backend Setup]]** to run the backend API service.
