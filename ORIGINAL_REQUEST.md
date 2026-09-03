# Original User Request

## 2026-09-03T19:13:32Z

Build and integrate all 5 major enterprise upgrades for the EDITH (WB-Agent) autonomous sales platform, backed by an autonomous Browser Verification Agent that actively tests all features in a real browser, and a Documentation Synchronization Agent that keeps all docs updated in lockstep.

Working directory: d:/Projects/Python/wb-agent
Integrity mode: development

## Requirements

### R1. Automated PDF Pro-Forma Invoice & Commercial Quote Generator
- Compile branded North Bengal Tea Co. commercial pro-forma invoices with GSTIN, FSSAI, itemized order tiers, packaging specifications, and 7-day rate lock terms when conversations reach PURCHASE_INTENT or RECOMMENDATION.
- Dispatch generated PDF attachments directly into active WhatsApp conversations via the Baileys/Meta Cloud bridge.

### R2. WhatsApp Voice Note Transcription & Hinglish Audio Understanding
- Ingest inbound WhatsApp audio/voice notes (.ogg, .opus, .mp3) from the WhatsApp bridge.
- Transcribe audio utilizing the configured Gemini multimodal API (GEMINI_API_KEY in .env) with fallback to NVIDIA / local speech processing.
- Accurately process Romanized Hindi, Bengali-accented English, and colloquial Hinglish spoken queries (e.g. "Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao").
- Feed transcripts directly into AgentOrchestrator for passive requirement extraction and consultative sales responses.

### R3. Real-Time WebSocket Live Sync & Dashboard Audio Alerts
- Implement a persistent WebSocket stream (/api/v1/ws/conversations) between FastAPI backend and Next.js frontend.
- Provide instant message synchronization with zero polling lag.
- Trigger audible operator chimes on the dashboard for hot lead replies (score >= 80), human takeover requests, and owner escalation alerts.
- Support native browser desktop notifications when the dashboard is unfocused.

### R4. Automated B2B Campaign Drip & Anti-Ban Rate-Limited Outreach
- Provide campaign management interface in the dashboard to select leads from ingested CSV files and schedule personalized cold outreach sequences.
- Enforce randomized inter-message jitter (25–45s) and daily volume quotas to safeguard WhatsApp sender numbers against bans.
- Seamlessly transition leads into EDITH consultative dialogue upon buyer reply.

### R5. Sales Intelligence & Objection Analytics Dashboard
- Interactive analytics dashboard featuring Objection Pareto distribution, geographic lead heatmaps, pipeline revenue forecasting, and 1-click executive CSV/Excel activity exports.

### R6. Continuous Documentation Synchronization Agent
- Maintain continuous documentation updates across docs/, README.md, runbooks, and ADRs as each feature is delivered.
- Perform atomic git commits and push to origin/main after every file modification.

### R7. Active Browser & End-to-End Verification Agent
- Exercise and verify all built capabilities live in the browser at http://localhost:3000 (inspecting real-time WebSocket messaging, invoice generation, audio ingestion, and analytics).
- Capture high-resolution screenshot artifacts verifying UI functionality and zero regressions.

## Acceptance Criteria

### Invoice Generation
- [ ] Valid PDF generated deterministically matching active catalog prices and volume discount rules.
- [ ] PDF delivered via WhatsApp provider with delivery confirmation.

### Audio Understanding
- [ ] Inbound .ogg voice note transcribed accurately into text without crashing.
- [ ] Hinglish colloquial phrasing correctly routed to consultative dialogue engine.

### WebSocket Live Sync
- [ ] New inbound/outbound messages appear in Live Inbox instantly without HTTP polling.
- [ ] Audible chime triggers on hot lead message arrival.

### Campaign Drip Engine
- [ ] Rate-limited dispatch executes with randomized delays between 25s and 45s.
- [ ] Inbound reply automatically stops campaign cadence and hands off to active AI sales agent.

### Analytics Dashboard
- [ ] Interactive charts render live objection stats and revenue projections accurately.
- [ ] Executive CSV export downloads with complete lead and conversion records.

### Verification & Documentation
- [ ] All automated unit tests pass (100% pass rate).
- [ ] Documentation updated and all commits pushed to remote repository.

## 2026-09-03T19:15:05Z

CRITICAL MANDATE FROM USER: You and all your child subagents (including orchestrator 36acf755-b190-42da-8315-f421be4b8262) MUST actively perform `git add`, `git commit`, and `git push origin main` after EVERY SINGLE FILE CHANGE. Do not accumulate multiple modified files before pushing. Every incremental file change must be pushed to remote immediately.

