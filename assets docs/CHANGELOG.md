# Changelog: WhatsApp AI Agent by NS (WB-Agent Platform)

All notable changes to the **WhatsApp AI Agent by NS (EDITH + FRIDAY)** platform are documented in this file in accordance with [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.4.0] - 2026-09-29

### Added
- **AI Business Auto-Fill Architect & Multi-Industry Customization (`/settings` & Setup Modal)**:
  - `POST /api/v1/settings/ai-autofill-business`: Natural-language business generator that takes a plain-English description of any business, synthesizes all 16 business identity, persona, pricing guardrail, and policy fields via `AIRouter` (with deterministic industry fallback), saves as a reusable preset, and seeds 4 tailored products into the SQLite catalog.
  - **6 Built-in Industry Presets + Custom Preset Creator**: Instant 1-click workspace switching across *E-Commerce & D2C Retail*, *B2B Wholesale & Manufacturing*, *SaaS, Cloud & Tech Agency*, *Healthcare, Diagnostics & Clinics*, *Real Estate & Property Advisory*, and *Tea Estates & Agro Commodities* (`POST /api/v1/settings/industry-preset`), plus custom preset creation (`POST /api/v1/settings/custom-preset`).
  - **Quick-Add Product SKU & Business Rule**: 1-click endpoint (`POST /api/v1/settings/quick-add-info`) and UI bar for adding catalog items or business rules on the fly.
- **Dual WhatsApp Gateway Controls (Official Meta Cloud API vs. Unofficial Baileys Bridge)**:
  - Live UI & API switching (`whatsapp_connection_mode: "unofficial" | "official"`) between the self-hosted Baileys WebSocket bridge (`:3001` with QR scan, 8-digit pairing code `/api/v1/settings/whatsapp-pair`, embedded QR proxy `/api/v1/whatsapp/qr-embed`, and 1-click session reset `/api/v1/settings/whatsapp-reset`) and Official Meta WhatsApp Cloud API (`Graph v20.0` with `Phone Number ID`, `WABA ID`, `Access Token`, and `Verify Token`).
  - Canonical multi-device `@lid` JID to E.164 phone resolution and automatic duplicate thread consolidation (`whatsapp-bridge/index.js`, `backend/app/utils/phone.py`).
  - Removed all hardcoded personal phone numbers across `.env.example`, backend routes, WhatsApp bridge, and frontend components.
- **Simplified vs. Advanced Workspace Modes & First-Run Verification Modal**:
  - Top-bar **`✨ Simplified` | `🛠️ Advanced`** mode toggle (`DashboardShell.tsx`) and persistent `.workspace_config.json` storage (`GET / POST /api/v1/settings/workspace-config`).
  - **13 Granular Feature Toggles** to enable or hide individual platform modules in real time.
  - **5-Point End-to-End Health Verification (`POST /api/v1/settings/verify-end-to-end`)**: Verifies FastAPI/SQLite Catalog, Friday Gemini Live, EDITH NVIDIA NIM, WhatsApp Gateway, and Owner Escalation Channel with optional live WhatsApp test ping.
- **Friday Live Voice Agency, Universal Scrolling & Multi-Task Workflows**:
  - Universal viewport scrolling (`scroll_page` across `window`, `main`, and section selectors), sequential multi-step workflow execution (`execute_multi_step_workflow`), full website walkthrough (`explain_full_website`), and live talk duration timer (`MM:SS`).
- **Dual-Brain Synaptic Console (`/brain`), 15-Model AI Playground (`/playground`) & Rust 3D Meshes**:
  - Interactive `/brain` console with live synaptic handshake verification, 6-dimension capability radar chart, token economics, and AI codebase self-inspection endpoints (`/api/v1/brain/code/read`, `search`, `tree`, `diagnose`).
  - Multi-Model AI Playground (`/playground`) & 5-Role Dynamic Model Router (`/api/v1/brain/model-roles`) supporting 18 Google Gemini & NVIDIA NIM models.
  - Zero-dependency Rust procedural 3D mesh generator (`rust-models/`) compiling `friday_orb.obj` and `edith_core.obj` for Three.js WebGL rendering.
- **Multi-Level Documentation Suite (`README.md` & `assets docs/`)**:
  - Progressive-disclosure root `README.md` (ELI15 Beginner Intro → 2-Minute Startup → No-Code Business Setup → Visual Tour → Senior Architect Reference).
  - Dedicated role-based guides: `assets docs/guides/beginner-quick-start.md`, `assets docs/guides/business-owner-guide.md`, and `assets docs/guides/senior-developer-architecture.md`.
  - Complete API Reference overhaul documenting all **137 backend endpoints** across 27 routers (`assets docs/api-reference.md`).

