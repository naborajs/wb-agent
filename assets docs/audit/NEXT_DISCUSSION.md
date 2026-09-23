# NEXT_DISCUSSION.md: Strategic Handoff & Architectural Decision Register

> **Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY DATABASE  
> **Date of Audit**: 2026-09-21  
> **Repository Root**: `d:/Projects/Python/wb-agent`  
> **Target Audience**: Senior AI Systems Architect, ChatGPT Enterprise Engineering Team, Lead Backend Engineers

---

## 1. Executive Context

WB-Agent (EDITH & FRIDAY) has reached a high level of operational capability as a single-tenant / local-first prototype. It boasts 60/60 passing E2E tests, 177/181 passing unit tests, deterministic pricing rules, a 16-stage sales state machine, 4-tier customer memory, and an 11-section dynamic prompt engine.

However, transforming this codebase into a **commercial multi-tenant SaaS platform** (hosted on Vercel frontend + dedicated Python backend with automated customer onboarding, custom business profiles, and dynamic WhatsApp connections) requires resolving key architectural dichotomies, repairing existing P0/P1 debt, and making decisive technology choices.

This document lays out the strategic decisions, architectural trade-offs, and critical questions across 11 key categories (A through K) for the incoming architect.

---

## 2. Decision Categories (A through K)

---

### Category A: Architecture & Multi-Tenancy Strategy

#### Current State
- The database schema features an `org_id` foreign key column on almost all tables.
- **P0 Critical Bug**: The system suffers from an **Organization ID Split-Brain**:
  - `backend/app/config.py` defines `DEFAULT_ORG_ID = "org_default"`.
  - The dynamic prompt migration (`migrate_to_dynamic_prompt_sections.py`), seed scripts, and sample catalog items use `"org_default_tea"`.
  - In `wb_agent.db`, all `leads`, `products`, and `prompt_sections` are under `org_default_tea`, while `handoffs` are under `org_default`, and `customers` / `conversations` are split.
  - Queries hitting `/api/v1/analytics/overview` or `/api/v1/leads` return 0 results because they query for `org_default`.
- There is no active tenant-scoped JWT auth or self-serve tenant registration flow (`/auth/register` is absent; mock users exist).

#### Strategic Questions for Architect
1. **Multi-Tenant Isolation Model**:
   - *Option 1 (Shared Database, Row-Level Tenant ID)*: Retain single database with strictly enforced SQLAlchemy tenant filtering middleware or Postgres Row-Level Security (RLS).
   - *Option 2 (Schema-per-Tenant)*: Create a separate Postgres schema for each registered business.
   - *Option 3 (Database-per-Tenant)*: Dynamically provision isolated database instances for each paying customer.
   - *Recommendation*: **Option 1 (Shared Database with RLS / Scoped Session)** is the most cost-effective and scalable for SaaS if enforced at the ORM base repository layer.
2. **Immediate Remediation of Split-Brain**:
   - Should we run a data normalization migration to consolidate all existing records to `org_default` or align `config.py` to `org_default_tea` during the transition?
3. **Tenant Onboarding Lifecycle**:
   - What is the step-by-step onboarding pipeline when a new business signs up? (e.g., `Register Org` -> `Set Industry & Policies` -> `Upload Catalog/Docs` -> `Scan WhatsApp QR` -> `Go Live`).

---

### Category B: Domain Decoupling & Business Agnosticization

#### Current State
The system was originally developed around wholesale tea distribution ("North Bengal Tea Co."). While core engines are abstract, several hardcoded couplings remain:
- `backend/app/agent/extractor.py`: Hardcoded tea use cases (`milk_tea`, `green_tea`), packaging types (`chest`, `gunny`), and business types (`tapri`).
- `backend/app/agent/critic.py`: Hardcoded regex forbidding tea seed claims (`r"\b(?:we\s*grow\s*tea\s*seeds...)"`).
- `backend/app/pricing/calculator.py`: Method signatures and models use `quantity_kg` and `min_order_quantity_kg`.
- `backend/app/services/invoice_generator.py`: Hardcodes "North Bengal Tea Co.", Siliguri address, tea HSN codes (0902), and specific FSSAI licenses.

