# VOICE-AGENT.md: EDITH Voice-Driven Agentic Control Layer

## Executive Overview
The **Voice-Driven Agentic Control Layer** introduces hands-free, natural conversational voice control to the **EDITH (WB-Agent)** B2B Wholesale Operating System. Powered by Google's `gemini-3.1-flash-live-preview` model via the **Gemini Multimodal Live API**, operators can speak naturally to ask questions about wholesale tea operations, examine metrics, navigate through the platform, and execute real UI workflows in real-time.

---

## 1. Ephemeral Token Security Architecture

### Why Ephemeral Tokens?
In standard client-side AI implementations, exposing an API key in the browser introduces severe security vulnerabilities (key extraction, unauthorized quota exhaustion, model hijacking).

To prevent this:
1. **Zero Client-Side Master Key Exposure**: The browser client **never** receives, stores, or sees `GEMINI_API_KEY`.
2. **Server-Side Token Minting**: The FastAPI backend (`POST /api/v1/voice/session-token` and alias `/api/voice-session-token`) uses `google-genai` to request a short-lived token from Google's `generativelanguage.googleapis.com` provisioning endpoint.
3. **Session Parameter Locking**: During minting, `live_connect_constraints` are locked to:
   - **Model**: `models/gemini-3.1-flash-live-preview`
   - **Response Modalities**: `AUDIO`
   - **System Instruction**: Locked with the site map and behavioral guidelines.
   - **Tool Declarations**: Locked to authorized client action tools (`navigate_to`, `click_element`, `fill_field`, `send_whatsapp_message`, `explain_feature`).
   - **Lifetime**: Single-use (`uses=1`) with a 5-minute validity window.
4. **Constrained WebSocket Direct Connect**: The browser connects directly to:
   ```
   wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token={token.name}
   ```
   Because the token is pre-constrained, any client attempt to hijack the model or bypass safety filters is rejected by Google's gateway.

---

## 2. Action Tools Specification

The Live API session config declares 9 actionable functions callable by the model:

| Tool Function | Parameters | Client-Side / Backend App Logic | Safety & Confirmation |
|---|---|---|---|
| `navigate_to` | `section: string` | Maps section names to Next.js routes and calls `router.push()`. Highlights navigation item. | Pure navigation (immediate). |
| `click_element` | `element_id_or_label: string` | Matches DOM ID, `data-voice-action`, `aria-label`, or button text. Displays a pulsing visual ring before triggering `.click()`. | Non-destructive: immediate.<br>Destructive: requires spoken "yes/confirm". |
| `fill_field` | `field_name: string, value: string` | Locates input/textarea, scrolls into view, updates value, and dispatches synthetic `input` and `change` events. | Non-destructive: immediate.<br>Destructive: requires spoken confirmation. |
| `send_whatsapp_message` | `target: string, message: string` | Wraps WhatsApp dispatch or active chat composer send button. Includes anti-duplicate debounce. | **Always requires spoken confirmation ("yes/confirm") or UI button approval.** |
| `explain_feature` | `feature_name: string` | Answers the operator using the structured site map and grounding knowledge. | Informational (immediate). |
| `update_system_prompt_via_nemotron` | `section: string, instruction: string` | Transfers voice instruction to NVIDIA Nemotron-3 Ultra (`POST /api/v1/voice/update-prompt-via-nemotron`) to rewrite and activate a system prompt section in DB and broadcast live. | Spoken confirmation + visual notice. |
| `send_ai_promotional_message` | `target_phone: string, recipient_name: string, instruction: string` | Delegates B2B copy synthesis to NVIDIA Nemotron (`POST /api/v1/voice/generate-promo-message`) and dispatches via WhatsApp. | **Always requires spoken confirmation or UI confirmation.** |
| `update_backend_setting` | `category: string, key: string, value: string` | Directly updates backend settings (`POST /api/v1/voice/update-backend-setting`) such as kill-switch, catalog stock, or pricing rules. | Destructive settings require confirmation. |
| `ask_operator_clarification` | `question: string, options: string[]` | Asks the operator a clarifying question when voice instruction is ambiguous or has multiple choices. | Informational / interactive. |

