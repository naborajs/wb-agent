# KNOWN_ISSUES.md: Empirical Bug, Debt & Architectural Risk Register

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY DATABASE | VERIFIED BY TEST  
> **Date of Audit**: 2026-09-21  
> **Repository**: `d:/Projects/Python/wb-agent`

---

## 1. Executive Summary

This register details confirmed operational bugs, data consistency discrepancies, test failures, race conditions, and technical debt items identified through actual code analysis, database queries, and test suite execution.

Every issue is assigned a priority rating:
- **P0 (Critical)**: Threatens core system integrity, data consistency, or multi-tenant isolation.
- **P1 (High)**: Major functional failure or broken UI/API feature.
- **P2 (Medium)**: Architectural debt, domain coupling, or missing abstraction.
- **P3 (Low)**: Minor cosmetic discrepancy, deprecation warning, or redundant stub.

---

## 2. Issues Register

### ISSUE-01 [P0 - CRITICAL]: Organization ID Split Brain (`org_default` vs `org_default_tea`)
- **Classification**: `VERIFIED BY DATABASE & CODE`
- **Location**:
  - `backend/app/config.py`: `DEFAULT_ORG_ID: str = "org_default"`
  - `backend/app/database/base.py` (L76): `default="org_default_tea"`
  - `backend/app/api/routes/knowledge.py` (L208, L236, L319, L400): hardcoded `KnowledgeItem.org_id == "org_default_tea"`
  - `backend/app/brain/inter_brain_bus.py` (L2430, L2609, L2851): hardcoded `KnowledgeItem.org_id == "org_default_tea"`
- **Empirical Evidence**:
  - Direct SQL query on `wb_agent.db`:
    - `customers`: `['org_default', 'org_default_tea']`
    - `conversations`: `['org_default', 'org_default_tea']`
    - `leads`: `['org_default_tea']` (0 leads under `org_default`)
    - `handoffs`: `['org_default']`
    - `products`: `['org_default_tea']`
    - `prompt_sections`: `['org_default_tea']`
- **Impact**: When the dashboard calls `GET /api/v1/analytics/overview` or `GET /api/v1/leads`, it queries with `settings.DEFAULT_ORG_ID` (`org_default`), returning **0 leads, 0 products, and empty metrics**, because the data was seeded under `org_default_tea`!
- **Resolution**: Consolidate database records to a single organization ID or dynamically resolve tenant via JWT `get_current_org_id`.

---

### ISSUE-02 [P1 - HIGH]: 4 Broken Unit Test Assertions
- **Classification**: `VERIFIED BY TEST`
- **Command Output**: `pytest backend/tests/unit -v` exited with code 1 (177 passed, 4 failed).
- **Failed Tests**:
  1. `backend/tests/unit/test_ai_router.py::test_capability_chains_structure`:
     - *Assertion*: `assert 'meta/llama-3.3-70b-instruct' == 'nvidia/nemotron-3-super-120b-a12b'`.
     - *Cause*: `config.py` was recently updated to use `meta/llama-3.3-70b-instruct` as `EDITH_SALES_MODEL`, but the test asserts the legacy default model.
  2. `backend/tests/unit/test_prompt_architect.py::test_ai_optimize_endpoint_and_version_persistence`:
     - *Error*: `KeyError: 'rating_score'`.
     - *Cause*: Optimization response schema was updated during the modular prompt upgrade.
  3. `backend/tests/unit/test_prompts_and_versioning.py::test_prompt_assembly_and_service`:
     - *Assertion*: Section content string mismatch after dynamic sections migration.
  4. `backend/tests/unit/test_prompts_and_versioning.py::test_prompt_api_endpoints`:
     - *Assertion*: `assert 'core_safety' in {}`.
     - *Cause*: Direct consequence of ISSUE-01: the test queries `/api/v1/prompts` using `settings.DEFAULT_ORG_ID` (`org_default`), but the dynamic sections are keyed under `org_default_tea`!

---

### ISSUE-03 [P1 - HIGH]: Dashboard `/followups` Page is 100% Mocked
- **Classification**: `VERIFIED BY CODE`
- **Location**: `dashboard/app/followups/page.tsx` (104 lines).
- **Finding**:
  - The page executes **0 fetch requests**.
  - It renders a hardcoded client-side array of 3 fictitious follow-ups (`Rahul Sharma`, `Amit Roy`, `Metro Food Services`).
  - Meanwhile, the backend has a complete, working `followup_jobs` table and `FollowupScheduler` engine. The frontend page is entirely disconnected.

---

### ISSUE-04 [P1 - HIGH]: Hardcoded Port `:8000` in WebSocket Client (Breaks Vercel)
- **Classification**: `VERIFIED BY CODE`
- **Location**: `dashboard/app/conversations/page.tsx` (Line 236).
  ```typescript
  const wsUrl = `${protocol}//${host}:8000/api/v1/ws/conversations`;
  ```
- **Finding**:
  - When deployed on Vercel (`host = "my-app.vercel.app"`), this attempts to connect to `wss://my-app.vercel.app:8000/...`.
  - Vercel does not host port 8000, causing immediate WebSocket connection failure and breaking live sync.
- **Resolution**: Resolve WebSocket URL dynamically from `process.env.NEXT_PUBLIC_WS_URL` or derive from `NEXT_PUBLIC_API_URL`.

---

### ISSUE-05 [P2 - MEDIUM]: Single-Session WhatsApp Baileys Gateway
- **Classification**: `VERIFIED BY CODE`
- **Location**: `whatsapp-bridge/index.js`.
- **Finding**:
  - Global variable `let sock = null` and hardcoded `const AUTH_DIR = "./auth_info_baileys"`.
  - Hardcoded `const BOT_PHONE = "918918753100"`.
  - Currently can only host one WhatsApp phone connection simultaneously. Multi-tenant SaaS requires a multi-session manager (`/sessions/:orgId/...`).

---

### ISSUE-06 [P2 - MEDIUM]: Tea-Specific Commercial Couplings
- **Classification**: `VERIFIED BY CODE & DATABASE`
- **Locations**:
  - `backend/app/services/invoice_generator.py`: Hardcoded seller address, GSTIN, FSSAI, and bank details for North Bengal Tea Co.
  - `backend/app/agent/extractor.py`: Hardcodes tea use cases (`milk_tea`, `green_tea`), packaging (`chest`), and business types (`tapri`).
  - `backend/app/database/models/order.py`: Table `order_items` contains explicit `tea_grade` column.
  - `dashboard/components/VoiceAgent.tsx`: Site map system prompt references tea wholesale operations.

---

### ISSUE-07 [P2 - MEDIUM]: Deprecated `utcnow()` Warnings
- **Classification**: `VERIFIED BY RUNTIME`
- **Location**: `backend/app/api/routes/orders.py` (L167), `app/database/base.py`.
- **Finding**: Uses `datetime.datetime.utcnow()` which is deprecated in Python 3.12+ and scheduled for removal in Python 3.17. Emits `DeprecationWarning`.
- **Resolution**: Migrate to `datetime.datetime.now(datetime.timezone.utc)`.

---

### ISSUE-08 [P3 - LOW]: Redundant Redirect Stubs in Dashboard
- **Classification**: `VERIFIED BY CODE`
- **Locations**: `dashboard/app/pricing/page.tsx` and `dashboard/app/products/page.tsx`.
- **Finding**: These routes are 40-line redirect components forwarding users to `/knowledge?tab=pricing_rule` and `/knowledge?tab=catalog_product`. They can be eliminated with clean Next.js `redirects()` in `next.config.js`.
