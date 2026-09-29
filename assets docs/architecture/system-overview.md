# WhatsApp AI Agent by NS (EDITH + FRIDAY) — System Architecture Overview

> ⬅️ Back to: [[../index|Knowledge Base Index]] | **Engineering Reference**: [[../guides/senior-developer-architecture|Senior Developer Architecture]]

## 1. System Vision & Purpose

**WhatsApp AI Agent by NS** is an industry-agnostic autonomous B2B & D2C sales operating system engineered by **Naboraj Sarkar (NS)**. It operates a **Dual-Brain AI Architecture**:
- **EDITH (Commercial WhatsApp Closer)**: Handles inbound and outbound customer conversations over WhatsApp with context-first reasoning, multi-tier memory, deterministic pricing enforcement, and non-violent de-escalation.
- **FRIDAY (Omnipotent Web & Voice Copilot)**: Operates the Next.js 14 dashboard via text and real-time 16kHz Gemini Live voice, executing 26 client-side DOM tools and coordinating with EDITH over the **Inter-Brain Synaptic Bus (`InterBrainBus`)**.

Key architectural capabilities:
- **Zero-Config Local Startup**: Boots in one command (`python run.py`) using SQLite WAL mode (`wb_agent.db`) and offline simulators, with seamless promotion to PostgreSQL 16 (`pgvector`), NVIDIA NIM, Google Gemini, and live WhatsApp.
- **Industry-Agnostic Customization**: Adapts in 10 seconds to any industry via the **AI Business Auto-Fill Architect** (`POST /api/v1/settings/generate-business-profile`) or 6+ built-in industry presets.
- **Multi-Tier Persistent Memory**: Short-term rolling turns, conversation summary, long-term customer facts, and unified `KnowledgeItem` RAG.
- **Deterministic Pricing Rule Enforcement**: Zero hallucinated discounts or promises (`PricingService` + `ResponseValidator`).
- **Dual WhatsApp Gateway**: Switch in `/settings` between the **Unofficial Baileys Web Bridge** (port `3001`, QR/8-digit code) and the **Official Meta Cloud API** (`graph.facebook.com/v19.0`).

---

## 2. Core Architecture Components

```
                 +--------------------------------------------------+
                 |          WhatsApp Inbound / Outbound Node        |
                 |   (Baileys Bridge Port 3001 / Meta Cloud API)    |
                 +------------------------+-------------------------+
                                          | HTTP Webhooks / REST
                                          v
+-----------------------------------------+------------------------------------------+
|                            FastAPI Backend Engine (:8000)                          |
|                                                                                    |
|  +----------------------+  +----------------------+  +--------------------------+  |
|  | Context Builder      |  | Sales & RAG Engine   |  | Deterministic Pricing    |  |
|  | - Recent Messages    |  | - SPIN Discovery     |  | - MOQs & Volume Tiers    |  |
|  | - Memory & Profile   |  | - 16-Stage Machine   |  | - Max 5% Auto-Discount   |  |
|  | - Provenance Facts   |  | - KnowledgeItem RAG  |  | - Multi-Currency + GST   |  |
|  +----------+-----------+  +----------+-----------+  +------------+-------------+  |
|             |                         |                           |                |
|             v                         v                           v                |
|  +------------------------------------------------------------------------------+  |
|  |                 EDITH AgentOrchestrator & InterBrainBus                      |  |
|  |       15-Step Turn Pipeline <-> Synaptic Bus <-> FRIDAY Web & Voice          |  |
|  +------------------------------------+-----------------------------------------+  |
|                                       |                                            |
|                                       v                                            |
|  +------------------------------------------------------------------------------+  |
|  |                   Dynamic 5-Role LLM Router (18 Models)                      |  |
|  |  - friday_web (Gemini 2.5 Flash)   - edith_whatsapp (Nemotron Ultra 550B)    |  |
|  |  - voice_agent (Gemini 3.1 Live)   - margin_auditor (Nemotron-4 340B)        |  |
|  |  - watchdog_supervisor (Nano 30B)  - SimulatorProvider (Zero-Key Failover)   |  |
|  +------------------------------------------------------------------------------+  |
+-----------------------------------------+------------------------------------------+
                                          |
                                          v
+-----------------------------------------+------------------------------------------+
|               Durable SQLite WAL (Default) / PostgreSQL 16 (pgvector)              |
|  - 40+ Core Entities: Organizations, Customers, Memories, KnowledgeItems,          |
|    Conversations, Quotes, Invoices, Orders, Jobs, Learnings, Prompts               |
+------------------------------------------------------------------------------------+
```

---

## 3. Subsystem Breakdown

### 3.1 Consultative Sales Engine (EDITH)
- Operates a 16-stage explicit transition state machine (`NEW` -> `DISCOVERY` -> `QUALIFIED` -> `RECOMMENDATION` -> `QUOTE_READY` -> `PURCHASE_INTENT` -> `HUMAN_HANDOFF` -> `WON` / `LOST`).
- Implements single-question discipline: never asks for information already provided by the lead record or prior chat turns.
- Dynamically injects `7 + N` modular prompt sections from `/prompts` along with Business Profile & Guardrails from `/settings`.

### 3.2 Omnipotent Web & Voice Copilot (FRIDAY)
- Connects via ephemeral WebSocket tokens (`POST /api/v1/voice/token`) to Google Gemini Live (`gemini-3.1-flash-live-preview`).
- Executes 26 client-side DOM tools (`navigate_to`, `click_element`, `scroll_page`, `execute_multi_step_workflow`, `consult_edith_brain`, `inspect_own_code`, spreadsheet editing, etc.).

### 3.3 Deterministic Pricing Authority
- Pricing is calculated strictly in Python (`PricingService`), evaluating product packaging variants, minimum order quantities, volume discounts, customer segment rules, and maximum autonomous discount limits (`5.0%`).
- Unsupported discount requests are automatically capped and flagged for human approval.

### 3.4 Bounded Background Worker
- Durable job queue (`jobs` table) with `SKIP LOCKED` concurrency guarantees.
- Analyzes idle conversations, updates summaries, generates contextual follow-ups, and cancels follow-ups immediately if the customer replies or an operator takes over.

### 3.5 Next.js 14 Mission Control Dashboard
- 17 interactive routes with **Simplified Mode (8 tabs)** and **Advanced Mode (14 tabs)**.
- 1-click takeover between AI and human modes, **"✨ Suggest Reply"** composer assistant, and **"Report / Correct"** continuous learning loop.
- Procedural Rust 3D asset pipeline (`rust-models/`) rendering interactive `.obj` meshes inside the Hero Deck.

---

<div align="center">
  <sub><b>WhatsApp AI Agent by NS</b> — Engineered by <b>Naboraj Sarkar (NS)</b></sub>
</div>