---

## 3. Screen Grounding & Context Synchronization

To enable the voice model to "see" and understand the active screen without transmitting expensive or bloated raw HTML:
1. **Dynamic Context Generation**: Upon session connection and upon every navigation (`pathname` change) or DOM update, a lightweight structured snapshot is created:
   ```json
   {
     "current_path": "/pricing",
     "page_title": "Interactive Volume Discount Curve & Deterministic Pricing",
     "visible_headings": ["Interactive Quote Simulator", "Active Pricing Rules"],
     "actionable_elements": [
       { "id": "quote-sim-quantity-input", "type": "number", "label": "Order Quantity (kg)", "value": 100 },
       { "id": "quote-sim-discount-input", "type": "number", "label": "Target Discount %", "value": 0 },
       { "id": "quote-sim-calculate-btn", "type": "button", "label": "Simulate Deterministic Pricing" }
     ]
   }
   ```
2. **Context Delivery**: The snapshot is injected into the Gemini Live conversation as a client content turn (`[Current Screen State]: ...`).
3. **Site Map Knowledge**: The system prompt contains the full 14-route site map and interactive inventory, allowing the model to answer "where do I find X" or "take me to Y" effortlessly.

---

## 4. Real-Time Audio Pipeline

* **Input Streaming**:
  - Captured via browser `navigator.mediaDevices.getUserMedia` at 16,000 Hz, 1-channel 16-bit linear PCM.
  - Chunked and base64 encoded into `realtimeInput.mediaChunks` frames (`audio/pcm;rate=16000`).
* **Output Streaming**:
  - Received from Gemini Live as 24,000 Hz linear PCM in `serverContent.modelTurn.parts` (`audio/pcm;rate=24000`).
  - Decoded and scheduled via Web Audio `AudioContext` and `AudioBufferSourceNode`.
* **Natural Interruption (Barge-In)**:
  - When the user begins speaking while the model is playing audio, Gemini's built-in Voice Activity Detection sends an `interrupted: true` signal.
  - The client immediately halts active audio playback and clears buffered audio slices.
* **Session Resumption**:
  - Persists resumption handle in memory to recover from transient network drops without restarting the conversation.

---

## 5. UI Architecture: Desktop vs Mobile

* **Persistent Talk Button**: Docked to the bottom-right of every dashboard screen via `DashboardShell`.
* **Desktop Viewport (>=768px)**:
  - Expands an interactive floating glassmorphism card docked beside the talk button.
  - Shows real-time dual-sided transcription: input speech from user and output speech from EDITH.
  - Shows tool execution banners and visual confirmation dialogs.
* **Mobile Viewport (<768px)**:
  - Suppresses transcript drawer to preserve screen real estate for one-handed operation.
  - Replaced by a pulsing status orb indicating `Listening`, `Thinking`, or `Speaking`.
  - Displays high-priority confirmation prompts as standard bottom sheets.

---

## 6. Safety & Boundary Rules

1. **Destructive Action Protection**:
   - Sending WhatsApp messages, altering prices, deleting products, or changing system models cannot execute without explicit operator verbal consent.
   - The agent articulates: *"I am about to [action]. Do you confirm?"* and requires an affirmative "yes" / "confirm" response or a click on the confirmation pill.
2. **Ambiguity Resolution**:
   - If an utterance is ambiguous (e.g. multiple "Send" buttons or multiple tea products), the agent asks for clarification rather than guessing.
3. **Visual Feedback Guarantee**:
   - Every action visibly pulses a glowing highlight ring on the target element before executing.
4. **Rate-Limiting & Debouncing**:
   - Consecutive destructive actions are debounced by 2.5 seconds to prevent accidental double-execution.

---

## 7. Known Limitations

1. **Third-Party Canvas/WebGL Renders**: Canvas-based chart interiors are described through data bindings rather than direct canvas DOM elements.
2. **Microphone Permissions**: The browser must grant `navigator.mediaDevices` microphone access (standard HTTPS or localhost requirement).
