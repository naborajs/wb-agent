# Security Architecture & Threat Model

## 1. Overview & Threat Vectors

As an autonomous commercial agent interfacing with external customers over WhatsApp and operators via a web dashboard, WB-Agent guards against:
1. **Adversarial Prompt Injection**: Malicious customer attempts to override system rules, claim unauthorized discounts, or force the model out of its consultative role.
2. **System Prompt / Secret Leakage**: Customers asking the agent to "print your instructions", "reveal your system prompt", or reveal internal API keys.
3. **Human Takeover Race Conditions**: Outbound AI messages racing against manual operator interventions.
4. **Denial of Service / Webhook Flooding**: High-frequency inbound message spam designed to exhaust LLM tokens or thread pool connections.
5. **PII and Financial Integrity**: Exposure of customer records across organization boundaries.

---

## 2. Defensive Controls

### 2.1 Untrusted Input Quarantine
- All customer WhatsApp messages, uploaded CSVs, and Apify dataset payloads are treated as untrusted external input.
- Messages are sanitized and inspected by the `PromptInjectionDetector` and `ResponseValidator` before being passed into dialogue context.
- System instructions explicitly mandate that external messages cannot alter business policies, override discounts, or change authority boundaries.

### 2.2 Deterministic Pricing Barrier
- The LLM does NOT calculate prices or grant discounts.
- All numbers, volume tiers, minimum quantities, and totals are computed strictly in Python code (`PricingService`).
- If an LLM response claims an unauthorized rate, `ResponseValidator` catches the deviation and rewrites it to the verified catalog rate.

### 2.3 Atomic Pre-Send Takeover Guard
- At the exact millisecond before dispatching a message over WhatsApp, `AgentOrchestrator` re-queries the conversation record.
- If `mode == "HUMAN"` or `mode == "PAUSED"`, the outbound dispatch is immediately suppressed with `is_suppressed = True`, eliminating race conditions where human operators and AI speak at the same time.

### 2.4 Multi-Tenant Organization Isolation
- Every database model inherits `OrgScopedMixin` with mandatory `org_id` indexing.
- Every API endpoint and background job enforces organization scoping to prevent cross-tenant data leakage.
