# 🎙️ VOICE-AGENT.md: FRIDAY Voice-Driven Agentic Control Layer

> **WhatsApp AI Agent by NS (EDITH + FRIDAY)** · *Architected & Engineered by Naboraj Sarkar (NS)*  
> Powered by Google's `gemini-3.1-flash-live-preview` via the **Gemini Multimodal Live API** (`BidiGenerateContentConstrained`), **FRIDAY** provides hands-free, low-latency bidirectional voice control over the entire Mission Control dashboard—including universal page scrolling, multi-step compound workflows, spreadsheet editing, cross-brain delegation to **EDITH**, and full website walkthroughs.

---

## 1. Ephemeral Token Security Architecture

Exposing a master `GEMINI_API_KEY` in browser client code creates severe security risks. To guarantee zero key exposure:

1. **Zero Client-Side Master Key Exposure**: The browser client (`dashboard/components/VoiceAgent.tsx`) **never** receives, stores, or sees `GEMINI_API_KEY`.
2. **Server-Side Ephemeral Token Minting**: The FastAPI backend (`POST /api/v1/voice/session-token` and alias `POST /api/voice-session-token`) uses `google-genai` (`v1alpha`) to mint a short-lived ephemeral token from Google's `generativelanguage.googleapis.com` provisioning service.
3. **Session Parameter Locking**: During minting, `live_connect_constraints` are locked to:
   - **Model**: `models/gemini-3.1-flash-live-preview`
   - **Response Modalities**: `AUDIO` (24kHz PCM output)
   - **System Instruction**: Grounded with the 17-route site map, active business profile, and behavioral safety rules.
   - **Tool Declarations**: Locked to the 26 authorized client DOM & cross-brain action tools.
   - **Lifetime**: Single-use (`uses=1`) with a 5-minute connection validity window.
4. **Constrained WebSocket Direct Connect**: The browser connects directly to:
   ```text
   wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token={token.name}
   ```

---

## 2. Complete Voice Action Tools Specification (26 Client Tools + 27 Backend Registry Actions)

FRIDAY can execute both single actions and sequential multi-step workflows across the dashboard:

### A. Navigation, Viewport Scrolling & Multi-Task Agency
| Tool Function | Parameters | Execution Behavior |
| :--- | :--- | :--- |
| `navigate_to` | `section: string` | Navigates smoothly to any of the 17 Next.js routes (`/`, `/conversations`, `/brain`, `/playground`, `/knowledge`, `/prompts`, `/settings`, etc.). |
| `scroll_page` | `direction: "up" \| "down" \| "top" \| "bottom", target?: string, amount?: number` | **Universal Viewport Scroller**: Scrolls `window`, `main`, and active scrollable containers smoothly up/down, to top/bottom, or directly to a named section/chart (`domActions.ts`). |
| `execute_multi_step_workflow` | `steps: Array<{action, target, value}>, summary: string` | **Compound Multi-Task Engine**: Executes multiple sequential commands in one turn (e.g., *"Open analytics, switch to dark mode, and scroll down"*) with live HUD step progress. |
| `explain_full_website` | `depth?: "overview" \| "detailed"` | Delivers a structured executive walkthrough of the entire Dual-Brain platform and all 17 modules. |
| `click_element` | `element_id_or_label: string` | Matches DOM ID, `data-voice-action`, `aria-label`, or button text; pulses a visual highlight ring before clicking. |
| `fill_field` | `field_name: string, value: string` | Locates input/textarea, scrolls into view, sets value, and dispatches React-compatible `input`/`change` events. |
| `explain_feature` | `feature_name: string` | Explains any specific module or metric using live screen grounding. |
| `get_hourly_traffic_velocity` | `timeframe?: string` | Queries `GET /api/v1/brain/hourly-velocity` and speaks peak traffic hours, autonomous resolution %, and turn latency. |

### B. Live Inbox, WhatsApp & Cross-Brain Delegation (`EDITH ↔ FRIDAY`)
| Tool Function | Parameters | Execution Behavior |
| :--- | :--- | :--- |
| `suggest_conversation_reply` | `conversation_id?: string, instruction?: string` | Calls `POST /api/v1/conversations/{id}/suggest-reply` to populate the inbox composer with a catalog-grounded AI draft. |
| `send_whatsapp_message` | `target: string, message: string` | Sends a WhatsApp message after explicit operator confirmation. |
| `send_ai_promotional_message` | `target_phone: string, recipient_name: string, instruction: string` | Synthesizes promotional copy via NVIDIA Nemotron (`POST /api/v1/voice/generate-promo-message`) and dispatches after confirmation. |
| `consult_edith_for_task` | `task_type: string, instruction: string, target_phone?: string` | Delegates a commercial task to **EDITH** over the `InterBrainBus` (`POST /api/v1/brain/request-edith`). |
| `deliberate_with_edith` | `topic: string, context?: string` | Triggers a live multi-turn strategic deliberation between Friday and EDITH (`POST /api/v1/brain/deliberate`). |

