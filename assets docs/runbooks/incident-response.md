# Incident Response & Troubleshooting Runbook: WB-Agent

This operational runbook provides diagnostic workflows and remediation steps for live production incidents.

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
1. Check bridge container logs:
   ```bash
   docker logs -n 100 wb-agent-whatsapp-bridge
   ```
2. If `Waiting for QR code scan`, navigate to Dashboard -> Settings -> WhatsApp and scan the QR code using your business mobile phone.
3. If socket is unresponsive, restart the bridge daemon:
   ```bash
   docker restart wb-agent-whatsapp-bridge
   ```

### Playbook B: Database Lock (`sqlite3.OperationalError: database is locked`)
**Symptoms**: API returns 500 on write queries during high-concurrency bursts.
**Diagnostic Steps**:
1. Verify no long-running transactions are hanging:
   ```bash
   python scripts/verify_db_integrity.py
   ```
2. Optimize and compact SQLite indices:
   ```bash
   python scripts/optimize_db.py
   ```
3. For enterprise throughput, migrate to PostgreSQL via `DATABASE_URL` in `.env`.

### Playbook C: Customer Distress / Sentiment Alert
**Symptoms**: Watchdog creates `sentiment_risk` alert (`Customer Distress Detected`).
**Diagnostic Steps**:
1. Open Mission Control Inbox and locate the flagged conversation ID.
2. Review recent customer messages for product, delivery, or pricing dissatisfaction.
3. Click "Takeover Conversation" to pause autonomous AI responses and assign a human sales executive.
4. Resolve the alert in the Watchdog tab with resolution notes.

### Playbook D: Primary AI Provider Quota Exhaustion
**Symptoms**: AI turns fail with HTTP 429 from primary NVIDIA NIM key.
**Diagnostic Steps**:
1. WB-Agent automatically trips the internal circuit breaker and fails over to `NVIDIA_NIM_API_KEY_FALLBACK` or Gemini.
2. Confirm fallback operation in `backend/app/ai/circuit_breaker.py`.
3. Top up API credits on the primary provider account.
