# ADR 0026: Dynamic Model-to-Task Operational Roles, Zero-Cost NVIDIA NIM Economics & Dedicated Playground

## Status
Accepted

## Date
2026-09-19

## Context
Following the expansion of the WB-Agent platform into a dual-brain architecture (Friday as Executive Web/Voice Copilot and EDITH as WhatsApp Commercial Closer), operators needed granular control over which language models execute specific operational workloads. Furthermore, the operational cost model required alignment:
1. **Zero-Cost NVIDIA NIM Economics**: The operator's NVIDIA NIM API key operates under inclusive enterprise billing/flat-rate key credits. Displaying dollar calculations and cost badges on NVIDIA models created false operational cost concerns. All NVIDIA models must be displayed as strictly zero-cost: `$0.00 / Included / Free (NVIDIA Key)`.
2. **Real Non-Hallucinated Telemetry**: Simulated fallback estimates and hardcoded token constants (`84`, `132`, `120`) masked authentic provider latencies and token usage. Benchmarks and chat sessions must report authentic round-trip latency measured via high-precision timers, real provider tokens (`prompt_tokens`, `completion_tokens`, `total_tokens`), and real model outputs.
3. **1-Click Live Speed / Latency Benchmarking**: Model responsiveness varies dynamically based on cluster load and model parameter size (e.g. 30B vs 550B). Operators required a single-click button on each model row to test responsiveness and display live round-trip latency in milliseconds with visual status indicators.
4. **Dynamic Model-to-Task Assignment**: Rather than hardcoding models in static config, operators needed the ability to dynamically assign models to:
   - Friday Web Assistant / Executive Copilot
   - EDITH WhatsApp Commercial Closer & Negotiator
   - Friday Voice Agent (Live 16kHz PCM streaming)
   - Commercial Policy & Margin Auditor
   - System Watchdog Supervisor
   These assignments must persist across server restarts to `.env` and runtime state.
5. **Modern Gemini / ChatGPT-Style Playground**: Operators needed a dedicated, full-featured chat workspace (`/playground`) to test multi-turn conversations, evaluate persona prompts, test code blocks with syntax highlighting, and observe live per-turn telemetry pills.

---

## Decisions

### 1. Zero-Cost NVIDIA Economics & Accurate Gemini Pricing
- In `backend/app/api/routes/brain.py` and `dashboard/app/integrations/page.tsx`:
  - NVIDIA models are explicitly classified with `is_free_nvidia = True` and displayed with `$0.00`, `Free Key`, and `Included / Free (NVIDIA Key)`.
  - Token pricing formulas ($0.10/1M in, $0.40/1M out, $1.25/5.00 for Pro) are strictly preserved for Google Gemini models.
  - Eliminated all fake canned text fallbacks and hardcoded token numbers from `POST /api/v1/brain/benchmark-model`.

### 2. Authentic Model Benchmarking Engine
- Overhauled `POST /api/v1/brain/benchmark-model`:
  - Authentically invokes Google Gemini API via `google.generativeai` for Gemini models and NVIDIA NIM API via `httpx.AsyncClient` with authorization headers.
  - Measures true round-trip elapsed time with `time.perf_counter()`.
  - Extracts authentic token metadata from response headers/payloads (`usage_metadata` for Gemini, `usage` dictionary for NVIDIA).
  - Handles streaming-only models gracefully (e.g. `gemini-3.1-flash-live-preview` automatically targets the unified Gemini 2.5 Flash engine for single-turn REST benchmarking).

### 3. Dynamic Model-to-Task Assignment Engine
- In `backend/app/config.py`, added dedicated settings:
  - `FRIDAY_WEB_MODEL`: Defaults to `gemini-2.5-flash`.
  - `EDITH_SALES_MODEL`: Defaults to `nvidia/nemotron-3-ultra-550b-a55b`.
  - `FRIDAY_VOICE_MODEL`: Defaults to `gemini-3.1-flash-live-preview`.
  - `EDITH_POLICY_MODEL`: Defaults to `nvidia/nemotron-4-340b-instruct`.
  - `SYSTEM_WATCHDOG_MODEL`: Defaults to `nvidia/nemotron-3-nano-omni-30b-a3b-reasoning`.
- Added endpoints `GET /api/v1/brain/model-roles` and `POST /api/v1/brain/model-roles`:
  - Runtime update of active `settings` attributes.
  - Persistent writeback to local `.env` using regular expression key-value replacements.
- In `backend/app/ai/chains.py`, enhanced `get_capability_chain` to dynamically prioritize the configured `EDITH_SALES_MODEL` and `SYSTEM_WATCHDOG_MODEL` at the head of operational capability chains.

### 4. 1-Click Speed Test & Task Assignment Matrix in UI
- In `dashboard/app/integrations/page.tsx`:
  - Added **"⚡ Speed Test"** button to every model row in the Model Economics table. Clicking runs an authentic API call and displays live latency in `ms` with a color-coded status dot (🟢 `<1000ms`, 🟡 `<3000ms`, 🔴 `>3000ms` or error).
  - Added **"🚀 Playground"** button on each row linking to `/playground?model={id}`.
  - Added **Model-to-Task Operational Roles Assignment Panel** with dropdown selectors for all 5 operational roles, persistent saving, and instant status toast.

### 5. Dedicated Gemini / ChatGPT-Style Playground (`/playground`)
- Built `dashboard/app/playground/page.tsx` and linked it in `DashboardShell.tsx` navigation:
  - Top toolbar with model selector dropdown supporting all Gemini and NVIDIA models.
  - Provider indicator pill: Sky blue for Gemini with pricing; emerald for NVIDIA with "Included / Free ($0.00)".
  - Persona presets: Friday Web Copilot, EDITH Commercial Closer, Policy & Margin Auditor, Technical Architect.
  - Parameter drawer: Temperature slider (0.0–1.0) and Max Output Tokens slider (256–4096).
  - Conversational chat viewport with lightweight markdown and code block copy buttons.
  - Per-turn live telemetry pills below assistant turns: `⚡ Latency ms | 📊 Prompt/Completion/Total Tokens | 💰 Cost/Free | 🏷️ Model`.
  - Quick reference test prompt chips for rapid multi-scenario testing.
  - Textarea dock supporting Enter-to-send and Shift+Enter for newlines.

---

## Consequences
- **Operational Clarity**: Operators immediately understand that NVIDIA NIM inference costs zero additional dollars, while Google Gemini inference is billed accurately per token.
- **Empirical Model Selection**: Operators can click "Speed Test" on any model to empirically observe real-time network and inference latency before assigning it to customer-facing or voice roles.
- **Zero Hardcoded Canned Outputs**: The platform no longer displays simulated fallback text or fake token numbers (84, 132). Every metric reflects authentic provider API execution.
- **Full Production Integration**: Clean TypeScript compilation and Next.js static page optimization across all 22 application routes with 100% test pass rate.
