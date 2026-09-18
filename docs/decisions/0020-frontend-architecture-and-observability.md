# ADR 0020: Frontend Architecture, Real-Time Polling and Dashboard Observability

## Status
Accepted

## Date
2026-09-18

## Context
Operating an autonomous AI sales agent requires high-fidelity, real-time observability from the web dashboard:
1. **Operator Awareness**: Operators must immediately know if the WhatsApp bridge is disconnected, QR authentication is pending, or database latency is degraded.
2. **Actionable Triage**: Commercial teams need quick copy-to-clipboard actions, CSV export capabilities for CRM integration, and clear visual indicators for lead qualification.
3. **Responsive Worldwide Access**: The interface must adapt across desktop and mobile devices worldwide, with lightweight dependencies and fast initial page loads.

## Decisions

### 1. Unified Health Badge & Polling
Implemented `SystemHealthBadge` in `dashboard/components/SystemHealthBadge.tsx`, polling `/api/v1/system/info` and `/api/v1/health` every 15 seconds to display live connection state (Online, Degraded, Offline) with detailed tooltip telemetry (platform OS, uptime, AI model, provider mode).

### 2. Micro-Interaction Utilities
Created lightweight, zero-dependency reusable UI components:
- `CopyToClipboard`: Provides immediate visual confirmation (checkmark & toast) when copying quote IDs, lead phone numbers, or webhook URLs.
- `EmptyState`: Standardized placeholder illustrating empty tables with clear calls to action.
- `ExportCsvButton`: Triggers direct browser downloads for leads, orders, and quotes.

### 3. Progressive Modern Next.js Architecture
Utilizes Next.js 14 App Router with Tailwind CSS, Lucide icons, and server/client boundary separation to ensure fast rendering worldwide without bloated client bundles.

## Consequences
- Operators gain sub-second operational clarity on autonomous agent state.
- Frictionless export and sharing of commercial quotes and lead pipelines.
- Smooth responsive experience across international bandwidth profiles.
