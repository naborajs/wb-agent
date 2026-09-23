# CURRENT_ARCHITECTURE.md: Complete Architectural Blueprint & Subsystem Deep-Dive

> **Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY DATABASE  
> **Date of Audit**: 2026-09-21  
> **Repository Root**: `d:/Projects/Python/wb-agent`  
> **Target Audience**: Senior AI Systems Architect, ChatGPT Enterprise Engineering Team, Production Tech Leads

---

## 1. System Overview & Multi-Tier Topology

WB-Agent (codenamed **EDITH** / **FRIDAY**) is an enterprise-grade autonomous sales operating system for B2B WhatsApp commerce. The system coordinates two distinct cognitive agents:
1. **EDITH** (Autonomous Commercial Closer & WhatsApp Negotiator): Powered by NVIDIA NIM (`meta/llama-3.3-70b-instruct` / `nvidia/nemotron-3-8b-base`), EDITH conducts direct customer negotiations, executes deterministic pricing calculations, handles sales objections, and enforces strict boundary guards.
2. **FRIDAY** (Executive Copilot & Web AI Supervisor): Powered by Google Gemini (`gemini-2.5-flash` / Gemini Live WebRTC), FRIDAY acts as the business owner's copilot, analyzing pipeline health, delegating outbound campaigns, managing knowledge, and rendering audio briefings.

```mermaid
flowchart TD
    subgraph Clients["Client & Gateway Layer"]
        WA_Cust["WhatsApp Customer<br/>(Mobile)"]
        Web_Admin["Business Owner / Operator<br/>(Next.js 14 Dashboard)"]
        Voice_Mic["Operator Voice Copilot<br/>(Gemini Live WebRTC)"]
    end

    subgraph Gateways["Messaging Gateways"]
        Baileys["Node.js Baileys Bridge<br/>(Port 3001 / QR Scan)"]
        MetaCloud["Meta Cloud WhatsApp API<br/>(v21.0 Webhook)"]
    end

    subgraph FastAPILayer["FastAPI Core Application (Port 8000)"]
        Router["API Gateway / 27 Routers<br/>(/api/v1/*)"]
        AuthMid["Security & Tracing Middleware<br/>(CorrelationId, SecurityHeaders)"]
        WSMgr["Realtime WebSocket Manager<br/>(/api/v1/ws)"]
    end

    subgraph DualBrain["Cognitive Layer (Dual Brain)"]
        Orchestrator["AgentOrchestrator<br/>(Turn Pipeline)"]
        SalesEngine["ConsultativeSalesEngine<br/>(SPIN Discovery & Scoring)"]
        StateMachine["SalesStageManager<br/>(16-Stage State Machine)"]
        InterBrain["InterBrainBus<br/>(FRIDAY <-> EDITH Protocol)"]
        PromptSvc["PromptService<br/>(11 Modular Sections)"]
    end

    subgraph DeterministicEngines["Deterministic Authority Engines"]
        PricingEngine["PricingService<br/>(Volume Tiers, MOQ, Discount Caps)"]
        CriticValidator["ResponseValidator & Critic<br/>(Fact Check, Hallucination Guard)"]
        InvoiceGen["Invoice & Proposal Engine<br/>(ReportLab PDF Generator)"]
    end

    subgraph MemoryKnowledge["Memory & RAG Layer"]
        ContextBuild["ContextBuilder<br/>(Bounded Structured Context)"]
        Memory4Tier["4-Tier Customer Memory<br/>(Discrete Facts, Rolling Summaries)"]
        RAGStore["KnowledgeRetrievalService<br/>(Cosine Vector Search & Chunks)"]
    end

    subgraph BackgroundWorkers["Background Worker Subsystem"]
        JobWorker["Worker Daemon<br/>(SKIP LOCKED Queue Polling 0.5s)"]
        Watchdog["WatchdogService<br/>(Diagnostic Audit Loop 180s)"]
        FollowupScheduler["FollowupScheduler<br/>(Cadence Engine: 20m, 8h, 7d)"]
    end

    subgraph StorageLayer["Persistence & Database Layer"]
        DB[(SQLite / PostgreSQL<br/>51 Relational Tables)]
        VectorIdx[(Vector Embeddings<br/>1536-dim / Cosine Store)]
    end

    WA_Cust <--> Baileys
    WA_Cust <--> MetaCloud
    Baileys --> Router
    MetaCloud --> Router
    Web_Admin <--> Router
    Web_Admin <--> WSMgr
    Voice_Mic <--> Router

    Router --> Orchestrator
    Router --> InterBrain
    Orchestrator --> ContextBuild
    ContextBuild --> Memory4Tier
    Orchestrator --> RAGStore
    Orchestrator --> SalesEngine
    SalesEngine --> StateMachine
    Orchestrator --> PromptSvc
    Orchestrator --> PricingEngine
    Orchestrator --> CriticValidator
    CriticValidator --> Router
    Orchestrator --> JobWorker

    InterBrain <--> DB
    JobWorker <--> DB
    Watchdog <--> DB
    FollowupScheduler <--> DB
    Memory4Tier <--> DB
    RAGStore <--> DB
    RAGStore <--> VectorIdx
```

