# REST API & WebSocket Reference

All endpoints are versioned under `/api/v1`. Interactive OpenAPI documentation is accessible at `/api/v1/docs`.

---

## 1. Authentication
- `POST /api/v1/auth/login`: Authenticates operator email & password, returns JWT token.
- `GET /api/v1/auth/me`: Returns profile of authenticated user.

## 2. Health & Telemetry
- `GET /api/v1/health`: Liveness probe.
- `GET /api/v1/readiness`: Readiness probe testing database and WhatsApp provider connectivity.

## 3. Leads Management
- `GET /api/v1/leads`: Paginated lead list with filtering by status and text query.
- `GET /api/v1/leads/{id}`: Lead details and event timeline.
- `PATCH /api/v1/leads/{id}`: Update lead score or status.
- `POST /api/v1/leads/import`: Multipart CSV upload running 10-step normalization and validation pipeline.

## 4. Live Conversations & Operator Takeover
- `GET /api/v1/conversations`: Paginated conversation inbox with status, hot flame indicator, and unread counts.
- `GET /api/v1/conversations/{id}`: Complete thread history, customer profile, and verified memories.
- `POST /api/v1/conversations/{id}/takeover`: Switches mode between `AI`, `HUMAN`, `PAUSED`, and `CLOSED`.
- `POST /api/v1/conversations/{id}/messages`: Dispatches manual human message to customer WhatsApp.

## 5. Products & Deterministic Pricing
- `GET /api/v1/products`: Product catalog, regional origins, grades, and packaging variants.
- `GET /api/v1/pricing/rules`: Active volume tier rules.
- `POST /api/v1/pricing/calculate`: Computes deterministic quote with discount bounds and MOQ enforcement.

## 6. Realtime Streaming
- `WS /api/v1/ws?org_id={org_id}`: Real-time WebSocket connection broadcasting `new_message`, `stage_changed`, `hot_lead`, and `handoff_requested`.

## 7. Webhooks
- `GET /api/v1/webhooks/whatsapp`: Meta GET verification challenge.
- `POST /api/v1/webhooks/whatsapp`: Inbound customer messages and delivery receipts.
