# ADR-004: Conversation Concurrency and Turn-Locking Strategy

## Status
Accepted

## Context
When multiple inbound customer messages arrive in rapid succession (e.g. "Hi", "what is the price", "for 100kg?"), parallel execution by multiple workers could lead to race conditions, out-of-order responses, or hallucinated disjointed conversation states.

## Decision
We enforce a **Turn-Based Per-Conversation Locking and Debounce Model**:
1. **Per-Conversation Lock**: Each conversation turn acquires an explicit database lock or token (`locked_at`, `locked_by`) with a timeout (default 60s). Only one worker executes the AI agent decision cycle for a given conversation at any time.
2. **Rapid Message Debounce**: When an inbound message arrives, if a debounce window (default 2.5s) is active, subsequent rapid messages from the same sender are batched into the same logical conversational turn before agent invocation.
3. **Ordering**: Inbound messages are timestamped and assigned sequential indices. The agent is invoked with the fully aggregated turn.

## Consequences
### Positive
- Strict message ordering and coherent agent responses.
- Eliminates duplicate replies to rapidly split customer messages.
- Prevents split-brain state updates across concurrent workers.

### Negative
- Adds a small, natural debounce latency (2.5s) that mimics human reading/typing cadence.
