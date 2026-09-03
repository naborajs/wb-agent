# ADR 0013: Modular System Prompt Architecture & Versioning

## Status
Accepted

## Context
Monolithic system prompts grow unmaintainable as safety policies, sales methodology, company profiles, and tool rules evolve. A single typo in an identity update can unintentionally compromise security guardrails or price validation rules.

## Decision
We split system instructions into 5 independent, version-controlled sections:
1. `core_safety`: Non-negotiable grounding, prompt injection defenses, and authority constraints.
2. `core_identity`: EDITH persona, conversational warmth, and professional consultative demeanor.
3. `business_policy`: MOQs, pricing authority limits, payment terms, and handoff triggers.
4. `sales_style`: SPIN-style consultative discovery, objection clarification, and single-question selection.
5. `business_profile`: Tenant/brand information, catalog offerings, and value propositions.

Each section is tracked in `prompt_versions` with an immutable version number, author, change summary, and 1-click rollback capability.

## Consequences
- Operators can update sales styles or business profile details safely without touching core safety logic.
- Complete audit trail of prompt evolution.
- Instant rollback prevents regressions during production campaigns.
