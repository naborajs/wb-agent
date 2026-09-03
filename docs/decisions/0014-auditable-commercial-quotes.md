# ADR 0014: Auditable Commercial Pricing Quotes & Lifecycle

## Status
Accepted

## Context
In wholesale and B2B transactions, pricing cannot simply exist as ephemeral text messages in a chat thread. Commercial deals require auditable quote numbers, timestamped validity windows, verified line items with explicit volume tier discounts, and status progression (`DRAFT` → `SENT` → `ACCEPTED` → `EXPIRED` / `REJECTED`).

## Decision
We introduced dedicated `Quote` and `QuoteItem` domain entities:
1. Every formal price quote is generated deterministically by `PricingService`, enforcing catalog base rates, volume discount tiers, and customer segment adjustments.
2. Each quote receives a unique identifier (e.g., `QTE-260903-123`), customer linkage, conversation linkage, and explicit expiration date (`valid_until`).
3. Outbound chat references the quote number, and operators can track acceptance or convert accepted quotes directly to wholesale orders.

## Consequences
- Guarantees pricing reproducibility and financial audit integrity.
- Eliminates customer disputes regarding pricing commitments made during automated conversations.
