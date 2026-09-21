# INTEGRATION_MAP.md: External Systems, Protocols & Third-Party Integration Audit

> **Verification Standard**: VERIFIED BY CODE | VERIFIED BY RUNTIME | VERIFIED BY TEST  
> **Date of Audit**: 2026-09-21  
> **Repository**: `d:/Projects/Python/wb-agent`

---

## 1. Executive Summary

This document maps all active, partial, simulated, and external third-party integrations across the WB-Agent (EDITH) ecosystem. For every integration, it details data flowing in, data flowing out, authentication methods, runtime status, and failure/fallback behaviors.

---

## 2. Integration Landscape Diagram

```mermaid
flowchart TD
    subgraph Clients ["Client Layer"]
        WhatsAppUser[Customer on WhatsApp]
        WebOperator[Sales Operator on Next.js Dashboard]
    end

    subgraph Gateways ["Gateway & Ingestion Layer"]
        BaileysBridge[Baileys Node.js Bridge :3001]
        MetaCloudAPI[Meta WhatsApp Cloud Graph API v20.0]
        WebSocketServer[FastAPI WebSocket Stream :8000]
    end

    subgraph CoreBackend ["FastAPI Core Backend (:8000)"]
        WebhookRouter["/api/v1/webhooks/whatsapp"]
        AgentOrchestrator[AgentOrchestrator]
        DurableQueue[(JobQueue - SQLite / Postgres)]
        VoiceTokenRoute["/api/v1/voice/session-token"]
    end

    subgraph ExternalAI ["AI Cloud Services"]
        NvidiaNIM["NVIDIA NIM API (Nemotron 120B / Llama 70B)"]
        GoogleGeminiLive["Google Gemini Multimodal Live API (WebSocket)"]
    end

    subgraph PDFEngine ["Document Engine"]
        ReportLabEngine[ReportLab Commercial PDF Engine]
    end

    WhatsAppUser <-->|WhatsApp Protocol| BaileysBridge
    WhatsAppUser <-->|Official Cloud API| MetaCloudAPI
    BaileysBridge -->|HTTP POST Webhook| WebhookRouter
    MetaCloudAPI -->|HTTP POST HMAC-SHA256| WebhookRouter
    WebhookRouter --> DurableQueue
    DurableQueue --> AgentOrchestrator
    
    AgentOrchestrator <-->|HTTPS REST (Dual-Key)| NvidiaNIM
    AgentOrchestrator -->|Direct Generate| ReportLabEngine
    ReportLabEngine -->|PDF File Path| BaileysBridge
    
    WebOperator <-->|WSS Realtime Stream| WebSocketServer
    WebOperator -->|Ephemeral Session Token| VoiceTokenRoute
    VoiceTokenRoute -->|google-genai auth_tokens.create| GoogleGeminiLive
    WebOperator <-->|Direct Client WSS Linear PCM| GoogleGeminiLive
```

---

## 3. Integration Catalog

### 1. WhatsApp Multi-Device Baileys Bridge
- **Implementation**: `whatsapp-bridge/index.js` (Express + `@whiskeysockets/baileys`).
- **Port**: `3001` (HTTP & Web UI).
- **Authentication**: Local multi-file auth credentials stored in `whatsapp-bridge/auth_info_baileys/`.
- **Inbound Data**:
  - Receives raw WhatsApp socket events (`messages.upsert`).
  - Filters historical messages buffered before bridge boot.
  - Resolves privacy LIDs (`@lid`) to canonical phone numbers.
  - Suppresses bot self-replies on `918918753100`.
  - Forwards payload formatted as standard WhatsApp Cloud JSON to `http://localhost:8000/api/v1/webhooks/whatsapp`.
- **Outbound Data**:
  - `POST /send`: Dispatches text messages via `sock.sendMessage(jid, { text })`.
  - `POST /send-document`: Dispatches generated PDF pro-forma invoices via `sock.sendMessage(jid, { document, mimetype: "application/pdf" })`.
- **Failure Behavior**:
  - Connection close code inspected. If logged out (`DisconnectReason.loggedOut`), purges auth cache and generates fresh QR code.
  - Reconnects automatically every 2,000ms on network drop.
- **Operational Status**: `REAL / VERIFIED LOCALLY`.

---

### 2. Official Meta WhatsApp Cloud API
- **Implementation**: `backend/app/whatsapp/providers/meta_cloud.py`.
- **Environment Variables**:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_BUSINESS_ACCOUNT_ID`
  - `WHATSAPP_ACCESS_TOKEN`
  - `WHATSAPP_VERIFY_TOKEN`
  - `WHATSAPP_WEBHOOK_SECRET`
- **Inbound Data**:
  - `POST /api/v1/webhooks/whatsapp`.
  - HMAC-SHA256 signature verified against `X-Hub-Signature-256` header.
- **Outbound Data**:
  - HTTPS POST to `https://graph.facebook.com/v20.0/{phone_number_id}/messages`.
  - Sends text templates, free-form text, and media attachments.
