# BUSINESS_AGNOSTIC_AUDIT.md: Evaluation of Industry Agnosticism & Domain Coupling

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY DATABASE | VERIFIED BY RUNTIME  
> **Date of Audit**: 2026-09-21  
> **Repository**: `d:/Projects/Python/wb-agent`

---

## 1. Executive Summary

The WB-Agent (EDITH) platform is designed as an **industry-agnostic B2B conversational AI sales operating system**. However, because it was developed and tested against a concrete flagship deployment (**North Bengal Tea Co.** in Siliguri, West Bengal), the codebase contains a mix of purely generic abstractions, demo seed data, hardcoded business logic, and accidental domain couplings.

This document classifies every domain layer into:
1. **CORE PRODUCT** (Fully business-agnostic, reusable across any commercial enterprise)
2. **DEMO DATA** (Sample dataset that can be replaced or cleared)
3. **HARDCODED BUSINESS LOGIC** (Code paths that directly encode tea/horticulture rules)
4. **ACCIDENTAL BUSINESS COUPLING** (Schema columns, fallback messages, or default IDs that assume tea)
5. **UNKNOWN / REQUIRES DECISION** (Areas requiring architectural alignment)

---

## 2. Classification Matrix

### Category A: CORE PRODUCT (Industry-Agnostic)

| Subsystem | File Location | Architectural Agnosticism | Verification |
| :--- | :--- | :--- | :--- |
| **Turn Mutex & Locking** | `backend/app/conversations/locking.py` | 100% agnostic. Distributed per-conversation atomic turn lock. | `VERIFIED BY CODE` |
| **Durable Job Queue & Worker** | `backend/app/jobs/queue.py`, `worker.py` | 100% agnostic. PostgreSQL/SQLite `SKIP LOCKED` worker daemon. | `VERIFIED BY CODE` |
| **Atomic Pre-Send Check** | `backend/app/agent/orchestrator.py` (L661) | 100% agnostic. ADR-0008 pre-send check to abort AI send if human operator took over. | `VERIFIED BY CODE` |
| **Dynamic Prompt System** | `backend/app/agent/prompts.py`, `PromptSection` | 100% agnostic. Modular prompt sections with git diffs, pinning, and BPE token counts. | `VERIFIED BY CODE` |
| **Deterministic Pricing Math** | `backend/app/pricing/calculator.py` | 100% agnostic. Computes volume tiers, customer segment rules, and formulas. | `VERIFIED BY CODE` |
| **Campaign Drip & Anti-Ban Jitter**| `backend/app/services/campaign_engine.py` | 100% agnostic. Randomized 25–45s jitter scheduling with auto-cancel on reply. | `VERIFIED BY CODE` |
| **Objection Pareto Analytics** | `backend/app/api/routes/analytics.py` | 100% agnostic. Generic Pareto 80/20 distribution calculation across objection categories. | `VERIFIED BY CODE` |
| **Dual-Brain Synaptic Bus** | `backend/app/brain/inter_brain_bus.py` | 100% agnostic. InterBrainMessage protocol, refusal rights, and activity ticker. | `VERIFIED BY CODE` |
| **Voice Ephemeral Token Minting** | `backend/app/api/routes/voice.py` | 100% agnostic. Server-minted Gemini Live tokens with pre-locked action constraints. | `VERIFIED BY CODE` |

---

## 2. Classification Matrix (Continued)

### Category B: DEMO DATA (Easily Replaceable Seed Data)