---

## 2. Inbound & Outbound Messaging Pipeline

The messaging pipeline processes inbound customer interactions with strict idempotency, loop suppression, atomic state guards, and multi-provider failover.

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (WhatsApp)
    participant Gateway as WhatsApp Gateway (Baileys/Meta)
    participant Webhook as FastAPI Webhook (/api/v1/whatsapp/webhook)
    participant Worker as Background Worker (JobQueue)
    participant Orchestrator as AgentOrchestrator
    participant Context as ContextBuilder & MemoryService
    participant NIM as NVIDIA NIM (LLM)
    participant Critic as ResponseValidator & PricingValidator
    participant WS as WebSocket Manager (Dashboard)
    participant DB as Database (wb_agent.db)

    Customer->>Gateway: Sends message ("Need 200kg tea, what's best price?")
    Gateway->>Webhook: HTTP POST webhook event
    Webhook->>DB: Check Message Deduplication (provider_message_id)
    alt Is Duplicate Message
        Webhook-->>Gateway: HTTP 200 (Ignored)
    else New Inbound Message
        Webhook->>DB: Enqueue Job ('process_message', priority=100)
        Webhook-->>Gateway: HTTP 200 Accepted
    end

    Worker->>DB: Claim Job (SKIP LOCKED)
    Worker->>Orchestrator: execute_turn(conversation_id, inbound_text)
    
    Orchestrator->>DB: Fetch Conversation & Customer Record
    Orchestrator->>Orchestrator: Group Chat & Human Mode Guardrail Check
    alt Is Group Chat (@g.us) or Mode == 'HUMAN'
        Orchestrator->>DB: Update mode='HUMAN', suppress AI reply
        Orchestrator->>WS: Broadcast 'new_message' (Operator Alert)
    else Mode == 'AI'
        Orchestrator->>Context: build_context(conversation_id)
        Context->>DB: Load verified memories, rolling summary, last 20 messages
        Context-->>Orchestrator: ConversationContext payload
        
        Orchestrator->>DB: Query KnowledgeRetrievalService (RAG match)
        Orchestrator->>NIM: Send Turn Prompt (Modular Sections + Context + RAG)
        NIM-->>Orchestrator: Raw Candidate Response
        
        Orchestrator->>Critic: Validate response (pricing claims, facts, tone)
        Critic-->>Orchestrator: Sanitized & Approved Response
        
        Orchestrator->>DB: Atomic Pre-Send State Check (Ensure operator hasn't taken over)
        Orchestrator->>Gateway: POST /send-message (Outbound Text)
        Gateway->>Customer: Delivers WhatsApp message
        
        Orchestrator->>DB: Store Outbound Message & Update Sales Stage
        Orchestrator->>WS: Broadcast 'new_message' & 'stage_changed'
        Orchestrator->>DB: Enqueue 'background_analysis' Job (10-minute cooldown)
    end
```

### Key Guardrails in Orchestrator (`backend/app/agent/orchestrator.py`):
1. **Self-Message Echo Suppression**: Drops any message where `sender_id == settings.WHATSAPP_BOT_NUMBER` (`918918753100`).
2. **WhatsApp Group Chat Suppression**: Inspects `channel_id.endswith("@g.us")`. If true, automatically sets `mode = "HUMAN"` and suppresses autonomous reply.
3. **Turn Idempotency Guard**: Checks if an outbound agent reply already exists with timestamp `>= inbound_msg.created_at`.
4. **Human Takeover Race Condition Guard**: Re-checks `conv.mode` immediately prior to dispatching outbound payload. If operator flipped toggle to `HUMAN`, the LLM reply is discarded.

---

## 3. Cognitive Architecture & Dual-Brain Protocol

The system separates executive supervisory tasks from front-line sales execution via the **Inter-Brain Bus** (`backend/app/brain/inter_brain_bus.py`, 3,514 lines).

```mermaid
flowchart LR
    subgraph FRIDAY_Brain["FRIDAY Brain (Google Gemini 2.5 Flash)"]
        F_Role["Executive Web Copilot"]
        F_Scope["• Pipeline Health Auditing<br/>• Proactive Morning Briefings<br/>• Campaign Triggering<br/>• Catalog & Knowledge Ingestion<br/>• Voice Copilot (Gemini Live)"]
    end

    subgraph Bus["Inter-Brain Bus (inter_brain_messages)"]
        B_Comm["Structured JSON RPC / Synaptic Events"]
        B_Types["• TASK_DELEGATION<br/>• POLICY_INQUIRY<br/>• NEGOTIATION_DEBRIEF<br/>• ANOMALY_ALERT<br/>• COUNTER_PROPOSAL"]
    end

    subgraph EDITH_Brain["EDITH Brain (NVIDIA NIM 70B)"]
        E_Role["Autonomous Commercial Closer"]
        E_Scope["• WhatsApp Conversations<br/>• SPIN Questioning Discipline<br/>• Deterministic Pricing Calculations<br/>• Objection Counter-Framing<br/>• Human Handoff Escalation"]
    end

    F_Brain -->|"Delegates Outbound Campaign / Policy"| Bus
    Bus -->|"Evaluates against pricing & MOQ rules"| E_Brain
    E_Brain -->|"Debriefs negotiation outcome / Anomaly"| Bus
    Bus -->|"Alerts Operator via Voice/Dashboard"| F_Brain
```

### Independent Agency & Refusal Rights:
- EDITH possesses **independent refusal rights**: If FRIDAY delegates a task that violates deterministic MOQ or exceeds the autonomous 5.0% discount ceiling, EDITH formally registers a rejection on the Inter-Brain Bus (`InterBrainMessage(status='rejected', reason='EXCEEDS_DISCOUNT_CEILING')`).
- Telemetry events are broadcast in real time to the `/brain` visual cockpit.

---

## 4. Sales Pipeline State Machine (16 Stages)

State progression is strictly governed by `SalesStageManager` (`backend/app/agent/sales_stage.py`). The LLM cannot assign arbitrary stages; transitions must exist in `ALLOWED_TRANSITIONS`.

```mermaid
stateDiagram-v2
    [*] --> NEW
    NEW --> CONTACTED
    NEW --> REPLIED
    NEW --> PAUSED
    NEW --> OPTED_OUT

    CONTACTED --> REPLIED
    CONTACTED --> DISCOVERY
    CONTACTED --> LOST

    REPLIED --> DISCOVERY
    REPLIED --> QUALIFYING
    REPLIED --> HUMAN_HANDOFF

    DISCOVERY --> QUALIFYING
    DISCOVERY --> QUALIFIED
    DISCOVERY --> RECOMMENDATION
    DISCOVERY --> OBJECTION
    DISCOVERY --> HUMAN_HANDOFF

    QUALIFYING --> QUALIFIED
    QUALIFYING --> DISCOVERY
    QUALIFYING --> RECOMMENDATION

    QUALIFIED --> RECOMMENDATION
    QUALIFIED --> INTERESTED
    QUALIFIED --> NEGOTIATION

    RECOMMENDATION --> INTERESTED
    RECOMMENDATION --> OBJECTION
    RECOMMENDATION --> PURCHASE_INTENT

    INTERESTED --> NEGOTIATION
    INTERESTED --> PURCHASE_INTENT
    INTERESTED --> OBJECTION

    OBJECTION --> DISCOVERY
    OBJECTION --> RECOMMENDATION
    OBJECTION --> NEGOTIATION
    OBJECTION --> LOST

    NEGOTIATION --> PURCHASE_INTENT
    NEGOTIATION --> HUMAN_HANDOFF
    NEGOTIATION --> OBJECTION

    PURCHASE_INTENT --> WON
    PURCHASE_INTENT --> HUMAN_HANDOFF
    PURCHASE_INTENT --> LOST

    HUMAN_HANDOFF --> WON
    HUMAN_HANDOFF --> LOST
    HUMAN_HANDOFF --> DISCOVERY

    WON --> [*]
    LOST --> [*]
    OPTED_OUT --> [*]
```

### Auditability:
Every stage transition writes an immutable `SalesEvent` record capturing:
- `conversation_id`, `from_stage`, `to_stage`
- `trigger_source` (`"llm_classification"`, `"operator_manual"`, `"timeout_cadence"`)
- `confidence_score` (0.0 to 1.0)
- `created_at` timestamp

---

## 5. Multi-Tier Memory Subsystem

The memory subsystem prevents repetitive questioning, maintains multi-week dialogue continuity, and extracts verifiable business facts while bounding LLM context window consumption.

```mermaid
flowchart TD
    subgraph T1["Tier 1: Ephemeral Active Turn"]
        M1["Latest Customer Inbound Message<br/>+ Immediate Turn State (Sentiment, Intent)"]
    end

    subgraph T2["Tier 2: Sliding Context Window"]
        M2["Last 20 Messages (Inbound & Outbound)<br/>Cleaned & Ordered by Created_At"]
    end

    subgraph T3["Tier 3: Discrete Structured Facts (CustomerMemory)"]
        M3["Key-Value Verified Entities with Provenance:<br/>• customer_said: 'monthly volume 500kg'<br/>• confidence: 0.95<br/>• source_message_id: msg_8f7b..."]
    end

    subgraph T4["Tier 4: Rolling Semantic Summaries"]
        M4["ConversationSummary Table:<br/>• High-level narrative summary<br/>• Customer unresolved questions<br/>• Key commitments made by agent"]
    end

    subgraph AsyncInsights["Background Semantic Analysis Daemon"]
        M5["Job: 'background_analysis' (Worker)<br/>Runs 10 min after last turn<br/>Extracts hidden objections, risk score, profile updates"]
    end

    T1 --> ContextBuilder
    T2 --> ContextBuilder
    T3 --> ContextBuilder
    T4 --> ContextBuilder
    ContextBuilder -->|"Assembles bounded prompt context"| AgentTurn
    AgentTurn -.->|"Triggers after turn"| AsyncInsights
    AsyncInsights -->|"Updates"| T3
    AsyncInsights -->|"Updates"| T4
```

### Memory Schema Specifications:
- `CustomerMemory`:
  - `key` (e.g., `business_type`, `daily_consumption`, `delivery_location`, `gstin`)
  - `value` (JSON string or scalar)
  - `provenance` (`CUSTOMER_SAID`, `INFERRED`, `OPERATOR_CONFIRMED`)
  - `confidence` (Decimal 0.00 – 1.00)
- `ConversationSummary`:
  - `summary` (Compact narrative)
  - `turn_count` (Track turns summarized)
  - `unresolved_objections` (JSON array)

---

## 6. Dynamic Modular Prompt Architecture

System prompts are not static text files; they are dynamically compiled from relational database records (`prompt_sections` and `prompt_versions`) managed by `PromptService` (`backend/app/agent/prompts.py`).

```mermaid
flowchart LR
    subgraph Sections["11 Dynamic Modular Sections (prompt_sections)"]
        S1["core_safety<br/>(Order: 1)"]
        S2["core_identity<br/>(Order: 2)"]
        S3["business_policy<br/>(Order: 3)"]
        S4["sales_style<br/>(Order: 4)"]
        S5["business_profile<br/>(Order: 5)"]
        S6["objection_handling<br/>(Order: 6)"]
        S7["pricing_guidelines<br/>(Order: 7)"]
        S8["custom_rules<br/>(Order: 8..11)"]
    end

    subgraph Versions["Version Control & Diff Engine (prompt_versions)"]
        V["Active Version (is_active = True)<br/>Token Count (cl100k_base BPE)<br/>Git-style line diffing"]
    end

    subgraph Compiler["Prompt Assembly Engine"]
        A["Filter is_active == True<br/>Order by order_index ASC<br/>Substitute Variables ({{business_name}})<br/>Inject ConversationContext"]
    end

    subgraph Output["Final LLM System Prompt"]
        P["NVIDIA Nemotron System Instruction<br/>(Audited & Token-Bounded)"]
    end

    Sections --> Versions
    Versions --> Compiler
    Compiler --> Output
```

### Prompt Management Capabilities:
1. **Live Dashboard Editor**: Route `/prompts` allows viewing and editing sections with live syntax highlighting and token calculation.
2. **Line-Level Git Diff**: Uses `difflib.ndiff` to display added/removed lines before committing version updates.
3. **Instant Rollback**: One-click reactivation of previous prompt versions (`activate_version`).
4. **Safety Pinning**: Critical versions can be pinned (`pinned = True`) to prevent pruning during maintenance.

---

## 7. Knowledge Hub, Vector Store & RAG Pipeline

The Knowledge Hub (`backend/app/knowledge/`) provides hybrid semantic retrieval across structured catalog items and unstructured business documents.

```mermaid
flowchart TD
    subgraph Ingestion["Document Ingestion Pipeline"]
        Doc["Raw Document<br/>(PDF, DOCX, TXT, MD)"] --> Parser["DocumentParser<br/>(pypdf / python-docx)"]
        Parser --> Chunker["DocumentChunker<br/>(Recursive Chunking, 500 tokens, 50 overlap)"]
    end

    subgraph EmbeddingGen["Vector Generation"]
        Chunker --> EmbedProvider["EmbeddingProvider<br/>(NVIDIA nv-embedqa-e5-v5 / LocalMock)"]
        EmbedProvider --> ChunksDB["knowledge_chunks Table<br/>(content, embedding_json, metadata)"]
    end

    subgraph RetrievalQuery["Runtime Query Pipeline"]
        CustQuery["Customer Message Query"] --> QueryEmbed["Generate Query Embedding"]
        QueryEmbed --> SimSearch["Cosine Vector Similarity Match<br/>(retrieval.py)"]
        SimSearch --> Ranker["Filter by category & min_score"]
        Ranker --> ContextInject["Inject Top-3 Chunks into Agent Context"]
    end

    subgraph UnknownHandling["Unknown Knowledge Escalation Pool"]
        SimSearch -->|Similarity < 0.65| UnknownMgr["UnknownKnowledgeManager"]
        UnknownMgr --> AlertDB["human_knowledge_requests Table"]
        AlertDB --> OwnerWA["WhatsApp Alert to Business Owner"]
    end
```

---

## 8. Deterministic Pricing & Invoicing Engine

To prevent catastrophic hallucinations (e.g., offering 90% discounts), pricing logic is completely removed from LLM discretion and executed by `PricingService` (`backend/app/pricing/calculator.py`).

```mermaid
flowchart TD
    Inquiry["Customer requests quote / discount"] --> AgentCall["Agent invokes Tool: calculate_price"]
    AgentCall --> FetchProd["Fetch Product & Variants from DB"]
    
    FetchProd --> CheckMOQ{"Quantity >= MOQ?"}
    CheckMOQ -- No --> RejectMOQ["Raise Error: Below Minimum Order Quantity"]
    CheckMOQ -- Yes --> CheckTiers["Match Volume Discount Tier in pricing_rules"]
    
    CheckTiers --> BasePrice["Compute Tiered Unit Price"]
    BasePrice --> CheckDisc{"Requested Extra Discount?"}
    
    CheckDisc -- None/0% --> FinalQuote["Return Verified Price Quote"]
    CheckDisc -- "> 0%" --> EvalDisc{"Discount <= 5.0% (MAX_AUTONOMOUS)?"}
    
    EvalDisc -- Yes --> ApplyDisc["Apply Autonomous Discount & Return"]
    EvalDisc -- No --> Escalate["Flag requires_human_approval = True<br/>Trigger HUMAN_HANDOFF"]
    
    FinalQuote --> PDFGen["Generate PDF Quotation (ReportLab)"]
    ApplyDisc --> PDFGen
    PDFGen --> DispatchWA["Send PDF via WhatsApp Bridge"]
```

---

## 9. Background Worker Subsystem & Durability

Asynchronous and scheduled workloads are executed by the `Worker` daemon (`backend/app/jobs/worker.py`) started during FastAPI lifespan startup.

```mermaid
flowchart TD
    subgraph JobSources["Job Sources"]
        InboundHook["WhatsApp Inbound Webhook"] -->|Enqueue 'process_message'| Queue[(Job Table in DB)]
        OrchestratorTurn["Agent Turn Post-Send"] -->|Enqueue 'background_analysis'| Queue
        CampaignLaunch["Campaign Launch Action"] -->|Enqueue 'send_campaign_lead'| Queue
    end

    subgraph WorkerDaemon["Worker Daemon (0.5s Poll Loop)"]
        Worker["Worker Instance (fastapi_lifespan_worker)"]
        Worker --> Claim["Claim Job using SELECT FOR UPDATE SKIP LOCKED"]
        Claim --> Registry["Job Registry Lookup (get_handler)"]
        Registry --> ExecMsg["handle_process_message"]
        Registry --> ExecBg["handle_background_analysis"]
        ExecMsg --> Complete["Mark Job Completed (completed_at)"]
        ExecBg --> Complete
        ExecMsg -.->|On Error| Fail["Increment retries / Mark Failed (failed_at)"]
    end

    subgraph Supervisors["Periodic Lifespan Supervisions"]
        WatchdogLoop["Watchdog Periodic Loop (180s)<br/>Runs full diagnostic audit across all tables"]
        FollowupLoop["Followup Cadence Loop<br/>Checks touchpoints (20m, 8h, 7d)"]
    end
```

---

## 10. Data Layer Architecture (51 Tables across 16 Modules)

The database schema is organized into 16 modular domains under `backend/app/database/models/`:

| Module | Table Names | Primary Purpose |
| :--- | :--- | :--- |
| **organization.py** | `organizations`, `users`, `api_keys` | Tenant hierarchy, user authentication, API credentials |
| **lead_customer.py** | `leads`, `customers`, `deals`, `lead_events` | B2B CRM core, pipeline value, deal stages |
| **conversation.py** | `conversations`, `messages`, `message_statuses`, `conversation_summaries`, `customer_memory` | Chat sessions, message history, 4-tier memory |
| **product_pricing.py**| `products`, `product_variants`, `pricing_rules`, `product_custom_fields`, `pricing_rule_versions`, `inventory` | Catalog, volume tiers, MOQ, inventory tracking |
| **knowledge.py** | `knowledge_documents`, `knowledge_chunks` | Unstructured RAG documents and vector chunks |
| **knowledge_item.py**| `knowledge_items`, `knowledge_categories` | Structured business rules, FAQs, guidelines |
| **knowledge_request.py**| `human_knowledge_requests`, `knowledge_candidates`, `customer_profile_versions`, `conversation_analysis` | Unknown question escalations, auto-extracted profiles |
| **campaign_followup.py**| `campaigns`, `campaign_leads`, `followup_jobs`, `jobs` | Outbound campaigns, cadence scheduler, durable queue |
| **agent_audit.py** | `agent_runs`, `agent_events`, `tool_calls`, `sales_events`, `handoffs`, `notifications`, `integrations`, `agent_settings`, `audit_logs`, `voice_audit_logs`, `friday_problem_reports` | Complete telemetry, audit trails, human handoffs |
| **order.py** | `orders`, `order_items`, `quotes`, `quote_items` | B2B commercial transactions and quotations |
| **prompt_section.py**| `prompt_sections` | Dynamic modular system prompt sections |
| **prompt_version.py**| `prompt_versions` | Version-controlled prompt instructions and diffs |
| **inter_brain.py** | `inter_brain_messages` | FRIDAY <-> EDITH asynchronous bus communications |
| **watchdog.py** | `watchdog_alerts` | Autonomous system health and diagnostic alarms |
| **notification.py** | `agent_notifications` | Operator dashboard notifications and unread badges |
| **learning.py** | `sales_learnings` | Auto-extracted sales conversion insights |

---

## 11. Security, Redaction & Recovery

1. **Zero Secret Exposure**:
   - Environment variables (`.env`) hold API keys (`NVIDIA_API_KEY`, `GEMINI_API_KEY`, `WHATSAPP_TOKEN`).
   - Settings are instantiated via Pydantic `BaseSettings` (`backend/app/config.py`).
   - API endpoints redact sensitive keys when returning configuration objects to the frontend.
2. **Correlation ID Tracing**:
   - Every HTTP request passes through `CorrelationIdMiddleware`, stamping an `X-Correlation-ID` header for end-to-end tracing across FastAPI logs and background jobs.
3. **Database Integrity & Cascades**:
   - Foreign key constraints with `ON DELETE CASCADE` prevent orphaned records in `messages`, `customer_memory`, and `prompt_versions`.
4. **Graceful Daemon Shutdown**:
   - `lifespan` context manager traps `SIGINT` / `SIGTERM`, signals `worker.stop()`, and awaits active task completion before closing the database connection pool.
