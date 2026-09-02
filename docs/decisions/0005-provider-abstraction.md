# ADR-005: Provider Abstraction for WhatsApp and LLMs

## Status
Accepted

## Context
WB-Agent operates over WhatsApp and uses advanced LLMs for conversational selling. In development and testing, live Meta Cloud API and NVIDIA Nemotron accounts may not be immediately available or suitable for high-frequency test suites. Hard-coding provider SDK calls leaks external dependencies into core business logic.

## Decision
We implement strict **Provider Abstractions**:
1. **WhatsApp Provider Interface (`WhatsAppProvider`)**:
   - Methods: `send_message`, `send_template`, `send_media`, `mark_read`, `get_message_status`, `parse_webhook`, `verify_webhook`, `health_check`.
   - Implementations: `SimulatorWhatsAppProvider` (in-memory/db stateful simulation), `DevelopmentWhatsAppProvider` (local relay), and `MetaCloudWhatsAppProvider` (official Meta Graph API v20.0).
2. **LLM Provider Interface (`LLMProvider`)**:
   - Methods: `generate_response`, `generate_embeddings`, `health_check`.
   - Router: `LLMRouter` routes to `NvidiaProvider` (Nemotron), with structured fallback to simulator or secondary configured providers.

## Consequences
### Positive
- Total decoupling: business logic never imports Meta or NVIDIA specific SDKs directly.
- Full testability in offline and CI environments via high-fidelity simulators.
- Seamless provider switching via simple configuration changes.
