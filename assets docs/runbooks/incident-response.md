# Incident Response & Troubleshooting Runbook: WhatsApp AI Agent by NS

> ⬅️ Back to: [[../index|Knowledge Base Index]] | **Error Catalog**: [[../troubleshooting/error-catalog-and-solutions|Comprehensive Error Catalog]]

This operational runbook provides diagnostic workflows and remediation steps for live production incidents on **WhatsApp AI Agent by NS**.

---

## 1. Incident Severity Classifications

| Severity | Definition | Target Resolution | Escalation Contact |
| :--- | :--- | :--- | :--- |
| **P1 - Critical** | Inbound WhatsApp blocked; sales engine down; pricing hallucination detected. | < 30 minutes | Platform Lead & Business Owner |
| **P2 - High** | WhatsApp bridge disconnected; LLM primary key exhausted (fallback active). | < 2 hours | DevOps & AI Engineering |
| **P3 - Medium** | High channel latency (> 2500ms); customer distress alert triggered. | < 6 hours | Support Supervisor |
| **P4 - Low** | Minor dashboard UI glitch; non-blocking telemetry delay. | Next business day | Development Team |

---

## 2. Playbooks for Common Production Incidents

### Playbook A: WhatsApp Bridge Disconnection
**Symptoms**: Watchdog alert `WhatsApp Bridge Connection Failed` or `WhatsApp Channel Unauthenticated`.
**Diagnostic Steps**:
1. Check bridge logs (or terminal output if started via `python run.py`):
   ```bash
   docker logs -n 100 wb-agent-whatsapp-bridge
   ```
2. If `Waiting for QR code scan`, open the Dashboard -> click the **WhatsApp Hub** pill in the top header (or go to `/settings` -> **WhatsApp Gateway**) -> scan the QR code or use an 8-digit pairing code.
3. If the session keys are stale (`401 Logged Out`), click **"Reset Session"** (`POST /api/v1/whatsapp/reset-session`) in the WhatsApp Hub modal to wipe `whatsapp-bridge/auth_info_baileys` and generate a fresh QR code immediately.

### Playbook B: Database Lock (`sqlite3.OperationalError: database is locked`)
**Symptoms**: API returns 500 on write queries during high-concurrency bursts on SQLite.
**Diagnostic Steps**:
1. Verify no long-running transactions are hanging:
   ```bash
   python scripts/verify_db_integrity.py
   ```
2. Optimize and compact SQLite WAL indices:
   ```bash
   python scripts/optimize_db.py
   ```
3. For high-throughput multi-worker production, migrate to PostgreSQL 16 via `DATABASE_URL` in `.env` (see [[../setup/02-database-and-pgvector-setup|Database & pgvector Setup]]).

### Playbook C: Customer Distress / Sentiment Alert
**Symptoms**: Watchdog creates `sentiment_risk` alert (`Customer Distress Detected`).
**Diagnostic Steps**:
1. Open Mission Control Inbox (`/conversations`) and locate the flagged conversation ID.
2. Review recent customer messages for product, delivery, or pricing dissatisfaction.
3. Click **"Take Over"** to pause autonomous AI responses and assign a human sales executive.
4. Resolve the alert in the `/handoffs` tab with resolution notes.

### Playbook D: Primary AI Provider Quota Exhaustion
**Symptoms**: AI turns fail with HTTP 429 from primary NVIDIA NIM or Google Gemini key.
**Diagnostic Steps**:
1. **WhatsApp AI Agent by NS** automatically trips the internal circuit breaker and fails over across configured providers (`Gemini -> NVIDIA Primary -> NVIDIA Fallback -> SimulatorProvider`).
2. You can also reassign any of the 5 task roles dynamically in `/integrations` (**Dynamic Model-to-Task Assignment**) without restarting the server.
3. Top up API credits or rotate keys in `/settings` -> **API Vault**.

---

<div align="center">
  <sub><b>WhatsApp AI Agent by NS</b> — Engineered by <b>Naboraj Sarkar (NS)</b></sub>
</div>
