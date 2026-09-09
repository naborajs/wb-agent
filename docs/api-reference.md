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

## 6. Realtime Streaming
- `WS /api/v1/ws?org_id={org_id}`: Real-time WebSocket connection broadcasting `new_message`, `stage_changed`, `hot_lead`, and `handoff_requested`.

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


