# DASHBOARD_CURRENT_STATE.md: Complete Dashboard Page & Data Authenticity Audit

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY DATABASE | VERIFIED BY BROWSER  
> **Date of Audit**: 2026-09-21  
> **Repository**: `d:/Projects/Python/wb-agent/dashboard`

---

## 1. Executive Summary

The WB-Agent Dashboard is a **Next.js 14 App Router** single-page / multi-route application styled with Tailwind CSS, Lucide icons, Framer Motion animations, and Recharts 3 radar/bar visualizers. It features a persistent navigation shell (`DashboardShell.tsx`) with a dual-theme design system (**Royal Pitch Black** vs **Estate White**) and docked Gemini Live voice copilot (`VoiceAgent.tsx`).

This audit examines all 15 operational routes, determining exactly which metrics are real database/API queries, which are simulated, and which are hardcoded placeholders.

---

## 2. Dashboard Authenticity Summary Matrix

| Route | Page Name | Primary Endpoints | Database Source | Data Authenticity | Real-time WebSocket? |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `/` | **Overview** | `/analytics/overview`, `/analytics/funnel`, `/whatsapp/*` | `leads`, `conversations`, `deals`, `handoffs` | **REAL API with HARDCODED FALLBACK** | Yes (`agent_thinking`, `new_message`) |
| `/brain` | **Dual Brains Console** | `/brain/dialogues`, `/brain/telemetry`, `/brain/chat` | `inter_brain_messages`, `agent_runs` | **REAL DATABASE & RUNTIME** | Yes (`synaptic_event`) |
| `/playground` | **AI Playground Studio** | `/brain/playground/chat`, `/settings/models` | Ephemeral chat / model parameters | **REAL LLM RUNTIME** | No (Local state / SSE stream) |
| `/notifications`| **Notification Center** | `/notifications`, `/notifications/{id}/read` | `agent_notifications` | **REAL DATABASE** | Yes (`agent_notification`) |
| `/conversations`| **Live 3-Panel Inbox** | `/conversations`, `/agent/turn`, `/whatsapp/send` | `conversations`, `messages`, `customer_memory` | **REAL DATABASE & RUNTIME** | Yes (`new_message`, `stage_changed`) |
| `/leads` | **Leads & Pipeline** | `/leads`, `/leads/upload`, `/proposals/send` | `leads`, `customers` | **REAL DATABASE** | No (HTTP refresh) |
| `/campaigns` | **B2B Campaigns** | `/campaigns`, `/campaigns/{id}/launch` | `campaigns`, `campaign_leads` | **REAL DATABASE & ENGINE** | Yes (`campaign_lead_sent`) |
| `/analytics` | **Objection Intelligence** | `/analytics/intelligence` | `conversation_analysis`, `leads` | **REAL DATABASE** | No (HTTP refresh) |
| `/orders` | **Wholesale Orders** | `/orders`, `/orders/{id}` | `orders`, `order_items` | **REAL DATABASE** | No (HTTP refresh) |
| `/knowledge` | **Knowledge Hub RAG** | `/knowledge/items`, `/knowledge/query` | `knowledge_items`, `knowledge_chunks` | **REAL DATABASE & VECTOR** | No (HTTP refresh) |
| `/prompts` | **Modular Prompts** | `/prompts/sections`, `/prompts/{key}/diff` | `prompt_sections`, `prompt_versions` | **REAL DATABASE** | No (HTTP refresh) |
| `/integrations`| **Model Integrations** | `/settings/models`, `/brain/benchmark-model` | `.env`, model latency benchmarks | **REAL RUNTIME & BENCHMARK** | No (Live speed test) |
| `/followups` | **Follow-up Cadence** | None (0 endpoints called) | None | ❌ **100% HARDCODED PLACEHOLDER** | No |
| `/handoffs` | **Human Escalations** | `/handoffs`, `/handoffs/{id}/resolve` | `handoffs`, `conversations` | **REAL DATABASE with HARDCODED FALLBACK** | Yes (`handoff_alert`) |
| `/settings` | **Platform Safety** | `/settings` | `agent_settings`, `.env` | **REAL DATABASE & CONFIG** | No |
| `/pricing` | **Pricing Redirect** | None (Redirects to `/knowledge?tab=pricing_rule`) | Unified into Knowledge Hub | **REDIRECT ONLY** | No |
| `/products` | **Products Redirect** | None (Redirects to `/knowledge?tab=catalog_product`) | Unified into Knowledge Hub | **REDIRECT ONLY** | No |

