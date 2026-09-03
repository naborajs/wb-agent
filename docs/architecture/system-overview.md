# WB-Agent (EDITH) — System Architecture Overview

## 1. System Vision & Purpose

**WB-Agent** is an enterprise-grade autonomous B2B sales consultant operating over WhatsApp. Named **EDITH**, the agent is engineered not as a superficial FAQ chatbot, but as a consultative sales representative capable of:
- Context-first conversation reasoning
- Multi-tier persistent memory (Short-term, Conversation summary, Long-term profile, Business truth)
- Deterministic pricing rule enforcement (zero hallucinated discounts or promises)
- Bounded background thinking and self-review
- Non-violent de-escalation and human operator handoff
- Real-time WhatsApp delivery tracking via multi-device bridge

---

## 2. Core Architecture Components

```
                +------------------------------------+
                |  WhatsApp Inbound / Outbound Node  |
                |  (Baileys Port 3001 / Meta Cloud)   |
                +-----------------+------------------+
                                  | HTTP Webhooks
                                  v
+---------------------------------+----------------------------------+
|                      FastAPI Backend Engine                        |
|                                                                    |
|  +----------------------+  +------------------+  +--------------+  |
|  | Context Builder      |  | Sales Engine     |  | Pricing Svc  |  |
|  | - Recent Messages    |  | - SPIN Discovery |  | - MOQs       |  |
|  | - Memory & Profile   |  | - Stage Machine  |  | - Vol Tiers  |  |
|  | - Provenance Facts   |  | - Question Select|  | - Margins    |  |
|  +----------+-----------+  +--------+---------+  +-------+------+  |
|             |                       |                    |         |
|             v                       v                    v         |
|  +--------------------------------------------------------------+  |
|  |                     Agent Orchestrator                       |  |
|  |         Structured Decision -> Validate -> Dispatch          |  |
|  +------------------------------+-------------------------------+  |
|                                 |                                  |
|                                 v                                  |
|  +--------------------------------------------------------------+  |
|  |             LLMRouter & Model Tier Architecture              |  |
|  |  - FAST (Intent/Language)    - NORMAL (Dialogue turns)       |  |
|  |  - DEEP_REASONING (Quotes)   - CRITICAL (High-value deals)   |  |
|  |  * Primary: NVIDIA Nemotron  * Fallback: Simulator/Emergency |  |
|  +--------------------------------------------------------------+  |
+---------------------------------+----------------------------------+
                                  |
                                  v
+---------------------------------+----------------------------------+
|                   Durable PostgreSQL / SQLite                      |
|  - 40+ Core Entities: Organizations, Customers, Memories,          |
|    Conversations, Quotes, Orders, Jobs, Learnings, Prompts         |
+--------------------------------------------------------------------+
```

---

## 3. Subsystem Breakdown

### 3.1 Consultative Sales Engine
- Operates a 16-stage explicit transition state machine (`NEW` -> `DISCOVERY` -> `QUALIFIED` -> `RECOMMENDATION` -> `PURCHASE_INTENT` -> `HUMAN_HANDOFF` -> `WON` / `LOST`).
- Implements single-question discipline: never asks for information already provided by the lead record or prior chat turns.

### 3.2 Deterministic Pricing Authority
- Pricing is calculated strictly in code (`PricingService`), evaluating product packaging variants, minimum order quantities, volume discounts, customer segment rules, and maximum autonomous discount limits (5.0%).
- Unsupported discount requests are automatically capped and flagged for human approval.

### 3.3 Bounded Background Worker
- Durable job queue with `SKIP LOCKED` concurrency guarantees.
- Analyzes idle conversations, updates summaries, generates contextual follow-ups, and cancels follow-ups immediately if the customer replies or an operator takes over.

### 3.4 Live Inbox & Operator Experience
- Next.js 14 dashboard with responsive Tailwind dark/light mode.
- 1-click takeover between AI and human modes.
- "+ New Chat" modal for arbitrary phone numbers.
- "Report / Correct" feedback modal emitting learning events and staging knowledge candidates.
