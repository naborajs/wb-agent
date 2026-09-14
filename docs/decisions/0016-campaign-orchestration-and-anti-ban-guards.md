# ADR 0016: Campaign Orchestration, Rate-Limiting Jitter & Anti-Ban Cold Outreach Guards

## Status
Accepted

## Context
Outbound B2B sales outreach via WhatsApp requires rigorous rate-limiting, compliance controls, and anti-ban safeguards. Indiscriminate bulk messaging rapidly triggers Meta carrier spam detection, leading to account suspension and brand reputation loss. Additionally, cold outreach campaigns must halt immediately upon customer opt-out or reply to prevent conversational collision with live sales agents.

## Decision
We engineered an enterprise campaign orchestration engine with multi-layered anti-ban guards:
1. **Dynamic Rate-Limiting & Jitter Bounds**:
   - Outbound dispatch enforces randomized inter-message jitter delays (default: 15s to 90s) mimicking natural operator cadence.
   - Configurable daily and hourly dispatch quotas per campaign.
2. **Deterministic Pre-Flight Stop Conditions**:
   - Outbound messages are intercepted and aborted if the lead has replied, opted out (STOP, UNSUBSCRIBE), or has an active ongoing deal.
3. **Real-Time CRM Lead Enrollment**:
   - Targeting resolves distinct customer business segments (Cafe, Restaurant, Distributor, Retail, Corporate) directly from verified database records.
   - Campaign enrollment strictly blocks launch if matching valid leads count is zero, preventing hollow executions.
4. **EDITH Observability & Telemetry**:
   - Tracks granular delivery metrics: total dispatched, delivered, read, replies received, and response rate.
   - Every outbound dispatch is logged to CampaignLead rows and real-time WebSocket telemetry.

## Consequences
- Prevents WhatsApp Business API account bans through naturalized dispatch cadence.
- Eliminates duplicate or awkward messaging when a customer is already in active dialogue.
- Provides complete auditability for outbound marketing campaigns.
