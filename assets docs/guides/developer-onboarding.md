---
title: "Developer Onboarding & Local Environment Guide"
tags: [developer, onboarding, setup, testing, cli, ns]
updated: 2026-09-29
aliases: [Developer Onboarding, Contributor Guide]
status: complete
---

# 🛠️ Developer Onboarding & Local Environment Guide

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Engineered by Naboraj Sarkar (NS)*  
> This guide gets software engineers and contributors up and running with the full Dual-Brain stack in under 3 minutes.

---

## 1. Repository Layout

```text
wb-agent/
├── run.py                  # Unified zero-config orchestrator (preflight, auto-install, seed, 4-service launcher)
├── backend/                # FastAPI async application & AI orchestration layer (27 routers / 137 endpoints)
│   ├── app/                # Core logic (agent, ai, api, audio, brain, conversations, database, knowledge, pricing, whatsapp)
│   ├── scripts/            # Schema migrations & subsystem verification scripts
│   ├── tests/              # Comprehensive pytest suite (unit/, e2e/, evaluation/)
│   └── pyproject.toml      # Python packaging & pytest configuration
├── dashboard/              # Next.js 14 App Router Mission Control UI (17 routes, Simplified & Advanced modes)
│   ├── app/                # Route pages (/, /brain, /playground, /conversations, /knowledge, /prompts, /settings, etc.)
│   ├── components/         # Reusable UI, 3D WebGL cores (components/3d/), and Friday Voice DOM engine (components/voice/)
│   └── public/             # Brand emblems & compiled 3D .obj models
├── whatsapp-bridge/        # Baileys Node.js microservice (:3001) for QR & 8-digit pairing code connectivity
├── rust-models/            # Zero-dependency Rust procedural 3D mesh generator (friday_orb.obj & edith_core.obj)
├── assets docs/            # Complete documentation vault (guides, architecture, 26 ADRs, setup, runbooks, audits)
└── scripts/                # Operational CLI utilities (health checks, DB backup, vacuum, smoke tests)
```

---

## 2. Fast 1-Command Startup (Recommended)

The root orchestrator (`run.py`) automatically verifies Python 3.10+ and Node.js 18+, installs missing dependencies, initializes the SQLite WAL database (`wb_agent.db`), and launches all 4 services (`:8000` FastAPI, `:3001` WhatsApp Bridge, `:3000` Next.js Dashboard, and the Durable Job Worker):

```bash
python run.py
```

### Useful Developer CLI Flags:
```bash
python run.py --skip-install   # Instant warm reboot (skips pip/npm install checks)
python run.py --no-open        # Starts all services without auto-opening browser tabs
python run.py --clean          # Frees ports 3000/3001/8000, cleans caches, and boots fresh
```

---

## 3. Manual Multi-Terminal Startup (For Debugging Individual Services)

If you want to attach a debugger (`pdb` / VS Code) to an individual service:

### Terminal 1 — FastAPI Backend (`:8000`)
```bash
pip install -r backend/requirements.txt
python backend/scripts/upgrade_sqlite_schema.py
$env:PYTHONPATH="backend"; python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
Interactive OpenAPI Swagger UI is available at `http://localhost:8000/api/v1/docs`.

### Terminal 2 — Durable Background Worker
```bash
$env:PYTHONPATH="backend"; python -m app.jobs.worker
```

### Terminal 3 — WhatsApp Baileys Bridge (`:3001`)
```bash
cd whatsapp-bridge
npm install
node index.js
```

### Terminal 4 — Next.js 14 Dashboard (`:3000`)
```bash
cd dashboard
npm install
npm run dev
```

---

## 4. Running the Automated Test Suite

```bash
# Run all 43 Unit Test modules
$env:PYTHONPATH="backend"; python -m pytest backend/tests/unit -v --tb=short

# Run the 60-Test 4-Tier End-to-End (E2E) Suite
python run_e2e_tests.py

# Run Specific Subsystems
$env:PYTHONPATH="backend"; python -m pytest backend/tests/unit/test_pricing_engine.py -v
$env:PYTHONPATH="backend"; python -m pytest backend/tests/unit/test_inter_brain.py -v
$env:PYTHONPATH="backend"; python -m pytest backend/tests/unit/test_voice_workflows.py -v
```

---

## 5. Simulating Conversations & AI Business Auto-Fill via CLI / cURL

You do not need a live WhatsApp phone connected to test EDITH or Friday:

### Simulate an Inbound Customer Turn (Isolated Sandbox)
```bash
curl -X POST http://localhost:8000/api/v1/whatsapp/simulate-inbound \
  -H "Content-Type: application/json" \
  -d '{"phone": "+919876543210", "name": "Aarav Mehta", "message": "Hi, I need 100 units for our Mumbai store, what is your best wholesale rate?"}'
```

### Test AI Business Auto-Fill Architect
```bash
curl -X POST http://localhost:8000/api/v1/settings/ai-autofill-business \
  -H "Content-Type: application/json" \
  -d '{"prompt": "We run a solar rooftop and lithium inverter company called SunVolt Energy", "seed_catalog": true}'
```

---

## 6. Contribution & Commit Standards

All contributions follow the **Conventional Commits** specification and incremental milestone workflow:
- `feat(subsystem)`: New capability, UI component, or API endpoint
- `fix(subsystem)`: Bug fix, race-condition guard, or edge-case handling
- `docs(topic)`: Documentation, guide, or ADR update
- `test(subsystem)`: Unit, E2E, or adversarial evaluation test coverage
- `chore(tool)`: Build, dependency, or configuration maintenance

---

## 🔗 Next Steps for Engineers
- 🏛️ **[Senior Developer & Architecture Reference](senior-developer-architecture.md)**
- 🔌 **[Complete REST API & WebSocket Reference (137 Endpoints)](../api-reference.md)**
- 📱 **[WhatsApp Bridge & Meta Cloud API Guide](whatsapp-bridge-guide.md)**
- 🛠️ **[Error Catalog & Troubleshooting Guide](../troubleshooting/error-catalog-and-solutions.md)**
