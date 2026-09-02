# ADR-001: Why PostgreSQL instead of SQLite as Primary Production Storage

## Status
Accepted

## Context
WB-Agent is an autonomous AI sales agent operating system handling concurrent inbound customer messages, asynchronous follow-ups, lead ingestion pipelines, audit trails, and vector embeddings for semantic document retrieval. We need a robust relational database engine that supports high-concurrency transactions, transactional queues (`FOR UPDATE SKIP LOCKED`), native vector search (`pgvector`), JSONB querying, and multi-tenant scoping.

## Decision
We select **PostgreSQL** (version 16+) with the `pgvector` extension as the primary production database architecture.
To enable lightweight, zero-dependency unit tests and developer onboarding when Docker or PostgreSQL services are warming up or unavailable on host environments, the SQLAlchemy abstraction layer is designed to gracefully support in-memory SQLite and a vector fallback for unit tests without modifying core domain logic.

## Consequences
### Positive
- Native vector indexing (IVFFlat/HNSW) inside the same ACID-compliant transactional boundary.
- Atomic row-locking with `SKIP LOCKED` powering resilient distributed worker queues.
- Robust JSONB indexing for customer memories, tool calls, and structured decision traces.
- Seamless upgrade path to managed PostgreSQL (AWS RDS, GCP Cloud SQL, Supabase, Neon).

### Negative
- Requires a running PostgreSQL instance in production/staging environments (orchestrated via Docker Compose).
