# ADR-010: Local-First Architecture with Cloud-Ready Portability

## Status
Accepted

## Context
WB-Agent must be entirely operable, testable, and runnable locally on a single developer machine with zero mandatory cloud dependencies for development and automated testing, while remaining 100% production-ready for Docker, cloud PostgreSQL, and hosted deployments.

## Decision
We adopt a **Local-First Architecture**:
1. All core services (PostgreSQL, pgvector, FastAPI, Python Asyncio Worker, Next.js Dashboard) run locally.
2. Local filesystem storage (`./storage/uploads`, `./storage/knowledge`, `./storage/backups`) with abstraction interfaces for future S3/GCS migration.
3. Database engine supports both PostgreSQL (with asyncpg/psycopg and pgvector) for full integration/production, and SQLite/mock-vector for zero-friction in-memory unit tests.
4. Complete `docker-compose.yml` provides a single-command (`docker compose up`) reproducible development and production environment.

## Consequences
### Positive
- Developers can run end-to-end simulations, unit tests, and the web dashboard completely offline.
- Zero initial cloud costs or vendor lock-in.
- Smooth transition to managed services (RDS, Supabase, Vercel) when needed.