- **Failure Behavior**: Retries with exponential backoff on HTTP 429 / 5xx; raises `WhatsAppDeliveryError`.
- **Operational Status**: `IMPLEMENTED / LIVE VERIFICATION PENDING` (tested with mock signatures; live credentials required for production traffic).

---

### 3. NVIDIA NIM Cloud (Core Brain Reasoning & Embeddings)
- **Implementation**: `backend/app/agent/providers/nvidia.py`, `backend/app/ai/client.py`, `backend/app/ai/router.py`.
- **Environment Variables**:
  - `NVIDIA_NIM_API_KEY_PRIMARY` / `NVIDIA_API_KEY`
  - `NVIDIA_NIM_API_KEY_FALLBACK`
  - `NVIDIA_BASE_URL` (`https://integrate.api.nvidia.com/v1`)
  - `NVIDIA_MODEL` (`nvidia/nemotron-3-super-120b-a12b`)
  - `EDITH_SALES_MODEL` (`meta/llama-3.3-70b-instruct`)
  - `NVIDIA_EMBEDDING_MODEL` (`nvidia/nv-embedqa-e5-v5`)
- **Dual-Key Rotation & Circuit Breakers**:
  - If Primary key returns 401/429/503, automatically fails over to Fallback key.
  - Circuit breaker trips after 3 consecutive failures for 60 seconds (`AI_CIRCUIT_BREAKER_COOLDOWN_SECONDS`).
- **Failure Behavior**:
  - Chained fallback: Primary Nemotron 120B -> Fallback Llama 70B -> Gemma 4 31B -> Local deterministic sales simulator.
- **Operational Status**: `REAL / VERIFIED BY RUNTIME` (active in development environment).

---

### 4. Google Gemini Multimodal Live API (FRIDAY Voice Copilot)
- **Implementation**:
  - Backend: `backend/app/api/routes/voice.py` (Session token minter).
  - Frontend: `dashboard/components/VoiceAgent.tsx` (Client-side Web Audio & WebSocket).
- **Environment Variables**: `GEMINI_API_KEY`, `GEMINI_MODEL` (`gemini-3.1-flash-live-preview`).
- **Architecture**:
  - **Zero Key Leakage**: Browser never receives `GEMINI_API_KEY`.
  - FastAPI calls `google-genai` SDK `client.auth_tokens.create()` with pre-constrained tool declarations, response modality (`AUDIO`), and 5-minute single-use validity.
  - Browser connects directly to `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token={token}`.
  - 16,000 Hz 16-bit linear PCM uplink; 24,000 Hz linear PCM downlink with natural barge-in interruption.
- **Failure Behavior**:
  - Resumption handle cached in memory for seamless reconnection upon network drop.
  - If WebSocket closes, UI reverts to idle state and displays friendly reconnection pill.
- **Operational Status**: `REAL / OPERATIONAL`.

---

### 5. ReportLab PDF Engine (Commercial Pro-Forma Invoice Compiler)
- **Implementation**: `backend/app/services/invoice_generator.py`.
- **Input Data**: Structured order context (Buyer name, phone, company, destination, catalog item, quantity kg, tier discount, tax rates).
- **Output Data**: High-resolution, branded PDF documents written to `storage/exports/invoices/PI-YYMMDD-XXX.pdf`.
- **Features**:
  - Vector layout with crisp typography, GSTIN/FSSAI regulatory blocks, itemized tier math, 5% GST computation, and 7-day rate lock terms.
  - Unicode font registration preventing crashes on Hindi/Bengali names.
- **Operational Status**: `REAL / VERIFIED BY RUNTIME & TESTS` (46 generated invoices present in storage).

---

### 6. Apify B2B Lead Scraping
- **Implementation**: `backend/app/leads/scraper.py`, `backend/app/leads/apify.py`.
- **Environment Variables**: `APIFY_TOKEN`, `APIFY_DEFAULT_ACTOR_ID`, `APIFY_DATASET_RETRIEVAL_TIMEOUT`.
- **Input Data**: Search criteria (location, keyword, Google Maps query).
- **Output Data**: Lead records ingested and normalized into canonical `leads` table.
- **Failure Behavior**: Timeout after 60s; marks import job as failed.
- **Operational Status**: `IMPLEMENTED / UNTESTED` (token unconfigured in standard development environment).

---

### 7. Primary Database: PostgreSQL 16 + pgvector (SQLite Active Fallback)
- **Implementation**: `backend/app/database/session.py`.
- **Target**: PostgreSQL 16 with `pgvector` extension for cosine distance vector searches over `knowledge_chunks`.
- **Current Runtime**: SQLite via `aiosqlite` (`wb_agent.db`). In SQLite mode, cosine distance vector search is emulated using in-memory dot product ranking.
- **Operational Status**: `ACTIVE RUNTIME: SQLite | PRODUCTION READY: PostgreSQL`.
