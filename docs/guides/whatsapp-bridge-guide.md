# WhatsApp Connectivity Guide: Meta Cloud API vs. Self-Hosted Baileys Bridge

WB-Agent supports two distinct WhatsApp connectivity channels. This guide details their technical architecture, operational trade-offs, and configuration steps.

---

## 1. Architectural Comparison

| Dimension | Meta Official Cloud API (`meta_cloud`) | Self-Hosted Bridge (`bridge` via Baileys) |
| :--- | :--- | :--- |
| **Protocol** | Direct HTTPS REST + Webhooks | WebSocket connection to WhatsApp Web servers |
| **Hosting** | Hosted by Meta Infrastructure | Self-hosted Node.js container (`whatsapp-bridge`) |
| **Authentication** | Permanent Bearer Token + Webhook Secret | QR Code pairing via physical mobile phone |
| **Message Billing** | Per-conversation charges by Meta | ₹0 / Free (Standard mobile SIM data plan) |
| **Throughput** | High (Up to 80+ messages/sec) | Moderate (Rate-limited to emulate human typing) |
| **Number Mobility** | Requires clean unlinked phone number | Uses existing WhatsApp Business or personal number |
| **Ideal For** | High-scale enterprise deployments & verified brands | Local B2B SMBs, agile pilots, and zero-cost hosting |

---

## 2. Configuration Walkthrough

### Option A: Self-Hosted Baileys Bridge (Default for Local Development)

1. Start the bridge microservice:
   ```bash
   cd whatsapp-bridge
   npm install
   npm start
   ```
2. Bridge will run on port `3001`.
3. In `.env`, set:
   ```env
   WHATSAPP_PROVIDER=bridge
   WHATSAPP_BRIDGE_URL=http://localhost:3001
   ```
4. Navigate to the Dashboard -> Settings -> WhatsApp tab and scan the rendered QR code with your mobile phone WhatsApp application.

---

### Option B: Meta Official Cloud API (Enterprise Production)

1. Register an app on [developers.facebook.com](https://developers.facebook.com) with the WhatsApp Business product.
2. Configure `.env` with Meta credentials:
   ```env
   WHATSAPP_PROVIDER=meta_cloud
   WHATSAPP_PHONE_NUMBER_ID=your_meta_phone_number_id
   WHATSAPP_BUSINESS_ACCOUNT_ID=your_meta_waba_id
   WHATSAPP_ACCESS_TOKEN=your_meta_system_user_token
   WHATSAPP_VERIFY_TOKEN=your_custom_verification_token
   WHATSAPP_WEBHOOK_SECRET=your_meta_app_secret
   ```
3. Set your Meta Webhook URL to: `https://your-domain.com/api/v1/webhooks/whatsapp`
4. Subscribe to the `messages` webhook event.

---

## 3. Ban Prevention & Safe Messaging Guidelines
Regardless of provider, enforce these guidelines:
- Adhere to `RATE_LIMIT_MAX_REQUESTS` in `.env` (recommended max 15 msgs/min for cold leads).
- Honor opt-outs immediately if customer replies "STOP" or "UNSUBSCRIBE".
- Do not spam cold lists without business relevance.
