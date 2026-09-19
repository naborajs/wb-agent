# ADR 0022: Simulation Sandbox Isolation and Live WhatsApp Guardrails

## Status
Accepted

## Date
2026-09-19

## Context
During live production testing, a critical operational discrepancy was identified:
1. **Phantom Inbound Customer Inquiry**: The Dashboard Live Inbox displayed an incoming message from a contact (`+919876543210`, "Wholesale Partner") stating:
   > *"We need 250 units for next week shipment. What volume discount can you offer?"*
2. **Missing WhatsApp Web Message**: Upon inspecting the actual WhatsApp Web client for `+91 98765 43210`, the contact had never sent this message.
3. **Unprompted Outbound Spam**: The WhatsApp client showed outbound messages sent to that phone number (e.g. *"Hello Kavita, reaching out regarding your bulk tea inquiry"*, and manual operator replies *"hi"*), creating confusion that the system was hallucinating customer inquiries and randomly messaging numbers.

### Root Cause Analysis
1. **Simulation Channel Pollution**: The `/api/v1/whatsapp/simulate-inbound` endpoint and Overview page "The Money Moment" simulator provisioned conversation records with `channel="whatsapp"` in the primary database without `is_simulation` metadata. This placed simulated demo queries into the live inbox alongside real incoming WhatsApp customer messages.
2. **Manual Operator Reply Dispatch Leak**: When an operator saw the "250 units" inquiry in the Live Inbox and typed a response, `send_manual_operator_message` checked only `conv.channel_id` and dispatched the text directly through the live Baileys WhatsApp Bridge, contacting the real subscriber holding that number.
3. **Test Suite Dispatch Leaks**: Extended tests (`test_conversations_extended.py`) had tested the `/initiate` endpoint with test number `91 98765 43210`, which previously dispatched real outbound WhatsApp messages whenever executed outside dry-run mode.

---

## Decisions

### 1. Centralized Sandbox & Dummy Phone Guard (`is_sandbox_test_phone`)
Implemented `is_sandbox_test_phone` in `backend/app/utils/phone.py`. It inspects destination numbers against known dummy sequences (`+919876543210`, `+919999988888`, `+919999911111`, `+91987654...`, `+1555...`, repeated digit patterns).

### 2. Provider-Level Outbound Safety Interceptors
Integrated `is_sandbox_test_phone` directly inside `BridgeWhatsAppProvider` and `MetaCloudWhatsAppProvider` (`send_message`, `send_template`, `send_document`). Outbound dispatches to sandbox numbers are automatically intercepted, logged, and acknowledged with synthetic confirmations without emitting network packets over Baileys or Meta Graph API.

### 3. Strict Channel Separation (`channel="simulation"`)
- Refactored `/api/v1/whatsapp/simulate-inbound` and `/api/v1/agent/simulate` to exclusively assign `channel="simulation"`.
- Tagged `metadata_json={"is_simulation": True}` and assigned `company_type="simulation"` to customer profiles.
- Added `channel` query filtering to `GET /api/v1/conversations`.

### 4. Operator Manual Reply Protection
Updated `send_manual_operator_message` in `backend/app/api/routes/conversations.py`. If a conversation has `channel != "whatsapp"`, `is_simulation=True`, or is addressed to a sandbox phone, external WhatsApp transmission is bypassed. Replies are recorded locally with `status="delivered"` and `provider_message_id="sim_operator_..."`.

### 5. Live Inbox UI Transparency & Segmentation
Updated `dashboard/app/conversations/page.tsx`:
- **Segmentation Tabs**: Operators default to the **WhatsApp Live** tab, displaying only authentic inbound customer queries. Simulated threads reside in the dedicated **🧪 Simulated** tab.
- **Visual Indicators**: Simulated threads display `[SIM]` tags in the sidebar, a `[🧪 Sandbox Simulation]` badge in the header, and an alert banner explaining that replies will not be sent to real WhatsApp.
- **Message Labels**: Inbound simulation bubbles are clearly labeled `🧪 Simulated Customer` rather than `Customer`.

### 6. Database Sanitization
Created and executed `scripts/sanitize_simulation_conversations.py` to isolate 5 historical simulated conversations and 42 messages in the SQLite database to `channel="simulation"`.

---

## Consequences
- Completely eliminates the risk of phantom customer inquiries being mistaken for real leads.
- Eliminates unprompted outbound WhatsApp spam to real subscribers.
- Provides a completely isolated, safe sandbox environment where operators can test prompt reasoning and simulation turns without touching live telecom networks.
