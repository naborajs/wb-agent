# Operations & Runbook Guide

## 1. Unified Root Orchestrator (`python run.py`)

The platform is managed via a zero-configuration single root script (`run.py`) that handles dependency resolution, port collision detection, automatic database seeding, and multi-service concurrency.

### Standard Startup
```bash
python run.py
```
This automatically boots:
- **FastAPI Backend**: `http://localhost:8000`
- **Durable Background Worker**: Async cadence follow-ups and background AI thinking
- **Baileys WhatsApp Bridge**: `http://localhost:3001`
- **Next.js 14 Dashboard**: `http://localhost:3000`

### Command Line Flags
| Flag | Description |
| :--- | :--- |
| `--no-open` | Disables automatically opening browser tabs (dashboard and WhatsApp QR). |
| `--skip-install` | Bypasses `pip install` and `npm install` checks for faster warm startup. |
| `--help` | Prints all supported CLI parameters. |

### Graceful Termination
Pressing `Ctrl+C` in the terminal triggers graceful SIGINT/SIGTERM handling:
1. Child worker loops terminate bounded work.
2. WhatsApp socket closes cleanly.
3. Backend drains pending requests.
4. Next.js dev server stops without orphaned Node.js or Python processes locking ports.

---

## 2. Emergency Kill-Switch & Platform Stop

In the event of an unexpected carrier issue, prompt anomaly, or operational pause:

### Dashboard UI (Instant)
Navigate to `/settings` in the operator dashboard and click **TRIGGER KILL-SWITCH**. This updates `GLOBAL_AUTONOMOUS_ENABLED = False` across the active runtime, preventing the agent from sending any autonomous outbound messages.

### Environment Variable Override
Set in `.env`:
```bash
GLOBAL_AUTONOMOUS_ENABLED=false
DRY_RUN_MODE=true
```
Restart the API service or root launcher:
```bash
# Via Unified Runner
# Stop running process with Ctrl+C, then restart:
python run.py
```

---

## 3. Mobile Operator Operations & Responsive Layout

EDITH includes responsive viewport adaptation optimized for floor managers and field sales reps using smartphones (iOS / Android) or tablets:

### 1. Mobile Drawer Navigation
- On screens narrower than `1024px`, the left desktop sidebar collapses into a sliding hamburger drawer accessible from the top navbar.
- The drawer includes the theme switcher, real-time AI status pill, and direct navigation links to all 14 platform routes with touch targets >= 44px.

### 2. Conversational Split View on Mobile
- On mobile devices, the multi-panel inbox automatically switches to a focused single-view workflow:
  - When browsing conversations, the thread list takes 100% width.
  - Selecting a thread displays the full chat timeline with a dedicated **"← Back"** button to return to the list.
  - Buyer Profile and Commercial Intelligence are accessible via a one-tap **Slide-Over Drawer** from the chat header.

### 3. Horizontal Table Containers
- All data tables (Orders, Leads, Campaigns, Analytics, Follow-ups) are wrapped in `overflow-x-auto` wrappers with explicit column minimum widths (`min-w-[640px]`), ensuring legible tabular formatting without column squishing on phone screens.

---

## 4. Dual-Theme Visual Engine (Estate White & Royal Pitch Black)

The operator interface supports two display profiles:
- **Estate White (Daylight Mode)**: Optimized for daylight field visits, warehouse desks, and bright offices. High-contrast slate typography on clean pearl surfaces (`#ffffff`, `#f8fafc`).
- **Royal Pitch Black (Midnight Celestial)**: Tailored for dark-room command shifts. Deep onyx canvas (`#030712`, `#0b0f19`) with cyan/sky glows and emerald indicators.

### Brand Assets & Favicon
Official brand assets are located in `dashboard/public/`:
- `logo-transparent.png`: High-resolution transparent background emblem.
- `logo-light.png`: Optimized high-contrast version for Estate White theme.
- `logo-icon.png`: Compact symbol mark for navigation avatars and headers.
- `favicon.ico`: Direct estate seal icon.

---

## 5. Background Queue & Worker Scaling

The job queue utilizes transactional row-level locking:
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
$env:PYTHONPATH="backend"; python -m app.jobs.worker
```

---

## 6. Webhook Health & WhatsApp Provider Switching

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
