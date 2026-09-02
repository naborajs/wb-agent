# ADR-006: Customer Memory Architecture: Structured Facts & Auditable Context

## Status
Accepted

## Context
Sales agents must remember key customer preferences, constraints, budgets, order frequencies, and past objections across conversations spanning days or weeks. Storing transcripts alone causes token bloating, latency degradation, and context-window exhaustion.

## Decision
We implement a **Structured Long-Term Customer Memory Engine**:
1. Memories are discrete key-value tuples with metadata:
   - `category`: `preferences`, `requirements`, `budget`, `location`, `company`, `role`, `product_interest`, `quantity`, `frequency`, `objections`, `buying_intent`, `communication_style`, `important_facts`.
   - `verification_status`: `CUSTOMER_SAID`, `SYSTEM_VERIFIED`, `AI_INFERRED`, `HUMAN_CONFIRMED`.
   - `confidence`: 0.0 to 1.0 float.
2. Short-term context is maintained via rolling window of recent turns + persistent `ConversationSummary`.
3. Working context injected into the agent turn combines: structured profile, verified facts, active objections, rolling turns, and concise summary.

## Consequences
### Positive
- Compact, bounded token footprint per turn.
- Auditable memory: operator can inspect, confirm, edit, or delete stored customer facts.
- Prevents hallucinated assumptions from being treated as confirmed facts.