| Asset | Location | Details | Verification |
| :--- | :--- | :--- | :--- |
| **Seeded Products** | `wb_agent.db` (`products` table) | 3 tea products: `Darjeeling Spring First Flush Special`, `Assam Kadak CTC Granules`, `Dooars Terai Hotel Master Blend`. | `VERIFIED BY DATABASE` |
| **Seeded Product Variants** | `wb_agent.db` (`product_variants` table)| 6 packaging variants (5kg foil, 20kg chest, 10kg poly sack, 30kg commercial master sack). | `VERIFIED BY DATABASE` |
| **Seeded Knowledge Chunks** | `wb_agent.db` (`knowledge_chunks` table)| 18 chunks detailing Darjeeling altitude, FSSAI certificates, transit times from Siliguri. | `VERIFIED BY DATABASE` |
| **Seeded Organization** | `wb_agent.db` (`organizations` table) | Single organization: `org_default_tea` ("North Bengal Tea Co.", slug `north-bengal-tea`). | `VERIFIED BY DATABASE` |
| **Seeded Admin User** | `wb_agent.db` (`users` table) | Single user: `rajiv@northbengaltea.com` ("Rajiv Sen", role `owner`). | `VERIFIED BY DATABASE` |
| **Demo Seeding Script** | `scripts/seed_demo.py` | Supports `--demo tea` flag or default generic mode, but currently seeds tea by default. | `VERIFIED BY CODE` |

---

### Category C: HARDCODED BUSINESS LOGIC (Must Be Generalized for Multi-Tenant SaaS)

These code paths contain hardcoded checks, regexes, or decisions assuming a tea/beverage business:

#### 1. Passive Information Extractor (`backend/app/agent/extractor.py`)
- **Use Case Extraction** (Lines 88–95):
  ```python
  if any(w in lower for w in ["milk tea", "kadak chai", "milk", "doodh", "dudh chai"]):
      facts.use_case = "milk_tea"
  elif any(w in lower for w in ["black tea", "orthodox", "first flush", "second flush"]):
      facts.use_case = "orthodox_black_tea"
  elif any(w in lower for w in ["green tea", "health", "detox"]):
      facts.use_case = "green_tea"
  ```
- **Packaging Extraction** (Line 108):
  ```python
  elif any(w in lower for w in ["chest", "wooden chest", "tea chest"]):
      facts.packaging = "chest"
  ```
- **Business Type Extraction** (Line 82):
  ```python
  elif any(w in lower for w in ["tea shop", "chai shop", "chai stall", "tapri", "tea point"]):
      facts.business_type = "tea_shop"
  ```
- *Impact on SaaS*: If a customer sells industrial hardware, clothing, or SaaS software, `extractor.py` will fail to extract meaningful use cases or packaging formats.

#### 2. Commercial Scope & Seed Refusal (`backend/app/agent/sales_engine.py`)
- **Horticulture Refusal** (Lines 117–120):
  ```python
  unsupported_horticulture = [
      "tea seeds", "gardening seeds", "plant seeds", "seeds", "seed", "beej", "bij",
      "saplings", "nursery plants", "soil", "fertilizer", "khad"
  ]
  ```
- *Impact on SaaS*: Built to prevent EDITH from hallucinating tea farming seeds; irrelevant or conflicting for an agricultural or seed supplier client.

#### 3. Self-Reflective Critic (`backend/app/agent/critic.py`)
- **Anti-Seed Regex Rule** (Line 20):
  ```python
  ("no_fake_horticulture", r"\b(?:we\s*grow\s*tea\s*seeds|tea\s*seeds\s*for\s*sale|nursery\s*saplings)\b")
  ```

#### 4. Fallback Simulator (`backend/app/ai/router.py` & `backend/app/ai/client.py`)
- Lines 731–786: Hardcoded mock product catalogs in the offline simulator:
  `"Sub-Himalayan Green Tea Whole Leaf"`, `"Assam Kadak CTC"`, `"Dooars Hotel Special Blend"`.

#### 5. Pro-Forma Invoice Header (`backend/app/services/invoice_generator.py`)
- Hardcoded North Bengal Tea Co. commercial identity:
  - Seller: *"North Bengal Tea Co. (Est. 1984)"*
  - Address: *"14 Sevoke Road, Siliguri Commercial Hub, West Bengal - 734001"*
  - Tax / Regulatory: GSTIN `19AABCN1234F1Z5`, FSSAI Lic `12821019000123`
  - Bank Details: State Bank of India, Siliguri Commercial Branch, IFSC `SBIN0000184`.
- *Impact on SaaS*: Every generated pro-forma invoice will show North Bengal Tea Co. unless dynamic organization invoice settings are rendered.

