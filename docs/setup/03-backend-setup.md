---
title: 03. FastAPI Backend Setup & Execution Guide
tags: [setup, backend, python, fastapi, uvicorn, worker, obsidian]
updated: 2026-09-02
aliases: [Backend Setup, FastAPI Setup, Worker Setup]
status: complete
---

# ⚙️ 03. FastAPI Backend Setup & Execution Guide

> [!NOTE]
> This guide covers setting up the Python environment, configuring environment variables, running the FastAPI REST & WebSocket server, launching the background job worker, and verifying the automated test suite.
>
> ⬅️ Previous Step: [[02-database-and-pgvector-setup|02. PostgreSQL 16 & pgvector Setup]]  
> ➡️ Next Step: [[04-dashboard-frontend-setup|04. Next.js 14 Dashboard Setup]]

---

## 🧭 Backend Process Lifecycle

```mermaid
flowchart TD
    Env["1. Create & Activate Virtualenv (.venv)"] --> Deps["2. Install Dependencies (pip install -e backend/)"]
    Deps --> Config["3. Configure .env with Secrets & Database URL"]
    Config --> Check["4. Verify DB Connectivity (scripts/seed_demo.py)"]
    
    Check --> API["5. Start API Server (Port 8000)"]
    Check --> Worker["6. Start Background Worker Daemon"]
    Check --> Tests["7. Execute Pytest Test Suite (57 Tests)"]

    API --> Endpoints["/api/v1/health | /api/v1/docs | /api/v1/ws"]
    Worker --> Queue["Polls jobs table via SKIP LOCKED"]
```

---

## 📦 1. Create Virtual Environment & Install Dependencies

### Windows (PowerShell)
```powershell
# Create virtual environment
python -m venv .venv

# Activate virtual environment
.venv\Scripts\Activate.ps1

# Upgrade pip
python -m pip install --upgrade pip

# Install backend dependencies in editable development mode
pip install -e backend/
```

### Linux / macOS (Bash / Zsh)
```bash
# Create virtual environment
python3 -m venv .venv

# Activate virtual environment
source .venv/bin/activate

# Upgrade pip
pip install --upgrade pip

# Install backend dependencies in editable development mode
pip install -e backend/
```

---

## 🔐 2. Environment Variables Configuration (`.env`)

Copy the template:
```bash
cp .env.example .env
```

Ensure the key parameters match your local or production environment:

```ini
# Core Configuration
APP_ENV=development
SECRET_KEY=generate-a-secure-random-token-here
API_V1_STR=/api/v1
PROJECT_NAME="WB-Agent Platform"

# Primary Database Connection
DATABASE_URL=postgresql+asyncpg://postgres:postgres@localhost:5432/wb_agent
DATABASE_URL_SYNC=postgresql://postgres:postgres@localhost:5432/wb_agent

# Business Owner Escalation Target (E.164 without spaces)
OWNER_WHATSAPP_NUMBER=+918900653250
DEFAULT_ORG_ID=org_default_tea

# WhatsApp Provider Configuration
# Set to 'simulator' for local testing; 'meta_cloud' for live WhatsApp
WHATSAPP_PROVIDER=simulator
WHATSAPP_VERIFY_TOKEN=wb_agent_verify_token
WHATSAPP_PHONE_NUMBER_ID=mock_phone_number_id
WHATSAPP_ACCESS_TOKEN=mock_access_token

# LLM Routing Configuration
LLM_PROVIDER=simulator
LLM_FALLBACK_PROVIDER=simulator

# Worker & Polling Controls
WORKER_COUNT=2
JOB_POLL_INTERVAL_SECONDS=1.0
MESSAGE_DEBOUNCE_WINDOW_SECONDS=2.5

# CORS Settings (Allow Next.js Dashboard)
CORS_ORIGINS=["http://localhost:3000","http://localhost:8000"]
```

---

## 🚀 3. Starting the FastAPI Application Server

Run Uvicorn with auto-reloading:

```bash
# Set PYTHONPATH so app package resolves cleanly
# On PowerShell:
$env:PYTHONPATH="backend"
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload

# On Linux / macOS:
PYTHONPATH="backend" uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

### Verifying Service Liveness & Docs
- Open **Health Check**: `http://localhost:8000/api/v1/health`
- Open **Interactive OpenAPI Swagger Docs**: `http://localhost:8000/api/v1/docs`
- Open **Readiness Probe**: `http://localhost:8000/api/v1/readiness`

Expected health response:
```json
{
  "status": "ok",
  "service": "wb-agent",
  "version": "0.1.0"
}
```

---

## ⚡ 4. Starting the Background Job Worker Daemon

The background worker daemon polls the database for scheduled follow-ups, debounced incoming WhatsApp messages, and external notifications using PostgreSQL `SKIP LOCKED`:

In a separate terminal window:
```bash
# On PowerShell:
$env:PYTHONPATH="backend"
python -m app.jobs.worker

# On Linux / macOS:
PYTHONPATH="backend" python -m app.jobs.worker
```

Expected worker log:
```text
2026-09-02 23:28:00 [ INFO  ] wb_agent: Background job worker daemon started (polling interval: 1.0s).
```

---

## 🧪 5. Executing the Test Suite

Run all unit, integration, and persona evaluation tests using pytest:

```bash
# On PowerShell:
$env:PYTHONPATH="backend"
python -m pytest backend/tests/ -v

# On Linux / macOS:
PYTHONPATH="backend" pytest backend/tests/ -v
```

Expected result:
```text
============================= 57 passed in 5.49s ==============================
```

---

## 🚨 Troubleshooting Common Backend Issues

- Port 8000 is occupied: see [[error-catalog-and-solutions#port-conflicts|Error Catalog: Port Conflicts]].
- ModuleNotFoundError for `app`: Ensure `$env:PYTHONPATH="backend"` or `PYTHONPATH="backend"` is exported.
- Database Connection Refused: Verify PostgreSQL status in [[02-database-and-pgvector-setup|PostgreSQL Setup]].

---

## 🔀 Next Step
With the backend server and workers operating smoothly:
👉 Proceed to **[[04-dashboard-frontend-setup|04. Next.js 14 Dashboard Setup]]** to launch the operator UI.
