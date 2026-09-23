# REPOSITORY_INVENTORY.md: Complete Exhaustive Repository Inventory

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY DATABASE
> **Generated**: 2026-09-21 | **Repository**: `d:/Projects/Python/wb-agent`

This document provides a comprehensive, file-by-file inventory of the entire WB-Agent (EDITH) repository, categorizing active code, runtime services, schemas, tests, generated artifacts, and legacy/experimental components.

---

### Inventory Summary: **637 cataloged files** across 19 logical domains (**318,818 total lines of code & documentation**).

## 1. Repository Root Runtimes & Config (17 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`.env`](file:///d:/Projects/Python/wb-agent/.env) | 3,299 B | 93 | `ACTIVE / SUPPORT` | ============================================================================== |
| [`.env.example`](file:///d:/Projects/Python/wb-agent/.env.example) | 3,505 B | 107 | `ACTIVE / SUPPORT` | ============================================================================== |
| [`E2E-TEST-LOG.md`](file:///d:/Projects/Python/wb-agent/E2E-TEST-LOG.md) | 12,760 B | 58 | `TEST / QA` | Automated test suite or verification harness. |
| [`LICENSE`](file:///d:/Projects/Python/wb-agent/LICENSE) | 750 B | 18 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`ORIGINAL_REQUEST.md`](file:///d:/Projects/Python/wb-agent/ORIGINAL_REQUEST.md) | 4,699 B | 74 | `ACTIVE / SUPPORT` | Original User Request |
| [`README.md`](file:///d:/Projects/Python/wb-agent/README.md) | 24,043 B | 392 | `ACTIVE / SUPPORT` | 🚀 WhatsApp AI Agent by NS (EDITH AI Sales Operating System) |
| [`TEST_INFRA.md`](file:///d:/Projects/Python/wb-agent/TEST_INFRA.md) | 9,673 B | 138 | `TEST / QA` | Automated test suite or verification harness. |
| [`TEST_READY.md`](file:///d:/Projects/Python/wb-agent/TEST_READY.md) | 11,743 B | 133 | `TEST / QA` | Automated test suite or verification harness. |
| [`VOICE-AGENT.md`](file:///d:/Projects/Python/wb-agent/VOICE-AGENT.md) | 8,445 B | 117 | `ACTIVE / SUPPORT` | VOICE-AGENT.md: EDITH Voice-Driven Agentic Control Layer |
| [`capture_screenshots.ps1`](file:///d:/Projects/Python/wb-agent/capture_screenshots.ps1) | 2,456 B | 43 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`docker-compose.yml`](file:///d:/Projects/Python/wb-agent/docker-compose.yml) | 2,247 B | 88 | `ACTIVE / RUNTIME` | Core runtime orchestrator or platform configuration. |
| [`pytest.ini`](file:///d:/Projects/Python/wb-agent/pytest.ini) | 102 B | 6 | `TEST / QA` | Automated test suite or verification harness. |
| [`requirements.txt`](file:///d:/Projects/Python/wb-agent/requirements.txt) | 353 B | 21 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`run.py`](file:///d:/Projects/Python/wb-agent/run.py) | 29,746 B | 713 | `ACTIVE / RUNTIME` | !/usr/bin/env python3 |
| [`run_e2e_tests.py`](file:///d:/Projects/Python/wb-agent/run_e2e_tests.py) | 1,215 B | 49 | `TEST / QA` | Automated test suite or verification harness. |
| [`start.bat`](file:///d:/Projects/Python/wb-agent/start.bat) | 1,205 B | 35 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`wb_agent.db`](file:///d:/Projects/Python/wb-agent/wb_agent.db) | 2,027,520 B | 4,043 | `DATABASE` | SQLite runtime database file or backup snapshot. |

---

## 10. Dashboard: Routes & Pages (Next.js App Router) (21 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`dashboard/app/apple-icon.png`](file:///d:/Projects/Python/wb-agent/dashboard/app/apple-icon.png) | 54,076 B | 421 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/globals.css`](file:///d:/Projects/Python/wb-agent/dashboard/app/globals.css) | 12,457 B | 425 | `ACTIVE / FRONTEND` | ============================================================ |
| [`dashboard/app/icon.png`](file:///d:/Projects/Python/wb-agent/dashboard/app/icon.png) | 3,269 B | 39 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/layout.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/layout.tsx) | 1,450 B | 52 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/page.tsx) | 60,066 B | 1,262 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/analytics/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/analytics/page.tsx) | 22,070 B | 492 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/brain/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/brain/page.tsx) | 100,268 B | 2,070 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/campaigns/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/campaigns/page.tsx) | 52,910 B | 1,185 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/conversations/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/conversations/page.tsx) | 111,157 B | 2,266 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/followups/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/followups/page.tsx) | 4,085 B | 104 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/handoffs/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/handoffs/page.tsx) | 5,638 B | 130 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/integrations/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/integrations/page.tsx) | 64,796 B | 1,431 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/knowledge/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/knowledge/page.tsx) | 134,961 B | 2,691 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/leads/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/leads/page.tsx) | 11,388 B | 303 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/notifications/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/notifications/page.tsx) | 15,039 B | 372 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/orders/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/orders/page.tsx) | 29,499 B | 669 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/playground/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/playground/page.tsx) | 86,108 B | 1,909 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/pricing/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/pricing/page.tsx) | 1,617 B | 40 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/products/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/products/page.tsx) | 1,584 B | 40 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/prompts/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/prompts/page.tsx) | 62,823 B | 1,441 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |
| [`dashboard/app/settings/page.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/app/settings/page.tsx) | 32,528 B | 700 | `ACTIVE / FRONTEND` | Next.js App Router route page, layout, or route handler. |

---

## 11. Dashboard: UI Components & Voice Agent (22 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`dashboard/components/CopyToClipboard.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/CopyToClipboard.tsx) | 1,599 B | 57 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/CurrencySelector.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/CurrencySelector.tsx) | 1,970 B | 66 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/DashboardShell.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/DashboardShell.tsx) | 34,931 B | 753 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/DualBrainHeroBus.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/DualBrainHeroBus.tsx) | 52,602 B | 1,228 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/EmptyState.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/EmptyState.tsx) | 1,428 B | 48 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ExecutiveBriefingModal.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ExecutiveBriefingModal.tsx) | 20,029 B | 497 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ExecutiveQuickDock.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ExecutiveQuickDock.tsx) | 13,005 B | 302 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ExportCsvButton.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ExportCsvButton.tsx) | 1,720 B | 60 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/HourlyVelocityHeatmap.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/HourlyVelocityHeatmap.tsx) | 16,367 B | 314 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/SynapticActivityTicker.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/SynapticActivityTicker.tsx) | 15,314 B | 362 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/SystemHealthBadge.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/SystemHealthBadge.tsx) | 5,543 B | 141 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/VoiceAgent.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/VoiceAgent.tsx) | 101,676 B | 2,478 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/badge.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/badge.tsx) | 1,129 B | 37 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/card.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/card.tsx) | 1,879 B | 80 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/circuit-board-demo.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/circuit-board-demo.tsx) | 1,485 B | 56 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/circuit-board.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/circuit-board.tsx) | 26,243 B | 929 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/demo.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/demo.tsx) | 2,933 B | 94 | `ACTIVE / UI COMPONENT` | React UI component, interactive widget, or visual control. |
| [`dashboard/components/ui/kinetic-grid.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/kinetic-grid.tsx) | 11,988 B | 342 | `ACTIVE / UI COMPONENT` | ─── Types ──────────────────────────────────────────────────────────────────── |
| [`dashboard/components/ui/radar-chart.tsx`](file:///d:/Projects/Python/wb-agent/dashboard/components/ui/radar-chart.tsx) | 10,007 B | 367 | `ACTIVE / UI COMPONENT` | Format: { THEME_NAME: CSS_SELECTOR } |
| [`dashboard/components/voice/audioStreamer.ts`](file:///d:/Projects/Python/wb-agent/dashboard/components/voice/audioStreamer.ts) | 7,744 B | 242 | `ACTIVE / UI COMPONENT` | Web Audio Streaming Pipeline for Gemini Live API. |
| [`dashboard/components/voice/domActions.ts`](file:///d:/Projects/Python/wb-agent/dashboard/components/voice/domActions.ts) | 20,370 B | 557 | `ACTIVE / UI COMPONENT` | Client-Side DOM Actions, Screen Grounding Snapshot, and Visual Highlighting |
| [`dashboard/components/voice/siteMapData.ts`](file:///d:/Projects/Python/wb-agent/dashboard/components/voice/siteMapData.ts) | 18,570 B | 304 | `ACTIVE / UI COMPONENT` | Authoritative Site Map and UI Knowledge Base for EDITH Voice Agent. |

---

## 12. Dashboard: Configuration, Types & Libraries (22 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`dashboard/next-env.d.ts`](file:///d:/Projects/Python/wb-agent/dashboard/next-env.d.ts) | 233 B | 6 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/next.config.js`](file:///d:/Projects/Python/wb-agent/dashboard/next.config.js) | 341 B | 16 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/package-lock.json`](file:///d:/Projects/Python/wb-agent/dashboard/package-lock.json) | 73,068 B | 2,095 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/package.json`](file:///d:/Projects/Python/wb-agent/dashboard/package.json) | 759 B | 33 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/postcss.config.js`](file:///d:/Projects/Python/wb-agent/dashboard/postcss.config.js) | 83 B | 7 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/tailwind.config.js`](file:///d:/Projects/Python/wb-agent/dashboard/tailwind.config.js) | 2,811 B | 89 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/tsconfig.json`](file:///d:/Projects/Python/wb-agent/dashboard/tsconfig.json) | 596 B | 28 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/lib/utils.ts`](file:///d:/Projects/Python/wb-agent/dashboard/lib/utils.ts) | 169 B | 7 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/ai-mascot-3d.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/ai-mascot-3d.png) | 425,968 B | 1,947 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/ai-mascot-transparent.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/ai-mascot-transparent.png) | 22,827 B | 155 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/apple-touch-icon.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/apple-touch-icon.png) | 54,076 B | 421 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/edith-master.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/edith-master.png) | 1,570,960 B | 11,795 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/favicon.ico`](file:///d:/Projects/Python/wb-agent/dashboard/public/favicon.ico) | 1,024 B | 10 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-192.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-192.png) | 61,754 B | 460 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-512.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-512.png) | 279,010 B | 2,098 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-icon-badge.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-icon-badge.png) | 262,150 B | 2,243 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-icon.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-icon.png) | 260,194 B | 2,363 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-light.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-light.png) | 1,251,093 B | 9,744 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo-transparent.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo-transparent.png) | 1,285,989 B | 9,992 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/logo.png`](file:///d:/Projects/Python/wb-agent/dashboard/public/logo.png) | 1,570,960 B | 11,795 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/public/manifest.json`](file:///d:/Projects/Python/wb-agent/dashboard/public/manifest.json) | 506 B | 22 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |
| [`dashboard/types/index.ts`](file:///d:/Projects/Python/wb-agent/dashboard/types/index.ts) | 3,260 B | 146 | `CONFIG / FRONTEND` | Frontend configuration, type definition, or build utility. |

---

## 13. WhatsApp Gateway: Baileys Multi-Device Bridge (5 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`whatsapp-bridge/.env`](file:///d:/Projects/Python/wb-agent/whatsapp-bridge/.env) | 3,219 B | 91 | `ACTIVE / GATEWAY` | Baileys WhatsApp multi-device bridge gateway and Express server. |
| [`whatsapp-bridge/.gitignore`](file:///d:/Projects/Python/wb-agent/whatsapp-bridge/.gitignore) | 47 B | 4 | `ACTIVE / GATEWAY` | Baileys WhatsApp multi-device bridge gateway and Express server. |
| [`whatsapp-bridge/index.js`](file:///d:/Projects/Python/wb-agent/whatsapp-bridge/index.js) | 23,064 B | 590 | `ACTIVE / GATEWAY` | Baileys WhatsApp multi-device bridge gateway and Express server. |
| [`whatsapp-bridge/package-lock.json`](file:///d:/Projects/Python/wb-agent/whatsapp-bridge/package-lock.json) | 92,732 B | 2,617 | `ACTIVE / GATEWAY` | Baileys WhatsApp multi-device bridge gateway and Express server. |
| [`whatsapp-bridge/package.json`](file:///d:/Projects/Python/wb-agent/whatsapp-bridge/package.json) | 396 B | 18 | `ACTIVE / GATEWAY` | Baileys WhatsApp multi-device bridge gateway and Express server. |

---

## 14. Operational & Diagnostic Scripts (22 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/scripts/migrate_campaign_schema.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/migrate_campaign_schema.py) | 2,694 B | 79 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`backend/scripts/upgrade_sqlite_schema.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/upgrade_sqlite_schema.py) | 6,225 B | 120 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`backend/scripts/verify_asset_editor.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/verify_asset_editor.py) | 2,260 B | 55 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`backend/scripts/verify_dual_brain_endpoints.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/verify_dual_brain_endpoints.py) | 5,164 B | 105 | `UTILITY SCRIPT` | Add backend directory to path |
| [`backend/scripts/verify_edith_chat_brain.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/verify_edith_chat_brain.py) | 7,508 B | 149 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`backend/scripts/verify_knowledge_hub.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/verify_knowledge_hub.py) | 3,177 B | 73 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`backend/scripts/verify_modular_prompts_system.py`](file:///d:/Projects/Python/wb-agent/backend/scripts/verify_modular_prompts_system.py) | 10,557 B | 233 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/backup_db.py`](file:///d:/Projects/Python/wb-agent/scripts/backup_db.py) | 2,623 B | 79 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/check_health.py`](file:///d:/Projects/Python/wb-agent/scripts/check_health.py) | 3,872 B | 97 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/generate_brand_assets.py`](file:///d:/Projects/Python/wb-agent/scripts/generate_brand_assets.py) | 12,795 B | 278 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/generate_sample_leads.py`](file:///d:/Projects/Python/wb-agent/scripts/generate_sample_leads.py) | 2,859 B | 61 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/inspect_and_consolidate.py`](file:///d:/Projects/Python/wb-agent/scripts/inspect_and_consolidate.py) | 1,472 B | 36 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/inspect_databases.py`](file:///d:/Projects/Python/wb-agent/scripts/inspect_databases.py) | 1,261 B | 32 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/migrate_consolidate.py`](file:///d:/Projects/Python/wb-agent/scripts/migrate_consolidate.py) | 3,322 B | 78 | `UTILITY SCRIPT` | 1. Back up db |
| [`scripts/optimize_db.py`](file:///d:/Projects/Python/wb-agent/scripts/optimize_db.py) | 1,998 B | 75 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/run_simulation.py`](file:///d:/Projects/Python/wb-agent/scripts/run_simulation.py) | 5,189 B | 140 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/sanitize_simulation_conversations.py`](file:///d:/Projects/Python/wb-agent/scripts/sanitize_simulation_conversations.py) | 3,961 B | 94 | `UTILITY SCRIPT` | !/usr/bin/env python3 |
| [`scripts/seed_demo.py`](file:///d:/Projects/Python/wb-agent/scripts/seed_demo.py) | 15,356 B | 328 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/smoke_test.py`](file:///d:/Projects/Python/wb-agent/scripts/smoke_test.py) | 3,386 B | 88 | `TEST / QA` | Automated test suite or verification harness. |
| [`scripts/test_edith_multiturn.py`](file:///d:/Projects/Python/wb-agent/scripts/test_edith_multiturn.py) | 4,605 B | 108 | `TEST / QA` | Automated test suite or verification harness. |
| [`scripts/verify_db_integrity.py`](file:///d:/Projects/Python/wb-agent/scripts/verify_db_integrity.py) | 3,838 B | 93 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |
| [`scripts/whatsapp_cli.py`](file:///d:/Projects/Python/wb-agent/scripts/whatsapp_cli.py) | 4,058 B | 116 | `UTILITY SCRIPT` | Operational, diagnostic, or database maintenance CLI script. |

---

## 15. Architecture Decision Records (ADRs) (26 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`docs/decisions/0001-postgresql-primary-storage.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0001-postgresql-primary-storage.md) | 1,512 B | 22 | `DOCUMENTATION` | ADR-001: Why PostgreSQL instead of SQLite as Primary Production Storage |
| [`docs/decisions/0002-modular-monolith-architecture.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0002-modular-monolith-architecture.md) | 1,373 B | 23 | `DOCUMENTATION` | ADR-002: Modular Monolith instead of Microservices |
| [`docs/decisions/0003-database-backed-queue.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0003-database-backed-queue.md) | 1,378 B | 23 | `DOCUMENTATION` | ADR-003: Database-Backed Job Queue with SKIP LOCKED |
| [`docs/decisions/0004-conversation-concurrency.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0004-conversation-concurrency.md) | 1,376 B | 23 | `DOCUMENTATION` | ADR-004: Conversation Concurrency and Turn-Locking Strategy |
| [`docs/decisions/0005-provider-abstraction.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0005-provider-abstraction.md) | 1,388 B | 23 | `DOCUMENTATION` | ADR-005: Provider Abstraction for WhatsApp and LLMs |
| [`docs/decisions/0006-memory-architecture.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0006-memory-architecture.md) | 1,342 B | 23 | `DOCUMENTATION` | ADR-006: Customer Memory Architecture: Structured Facts & Auditable Context |
| [`docs/decisions/0007-knowledge-rag-authority.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0007-knowledge-rag-authority.md) | 1,330 B | 23 | `DOCUMENTATION` | ADR-007: Knowledge RAG Architecture and Strict Authority Priority |
| [`docs/decisions/0008-human-takeover-race-prevention.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0008-human-takeover-race-prevention.md) | 1,131 B | 20 | `DOCUMENTATION` | ADR-008: Human Handoff and Takeover Race Condition Prevention |
| [`docs/decisions/0009-followup-engine-cancellation.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0009-followup-engine-cancellation.md) | 1,414 B | 21 | `DOCUMENTATION` | ADR-009: Autonomous Follow-up Engine and Active Cancellation Logic |
| [`docs/decisions/0010-local-first-architecture.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0010-local-first-architecture.md) | 1,239 B | 21 | `DOCUMENTATION` | ADR-010: Local-First Architecture with Cloud-Ready Portability |
| [`docs/decisions/0011-whatsapp-adapter-architecture.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0011-whatsapp-adapter-architecture.md) | 1,272 B | 20 | `DOCUMENTATION` | ADR-011: WhatsApp Adapter Architecture: Simulator vs Meta Cloud API |
| [`docs/decisions/0012-operator-correction-learning.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0012-operator-correction-learning.md) | 1,449 B | 20 | `DOCUMENTATION` | ADR 0012: Operator Correction & Human-in-the-Loop Learning Pipeline |
| [`docs/decisions/0013-modular-prompt-versioning.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0013-modular-prompt-versioning.md) | 1,285 B | 23 | `DOCUMENTATION` | ADR 0013: Modular System Prompt Architecture & Versioning |
| [`docs/decisions/0014-auditable-commercial-quotes.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0014-auditable-commercial-quotes.md) | 1,145 B | 18 | `DOCUMENTATION` | ADR 0014: Auditable Commercial Pricing Quotes & Lifecycle |
| [`docs/decisions/0015-dual-brain-bidirectional-agency-and-refusal.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0015-dual-brain-bidirectional-agency-and-refusal.md) | 2,262 B | 26 | `DOCUMENTATION` | ADR 0015: Dual-Brain Bidirectional Agency, Refusal Rights & Autonomous Fallback |
| [`docs/decisions/0016-campaign-orchestration-and-anti-ban-guards.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0016-campaign-orchestration-and-anti-ban-guards.md) | 1,875 B | 27 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/decisions/0017-resilient-sqlite-and-schema-migrations.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0017-resilient-sqlite-and-schema-migrations.md) | 2,230 B | 34 | `MIGRATION` | Database schema migration or data backfill. |
| [`docs/decisions/0018-whatsapp-rate-limiting-and-ban-prevention.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0018-whatsapp-rate-limiting-and-ban-prevention.md) | 1,767 B | 29 | `DOCUMENTATION` | ADR 0018: WhatsApp Outbound Rate Limiting, Dead Letter Queues and Ban Prevention |
| [`docs/decisions/0019-invoicing-gst-and-quote-lifecycle.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0019-invoicing-gst-and-quote-lifecycle.md) | 2,120 B | 34 | `DOCUMENTATION` | ADR 0019: Automated Invoicing, GST Compliance, and Quote Lifecycle State Machine |
| [`docs/decisions/0020-frontend-architecture-and-observability.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0020-frontend-architecture-and-observability.md) | 1,967 B | 33 | `DOCUMENTATION` | ADR 0020: Frontend Architecture, Real-Time Polling and Dashboard Observability |
| [`docs/decisions/0021-multi-currency-pricing-and-internationalization.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0021-multi-currency-pricing-and-internationalization.md) | 2,232 B | 34 | `DOCUMENTATION` | ADR 0021: Multi-Currency Pricing Architecture and Internationalization Strategy |
| [`docs/decisions/0022-simulation-sandbox-isolation-and-live-whatsapp-guardrails.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0022-simulation-sandbox-isolation-and-live-whatsapp-guardrails.md) | 4,513 B | 54 | `DOCUMENTATION` | ADR 0022: Simulation Sandbox Isolation and Live WhatsApp Guardrails |
| [`docs/decisions/0023-conversation-history-lifecycle-and-database-management.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0023-conversation-history-lifecycle-and-database-management.md) | 4,448 B | 52 | `DOCUMENTATION` | ADR 0023: Conversation History Lifecycle, Deletion Controls, and Database Management |
| [`docs/decisions/0024-whatsapp-group-message-suppression-and-operator-notification.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0024-whatsapp-group-message-suppression-and-operator-notification.md) | 5,422 B | 64 | `DOCUMENTATION` | ADR 0024: WhatsApp Group Message Auto-Reply Suppression and Real-Time Operator Notification |
| [`docs/decisions/0025-one-click-ai-suggestion-and-omnipotent-friday-agency.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0025-one-click-ai-suggestion-and-omnipotent-friday-agency.md) | 5,367 B | 71 | `DOCUMENTATION` | ADR 0025: 1-Click AI Suggestion Reply for WhatsApp Groups and Omnipotent Friday Website Agency |
| [`docs/decisions/0026-dynamic-model-assignment-and-zero-cost-nvidia-playground.md`](file:///d:/Projects/Python/wb-agent/docs/decisions/0026-dynamic-model-assignment-and-zero-cost-nvidia-playground.md) | 6,622 B | 76 | `DOCUMENTATION` | ADR 0026: Dynamic Model-to-Task Operational Roles, Zero-Cost NVIDIA NIM Economics & Dedicated Playground |

---

## 16. Architecture, Setup, and Runbook Documentation (53 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`docs/CHANGELOG.md`](file:///d:/Projects/Python/wb-agent/docs/CHANGELOG.md) | 4,423 B | 62 | `DOCUMENTATION` | Changelog: WB-Agent Platform |
| [`docs/PAUSE_STATE.md`](file:///d:/Projects/Python/wb-agent/docs/PAUSE_STATE.md) | 8,316 B | 102 | `DOCUMENTATION` | ⏸️ EDITH Multi-Agent Session — Pause State & Progress Log |
| [`docs/api-reference.md`](file:///d:/Projects/Python/wb-agent/docs/api-reference.md) | 8,675 B | 126 | `DOCUMENTATION` | REST API & WebSocket Reference |
| [`docs/architecture.md`](file:///d:/Projects/Python/wb-agent/docs/architecture.md) | 3,118 B | 36 | `DOCUMENTATION` | WB-Agent Architecture Deep Dive |
| [`docs/index.md`](file:///d:/Projects/Python/wb-agent/docs/index.md) | 6,582 B | 90 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/operations-runbook.md`](file:///d:/Projects/Python/wb-agent/docs/operations-runbook.md) | 6,059 B | 154 | `DOCUMENTATION` | Operations & Runbook Guide |
| [`docs/visual-tour.md`](file:///d:/Projects/Python/wb-agent/docs/visual-tour.md) | 13,794 B | 275 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/architecture/conversational-state-machine.md`](file:///d:/Projects/Python/wb-agent/docs/architecture/conversational-state-machine.md) | 4,489 B | 101 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/architecture/deterministic-pricing-engine.md`](file:///d:/Projects/Python/wb-agent/docs/architecture/deterministic-pricing-engine.md) | 3,982 B | 101 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/architecture/durable-queue-and-worker.md`](file:///d:/Projects/Python/wb-agent/docs/architecture/durable-queue-and-worker.md) | 3,398 B | 98 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/architecture/multi-tier-memory-system.md`](file:///d:/Projects/Python/wb-agent/docs/architecture/multi-tier-memory-system.md) | 3,954 B | 97 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/architecture/system-overview.md`](file:///d:/Projects/Python/wb-agent/docs/architecture/system-overview.md) | 4,458 B | 78 | `DOCUMENTATION` | WB-Agent (EDITH) — System Architecture Overview |
| [`docs/assets/EDITH_BRAND_MASTER.png`](file:///d:/Projects/Python/wb-agent/docs/assets/EDITH_BRAND_MASTER.png) | 1,726,440 B | 12,795 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/edith-master.png`](file:///d:/Projects/Python/wb-agent/docs/assets/edith-master.png) | 1,570,960 B | 11,795 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/logo-icon.png`](file:///d:/Projects/Python/wb-agent/docs/assets/logo-icon.png) | 260,194 B | 2,363 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/logo-light.png`](file:///d:/Projects/Python/wb-agent/docs/assets/logo-light.png) | 1,251,093 B | 9,744 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/logo-transparent.png`](file:///d:/Projects/Python/wb-agent/docs/assets/logo-transparent.png) | 1,285,989 B | 9,992 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/preview-dark-theme.png`](file:///d:/Projects/Python/wb-agent/docs/assets/preview-dark-theme.png) | 406,267 B | 2,739 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/assets/preview-light-theme.png`](file:///d:/Projects/Python/wb-agent/docs/assets/preview-light-theme.png) | 369,438 B | 2,479 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/audit/current-system.md`](file:///d:/Projects/Python/wb-agent/docs/audit/current-system.md) | 5,303 B | 77 | `DOCUMENTATION` | Comprehensive System Audit: WB-Agent (EDITH) |
| [`docs/guides/developer-onboarding.md`](file:///d:/Projects/Python/wb-agent/docs/guides/developer-onboarding.md) | 2,683 B | 87 | `DOCUMENTATION` | Developer Onboarding & Local Environment Guide |
| [`docs/guides/whatsapp-bridge-guide.md`](file:///d:/Projects/Python/wb-agent/docs/guides/whatsapp-bridge-guide.md) | 2,637 B | 63 | `DOCUMENTATION` | WhatsApp Connectivity Guide: Meta Cloud API vs. Self-Hosted Baileys Bridge |
| [`docs/runbooks/incident-response.md`](file:///d:/Projects/Python/wb-agent/docs/runbooks/incident-response.md) | 2,746 B | 60 | `DOCUMENTATION` | Incident Response & Troubleshooting Runbook: WB-Agent |
| [`docs/runbooks/production-deployment.md`](file:///d:/Projects/Python/wb-agent/docs/runbooks/production-deployment.md) | 2,702 B | 107 | `DOCUMENTATION` | Production Deployment Runbook: WB-Agent Platform |
| [`docs/sales/consultative-framework.md`](file:///d:/Projects/Python/wb-agent/docs/sales/consultative-framework.md) | 2,302 B | 39 | `DOCUMENTATION` | EDITH: Consultative B2B Sales Methodology |
| [`docs/screenshots/analytics.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/analytics.png) | 306,094 B | 1,856 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/campaigns.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/campaigns.png) | 276,175 B | 1,612 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/catalog.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/catalog.png) | 323,185 B | 2,166 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/followups.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/followups.png) | 305,829 B | 1,755 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/handoffs.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/handoffs.png) | 300,307 B | 1,799 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/integrations.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/integrations.png) | 264,833 B | 1,669 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/knowledge_rag.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/knowledge_rag.png) | 302,535 B | 1,809 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/leads_pipeline.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/leads_pipeline.png) | 273,284 B | 1,684 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/live_inbox.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/live_inbox.png) | 213,124 B | 1,388 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/mobile_inbox.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/mobile_inbox.png) | 42,507 B | 257 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/mobile_overview.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/mobile_overview.png) | 66,855 B | 401 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/modular_prompts.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/modular_prompts.png) | 270,096 B | 1,578 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/orders.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/orders.png) | 282,551 B | 1,615 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/overview.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/overview.png) | 274,835 B | 1,752 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/pricing_rules.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/pricing_rules.png) | 284,757 B | 1,954 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/settings.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/settings.png) | 337,250 B | 1,925 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/screenshots/whatsapp_hub_modal.png`](file:///d:/Projects/Python/wb-agent/docs/screenshots/whatsapp_hub_modal.png) | 229,931 B | 1,696 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/security/threat-model.md`](file:///d:/Projects/Python/wb-agent/docs/security/threat-model.md) | 2,312 B | 33 | `DOCUMENTATION` | Security Architecture & Threat Model |
| [`docs/setup/01-prerequisites-and-system-requirements.md`](file:///d:/Projects/Python/wb-agent/docs/setup/01-prerequisites-and-system-requirements.md) | 3,455 B | 96 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/02-database-and-pgvector-setup.md`](file:///d:/Projects/Python/wb-agent/docs/setup/02-database-and-pgvector-setup.md) | 5,691 B | 180 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/03-backend-setup.md`](file:///d:/Projects/Python/wb-agent/docs/setup/03-backend-setup.md) | 5,392 B | 199 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/04-dashboard-frontend-setup.md`](file:///d:/Projects/Python/wb-agent/docs/setup/04-dashboard-frontend-setup.md) | 7,951 B | 224 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/05-whatsapp-integration-guide.md`](file:///d:/Projects/Python/wb-agent/docs/setup/05-whatsapp-integration-guide.md) | 6,918 B | 183 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/06-nvidia-nemotron-and-llm-setup.md`](file:///d:/Projects/Python/wb-agent/docs/setup/06-nvidia-nemotron-and-llm-setup.md) | 4,304 B | 115 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/07-owner-escalation-channel.md`](file:///d:/Projects/Python/wb-agent/docs/setup/07-owner-escalation-channel.md) | 4,304 B | 115 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/08-end-to-end-verification.md`](file:///d:/Projects/Python/wb-agent/docs/setup/08-end-to-end-verification.md) | 7,855 B | 222 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |
| [`docs/setup/09-production-deployment-checklist.md`](file:///d:/Projects/Python/wb-agent/docs/setup/09-production-deployment-checklist.md) | 2,463 B | 66 | `DOCUMENTATION` | 1. Pre-Flight Infrastructure Requirements |
| [`docs/troubleshooting/error-catalog-and-solutions.md`](file:///d:/Projects/Python/wb-agent/docs/troubleshooting/error-catalog-and-solutions.md) | 19,975 B | 380 | `DOCUMENTATION` | Technical documentation, architecture record, or runbook. |

---

## 17. Generated Commercial Invoices (Runtime Storage) (46 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`storage/exports/invoices/PI-260904-125.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-125.pdf) | 11,174 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-157.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-157.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-191.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-191.pdf) | 11,168 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-205.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-205.pdf) | 11,029 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-229.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-229.pdf) | 11,214 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-248.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-248.pdf) | 11,175 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-358.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-358.pdf) | 11,185 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-368.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-368.pdf) | 11,181 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-426.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-426.pdf) | 11,136 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-500.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-500.pdf) | 11,220 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-507.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-507.pdf) | 11,029 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-567.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-567.pdf) | 11,023 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-571.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-571.pdf) | 11,196 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-587.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-587.pdf) | 11,044 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-595.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-595.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-597.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-597.pdf) | 11,175 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-726.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-726.pdf) | 11,175 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-772.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-772.pdf) | 11,167 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-785.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-785.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-823.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-823.pdf) | 11,220 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-843.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-843.pdf) | 11,153 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-845.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-845.pdf) | 11,167 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260904-921.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260904-921.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260906-299.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260906-299.pdf) | 462,796 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260906-451.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260906-451.pdf) | 462,941 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260906-926.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260906-926.pdf) | 462,941 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-227.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-227.pdf) | 462,767 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-230.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-230.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-282.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-282.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-556.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-556.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-596.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-596.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-620.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-620.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-792.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-792.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-841.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-841.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-847.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-847.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-852.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-852.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260907-999.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260907-999.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-295.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-295.pdf) | 462,773 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-314.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-314.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-449.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-449.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-578.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-578.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-667.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-667.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-745.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-745.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260914-815.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260914-815.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260921-514.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260921-514.pdf) | 462,919 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`storage/exports/invoices/PI-260921-985.pdf`](file:///d:/Projects/Python/wb-agent/storage/exports/invoices/PI-260921-985.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |

---

## 18. Databases & SQLite Storage Files (12 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app.db`](file:///d:/Projects/Python/wb-agent/backend/app.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backend/wb_agent.db`](file:///d:/Projects/Python/wb-agent/backend/wb_agent.db) | 1,757,184 B | 3,058 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260904_134519.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260904_134519.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260904_134639.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260904_134639.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260904_140053.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260904_140053.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260906_193403.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260906_193403.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260907_103327.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260907_103327.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260907_104311.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260907_104311.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260907_120659.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260907_120659.db) | 0 B | 1 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260914_175200.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260914_175200.db) | 1,753,088 B | 3,064 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/wb_agent_20260921_133415.db`](file:///d:/Projects/Python/wb-agent/backups/wb_agent_20260921_133415.db) | 1,757,184 B | 3,058 | `DATABASE` | SQLite runtime database file or backup snapshot. |
| [`backups/db/wb_agent_backup_20260917_225311.db`](file:///d:/Projects/Python/wb-agent/backups/db/wb_agent_backup_20260917_225311.db) | 1,908,736 B | 3,652 | `DATABASE` | SQLite runtime database file or backup snapshot. |

---

## 19. Miscellaneous Storage, Infrastructure & Assets (161 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`.agents/ORIGINAL_REQUEST.md`](file:///d:/Projects/Python/wb-agent/.agents/ORIGINAL_REQUEST.md) | 4,699 B | 74 | `ACTIVE / SUPPORT` | Original User Request |
| [`.agents/PROJECT.md`](file:///d:/Projects/Python/wb-agent/.agents/PROJECT.md) | 10,303 B | 105 | `ACTIVE / SUPPORT` | Project: EDITH Autonomous Sales Platform Enterprise Upgrades |
| [`.agents/orchestrator_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/BRIEFING.md) | 6,135 B | 93 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T00:45:00+05:30 |
| [`.agents/orchestrator_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/DISPATCH.md) | 3,047 B | 33 | `ACTIVE / SUPPORT` | Orchestrator Dispatch Log |
| [`.agents/orchestrator_1/GATE_STATUS.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/GATE_STATUS.md) | 536 B | 14 | `ACTIVE / SUPPORT` | GATE STATUS |
| [`.agents/orchestrator_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/context.md) | 309 B | 7 | `ACTIVE / SUPPORT` | Orchestrator Context |
| [`.agents/orchestrator_1/plan.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/plan.md) | 2,190 B | 36 | `ACTIVE / SUPPORT` | Orchestrator Execution Plan: EDITH Enterprise Upgrades |
| [`.agents/orchestrator_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/orchestrator_1/progress.md) | 1,292 B | 23 | `ACTIVE / SUPPORT` | Orchestrator Progress |
| [`.agents/sentinel_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/sentinel_1/BRIEFING.md) | 2,000 B | 43 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T00:44:20+05:30 |
| [`.agents/sentinel_1/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/sentinel_1/handoff.md) | 1,896 B | 26 | `ACTIVE / SUPPORT` | Sentinel Dispatch Handoff Report |
| [`.agents/teamwork_preview_auditor_m1_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_auditor_m1_1/BRIEFING.md) | 2,035 B | 51 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T01:02:00+05:30 |
| [`.agents/teamwork_preview_auditor_m1_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_auditor_m1_1/DISPATCH.md) | 1,526 B | 22 | `ACTIVE / SUPPORT` | 2026-09-03T19:31:56Z |
| [`.agents/teamwork_preview_auditor_m1_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_auditor_m1_1/context.md) | 372 B | 6 | `ACTIVE / SUPPORT` | Agent Context: Forensic Auditor M1_1 |
| [`.agents/teamwork_preview_auditor_m1_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_auditor_m1_1/progress.md) | 186 B | 8 | `ACTIVE / SUPPORT` | Progress — auditor_m1_1 |
| [`.agents/teamwork_preview_challenger_m1_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_1/BRIEFING.md) | 1,743 B | 50 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T01:03:00+05:30 |
| [`.agents/teamwork_preview_challenger_m1_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_1/DISPATCH.md) | 1,431 B | 19 | `ACTIVE / SUPPORT` | 2026-09-03T19:31:56Z |
| [`.agents/teamwork_preview_challenger_m1_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_1/context.md) | 365 B | 6 | `ACTIVE / SUPPORT` | Agent Context: Challenger M1_1 |
| [`.agents/teamwork_preview_challenger_m1_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_1/progress.md) | 869 B | 20 | `ACTIVE / SUPPORT` | Progress — Challenger M1_1 |
| [`.agents/teamwork_preview_challenger_m1_2/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_2/BRIEFING.md) | 1,617 B | 44 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T01:02:00Z |
| [`.agents/teamwork_preview_challenger_m1_2/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_2/DISPATCH.md) | 1,214 B | 15 | `ACTIVE / SUPPORT` | 2026-09-03T19:31:56Z |
| [`.agents/teamwork_preview_challenger_m1_2/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_2/context.md) | 365 B | 6 | `ACTIVE / SUPPORT` | Agent Context: Challenger M1_2 |
| [`.agents/teamwork_preview_challenger_m1_2/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_challenger_m1_2/progress.md) | 117 B | 5 | `ACTIVE / SUPPORT` | Progress — challenger_m1_2 |
| [`.agents/teamwork_preview_explorer_s0_2/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_2/BRIEFING.md) | 3,127 B | 47 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-03T19:22:30Z |
| [`.agents/teamwork_preview_explorer_s0_2/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_2/DISPATCH.md) | 1,788 B | 25 | `ACTIVE / SUPPORT` | 2026-09-03T19:15:41Z |
| [`.agents/teamwork_preview_explorer_s0_2/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_2/context.md) | 264 B | 5 | `ACTIVE / SUPPORT` | Agent Context: Explorer s0_2 |
| [`.agents/teamwork_preview_explorer_s0_2/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_2/handoff.md) | 18,674 B | 329 | `ACTIVE / SUPPORT` | S0 Exploration Handoff: Real-Time Sync & Campaign Drip Engine |
| [`.agents/teamwork_preview_explorer_s0_2/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_2/progress.md) | 662 B | 14 | `ACTIVE / SUPPORT` | Progress Log - Explorer s0_2 |
| [`.agents/teamwork_preview_explorer_s0_3/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_3/BRIEFING.md) | 2,766 B | 57 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T00:48:45+05:30 |
| [`.agents/teamwork_preview_explorer_s0_3/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_3/DISPATCH.md) | 1,906 B | 29 | `ACTIVE / SUPPORT` | 2026-09-03T19:15:41Z |
| [`.agents/teamwork_preview_explorer_s0_3/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_3/context.md) | 277 B | 5 | `ACTIVE / SUPPORT` | Agent Context: Explorer s0_3 |
| [`.agents/teamwork_preview_explorer_s0_3/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_3/handoff.md) | 16,995 B | 253 | `ACTIVE / SUPPORT` | Handoff Report: Frontend & Analytics Architecture (s0_3) |
| [`.agents/teamwork_preview_explorer_s0_3/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_explorer_s0_3/progress.md) | 1,266 B | 23 | `ACTIVE / SUPPORT` | Progress Log |
| [`.agents/teamwork_preview_reviewer_m1_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_1/BRIEFING.md) | 2,277 B | 57 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T01:02:15+05:30 |
| [`.agents/teamwork_preview_reviewer_m1_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_1/DISPATCH.md) | 1,859 B | 23 | `ACTIVE / SUPPORT` | 2026-09-03T19:32:00Z |
| [`.agents/teamwork_preview_reviewer_m1_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_1/context.md) | 359 B | 6 | `ACTIVE / SUPPORT` | Agent Context: Reviewer M1_1 |
| [`.agents/teamwork_preview_reviewer_m1_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_1/progress.md) | 790 B | 19 | `ACTIVE / SUPPORT` | Progress — Reviewer 1 (Milestone 1) |
| [`.agents/teamwork_preview_reviewer_m1_2/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_2/BRIEFING.md) | 1,780 B | 46 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-03T19:32:00Z |
| [`.agents/teamwork_preview_reviewer_m1_2/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_2/DISPATCH.md) | 1,394 B | 21 | `ACTIVE / SUPPORT` | 2026-09-03T19:32:00Z |
| [`.agents/teamwork_preview_reviewer_m1_2/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_2/context.md) | 359 B | 6 | `ACTIVE / SUPPORT` | Agent Context: Reviewer M1_2 |
| [`.agents/teamwork_preview_reviewer_m1_2/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_reviewer_m1_2/progress.md) | 297 B | 9 | `ACTIVE / SUPPORT` | Progress — Reviewer M1_2 |
| [`.agents/teamwork_preview_spec_miner_s0_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_spec_miner_s0_1/BRIEFING.md) | 2,976 B | 44 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T00:50:00Z |
| [`.agents/teamwork_preview_spec_miner_s0_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_spec_miner_s0_1/DISPATCH.md) | 1,934 B | 28 | `ACTIVE / SUPPORT` | 2026-09-04T00:45:41+05:30 |
| [`.agents/teamwork_preview_spec_miner_s0_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_spec_miner_s0_1/context.md) | 272 B | 5 | `ACTIVE / SUPPORT` | Agent Context: Spec Miner s0_1 |
| [`.agents/teamwork_preview_spec_miner_s0_1/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_spec_miner_s0_1/handoff.md) | 20,792 B | 230 | `ACTIVE / SUPPORT` | Architectural Specification Mining & Backend Exploration Report (s0_1) |
| [`.agents/teamwork_preview_spec_miner_s0_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_spec_miner_s0_1/progress.md) | 956 B | 16 | `ACTIVE / SUPPORT` | Progress Tracker — teamwork_preview_spec_miner_s0_1 |
| [`.agents/teamwork_preview_test_writer_e2e_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_test_writer_e2e_1/BRIEFING.md) | 3,144 B | 58 | `TEST / QA` | Automated test suite or verification harness. |
| [`.agents/teamwork_preview_test_writer_e2e_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_test_writer_e2e_1/DISPATCH.md) | 2,422 B | 30 | `TEST / QA` | Automated test suite or verification harness. |
| [`.agents/teamwork_preview_test_writer_e2e_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_test_writer_e2e_1/context.md) | 346 B | 6 | `TEST / QA` | Automated test suite or verification harness. |
| [`.agents/teamwork_preview_test_writer_e2e_1/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_test_writer_e2e_1/handoff.md) | 3,424 B | 55 | `TEST / QA` | Automated test suite or verification harness. |
| [`.agents/teamwork_preview_test_writer_e2e_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_test_writer_e2e_1/progress.md) | 1,398 B | 23 | `TEST / QA` | Automated test suite or verification harness. |
| [`.agents/teamwork_preview_worker_m1_1/BRIEFING.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_worker_m1_1/BRIEFING.md) | 5,040 B | 83 | `ACTIVE / SUPPORT` | BRIEFING — 2026-09-04T01:01:30Z |
| [`.agents/teamwork_preview_worker_m1_1/DISPATCH.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_worker_m1_1/DISPATCH.md) | 2,886 B | 39 | `ACTIVE / SUPPORT` | DISPATCH — 2026-09-04T00:51:00+05:30 |
| [`.agents/teamwork_preview_worker_m1_1/context.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_worker_m1_1/context.md) | 459 B | 7 | `ACTIVE / SUPPORT` | Agent Context: Worker M1_1 |
| [`.agents/teamwork_preview_worker_m1_1/handoff.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_worker_m1_1/handoff.md) | 9,324 B | 135 | `ACTIVE / SUPPORT` | Handoff Report — Milestone 1: Automated PDF Pro-Forma Invoice & WhatsApp Dispatch |
| [`.agents/teamwork_preview_worker_m1_1/progress.md`](file:///d:/Projects/Python/wb-agent/.agents/teamwork_preview_worker_m1_1/progress.md) | 2,144 B | 32 | `ACTIVE / SUPPORT` | Progress — Milestone 1: Automated PDF Pro-Forma Invoice & WhatsApp Dispatch |
| [`backend/.env`](file:///d:/Projects/Python/wb-agent/backend/.env) | 3,299 B | 93 | `ACTIVE / SUPPORT` | ============================================================================== |
| [`backend/pyproject.toml`](file:///d:/Projects/Python/wb-agent/backend/pyproject.toml) | 1,133 B | 50 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/requirements.txt`](file:///d:/Projects/Python/wb-agent/backend/requirements.txt) | 314 B | 19 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_191804.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_191804.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_191834.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_191834.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_192256.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_192256.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_192920.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_192920.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_192952.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_192952.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_193006.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_193006.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_193026.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_193026.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_193240.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_193240.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260903_193317.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260903_193317.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_104029.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_104029.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_104602.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_104602.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_105843.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_105843.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_110051.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_110051.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_110218.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_110218.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_110354.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_110354.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_111602.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_111602.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_131734.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_131734.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260904_131919.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260904_131919.txt) | 126 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/backups/backup_manifest_20260909_140050.txt`](file:///d:/Projects/Python/wb-agent/backend/backups/backup_manifest_20260909_140050.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/data/.gitkeep`](file:///d:/Projects/Python/wb-agent/backend/data/.gitkeep) | 49 B | 2 | `ACTIVE / SUPPORT` | Keep backend/data directory in version control |
| [`backend/data/friday_reports.jsonl`](file:///d:/Projects/Python/wb-agent/backend/data/friday_reports.jsonl) | 10,996 B | 20 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backend/storage/exports/invoices/PI-260903-110.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-110.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-134.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-134.pdf) | 11,287 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-146.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-146.pdf) | 11,211 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-151.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-151.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-216.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-216.pdf) | 11,212 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-241.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-241.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-292.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-292.pdf) | 11,304 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-294.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-294.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-303.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-303.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-342.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-342.pdf) | 11,212 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-356.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-356.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-365.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-365.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-377.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-377.pdf) | 11,193 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-390.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-390.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-403.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-403.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-556.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-556.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-558.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-558.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-601.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-601.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-647.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-647.pdf) | 11,204 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-682.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-682.pdf) | 11,274 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-683.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-683.pdf) | 11,278 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-693.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-693.pdf) | 11,379 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-727.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-727.pdf) | 11,379 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-733.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-733.pdf) | 11,230 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-748.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-748.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-772.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-772.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-793.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-793.pdf) | 11,274 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-842.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-842.pdf) | 11,212 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-880.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-880.pdf) | 5,085 B | 87 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-915.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-915.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-928.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-928.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-934.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-934.pdf) | 11,379 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-935.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-935.pdf) | 11,193 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-949.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-949.pdf) | 11,212 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-956.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-956.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-961.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-961.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260903-962.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260903-962.pdf) | 11,163 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-231.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-231.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-307.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-307.pdf) | 11,475 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-308.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-308.pdf) | 11,195 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-315.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-315.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-345.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-345.pdf) | 11,232 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-364.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-364.pdf) | 11,199 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-407.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-407.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-423.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-423.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-436.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-436.pdf) | 11,210 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-472.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-472.pdf) | 11,199 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-542.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-542.pdf) | 11,199 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-638.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-638.pdf) | 11,475 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-640.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-640.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-641.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-641.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-677.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-677.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-693.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-693.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-706.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-706.pdf) | 11,214 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-732.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-732.pdf) | 11,195 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-750.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-750.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-845.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-845.pdf) | 11,189 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-846.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-846.pdf) | 11,196 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-849.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-849.pdf) | 11,203 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-862.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-862.pdf) | 11,247 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-887.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-887.pdf) | 11,184 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-900.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-900.pdf) | 11,188 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-926.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-926.pdf) | 11,196 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-971.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-971.pdf) | 11,212 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-986.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-986.pdf) | 11,199 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260904-998.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260904-998.pdf) | 11,196 B | 500 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260909-155.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260909-155.pdf) | 462,911 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260909-691.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260909-691.pdf) | 462,912 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backend/storage/exports/invoices/PI-260909-810.pdf`](file:///d:/Projects/Python/wb-agent/backend/storage/exports/invoices/PI-260909-810.pdf) | 462,767 B | 527 | `GENERATED ARTIFACT` | Commercial Pro-Forma Invoice PDF generated at runtime or test. |
| [`backups/backup_manifest_20260903_165551.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260903_165551.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260903_165835.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260903_165835.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260903_170001.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260903_170001.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260903_180802.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260903_180802.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260903_184829.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260903_184829.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260904_112002.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260904_112002.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260904_113654.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260904_113654.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260904_114915.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260904_114915.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260904_121435.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260904_121435.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`backups/backup_manifest_20260904_122745.txt`](file:///d:/Projects/Python/wb-agent/backups/backup_manifest_20260904_122745.txt) | 97 B | 4 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`docker/backend.Dockerfile`](file:///d:/Projects/Python/wb-agent/docker/backend.Dockerfile) | 698 B | 28 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`docker/dashboard.Dockerfile`](file:///d:/Projects/Python/wb-agent/docker/dashboard.Dockerfile) | 164 B | 16 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |
| [`storage/sample_leads.csv`](file:///d:/Projects/Python/wb-agent/storage/sample_leads.csv) | 720 B | 10 | `ACTIVE / SUPPORT` | Project root file, manifest, or configuration. |

---

## 2. Backend: Agent Engine (EDITH Core) (19 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/agent/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/__init__.py) | 1,002 B | 31 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/critic.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/critic.py) | 3,824 B | 100 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/extractor.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/extractor.py) | 12,482 B | 228 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/greetings.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/greetings.py) | 1,433 B | 49 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/intent.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/intent.py) | 6,276 B | 146 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/orchestrator.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/orchestrator.py) | 49,261 B | 1,001 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/prompts.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/prompts.py) | 22,873 B | 573 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/sales_engine.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/sales_engine.py) | 9,952 B | 207 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/sales_stage.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/sales_stage.py) | 4,373 B | 112 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/scoring.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/scoring.py) | 3,291 B | 98 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/sentiment.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/sentiment.py) | 3,047 B | 94 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/validator.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/validator.py) | 2,462 B | 71 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/prompts/objection_handling.md`](file:///d:/Projects/Python/wb-agent/backend/app/agent/prompts/objection_handling.md) | 1,430 B | 17 | `ACTIVE / CORE AGENT` | OBJECTION HANDLING FRAMEWORK — INDUSTRY-AGNOSTIC SALES OPERATING SYSTEM |
| [`backend/app/agent/prompts/system.md`](file:///d:/Projects/Python/wb-agent/backend/app/agent/prompts/system.md) | 5,218 B | 77 | `ACTIVE / CORE AGENT` | {{agent_name}} — AUTONOMOUS HUMAN-LIKE AI SALES AGENT OPERATING SYSTEM |
| [`backend/app/agent/providers/base.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/providers/base.py) | 1,095 B | 46 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/providers/nvidia.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/providers/nvidia.py) | 4,305 B | 120 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/providers/router.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/providers/router.py) | 8,540 B | 201 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/providers/simulator.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/providers/simulator.py) | 7,096 B | 143 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |
| [`backend/app/agent/tools/registry.py`](file:///d:/Projects/Python/wb-agent/backend/app/agent/tools/registry.py) | 10,132 B | 232 | `ACTIVE / CORE AGENT` | EDITH cognitive agent logic, orchestration, and intent recognition. |

---

## 3. Backend: AI Router & Model Layer (8 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/ai/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/__init__.py) | 946 B | 38 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/chains.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/chains.py) | 4,856 B | 109 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/circuit_breaker.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/circuit_breaker.py) | 3,898 B | 104 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/client.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/client.py) | 16,164 B | 357 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/gemini_audio.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/gemini_audio.py) | 3,748 B | 95 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/pricing_validator.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/pricing_validator.py) | 12,395 B | 256 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/router.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/router.py) | 74,662 B | 1,539 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |
| [`backend/app/ai/types.py`](file:///d:/Projects/Python/wb-agent/backend/app/ai/types.py) | 4,810 B | 140 | `ACTIVE / AI LAYER` | AI router, circuit breakers, model client adapters, and safety checks. |

---

## 4. Backend: Versioned REST & WebSocket APIs (29 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/api/dependencies.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/dependencies.py) | 2,346 B | 72 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/middleware.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/middleware.py) | 2,008 B | 54 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/agent.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/agent.py) | 3,088 B | 89 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/analytics.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/analytics.py) | 8,250 B | 219 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/audio.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/audio.py) | 3,034 B | 93 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/auth.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/auth.py) | 1,883 B | 63 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/brain.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/brain.py) | 53,883 B | 1,240 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/campaigns.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/campaigns.py) | 19,417 B | 499 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/conversations.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/conversations.py) | 22,217 B | 581 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/edith_activity.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/edith_activity.py) | 11,397 B | 296 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/friday_actions.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/friday_actions.py) | 4,043 B | 106 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/handoffs.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/handoffs.py) | 2,194 B | 75 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/health.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/health.py) | 1,081 B | 35 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/invoices.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/invoices.py) | 8,251 B | 248 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/knowledge.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/knowledge.py) | 30,526 B | 700 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/leads.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/leads.py) | 5,108 B | 158 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/notifications.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/notifications.py) | 6,222 B | 191 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/orders.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/orders.py) | 10,417 B | 273 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/products.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/products.py) | 16,369 B | 449 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/prompts.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/prompts.py) | 32,789 B | 909 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/proposals.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/proposals.py) | 2,777 B | 88 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/quotes.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/quotes.py) | 10,134 B | 305 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/settings.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/settings.py) | 16,322 B | 401 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/system.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/system.py) | 4,024 B | 121 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/voice.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/voice.py) | 21,055 B | 538 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/watchdog.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/watchdog.py) | 3,381 B | 94 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/webhooks.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/webhooks.py) | 13,201 B | 297 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/whatsapp.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/whatsapp.py) | 8,169 B | 210 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |
| [`backend/app/api/routes/ws.py`](file:///d:/Projects/Python/wb-agent/backend/app/api/routes/ws.py) | 1,207 B | 37 | `ACTIVE / API` | FastAPI versioned endpoint route or request dependency. |

---

## 5. Backend: Dual Brain (FRIDAY & EDITH InterBrainBus) (3 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/brain/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/brain/__init__.py) | 297 B | 18 | `ACTIVE / DUAL BRAIN` | Inter-Brain Synaptic Bus (FRIDAY & EDITH) and self-inspection engine. |
| [`backend/app/brain/code_service.py`](file:///d:/Projects/Python/wb-agent/backend/app/brain/code_service.py) | 10,813 B | 292 | `ACTIVE / DUAL BRAIN` | Inter-Brain Synaptic Bus (FRIDAY & EDITH) and self-inspection engine. |
| [`backend/app/brain/inter_brain_bus.py`](file:///d:/Projects/Python/wb-agent/backend/app/brain/inter_brain_bus.py) | 177,070 B | 3,514 | `ACTIVE / DUAL BRAIN` | Inter-Brain Synaptic Bus (FRIDAY & EDITH) and self-inspection engine. |

---

## 6. Backend: Database Models & Session Management (22 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/database/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/__init__.py) | 95 B | 4 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/base.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/base.py) | 2,033 B | 78 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/session.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/session.py) | 5,104 B | 161 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/migrations/migrate_to_dynamic_prompt_sections.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/migrations/migrate_to_dynamic_prompt_sections.py) | 9,655 B | 223 | `MIGRATION` | Database schema migration or data backfill. |
| [`backend/app/database/migrations/migrate_to_knowledge_items.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/migrations/migrate_to_knowledge_items.py) | 11,421 B | 267 | `MIGRATION` | Database schema migration or data backfill. |
| [`backend/app/database/models/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/__init__.py) | 2,617 B | 105 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/agent_audit.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/agent_audit.py) | 10,800 B | 227 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/campaign_followup.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/campaign_followup.py) | 7,257 B | 142 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/conversation.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/conversation.py) | 6,837 B | 139 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/inter_brain.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/inter_brain.py) | 2,016 B | 39 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/knowledge.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/knowledge.py) | 2,942 B | 66 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/knowledge_item.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/knowledge_item.py) | 3,775 B | 77 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/knowledge_request.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/knowledge_request.py) | 5,049 B | 101 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/lead_customer.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/lead_customer.py) | 7,751 B | 158 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/learning.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/learning.py) | 1,562 B | 33 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/notification.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/notification.py) | 1,810 B | 38 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/order.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/order.py) | 6,661 B | 155 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/organization.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/organization.py) | 2,769 B | 65 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/product_pricing.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/product_pricing.py) | 8,061 B | 195 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/prompt_section.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/prompt_section.py) | 1,957 B | 44 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/prompt_version.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/prompt_version.py) | 2,251 B | 47 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |
| [`backend/app/database/models/watchdog.py`](file:///d:/Projects/Python/wb-agent/backend/app/database/models/watchdog.py) | 1,934 B | 39 | `ACTIVE / PERSISTENCE` | SQLAlchemy model definition, session manager, or base class. |

---

## 7. Backend: Durable Queue & Background Workers (6 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/jobs/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/__init__.py) | 291 B | 10 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |
| [`backend/app/jobs/queue.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/queue.py) | 3,790 B | 121 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |
| [`backend/app/jobs/registry.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/registry.py) | 889 B | 26 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |
| [`backend/app/jobs/worker.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/worker.py) | 2,604 B | 78 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |
| [`backend/app/jobs/handlers/background_analysis.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/handlers/background_analysis.py) | 6,382 B | 146 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |
| [`backend/app/jobs/handlers/messages.py`](file:///d:/Projects/Python/wb-agent/backend/app/jobs/handlers/messages.py) | 1,443 B | 43 | `ACTIVE / WORKER` | Durable background queue, worker daemon, and job handlers. |

---

## 8. Backend: Business Domains (Pricing, Followups, Audio, Knowledge, WhatsApp) (84 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/app/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/__init__.py) | 85 B | 6 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/cli.py`](file:///d:/Projects/Python/wb-agent/backend/app/cli.py) | 9,771 B | 232 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/config.py`](file:///d:/Projects/Python/wb-agent/backend/app/config.py) | 7,274 B | 192 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/main.py`](file:///d:/Projects/Python/wb-agent/backend/app/main.py) | 5,866 B | 169 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/assets/edith-master.png`](file:///d:/Projects/Python/wb-agent/backend/app/assets/edith-master.png) | 1,570,960 B | 11,795 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/assets/logo-icon.png`](file:///d:/Projects/Python/wb-agent/backend/app/assets/logo-icon.png) | 260,194 B | 2,363 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/assets/logo.png`](file:///d:/Projects/Python/wb-agent/backend/app/assets/logo.png) | 1,570,960 B | 11,795 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/audio/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/audio/__init__.py) | 97 B | 4 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/audio/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/audio/service.py) | 3,168 B | 87 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/audit/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/audit/__init__.py) | 142 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/audit/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/audit/service.py) | 1,295 B | 45 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/auth/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/auth/__init__.py) | 439 B | 17 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/auth/api_keys.py`](file:///d:/Projects/Python/wb-agent/backend/app/auth/api_keys.py) | 721 B | 27 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/auth/passwords.py`](file:///d:/Projects/Python/wb-agent/backend/app/auth/passwords.py) | 662 B | 24 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/auth/tokens.py`](file:///d:/Projects/Python/wb-agent/backend/app/auth/tokens.py) | 1,029 B | 38 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/conversations/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/conversations/__init__.py) | 396 B | 15 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/conversations/context.py`](file:///d:/Projects/Python/wb-agent/backend/app/conversations/context.py) | 3,861 B | 106 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/conversations/locking.py`](file:///d:/Projects/Python/wb-agent/backend/app/conversations/locking.py) | 2,945 B | 92 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/conversations/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/conversations/service.py) | 15,621 B | 396 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/followups/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/followups/__init__.py) | 189 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/followups/scheduler.py`](file:///d:/Projects/Python/wb-agent/backend/app/followups/scheduler.py) | 11,358 B | 272 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/handoffs/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/handoffs/__init__.py) | 170 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/handoffs/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/handoffs/service.py) | 3,750 B | 112 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/__init__.py) | 756 B | 26 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/chunker.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/chunker.py) | 3,162 B | 100 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/embeddings.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/embeddings.py) | 4,869 B | 143 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/ingestion.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/ingestion.py) | 11,373 B | 283 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/parser.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/parser.py) | 16,935 B | 414 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/retrieval.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/retrieval.py) | 5,386 B | 146 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/knowledge/unknown_manager.py`](file:///d:/Projects/Python/wb-agent/backend/app/knowledge/unknown_manager.py) | 5,126 B | 127 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/__init__.py) | 674 B | 23 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/deduplicator.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/deduplicator.py) | 1,740 B | 56 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/importer.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/importer.py) | 6,274 B | 163 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/normalizer.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/normalizer.py) | 2,643 B | 74 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/proposal_generator.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/proposal_generator.py) | 7,731 B | 177 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/validator.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/validator.py) | 1,568 B | 47 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/sources/apify.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/sources/apify.py) | 4,088 B | 110 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/sources/base.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/sources/base.py) | 491 B | 20 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/leads/sources/csv.py`](file:///d:/Projects/Python/wb-agent/backend/app/leads/sources/csv.py) | 3,362 B | 104 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/memory/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/memory/__init__.py) | 269 B | 9 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/memory/conversation.py`](file:///d:/Projects/Python/wb-agent/backend/app/memory/conversation.py) | 2,777 B | 81 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/memory/customer.py`](file:///d:/Projects/Python/wb-agent/backend/app/memory/customer.py) | 4,409 B | 131 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/notifications/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/notifications/__init__.py) | 178 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/notifications/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/notifications/service.py) | 2,906 B | 94 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/pricing/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/pricing/__init__.py) | 477 B | 21 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/pricing/calculator.py`](file:///d:/Projects/Python/wb-agent/backend/app/pricing/calculator.py) | 7,339 B | 159 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/pricing/currency.py`](file:///d:/Projects/Python/wb-agent/backend/app/pricing/currency.py) | 3,167 B | 92 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/pricing/rules.py`](file:///d:/Projects/Python/wb-agent/backend/app/pricing/rules.py) | 2,674 B | 70 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/products/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/products/__init__.py) | 217 B | 9 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/products/catalog.py`](file:///d:/Projects/Python/wb-agent/backend/app/products/catalog.py) | 9,413 B | 170 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/products/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/products/service.py) | 2,793 B | 83 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/realtime/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/realtime/__init__.py) | 210 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/realtime/connection_manager.py`](file:///d:/Projects/Python/wb-agent/backend/app/realtime/connection_manager.py) | 2,348 B | 64 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/__init__.py) | 1,658 B | 73 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/agent.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/agent.py) | 2,660 B | 75 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/campaigns.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/campaigns.py) | 7,024 B | 181 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/common.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/common.py) | 1,362 B | 58 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/conversations.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/conversations.py) | 1,797 B | 64 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/leads.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/leads.py) | 2,893 B | 91 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/schemas/products.py`](file:///d:/Projects/Python/wb-agent/backend/app/schemas/products.py) | 3,159 B | 100 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/security/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/security/__init__.py) | 450 B | 20 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/security/rate_limiter.py`](file:///d:/Projects/Python/wb-agent/backend/app/security/rate_limiter.py) | 1,692 B | 53 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/security/sanitizer.py`](file:///d:/Projects/Python/wb-agent/backend/app/security/sanitizer.py) | 1,429 B | 49 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/__init__.py) | 51 B | 4 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/campaign_drafting.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/campaign_drafting.py) | 11,331 B | 272 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/campaign_engine.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/campaign_engine.py) | 18,069 B | 505 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/friday_actions.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/friday_actions.py) | 54,867 B | 1,210 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/friday_report_service.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/friday_report_service.py) | 12,647 B | 309 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/services/invoice_generator.py`](file:///d:/Projects/Python/wb-agent/backend/app/services/invoice_generator.py) | 29,765 B | 762 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/utils/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/utils/__init__.py) | 562 B | 24 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/utils/logging.py`](file:///d:/Projects/Python/wb-agent/backend/app/utils/logging.py) | 3,851 B | 117 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/utils/phone.py`](file:///d:/Projects/Python/wb-agent/backend/app/utils/phone.py) | 6,389 B | 198 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/utils/rate_limiter.py`](file:///d:/Projects/Python/wb-agent/backend/app/utils/rate_limiter.py) | 2,472 B | 73 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/watchdog/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/watchdog/__init__.py) | 144 B | 8 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/watchdog/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/watchdog/service.py) | 18,177 B | 424 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/__init__.py) | 604 B | 19 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/base.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/base.py) | 1,814 B | 61 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/models.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/models.py) | 1,123 B | 35 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/owner_commands.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/owner_commands.py) | 11,144 B | 237 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/security.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/security.py) | 2,503 B | 75 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/service.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/service.py) | 2,727 B | 64 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/providers/bridge.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/providers/bridge.py) | 6,765 B | 160 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/providers/meta_cloud.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/providers/meta_cloud.py) | 12,205 B | 290 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |
| [`backend/app/whatsapp/providers/simulator.py`](file:///d:/Projects/Python/wb-agent/backend/app/whatsapp/providers/simulator.py) | 6,606 B | 178 | `ACTIVE / BACKEND` | Backend business service, utility, or domain logic. |

---

## 9. Backend: Test Suites (E2E, Unit, Evaluators) (59 files)

| File Path | Size | Lines | Operational Status | Functional Purpose & Relationships |
| :--- | :--- | :--- | :--- | :--- |
| [`backend/tests/test_edith_sales_pipeline.py`](file:///d:/Projects/Python/wb-agent/backend/tests/test_edith_sales_pipeline.py) | 3,016 B | 75 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/__init__.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/__init__.py) | 185 B | 5 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/conftest.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/conftest.py) | 19,517 B | 552 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_analytics.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_analytics.py) | 8,774 B | 243 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_audio.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_audio.py) | 8,135 B | 203 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_campaigns.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_campaigns.py) | 6,835 B | 206 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_invoicing.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_invoicing.py) | 13,661 B | 418 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_realtime.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_realtime.py) | 9,073 B | 263 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/e2e/test_e2e_scenarios.py`](file:///d:/Projects/Python/wb-agent/backend/tests/e2e/test_e2e_scenarios.py) | 17,814 B | 486 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/evaluation/test_adversarial_safety.py`](file:///d:/Projects/Python/wb-agent/backend/tests/evaluation/test_adversarial_safety.py) | 3,824 B | 106 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/evaluation/test_multiturn_personas.py`](file:///d:/Projects/Python/wb-agent/backend/tests/evaluation/test_multiturn_personas.py) | 5,946 B | 182 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/conftest.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/conftest.py) | 758 B | 22 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_agent_orchestrator.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_agent_orchestrator.py) | 6,840 B | 199 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_agentic_update_chat.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_agentic_update_chat.py) | 6,465 B | 168 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_ai_router.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_ai_router.py) | 8,074 B | 227 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_api_endpoints.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_api_endpoints.py) | 6,116 B | 188 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_campaigns_and_agentic_flow.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_campaigns_and_agentic_flow.py) | 7,134 B | 211 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_cli.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_cli.py) | 1,890 B | 54 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_config_and_utils.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_config_and_utils.py) | 3,585 B | 105 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_conversations_and_memory.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_conversations_and_memory.py) | 7,626 B | 214 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_conversations_extended.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_conversations_extended.py) | 10,797 B | 305 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_currency.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_currency.py) | 1,534 B | 50 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_database_session.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_database_session.py) | 1,021 B | 33 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_db_backup.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_db_backup.py) | 1,724 B | 54 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_edith_v2_features.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_edith_v2_features.py) | 10,241 B | 286 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_followups_and_handoffs.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_followups_and_handoffs.py) | 5,310 B | 157 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_friday_reporting.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_friday_reporting.py) | 8,774 B | 241 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_greetings.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_greetings.py) | 1,354 B | 38 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_group_messages.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_group_messages.py) | 10,753 B | 274 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_inter_brain.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_inter_brain.py) | 14,100 B | 394 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_invoices.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_invoices.py) | 18,708 B | 481 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_knowledge_hub.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_knowledge_hub.py) | 5,253 B | 133 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_knowledge_migration.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_knowledge_migration.py) | 5,775 B | 166 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_knowledge_rag.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_knowledge_rag.py) | 4,605 B | 111 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_leads_export.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_leads_export.py) | 569 B | 19 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_leads_pipeline.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_leads_pipeline.py) | 4,637 B | 138 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_middleware.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_middleware.py) | 1,651 B | 51 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_models.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_models.py) | 5,911 B | 215 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_notifications.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_notifications.py) | 2,796 B | 79 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_phone_utils.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_phone_utils.py) | 2,612 B | 77 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_pricing_engine.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_pricing_engine.py) | 6,748 B | 197 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_pricing_validator.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_pricing_validator.py) | 7,442 B | 243 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_prompt_architect.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_prompt_architect.py) | 6,167 B | 151 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_prompts_and_versioning.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_prompts_and_versioning.py) | 5,380 B | 146 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_quotes_and_lifecycle.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_quotes_and_lifecycle.py) | 5,294 B | 153 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_rate_limiter.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_rate_limiter.py) | 1,422 B | 42 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_realtime.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_realtime.py) | 1,113 B | 44 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_sales_and_jobs.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_sales_and_jobs.py) | 4,061 B | 114 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_schema_migration.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_schema_migration.py) | 1,497 B | 50 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_schemas.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_schemas.py) | 2,296 B | 69 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_schemas_common.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_schemas_common.py) | 1,124 B | 40 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_security_and_audit.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_security_and_audit.py) | 3,156 B | 94 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_sentiment.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_sentiment.py) | 1,357 B | 36 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_system_routes.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_system_routes.py) | 1,476 B | 54 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_voice_token.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_voice_token.py) | 2,004 B | 56 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_voice_workflows.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_voice_workflows.py) | 3,782 B | 101 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_watchdog.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_watchdog.py) | 8,835 B | 263 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_whatsapp_providers.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_whatsapp_providers.py) | 3,698 B | 105 | `TEST / QA` | Automated test suite or verification harness. |
| [`backend/tests/unit/test_whatsapp_security.py`](file:///d:/Projects/Python/wb-agent/backend/tests/unit/test_whatsapp_security.py) | 2,224 B | 70 | `TEST / QA` | Automated test suite or verification harness. |

---
