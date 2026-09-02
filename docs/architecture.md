# WB-Agent Architecture Deep Dive

## 1. 15-Step Conversational Turn Decision Cycle

Every inbound WhatsApp turn processed by `AgentOrchestrator` executes through a strictly sequenced 15-step cycle:

1. **Webhook Ingestion**: Fast edge reception, HMAC-SHA256 signature verification, and deduplication.
2. **Turn-Level Mutex**: Acquires atomic lock on `Conversation.id` (`conversation_locks`) to eliminate race conditions from rapid successive user messages.
3. **Context Assembly**: Loads rolling recent turns, conversation summary, long-term customer memory, and preferred language without token bloat.
4. **Language & Intent Recognition**: Classifies language (English, Hindi, Bengali, Hinglish) and intent (`opt_out`, `human_request`, `purchase_intent`, `objection`, `price_inquiry`, `sample_request`, `product_inquiry`).
5. **Opt-Out Compliance**: If opt-out is detected, updates `Customer.opt_in_status = False`, records timestamp, transitions stage to `OPTED_OUT`, and dispatches immediate acknowledgment.
6. **Explicit Human Request**: If human requested, marks conversation mode `HUMAN`, records `Handoff`, and dispatches owner alert.
7. **Purchase Intent Detection**: If ready to purchase, transitions stage to `PURCHASE_INTENT`, raises lead score, creates handoff, and dispatches hot buyer alert to `+91 89006 53250`.
8. **Knowledge RAG Retrieval**: If information required, executes cosine similarity search over `knowledge_chunks` with source attribution.
9. **Deterministic Pricing Calculation**: If pricing or quote requested, queries `PricingService` to calculate volume tier discounts and enforce the 5% autonomous discount ceiling.
10. **LLM Generation**: Synthesizes response via `LLMRouter` (NVIDIA Nemotron with local simulator fallback).
11. **Defensive Validation**: Runs `ResponseValidator` to enforce factual grounding, block financial commitments, and sanitize against prompt injection.
12. **Atomic Pre-Send State Check (ADR-008)**: Re-queries `Conversation.mode`. If human operator engaged while LLM was generating, outbound AI message is suppressed.
13. **Outbound Dispatch**: Sends message via active `WhatsAppProvider`.
14. **Customer Memory & Summary Update**: Extracts new verified facts and updates semantic summary asynchronously.
15. **Audit Logging & Lock Release**: Commits `AgentRun` and `ToolCall` records, releases mutex, and broadcasts real-time updates via WebSockets.

---

## 2. Database Model Architecture (30 Domain Entities)

The PostgreSQL 16 schema is partitioned across 7 logical domains:

- **Tenancy & Auth**: `Organization`, `User`, `ApiKey`
- **CRM & Deals**: `Lead`, `Customer`, `Deal`, `LeadEvent`
- **Conversations & Memory**: `Conversation`, `Message`, `MessageStatus`, `ConversationSummary`, `CustomerMemory`
- **Catalog & Pricing**: `Product`, `ProductVariant`, `PricingRule`
- **Knowledge & RAG**: `KnowledgeDocument`, `KnowledgeChunk`
- **Follow-ups & Jobs**: `Campaign`, `CampaignLead`, `FollowupJob`, `Job`
- **Audit & Governance**: `AgentRun`, `AgentEvent`, `ToolCall`, `SalesEvent`, `Handoff`, `Notification`, `Integration`, `AgentSetting`, `AuditLog`
