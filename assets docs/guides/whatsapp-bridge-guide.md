---
title: "WhatsApp Connectivity Guide: Unofficial Baileys Bridge vs. Official Meta Cloud API"
tags: [whatsapp, baileys, meta-cloud-api, qr-code, pairing-code, webhook, lid-deduplication, ns]
updated: 2026-09-29
aliases: [WhatsApp Bridge Guide, WhatsApp Setup, Meta Cloud API vs Baileys]
status: complete
---

# 📱 WhatsApp Connectivity Guide: Unofficial Web Bridge vs. Official Meta Cloud API

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Engineered by [Naboraj Sarkar (NS)](https://naborajs.me)*  
> 📖 **Official Documentation Hub**: [naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs](https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs) · 🌐 **Online Chapter**: [Chapter 2: FriteOS Transport & WhatsApp Web Gateway](https://naborajs.me/docs/whatsapp-ai-agent/ch-2-friteos-gateway)  
> The platform features a dual-adapter WhatsApp gateway (`ADR-0005`, `ADR-0011`) that lets you switch seamlessly between the **Zero-Cost Self-Hosted Baileys Bridge (`:3001`)** and the **Official Meta WhatsApp Business Cloud API (`Graph v20.0`)** directly from the Dashboard UI (`/settings` or the Top-Bar Setup Modal).

---

## 1. Architectural Comparison

| Dimension | 📲 Unofficial Web Bridge (`baileys_bridge` / `unofficial`) | ✅ Official Meta Cloud API (`meta_cloud` / `official`) |
| :--- | :--- | :--- |
| **Underlying Protocol** | Multi-Device WebSocket (`@whiskeysockets/baileys`) | HTTPS REST Graph API v20.0 + Signed Webhooks |
| **Hosting** | Local Node.js microservice (`whatsapp-bridge/index.js` on `:3001`) | Hosted on Meta Cloud Infrastructure |
| **Authentication** | Live **QR Code Scan** OR **8-Digit Phone Pairing Code** | `Phone Number ID`, `WABA ID`, `Permanent Access Token`, `Verify Token` |
| **Per-Message Cost** | **₹0 / $0 (Free)** — uses your existing WhatsApp or WhatsApp Business app | Standard Meta per-conversation template billing |
| **Switching Numbers** | 1-click **"Switch / Reset Session"** (`POST /api/v1/settings/whatsapp-reset`) | Update `meta_phone_number_id` in `/settings` |
| **Multi-Device `@lid` Resolution** | Built-in automatic `@lid` JID to canonical E.164 phone mapping & thread deduplication | Native E.164 `wa_id` delivery |
| **Ideal For** | Instant plug-and-play demos, SMBs, local pilots, and zero-cost operations | High-throughput enterprise production & verified green-tick brands |

---

## 2. Option A: Unofficial Baileys Web Bridge (Default & Zero-Config)

When you run `python run.py`, the Node.js Baileys bridge starts automatically on `http://localhost:3001`. Zero personal phone numbers are hardcoded—the bridge automatically detects whichever WhatsApp phone you link!

### Connecting from the Dashboard UI (Recommended)
1. Open `http://localhost:3000` and click **`⚙️ Setup, WhatsApp & Features`** in the top bar (or navigate to **`/settings`**).
2. Ensure **📲 Unofficial Web Bridge (QR / Pairing Code)** is selected.
3. Choose either pairing method:
   - **Scan QR Code**: Open WhatsApp on your phone → **Settings / Menu** → **Linked Devices** → **Link a Device** → scan the live QR code displayed on screen.
   - **8-Digit Pairing Code**: Enter your phone number with country code (e.g., `919876543210`), click **Get Code**, and enter the 8-character code on your phone's WhatsApp notification.
4. Enter your **Owner Escalation WhatsApp Number** (where EDITH sends hot-lead summaries, order confirmations, and human handoff alerts) and click **Save**.

### Switching to a Different WhatsApp Phone
To disconnect the currently linked WhatsApp account and pair a different phone number:
- Click **"Switch / Connect a Different WhatsApp Number"** in the Setup Modal or `/settings`, **OR** call:
  ```bash
  curl -X POST http://localhost:8000/api/v1/settings/whatsapp-reset
  ```
  This clears the local Baileys auth state and immediately generates a fresh QR code.

### Internal Bridge Endpoints (`http://localhost:3001`)
| Bridge Endpoint | FastAPI Proxy Route | Description |
| :--- | :--- | :--- |
| `GET /status` | `GET /api/v1/whatsapp/status` | Returns `connected`, auto-detected `botPhone`, `ownerPhone`, `qrAvailable`, and `pairingCode`. |
| `GET /qr` | `GET /api/v1/whatsapp/qr` | Returns base64 Data URL of the current pairing QR code. |
| `POST /pair` | `POST /api/v1/settings/whatsapp-pair` | Requests an 8-digit companion pairing code for `{ "phone": "..." }`. |
| `POST /reset-session` | `POST /api/v1/settings/whatsapp-reset` | Logs out the current session, wipes stale auth keys, and re-initializes socket. |
| `POST /config` | Synced via `PATCH /api/v1/settings` | Dynamically updates `ownerPhone` and `botPhone` in runtime memory without restarting Node.js. |
| `POST /send` | `POST /api/v1/whatsapp/send-ping` | Dispatches text or PDF document payloads (`to`, `text`, `documentPath`, `caption`). |

---

## 3. Option B: Official Meta WhatsApp Cloud API (`Graph v20.0`)

For enterprise deployments using an official Meta Business Portfolio and WhatsApp Business Account (WABA):

### Connecting from the Dashboard UI (`/settings` or Setup Modal)
1. Open **`/settings`** (or **`⚙️ Setup, WhatsApp & Features` → Step 1**).
2. Click **✅ Official Meta Cloud API (WABA)**.
3. Fill in your 4 Meta Developer credentials:
   - **Meta Phone Number ID** (`WHATSAPP_PHONE_NUMBER_ID`)
   - **WhatsApp Business Account (WABA) ID** (`WHATSAPP_BUSINESS_ACCOUNT_ID`)
   - **Permanent System User Access Token** (`WHATSAPP_ACCESS_TOKEN`, starts with `EAAG...`)
   - **Webhook Verify Token** (`WHATSAPP_VERIFY_TOKEN`, default `wb_agent_verify_token`)
4. Click **Save Official Meta API & Owner Settings**. The backend immediately switches `WHATSAPP_PROVIDER=meta_cloud` in runtime memory, `.workspace_config.json`, and `.env`.
5. In your [Meta App Dashboard](https://developers.facebook.com/), set the Webhook Callback URL to:
   ```text
   https://<your-public-domain-or-ngrok>/api/v1/webhooks/whatsapp
   ```
   and subscribe to the `messages` field.

---

## 4. Multi-Device `@lid` Resolution & Anti-Ban Safeguards

1. **Canonical `@lid` Deduplication**:
   - WhatsApp Multi-Device frequently sends messages from Linked Device IDs (`<id>@lid`) instead of `<phone>@s.whatsapp.net`.
   - Both `whatsapp-bridge/index.js` and `backend/app/utils/phone.py` resolve `@lid` JIDs to their canonical E.164 phone number and automatically consolidate duplicate threads on `GET /api/v1/conversations`.
2. **Group Message AI Suppression (`ADR-0024`)**:
   - Inbound messages from WhatsApp Groups (`@g.us`) never trigger autonomous AI replies; they are logged in `HUMAN` mode and notify the operator.
3. **Anti-Ban Rate Limiting & Jitter (`ADR-0016`, `ADR-0018`)**:
   - Cold outreach campaigns enforce randomized inter-message jitter (**25.0s – 45.0s**), sliding-window rate limits (`SlidingWindowRateLimiter`), quiet hours (`9 PM – 9 AM`), and immediate opt-out compliance (`STOP` / `UNSUBSCRIBE`).

---

## 🔗 Related Documentation
- 🧒 **[Beginner Quick-Start Guide](beginner-quick-start.md)**
- 💼 **[Business Owner & Operator Guide](business-owner-guide.md)**
- 🏛️ **[Senior Developer & Architecture Reference](senior-developer-architecture.md)**
- 🛠️ **[Troubleshooting & Error Catalog](../troubleshooting/error-catalog-and-solutions.md)**
