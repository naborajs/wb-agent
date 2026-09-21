# CHANGE_HISTORY.md: Comprehensive Git & Architectural Evolution History

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME
> **Commit Count**: 640 commits | **Repository**: `d:/Projects/Python/wb-agent`

This document chronologically tracks the architectural, behavioral, and user-interface transformations of the WB-Agent (EDITH) codebase from initial foundation to the current state.

---

## 1. Major Architectural Evolutionary Phases

### Phase 1: Core Consultative Sales Engine & Multi-Tier Memory (Commits 1–200)
- Transitioned chatbot paradigm from rigid FAQ scripts to an autonomous consultative sales consultant (EDITH).
- Engineered the **15-step conversational turn cycle** (`AgentOrchestrator`).
- Built the **SPIN sales methodology engine** (`ConsultativeSalesEngine`) tracking qualification, discovery, recommendation, purchase intent, and handoff.
- Established 3-tier customer memory (`ConversationSummary`, `CustomerMemory`, `CustomerProfile`).
- Enforced the **deterministic pricing engine** (`PricingService`) capping autonomous discounts at 5.0% and eliminating pricing hallucinations.

### Phase 2: Dual WhatsApp Gateway & Database-Backed Durable Queue (Commits 201–350)
- Implemented dual-provider WhatsApp architecture (`MetaCloudWhatsAppProvider` and `BridgeWhatsAppProvider` using Baileys multi-device socket).
- Designed database-backed durable queue (`jobs` table) with `SKIP LOCKED` atomic worker claims (`Worker` daemon).
- Added per-conversation turn-level distributed locking (`ConversationLock`) preventing race conditions from rapid successive user messages.
- Solved WhatsApp Multi-Device LID privacy identifier with bidirectional LID <-> real phone number mapping.
- Prevented self-reply echo loops on the bot's own linked phone number (`918918753100`).

### Phase 3: The 5 Enterprise Upgrades (Commits 351–450)
- **R1. Pro-Forma Invoice Generator**: ReportLab PDF compiler for branded commercial pro-forma invoices with GSTIN, FSSAI, itemized order tiers, and 7-day rate lock terms. Dispatched directly via WhatsApp.
- **R2. WhatsApp Voice Note Transcription**: Multimodal audio ingestion (.ogg, .opus, .mp3, .wav) utilizing Gemini multimodal transcription with fallback to local transcription and Hinglish colloquial processing.
- **R3. Real-Time WebSocket Live Sync**: Persistent WebSocket stream (`/api/v1/ws/conversations`) with instant message delivery, hot lead audio chime alerts (score >= 80), and human handoff chimes.
- **R4. B2B Campaign Drip & Anti-Ban Jitter**: Outreach campaign manager enforcing randomized inter-message jitter (25.0s – 45.0s) and daily volume quotas, with instant cancellation upon buyer reply.
- **R5. Sales Intelligence & Objection Analytics**: Executive analytics dashboard with Objection Pareto (80/20 distribution), geographic lead density heatmaps, and 1-click executive CSV export.

### Phase 4: Voice-Driven Agentic Control Layer (Commits 451–520)
- Powered by Google Gemini 3.1 Flash Live preview via the Gemini Multimodal Live API.
- Zero client-side API key exposure using **ephemeral session token minting** (`POST /api/v1/voice/session-token`).
- 16kHz linear PCM browser microphone capture and 24kHz Web Audio scheduled playback with natural barge-in / speech interruption.
- 9 client-side actionable tools (`navigate_to`, `click_element`, `fill_field`, `send_whatsapp_message`, `explain_feature`, `update_system_prompt_via_nemotron`, `send_ai_promotional_message`, `update_backend_setting`, `ask_operator_clarification`).
- Dynamic lightweight screen grounding snapshot (`[Current Screen State]`) updated on navigation and DOM mutations.

### Phase 5: Dual-Brain InterBrainBus Agency & Command Center (Commits 521–580)
- Formalized the **InterBrainMessage Synaptic Protocol** between **FRIDAY** (Gemini Live Web Copilot) and **EDITH** (NVIDIA NIM Commercial Closer).
- **Live Inter-Brain Activity Ticker**: Real-time terminal ticker displaying inter-brain decisions, margin defenses, and DOM inspections.
- **Executive Morning Audio Briefing**: 1-click synthesized debriefing of revenue pipeline, active negotiations, margin defenses, and dual-brain compute costs.
- **Bidirectional Refusal Rights & Autonomous Fallback**: EDITH independently evaluates task delegations and can deny policy violations; FRIDAY can decline non-emergency audio interruptions in focus mode; EDITH autonomously falls back to silent dashboard alerts.
- **24-Hour Velocity & Heatmap**: Hourly activity histogram and flatline latency telemetry curve.

