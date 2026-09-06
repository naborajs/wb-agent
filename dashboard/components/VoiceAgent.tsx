"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  X,
  ChevronDown,
  Sparkles,
  Radio,
  RefreshCw,
  Send,
  Zap,
  Phone,
  PhoneOff,
  Maximize2,
  Minimize2,
  MessageSquare,
  ChevronLeft,
  Globe,
} from "lucide-react";
import { AudioStreamer } from "./voice/audioStreamer";
import {
  SITE_MAP,
  resolveSectionRoute,
  buildVoiceSystemInstruction,
} from "./voice/siteMapData";
import {
  getScreenSnapshot,
  findMatchingElement,
  highlightElement,
  setNativeValue,
  selectConversationItem,
  setColorTheme,
  typeText,
} from "./voice/domActions";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type AgentState = "idle" | "listening" | "thinking" | "speaking";

const SUPPORTED_LANGUAGES = [
  { code: "all", name: "Multilingual", flag: "🌐" },
  { code: "en", name: "English", flag: "🇺🇸" },
  { code: "hi", name: "Hindi (हिंदी)", flag: "🇮🇳" },
  { code: "bn", name: "Bengali (বাংলা)", flag: "🇮🇳" },
  { code: "hinglish", name: "Hinglish", flag: "🇮🇳" },
];

interface TranscriptMessage {
  id: string;
  speaker: "user" | "agent" | "system";
  text: string;
  timestamp: string;
}