#### Strategic Questions for Architect
1. **Dynamic Entity & Attribute Schema**:
   - How should units of measurement be generalized? (e.g., replace `quantity_kg` with `quantity: Decimal` and `unit_of_measure: str` such as `"units"`, `"liters"`, `"boxes"`, `"hours"`).
2. **Configurable Extractor & Critic Rules**:
   - Should extraction targets and critic guardrails be stored in the database (`organization_settings` or dynamic JSON schema) and fed into prompt context rather than hardcoded Python regexes?
3. **White-Label Invoicing**:
   - How should business letterheads, GSTIN/VAT, logos, and bank details be structured in `organizations` to make PDF generation 100% white-labeled?

---

### Category C: Memory & Context Scalability

#### Current State
- 4-tier memory architecture is functioning well locally with SQLite/Postgres.
- Vector search in `backend/app/knowledge/retrieval.py` computes cosine similarity in-memory using Python loops over JSON embeddings.
- Background analysis runs as an asynchronous FastAPI task 10 minutes post-conversation.

#### Strategic Questions for Architect
1. **Vector Storage Migration**:
   - Should we migrate vector storage from Python in-memory math to **pgvector** inside PostgreSQL, or adopt an external vector database (e.g., Qdrant, Pinecone)?
   - *Recommendation*: **pgvector** keeps the architecture simple, ACID-compliant, and avoids unnecessary multi-database complexity.
2. **Memory Compaction & Token Windows**:
   - When conversations exceed 50+ turns across multiple weeks, what is the compaction strategy? Currently, a 20-message sliding window is used alongside `ConversationSummary`. Should older turns be archived to cold storage?
3. **Distributed Session State**:
   - For a multi-instance backend deployment, do we need Redis for short-term caching of conversation locks and turn deduplication?

---

### Category D: Dual-Brain & Agentic Reasoning Hierarchy

#### Current State
- `backend/app/brain/inter_brain_bus.py` (3,514 lines) defines `EdithBrain` (NVIDIA NIM) and `FridayBrain` (Google Gemini) communicating via `inter_brain_messages`.
- FRIDAY acts as the executive supervisor and audio briefing narrator; EDITH acts as the customer-facing WhatsApp negotiator with autonomous discount boundaries and refusal rights.

#### Strategic Questions for Architect
1. **Dual-Model Cost & Latency**:
   - Running two distinct enterprise LLM providers (NVIDIA NIM + Google Gemini) introduces dual API billing and configuration overhead. Is the dual-brain division essential for SaaS, or should the model provider be configurable per tenant (e.g., allowing tenants to bring their own OpenAI, Anthropic, or Gemini keys)?
2. **Inter-Brain Telemetry Overhead**:
   - Real-time logging of inter-brain bus messages creates hundreds of database rows per active session. Should synaptic telemetry have a retention/TTL policy (e.g., auto-purge after 14 days)?

---

### Category E: Voice Copilot & Gemini Live WebSocket

#### Current State
- The frontend features `VoiceAgent.tsx` docked in the bottom-right corner of the dashboard.
- It connects to `/api/v1/voice/session-token` to mint an ephemeral Gemini Live token and streams bidirectional audio.
- Telemetry is logged to `voice_audit_logs`.

#### Strategic Questions for Architect
1. **Client-to-Provider vs Proxy-Through-Backend**:
   - Currently, the client establishes a direct WebSocket to Google's Gemini Live API using an ephemeral token. Is this preferred, or should the WebSocket terminate at FastAPI to enable centralized audio recording, rate limiting, and compliance filtering?
2. **Voice Multi-Tenancy**:
   - How should voice prompt instructions be customized per tenant? (Currently, `voice.py` injects `DEFAULT_PROMPT_SECTIONS` hardcoded to the default org).

---

