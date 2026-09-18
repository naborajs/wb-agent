# ADR 0021: Multi-Currency Pricing Architecture and Internationalization Strategy

## Status
Accepted

## Date
2026-09-18

## Context
WB-Agent is designed to scale from domestic Indian wholesale commerce to worldwide international B2B tea and agricultural export trade (serving buyers across the UAE, Singapore, the United Kingdom, Europe, and the United States).
Cross-border commerce presents specific operational challenges:
1. **Currency Friction**: International wholesale buyers require quotes in their primary trade currencies (USD, EUR, GBP, AED, SGD) rather than INR.
2. **Numbering Systems**: Domestic Indian commercial buyers expect Indian numbering (e.g. ₹1,50,000.00), while international buyers expect standard thousands separators (e.g. $150,000.00).
3. **Conversational Pacing & Timezones**: Automated outreach during incompatible local buyer hours can appear robotic or intrusive.

## Decisions

### 1. Base Currency Anchor Architecture
Implemented `convert_currency` in `backend/app/pricing/currency.py`. All catalog base prices and margin safety floors are anchored in the merchant's operational currency (`INR`). Conversions to foreign trade currencies are computed deterministically using standard exchange rates, ensuring minimum margins are never breached.

### 2. Contextual Number Formatting
Implemented `format_international_currency` which applies Indian two-digit comma grouping for INR amounts and standard three-digit thousand groupings for international currencies (`USD`, `EUR`, `GBP`, `AED`, `SGD`).

### 3. Timezone-Aware Greeting Intelligence
Added `backend/app/agent/greetings.py` providing `get_time_of_day_greeting` and `generate_personalized_salutation` to adapt opening greetings (Good morning / afternoon / evening) to the buyer's local time-of-day.

### 4. Interactive Dashboard Currency Toggle
Added `dashboard/components/CurrencySelector.tsx` enabling dashboard operators to toggle and persist display currencies across quotes and order tables via `localStorage`.

## Consequences
- Unlocks worldwide cross-border sales capabilities for WB-Agent.
- Eliminates manual currency calculation errors for sales agents.
- Maintains single source-of-truth pricing rules in the backend catalog.
