# Security Architecture & Threat Model — WhatsApp AI Agent by NS

> ⬅️ Back to: [[../index|Knowledge Base Index]] | **Engineering Reference**: [[../guides/senior-developer-architecture|Senior Developer Architecture]]

## 1. Overview & Threat Vectors

As an autonomous commercial operating system interfacing with external customers over WhatsApp and operators via a web and voice dashboard, **WhatsApp AI Agent by NS** guards against:
1. **Adversarial Prompt Injection**: Malicious customer attempts to override system rules, claim unauthorized discounts, or force EDITH out of its consultative role.
2. **System Prompt / Secret Leakage**: Customers asking the agent to "print your instructions", "reveal your system prompt", or expose internal API keys.
3. **Browser-Side API Key Exposure (Voice Agent)**: Exposing raw `GEMINI_API_KEY` secrets inside client-side browser bundles during WebRTC/WebSocket audio streaming.
4. **Human Takeover Race Conditions**: Outbound AI messages racing against manual operator interventions.
5. **Cross-Brain Destructive Actions**: Operator or prompt-injected commands attempting to delete active high-value leads (`hot` / `PURCHASE_INTENT`).
6. **Simulation Leakage to Live WhatsApp**: Test or sandbox messages accidentally dispatching to real customer phone numbers.

---

## 2. Defensive Controls

### 2.1 Untrusted Input Quarantine
- All customer WhatsApp messages, uploaded CSVs, and Apify dataset payloads are treated as untrusted external input.
- Messages are sanitized and inspected by the `PromptInjectionDetector` and `ResponseValidator` before being passed into dialogue context.
- System instructions explicitly mandate that external messages cannot alter business policies, override discounts, or change authority boundaries.

### 2.2 Deterministic Pricing Barrier
- The LLM does **not** calculate prices or grant arbitrary discounts.
- All numbers, volume tiers, minimum quantities, and GST totals are computed strictly in Python code (`PricingService`).
- If an LLM response claims an unauthorized rate exceeding `max_auto_discount_pct` (`5.0%`), `ResponseValidator` catches the deviation and rewrites it to the verified catalog rate.

### 2.3 Ephemeral Gemini Live Voice Tokens
- Raw `GEMINI_API_KEY` credentials are never shipped to the browser when using the **FRIDAY Voice Agent**.
- Instead, the browser calls `POST /api/v1/voice/token`, which uses `client.auth_tokens.create` (`v1alpha`) on the backend to mint a short-lived ephemeral token (30-minute session TTL, 2-minute connection lock) locked strictly to `models/gemini-3.1-flash-live-preview`.

### 2.4 Atomic Pre-Send Takeover Guard & Group Suppression
- At the exact millisecond before dispatching a message over WhatsApp, `AgentOrchestrator` re-queries the conversation record (`Step 12`).
- If `mode == "HUMAN"`, `mode == "PAUSED"`, or the conversation is a WhatsApp Group (`@g.us`), the outbound dispatch is immediately suppressed with `is_suppressed = True`.

### 2.5 Autonomous Dual-Brain Refusal Guard (ADR-0015 / ADR-0023)
- When FRIDAY delegates a destructive action (such as deleting a conversation) over the `InterBrainBus`, EDITH independently inspects the lead's temperature and stage.
- If the customer is a `hot` lead or in `PURCHASE_INTENT` / `QUOTE_SENT`, EDITH returns `status="REFUSED"` to protect the commercial pipeline unless explicitly forced by a human operator.

### 2.6 Sandbox Phone Interceptor (`is_sandbox_test_phone`)
- Both `BridgeWhatsAppProvider` and `MetaCloudWhatsAppProvider` enforce `is_sandbox_test_phone()` at the transport boundary, ensuring test numbers (`+919876543210`, `+919999988888`, `channel="simulation"`) can never leak messages onto the real WhatsApp network.

### 2.7 Multi-Tenant Organization Isolation
- Every database model inherits `OrgScopedMixin` with mandatory `org_id` indexing.
- Every API endpoint and background job enforces organization scoping to prevent cross-tenant data leakage.

---

<div align="center">
  <sub><b>WhatsApp AI Agent by NS</b> — Engineered by <b>Naboraj Sarkar (NS)</b></sub>
</div>