### Phase 6: Interactive Dashboard Redesigns, Radars & Playground (Commits 581–620)
- **Dedicated AI Playground Studio**: ChatGPT/Gemini-style workspace with 3D/2D mascot, liquid glass chatbox, live parameter tuning, prompt upgrader, and model-to-task assignment matrix.
- **Recharts 3 Radar Charts**: Omnichannel wholesale inflow radars, cognitive vector benchmark radar, objection resolution radar, and commercial readiness radar.
- **Circuit Board Visualization**: Interactive animated circuit board architecture with orthogonal pulses and component inspector.
- **Simulation Channel Sandbox**: Strict database-level isolation between real WhatsApp traffic (`channel='whatsapp'`) and simulator interactions (`channel='simulation'`).
- **WhatsApp Group Guardrail**: Inbound messages from `@g.us` group JIDs pause AI auto-reply to prevent group spam and alert operators.

### Phase 7: Dynamic Modular Prompts Architecture (Commits 621–640)
- **Dynamic `PromptSection` Model**: Migrated from static combined prompts to independently versioned, dynamically editable prompt sections.
- **Enhanced `PromptVersion`**: Added section linkages, version pinning (`pinned=True`), exact BPE token counts (`tiktoken` cl100k_base), and 5-dimension AI quality scoring.
- **Git-Style Line-by-Line Diff**: Computes additions, deletions, and line-level changes between historical prompt versions.
- **Voice Intent Routing & Confirmation Loops**: FRIDAY can propose, edit, or reset prompt sections via voice commands, requiring explicit operator verbal confirmation.
- **Cross-Section Consistency AI Analyzer**: Verifies that edits to one prompt section (e.g. Sales Style) do not conflict with Core Safety or Business Policies.

---

## 2. Chronological Key Milestone Commits Log (Most Recent First)

