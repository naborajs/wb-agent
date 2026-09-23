# ADR-007: Knowledge RAG Architecture and Strict Authority Priority

## Status
Accepted

## Context
In B2B wholesale commerce, giving incorrect prices, outdated shipping terms, or hallucinated product grades damages business credibility and causes financial loss. Vector RAG can retrieve conflicting or outdated document chunks.

## Decision
We enforce a strict **Knowledge Trust Hierarchy**:
1. **Priority 1 (Highest Authority)**: Active structured business rules, catalog prices, MOQ constraints, and margin bounds in PostgreSQL.
2. **Priority 2**: Approved, current unstructured knowledge documents (PDFs, Markdown, FAQs, playbooks).
3. **Priority 3**: Historical company records and verified customer memory.
4. **Priority 4 (Lowest Authority)**: LLM parametric world knowledge (permitted only for language fluency, tone, and generic conversational context).

If a retrieved unstructured document chunk conflicts with a structured pricing or MOQ rule, the structured rule prevails unconditionally. If uncertainty or conflict cannot be resolved deterministically, the agent escalates to `HUMAN_HANDOFF`.

## Consequences
### Positive
- Zero price hallucinations or unauthorized discounts.
- High factual accuracy and business safety.
- Clear audit trail linking agent responses to verified database rows or document chunk IDs.