### C. Unified Knowledge Hub, Interactive Spreadsheet & Prompt Studio
| Tool Function | Parameters | Execution Behavior |
| :--- | :--- | :--- |
| `manage_knowledge_asset` | `instruction: string, category?: string` | Calls `POST /api/v1/knowledge/update-request` to create, update, pause, or delete catalog/policy items via natural language. |
| `open_knowledge_editor` | `item_title_or_id: string, mode?: "spreadsheet" \| "document" \| "raw"` | Opens the interactive Knowledge Asset Editor modal on `/knowledge`. |
| `switch_editor_mode` | `mode: "spreadsheet" \| "document" \| "raw"` | Switches the active Knowledge Editor between Excel-like Spreadsheet grid, Document view, and Raw source. |
| `modify_editor_cell_or_field` | `row_index?: number, column_key?: string, new_value: string` | Edits a specific spreadsheet cell or document field in real time. |
| `add_spreadsheet_row_or_column` | `target_type: "row" \| "column", name_or_values?: string` | Appends a new row or column to the open Knowledge spreadsheet. |
| `save_open_editor` | *(none)* | Saves and re-indexes the currently open Knowledge asset or Prompt section. |
| `export_or_print_document` | `format?: "pdf" \| "csv" \| "json"` | Triggers document print/PDF export or CSV download. |
| `update_system_prompt_via_nemotron` | `section: string, instruction: string` | Rewrites and activates a modular system prompt section via `POST /api/v1/voice/update-prompt-via-nemotron`. |
| `update_backend_setting` | `category: string, key: string, value: string` | Updates operational settings, kill-switch, or pricing rules (`POST /api/v1/voice/update-backend-setting`). |

### D. Self-Inspection, Code Diagnostics & Issue Reporting
| Tool Function | Parameters | Execution Behavior |
| :--- | :--- | :--- |
| `read_source_code` | `file_path: string, start_line?: number, end_line?: number` | Reads repository source files via `POST /api/v1/brain/code/read` so Friday can explain implementation details. |
| `search_source_code` | `query: string` | Searches the codebase via `POST /api/v1/brain/code/search`. |
| `diagnose_system_error` | `error_text: string` | Runs root-cause traceback analysis via `POST /api/v1/brain/code/diagnose`. |
| `report_friday_issue` | `title: string, description: string, severity?: string` | Logs a capability gap or bug report into `POST /api/v1/brain/reports`. |

---

## 3. Screen Grounding & Live Talk Timer (`MM:SS`)

1. **Dynamic Screen Snapshot (`captureScreenSnapshot()`)**:
   - On every route change (`pathname`) or DOM update, `dashboard/components/voice/domActions.ts` serializes the current path, visible headings, KPI cards, and actionable `[data-voice-action]` elements into a compact JSON turn (`[Current Screen State]: ...`), enabling Friday to "see" the screen without bloated HTML payloads.
2. **Live Talk Session Timer (`MM:SS`)**:
   - Both the expanded Friday Copilot card and the minimized floating pill display a real-time `MM:SS` talk duration counter while the voice WebSocket is active.
3. **Multilingual Dialect Selector**:
   - Switch Friday's spoken dialect between `Multilingual (Auto)`, `English (India)`, `Hindi (हिंदी)`, `Bengali (বাংলা)`, and `Hinglish (B2B)`.

---

## 4. Real-Time Audio Pipeline & Barge-In Handling

- **Input Stream**: Captured via `navigator.mediaDevices.getUserMedia` at **16,000 Hz**, 1-channel 16-bit linear PCM, base64-encoded into `realtimeInput.mediaChunks` (`audio/pcm;rate=16000`).
- **Output Stream**: Received from Gemini Live as **24,000 Hz** linear PCM (`audio/pcm;rate=24000`) and scheduled gaplessly via Web Audio `AudioContext`.
- **Natural Barge-In Interruption**: When the operator speaks while Friday is talking, Gemini's VAD emits `interrupted: true`, immediately halting buffered audio playback.
- **No Unprompted Speech Alerts**: Browser `speechSynthesis` never fires unsolicited background alerts; Friday only speaks when initiated by the operator or when playing the requested Executive Morning Briefing.