| Hash | Date | Commit Message | Key Impact |
| :--- | :--- | :--- | :--- |
| `7f42e6e` | 2026-09-19 | test(prompts): add automated verification suite for dynamic modular prompts system | Logged Git Commit |
| `d525ff4` | 2026-09-19 | feat(ui): upgrade prompts dashboard with dynamic CRUD, git diffs, unique token legend, and AI streaming | Logged Git Commit |
| `26f22d6` | 2026-09-19 | feat(brain): integrate prompt section operations and confirmation loop into InterBrainBus | Logged Git Commit |
| `9b34e1e` | 2026-09-19 | feat(voice): add prompt section voice intent routing with confirmation loops and cross-section context | Logged Git Commit |
| `cdc03f3` | 2026-09-19 | feat(friday): register prompt section voice actions with confirmation loops | Logged Git Commit |
| `f659de7` | 2026-09-19 | feat(prompts): add dynamic sections CRUD, line diff, pinning, and delta sync endpoints | Logged Git Commit |
| `8a4ec1a` | 2026-09-19 | feat(ai): add cross-section consistency context and draft_new_section capability | Logged Git Commit |
| `0f679af` | 2026-09-19 | feat(ai): add PromptDraftSectionResult model for drafting sections from scratch | Logged Git Commit |
| `c537ed0` | 2026-09-19 | feat(prompts): upgrade PromptService with dynamic sections, line diffs, pinning, and tokenizer | Logged Git Commit |
| `ed5c011` | 2026-09-19 | feat(prompts): initialize dynamic prompt sections in FastAPI lifespan | Logged Git Commit |
| `5c7d2be` | 2026-09-19 | feat(prompts): add idempotent migration for dynamic prompt sections and versions | Logged Git Commit |
| `72eb80b` | 2026-09-19 | feat(prompts): export PromptSection in database models package | Logged Git Commit |
| `8b55b85` | 2026-09-19 | feat(prompts): add section_id, pinning, token_count, and quality metrics to PromptVersion | Logged Git Commit |
| `b4e02f2` | 2026-09-19 | feat(prompts): add dynamic PromptSection database model | Logged Git Commit |
| `392bf1f` | 2026-09-19 | test(brain): add automated verification for Friday architecture and radar explanations | Logged Git Commit |
| `4dce591` | 2026-09-19 | fix(brain): import Deal model for Friday live pipeline query in architecture inquiry | Logged Git Commit |
| `85a361e` | 2026-09-19 | feat(voice): ground Friday voice instructions on live architecture and radar analytics | Logged Git Commit |
| `dfa6c70` | 2026-09-19 | feat(dashboard): add architecture and readiness debrief topics to ExecutiveBriefingModal | Logged Git Commit |
| `b709b1a` | 2026-09-19 | feat(brain): add Friday intent handlers for architecture schematic and commercial readiness radar | Logged Git Commit |
| `8675c35` | 2026-09-19 | feat(brain): bind cognitive vector radar to live dual-brain telemetry | Logged Git Commit |
| `baac746` | 2026-09-19 | feat(analytics): bind objection radar dynamically to live pareto intelligence | Logged Git Commit |
| `c363458` | 2026-09-19 | feat(dashboard): compute dynamic commercial readiness vectors from live pipeline metrics | Logged Git Commit |
| `429369a` | 2026-09-19 | feat(ui): update wholesale inflow radar with realistic WhatsApp vs Portal metrics | Logged Git Commit |
| `a8c5eea` | 2026-09-19 | feat(dashboard): implement live circuit board architecture with orthogonal pulses and component inspector | Logged Git Commit |
| `533fffb` | 2026-09-19 | feat(ui): enhance circuit-board with interactive nodes, badges, sublabels, and dual-theme colors | Logged Git Commit |
| `477bb3e` | 2026-09-19 | feat(ui): add circuit-board component and demo with framer-motion animations | Logged Git Commit |
| `d8d2b81` | 2026-09-19 | build(dashboard): add framer-motion dependency for circuit board animations | Logged Git Commit |
| `c89d42f` | 2026-09-19 | fix(dashboard): eliminate SSR timestamp hydration mismatch in SynapticActivityTicker | Logged Git Commit |
| `4c4ff77` | 2026-09-19 | chore(ui): track existing kinetic-grid component in ui folder | Logged Git Commit |
| `1753b74` | 2026-09-19 | feat(brain): integrate dual-brain cognitive vector benchmark radar | Logged Git Commit |
| `1b307c9` | 2026-09-19 | feat(analytics): add objection resolution and regional performance radar charts | Logged Git Commit |
| `6dc8e4b` | 2026-09-19 | feat(dashboard): integrate sales funnel radar view and omnichannel traffic radars on overview | Logged Git Commit |
| `cfd46ad` | 2026-09-19 | feat(ui): add radar-chart, card, badge, and demo components with Recharts 3 support | Logged Git Commit |
| `47d079a` | 2026-09-19 | style(dashboard): configure dual-theme tokens and chart styles for light and dark modes | Logged Git Commit |
| `3d1582a` | 2026-09-19 | build(dashboard): add recharts and class-variance-authority dependencies | Logged Git Commit |
| `51ee27b` | 2026-09-19 | fix(playground): make FloatingRobotMascot, drawer backdrop, and loading fallback theme-aware for proper light mode | Logged Git Commit |
| `7f6b2a0` | 2026-09-19 | fix(playground): remove top-left box artifact and refine liquid glass chatbox for dark and light themes | Logged Git Commit |
| `c9356a0` | 2026-09-19 | feat(brain): add Friday autonomous problem, capability gap, and user issue reporting system | Logged Git Commit |
| `b9a3dea` | 2026-09-19 | fix(brain): add Nemotron 550B resolution, Friday playground routing, and live UI sync | Logged Git Commit |
| `e2f234c` | 2026-09-19 | feat(playground): apply liquid glass chatbox with electric orange plasma beam and refined palette | Logged Git Commit |
| `41fb197` | 2026-09-19 | feat(playground): use 2D transparent floating mascot with vector SVG fallback | Logged Git Commit |
| `133780b` | 2026-09-19 | feat(playground): add 3D AI mascot model and radial ambient glow to chat hero | Logged Git Commit |
| `42ef096` | 2026-09-19 | feat(playground): redesign AI chat studio with sleek dark theme, prompt upgrader, and mobile support | Logged Git Commit |
| `ef04d83` | 2026-09-19 | feat(brain): add AI prompt upgrade endpoint powered by NVIDIA NIM | Logged Git Commit |
| `902c526` | 2026-09-19 | feat(friday): autonomous model role assignment, parameter tuning, and playground navigation | Logged Git Commit |
| `9c6f3c0` | 2026-09-19 | feat(playground): side-by-side controls, live parameter tuning, and role assignment studio | Logged Git Commit |
| `f66230a` | 2026-09-19 | docs: add ADR 0026 and Error Catalog Â§2.8 for dynamic model assignments, zero-cost NVIDIA economics, and playground | Logged Git Commit |
| `f006a99` | 2026-09-19 | feat(playground): dedicated ChatGPT/Gemini-style playground with model selector and per-turn telemetry | Logged Git Commit |
| `87347b3` | 2026-09-19 | feat(integrations): zero-cost NVIDIA display, 1-click live speed test, and model-to-task assignment matrix | Logged Git Commit |
| `821a157` | 2026-09-19 | feat(brain): add real model benchmark, model roles, and playground chat API | Logged Git Commit |
| `39def62` | 2026-09-19 | feat(ai): add model role configurations and dynamic chain prioritization | Logged Git Commit |
| `e33e7fe` | 2026-09-19 | fix(conversations): resolve ModelResponse attribute lookup in suggest_reply | Logged Git Commit |
| `276462e` | 2026-09-19 | docs(adr): add ADR 0025 and update error catalog Â§2.7 for 1-click suggestion reply and Friday website agency | Logged Git Commit |
| `30820bd` | 2026-09-19 | feat(dashboard): add universal Friday UI action event bridge and voice suggestion tool | Logged Git Commit |
| `92d80bd` | 2026-09-19 | feat(dashboard): add 1-click AI reply suggestion and Friday refinement bar in conversations UI | Logged Git Commit |
| `8b6de46` | 2026-09-19 | feat(brain): enhance Friday actions and inter-brain bus for conversation reply drafting and universal UI agency | Logged Git Commit |
| `bf63bcb` | 2026-09-19 | feat(conversations): add 1-click AI suggest-reply endpoint with custom refinement directives | Logged Git Commit |
| `ce7b950` | 2026-09-19 | docs: document ADR 0024 for WhatsApp group message suppression and operator notifications | Logged Git Commit |
| `dec3ed3` | 2026-09-19 | feat(dashboard): add WhatsApp group filter, group badges, and operator-only chat banner | Logged Git Commit |
| `185875f` | 2026-09-19 | feat(bridge): forward WhatsApp group messages with group metadata and support @g.us destination JID | Logged Git Commit |
| `4336bbc` | 2026-09-19 | feat(webhook): suppress AI auto-reply for WhatsApp groups and notify operator | Logged Git Commit |
| `70ce496` | 2026-09-19 | feat(whatsapp): add WhatsApp group JID detection and group metadata fields | Logged Git Commit |
| `63b9300` | 2026-09-19 | docs(adr): add ADR 0023 for conversation history lifecycle, deletion controls, and database management | Logged Git Commit |
| `c54c515` | 2026-09-19 | feat(brain): integrate database inspection, history purge, and commercial deletion refusal in Friday and EDITH | Logged Git Commit |
| `6fbc8eb` | 2026-09-19 | feat(dashboard): add conversation delete action, simulation purge UI, and enhanced thread filtering | Logged Git Commit |
| `f0f0ad4` | 2026-09-19 | feat(database): implement conversation deletion, simulation purge, and database stats endpoints | Logged Git Commit |
| `393120f` | 2026-09-19 | fix(tests): strip UTF-8 BOM from pytest.ini to enable automated test execution | Logged Git Commit |
| `d719da0` | 2026-09-19 | docs(troubleshooting): add section 2.4 covering phantom inbound messages and simulation isolation | Logged Git Commit |
| `14f14b1` | 2026-09-19 | docs(adr): document ADR 0022 on simulation sandbox isolation and WhatsApp guardrails | Logged Git Commit |
| `ffed8e5` | 2026-09-19 | feat(dashboard): add channel segmentation tabs, simulation indicators, and sandbox reply protections to Live Inbox | Logged Git Commit |
| `3584d26` | 2026-09-19 | fix(dashboard): isolate Overview simulator to sandbox and filter recent conversations to real WhatsApp | Logged Git Commit |
| `8070ff4` | 2026-09-19 | fix(maintenance): create database script to isolate existing simulated conversations to channel='simulation' | Logged Git Commit |
| `a333c98` | 2026-09-19 | test(conversations): verify sandbox channel isolation and is_simulation tagging in extended tests | Logged Git Commit |
| `ff61872` | 2026-09-19 | fix(agent): standardize simulation channel to 'simulation' and tag metadata_json | Logged Git Commit |
| `287db52` | 2026-09-19 | fix(whatsapp): isolate simulate-inbound to channel='simulation' with persistent simulation tags | Logged Git Commit |
| `5889838` | 2026-09-19 | fix(conversations): enforce simulation channel isolation and suppress live WhatsApp dispatch on operator replies | Logged Git Commit |
| `b0a228f` | 2026-09-19 | feat(schemas): expose metadata_json on ConversationResponse for simulation detection | Logged Git Commit |
| `32aad93` | 2026-09-19 | fix(whatsapp): enforce sandbox phone number suppression in MetaCloudWhatsAppProvider | Logged Git Commit |
| `f0ade67` | 2026-09-19 | fix(whatsapp): intercept sandbox and dummy phone numbers in BridgeWhatsAppProvider | Logged Git Commit |
| `6ae4da8` | 2026-09-19 | fix(security): introduce sandbox phone guardrail to prevent real WhatsApp spam to test numbers | Logged Git Commit |
| `2a9fbf6` | 2026-09-18 | docs: update CHANGELOG and index with multi-currency features and ADR 0021 | Logged Git Commit |
| `4345814` | 2026-09-18 | docs(adr): add ADR 0021 on multi-currency pricing architecture and internationalization | Logged Git Commit |
| `f64e65e` | 2026-09-18 | feat(scripts): add realistic international and domestic B2B sample lead generator | Logged Git Commit |
| `913e699` | 2026-09-18 | feat(frontend): add CurrencySelector component for multi-currency display | Logged Git Commit |
| `d72542d` | 2026-09-18 | test(agent): add unit test coverage for timezone-aware greetings and personalized salutations | Logged Git Commit |
| `b6b79a1` | 2026-09-18 | feat(agent): add timezone-aware greeting generator and personalized salutations | Logged Git Commit |
| `3edfe54` | 2026-09-18 | feat(api): expose supported international currencies endpoint GET /pricing/currencies with tests | Logged Git Commit |
| `63f9426` | 2026-09-18 | feat(pricing): export multi-currency conversion utilities from app.pricing package | Logged Git Commit |
| `ea5a89c` | 2026-09-18 | test(pricing): add unit test coverage for multi-currency conversion and international formatting | Logged Git Commit |
| `eeeb437` | 2026-09-18 | feat(i18n): add multi-currency conversion and international formatting utility | Logged Git Commit |
| `ad3a67b` | 2026-09-18 | docs(changelog): add v0.2.0 platform release changelog | Logged Git Commit |
| `5b45b9f` | 2026-09-18 | feat(scripts): add end-to-end smoke test CLI utility for post-deployment verification | Logged Git Commit |
| `d4ce0ae` | 2026-09-18 | feat(frontend): integrate live SystemHealthBadge in Mission Control DashboardShell header | Logged Git Commit |
| `7975924` | 2026-09-18 | feat(frontend): add ExportCsvButton component for streaming CSV table downloads | Logged Git Commit |
| `2245a56` | 2026-09-18 | feat(frontend): add EmptyState reusable placeholder component for data tables | Logged Git Commit |
| `cc93df7` | 2026-09-18 | feat(frontend): add reusable CopyToClipboard micro-interaction button component | Logged Git Commit |
| `cdab3aa` | 2026-09-18 | feat(frontend): add SystemHealthBadge component for live system status and diagnostics | Logged Git Commit |
| `eff9c26` | 2026-09-18 | docs: update knowledge base index with ADRs 0017-0020, deployment runbooks, and developer onboarding | Logged Git Commit |
| `bb1b7b5` | 2026-09-18 | docs(guides): add developer onboarding and fast local environment setup guide | Logged Git Commit |
| `5e7c632` | 2026-09-18 | docs(guides): add WhatsApp connectivity guide comparing Meta Cloud API and Baileys bridge | Logged Git Commit |

---
