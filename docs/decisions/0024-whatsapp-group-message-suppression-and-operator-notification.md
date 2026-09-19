# ADR 0024: WhatsApp Group Message Auto-Reply Suppression and Real-Time Operator Notification

## Status
Accepted

## Date
2026-09-19

## Context
In WhatsApp business environments, the bot number may be added to WhatsApp group chats (e.g. wholesale supplier groups, tea trade forums, logistics coordination groups) alongside individual direct messaging (1-on-1 chats).

Allowing autonomous AI sales conversational agents (EDITH) to blindly auto-reply in multi-participant group chats presents critical operational risks:
1. **Chat Spam & Disruption**: Automated sales qualification scripts, multi-turn questions, or pricing quotes sent into a public group will spam everyone in the group.
2. **Context Ambiguity**: In group chats, messages are often directed between other third-party members. An AI model parsing only raw messages without participant awareness could mistakenly respond to messages not meant for the business.
3. **Loss of Control**: Uncontrolled automated messaging in industry trade groups can harm company reputation and violate WhatsApp's Anti-Spam Terms of Service, risking bot phone suspension.
4. **Visibility Requirement**: Operators still need to know when messages are sent in groups where the business is present, view the thread on the dashboard, and respond manually at their discretion.

---

## Decisions

### 1. WhatsApp Group JID Recognition & Normalization (`phone.py`)
- WhatsApp groups in Baileys and Meta protocols use the `@g.us` domain (e.g., `120363024845918234@g.us`).
- Added `is_whatsapp_group_jid(jid: Optional[str]) -> bool` in `backend/app/utils/phone.py`.
- Updated `clean_phone_digits` and `normalize_phone_number` to detect `@g.us` JIDs and preserve them intact rather than stripping non-digit characters or enforcing E.164 phone formatting.

### 2. Provider Ingestion & Metadata Propagation (`whatsapp-bridge` & `simulator.py`)
- In `whatsapp-bridge/index.js`, eliminated the unconditional drop of `@g.us` messages (`if (!remoteJid || remoteJid.includes("@g.us")) continue;`).
- Extracted sender participant phone number (`msg.key.participant`) and group subject name (`sock.groupMetadata(remoteJid)`).
- Extended `InboundWhatsAppEvent` with `is_group: bool`, `group_id: Optional[str]`, `group_name: Optional[str]`, and `participant: Optional[str]`.
- Updated `/send` and `/send-document` in `whatsapp-bridge/index.js` to recognize `@g.us` destinations and dispatch directly to group JIDs without stripping non-digits.

### 3. Fail-Closed Auto-Reply Suppression at Inbound Webhook (`webhooks.py`)
- In `backend/app/api/routes/webhooks.py`:
  - When an inbound message has `event.is_group=True` or `clean_sender.endswith("@g.us")`:
    1. Creates/retrieves a Customer entity tagged with `company_type="whatsapp_group"` and the group name.
    2. Creates/retrieves a Conversation entity with `channel="whatsapp"` and `channel_id=clean_sender`.
    3. **Enforces `mode = "HUMAN"`**: Guarantees the conversation is permanently locked in Human Operator mode.
    4. Records the inbound message with `sender_id` set to the participant's phone number.
    5. **Creates an `AgentNotification`**: Category `GROUP_MESSAGE`, severity `warning`, linking directly to `/conversations?id={conv.id}`.
    6. **WebSocket Live Push**: Broadcasts `agent_notification` and `new_message` to dashboard operators in real time.
    7. **CRITICAL GUARD**: Completely bypasses `job_queue.enqueue("process_message")`, ensuring the background worker never queues an AI decision turn.

### 4. Defense-in-Depth Suppression in Orchestrator (`orchestrator.py`)
- Even if an operator or automated script attempts to invoke `AgentOrchestrator.process_turn` on a group thread:
  - An early check identifies group conversations via `conv.metadata_json.get("is_group")` or `conv.channel_id.endswith("@g.us")`.
  - Immediately returns `AgentTurnResponse(is_suppressed=True, reply_text="", decision=StructuredDecision(intent="group_chat_suppressed", reason_code="GROUP_MESSAGE_AI_DISABLED"))`.
  - Re-asserts `conv.mode = "HUMAN"`.

### 5. Operator Dashboard Experience (`conversations/page.tsx`)
- **Groups Filter Tab**: Added `👥 Groups ({count})` tab alongside `WA Direct`, `🧪 Sim`, and `All`.
- **Sidebar Badge**: Every group conversation displays a prominent `👥 GROUP` amber pill.
- **Active Header Indicator**: Displays `👥 Operator Only (Group)` instead of the AI Resume/Takeover toggle, preventing accidental activation of autonomous replies.
- **Warning Banner**: A top alert banner clearly informs operators: *"👥 WhatsApp Group Chat: AI auto-reply is disabled for groups. Responses are dispatched to the group only when you send an Operator Reply below."*
- **Participant Identification**: Inbound message bubbles display the sender's individual phone number instead of generic "Customer".

---

## Consequences
- **Zero Group Spam**: AI models (EDITH and FRIDAY) will never autonomously output unsolicited messages into WhatsApp groups.
- **Instant Operator Awareness**: Incoming group discussions immediately trigger real-time website notifications and unread badges.
- **Manual Control**: Operators can read all group discussions and type replies from the dashboard when appropriate.
- **Full Verification**: Complete test coverage in `backend/tests/unit/test_group_messages.py` and `backend/tests/unit/test_phone_utils.py` validates both unit functions and end-to-end webhook flows.