### Category F: Front-End / Dashboard Modernization & Vercel Deployment

#### Current State
- The dashboard is built on **Next.js 14 App Router** with Tailwind CSS.
- **Critical Deployment Blockers**:
  1. `dashboard/app/conversations/page.tsx` (L236) hardcodes `:8000` in the WebSocket URL (`ws://${host}:8000/...`), which breaks when hosted on Vercel (`*.vercel.app`).
  2. `dashboard/app/followups/page.tsx` is 100% hardcoded static JSX with zero API integration, completely disconnected from the `followup_jobs` table.
  3. `/pricing` and `/products` are redundant redirect stubs pointing to `/knowledge`.

#### Strategic Questions for Architect
1. **WebSocket & Hosting Topology**:
   - Next.js hosted on Vercel does not support long-lived persistent WebSocket connections.
   - Should WebSocket connections point directly to the backend URL via an environment variable (`NEXT_PUBLIC_WS_URL`)?
   - Or should we introduce a serverless real-time pub/sub layer (e.g., Pusher, Supabase Realtime, or AWS API Gateway WebSockets)?
2. **Follow-Up Automation UI**:
   - How should the `/followups` page be rebuilt? (It should display active follow-up cadences, next scheduled execution times from `followup_jobs`, cancel/reschedule buttons, and touchpoint conversion analytics).

---

### Category G: WhatsApp Gateway Resiliency & Multi-Session Scalability

#### Current State
- Two gateway implementations exist:
  1. **Node.js Baileys Bridge** (`whatsapp-bridge/`, port 3001): Supports QR code scanning, multi-device socket. Single-session only in current code.
  2. **Meta Cloud API** (`backend/app/whatsapp/meta_provider.py`): Webhook-based, official API.

#### Strategic Questions for Architect
1. **Multi-Tenant WhatsApp Strategy**:
   - For a multi-tenant SaaS where 100+ businesses connect their WhatsApp:
     - Can the Baileys bridge scale to hundreds of concurrent multi-device sockets, or should tenants be encouraged/required to use Meta Cloud API?
     - If Baileys is retained for low-barrier QR onboarding, should the bridge be containerized and run a multi-session manager (e.g., Baileys auth credentials stored in Redis or S3/Postgres)?
2. **QR Code Onboarding Experience**:
   - How will a new user scan a QR code from the Next.js dashboard when the backend is multi-tenant? (The dashboard needs a session-scoped endpoint `/api/v1/whatsapp/qr?org_id=...`).

---

### Category H: Background Task Queue & Worker Scaling

#### Current State
- `backend/app/jobs/worker.py` runs as an `asyncio.create_task` inside the FastAPI lifespan process.
- It polls `jobs` table every 0.5s using `SELECT FOR UPDATE SKIP LOCKED`.

#### Strategic Questions for Architect
1. **In-Process Worker vs Dedicated Worker Service**:
   - If FastAPI runs across multiple horizontal containers (e.g., behind an ALB/traefik), running in-process workers on every container causes redundant polling and potential lock contention.
   - Should background workers be extracted into a separate containerized service (`python -m app.jobs.worker`)?
2. **Queue Backend**:
   - Is Postgres `SKIP LOCKED` sufficient for our throughput (1,000–50,000 jobs/day), or should we migrate to Celery + Redis or Temporal?
   - *Recommendation*: Postgres `SKIP LOCKED` is battle-tested and eliminates the need for an extra Redis/Celery dependency at current and near-term scale.

---

### Category I: Pricing & Invoicing Engine Agnosticization

#### Current State
- `PricingService` deterministically enforces MOQ, volume tiers, and a 5.0% discount ceiling.
- `backend/app/services/invoice_generator.py` uses ReportLab to generate PDF quotes/invoices with hardcoded Indian GST (CGST/SGST 2.5%) and North Bengal Tea Co branding.

#### Strategic Questions for Architect
1. **Dynamic Tax Engine**:
   - How should tax calculations be generalized across jurisdictions? (e.g., Indian GST, US Sales Tax, EU VAT, zero-tax exports).
