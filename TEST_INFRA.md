# TEST_INFRA.md: E2E Test Suite Infrastructure & Architecture

## Overview
This document defines the End-to-End (E2E) Test Suite infrastructure for the **EDITH Autonomous Sales Platform Enterprise Upgrades**. The test suite verifies the 5 enterprise features (R1–R5) across a 4-tier systematic approach based purely on requirements and interface contracts:
- **R1**: Automated PDF Pro-Forma Invoice & Commercial Quote Generator
- **R2**: WhatsApp Voice Note Transcription & Hinglish Audio Understanding
- **R3**: Real-Time WebSocket Live Sync & Dashboard Audio Alerts
- **R4**: Automated B2B Campaign Drip & Anti-Ban Rate-Limited Outreach
- **R5**: Sales Intelligence & Objection Analytics Dashboard

---

## 4-Tier Systematic Testing Methodology

```
┌─────────────────────────────────────────────────────────────┐
│  Tier 4: Real-World Workload Scenarios (>= 5 tests)         │
│  - Realistic tea wholesale orders, voice inquiries,         │
│    bargaining, hot lead escalation, multi-tenant sync       │
├─────────────────────────────────────────────────────────────┤
│  Tier 3: Cross-Feature Combinations (>= 5 tests)            │
│  - Pairwise interactions across R1-R5 (voice->invoice,      │
│    drip->alert, audio->objection->analytics)                │
├─────────────────────────────────────────────────────────────┤
│  Tier 2: Boundary & Corner Cases (>= 25 tests, >=5/feature) │
│  - MOQ limits, extreme volumes, zero tax, corrupt audio,    │
│    jitter variance, quota boundaries, empty states          │
├─────────────────────────────────────────────────────────────┤
│  Tier 1: Feature Coverage (>= 25 tests, >=5 per feature)    │
│  - Deterministic functional assertions for R1, R2, R3,      │
│    R4, and R5 interface contracts and business rules        │
└─────────────────────────────────────────────────────────────┘
```

### Tier 1: Feature Coverage (25 Tests)
- **R1 Invoicing** (5 tests): PDF generation structure, line items & calculations, automatic trigger on PURCHASE_INTENT, automatic trigger on RECOMMENDATION, WhatsApp document bridge dispatch.
- **R2 Audio Understanding** (5 tests): Inbound audio formats (.ogg, .opus, .mp3), Gemini multimodal transcription, transcription fallback, Hinglish colloquial requirement extraction, AgentOrchestrator consultative handoff.
- **R3 WebSocket & Real-Time** (5 tests): WebSocket connection & ping/pong, `new_message` broadcasting, `stage_changed` broadcasting, `hot_lead` alert with audio chime, `handoff_alert` broadcasting.
- **R4 Campaign Drip Engine** (5 tests): Campaign CRUD, randomized jitter delay range (25–45s), daily volume quota tracking, automatic inbound reply drip cancellation, campaign start/pause/resume lifecycle.
- **R5 Sales Intelligence & Analytics** (5 tests): `/analytics/intelligence` response schema, Objection Pareto distribution, geographic lead density heatmap, pipeline revenue forecasting, executive CSV activity export.

### Tier 2: Boundary & Corner Cases (25 Tests)
- **R1 Invoicing** (5 tests): Minimum MOQ boundary (10kg), massive bulk volume (10,000kg), unicode special characters in business names, zero-discount & exempt products, rate lock 7-day expiry calculation.
- **R2 Audio Understanding** (5 tests): Empty 0-byte audio file, corrupt audio bitstream, unsupported MIME type rejection, dense multi-language code-switching (Hindi/Bengali/English), maximum upload byte limit enforcement (10MB).
- **R3 WebSocket & Real-Time** (5 tests): Lead score 79 (no hot chime) vs 80 (hot chime), multi-tenant organization isolation, disconnected client cleanup, rapid concurrent subscriber dispatch, malformed payload resilience.
- **R4 Campaign Drip Engine** (5 tests): Empty lead list campaign, jitter statistical distribution over 100 samples, quota exhaustion queuing, duplicate phone number deduplication, opted-out lead exclusion.
- **R5 Sales Intelligence & Analytics** (5 tests): Zero-state metrics, single-objection 100% Pareto, unmapped geographic locations ("Other"), zero-value deals in forecast, CSV special character and delimiter escaping (RFC 4180).

### Tier 3: Cross-Feature Combinations (5 Tests)
1. `test_cross_audio_to_purchase_to_invoice`: Voice inquiry transcribed -> extracted into intent -> transitions to PURCHASE_INTENT -> compiles pro-forma invoice -> dispatches PDF via WhatsApp.
2. `test_cross_campaign_reply_to_websocket_alert`: Campaign drip message -> buyer replies -> cancels pending drip -> updates lead score -> broadcasts `hot_lead` chime over WebSocket.
3. `test_cross_voice_objection_to_analytics_pareto`: Voice note objection ("Mehenga hai") -> transcribed -> classified as price objection -> updates Pareto analytics curve.
4. `test_cross_invoice_generation_to_websocket_event`: Invoice compilation broadcasts real-time `stage_changed` / `invoice_created` notification to operators.
5. `test_cross_campaign_to_geographic_analytics`: Campaign dispatch to Siliguri & Darjeeling leads populates geographic pipeline analytics upon interaction.

