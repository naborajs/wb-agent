# REST API & WebSocket Reference

All endpoints are versioned under `/api/v1`. Interactive OpenAPI documentation is accessible at `/api/v1/docs`.

---

## 1. Authentication
- `POST /api/v1/auth/login`: Authenticates operator email & password, returns JWT token.
- `GET /api/v1/auth/me`: Returns profile of authenticated user.

## 2. Health & Telemetry
- `GET /api/v1/health`: Liveness probe.
- `GET /api/v1/readiness`: Readiness probe testing database and WhatsApp provider connectivity.

## 3. Leads Management
- `GET /api/v1/leads`: Paginated lead list with filtering by status and text query.
- `GET /api/v1/leads/{id}`: Lead details and event timeline.
- `PATCH /api/v1/leads/{id}`: Update lead score or status.
- `POST /api/v1/leads/import`: Multipart CSV upload running 10-step normalization and validation pipeline.

## 4. Live Conversations & Operator Takeover
- `GET /api/v1/conversations`: Paginated conversation inbox with status, hot flame indicator, and unread counts.
- `GET /api/v1/conversations/{id}`: Complete thread history, customer profile, and verified memories.
- `POST /api/v1/conversations/{id}/takeover`: Switches mode between `AI`, `HUMAN`, `PAUSED`, and `CLOSED`.
- `POST /api/v1/conversations/{id}/messages`: Dispatches manual human message to customer WhatsApp.

## 5. Products & Deterministic Pricing
- `GET /api/v1/products`: Product catalog, regional origins, grades, and packaging variants.
- `GET /api/v1/pricing/rules`: Active volume tier rules.
- `POST /api/v1/pricing/calculate`: Computes deterministic quote with discount bounds and MOQ enforcement.

## 6. Realtime Streaming & WebSockets
- `WS /api/v1/ws?org_id={org_id}`: Primary organization event bus broadcasting `new_message`, `stage_changed`, `hot_lead`, `handoff_requested`, `message_status_update`, `watchdog_alert`, `watchdog_alert_resolved`, `agent_notification`, and `friday_ui_action`.
- `WS /api/v1/ws/conversations`: Dedicated live chat stream carrying `agent_thinking` status, model deliberation, and streaming tokens.
- **Client Protocol Helper**: Frontend uses `getWebSocketUrl(path)` from `@/lib/utils` to dynamically negotiate `wss://` / `ws://` across reverse proxies and cloud deployments.

## 7. Webhooks
- `GET /api/v1/webhooks/whatsapp`: Meta GET verification challenge.
- `POST /api/v1/webhooks/whatsapp`: Inbound customer messages and delivery receipts.

## 8. Dual-Brain System & Inter-Brain Agency
- `POST /api/v1/brain/chat`: Chat directly with Friday with contextual awareness of files, contacts, and telemetry.
- `POST /api/v1/brain/request-edith`: Delegates WhatsApp tasks to EDITH with independent commercial policy evaluation and refusal rights.
- `POST /api/v1/brain/edith-to-friday`: EDITH delegates an action to Friday; Friday evaluates and can refuse non-emergency audio interruptions. If refused, EDITH triggers direct fallback alert.
- `GET /api/v1/brain/briefing`: Generates dynamic executive morning/daily audio debrief script with pipeline value, hot leads, margin defenses, and compute costs.
- `GET /api/v1/brain/hourly-velocity`: 24-hour inbound traffic velocity, peak hours, autonomous conversions vs handoffs, and 1.1s turn latency curve.
- `POST /api/v1/brain/background-think`: Triggers mutual idle background thinking & synaptic health audit across both brains.
- `POST /api/v1/brain/toggle-safe-mode`: Toggles autonomous safe mode / pause AI.
- `GET /api/v1/brain/safe-mode`: Returns whether autonomous safe mode is active.
- `GET /api/v1/brain/telemetry`: Real-time token usage, model telemetry, context utilization, and comparative economics.
- `POST /api/v1/brain/benchmark-model`: Live benchmark test calculating real latency, tokens, and cost.
- `GET /api/v1/brain/dialogues`: Chronological audit log of thoughts, requests, refusals, and debriefs across the Inter-Brain bus.
- `POST /api/v1/brain/campaign-draft`: Natural language campaign drafting by Friday with EDITH guardrail validation and live CRM lead resolution.
- `POST /api/v1/brain/campaign-draft/launch`: Approves and launches a drafted campaign spec.

---

## 9. Campaign Management & Anti-Ban Cold Outreach
- `GET /api/v1/campaigns`: List all outreach campaigns with real-time computed stats (total leads, sent, delivered, replies, response rate) from real `CampaignLead` rows.
- `GET /api/v1/campaigns/{id}`: Single campaign detail with lead dispatch progress.
- `POST /api/v1/campaigns`: Creates a new campaign in draft status with scheduling windows, jitter bounds (15s–90s), stop conditions, and personalization settings.
- `POST /api/v1/campaigns/{id}/launch`: Enrolls matching CRM leads as `CampaignLead` rows and activates dispatch. Blocks if matching leads = 0.
- `POST /api/v1/campaigns/{id}/pause`: Suspends campaign dispatch.
- `POST /api/v1/campaigns/{id}/resume`: Resumes suspended campaign dispatch.
- `GET /api/v1/campaigns/{id}/leads`: Detailed per-lead dispatch roster with personalized messages and delivery receipts.
- `GET /api/v1/campaigns/segments`: Returns distinct company types and lead counts from the database for targeting.
- `GET /api/v1/campaigns/followups`: Returns scheduled and historic follow-up sequence jobs with customer, conversation, and preflight policy metadata.
- `POST /api/v1/campaigns/followups/{id}/cancel`: Cancels a scheduled follow-up job to prevent autonomous dispatch.
- `DELETE /api/v1/campaigns/{id}`: Removes or archives campaign.

