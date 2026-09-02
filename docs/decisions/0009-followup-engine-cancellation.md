# ADR-009: Autonomous Follow-up Engine and Active Cancellation Logic

## Status
Accepted

## Context
Automated follow-ups (e.g. Day 0, Day 1, Day 3 outreach) can become disruptive or violate WhatsApp policies if a customer has already replied, opted out, or been transferred to a human operator. Long-running sleep threads fail across worker restarts and tie up memory.

## Decision
We implement a **Database-Backed Scheduled Follow-up System with Mandatory Pre-Dispatch Guards**:
1. Follow-up tasks are stored as scheduled records in `followup_jobs` with exact `run_at` timestamps.
2. When any inbound message is received from a customer, all pending follow-up jobs for that conversation are immediately transitioned to `cancelled` with reason `customer_replied`.
3. If a customer sends an opt-out keyword (e.g. "stop", "unsubscribe"), pending follow-ups are cancelled with reason `customer_opted_out`, and the customer record is marked `opt_in_status = False`.
4. When a follow-up job reaches its scheduled execution time, the worker evaluates a strict pre-flight check (opt-in valid, human not in control, 24h WhatsApp window compliance, daily campaign limits). If any check fails, dispatch is safely aborted.

## Consequences
### Positive
- Zero spammy or stale follow-ups sent to already-engaged leads.
- Full WhatsApp Business Messaging Policy compliance.
- Worker restarts do not lose scheduled follow-ups.