2. **Multi-Currency Support**:
   - What currency formatting and conversion logic should be standardized? (Currently hardcoded to INR `₹`).
3. **HTML-to-PDF vs ReportLab**:
   - Is ReportLab Python drawing code maintainable long-term, or should we switch to template-driven HTML/CSS-to-PDF (e.g., WeasyPrint) allowing users to design invoice templates?

---

### Category J: Analytics, Observability & Tracing

#### Current State
- Database captures `agent_runs`, `agent_events`, `sales_events`, `tool_calls`, `audit_logs`, and `watchdog_alerts`.
- Custom `CorrelationIdMiddleware` propagates request correlation IDs.

#### Strategic Questions for Architect
1. **Centralized Logging & APM**:
   - What observability platform should be integrated? (e.g., OpenTelemetry, Datadog, Sentry, or Grafana/Loki).
2. **Analytics Aggregation & Caching**:
   - Dashboard analytics queries currently perform real-time SQL aggregates over `leads`, `conversations`, and `deals`. At scale, should these be pre-aggregated into a daily summary table or cached in Redis?

---

### Category K: Test Suite & CI/CD Hardening

#### Current State
- E2E Test Suite: **60/60 PASS** (100% pass rate).
- Unit Test Suite: **177 PASS, 4 FAIL** out of 181 tests:
  - `tests/unit/test_ai_chains.py::test_capability_chains_structure`: Fails due to model rename to `meta/llama-3.3-70b-instruct`.
  - `tests/unit/test_prompts.py::test_prompt_architect_evaluation`: Fails due to missing `rating_score` key.
  - `tests/unit/test_prompts.py` (2 tests): Fail due to `org_default` vs `org_default_tea` mismatch.

#### Strategic Questions for Architect
1. **Test Suite Remediation**:
   - Fixing these 4 unit tests is trivial and will restore the unit suite to 181/181 (100% pass rate). Should this be the immediate first step of Phase 2?
2. **Automated CI/CD Pipeline**:
   - Setting up GitHub Actions to run `pytest tests/unit` and `npm run build` on every push to `main`.

---

## 3. Prioritized Decision Summary Table

| Category | Issue / Decision | Recommended Direction | Priority |
| :--- | :--- | :--- | :--- |
| **A. Architecture** | Resolve `org_default` vs `org_default_tea` split-brain | Consolidate database records to unified tenant ID | **P0 (Immediate)** |
| **F. Frontend** | Fix hardcoded `:8000` WebSocket in `conversations/page.tsx` | Use dynamic `NEXT_PUBLIC_WS_URL` env variable | **P0 (Immediate)** |
| **K. Test Suite** | Fix 4 failing unit tests | Update assertions to match current model strings & keys | **P1 (High)** |
| **B. Agnosticization** | Decouple tea-specific regex, extractors, and `quantity_kg` | Generalize into tenant profile configuration schema | **P1 (High)** |
| **F. Frontend** | Rebuild `/followups` page | Connect to `/api/v1/campaigns/followups` endpoints | **P1 (High)** |
| **A. Architecture** | Tenant registration & JWT authentication flow | Implement `/auth/register` and tenant-scoped session | **P1 (High)** |
| **G. Gateways** | Multi-session WhatsApp onboarding | Add tenant-scoped QR endpoint and multi-device manager | **P1 (High)** |
| **C. Memory** | Migrate vector search to pgvector | Replace Python in-memory cosine loop with pgvector | **P2 (Medium)** |
| **I. Invoicing** | Template-driven multi-currency invoicing | Generalize tax and currency in `organizations` | **P2 (Medium)** |
| **H. Workers** | Separate background worker container | Run `app.jobs.worker` as dedicated worker process | **P2 (Medium)** |
| **D. Dual-Brain** | Multi-model billing & key management | Allow BYOK (Bring Your Own Key) per tenant | **P3 (Roadmap)** |