---

## 10. Friday Operational Action Registry
- `GET /api/v1/friday/actions`: Returns the full registry of UI and backend operations Friday can invoke on operator command.
- `GET /api/v1/friday/actions/{action_name}/describe`: Returns what a specific action does, its parameters, and system state modifications.
- `POST /api/v1/friday/actions/{action_name}`: Executes an operational action with `actor: friday_agent`, logged to `AuditLog` and `AgentNotification`.

---

## 11. EDITH Dispatch Observability & Telemetry
- `GET /api/v1/edith/activity/summary`: Aggregate outreach telemetry: total messages dispatched (all-time and today), distinct leads contacted, replies received, overall response rate, and active campaign counts. Sourced from real CRM records.
- `GET /api/v1/edith/activity/campaigns/{campaign_id}`: Detailed dispatch breakdown for a single campaign with lead-by-lead timestamps.
- `GET /api/v1/edith/activity/contacted-leads`: Paginated list of all leads contacted by EDITH with exact delivery statuses.

---

## 12. Chat-Driven Agentic Campaign Creation
- `POST /api/v1/brain/campaign-draft`: Operator describes campaign intent; Friday drafts structured campaign spec (name, target segment, quota, template, scheduling, jitter, stop conditions, personalization) and EDITH evaluates against commercial and anti-ban guardrails (`ACCEPTED`, `FLAGGED`, or `DENIED` with reasoning).
- `POST /api/v1/brain/campaign-draft/launch`: Approves and launches the validated draft into the live campaign engine.

---

## 13. Pro-Forma Invoices & PDF Generation
- `POST /api/v1/invoices/generate`: Compiles a commercial pro-forma invoice PDF deterministically with itemized pricing, discounts, taxes, and bank details.
- `GET /api/v1/invoices/download?file={filename}`: Safely serves generated invoice PDF documents with path sanitization.
- `POST /api/v1/invoices/quotes/{quote_id}/pdf`: Renders a pro-forma invoice PDF from an existing auditable database `Quote` record.
- `POST /api/v1/invoices/quotes/{quote_id}/send-whatsapp`: Generates and immediately dispatches the invoice PDF to the customer's WhatsApp with an itemized breakdown and rate-lock caption.

---

## 14. Commercial Quotes & Lifecycle Management
- `GET /api/v1/quotes`: Lists commercial quotes with optional filtering by `customer_id` and `status` (`draft`, `sent`, `accepted`, `expired`, `rejected`).
- `POST /api/v1/quotes`: Creates a new auditable commercial quote with automatic pricing calculation, MOQ checks, and validity window.
- `GET /api/v1/quotes/{id}`: Detailed quote view with line items, applied discount tiers, and customer profile.
- `PATCH /api/v1/quotes/{id}/status`: Transitions quote status through the commercial sales lifecycle.

---

## 15. Autonomous Watchdog AI Supervisor & Telemetry
- `GET /api/v1/watchdog/alerts`: Returns active, unresolved diagnostic anomalies categorized by severity (`low`, `medium`, `high`, `critical`).
- `POST /api/v1/watchdog/alerts/{id}/resolve`: Marks a watchdog diagnostic alert as resolved with operator notes.
- `POST /api/v1/watchdog/run-audit`: Manually triggers an immediate comprehensive diagnostic pass covering stalled conversations, unapproved discounts, and guardrail holds.

---

## 16. Agent Notifications & System Alerts
- `GET /api/v1/notifications`: Paginated feed of system and agent alerts with unread counter.
- `POST /api/v1/notifications/{id}/read`: Marks a specific notification as read.
- `POST /api/v1/notifications/read-all`: Bulk-dismisses all unread notifications for the active organization.

---

## 17. Voice Agent & Speech Processing
- `POST /api/v1/voice/session-token`: Mints ephemeral WebSocket session tokens for browser-based real-time voice streaming with Gemini Live (`gemini-3.1-flash-live-preview`).
- `POST /api/v1/audio/transcribe`: Ingests inbound WhatsApp voice notes (OGG/Opus, MP3, WAV) and returns normalized text transcripts.
- `POST /api/v1/audio/synthesize`: Synthesizes outbound audio voice responses for hands-free audio debriefs.

---

## 18. Modular Prompts & Architecture Copilot
- `GET /api/v1/prompts`: Returns active versions of all 7 dynamic system prompt sections (`identity_role`, `safety_policy`, `sales_style`, `product_catalog`, `pricing_rules`, `objection_handling`, `closing_rules`).
- `GET /api/v1/prompts/{identifier}`: Returns details of a specific prompt section.
- `GET /api/v1/prompts/{identifier}/history`: Returns complete rollback version history with quality scores, letter grades (`A+`, `A`, `B+`), and author metadata.
- `POST /api/v1/prompts/{identifier}/ai-optimize`: Autonomous prompt engineering synthesis using NemoTron-3-Super-120B.
- `PUT /api/v1/prompts/{identifier}`: Deploys a new version of the specified prompt section.
- `POST /api/v1/prompts/{identifier}/rollback/{version}`: Rolls back to any historic version atomically.
- `DELETE /api/v1/prompts/{identifier}/history`: Prunes inactive versions while preserving the active production version.