### Tier 4: Real-World Workload Scenarios (5 Tests)
1. `test_scenario_siliguri_cafe_bulk_order_flow`: Complete journey of Siliguri cafe owner from voice query to 7-day rate lock pro-forma invoice.
2. `test_scenario_cold_outreach_to_hot_escalation`: Cold CSV lead outreach transitioning to urgent purchase intent and operator handoff.
3. `test_scenario_voice_bargaining_and_discount_negotiation`: Customer voice bargaining, volume tier discount application, and objection tracking.
4. `test_scenario_multi_tenant_isolation_and_live_sync`: Strict isolation of data, invoices, audio, and WebSocket events across multiple merchant organizations.
5. `test_scenario_full_end_to_end_sales_lifecycle`: Full sales cycle traversing all 5 enterprise features seamlessly.

---

## Test Architecture & Directory Layout

```
wb-agent/
├── TEST_INFRA.md                   # This specification document
├── TEST_READY.md                   # Final execution & verification report
├── run_e2e_tests.py                # Standalone test runner script
└── backend/
    └── tests/
        └── e2e/
            ├── __init__.py
            ├── conftest.py          # Shared fixtures, async db engine, mocks, contracts
            ├── test_e2e_invoicing.py   # R1 Feature + Boundary tests (10 tests)
            ├── test_e2e_audio.py       # R2 Feature + Boundary tests (10 tests)
            ├── test_e2e_realtime.py    # R3 Feature + Boundary tests (10 tests)
            ├── test_e2e_campaigns.py   # R4 Feature + Boundary tests (10 tests)
            ├── test_e2e_analytics.py   # R5 Feature + Boundary tests (10 tests)
            └── test_e2e_scenarios.py   # Tier 3 & Tier 4 Scenarios (10 tests)
```

---

## Interface Contracts Tested

### R1. Invoice Generator
- **Service**: `InvoiceGenerator.generate_proforma_pdf(order_data: Dict[str, Any]) -> str`
- **Branding**: North Bengal Tea Co.
- **Seller GSTIN**: `19AABCN1234F1Z5`
- **FSSAI**: `12821019000123`
- **Rate Lock**: "Valid for 7 days from issue date"
- **Dispatch**: `WhatsAppProvider.send_document(to_phone: str, file_path: str, caption: str, filename: str) -> Dict[str, Any]`

### R2. Audio Transcription
- **Service**: `AudioTranscriber.transcribe_audio(audio_bytes: bytes, mime_type: str) -> str`
- **Supported Formats**: `.ogg`, `.opus`, `.mp3`
- **Fallback**: Fallback to local/simulator transcription when `GEMINI_API_KEY` is offline.
- **Extraction**: Passes text to `PassiveInformationExtractor` and `AgentOrchestrator`.

### R3. WebSocket Real-Time Stream
- **Route**: `GET /api/v1/ws` or `/api/v1/ws/conversations?org_id=<org_id>`
- **Event Protocol**:
  ```json
  {
    "event": "new_message" | "stage_changed" | "hot_lead" | "handoff_alert",
    "data": { "conversation_id": "...", "payload": { ... } }
  }
  ```
- **Broadcasting**: `ws_manager.broadcast_to_org(org_id, event, data)`

### R4. Campaign Drip Engine
- **Routes**: `GET /api/v1/campaigns`, `POST /api/v1/campaigns`, `POST /api/v1/campaigns/{id}/start`, `POST /api/v1/campaigns/{id}/pause`
- **Jitter Window**: Uniform random delay strictly between `25.0` and `45.0` seconds.
- **Inbound Hook**: Customer reply triggers cancellation of pending follow-ups and transitions lead to active consultative AI dialogue.

### R5. Sales Intelligence & Analytics
- **Route**: `GET /api/v1/analytics/intelligence`
- **Response Structure**:
  - `pareto`: `[{"objection": str, "count": int, "cumulative_pct": float}]`
  - `geographic`: `[{"region": str, "state": str, "lead_count": int, "won_count": int, "revenue": float}]`
  - `forecast`: `{"projected_revenue": float, "weighted_pipeline": float, "by_stage": [...]}`
  - `export_url`: `/api/v1/analytics/export?format=csv`
- **Export Route**: `GET /api/v1/analytics/export?format=csv` returning RFC 4180 compliant CSV stream.

---

## Execution Command
```bash
python -m pytest backend/tests/e2e -v
```
or via the runner script:
```bash
python run_e2e_tests.py
```