export default function VoiceAgent() {
  const pathname = usePathname();
  const router = useRouter();

  // Voice session state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [cardOpen, setCardOpen] = useState(false);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);
  const [chatInput, setChatInput] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(SUPPORTED_LANGUAGES[0]);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  // Transcripts
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastDestructiveActionTime = useRef(0);
  const mutedRef = useRef(false);
  const lastUserUtterance = useRef("");

  // Record audit log entry in backend for continuous improvement and error diagnostics
  const recordVoiceAuditLog = useCallback(
    async (
      instruction: string,
      actionType: string,
      status: "success" | "failed" | "unhandled",
      details: any = {},
      errorReason?: string,
      suggestedFeature?: string
    ) => {
      try {
        await fetch("/api/v1/voice/audit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_instruction: instruction || actionType,
            action_type: actionType,
            status,
            current_path: pathname,
            details,
            error_reason: errorReason,
            suggested_feature: suggestedFeature,
          }),
        });
      } catch (e) {
        console.debug("Voice audit log write warning:", e);
      }
    },
    [pathname]
  );

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Auto-scroll transcripts
  useEffect(() => {
    transcriptsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcripts, showTranscript, isExpanded]);

  // Clean disconnect
  const disconnectSession = useCallback(() => {
    if (wsRef.current) {
      try {
        wsRef.current.close();
      } catch {}
      wsRef.current = null;
    }
    if (streamerRef.current) {
      streamerRef.current.stop();
      streamerRef.current = null;
    }
    mutedRef.current = false;
    setMuted(false);
    setConnectionState("disconnected");
    setAgentState("idle");
    setMicVolume(0);
  }, []);

  // Hardware and software synchronized mute toggle
  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      mutedRef.current = next;
      if (streamerRef.current) {
        streamerRef.current.setMuted(next);
      }
      return next;
    });
  }, []);

  // Send screen grounding context snapshot (turnComplete: false prevents unprompted speech)
  const sendScreenContext = useCallback((currentPath: string) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const snapshot = getScreenSnapshot(currentPath);
    const contextMsg = {
      clientContent: {
        turns: [
          {
            role: "user",
            parts: [
              {
                text: `[SYSTEM SCREEN GROUNDING SNAPSHOT]: The operator is currently looking at section "${snapshot.page_title}" (Route: ${snapshot.current_path}). Visible headings: ${snapshot.visible_headings.join(
                  ", "
                )}. Key visible fields/buttons: ${snapshot.actionable_elements
                  .map((e) => `${e.label} (${e.tag}${e.type ? `:${e.type}` : ""})`)
                  .join("; ")}. Ground all explanations and actions in this visible context without reciting this message aloud.`,
              },
            ],
          },
        ],
        turnComplete: false,
      },
    };
    try {
      wsRef.current.send(JSON.stringify(contextMsg));
    } catch (err) {
      console.warn("Failed to send screen grounding context:", err);
    }
  }, []);

  // Update screen context when route changes
  useEffect(() => {
    if (connectionState === "connected") {
      setTimeout(() => sendScreenContext(pathname), 350);
    }
  }, [pathname, connectionState, sendScreenContext]);

  // Execute client-side tool call
  const executeToolCall = async (callId: string, name: string, args: any) => {
    setAgentState("thinking");
    let result: any = { success: false };

    try {
      if (name === "navigate_to") {
        const target = resolveSectionRoute(args.section || "");
        if (target) {
          router.push(target.path);
          result = {
            success: true,
            navigated_to: target.path,
            title: target.name,
            message: `Navigated to ${target.name}.`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Navigated to ${target.name}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } else {
          result = {
            success: false,
            error: `Section "${args.section}" was not found in the site map. Available sections include: ${SITE_MAP.map(
              (r) => r.path
            ).join(", ")}.`,
          };
        }
      } else if (name === "click_element") {
        const query = args.element_id_or_label || "";
        const el = findMatchingElement(query);

        if (!el) {
          result = {
            success: false,
            error: `Element "${query}" was not found on the current screen (${pathname}).`,
          };
        } else {
          highlightElement(el, "#0ea5e9", 1200);
          el.click();
          result = {
            success: true,
            clicked: el.innerText?.trim() || query,
            message: `Successfully clicked "${query}".`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Clicked: ${el.innerText?.trim() || query}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } else if (name === "fill_field") {
        const fieldName = args.field_name || "";
        const value = String(args.value ?? "");
        const el = findMatchingElement(fieldName);

        if (!el || (el.tagName !== "INPUT" && el.tagName !== "TEXTAREA" && el.tagName !== "SELECT")) {
          result = {
            success: false,
            error: `Form field "${fieldName}" was not found on the current screen (${pathname}).`,
          };
        } else {
          highlightElement(el, "#0ea5e9", 1200);
          setNativeValue(el as HTMLInputElement, value);
          result = {
            success: true,
            field: fieldName,
            value: value,
            message: `Filled field "${fieldName}" with "${value}".`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Filled ${fieldName}: "${value}"`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        }
      } else if (name === "send_whatsapp_message") {
        const target = args.target || "customer";
        const message = args.message || "";

        // Anti-duplicate debounce
        const now = Date.now();
        if (now - lastDestructiveActionTime.current < 2500) {
          result = {
            success: false,
            error: "Action debounced to prevent duplicate sending.",
          };
        } else {
          lastDestructiveActionTime.current = Date.now();
          try {
            // If operator is on /conversations with an active composer
            const composer = document.querySelector(
              "textarea[placeholder*='message'], textarea"
            ) as HTMLTextAreaElement;
            const sendBtn = document.querySelector(
              "button:has(svg.lucide-send), button[aria-label*='Send']"
            ) as HTMLButtonElement;

            if (composer && sendBtn) {
              setNativeValue(composer, message);
              sendBtn.click();
            } else {
              // Direct backend fallback dispatch
              await fetch("/api/v1/whatsapp/send", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  to_phone: target,
                  message: message,
                  source: "voice_agent",
                }),
              });
            }

            setTranscripts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                speaker: "system",
                text: `WhatsApp message sent to ${target}: "${message}"`,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);

            result = {
              success: true,
              recipient: target,
              message: `Successfully dispatched WhatsApp message to ${target}.`,
            };
          } catch (e: any) {
            console.error("WhatsApp voice send failed:", e);
            result = {
              success: false,
              error: e?.message || "Failed to send WhatsApp message.",
            };
          }
        }
      } else if (name === "explain_feature") {
        const query = args.feature_name || "";
        const route = resolveSectionRoute(query);
        if (route) {
          result = {
            success: true,
            feature: route.name,
            description: route.description,
            actions: route.keyActions,
          };
        } else {
          result = {
            success: true,
            info: `The feature "${query}" is part of EDITH autonomous B2B sales system. Refer to the site map overview.`,
          };
        }
      } else if (name === "update_system_prompt_via_nemotron") {
        const section = args.section || "core_identity";
        const instruction = args.instruction || "";

        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Transferring prompt revision to NVIDIA Nemotron for "${section}"...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        const res = await fetch("/api/v1/voice/update-prompt-via-nemotron", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ section, instruction }),
        });

        if (res.ok) {
          const data = await res.json();
          result = {
            success: true,
            section: data.section,
            version: data.version,
            summary: data.summary_of_changes,
            model_used: data.model_used,
            message: `NVIDIA Nemotron successfully updated the system prompt for ${data.section} to version ${data.version}.`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Nemotron updated ${data.section} (v${data.version}): ${data.summary_of_changes}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);

          window.dispatchEvent(new CustomEvent("prompt_updated", { detail: data }));
        } else {
          const errData = await res.json().catch(() => ({ detail: "Nemotron update failed" }));
          result = { success: false, error: errData.detail || "Nemotron prompt update failed" };
        }
      } else if (name === "send_ai_promotional_message") {
        const targetPhone = args.target_phone || "";
        const recipientName = args.recipient_name || "Wholesale Buyer";
        const instruction = args.instruction || "Special wholesale discounts on fresh harvest estate tea";

        try {
          const res = await fetch("/api/v1/voice/generate-promo-message", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              target_phone: targetPhone,
              recipient_name: recipientName,
              instruction: instruction,
              dispatch_whatsapp: true,
            }),
          });
          const data = await res.json();
          if (res.ok) {
            setTranscripts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                speaker: "system",
                text: `Nemotron sent promo to ${targetPhone}: "${data.generated_message}"`,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
            result = {
              success: true,
              target_phone: targetPhone,
              generated_message: data.generated_message,
              message: `Nemotron generated and dispatched promotional WhatsApp message to ${targetPhone}.`,
            };
          } else {
            result = {
              success: false,
              error: data.detail || "Failed to generate promotional message",
            };
          }
        } catch (err: any) {
          console.error("Promo dispatch failed:", err);
          result = {
            success: false,
            error: err?.message || "Promo dispatch failed",
          };
        }
      } else if (name === "update_backend_setting") {
        const category = args.category || "settings";
        const key = args.key || "";
        const value = args.value;

        const res = await fetch("/api/v1/voice/update-backend-setting", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category, key, value }),
        });
        const data = await res.json();
        result = data;
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Backend update: ${data.message || JSON.stringify(data)}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "ask_operator_clarification") {
        const question = args.question || "";
        const options = Array.isArray(args.options) ? args.options : [];

        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Question: ${question}${options.length > 0 ? ` [${options.join(", ")}]` : ""}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        result = {
          success: true,
          question: question,
          options: options,
          message: `Asked operator for clarification: "${question}". The operator will respond via voice or chat.`,
        };
      } else if (name === "select_conversation") {
        const query = args.phone_or_name || "";
        if (pathname !== "/conversations") {
          router.push("/conversations");
          await new Promise((r) => setTimeout(r, 450));
        }
        result = selectConversationItem(query);
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: result.success
              ? `Opened chat: ${result.target || query}`
              : `Chat search: ${result.message}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "set_color_theme") {
        const theme = args.theme || "toggle";
        result = setColorTheme(theme);
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Theme switched to ${result.theme} mode`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "type_text") {
        const target = args.target || "search";
        const text = args.text || "";
        const submit = !!args.submit;
        result = typeText(target, text, submit);
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Typed into ${target}: "${text}"`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "log_unhandled_request") {
        const userQuery = args.user_query || lastUserUtterance.current || "";
        const attemptedAction = args.attempted_action || "unhandled_intent";
        const reason = args.reason || "Action not currently supported in dashboard";
        await recordVoiceAuditLog(
          userQuery,
          attemptedAction,
          "unhandled",
          { args },
          reason,
          attemptedAction
        );
        result = {
          success: true,
          message: `Logged unhandled request "${userQuery}" to continuous learning database for system expansion.`,
        };
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Logged gap to DB: ${userQuery}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else {
        result = { success: false, error: `Unknown tool function: ${name}` };
      }
    } catch (err: any) {
      result = { success: false, error: err?.message || String(err) };
    }

    // Automatically record every tool execution into the database audit log
    recordVoiceAuditLog(
      lastUserUtterance.current || name,
      name,
      result.success ? "success" : "failed",
      { args, result },
      result.error
    );

    // Send tool response back over WebSocket
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const responseMsg = {
        toolResponse: {
          functionResponses: [
            {
              id: callId,
              response: { output: result },
            },
          ],
        },
      };
      try {
        wsRef.current.send(JSON.stringify(responseMsg));
      } catch (err) {
        console.warn("Failed to send toolResponse:", err);
      }
    }
  };

  // Connect to Gemini Live API session
  const startVoiceSession = async () => {
    if (connectionState === "connecting" || connectionState === "connected") return;
    setConnectionState("connecting");
    setErrorMessage(null);
    setAgentState("idle");

    try {
      // 1. Fetch ephemeral token from backend (Step 2)
      const tokenRes = await fetch("/api/v1/voice/session-token", { method: "POST" });
      if (!tokenRes.ok) {
        const err = await tokenRes.json().catch(() => ({ detail: "Token request failed" }));
        throw new Error(err.detail || `Server returned ${tokenRes.status}`);
      }
      const tokenData = await tokenRes.json();
      const wsUrl = tokenData.ws_url;

      // 2. Initialize AudioStreamer
      const streamer = new AudioStreamer();
      streamerRef.current = streamer;
      streamer.onVolumeChange = (vol) => setMicVolume(vol);

      // 3. Open WebSocket to Google Live API
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = async () => {
        setConnectionState("connected");
        setAgentState("listening");

        // Send Setup Frame with tools, transcription configs and system prompt
        const setupMessage = {
          setup: {
            model: "models/gemini-3.1-flash-live-preview",
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: "Aoede",
                  },
                },
              },
            },
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction: {
              parts: [{ text: buildVoiceSystemInstruction() }],
            },
            tools: [
              {
                functionDeclarations: [
                  {
                    name: "navigate_to",
                    description: "Navigates to a specific section or page in the EDITH dashboard.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        section: {
                          type: "STRING",
                          description:
                            "The target section name or path (e.g., 'pricing', 'inbox', 'orders', 'catalog', 'leads', 'campaigns', 'analytics', 'settings').",
                        },
                      },
                      required: ["section"],
                    },
                  },
                  {
                    name: "click_element",
                    description: "Triggers a real click on an identifiable button, tab, link, or toggle on the current screen.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        element_id_or_label: {
                          type: "STRING",
                          description: "The text label, aria-label, or ID of the button to click.",
                        },
                      },
                      required: ["element_id_or_label"],
                    },
                  },
                  {
                    name: "fill_field",
                    description: "Fills in a form input, textarea, or search field with a given value.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        field_name: {
                          type: "STRING",
                          description: "The label, placeholder, or name of the input field.",
                        },
                        value: {
                          type: "STRING",
                          description: "The text or number to input.",
                        },
                      },
                      required: ["field_name", "value"],
                    },
                  },
                  {
                    name: "send_whatsapp_message",
                    description:
                      "Sends a real customer-facing WhatsApp message immediately as instructed by the operator.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        target: {
                          type: "STRING",
                          description: "The customer recipient phone number or contact name.",
                        },
                        message: {
                          type: "STRING",
                          description: "The complete WhatsApp message content.",
                        },
                      },
                      required: ["target", "message"],
                    },
                  },
                  {
                    name: "explain_feature",
                    description: "Explains how a dashboard feature or workflow operates using grounded knowledge.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        feature_name: {
                          type: "STRING",
                          description: "The name of the feature to explain in detail.",
                        },
                      },
                      required: ["feature_name"],
                    },
                  },
                  {
                    name: "update_system_prompt_via_nemotron",
                    description:
                      "Transfers an operator's request to revise or optimize the system prompt (e.g. changing agent name from EDITH to Rakesh, altering discount rules, or updating tone) to NVIDIA Nemotron. Nemotron generates the production prompt and activates it live in the backend.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        section: {
                          type: "STRING",
                          description:
                            "The prompt section: 'core_identity' (for agent name/persona), 'core_safety', 'business_policy', 'sales_style', or 'business_profile'.",
                        },
                        instruction: {
                          type: "STRING",
                          description:
                            "The plain English instruction for Nemotron (e.g. 'Change the persona name from EDITH to Rakesh', 'Set maximum discount to 12%').",
                        },
                      },
                      required: ["section", "instruction"],
                    },
                  },
                  {
                    name: "send_ai_promotional_message",
                    description:
                      "Asks NVIDIA Nemotron to author a personalized, high-converting B2B WhatsApp promotional outreach message and dispatches it to the recipient.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        target_phone: {
                          type: "STRING",
                          description: "The recipient phone number or contact identifier.",
                        },
                        recipient_name: {
                          type: "STRING",
                          description: "Name of the wholesale buyer or contact.",
                        },
                        instruction: {
                          type: "STRING",
                          description: "Offer details or promotional campaign instructions for Nemotron to draft.",
                        },
                      },
                      required: ["target_phone", "instruction"],
                    },
                  },
                  {
                    name: "update_backend_setting",
                    description: "Updates backend settings, master AI kill-switch, catalog stock, or pricing rules directly.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        category: {
                          type: "STRING",
                          description: "The category: 'settings', 'pricing', 'catalog', or 'kill_switch'.",
                        },
                        key: {
                          type: "STRING",
                          description: "The setting name, rule name, or product name.",
                        },
                        value: {
                          type: "STRING",
                          description: "The updated value (e.g. true/false or string/number).",
                        },
                      },
                      required: ["category", "key", "value"],
                    },
                  },
                  {
                    name: "ask_operator_clarification",
                    description:
                      "Asks the operator a clarifying question or notifies the user live when an instruction is ambiguous, refers to multiple choices, or lacks critical parameters.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        question: {
                          type: "STRING",
                          description: "The specific question to ask the operator.",
                        },
                        options: {
                          type: "ARRAY",
                          items: { type: "STRING" },
                          description: "Optional list of distinct choices for the user to select from.",
                        },
                      },
                      required: ["question"],
                    },
                  },
                  {
                    name: "select_conversation",
                    description:
                      "Opens a specific customer chat or phone number on /conversations (e.g. 'click on our number', 'open chat with +91 89006 53250', 'open chat with Rahul'). Automatically navigates to /conversations and selects the thread.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        phone_or_name: {
                          type: "STRING",
                          description: "The phone number or contact name to open and chat with.",
                        },
                      },
                      required: ["phone_or_name"],
                    },
                  },
                  {
                    name: "set_color_theme",
                    description:
                      "Switches the dashboard interface color theme live: 'dark' ('Royal Pitch Black'), 'light' ('Estate White'), or 'toggle'.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        theme: {
                          type: "STRING",
                          description: "'dark', 'light', or 'toggle'",
                        },
                      },
                      required: ["theme"],
                    },
                  },
                  {
                    name: "type_text",
                    description:
                      "Types text into any input, search bar, or chat message composer on the current screen.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        target: {
                          type: "STRING",
                          description:
                            "The input target: 'composer' (for chat message box), 'search' (for search bar), or a specific field name.",
                        },
                        text: {
                          type: "STRING",
                          description: "The text content to type.",
                        },
                        submit: {
                          type: "BOOLEAN",
                          description: "Whether to submit / click send immediately after typing.",
                        },
                      },
                      required: ["target", "text"],
                    },
                  },
                  {
                    name: "log_unhandled_request",
                    description:
                      "Records an unhandled or currently unsupported operator request directly into the database for operator inspection and continuous system expansion.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        user_query: {
                          type: "STRING",
                          description: "The user's original spoken request.",
                        },
                        attempted_action: {
                          type: "STRING",
                          description: "The action or feature that was missing or failed.",
                        },
                        reason: {
                          type: "STRING",
                          description: "Why the action could not be fulfilled.",
                        },
                      },
                      required: ["user_query", "attempted_action"],
                    },
                  },
                ],
              },
            ],
          },
        };

        ws.send(JSON.stringify(setupMessage));

        // Start microphone recording with Gemini 3.1 Live API compliant schema
        await streamer.startRecording((base64Chunk) => {
          if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && !mutedRef.current) {
            const audioFrame = {
              realtimeInput: {
                audio: {
                  mimeType: "audio/pcm;rate=16000",
                  data: base64Chunk,
                },
              },
            };
            wsRef.current.send(JSON.stringify(audioFrame));
          }
        });

        // Send initial screen grounding silently
        sendScreenContext(pathname);
      };

      ws.onmessage = async (event) => {
        try {
          let data: any;
          if (typeof event.data === "string") {
            data = JSON.parse(event.data);
          } else if (event.data instanceof Blob) {
            const text = await event.data.text();
            data = JSON.parse(text);
          } else if (event.data instanceof ArrayBuffer) {
            const text = new TextDecoder().decode(event.data);
            data = JSON.parse(text);
          }

          if (!data) return;

          // Handle server content (audio playback, transcripts, interruption)
          if (data.serverContent) {
            const sc = data.serverContent;

            // Handle Barge-In Interruption
            if (sc.interrupted) {
              streamer.stopPlayback();
              setAgentState("listening");
            }

            // Live Audio Chunk Playback
            if (sc.modelTurn && Array.isArray(sc.modelTurn.parts)) {
              for (const part of sc.modelTurn.parts) {
                if (part.inlineData && part.inlineData.data) {
                  setAgentState("speaking");
                  streamer.playAudioChunk(part.inlineData.data);
                }
              }
            }

            // Live Agent Speech Output Transcription
            if (sc.outputTranscription && sc.outputTranscription.text) {
              const textChunk = sc.outputTranscription.text;
              setTranscripts((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === "agent") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, text: last.text + textChunk },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: Math.random().toString(),
                    speaker: "agent",
                    text: textChunk,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ];
              });
            }

            // Live User Speech Input Transcription
            if (sc.inputTranscription && sc.inputTranscription.text) {
              const textChunk = sc.inputTranscription.text;
              lastUserUtterance.current = (lastUserUtterance.current || "") + textChunk;
              setTranscripts((prev) => {
                const last = prev[prev.length - 1];
                if (last && last.speaker === "user") {
                  return [
                    ...prev.slice(0, -1),
                    { ...last, text: last.text + textChunk },
                  ];
                }
                return [
                  ...prev,
                  {
                    id: Math.random().toString(),
                    speaker: "user",
                    text: textChunk,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ];
              });
            }

            // Turn complete
            if (sc.turnComplete) {
              setAgentState("listening");
            }
          }

          // Handle Tool Calls (Function Calling)
          if (data.toolCall && Array.isArray(data.toolCall.functionCalls)) {
            for (const call of data.toolCall.functionCalls) {
              await executeToolCall(call.id, call.name, call.args || {});
            }
          }
        } catch (e) {
          console.warn("Live API message parse error:", e);
        }
      };

      ws.onerror = () => {
        setConnectionState("error");
        setErrorMessage("Voice session disconnected due to network error.");
        disconnectSession();
      };

      ws.onclose = () => {
        disconnectSession();
      };
    } catch (err: any) {
      console.error("Failed to start voice session:", err);
      setConnectionState("error");
      setErrorMessage(err?.message || "Could not initialize voice session");
      disconnectSession();
    }
  };

  // Send a typed text chat message through Gemini Live WebSocket
  const sendChatMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    setChatInput("");
    setShowTranscript(true);
    lastUserUtterance.current = trimmed;

    // Add user message to transcript immediately
    setTranscripts((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        speaker: "user",
        text: trimmed,
        timestamp: new Date().toLocaleTimeString(),
      },
    ]);

    // If disconnected, connect first
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      await startVoiceSession();
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      const chatTurn = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text: trimmed }],
            },
          ],
          turnComplete: true,
        },
      };
      wsRef.current.send(JSON.stringify(chatTurn));
      setAgentState("thinking");
    }
  };

  // Toggle voice session
  const toggleVoiceSession = () => {
    if (connectionState === "connected" || connectionState === "connecting") {
      disconnectSession();
    } else {
      startVoiceSession();
    }
  };

  return (
    <>

      {/* Conversational Agent Card (Matching User Screenshots) */}
      <div
        className={`fixed bottom-6 right-6 z-50 flex flex-col rounded-[36px] border border-gray-200/80 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl shadow-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] origin-bottom-right overflow-hidden ${
          cardOpen
            ? isExpanded
              ? "w-[92vw] sm:w-[680px] max-h-[620px] scale-100 opacity-100 translate-y-0 pointer-events-auto"
              : "w-[92vw] sm:w-[370px] max-h-[560px] scale-100 opacity-100 translate-y-0 pointer-events-auto"
            : "scale-90 opacity-0 translate-y-8 pointer-events-none w-[360px] h-0 overflow-hidden"
        }`}
        style={{
          boxShadow:
            "0 25px 60px -15px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Top Controls Bar */}
        <div className="px-6 pt-6 pb-2 flex items-center justify-between gap-2">
          {/* Top Left: Chat Toggle or Back to Orb Button */}
          {showTranscript ? (
            <button
              onClick={() => setShowTranscript(false)}
              className="w-10 h-10 rounded-full flex items-center justify-center shadow-md hover:scale-105 active:scale-95 transition-all overflow-hidden cursor-pointer shrink-0"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, #e2e873 0%, #a3e635 25%, #2dd4bf 55%, #38bdf8 80%, #2563eb 100%)",
              }}
              title="Back to voice orb"
            >
              <div className="w-5 h-5 rounded-full bg-white shadow-sm flex items-center justify-center">
                <ChevronLeft className="w-3.5 h-3.5 text-gray-800" />
              </div>
            </button>
          ) : (
            <button
              onClick={() => setShowTranscript(true)}
              className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors cursor-pointer shrink-0"
              title="Show chat transcript"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          )}

          {/* Top Center: Language Selection Pill (media_1788720003363.png) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setLangMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-50/90 dark:bg-zinc-800/90 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors cursor-pointer shadow-sm"
            >
              <span>{selectedLanguage.flag}</span>
              <span className="text-[11px] font-medium">{selectedLanguage.name}</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </button>
            {langMenuOpen && (
              <div className="absolute top-full mt-1.5 left-1/2 -translate-x-1/2 z-30 w-44 rounded-2xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 shadow-xl py-1 text-xs animate-in fade-in zoom-in-95">
                {SUPPORTED_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    type="button"
                    onClick={() => {
                      setSelectedLanguage(lang);
                      setLangMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2 hover:bg-sky-50 dark:hover:bg-sky-950/40 text-gray-800 dark:text-gray-200 transition-colors"
                  >
                    <span>{lang.flag}</span>
                    <span className="font-medium text-xs">{lang.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Top Right: Minimize Button */}
          <button
            onClick={() => setCardOpen(false)}
            className="w-10 h-10 rounded-full bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 flex items-center justify-center text-gray-600 dark:text-gray-300 transition-colors cursor-pointer shrink-0"
            title="Minimize Voice Agent"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body */}
        <div
          className={`flex-1 overflow-y-auto px-6 py-4 flex flex-col justify-center ${
            isExpanded ? "grid grid-cols-2 gap-6 items-center" : ""
          }`}
        >
          {/* Animated Central Gradient Orb (media_1788720435889.png & media_1788720003363.png) */}
          {(!showTranscript || isExpanded) && (
            <div className="flex flex-col items-center justify-center py-6 space-y-6">
              <div className="relative flex items-center justify-center">
                {/* Dynamic Audio Ripple Glow */}
                <div
                  className="absolute rounded-full filter blur-2xl transition-transform duration-150 pointer-events-none"
                  style={{
                    width: "160px",
                    height: "160px",
                    background:
                      agentState === "speaking"
                        ? "radial-gradient(circle, #38bdf8 0%, #2dd4bf 45%, #a3e635 100%)"
                        : agentState === "listening"
                        ? "radial-gradient(circle, #34d399 0%, #38bdf8 60%, #818cf8 100%)"
                        : "radial-gradient(circle, #38bdf8 0%, #2dd4bf 70%, transparent 100%)",
                    transform: `scale(${1 + micVolume * 0.45 + (agentState === "speaking" ? 0.18 : 0)})`,
                    opacity: 0.6 + micVolume * 0.4,
                  }}
                />

                {/* Clean Ethereal Gradient Sphere */}
                <div
                  onClick={() => {
                    if (connectionState === "disconnected") {
                      startVoiceSession();
                    }
                  }}
                  className={`relative w-48 h-48 rounded-full flex items-center justify-center shadow-2xl transition-transform duration-150 overflow-hidden ${
                    connectionState === "disconnected" ? "cursor-pointer hover:scale-[1.03]" : ""
                  }`}
                  style={{
                    background:
                      "radial-gradient(circle at 35% 30%, #e2e873 0%, #a3e635 25%, #2dd4bf 55%, #38bdf8 80%, #2563eb 100%)",
                    boxShadow:
                      "inset -8px -8px 24px rgba(0,0,0,0.22), inset 8px 8px 20px rgba(255,255,255,0.45), 0 20px 45px rgba(45, 212, 191, 0.25)",
                    transform: `scale(${1 + micVolume * 0.16 + (agentState === "speaking" ? 0.08 : 0)})`,
                  }}
                >
                  {/* Subtle rotating shimmer */}
                  <div
                    className={`absolute inset-0 opacity-30 mix-blend-overlay ${
                      agentState === "thinking"
                        ? "animate-spin"
                        : agentState === "speaking"
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      background:
                        "conic-gradient(from 0deg, transparent 0deg, #facc15 120deg, #38bdf8 240deg, transparent 360deg)",
                    }}
                  />

                  {/* Disconnected state: White circular button with black phone icon (media_1788720003363.png) */}
                  {connectionState === "disconnected" && (
                    <div className="relative z-10 w-14 h-14 rounded-full bg-white shadow-xl flex items-center justify-center hover:scale-105 active:scale-95 transition-transform">
                      <Phone className="w-6 h-6 text-black" />
                    </div>
                  )}
                </div>
              </div>

              {/* Status Text (e.g. "Speaking...", "Listening...") */}
              <div className="text-center px-4">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {connectionState === "disconnected"
                    ? "Discover the capabilities of EDITH Voice Co-Pilot"
                    : muted
                    ? "Microphone Muted"
                    : agentState === "speaking"
                    ? "Speaking..."
                    : agentState === "listening"
                    ? "Listening..."
                    : agentState === "thinking"
                    ? "Thinking..."
                    : "Listening..."}
                </span>
              </div>
            </div>
          )}

          {/* Live Conversation Stream (Smoothly animated & scrollable) */}
          {(showTranscript || isExpanded) && (
            <div className="flex flex-col h-[340px] rounded-3xl border border-gray-100 dark:border-zinc-800 bg-gray-50/40 dark:bg-zinc-800/30 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 text-xs scroll-smooth">
                {transcripts.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 dark:text-gray-500 p-6 space-y-2">
                    <Sparkles className="w-6 h-6 text-sky-500 opacity-60 animate-pulse" />
                    <p className="font-medium text-sm text-gray-600 dark:text-gray-300">
                      Conversation transcript ready
                    </p>
                    <p className="text-xs leading-relaxed max-w-[220px]">
                      Say "Show pricing", "Change agent name to Rakesh", or type a message below.
                    </p>
                  </div>
                ) : (
                  transcripts.map((t) => (
                    <div
                      key={t.id}
                      className={`flex flex-col transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${
                        t.speaker === "agent"
                          ? "items-start"
                          : t.speaker === "user"
                          ? "items-end"
                          : "items-center"
                      }`}
                    >
                      {t.speaker === "agent" ? (
                        <div className="max-w-[88%] bg-[#f4f4f5] dark:bg-zinc-800 text-gray-900 dark:text-white rounded-[24px] p-4 text-[13px] leading-relaxed shadow-sm">
                          {t.text}
                        </div>
                      ) : t.speaker === "user" ? (
                        <div className="max-w-[82%] bg-white dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-200 dark:border-zinc-700 rounded-[22px] px-4 py-2.5 text-[13px] shadow-sm">
                          {t.text}
                        </div>
                      ) : (
                        <div className="max-w-[90%] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 rounded-2xl px-3.5 py-1.5 text-[11px] font-medium text-center">
                          {t.text}
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={transcriptsEndRef} />
              </div>
            </div>
          )}
        </div>

        {/* Card Footer: "Or send a message..." Input Bar + Black Mic Button + Cut Call Button */}
        <div className="px-6 pb-6 pt-2">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendChatMessage(chatInput);
            }}
            className="flex items-center gap-2.5"
          >
            {/* Rounded Input Capsule */}
            <div className="relative flex items-center rounded-full border border-gray-200 dark:border-zinc-700 bg-gray-50/80 dark:bg-zinc-800/80 px-5 py-3.5 flex-1 shadow-sm focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-500/20 transition-all">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Or send a message..."
                className="w-full bg-transparent text-sm text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none pr-7 font-normal"
              />

              <button
                type="submit"
                disabled={!chatInput.trim()}
                className="absolute right-3.5 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 disabled:opacity-30 transition-colors cursor-pointer"
                title="Send Message"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Circular Black Mic / Talk Button */}
            <button
              type="button"
              onClick={() => {
                if (connectionState === "disconnected") {
                  startVoiceSession();
                } else {
                  toggleMute();
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-all cursor-pointer ${
                muted
                  ? "bg-red-500/15 border-2 border-red-500 text-red-500"
                  : "bg-black dark:bg-zinc-800 hover:bg-gray-900 text-white"
              }`}
              title={
                connectionState === "disconnected"
                  ? "Start voice call"
                  : muted
                  ? "Unmute microphone"
                  : "Mute microphone"
              }
            >
              {connectionState === "disconnected" ? (
                <Phone className="w-5 h-5 text-white" />
              ) : muted ? (
                <MicOff className="w-5 h-5 text-red-500" />
              ) : (
                <Mic className="w-5 h-5 text-white" />
              )}
            </button>

            {/* Dedicated Cut Call / Hang Up Button */}
            {connectionState !== "disconnected" && (
              <button
                type="button"
                onClick={disconnectSession}
                className="w-12 h-12 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shrink-0 shadow-lg active:scale-95 transition-all cursor-pointer"
                title="Cut call / End session"
              >
                <PhoneOff className="w-5 h-5 text-white" />
              </button>
            )}
          </form>
        </div>
      </div>

      {/* Minimized Floating Pill (Matching User Screenshot media_1788720243249.png) */}
      <div
        className={`fixed bottom-6 right-6 z-40 flex items-center gap-3 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          cardOpen
            ? "scale-90 opacity-0 pointer-events-none"
            : "scale-100 opacity-100 pointer-events-auto"
        }`}
      >
        {errorMessage && (
          <div className="px-3.5 py-2 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs shadow-lg animate-in fade-in">
            {errorMessage}
          </div>
        )}

        <div
          onClick={() => {
            setCardOpen(true);
            if (connectionState === "disconnected") {
              startVoiceSession();
            }
          }}
          className="rounded-full border border-gray-200/90 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl px-4 py-2.5 flex items-center gap-3.5 shadow-xl hover:shadow-2xl cursor-pointer hover:scale-[1.03] active:scale-95 transition-all duration-200"
          style={{
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.15)",
          }}
        >
          {/* Small Animated Gradient Sphere */}
          <div
            className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center shadow-md transition-transform duration-150 overflow-hidden"
            style={{
              background:
                "radial-gradient(circle at 35% 30%, #e2e873 0%, #a3e635 25%, #2dd4bf 55%, #38bdf8 80%, #2563eb 100%)",
              transform: `scale(${1 + micVolume * 0.25 + (agentState === "speaking" ? 0.1 : 0)})`,
            }}
          >
            {connectionState === "connecting" ? (
              <RefreshCw className="w-4 h-4 text-white animate-spin" />
            ) : connectionState === "disconnected" ? (
              <Phone className="w-4 h-4 text-black/80" />
            ) : null}
          </div>

          {/* Text labels: Voice chat / Speaking... (media_1788720243249.png) */}
          <div className="flex flex-col pr-1">
            <span className="text-sm font-semibold text-gray-900 dark:text-white leading-tight">
              Voice chat
            </span>
            <span className="text-xs font-medium text-sky-500 leading-tight">
              {muted
                ? "Muted"
                : agentState === "speaking"
                ? "Speaking..."
                : agentState === "listening"
                ? "Listening..."
                : connectionState === "connecting"
                ? "Connecting..."
                : "Click to talk"}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