---

## [0.2.0] - 2026-09-18

### Added
- **Database & Storage**:
  - SQLite schema upgrade automation in `backend/scripts/upgrade_sqlite_schema.py` for `order_items`, `pricing_rules`, and `products`.
  - Lock-free online backup utility `scripts/backup_db.py` using SQLite C-level Online Backup API with retention pruning.
  - Database vacuum and optimization CLI `scripts/optimize_db.py` and API endpoint `POST /api/v1/system/vacuum`.
  - Database integrity verification utility `scripts/verify_db_integrity.py`.
- **System Diagnostics & Observability**:
  - `GET /api/v1/system/info` exposing OS platform, runtime uptime, active AI models, and channel configuration.
  - `GET /api/v1/system/database-stats` returning table counts and SQLite file size metrics.
  - Live `SystemHealthBadge` component on the Next.js Mission Control dashboard header.
  - End-to-end smoke test suite `scripts/smoke_test.py`.
- **Security & Channel Protection**:
  - Cryptographic HMAC-SHA256 signature verification `verify_meta_signature` for Meta WhatsApp Cloud API webhooks.
  - In-memory sliding window rate limiter `SlidingWindowRateLimiter` with anti-flood controls and configurable settings (`RATE_LIMIT_WINDOW_SECONDS`, `RATE_LIMIT_MAX_REQUESTS`).
  - WhatsApp Cloud API message template structure validator `validate_whatsapp_template`.
  - Starlette/FastAPI middleware appending `X-Response-Time-Ms`, `X-Request-ID`, and HTTP Strict Transport Security (`HSTS`) headers.
- **Sales Intelligence & Invoicing**:
  - Deterministic customer sentiment and commercial urgency scorer `analyze_sentiment` with automatic human escalation triggers.
  - Statutory GST breakdown calculation (`calculate_gst_breakdown`) handling Intrastate (CGST+SGST) and Interstate (IGST) taxation rules.
  - Cross-platform invoice filename sanitizer `sanitize_invoice_filename` with path traversal guards.
  - Quote-to-order atomic conversion endpoint `POST /api/v1/quotes/{quote_id}/convert`.
  - Streaming CSV lead export endpoint `GET /api/v1/leads/export/csv`.
  - Watchdog continuous audit for customer sentiment risk and commercial distress.
- **Frontend Components**:
  - `SystemHealthBadge.tsx`: live pinging diagnostics badge.
  - `CopyToClipboard.tsx`: one-click copy with tooltip and checkmark feedback.
  - `EmptyState.tsx`: reusable table empty-state placeholder.
  - `ExportCsvButton.tsx`: streaming CSV table downloader.
  - `CurrencySelector.tsx`: multi-currency selector component with localStorage persistence.
- **Internationalization & Multi-Currency**:
  - Currency conversion engine (`convert_currency`) and international notation formatter (`format_international_currency`) supporting INR, USD, EUR, GBP, AED, SGD.
  - `GET /api/v1/pricing/currencies` endpoint returning live exchange rates relative to INR.
  - Timezone-aware greetings generator (`get_time_of_day_greeting`, `generate_personalized_salutation`) for global commercial outreach.
  - Sample domestic and international lead generator script (`scripts/generate_sample_leads.py`).
- **Documentation & Architecture**:
  - `ADR 0017` through `ADR 0026` in `assets docs/decisions/`.
  - Production Deployment Runbook (`assets docs/runbooks/production-deployment.md`).
  - Incident Response Runbook (`assets docs/runbooks/incident-response.md`).
  - WhatsApp Bridge Connectivity Guide (`assets docs/guides/whatsapp-bridge-guide.md`).
  - Developer Onboarding & Environment Guide (`assets docs/guides/developer-onboarding.md`).

---

## [0.1.0] - 2026-09-02
- Initial release of WhatsApp AI Agent by NS (WB-Agent Autonomous AI Sales Platform).
- Dual-Brain Architecture (EDITH Front-Brain Sales Orchestrator & Friday Back-Brain Operations Executive).
- 16-Stage Conversational Sales State Machine.
- Deterministic B2B pricing engine with volume discount tiers.
- ReportLab vector pro-forma invoice generator.
