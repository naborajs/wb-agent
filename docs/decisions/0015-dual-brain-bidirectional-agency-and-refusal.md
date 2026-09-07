# ADR 0015: Dual-Brain Bidirectional Agency, Refusal Rights & Autonomous Fallback

## Status
Accepted

## Context
Standard agentic systems either operate in isolation or follow rigid, master-slave command patterns where one model unconditionally executes whatever the other dictates. In complex B2B commerce, personal executive web copilot duties (FRIDAY / Google Gemini 3.1 Flash Live) and autonomous commercial sales & margin defense duties (EDITH / NVIDIA NIM) require independent judgment, specialized guardrails, and non-blocking fallback mechanisms.

## Decision
We engineered an autonomous bidirectional collaboration and refusal protocol over the `InterBrainMessage` bus:
1. **Bidirectional Delegation**: Either brain can delegate tasks to the other (`Friday -> dispatch_task` and `EDITH -> edith_request_friday`).
2. **Independent Refusal Authority**: Each brain evaluates incoming delegations against its domain guardrails:
   - EDITH denies requests violating commercial margin ceilings (e.g. >15.0% discounts) or customer anti-spam cooling periods.
   - Friday denies non-critical audio/voice interruptions when the operator is in dashboard focus mode.
3. **Autonomous Fallback Execution**: When a delegation is refused, the originating brain does not fail or hang. It autonomously activates a localized fallback:
   - For example, if Friday declines audio interruption, EDITH dispatches a direct high-priority `AgentNotification` to the operator's Notification Center and WhatsApp audit trail.
4. **Mutual Background Cognition**: During idle periods, both brains execute synchronized background thinking cycles (`run_background_thinking_cycle`), auditing catalog pricing drift, lead pipelines, and bus latency.
5. **Real-Time Telemetry & Visual Stream**:
   - Pinned **Live Synaptic Stream Ticker** directly below the Hero Bus on the dashboard for real-time visibility.
   - 24-Hour Inbound Traffic Velocity & Autonomous Resolution Heatmap visualizing peak surge periods and flatline 1.1s turn latency.

## Consequences
- Prevents cascading failures and command deadlock across AI models.
- Guarantees commercial margin boundaries and protects human operator focus.
- Provides complete operational transparency with persistent SQLite audit logging.
