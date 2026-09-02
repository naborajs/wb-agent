# Operations & Runbook Guide

## 1. Emergency Kill-Switch & Platform Stop

In the event of an unexpected carrier issue, prompt anomaly, or operational pause:

### Dashboard UI (Instant)
Navigate to `/settings` in the operator dashboard and click **TRIGGER KILL-SWITCH**. This updates `GLOBAL_AUTONOMOUS_ENABLED = False` across the active runtime, preventing the agent from sending any autonomous outbound messages.

### Environment Variable Override
Set in `.env`:
```bash
GLOBAL_AUTONOMOUS_ENABLED=false
DRY_RUN_MODE=true
```
Restart the API service:
```bash
docker compose restart backend
```

---

## 2. Background Queue & Worker Scaling

The job queue utilizes PostgreSQL transactional row-level locking:
```sql
SELECT * FROM jobs 
WHERE status = 'pending' AND run_at <= NOW()
ORDER BY priority DESC, run_at ASC
FOR UPDATE SKIP LOCKED
LIMIT 1;
```

To scale worker concurrency:
1. Increase `WORKER_COUNT` in `.env`.
2. Start dedicated worker instances:
```bash
python -m app.jobs.worker
```

---

## 3. Webhook Health & WhatsApp Provider Switching

### Switching to Production Meta Cloud API
Update `.env`:
```bash
WHATSAPP_PROVIDER=meta_cloud
WHATSAPP_PHONE_NUMBER_ID=your_id
WHATSAPP_ACCESS_TOKEN=your_token
WHATSAPP_VERIFY_TOKEN=your_token
WHATSAPP_WEBHOOK_SECRET=your_app_secret
```

### Probing Webhook Health
```bash
curl -X GET "http://localhost:8000/api/v1/health"
curl -X GET "http://localhost:8000/api/v1/readiness"
```
