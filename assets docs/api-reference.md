---
title: "Complete REST API & WebSocket Reference (27 Routers / 138 Endpoints)"
tags: [api, rest, websocket, openapi, endpoints, edith, friday, whatsapp, rag, pricing, ns]
updated: 2026-09-29
aliases: [API Reference, REST API, WebSocket Protocol]
status: complete
---

# 🔌 Complete REST API & WebSocket Reference

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Engineered by [Naboraj Sarkar (NS)](https://naborajs.me)*  
> 📖 **Official Live Documentation**: [naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs](https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs)  
> All endpoints are mounted under `/api/v1` (plus 2 root-level convenience routes). Interactive Swagger UI is live at `http://localhost:8000/api/v1/docs` and ReDoc at `http://localhost:8000/api/v1/redoc`.

---

## 1. Root, Health, Readiness & System Diagnostics (`main.py`, `health.py`, `system.py`)
- `GET /`: Root platform status, environment, version, creator (`naborajs.me`), official docs hub, project page, story blog, portfolio, and full 12-chapter online routing index.
- `GET /api/v1/health`: Lightweight liveness probe (`{"status": "ok"}`).
- `GET /api/v1/readiness`: Readiness probe verifying SQLite/PostgreSQL connectivity and active WhatsApp provider status.
- `GET /api/v1/system/info`: Returns OS platform, Python runtime, uptime, active AI models, and gateway configuration.
- `GET /api/v1/system/database-stats`: Returns record counts across primary business tables and SQLite file size metrics.
- `POST /api/v1/system/vacuum`: Triggers an asynchronous SQLite `VACUUM`, `PRAGMA integrity_check`, and index optimization.

---

## 2. Workspace Settings, AI Business Architect & WhatsApp Gateway Controls (`settings.py`)
- `GET /api/v1/settings`: Returns operational toggles, 16 business profile/negotiation/policy rules, follow-up cadence, and active WhatsApp gateway mode (`unofficial` vs `official`).
- `PATCH /api/v1/settings`: Updates operational toggles, business guardrails, owner WhatsApp phone, and official Meta Cloud API vs. unofficial Baileys parameters (persisted to `.workspace_config.json` and `.env`).
- `GET /api/v1/settings/workspace-config`: Returns complete workspace state including `ui_mode` (`simplified` | `advanced`), 13 `feature_toggles`, `industry_presets` (6 built-in + custom), and live WhatsApp bridge status.
- `POST /api/v1/settings/workspace-config`: Updates UI mode, 13 feature toggles, owner WhatsApp number, official/unofficial WhatsApp mode, and business profile; broadcasts `workspace_config_updated` over WebSockets.
- `POST /api/v1/settings/ai-autofill-business`: **AI Business Auto-Fill Architect** — takes a plain-English business description (`{"prompt": "..."}`), synthesizes all 16 business identity, persona, pricing guardrail, and policy fields via `AIRouter` (with deterministic industry fallback), saves as a preset, and seeds 4 tailored products into SQLite.
- `POST /api/v1/settings/industry-preset`: Switches the workspace to any of the 6 built-in or custom industry presets (`ecommerce_retail`, `b2b_wholesale`, `saas_software`, `healthcare_clinic`, `real_estate`, `tea_agro`, or `custom_*`) and seeds sample catalog products.
- `POST /api/v1/settings/custom-preset`: Creates and persists a new Custom Industry Domain Preset in `.workspace_config.json` and optionally seeds starter products.
- `POST /api/v1/settings/quick-add-info`: 1-click quick-add for a new Product SKU (`product_name`, `base_price`, `floor_price`, `unit`) or Business Knowledge/Pricing Rule (`knowledge_note`).
- `POST /api/v1/settings/whatsapp-reset`: Logs out and resets the active WhatsApp Baileys session (`:3001/reset-session`) so a new user can scan a fresh QR code or pair a different phone.
- `POST /api/v1/settings/whatsapp-pair`: Requests an 8-digit WhatsApp companion pairing code (`{"phone": "91..."}`).
- `POST /api/v1/settings/verify-end-to-end`: Runs a 5-point End-to-End Health Verification across FastAPI/SQLite Catalog, Friday Gemini Live, EDITH NVIDIA NIM, WhatsApp Gateway (Official or Unofficial), and Owner Escalation Channel (with optional live WhatsApp test ping `{"send_test_ping": true}`).
- `GET /api/v1/settings/models`: Returns configured primary thinking model, chained fallback sequence, masked API keys, temperature/token limits, and the catalog of 15+ available models.
- `POST /api/v1/settings/models`: Updates primary model, fallback sequence, API keys, and hyperparameters (persisted to `.env` and runtime memory).
- `POST /api/v1/settings/models/test`: Benchmarks live inference connectivity and latency (ms) for a specified model ID.
- `GET /api/v1/settings/ai/metrics`: Returns real-time token, latency, and circuit-breaker telemetry for the AI router layer.

---

## 3. Dual-Brain System, Synaptic Bus, Playground & Code Self-Inspection (`brain.py`)
- `GET /api/v1/brain/status`: Returns live architectural status and operational identity for both Friday and EDITH.
- `POST /api/v1/brain/chat`: Direct conversational chat with Friday grounded in live workspace files, CRM contacts, and system telemetry.
- `POST /api/v1/brain/request-edith`: Delegates a WhatsApp or commercial task from Friday to EDITH; EDITH independently evaluates margin/policy guardrails and can exercise autonomous refusal (`REFUSED`).
- `POST /api/v1/brain/edith-to-friday`: EDITH delegates an operator alert to Friday; Friday can refuse non-emergency audio interruptions during focus mode, triggering EDITH's autonomous fallback to `AgentNotification`.
- `POST /api/v1/brain/edith-debrief`: EDITH posts autonomous operational and commercial debriefs to Friday.
- `POST /api/v1/brain/deliberate`: Runs a live multi-turn collaborative strategic deliberation between Friday and EDITH over the `InterBrainBus`.
- `POST /api/v1/brain/background-think`: Triggers mutual idle background thinking and synaptic health audits across both brains.
- `GET /api/v1/brain/dialogues`: Chronological audit ledger of thoughts, delegations, refusals, and debriefs across the `InterBrainBus`.
- `GET /api/v1/brain/briefing`: Synthesizes an executive morning/daily audio briefing script (`?timeframe=today|yesterday`) with pipeline revenue, hot leads, margin defenses, and compute cost.
- `GET /api/v1/brain/hourly-velocity`: Returns 24-hour inbound traffic velocity, peak hours, autonomous conversions vs. human handoffs, and turn latency curve.
- `POST /api/v1/brain/toggle-safe-mode`: Toggles autonomous safe mode / pause AI.
- `GET /api/v1/brain/safe-mode`: Returns whether autonomous safe mode is currently active.
- `GET /api/v1/brain/telemetry`: Real-time token usage, model latency, context window utilization, and cloud cost savings telemetry.
- `GET /api/v1/brain/model-roles`: Returns active model assignments for all 5 system roles (`friday_web_model`, `edith_sales_model`, `friday_voice_model`, `edith_policy_model`, `system_watchdog_model`) plus 18 supported Gemini & NVIDIA NIM models.
- `POST /api/v1/brain/model-roles`: Updates the 5-role dynamic model assignments in runtime memory and `.env`.
- `POST /api/v1/brain/benchmark-model`: Executes a live benchmark prompt against any model, returning latency, tokens, and cost.
- `POST /api/v1/brain/playground/chat`: Multi-model AI Negotiation Playground completion endpoint with custom persona, temperature, and live telemetry.
- `POST /api/v1/brain/upgrade-prompt`: Upgrades a raw user prompt into a structured, high-precision system instruction via NVIDIA NIM / Gemini.
- `POST /api/v1/brain/voice-knowledge-action`: Executes voice-driven Knowledge Hub CRUD actions delegated from Friday to EDITH.
- `POST /api/v1/brain/campaign-draft`: Chat-driven campaign architect — Friday drafts a structured campaign spec from natural language and EDITH validates anti-ban/margin guardrails (`ACCEPTED`, `FLAGGED`, `DENIED`).
- `POST /api/v1/brain/campaign-draft/launch`: Approves and launches a drafted campaign spec into the live campaign engine.
- `GET /api/v1/brain/diagnostics`: Returns deep operational diagnostics, DB table row counts, and active model health.
- `GET /api/v1/brain/code/tree`: Returns the repository file/directory tree for AI self-inspection.
- `POST /api/v1/brain/code/read`: Reads repository source code files with line numbers for Friday/EDITH code inspection.
- `POST /api/v1/brain/code/search`: Searches the repository codebase for functions, classes, config keys, or error strings.
- `POST /api/v1/brain/code/diagnose`: Parses a traceback or error message, locates offending source lines, and synthesizes a root-cause diagnosis.
- `POST /api/v1/brain/reports`: Submits a structured problem or capability gap report into Friday's issue registry (`friday_reports.jsonl`).
- `GET /api/v1/brain/reports`: Lists recorded Friday problem and capability gap reports.
- `PATCH /api/v1/brain/reports/{report_id}/resolve`: Marks a problem report as resolved with developer notes.

---

## 4. WhatsApp Bridge, Webhooks & Direct Agent Turn (`whatsapp.py`, `webhooks.py`, `agent.py`)
- `GET /api/v1/whatsapp/status`: Real-time connection status, auto-detected `bot_phone`, QR availability, and active provider.
- `GET /api/v1/whatsapp/qr`: Retrieves the current QR code base64 Data URL from the Baileys bridge (`:3001/qr-data`).
- `GET /api/v1/whatsapp/qr-embed`: Proxies the interactive HTML QR pairing page (`:3001/qr?embed=1`) so cloud/remote dashboards can render the pairing iframe without exposing port `3001`.
- `POST /api/v1/whatsapp/pair`: Requests an 8-character phone pairing code from the Baileys bridge (`:3001/pair`).
- `POST /api/v1/whatsapp/send-ping`: Sends an immediate diagnostic test ping message via WhatsApp to `to_phone` or the configured owner phone.
- `POST /api/v1/whatsapp/simulate-inbound`: Simulates an incoming customer message in isolated sandbox mode and runs the 15-step `AgentOrchestrator` synchronously.
- `GET /api/v1/webhooks/whatsapp`: Meta Cloud API `hub.challenge` webhook verification endpoint.
- `POST /api/v1/webhooks/whatsapp`: Ingests inbound WhatsApp customer messages, voice notes, and delivery receipts (with HMAC-SHA256 verification and `@lid` canonical phone resolution).
- `POST /api/v1/agent/turn`: Direct programmatic execution of a 15-step `AgentOrchestrator` turn.
- `POST /api/v1/agent/simulate`: Isolated sandbox simulation turn returning AI reply, stage transition, and pricing audit.

---

## 5. Live Conversations, 1-Click AI Drafts & Operator Takeover (`conversations.py`)
- `GET /api/v1/conversations`: Paginated conversation inbox with automatic `@lid`/E.164 thread deduplication, channel filter (`whatsapp` | `sandbox`), hot-lead indicators, and unread counts.
- `GET /api/v1/conversations/{conversation_id}`: Full thread message timeline, extracted customer profile, and verified `CustomerMemory` facts.
- `POST /api/v1/conversations/initiate`: Initiates a new outbound WhatsApp or sandbox conversation to any E.164 phone number.
- `POST /api/v1/conversations/{conversation_id}/takeover`: Atomically switches conversation mode between `AI`, `HUMAN`, `PAUSED`, and `CLOSED` (`ADR-0008`).
- `POST /api/v1/conversations/{conversation_id}/messages`: Dispatches a manual human operator message to the customer's WhatsApp.
- `POST /api/v1/conversations/{conversation_id}/suggest-reply`: Generates a **1-Click AI Draft Reply** grounded in real catalog prices and conversation history (`ADR-0025`).
- `POST /api/v1/conversations/{conversation_id}/messages/{message_id}/report`: Operator correction loop (`ADR-0012`) — reports an AI message and creates a `KnowledgeCandidate`.
- `POST /api/v1/conversations/{conversation_id}/reset`: Clears messages in a conversation and resets its sales stage to `NEW`.
- `DELETE /api/v1/conversations/{conversation_id}`: Permanently deletes a conversation thread and cascade-related records (`ADR-0023`).
- `GET /api/v1/conversations/database/stats`: Returns conversation and message counts broken down by channel (`whatsapp` vs. `sandbox`).
- `DELETE /api/v1/conversations/simulations/purge` (and `POST /api/v1/conversations/simulations/purge`): Purges all simulated sandbox threads while preserving real WhatsApp customer history (`ADR-0022`).

---

## 6. Unified Knowledge Hub, Spreadsheet Editor & Vector RAG (`knowledge.py`)
- `GET /api/v1/knowledge/items`: Lists unified `KnowledgeItem` records (`product_catalog`, `pricing_rules`, `business_policy`, `sales_guide`, `faq`) with category filtering and search.
- `POST /api/v1/knowledge/items`: Creates a new unified `KnowledgeItem` (with optional `spreadsheet_data` or `pricing_rules`) and indexes RAG chunks.
- `PATCH /api/v1/knowledge/items/{item_id}`: Updates an existing `KnowledgeItem` (including live spreadsheet cells) and re-indexes vector chunks.
- `PATCH /api/v1/knowledge/items/{item_id}/toggle-active`: Toggles active grounding status of a `KnowledgeItem`.
- `DELETE /api/v1/knowledge/items/{item_id}`: Deletes a `KnowledgeItem` and its associated RAG chunks.
- `POST /api/v1/knowledge/update-request`: **Agentic Natural-Language Knowledge Updater** — creates, modifies, pauses, or deletes catalog/policy items from plain-English chat instructions.
- `POST /api/v1/knowledge/upload`: Multi-format file ingestion (`PDF`, `DOCX`, `XLSX`, `CSV`, `JSON`, `MD`, `TXT`) with automatic chunking and vector indexing.
- `POST /api/v1/knowledge/search`: Semantic vector similarity search across active knowledge chunks.
- `POST /api/v1/knowledge/query`: Grounded RAG Q&A synthesis with source chunk citations and confidence scores.
- `GET /api/v1/knowledge/stats`: Returns asset counts and category breakdown across the Knowledge Hub.
- `POST /api/v1/knowledge/migrate`: Runs zero-data-loss migration into the unified `KnowledgeItem` schema.
- `GET /api/v1/knowledge/documents`: Lists ingested legacy knowledge documents.
- `POST /api/v1/knowledge/refresh-index`: Re-indexes default grounding documents.

---

## 7. Modular System Prompts Studio & Version Control (`prompts.py`)
- `GET /api/v1/prompts/sections` (and `GET /api/v1/prompts`): Lists all 7 dynamic system prompt sections (`core_safety`, `core_identity`, `business_policy`, `sales_style`, `business_profile`, `product_steering`, `escalation_rules`) plus custom user-created sections.
- `POST /api/v1/prompts/sections`: Creates a new custom prompt section with initial v1 content.
- `GET /api/v1/prompts/sections/{identifier}` (and `GET /api/v1/prompts/{identifier}`): Returns active content and metadata for a prompt section.
- `PATCH /api/v1/prompts/sections/{identifier}`: Updates section metadata, display order, or active status.
- `DELETE /api/v1/prompts/sections/{identifier}`: Archives (soft-deletes) a custom prompt section.
- `POST /api/v1/prompts/sections/{identifier}/restore`: Restores an archived prompt section.
- `PUT /api/v1/prompts/{identifier}` (and `POST /api/v1/prompts/{section}`): Deploys a new version of the specified prompt section with quality grading (`A+`, `A`, `B+`).
- `GET /api/v1/prompts/sections/{identifier}/history` (and `GET /api/v1/prompts/{identifier}/history`): Returns complete version history for a prompt section.
- `GET /api/v1/prompts/sections/{identifier}/diff`: Computes a server-side git-style line-by-line diff between any two versions (`?v1=...&v2=...`).
- `POST /api/v1/prompts/sections/{identifier}/activate/{version}` (and `POST /api/v1/prompts/{identifier}/rollback/{version}`): Atomically activates/rolls back to a specific version.
- `POST /api/v1/prompts/sections/{identifier}/reset-to-default`: Restores factory default instructions for a built-in prompt section.
- `POST /api/v1/prompts/sections/{identifier}/versions/{version}/pin`: Pins or unpins a specific version so it is protected during history pruning.
- `POST /api/v1/prompts/sections/{identifier}/prune` (and `DELETE /api/v1/prompts/{identifier}/history`): Bulk-prunes unpinned inactive versions while preserving active and pinned versions.
- `DELETE /api/v1/prompts/{section}/history/{version}`: Deletes a single inactive prompt version.
- `POST /api/v1/prompts/{identifier}/ai-optimize`: Autonomous prompt optimization powered by NVIDIA Nemotron.
- `POST /api/v1/prompts/ai-draft-section`: Drafts a brand-new custom system prompt section from a natural-language goal.
- `GET /api/v1/prompts/delta`: Returns prompt sections/versions modified since a given timestamp.

---

## 8. Products, Deterministic Pricing & Multi-Currency (`products.py`)
- `GET /api/v1/products`: Lists catalog products, categories, units, stock status, and packaging variants.
- `POST /api/v1/products`: Creates a new catalog product and default packaging variant.
- `PATCH /api/v1/products/{product_id}`: Updates product details, `in_stock` toggle, MOQ, or base/floor prices.
- `DELETE /api/v1/products/{product_id}`: Deactivates/deletes a product from the catalog.
- `GET /api/v1/pricing/rules`: Lists active deterministic volume discount tier rules.
- `POST /api/v1/pricing/rules`: Creates a new volume tier or customer segment discount rule.
- `PATCH /api/v1/pricing/rules/{rule_id}`: Updates an existing pricing rule's quantity bounds or discount percentage.
- `DELETE /api/v1/pricing/rules/{rule_id}`: Deactivates a pricing rule.
- `POST /api/v1/pricing/calculate`: Computes a deterministic commercial quote enforcing MOQs, volume tiers, and autonomous discount ceilings.
- `GET /api/v1/pricing/currencies`: Returns supported international currencies (`INR`, `USD`, `EUR`, `GBP`, `AED`, `SGD`), symbols, and FX rates (`ADR-0021`).

---

## 9. Commercial Quotes, Orders & GST PDF Invoices (`quotes.py`, `orders.py`, `invoices.py`)
- `GET /api/v1/quotes`: Lists auditable commercial quotes with optional filtering by `customer_id` and `status`.
- `POST /api/v1/quotes`: Creates an auditable commercial quote with deterministic pricing, MOQ validation, and 7-day rate-lock expiry.
- `GET /api/v1/quotes/{quote_id}`: Retrieves detailed quote line items, discount tiers, and customer info.
- `PATCH /api/v1/quotes/{quote_id}`: Transitions quote status (`draft`, `sent`, `accepted`, `expired`, `rejected`).
- `POST /api/v1/quotes/{quote_id}/convert`: Atomically converts an accepted quote into a confirmed commercial `Order`.
- `GET /api/v1/orders`: Lists commercial purchase orders with line items and customer profiles.
- `POST /api/v1/orders`: Creates a new commercial order and dispatches an instant WhatsApp summary alert to the business owner.
- `PATCH /api/v1/orders/{order_id}`: Updates order fulfillment status (`pending`, `confirmed`, `processing`, `dispatched`, `delivered`) or payment status.
- `POST /api/v1/invoices/generate`: Compiles a statutory GST Pro-Forma Invoice PDF (`CGST+SGST` or `IGST`) using ReportLab (`ADR-0019`).
- `GET /api/v1/invoices/download?file={filename}`: Safely serves generated PDF invoices with path-traversal sanitization.
- `POST /api/v1/invoices/quotes/{quote_id}/pdf`: Renders a Pro-Forma Invoice PDF from an existing `Quote` record.
- `POST /api/v1/invoices/quotes/{quote_id}/send-whatsapp`: Generates and dispatches the Pro-Forma Invoice PDF directly to the buyer's WhatsApp.

---

## 10. Leads CRM, Proposals & Anti-Ban Campaigns (`leads.py`, `proposals.py`, `campaigns.py`, `edith_activity.py`)
- `GET /api/v1/leads`: Paginated lead list with status filtering and search.
- `GET /api/v1/leads/{lead_id}`: Lead details and chronological event timeline.
- `PATCH /api/v1/leads/{lead_id}`: Updates lead score, stage, or metadata.
- `POST /api/v1/leads/import` (and `POST /api/v1/leads/upload`): Multipart CSV batch import with E.164 normalization and duplicate detection.
- `GET /api/v1/leads/export/csv`: Streams all CRM leads as an RFC 4180 CSV download.
- `GET /api/v1/proposals/preview/{lead_id}`: Previews a tailored B2B commercial proposal for a specific lead.
- `POST /api/v1/proposals/send/{lead_id}`: Dispatches a tailored proposal to the lead via WhatsApp.
- `POST /api/v1/proposals/batch_send`: Batch-dispatches proposals to multiple selected leads.
- `GET /api/v1/campaigns`: Lists outreach campaigns with real-time delivery and reply metrics.
- `GET /api/v1/campaigns/{campaign_id}`: Detailed campaign progress and statistics.
- `POST /api/v1/campaigns`: Creates a new campaign with anti-ban jitter bounds (`25s–45s`), daily caps, and stop conditions.
- `PATCH /api/v1/campaigns/{campaign_id}`: Updates settings for a draft or paused campaign.
- `POST /api/v1/campaigns/{campaign_id}/launch`: Enrolls matching leads and activates anti-ban drip dispatch.
- `POST /api/v1/campaigns/{campaign_id}/pause`: Pauses active campaign dispatch.
- `POST /api/v1/campaigns/{campaign_id}/resume`: Resumes a paused campaign.
- `DELETE /api/v1/campaigns/{campaign_id}`: Deletes or archives a campaign.
- `GET /api/v1/campaigns/{campaign_id}/leads`: Returns per-lead delivery roster and message statuses.
- `GET /api/v1/campaigns/segments`: Returns distinct lead segments and counts for campaign targeting.
- `POST /api/v1/campaigns/count-leads`: Returns live count of leads matching a target filter before campaign launch.
- `GET /api/v1/campaigns/followups`: Lists scheduled and historical Touch 1 / Touch 2 / Touch 3 follow-up jobs.
- `POST /api/v1/campaigns/followups/{followup_id}/cancel`: Cancels a scheduled follow-up job (`ADR-0009`).
- `GET /api/v1/edith/activity/summary`: Aggregate outreach telemetry (messages sent today/all-time, replies, response rate).
- `GET /api/v1/edith/activity/campaigns/{campaign_id}`: Lead-by-lead dispatch breakdown for a campaign.
- `GET /api/v1/edith/activity/contacted-leads`: Paginated list of all leads contacted by EDITH.

---

## 11. Sales Analytics, Handoffs, Watchdog & Notifications (`analytics.py`, `handoffs.py`, `watchdog.py`, `notifications.py`)
- `GET /api/v1/analytics/overview`: Executive KPIs (hot leads, pipeline value, won deals, queue depth, and dual-brain token summary).
- `GET /api/v1/analytics/funnel`: Conversation distribution across the 16 consultative sales stages.
- `GET /api/v1/analytics/intelligence`: Objection Pareto 80/20 distribution, regional revenue table, and stage-weighted revenue forecast.
- `GET /api/v1/analytics/export`: 1-click executive CSV export (`?format=csv`).
- `GET /api/v1/handoffs`: Lists pending and resolved human operator handoffs (`HOT_LEAD`, `CUSTOM_PRICING`, `COMPLAINT`, `KNOWLEDGE_GAP`).
- `POST /api/v1/handoffs/{handoff_id}/resolve`: Resolves a human handoff and optionally returns the conversation to `AI` mode.
- `GET /api/v1/watchdog/system-health`: Quick system health summary and unread watchdog alert count.
- `GET /api/v1/watchdog/alerts`: Lists active diagnostic anomalies detected by the Watchdog AI supervisor.
- `POST /api/v1/watchdog/alerts/{alert_id}/resolve`: Marks a watchdog alert as resolved.
- `POST /api/v1/watchdog/run-audit`: Triggers an immediate diagnostic audit pass across conversations, margins, and queues.
- `GET /api/v1/notifications`: Paginated feed of autonomous agent and system notifications with unread count.
- `POST /api/v1/notifications`: Creates a new notification and broadcasts `agent_notification` over WebSockets.
- `POST /api/v1/notifications/{notification_id}/read`: Marks a single notification as read.
- `POST /api/v1/notifications/read-all` (and `POST /api/v1/notifications/mark-all-read`): Marks all notifications as read.
- `DELETE /api/v1/notifications/{notification_id}`: Deletes a notification record.

---

## 12. Voice Copilot, Audio Transcription, Friday Actions & Auth (`voice.py`, `audio.py`, `friday_actions.py`, `auth.py`, `ws.py`)
- `POST /api/v1/voice/session-token` (and `POST /api/voice-session-token`): Mints single-use ephemeral WebSocket tokens for browser-to-Google Gemini 3.1 Flash Live streaming (`BidiGenerateContentConstrained`).
- `POST /api/v1/voice/update-prompt-via-nemotron`: Revises and activates a system prompt section via voice command using NVIDIA Nemotron.
- `POST /api/v1/voice/generate-promo-message`: Synthesizes and dispatches a tailored promotional WhatsApp message from a voice instruction.
- `POST /api/v1/voice/update-backend-setting`: Updates backend settings, pricing rules, or catalog stock via voice command.
- `POST /api/v1/voice/audit-log` & `GET /api/v1/voice/audit-logs`: Records and retrieves voice command execution audit logs.
- `POST /api/v1/audio/transcribe`: Multipart upload transcription for inbound WhatsApp voice notes (`.ogg`, `.opus`, `.mp3`, `.wav`).
- `POST /api/v1/audio/transcribe-base64`: Transcribes base64-encoded audio payloads directly from the WhatsApp bridge webhook.
- `GET /api/v1/friday/actions`: Lists all 27 registered backend operational actions available to Friday.
- `GET /api/v1/friday/actions/{action_name}/describe`: Returns parameter schema and state impact for a Friday action.
- `POST /api/v1/friday/actions/{action_name}`: Executes a registered Friday operational action with full audit logging.
- `POST /api/v1/auth/login` & `GET /api/v1/auth/me`: JWT operator authentication and profile retrieval.
- `WS /api/v1/ws?org_id={org_id}`: Primary organization WebSocket bus broadcasting `new_message`, `stage_changed`, `hot_lead`, `handoff_requested`, `message_status_update`, `watchdog_alert`, `agent_notification`, `friday_ui_action`, and `workspace_config_updated`.
- `WS /api/v1/ws/conversations`: Live conversation deliberation and token streaming WebSocket.
