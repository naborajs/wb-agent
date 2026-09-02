# ADR-003: Database-Backed Job Queue with SKIP LOCKED

## Status
Accepted

## Context
WB-Agent requires reliable background task execution for processing inbound customer messages, scheduling follow-ups, ingesting knowledge documents, importing leads, and delivering notifications. Introducing Celery with RabbitMQ or Redis adds multiple moving parts to local and production setups.

## Decision
We implement a **Durable Database-Backed Queue** inside PostgreSQL using row-level locking via `SELECT ... FOR UPDATE SKIP LOCKED`.
Jobs are stored in a dedicated `jobs` table supporting states: `pending`, `running`, `completed`, `retrying`, `failed`, `dead_letter`, and `cancelled`.
Workers poll the table using indexed queries (`status = 'pending' AND run_at <= NOW() ORDER BY priority DESC, run_at ASC`).

## Consequences
### Positive
- Fully transactional: enqueueing a job can happen within the same ACID transaction as creating a message or lead.
- Zero extra operational infrastructure (no Redis or RabbitMQ container required).
- Resilient to worker crashes: locked jobs with expired heartbeats can be re-queued automatically.
- Auditable: complete history of task execution, attempts, and error logs stored directly in the database.

### Negative
- Database polling introduces minor query load, mitigated by configurable sleep/poll intervals (1.0s) and index optimization.