---

## 3. Deep Route-by-Route Inspection

### 1. Overview (`/`)
- **File**: `dashboard/app/page.tsx` (1,262 lines).
- **Widgets & Components**:
  - `DualBrainHeroBus`: Visual telemetry bus connecting FRIDAY and EDITH. Displays live model assignments, latency, and "Play Executive Morning Audio Briefing".
  - `SynapticActivityTicker`: Terminal-style auto-scrolling activity feed showing inter-brain decisions (`InterBrainMessage`).
  - `HourlyVelocityHeatmap`: 24-hour activity histogram and latency flatline curve.
  - `ExecutiveQuickDock`: 1-click test actions (test discount policy, live ping, safe mode).
  - Funnel & Radar Charts: Omnichannel wholesale inflow, pipeline health radar.
  - WhatsApp Status Card: Live connection state, QR modal, pairing code generation.
- **Authenticity Audit**:
  - `metrics` initializes with hardcoded fallback (`leads_total: 124, pipeline_value_inr: 485000, won_deals: 14`). Replaced by `/api/v1/analytics/overview` if backend succeeds.
  - `leadHealthData` radar chart (`Response Speed: 92, Deal Margin: 86...`) is **100% HARDCODED DEMO DATA**.
  - WhatsApp status and QR data are **REAL RUNTIME VALUES** from port 3001.

---

### 2. Live Inbox (`/conversations`)
- **File**: `dashboard/app/conversations/page.tsx` (2,266 lines).
- **Layout**: 3-panel operational console (Left: thread list; Center: live dialogue timeline; Right: customer profile drawer).
- **Data Flow & Storage**:
  - Thread list loaded from `GET /api/v1/conversations?channel=whatsapp` (or segmented by `simulation` / `groups`).
  - Messages loaded from `GET /api/v1/conversations/{id}`.
  - Outbound operator messages dispatched via `POST /api/v1/conversations/{id}/messages`. If `channel == 'whatsapp'`, forwarded to WhatsApp gateway.
  - Human takeover toggled via `POST /api/v1/conversations/{id}/takeover`.
  - 1-Click AI reply suggestions drafted via `POST /api/v1/conversations/{id}/suggest-reply`.
- **Authenticity Audit**:
  - **REAL DATABASE & RUNTIME**: Messages are written to SQLite/PostgreSQL `messages` table.
  - **REAL WEBSOCKET SYNC**: Connects to `ws://localhost:8000/api/v1/ws/conversations`. Incoming messages trigger chime and append to timeline with 0 polling latency.
  - **CANVAS / AUDIO CLARIFICATION**: Voice notes render audio waveform badge and Hinglish transcript.

---

### 3. Dual Brains (`/brain`)
- **File**: `dashboard/app/brain/page.tsx` (2,070 lines).
- **Purpose**: Direct executive console for inter-brain collaboration between FRIDAY (Web Copilot) and EDITH (Commercial Closer).
- **Features**:
  - Inter-brain dialogue stream (`GET /api/v1/brain/dialogues`).
  - Codebase Self-Inspection: Calls `/api/v1/brain/code/read` and `/api/v1/brain/code/search` allowing Friday to read and diagnose repository code files live!
  - Mutual background thinking trigger (`POST /api/v1/brain/background-think`).
  - FRIDAY problem report logging (`POST /api/v1/brain/report-problem`).
- **Authenticity Audit**: **REAL DATABASE & CODE SERVICE**. Reflects actual `inter_brain_messages` and live repository file system.

---

### 4. AI Playground Studio (`/playground`)
- **File**: `dashboard/app/playground/page.tsx` (1,909 lines).
- **Purpose**: Interactive testing environment for prompt engineering, model temperature tuning, prompt upgrading, and role assignments.
- **Features**:
  - 3D/2D AI Mascot with ambient glow.
  - Model selector supporting Nemotron 120B, Llama 3.3 70B, Gemma 31B, and Gemini Live.
  - Live parameter sliders: Temperature, Top-P, Max Tokens, Frequency Penalty.
  - 1-Click "Upgrade Prompt via Nemotron" (`POST /api/v1/brain/upgrade-prompt`).