#### 6. Default Follow-up Templates (`backend/app/followups/scheduler.py`)
- Lines 32–40: Hardcoded copy referencing *"our estate teas or pricing"* and *"considering estate teas for your business"*.

---

### Category D: ACCIDENTAL BUSINESS COUPLING (Schema & Defaults)

1. **Database Base Column Default (`backend/app/database/base.py`)**:
   - Line 76: `default="org_default_tea"` hardcoded as default for model `org_id` fields!
   - In contrast, `.env` config specifies `DEFAULT_ORG_ID=org_default`.
2. **Database Models Schema Specificity**:
   - `backend/app/database/models/order.py`: Table `order_items` has an explicit `tea_grade` column (`VARCHAR(64)`).
   - `backend/app/database/models/product_pricing.py`: Table `products` has an explicit `harvest_season` column (`VARCHAR(64)`).
3. **Hardcoded Query Filters**:
   - `backend/app/api/routes/knowledge.py`: Lines 208, 236, 319, 400 filter by `KnowledgeItem.org_id == "org_default_tea"`.
   - `backend/app/brain/inter_brain_bus.py`: Lines 2430, 2609, 2851 filter by `KnowledgeItem.org_id == "org_default_tea"`.
4. **Dashboard Voice Agent System Instructions (`dashboard/components/VoiceAgent.tsx`)**:
   - System prompt instructions injected into Gemini Multimodal Live API explicitly describe North Bengal Tea Co.'s catalog, Siliguri distribution, and tea categories.

---

## 3. Hypothetical Industry Readiness Test

To test whether the current system can handle a non-tea enterprise without code changes:

| Industry Test Case | Can It Configure Catalog? | Can Pricing Calculate? | Inbound Extraction Result | Invoice Output Result | Verdict |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Specialty Coffee Roaster** | ✅ Yes (Products/variants supported) | ✅ Yes (Volume tiers calculate) | ⚠️ Partial (Extracts cafe/restaurant, misses bean use cases) | ❌ Shows North Bengal Tea Co. branding | **Partial** |
| **2. B2B Industrial Safety Equipment** | ✅ Yes (SKUs, MOQs supported) | ✅ Yes (Volume tiers calculate) | ❌ Poor (Tries to extract milk/tea use cases) | ❌ Shows FSSAI tea license & Siliguri address | **Blocked on Invoice & Extraction** |
| **3. Commercial Cleaning Chemicals** | ✅ Yes (Variants, packs supported) | ✅ Yes (Deterministic MOQs) | ❌ Poor (Extracts quantity, misses dilution/commercial use cases) | ❌ Shows tea branding & estate terms | **Blocked on Branding** |
| **4. SaaS Software Licenses** | ⚠️ Partial (Per-seat pricing requires unit='seat') | ✅ Yes (Tier discounts work) | ❌ Poor (Extracts business type, misses seats/cloud use cases) | ❌ Generates physical delivery terms & FSSAI | **Blocked on Physical Terms** |

---

## 4. Remediation Plan for Full Multi-Tenant SaaS

To achieve **100% Industry Agnosticism**:
1. **Dynamic Business Profile in Organizations**:
   - Move Company Name, Address, GSTIN/Tax ID, License Numbers, Bank Details, and Logo URL into `Organization.settings["invoice_branding"]`.
   - Update `InvoiceGenerator` to pull seller details directly from the active `Organization` record instead of constants.
2. **Dynamic / Configurable Entity Extraction**:
   - Allow organizations to define custom requirement fields (e.g. `Industry`, `Units`, `Packaging`, `Custom Attributes`) or use LLM-based structured JSON extraction guided by the tenant's `business_profile` prompt section.
3. **Unify `org_id` Fallback**:
   - Remove hardcoded `"org_default_tea"` from `base.py`, `knowledge.py`, and `inter_brain_bus.py`, replacing with `org_id: str = Depends(get_current_org_id)`.
4. **Agnostic Database Fields**:
   - Treat `tea_grade` in `order_items` as `grade_or_spec` (or utilize existing `ProductCustomField` / attributes JSON).
   - Treat `harvest_season` in `products` as optional custom attribute.
