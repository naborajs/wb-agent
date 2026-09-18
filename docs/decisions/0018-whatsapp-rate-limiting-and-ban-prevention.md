# ADR 0018: WhatsApp Outbound Rate Limiting, Dead Letter Queues and Ban Prevention

## Status
Accepted

## Date
2026-09-18

## Context
Operating autonomous sales agents over WhatsApp channels (whether Meta Cloud API or Baileys Bridge) exposes the system to dual operational risks:
1. **Inbound Floods & Spoofer Attacks**: Fraudulent webhook requests or burst messaging loops from adversarial actors can exhaust worker resources.
2. **Outbound Ban Risks**: Rapid, burst outbound messages during bulk campaign outreach or rapid follow-ups can trigger Meta anti-spam heuristics, leading to number bans or account tier demotion.

## Decisions

### 1. Sliding Window Rate Limiting
Implemented `SlidingWindowRateLimiter` in `backend/app/utils/rate_limiter.py` configured via `RATE_LIMIT_WINDOW_SECONDS` and `RATE_LIMIT_MAX_REQUESTS` in `Settings`. Stale timestamps are purged automatically to prevent memory leaks during long-running worker uptime.

### 2. Cryptographic Webhook Authentication
Implemented constant-time HMAC-SHA256 signature verification (`verify_meta_signature` in `backend/app/whatsapp/security.py`) to authenticate payloads signed with the Meta Application Secret against `X-Hub-Signature-256`, mitigating timing side-channel attacks.

### 3. Strict Message Template Validation
Added `validate_whatsapp_template` to inspect template naming conventions (`^[a-z0-9_]{1,512}$`), ISO language codes, and component schema hierarchies prior to dispatch, eliminating unprocessable entity rejections from Meta Graph API.

## Consequences
- Guaranteed compliance with Meta rate limits and WhatsApp Business Messaging Policies.
- Defends autonomous workers from unbounded message queue growth.
- Protects commercial WhatsApp numbers against automated spam flags.
