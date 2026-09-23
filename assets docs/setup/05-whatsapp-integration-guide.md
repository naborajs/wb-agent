---
title: 05. WhatsApp Simulator & Meta Cloud API Integration Guide
tags: [setup, whatsapp, meta, cloud-api, webhooks, simulator, hmac, obsidian]
updated: 2026-09-02
aliases: [WhatsApp Integration, Meta Cloud API, WhatsApp Webhooks]
status: complete
---

# 📱 05. WhatsApp Simulator & Meta Cloud API Integration Guide

> [!NOTE]
> WB-Agent features a clean provider abstraction (`WhatsAppProvider`). You can develop and test 100% locally with the built-in **Simulator Provider**, or connect to live customer mobile phones with the official **Meta Cloud API (Graph API v20.0+)**.
>
> ⬅️ Previous Step: [[04-dashboard-frontend-setup|04. Next.js 14 Dashboard Setup]]  
> ➡️ Next Step: [[06-nvidia-nemotron-and-llm-setup|06. NVIDIA Nemotron & LLM Router]]

---

## 🏗️ WhatsApp Provider Architecture

```mermaid
flowchart TD
    Customer["Buyer on WhatsApp"] -->|Inbound HTTPS POST| MetaEdge["Meta WhatsApp Cloud API"]
    MetaEdge -->|Signed Webhook (X-Hub-Signature-256)| Tunnel["Reverse Proxy / ngrok Tunnel"]
    Tunnel --> Webhook["FastAPI /api/v1/webhooks/whatsapp"]

    Dev["Local Developer / Pytest"] -->|Simulated Turn| SimProvider["SimulatorWhatsAppProvider"]
    SimProvider --> Webhook

    Webhook --> HMAC{"HMAC-SHA256 Signature Valid?"}
    HMAC -->|Yes| Enqueue["Enqueue to Durable Job Queue"]
    HMAC -->|No| Reject["403 Forbidden"]

    Enqueue --> Worker["Worker Daemon Processing Turn"]
    Worker --> Dispatch{"Active Provider"}
    Dispatch -->|Simulator Mode| Outbox["In-Memory Outbox Log"]
    Dispatch -->|Meta Cloud Mode| MetaAPI["POST graph.facebook.com/v20.0/messages"]
```

---

## 🧪 Part 1: Local Simulator Mode (Default)

The simulator lets you run tests, benchmark personas, and test live dashboard takeovers without needing a Meta developer account or spending money on WhatsApp conversations.

### 1. Enable Simulator in `.env`
```ini
WHATSAPP_PROVIDER=simulator
WHATSAPP_VERIFY_TOKEN=wb_agent_verify_token
```

### 2. Simulate Inbound WhatsApp Webhook
You can simulate a customer sending a WhatsApp message by making a POST request to `/api/v1/webhooks/whatsapp`:

```bash
curl -X POST "http://localhost:8000/api/v1/webhooks/whatsapp" \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [
      {
        "changes": [
          {
            "value": {
              "messages": [
                {
                  "from": "918900653250",
                  "id": "wamid_sim_test_001",
                  "timestamp": "1725300000",
                  "type": "text",
                  "text": { "body": "Hi, what is your wholesale price for 50kg Assam CTC?" }
                }
              ]
            }
          }
        ]
      }
    ]
  }'
```

### 3. Verify Message Ingestion
The message will automatically create a Customer, start a Conversation thread, enqueue a `process_message` job, and respond autonomously!

---

## 🌐 Part 2: Official Meta Cloud WhatsApp API Setup

To connect real customer WhatsApp numbers to WB-Agent in staging or production:

