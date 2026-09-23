# ADR-008: Human Handoff and Takeover Race Condition Prevention

## Status
Accepted

## Context
When a human operator clicks "Take Over" in the live inbox, an AI worker might concurrently be in the middle of generating a response for the same customer. If the AI finishes and sends a WhatsApp message after the operator has taken over, it confuses the customer and breaks operator control.

## Decision
We implement **Atomic Conversation Mode Checking**:
1. Conversation mode transitions between: `AI`, `HUMAN`, `PAUSED`, `CLOSED`.
2. Human takeover sets mode to `HUMAN` within an atomic database transaction.
3. The outbound delivery layer performs a **pre-send state check**: right before calling `WhatsAppProvider.send_message()`, the worker re-verifies that `conversation.mode == 'AI'` and `conversation.is_paused == False`.
4. If the mode has changed to `HUMAN` or `PAUSED`, the generated AI response is discarded, logged as aborted, and never sent to WhatsApp.

## Consequences
### Positive
- Completely eliminates human-AI sending race conditions.
- Operators maintain absolute authority over the conversation at all times.
