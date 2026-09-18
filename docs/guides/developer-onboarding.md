# Developer Onboarding & Local Environment Guide

Welcome to the **WB-Agent** engineering codebase. This guide gets new contributors up and running in under 5 minutes.

---

## 1. Repository Layout

```text
wb-agent/
├── backend/            # FastAPI async application & AI orchestration layer
│   ├── app/            # Core business logic (agent, database, pricing, watchdog)
│   ├── tests/          # Comprehensive pytest test suite
│   └── pyproject.toml  # Python packaging & pytest configurations
├── dashboard/          # Next.js 14 App Router mission control interface
│   ├── app/            # Pages & routing (inbox, analytics, leads, quotes)
│   └── components/     # Reusable UI components & status badges
├── whatsapp-bridge/    # Baileys Node.js microservice for WhatsApp Web pairing
├── docs/               # Architecture Decision Records (ADRs) & operational runbooks
└── scripts/            # CLI utilities (health checks, database backup, vacuum)
```

---

## 2. Fast 3-Minute Setup

### A. Backend Setup
```bash
# 1. Create and activate virtual environment
python -m venv venv
# Windows:
.\venv\Scripts\Activate.ps1
# Linux/macOS:
source venv/bin/activate

# 2. Install dependencies
pip install -r backend/requirements.txt

# 3. Initialize SQLite schema
python backend/scripts/upgrade_sqlite_schema.py
```

### B. Dashboard Setup
```bash
cd dashboard
npm install
npm run dev
```
Dashboard will be live at `http://localhost:3000`.

---

## 3. Running Unit Tests

Run the full core test suite with pytest:

```bash
python -m pytest backend/tests/unit -v --tb=short
```

Run specific subsystems:
- Pricing engine tests: `python -m pytest backend/tests/unit/test_pricing_engine.py`
- Invoicing & GST tests: `python -m pytest backend/tests/unit/test_invoices.py`
- Watchdog & Sentiment tests: `python -m pytest backend/tests/unit/test_watchdog.py backend/tests/unit/test_sentiment.py`

---

## 4. Simulating Conversations

You do not need a live WhatsApp number to test agent reasoning. Use the simulation API:

```bash
curl -X POST http://localhost:8000/api/v1/agent/simulate \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello! We are looking for 100kg of Assam CTC tea for our cafe.", "channel_id": "+919876543210"}'
```

---

## 5. Contribution & Commit Standards
All contributions must follow the **Conventional Commits** specification:
- `feat(subsystem)`: New capability or endpoint
- `fix(subsystem)`: Bug fix or edge-case handling
- `docs(topic)`: Documentation or ADR update
- `test(subsystem)`: Unit or integration test coverage
- `chore(tool)`: Build or dependency upgrade