- **Authenticity Audit**: **REAL LLM RUNTIME**. Calls NVIDIA NIM / Gemini live APIs.

---

### 5. Follow-ups Engine (`/followups`)
- **File**: `dashboard/app/followups/page.tsx` (104 lines).
- **CRITICAL AUDIT FINDING**:
  - This page contains **ZERO API CALLS**.
  - It renders a hardcoded static array of 3 sample follow-ups (`Rahul Sharma`, `Amit Roy`, `Metro Food Services`).
  - Even though the backend has a complete, fully functional `followup_jobs` table and `FollowupScheduler` service, the dashboard page is a **STATIC UI MOCKUP**.

---

### 6. Human Escalations & Handoffs (`/handoffs`)
- **File**: `dashboard/app/handoffs/page.tsx` (130 lines).
- **Features**: Displays active customer escalations requiring operator authority (`purchase_intent`, `custom_pricing`, `complaint`).
- **Authenticity Audit**:
  - Initializes with 2 hardcoded sample items (`h_1`, `h_2`).
  - Calls `GET /api/v1/handoffs` on mount and replaces state if real handoffs exist.
  - "Resolve & Resume AI" calls `POST /api/v1/handoffs/{id}/resolve`, which updates database and sets conversation mode back to `"AI"`.

---

### 7. Knowledge Hub RAG (`/knowledge`)
- **File**: `dashboard/app/knowledge/page.tsx` (2,691 lines).
- **Features**:
  - Unified ground-truth knowledge editor for 5 categories: `estate_policy`, `pricing_rule`, `catalog_product`, `certification`, `objection_handling`.
  - Live Semantic Vector RAG tester (`POST /api/v1/knowledge/query`).
  - Interactive Quote Simulator (moved from `/pricing`).
  - Product catalog table with packaging variants (moved from `/products`).
- **Authenticity Audit**: **REAL DATABASE & VECTOR RETRIEVAL**. Directly queries `knowledge_items` and `knowledge_chunks`.

---

### 8. Modular Prompts (`/prompts`)
- **File**: `dashboard/app/prompts/page.tsx` (1,441 lines).
- **Features**:
  - Dynamic CRUD for `PromptSection` (add custom section, reorder, delete).
  - Version history drawer (`PromptVersion`) with version pinning (`pinned=True`) and rollback.
  - Git-style line-by-line colored diff modal (`add`, `delete`, `equal`).
  - Exact BPE tokenizer count and token budget visualization.
  - AI Section Optimizer powered by NVIDIA Nemotron.
- **Authenticity Audit**: **REAL DATABASE & TIKTOKEN RUNTIME**. All version activations and diffs query live SQLite/Postgres tables.

---

### 9. B2B Campaigns (`/campaigns`)
- **File**: `dashboard/app/campaigns/page.tsx` (1,185 lines).
- **Features**:
  - Campaign creation wizard with audience segmentation and anti-ban jitter sliders ($25\text{s}-45\text{s}$).
  - AI Campaign Draft Generator via FRIDAY (`POST /api/v1/brain/campaign-draft`).
  - Real-time campaign execution telemetry with start/pause/resume controls.
- **Authenticity Audit**: **REAL DATABASE & ENGINE**. Interacts with `campaigns` and `campaign_leads` tables.

---

### 10. Sales Intelligence Analytics (`/analytics`)
- **File**: `dashboard/app/analytics/page.tsx` (492 lines).
- **Features**:
  - Objection Pareto 80/20 distribution chart.
  - Regional lead density tables (Siliguri, Darjeeling, Jalpaiguri, Kolkata, Gangtok).
  - 1-Click Executive Activity CSV download (`GET /api/v1/analytics/export/csv`).
- **Authenticity Audit**: **REAL DATABASE**. Queries `conversation_analysis` and `leads` tables.

---

### 11. Platform Settings (`/settings`)
- **File**: `dashboard/app/settings/page.tsx` (700 lines).
- **Features**:
  - Global AI messaging kill-switch toggle.
  - Business profile (name, industry, currency, description).
  - Owner escalation WhatsApp number normalization and validation.
  - Quiet hours enforcement (9 PM – 9 AM IST).
- **Authenticity Audit**: **REAL DATABASE & ENV PERSISTENCE**. Persists to `agent_settings` table and `.env`.
