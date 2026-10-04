# 🌐 WhatsApp AI Agent by NS — Hosting & Multi-Environment Deployment Guide

> 📖 **Live Documentation Hub**: **[naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs](https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs)** · 🌐 **Online Chapter**: **[Chapter 10: Production Operations & Deployment](https://naborajs.me/docs/whatsapp-ai-agent/ch-10-deployment-ops)**  
> ⬅️ Back to: [Root README](../README.md) | [Knowledge Base Index](../assets%20docs/index.md) | [Production Runbook](../assets%20docs/runbooks/production-deployment.md)

This guide explains how to host **WhatsApp AI Agent by NS (FRIDAY + EDITH Dual-Brain Operating System)** across **any hosting environment**—from a single Linux VPS or Docker server to cloud PaaS platforms (Render, Railway, Fly.io, Coolify) or a split Vercel + Cloud Backend setup.

---

## ✨ Why WhatsApp AI Agent by NS Hosts Cleanly Out-of-the-Box

**WhatsApp AI Agent by NS** is engineered by **[Naboraj Sarkar (NS)](https://naborajs.me)** with **Auto-Hosting Resilience** so you can deploy it on any fresh server without manual code changes:

1. **Zero-Config Database (`SQLite` $\rightarrow$ `PostgreSQL` Auto-Upgrade)**:
   - Defaults to a local async SQLite database (`sqlite+aiosqlite:///./wb_agent.db`) so it boots immediately without requiring an external PostgreSQL server.
   - If you provide a `DATABASE_URL` from **Supabase, Neon, Render, Railway, or Heroku** (starting with `postgres://` or `postgresql://`), [`backend/app/config.py`](../backend/app/config.py) automatically upgrades the scheme to `postgresql+asyncpg://`.
2. **Single-Port Reverse-Proxy Ready**:
   - The Next.js Dashboard (`:3000` or `$PORT`) automatically proxies all `/api/v1/*` and `/health` requests to the internal FastAPI backend (`:8000`).
   - Even the WhatsApp QR Code iframe is proxied through FastAPI (`GET /api/v1/whatsapp/qr-embed`), meaning **you never have to expose port `3001` to the public internet** to scan the QR code or generate an 8-digit pairing code from a remote browser.
3. **Cross-Platform Production Orchestrator (`python run.py --prod`)**:
   - Works identically on **Linux (Ubuntu/Debian/Alpine), macOS, Docker, and Windows**.
   - Automatically installs missing dependencies, initializes database tables, builds the Next.js production bundle (`.next`), and launches all 3 services in production mode.
4. **Fresh-Clone Onboarding**:
   - No personal phone numbers are hardcoded. On first visit to your hosted URL, the **Setup & Mode Modal** pops up so you can link your own WhatsApp Bot (via Unofficial QR/Code or Official Meta Cloud API), set your Owner Escalation Number, and auto-configure your business with AI.

---

## 🖥️ Environment 1: Linux VPS (Ubuntu / Debian / AWS EC2 / DigitalOcean / Hetzner)

### 1. Install Prerequisites (Ubuntu/Debian)
```bash
sudo apt update && sudo apt install -y python3 python3-pip python3-venv nodejs npm git curl lsof
# Optional: Upgrade Node.js to v20 LTS if distro Node is older than v18
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Clone & Configure
```bash
git clone https://github.com/naborajs/wb-agent.git
cd wb-agent
cp .env.example .env
```
Edit `.env` (or configure directly in the Web UI after startup):
```env
APP_ENV=production
GEMINI_API_KEY=your_gemini_api_key
NVIDIA_API_KEY=your_nvidia_nim_api_key
```

### 3. Launch in Production Mode
```bash
python3 run.py --prod --no-open
```
- **Dashboard & Proxied API**: `http://<your-server-ip>:3000`
- **Direct FastAPI Docs**: `http://<your-server-ip>:8000/api/v1/docs`

### 4. Keep Running 24/7 with `systemd`
Create `/etc/systemd/system/wb-agent.service`:
```ini
[Unit]
Description=WB-Agent Dual-Brain AI Platform (FRIDAY + EDITH)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/wb-agent
Environment="APP_ENV=production"
ExecStart=/usr/bin/python3 /home/ubuntu/wb-agent/run.py --prod --no-open
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```
Enable and start:
```bash
sudo systemctl daemon-reload
sudo systemctl enable wb-agent
sudo systemctl start wb-agent
sudo journalctl -u wb-agent -f
```

### 5. HTTPS Reverse Proxy (Caddy or Nginx)
#### Option A: Caddy (Automatic Let's Encrypt HTTPS in 5 lines)
In `/etc/caddy/Caddyfile`:
```caddyfile
agent.yourdomain.com {
    handle /api/v1/ws* {
        reverse_proxy 127.0.0.1:8000
    }
    handle /api/v1/* {
        reverse_proxy 127.0.0.1:8000
    }
    handle {
        reverse_proxy 127.0.0.1:3000
    }
}
```

#### Option B: Nginx (With WebSocket Upgrade)
```nginx
server {
    listen 80;
    server_name agent.yourdomain.com;

    # WebSocket & FastAPI Backend Routes
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000/api/v1/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Next.js Operator Dashboard
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }
}
```

---

## 🐳 Environment 2: Docker & Docker Compose (Coolify / Portainer / Any Server)

### Option A: Multi-Container Stack (`docker-compose.yml`)
Starts `whatsapp-bridge`, `backend`, and `dashboard` with persistent volumes for WhatsApp sessions (`wa_auth_data`) and SQLite/storage (`./storage`):

```bash
cp .env.example .env
docker compose up -d --build
```
- Want to run with a dedicated **PostgreSQL + pgvector** container? Activate the `postgres` profile:
  ```bash
  DATABASE_URL=postgresql+asyncpg://postgres:postgrespassword@postgres:5432/wb_agent \
  docker compose --profile postgres up -d --build
  ```

### Option B: Unified All-in-One Container (Root `Dockerfile`)
Ideal for single-container hosting platforms:
```bash
docker build -t wb-agent:latest .
docker run -d \
  --name wb-agent \
  -p 3000:3000 \
  -p 8000:8000 \
  -e GEMINI_API_KEY="your_gemini_key" \
  -e NVIDIA_API_KEY="your_nvidia_key" \
  -v wb_storage:/app/storage \
  -v wb_wa_auth:/app/whatsapp-bridge/auth_info_baileys \
  wb-agent:latest
```

---

## ☁️ Environment 3: Cloud PaaS (Render / Railway / Fly.io / Koyeb)

Because the root [`Dockerfile`](../Dockerfile) launches `python run.py --prod --no-open` and binds the Next.js Dashboard (with built-in `/api/v1/*` proxying) to `$PORT`, you can deploy the entire repository as a single **Docker Web Service**:

1. **Connect GitHub Repository**: Select `naborajs/wb-agent` on **Render**, **Railway**, **Fly.io**, or **Coolify**.
2. **Runtime**: Select **Docker** (uses root `./Dockerfile`).
3. **Environment Variables**:
   | Variable | Recommended Value |
   | :--- | :--- |
   | `APP_ENV` | `production` |
   | `PORT` | `3000` *(or automatically injected by Render/Railway)* |
   | `GEMINI_API_KEY` | Your Google AI Studio API Key (for Friday Voice & Action Copilot) |
   | `NVIDIA_API_KEY` | Your NVIDIA NIM API Key (for EDITH Commercial Closer) |
   | `DATABASE_URL` | `sqlite+aiosqlite:///./storage/wb_agent.db` *(or your Supabase/Neon/Railway Postgres URL)* |
4. **Persistent Storage Tip**:
   - If using **Unofficial WhatsApp Mode (Baileys QR/Code)** on a PaaS, mount a persistent volume at `/app/whatsapp-bridge/auth_info_baileys` so your WhatsApp login persists across container redeploys.
   - If using **Official Meta WhatsApp Cloud API**, no persistent volume is needed for WhatsApp—set `WHATSAPP_PROVIDER=meta_cloud` (or toggle **Official Meta API** in the Dashboard Setup Modal) and point your Meta Webhook URL to:
     `https://<your-paas-domain>/api/v1/webhooks/whatsapp`

---

## ⚡ Environment 4: Split Hosting (Vercel Frontend + Cloud Backend)

If you want to host the Next.js `dashboard/` on **Vercel** and the FastAPI `backend/` + `whatsapp-bridge/` on a VPS or Railway/Render:

1. **Deploy Backend (`backend` + `whatsapp-bridge`)** on your VPS, Railway, or Render and note its public HTTPS URL (e.g., `https://api.yourdomain.com`).
2. **Deploy `dashboard/` on Vercel**:
   - Set **Root Directory** to `dashboard`.
   - Configure Vercel Environment Variables:
     ```env
     INTERNAL_API_URL=https://api.yourdomain.com
     NEXT_PUBLIC_API_URL=https://api.yourdomain.com
     NEXT_PUBLIC_WS_URL=wss://api.yourdomain.com
     NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_api_key
     ```
   - Deploy! Vercel will proxy `/api/v1/*` to `INTERNAL_API_URL` and connect real-time WebSockets to `NEXT_PUBLIC_WS_URL`.

---

## 📱 Connecting WhatsApp on a Remote Server

Once your server is live, open `https://<your-domain>` in your browser and click **Setup & Mode** in the top bar:

1. **Unofficial Mode (Zero Meta Approval — Any WhatsApp Number)**:
   - **Scan QR Code**: The embedded QR scanner loads via `/api/v1/whatsapp/qr-embed` (proxied securely through the backend—no port `3001` firewall rules required).
   - **8-Digit Pairing Code**: Enter your phone number with country code (e.g. `919876543210`) and click **Get 8-Digit Code**, then enter that code on your phone under *WhatsApp $\rightarrow$ Linked Devices $\rightarrow$ Link with phone number instead*.
2. **Official Mode (Meta WhatsApp Business Cloud API v20.0)**:
   - Click **🛡️ Official (Meta API)** in Step 1A.
   - Enter your **Phone Number ID**, **WABA ID**, **Permanent Access Token**, and **Verify Token**.
   - In the Meta Developer Portal, set your Webhook Callback URL to `https://<your-domain>/api/v1/webhooks/whatsapp`.

---

## 🛠️ Troubleshooting Common Hosting Issues

| Symptom | Cause | Fix |
| :--- | :--- | :--- |
| **`asyncpg` / `psycopg2` error on cloud Postgres URL** | Cloud providers supply `postgres://...` instead of `postgresql+asyncpg://...` | Handled automatically! [`backend/app/config.py`](../backend/app/config.py) auto-converts `postgres://` and `postgresql://` to `postgresql+asyncpg://`. |
| **QR Code iframe blank on remote VPS** | Previously pointed to `localhost:3001` | Fixed! The dashboard now uses `/api/v1/whatsapp/qr-embed`, which proxies the bridge HTML through FastAPI & Next.js. |
| **WebSocket fails on HTTPS domain** | Reverse proxy not forwarding `Upgrade: websocket` header, or port `8000` blocked | Use the Caddy/Nginx snippet above, or set `NEXT_PUBLIC_WS_URL=wss://your-backend-domain`. |
| **WhatsApp disconnects after container redeploy** | Ephemeral container filesystem wiped `auth_info_baileys` | Mount a persistent Docker volume to `/app/whatsapp-bridge/auth_info_baileys`, or use **Official Meta Cloud API** mode. |

---

<div align="center">
  <sub><b>WhatsApp AI Agent by NS</b> — Engineered by <b>Naboraj Sarkar (NS)</b></sub>
</div>