### 1. Create a Meta Developer App
1. Go to [developers.facebook.com](https://developers.facebook.com/) and log in.
2. Click **My Apps** → **Create App**.
3. Select **Business** as the app type.
4. Name your app (e.g., `WB-Agent North Bengal Tea`).
5. In the App Dashboard, locate **WhatsApp** and click **Set up**.

### 2. Obtain Credentials
Navigate to **WhatsApp** → **API Setup** in the developer console to retrieve:
- **Phone Number ID**: (e.g., `105938472910482`)
- **WhatsApp Business Account (WABA) ID**: (e.g., `102938475619283`)
- **Temporary Access Token**: (used for initial tests)

### 3. Generate a Permanent System User Token
> [!IMPORTANT]
> Temporary tokens expire after 24 hours. For production:
1. Go to **Meta Business Suite** → **Settings** → **Users** → **System Users**.
2. Click **Add**, name the user (e.g., `wb-agent-system`), and select role **Admin**.
3. Click **Generate New Token**, select your WhatsApp App, and choose permissions:
   - `whatsapp_business_messaging`
   - `whatsapp_business_management`
4. Copy the generated permanent token.

### 4. Configure `.env`
Update your `.env` configuration:
```ini
WHATSAPP_PROVIDER=meta_cloud
WHATSAPP_PHONE_NUMBER_ID=your_actual_phone_number_id
WHATSAPP_BUSINESS_ACCOUNT_ID=your_waba_id
WHATSAPP_ACCESS_TOKEN=EAAG...your_permanent_system_user_token
WHATSAPP_VERIFY_TOKEN=create_a_strong_secret_verify_token_here
WHATSAPP_API_VERSION=v20.0
WHATSAPP_WEBHOOK_SECRET=your_app_secret_from_app_settings_basic
```

---

## 🔄 Part 3: Webhook Verification & Local Tunneling

Meta requires an accessible public HTTPS URL to deliver webhook events. For local development, use **ngrok** or **Cloudflare Tunnel**:

### 1. Launch ngrok Tunnel
In a new terminal:
```bash
ngrok http 8000
```
Copy the secure forwarding URL (e.g., `https://abc-123.ngrok-free.app`).

### 2. Configure Webhook in Meta Console
1. In Meta Developer Console, go to **WhatsApp** → **Configuration**.
2. Click **Edit** under **Webhook**:
   - **Callback URL**: `https://abc-123.ngrok-free.app/api/v1/webhooks/whatsapp`
   - **Verify Token**: Must exactly match `WHATSAPP_VERIFY_TOKEN` in your `.env`.
3. Click **Verify and Save**.
   - Meta sends a `GET` request with `hub.mode=subscribe`, `hub.verify_token`, and `hub.challenge`.
   - WB-Agent verifies the token and immediately returns `hub.challenge`.
4. Under **Webhook Fields**, click **Manage** and subscribe to:
   - `messages` (inbound buyer text)
   - `message_template_status_update` (template approvals)

---

## 🛡️ Part 4: Cryptographic HMAC Signature Verification

Every incoming POST webhook from Meta includes the HTTP header:
`X-Hub-Signature-256: sha256={hash}`

In `MetaCloudWhatsAppProvider`:
```python
def verify_signature(self, payload_bytes: bytes, signature_header: str) -> bool:
    expected_sig = hmac.new(
        self.app_secret.encode("utf-8"),
        payload_bytes,
        hashlib.sha256,
    ).hexdigest()
    received_sig = signature_header.split("sha256=")[1]
    return hmac.compare_digest(expected_sig, received_sig)
```
If an attacker attempts to spoof messages without the app secret, the request is rejected with `403 Forbidden`.

---

## 🚨 Common WhatsApp Pitfalls & Solutions

- **403 Forbidden on Verification**: Verify token mismatch. See [[error-catalog-and-solutions#whatsapp-webhook-403-forbidden|Error Catalog: Webhook 403]].
- **400 Bad Request on Outbound Send**: Recipient phone not formatted to E.164. Ensure phone numbers start with `+` and country code (e.g., `+918900653250`).
- **24-Hour Window Expiry**: Regular freeform text can only be sent within 24 hours of customer's last message. Outside that window, use approved WhatsApp Business Templates.

---

## 🔀 Next Step
With WhatsApp configured:
👉 Proceed to **[[06-nvidia-nemotron-and-llm-setup|06. NVIDIA Nemotron & LLM Router]]** to configure the reasoning model.
