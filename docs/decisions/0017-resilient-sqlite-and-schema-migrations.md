# ADR 0017: Resilient SQLite Connection Management, Vacuuming and Schema Migration Strategy

## Status
Accepted

## Date
2026-09-18

## Context
WB-Agent is architected for dual deployment models:
1. **Enterprise / Cloud**: Scaled PostgreSQL with `pgvector` for distributed embeddings, high concurrency, and multi-worker clusters.
2. **Edge / Local / Single-Node**: Standalone SQLite via `aiosqlite` for lightweight environments, single-box virtual machines, and development testing without requiring PostgreSQL installation.

In SQLite deployments, schema evolution (adding columns or refactoring legacy column names like `tea_grade` -> `grade` or `quantity_kg` -> `quantity`) and database bloat from high-volume WhatsApp chat turns can degrade performance or cause `OperationalError` when column definitions diverge.

## Decisions

### 1. Embedded Schema Migration Utility
We implemented `backend/scripts/upgrade_sqlite_schema.py` which dynamically inspects SQLite PRAGMA table info and applies idempotent `ALTER TABLE ADD COLUMN` queries with backfill logic for:
- `order_items`: adds `grade`, `quantity`, and `unit_price`, copying legacy values from `tea_grade`, `quantity_kg`, and `unit_price_per_kg`.
- `pricing_rules`: adds `min_quantity`, `max_quantity`, and `fixed_price`.
- `products` & `product_variants`: ensures universal catalog column compatibility.

### 2. Lock-Free Online Backup Snapshots
Using SQLite's native C-level Online Backup API (`source_conn.backup(dest_conn)` via Python's standard `sqlite3` driver in `scripts/backup_db.py`), snapshots are copied page-by-page without acquiring exclusive database table locks, ensuring continuous agent read/write operations during backup creation.

### 3. Automated Maintenance & VACUUM Endpoint
Exposed `POST /api/v1/system/vacuum` and CLI script `scripts/optimize_db.py` to trigger `PRAGMA integrity_check`, `PRAGMA optimize`, and `VACUUM` in non-blocking worker threads, reporting reclaimed bytes and disk metrics.

## Consequences
- Single-command recovery and automated self-healing for legacy databases.
- Predictable performance on local and single-node edge instances.
- Zero external database dependencies required for development and lightweight onboarding.
