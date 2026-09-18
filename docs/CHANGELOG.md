# Changelog: WB-Agent Platform

All notable changes to the WB-Agent platform are documented in this file in accordance with [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) and [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
  - `ADR 0017`: Resilient SQLite Connection Management, Vacuuming and Schema Migrations.
  - `ADR 0018`: WhatsApp Outbound Rate Limiting, Dead Letter Queues and Ban Prevention.
  - `ADR 0019`: Automated Invoicing, GST Compliance, and Quote Lifecycle State Machine.
  - `ADR 0020`: Frontend Architecture, Real-Time Polling and Dashboard Observability.
  - `ADR 0021`: Multi-Currency Pricing Architecture and Internationalization Strategy.
  - Production Deployment Runbook (`docs/runbooks/production-deployment.md`).
  - Incident Response Runbook (`docs/runbooks/incident-response.md`).
  - WhatsApp Bridge Connectivity Guide (`docs/guides/whatsapp-bridge-guide.md`).
  - Developer Onboarding & Environment Guide (`docs/guides/developer-onboarding.md`).

---

## [0.1.0] - 2026-09-02
- Initial release of WB-Agent Autonomous AI Sales Agent Platform.
- Dual-Brain Architecture (EDITH Front-Brain Sales Orchestrator & Friday Back-Brain Operations Executive).
- 16-Stage Conversational Sales State Machine.
- Deterministic B2B pricing engine with volume discount tiers.
- ReportLab vector pro-forma invoice generator.
