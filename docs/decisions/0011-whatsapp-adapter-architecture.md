# ADR-011: WhatsApp Adapter Architecture: Simulator vs Meta Cloud API

## Status
Accepted

## Context
Production WhatsApp messaging relies on Meta's Cloud API (Graph API v20.0+), requiring Meta Business verification, webhook certificates, and approved message templates. Running automated tests or local development against live Meta endpoints is slow, expensive, and fragile.

## Decision
We implement a **Dual-Mode Adapter Architecture**:
1. `SimulatorWhatsAppProvider`: A high-fidelity local simulator that stores outbound messages, simulates delivery/read receipts, triggers inbound replies, supports simulated network jitter/failures, and exposes REST endpoints for manual and automated simulation.
2. `MetaCloudWhatsAppProvider`: A production-grade adapter adhering strictly to official Meta Graph API v20.0 specifications, including HMAC-SHA256 webhook signature verification, template message payloads, interactive buttons/lists, and error code mappings.
3. Both adapters implement the identical `WhatsAppProvider` protocol.

## Consequences
### Positive
- Offline, deterministic testing of the complete sales agent lifecycle.
- Zero mock leakage into the domain or agent layer.
- Drop-in switch to live Meta Cloud API simply by configuring credentials in `.env`.
