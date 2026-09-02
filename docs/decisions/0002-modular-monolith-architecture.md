# ADR-002: Modular Monolith instead of Microservices

## Status
Accepted

## Context
The platform supports lead ingestion, customer memory, conversational selling, deterministic pricing, vector RAG, follow-up scheduling, and human handoff. In early stages and target workloads (1,000–1,500 leads/day), distributed microservices introduce operational complexity (network latency, distributed transactions, out-of-sync schemas, multiple deployments).

## Decision
We architect WB-Agent as a **Modular Monolith** in Python (FastAPI + SQLAlchemy + Asyncio Workers).
Internal subsystems (e.g., `leads`, `pricing`, `knowledge`, `agent`, `conversations`, `whatsapp`, `jobs`) are structured as isolated Python packages with strictly typed interfaces and dedicated database models.
The Next.js dashboard communicates over clean, versioned REST and WebSocket APIs (`/api/v1`).

## Consequences
### Positive
- Single deployable repository with rapid local development.
- In-process call performance, single transactional boundaries where needed.
- No network overhead or complex service mesh required.
- Easy to extract individual modules (e.g. vector worker or WhatsApp gateway) into dedicated microservices in the future if scale warrants.

### Negative
- All backend code lives in the same runtime repository, requiring disciplined code reviews and modular boundary enforcement.
