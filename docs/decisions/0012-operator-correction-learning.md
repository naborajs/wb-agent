# ADR 0012: Operator Correction & Human-in-the-Loop Learning Pipeline

## Status
Accepted

## Context
When an autonomous AI sales agent operates in commercial B2B conversations, occasional misalignments occur—such as quoting an outdated price, using an overly informal tone, missing prior conversation context, or promising an unverified delivery schedule. Without a structured feedback mechanism, operators must either intervene manually without the agent learning, or manually edit prompts.

## Decision
We implemented a first-class "Report & Correct" feedback loop:
1. Operators can report any AI response bubble in the Live Inbox with a standardized category (`wrong_price`, `wrong_info`, `wrong_tone`, `missed_context`, `repeated_question`, `unauthorized_claim`).
2. An auditable `SalesLearning` record is generated with topic, explanation, and ideal corrected text.
3. If flagged as verified business truth, a `KnowledgeCandidate` is staged with `status = "PENDING"` for operator review before entering permanent business documentation.
4. The reported message is tagged in real time with visual indicators in the Live Inbox.

## Consequences
- Protects customer trust by allowing rapid operator corrections.
- Provides a high-fidelity dataset of real conversational errors for periodic prompt evaluation.
- Prevents rogue knowledge mutation: knowledge candidates must be explicitly reviewed before promotion to permanent business policies.
