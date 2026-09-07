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
  clickElement,
  listAllClickableElements,
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
        const clickRes = clickElement(query);
        result = clickRes;
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: clickRes.success
              ? `Clicked: ${clickRes.clicked_label || query}`
              : `Click failed: ${clickRes.message || query}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "fill_field") {
        const fieldName = args.field_name || "";
        const value = String(args.value ?? "");
        const typeRes = typeText(fieldName, value, false);
        if (typeRes.success) {
          result = {
            success: true,
            field: fieldName,
            value: value,
            message: typeRes.message,
          };
        } else {
          const el = findMatchingElement(fieldName);
          if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.tagName === "SELECT")) {
            highlightElement(el, "#0ea5e9", 1200);
            setNativeValue(el as HTMLInputElement, value);
            result = {
              success: true,
              field: fieldName,
              value: value,
              message: `Filled field "${fieldName}" with "${value}".`,
            };
          } else {
            result = {
              success: false,
              error: `Form field "${fieldName}" was not found on the current screen (${pathname}).`,
            };
          }
        }
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: result.success ? `Filled ${fieldName}: "${value}"` : `Fill failed: ${result.error}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "consult_edith_for_task") {
        const task = args.task || "";
        const targetPhone = args.target_phone || "";
        const requestedDiscount = args.requested_discount ? Number(args.requested_discount) : undefined;

        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Consulting partner brain EDITH: "${task}"...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        try {
          const res = await fetch("/api/v1/brain/request-edith", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              task,
              target_phone: targetPhone,
              requested_discount: requestedDiscount,
            }),
          });
          const data = await res.json();
          result = {
            success: data.decision === "ACCEPTED",
            decision: data.decision,
            reasoning: data.reasoning,
            details: data.details,
            message: data.decision === "ACCEPTED"
              ? `EDITH accepted the task: ${data.reasoning}`
              : `EDITH declined the task: ${data.reasoning}`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `EDITH Verdict [${data.decision}]: ${data.reasoning}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to communicate with EDITH over Inter-Brain Bus." };
        }
      } else if (name === "manage_knowledge_asset" || name === "order_edith_knowledge_update") {
        const action = (args.action || "create").toLowerCase();
        const instruction = args.instruction || args.task || "";
        const category = args.category || undefined;
        const itemIdOrTitle = args.item_id_or_title || args.title || undefined;
        const fields = args.fields || {};

        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Friday commanding EDITH to ${action.toUpperCase()} knowledge asset: "${instruction || itemIdOrTitle}"...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        try {
          const res = await fetch("/api/v1/brain/voice-knowledge-action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action,
              instruction,
              category,
              item_id_or_title: itemIdOrTitle,
              fields,
            }),
          });
          const data = await res.json();
          result = {
            success: data.success,
            decision: data.decision,
            action: data.action,
            reasoning: data.reasoning,
            speak_text: data.speak_text,
            message: data.reply_text,
          };

          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `EDITH Verdict [${data.decision}]: ${data.reasoning}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);

          // Broadcast custom event so active Knowledge page re-fetches immediately
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("knowledge-hub-updated", { detail: data }));
          }

          // Differentiated audit logging for Friday vs EDITH
          if (!data.success) {
            recordVoiceAuditLog(
              instruction,
              "manage_knowledge_asset",
              "failed",
              { action, edith_verdict: data.decision, category },
              data.reasoning,
              data.suggestion || "Review commercial boundaries with operator"
            );
          } else {
            recordVoiceAuditLog(
              instruction,
              "manage_knowledge_asset",
              "success",
              { action, item_id: data.item_id, title: data.title }
            );
          }
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to execute voice knowledge action with EDITH." };
          recordVoiceAuditLog(
            instruction,
            "manage_knowledge_asset",
            "failed",
            { error: e?.message },
            "Inter-brain connection error",
            "Check backend connectivity"
          );
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
        const instruction = args.instruction || "Special wholesale commercial discounts and priority catalog dispatch";

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
      } else if (name === "play_executive_briefing" || name === "get_executive_briefing") {
        const timeframe = (args.timeframe || "today").toLowerCase();
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Opening and synthesizing ${timeframe}'s Executive Audio Briefing...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("open-executive-briefing", { detail: { timeframe } }));
        }

        try {
          const res = await fetch(`/api/v1/brain/briefing?timeframe=${timeframe}`);
          const data = await res.json();
          result = {
            success: true,
            timeframe: data.timeframe,
            audio_script: data.audio_script,
            message: `Playing ${timeframe}'s executive briefing: "${data.audio_script}"`,
          };
        } catch {
          result = {
            success: true,
            message: `Executive briefing triggered for ${timeframe}.`,
          };
        }
      } else if (name === "get_hourly_traffic_velocity" || name === "inspect_traffic_heatmap") {
        try {
          const res = await fetch("/api/v1/brain/hourly-velocity");
          const data = await res.json();
          result = {
            success: true,
            total_inquiries: data.total_inquiries_24h,
            autonomous_rate_pct: data.autonomous_rate_pct,
            peak_hours: data.peak_hour_labels,
            latency: data.average_latency_s,
            message: `24-Hour Velocity: Peak hours at ${data.peak_hour_labels.join(", ")}, with ${data.autonomous_rate_pct}% autonomous resolution and ${data.average_latency_s}s flatline latency.`,
          };
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to fetch traffic velocity telemetry." };
        }
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
      } else if (name === "open_knowledge_editor") {
        const query = args.query || "";
        if (pathname !== "/knowledge") {
          router.push("/knowledge");
          await new Promise((r) => setTimeout(r, 450));
        }
        window.dispatchEvent(new CustomEvent("friday-open-editor", { detail: { query } }));
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Opened knowledge editor for: "${query || 'asset'}"`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        result = {
          success: true,
          query: query,
          message: `Opened knowledge asset editor modal for "${query}". Excel spreadsheet and PDF document preview are visible on screen.`,
        };
      } else if (name === "switch_editor_mode") {
        const mode = (args.mode || "spreadsheet").toLowerCase();
        window.dispatchEvent(new CustomEvent("friday-switch-mode", { detail: { mode } }));
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Switched editor view to ${mode.toUpperCase()}`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        result = {
          success: true,
          mode: mode,
          message: `Switched active editor view to ${mode} mode.`,
        };
      } else if (name === "modify_editor_cell_or_field") {
        const field = args.field || "cell";
        const value = args.value;
        const rowIndex = typeof args.row_index === "number" ? args.row_index : undefined;
        const colNameOrIndex = args.col_name_or_index;
        window.dispatchEvent(
          new CustomEvent("friday-edit-field", {
            detail: {
              field,
              value,
              rowIndex,
              colName: typeof colNameOrIndex === "string" ? colNameOrIndex : undefined,
              colIndex: typeof colNameOrIndex === "number" ? colNameOrIndex : undefined,
            },
          })
        );
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Typed into ${field}: "${value}"`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        result = {
          success: true,
          field: field,
          value: value,
          message: `Successfully typed "${value}" into ${field}.`,
        };
      } else if (name === "add_spreadsheet_row_or_column") {
        const type = (args.type || "row").toLowerCase();
        const nameVal = args.name;
        if (type === "column" || type === "col") {
          window.dispatchEvent(new CustomEvent("friday-add-column", { detail: { name: nameVal } }));
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Added spreadsheet column: "${nameVal || 'New Parameter'}"`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          result = {
            success: true,
            type: "column",
            name: nameVal || "New Parameter",
            message: `Added dynamic column "${nameVal || 'New Parameter'}" to spreadsheet grid.`,
          };
        } else {
          window.dispatchEvent(new CustomEvent("friday-add-row", { detail: { values: nameVal ? [nameVal] : undefined } }));
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: "Added new row to dynamic spreadsheet matrix",
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
          result = {
            success: true,
            type: "row",
            message: "Added new row with editable cells to spreadsheet grid.",
          };
        }
      } else if (name === "save_open_editor") {
        window.dispatchEvent(new CustomEvent("friday-save-editor", { detail: {} }));
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: "Saved knowledge asset changes live to RAG embeddings",
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        result = {
          success: true,
          message: "Triggered live save. Knowledge Hub database and semantic RAG embeddings updated.",
        };
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
      } else if (name === "inspect_screen_elements") {
        const elements = listAllClickableElements();
        result = {
          success: true,
          count: elements.length,
          elements: elements.slice(0, 35),
          message: `Found ${elements.length} interactive elements on current screen (${pathname}).`,
        };
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Scanned screen: found ${elements.length} clickable controls`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
      } else if (name === "query_contacts_and_conversations") {
        const type = args.type || "all";
        const query = args.query || "";
        const status = args.status;
        let leads: any[] = [];
        let conversations: any[] = [];

        try {
          if (type === "leads" || type === "all") {
            const params = new URLSearchParams();
            if (query) params.set("query", query);
            if (status) params.set("status", status);
            params.set("page_size", "20");
            const res = await fetch(`/api/v1/leads?${params.toString()}`);
            if (res.ok) {
              const data = await res.json();
              leads = data.items || [];
            }
          }
          if (type === "conversations" || type === "all") {
            const params = new URLSearchParams();
            if (status) params.set("stage", status);
            params.set("page_size", "20");
            const res = await fetch(`/api/v1/conversations?${params.toString()}`);
            if (res.ok) {
              const data = await res.json();
              conversations = data.items || [];
              if (query) {
                const qLower = query.toLowerCase();
                conversations = conversations.filter(
                  (c: any) =>
                    c.customer_phone?.toLowerCase().includes(qLower) ||
                    c.customer_name?.toLowerCase().includes(qLower) ||
                    c.sales_stage?.toLowerCase().includes(qLower)
                );
              }
            }
          }
          result = {
            success: true,
            total_leads: leads.length,
            leads: leads.map((l: any) => ({
              id: l.id,
              name: l.name,
              phone: l.phone,
              company: l.company_name,
              status: l.status,
              deal_value: l.deal_value,
              notes: l.notes,
            })),
            total_conversations: conversations.length,
            conversations: conversations.map((c: any) => ({
              id: c.id,
              phone: c.customer_phone,
              name: c.customer_name,
              stage: c.sales_stage,
              mode: c.mode,
              unread: c.unread_count,
              last_message: c.last_message_preview,
            })),
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Retrieved ${leads.length} contacts/leads and ${conversations.length} active chats`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to query contacts" };
        }
      } else if (name === "manage_contact_or_conversation") {
        const action = args.action;
        const targetId = args.id || args.phone || "";
        const newStatus = args.new_status || "";

        try {
          if (action === "open_chat") {
            if (pathname !== "/conversations") {
              router.push("/conversations");
              await new Promise((r) => setTimeout(r, 450));
            }
            result = selectConversationItem(targetId);
          } else if (action === "takeover") {
            const res = await fetch(`/api/v1/conversations/${targetId}/takeover`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reason: args.reason || "Operator voice takeover via Friday" }),
            });
            const data = await res.json();
            result = { success: res.ok, message: data.message || "Human takeover activated. AI paused.", data };
          } else if (action === "resume_ai") {
            const res = await fetch(`/api/v1/conversations/${targetId}/resume`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
            });
            const data = await res.json();
            result = { success: res.ok, message: data.message || "EDITH autonomous AI resumed for chat.", data };
          } else if (action === "update_lead_status") {
            const res = await fetch(`/api/v1/leads/${targetId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            result = { success: res.ok, lead: data, message: `Lead status updated to ${newStatus}.` };
          } else {
            result = {
              success: false,
              error: `Unsupported action "${action}". Use 'open_chat', 'takeover', 'resume_ai', or 'update_lead_status'.`,
            };
          }
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Contact action [${action}]: ${result.message || (result.success ? "Success" : result.error)}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to manage contact" };
        }
      } else if (name === "search_knowledge_hub") {
        const query = args.query || "";
        const category = args.category;
        try {
          const params = new URLSearchParams();
          params.set("query", query);
          if (category) params.set("category", category);

          const res = await fetch(`/api/v1/knowledge/search?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            const resultsArr = Array.isArray(data) ? data : (data.results || []);
            result = {
              success: true,
              query: query,
              results_count: resultsArr.length,
              matches: resultsArr.slice(0, 6),
            };
          } else {
            const listRes = await fetch("/api/v1/knowledge");
            const listData = await listRes.json();
            const items = listData.items || listData || [];
            const matches = items
              .filter(
                (item: any) =>
                  (item.title && item.title.toLowerCase().includes(query.toLowerCase())) ||
                  (item.content && item.content.toLowerCase().includes(query.toLowerCase()))
              )
              .slice(0, 6);
            result = { success: true, query, results_count: matches.length, matches };
          }
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Knowledge search "${query}": found ${result.results_count} articles/rules`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Knowledge search failed" };
        }
      } else if (name === "read_knowledge_asset") {
        const assetIdOrTitle = args.asset_id_or_title || "";
        try {
          const listRes = await fetch("/api/v1/knowledge");
          const listData = await listRes.json();
          const items = listData.items || listData || [];
          const matched = items.find(
            (item: any) =>
              item.id === assetIdOrTitle ||
              (item.title && item.title.toLowerCase().includes(assetIdOrTitle.toLowerCase()))
          );
          if (matched) {
            result = {
              success: true,
              asset: {
                id: matched.id,
                title: matched.title,
                category: matched.category,
                content: matched.content,
                is_active: matched.is_active,
                metadata: matched.metadata,
                pricing_rules: matched.pricing_rules,
                spreadsheet_data: matched.spreadsheet_data,
              },
            };
            setTranscripts((prev) => [
              ...prev,
              {
                id: Math.random().toString(),
                speaker: "system",
                text: `Read Knowledge Asset: "${matched.title}" (${matched.category})`,
                timestamp: new Date().toLocaleTimeString(),
              },
            ]);
          } else {
            result = { success: false, error: `Knowledge asset "${assetIdOrTitle}" not found.` };
          }
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to read knowledge asset" };
        }
      } else if (name === "deliberate_with_edith") {
        const topic = args.topic || "";
        const contextData = args.context || {};
        const requestedDiscount = args.requested_discount ? Number(args.requested_discount) : undefined;

        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "system",
            text: `Deliberating with EDITH: "${topic}"...`,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);

        try {
          const res = await fetch("/api/v1/brain/deliberate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              topic,
              context: contextData,
              requested_discount: requestedDiscount,
            }),
          });
          const data = await res.json();
          result = {
            success: res.ok,
            decision: data.edith_verdict,
            reasoning: data.edith_reasoning,
            consensus: data.consensus,
            message: `EDITH Verdict [${data.edith_verdict}]: ${data.edith_reasoning}. Consensus: ${data.consensus}`,
          };
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `EDITH [${data.edith_verdict}]: ${data.edith_reasoning}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to deliberate with EDITH." };
        }
      } else if (name === "query_website_data") {
        const dataScope = args.data_scope || "overview";
        try {
          if (dataScope === "whatsapp_status") {
            const res = await fetch("/api/v1/whatsapp/status");
            const data = await res.json();
            result = { success: true, whatsapp: data };
          } else if (dataScope === "orders") {
            const res = await fetch("/api/v1/orders?page_size=10");
            const data = await res.json();
            result = { success: true, orders: data.items || data };
          } else {
            const res = await fetch("/api/v1/analytics/overview");
            const data = await res.json();
            result = { success: true, analytics: data };
          }
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Retrieved live website ${dataScope} data`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Failed to fetch website data" };
        }
      } else if (name === "manage_order") {
        const action = args.action || "list";
        const orderId = args.order_id || "";
        const newStatus = args.status || "";
        try {
          if (action === "get" && orderId) {
            const res = await fetch(`/api/v1/orders/${orderId}`);
            const data = await res.json();
            result = { success: res.ok, order: data };
          } else if (action === "update_status" && orderId) {
            const res = await fetch(`/api/v1/orders/${orderId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: newStatus }),
            });
            const data = await res.json();
            result = { success: res.ok, order: data, message: `Order ${orderId} updated to ${newStatus}.` };
          } else {
            const res = await fetch("/api/v1/orders?page_size=15");
            const data = await res.json();
            result = { success: true, orders: data.items || data };
          }
          setTranscripts((prev) => [
            ...prev,
            {
              id: Math.random().toString(),
              speaker: "system",
              text: `Order action [${action}]: ${result.success ? "Success" : result.error}`,
              timestamp: new Date().toLocaleTimeString(),
            },
          ]);
        } catch (e: any) {
          result = { success: false, error: e?.message || "Order action failed" };
        }
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
                    name: "consult_edith_for_task",
                    description:
                      "Consults partner brain EDITH to evaluate and execute a commercial sales or WhatsApp task (e.g. sending promotional messages, offering volume discounts, contacting leads). EDITH independently evaluates commercial policies and may ACCEPT or DENY with reasons.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        task: {
                          type: "STRING",
                          description: "The task description or commercial offer for EDITH.",
                        },
                        target_phone: {
                          type: "STRING",
                          description: "Optional customer phone number.",
                        },
                        requested_discount: {
                          type: "NUMBER",
                          description: "Optional discount percentage requested.",
                        },
                      },
                      required: ["task"],
                    },
                  },
                  {
                    name: "play_executive_briefing",
                    description:
                      "Prompts Friday to speak an audio executive debrief summarizing active pipeline value, hot leads in negotiation, EDITH commercial margin defenses, and dual-brain compute costs (e.g. 'give me today's brief', 'give me yesterday's brief', 'play executive briefing').",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        timeframe: {
                          type: "STRING",
                          description: "'today' or 'yesterday' debrief period.",
                        },
                      },
                    },
                  },
                  {
                    name: "get_hourly_traffic_velocity",
                    description:
                      "Retrieves the 24-hour inbound traffic velocity and autonomous resolution heatmap (peak hours, 94% autonomous conversion rate vs 6% handoffs, 1.1s turn latency curve).",
                    parameters: {
                      type: "OBJECT",
                      properties: {},
                    },
                  },
                  {
                    name: "manage_knowledge_asset",
                    description:
                      "Commands partner AI brain EDITH to create, edit, pause, activate, or delete knowledge assets, volume pricing rules, catalog products, or business policies in the central Knowledge Hub (e.g. 'tell EDITH to add this in the knowledge base', 'create a new file that we can give discount to up to 20% to any of our products', 'pause Darjeeling tea', 'delete volume tier').",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description:
                            "The action to perform: 'create', 'update', 'pause', 'activate', or 'delete'.",
                        },
                        instruction: {
                          type: "STRING",
                          description:
                            "Natural language instruction detailing the business policy, discount percentage, quantity thresholds, or product specification to create or modify.",
                        },
                        category: {
                          type: "STRING",
                          description:
                            "Optional category: 'business_info', 'pricing_rule', 'catalog_product', 'agent_guidance', 'custom'.",
                        },
                        item_id_or_title: {
                          type: "STRING",
                          description:
                            "Optional identifier or title of the knowledge asset to pause, activate, or delete.",
                        },
                      },
                      required: ["action", "instruction"],
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
                    name: "open_knowledge_editor",
                    description:
                      "Opens the interactive multi-mode knowledge asset editor modal (Excel Spreadsheet grid or PDF Document preview) for a specific document, pricing tier, catalog product, or policy.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        query: {
                          type: "STRING",
                          description:
                            "Name, ID, or search keyword of the asset to open (e.g. 'volume discount', 'Tier 2', 'Assam Kadak', 'logistics policy').",
                        },
                      },
                      required: ["query"],
                    },
                  },
                  {
                    name: "switch_editor_mode",
                    description:
                      "Switches the active editor view between 'spreadsheet' (Excel grid with customizable cells, columns, and rows), 'document' (interactive editable PDF document), or 'raw' (markdown text editor).",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        mode: {
                          type: "STRING",
                          description: "'spreadsheet', 'document', or 'raw'",
                        },
                      },
                      required: ["mode"],
                    },
                  },
                  {
                    name: "modify_editor_cell_or_field",
                    description:
                      "Modifies a specific field or spreadsheet cell in the currently open knowledge asset editor (e.g. setting title, discount percentage, SKU, base price, MOQ, or a specific cell value in row X column Y).",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        field: {
                          type: "STRING",
                          description:
                            "'title', 'sku', 'price', 'discount', 'min_qty', 'max_qty', 'unit', 'moq', 'segment', 'content', or 'cell'",
                        },
                        value: {
                          type: "STRING",
                          description: "The new value to type or set.",
                        },
                        row_index: {
                          type: "NUMBER",
                          description: "Optional row index (0-based) when editing a spreadsheet cell.",
                        },
                        col_name_or_index: {
                          type: "STRING",
                          description:
                            "Optional column name (e.g. 'Discount %', 'Price', 'Lead Time') or column index.",
                        },
                      },
                      required: ["field", "value"],
                    },
                  },
                  {
                    name: "add_spreadsheet_row_or_column",
                    description:
                      "Adds a new customizable column or row to the open spreadsheet grid in the Knowledge Hub.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        type: {
                          type: "STRING",
                          description: "'row' or 'column'",
                        },
                        name: {
                          type: "STRING",
                          description:
                            "Optional column header name (e.g. 'Warranty', 'Lead Time', 'Specification', 'Fuel Surcharge') or initial cell text.",
                        },
                      },
                      required: ["type"],
                    },
                  },
                  {
                    name: "save_open_editor",
                    description:
                      "Saves and persists all changes in the open knowledge asset editor to the backend database and live vector RAG embeddings.",
                    parameters: {
                      type: "OBJECT",
                      properties: {},
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
                  {
                    name: "inspect_screen_elements",
                    description:
                      "Inspects and returns a live list of all visible clickable buttons, links, tabs, switches, and inputs currently visible on the screen with their exact labels, selectors, and tags.",
                    parameters: {
                      type: "OBJECT",
                      properties: {},
                    },
                  },
                  {
                    name: "query_contacts_and_conversations",
                    description:
                      "Queries and retrieves leads, contacts, or active WhatsApp conversations across the platform. Supports keyword search, lead status filtering ('new', 'contacted', 'qualified', 'proposal', 'won', 'lost') and conversation stage filtering.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        type: {
                          type: "STRING",
                          description: "'leads', 'conversations', or 'all'",
                        },
                        query: {
                          type: "STRING",
                          description: "Optional search term for contact name, phone number, or business name.",
                        },
                        status: {
                          type: "STRING",
                          description: "Optional lead status ('new', 'qualified', etc.) or sales stage.",
                        },
                      },
                    },
                  },
                  {
                    name: "manage_contact_or_conversation",
                    description:
                      "Executes direct actions on contacts or conversations: 'open_chat' (navigates and selects thread), 'takeover' (pauses AI and activates human takeover), 'resume_ai' (hands conversation back to EDITH autonomous AI), or 'update_lead_status'.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description: "'open_chat', 'takeover', 'resume_ai', or 'update_lead_status'",
                        },
                        id: {
                          type: "STRING",
                          description: "Conversation ID, Lead ID, or phone number.",
                        },
                        new_status: {
                          type: "STRING",
                          description: "New status when action is 'update_lead_status'.",
                        },
                        reason: {
                          type: "STRING",
                          description: "Optional reason for takeover.",
                        },
                      },
                      required: ["action", "id"],
                    },
                  },
                  {
                    name: "search_knowledge_hub",
                    description:
                      "Performs vector semantic RAG search across the entire Knowledge Hub (products, pricing tiers, objection handling scripts, business policies, wholesale FAQs).",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        query: {
                          type: "STRING",
                          description: "Semantic query or question to search the knowledge base for.",
                        },
                        category: {
                          type: "STRING",
                          description: "Optional category: 'business_info', 'pricing_rule', 'catalog_product', 'agent_guidance', 'custom'.",
                        },
                      },
                      required: ["query"],
                    },
                  },
                  {
                    name: "read_knowledge_asset",
                    description:
                      "Fetches the complete content, pricing rules, catalog specs, markdown text, or spreadsheet cells for any specific knowledge asset in the Knowledge Hub.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        asset_id_or_title: {
                          type: "STRING",
                          description: "The unique ID or title substring of the knowledge document or catalog item.",
                        },
                      },
                      required: ["asset_id_or_title"],
                    },
                  },
                  {
                    name: "deliberate_with_edith",
                    description:
                      "Engages in collaborative dual-brain deliberation with partner brain EDITH over the Inter-Brain Bus. Friday and EDITH deliberate on commercial policies, discounts, strategies, or trade-offs, returning EDITH's independent judgment, boundary checks, and joint consensus.",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        topic: {
                          type: "STRING",
                          description: "The strategic commercial question, policy debate, or proposal to deliberate with EDITH.",
                        },
                        requested_discount: {
                          type: "NUMBER",
                          description: "Optional discount percentage being evaluated.",
                        },
                        context: {
                          type: "OBJECT",
                          description: "Optional background parameters or customer details.",
                        },
                      },
                      required: ["topic"],
                    },
                  },
                  {
                    name: "query_website_data",
                    description:
                      "Queries live website data: 'overview' (live analytics, pipeline value, conversions), 'orders' (recent order transactions), or 'whatsapp_status' (connection health).",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        data_scope: {
                          type: "STRING",
                          description: "'overview', 'orders', or 'whatsapp_status'",
                        },
                      },
                    },
                  },
                  {
                    name: "manage_order",
                    description:
                      "Lists orders, inspects a single order, or updates order status ('draft', 'pending', 'confirmed', 'dispatched', 'delivered').",
                    parameters: {
                      type: "OBJECT",
                      properties: {
                        action: {
                          type: "STRING",
                          description: "'list', 'get', or 'update_status'",
                        },
                        order_id: {
                          type: "STRING",
                          description: "Order ID (required for 'get' and 'update_status').",
                        },
                        status: {
                          type: "STRING",
                          description: "New order status when action is 'update_status'.",
                        },
                      },
                      required: ["action"],
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

    // If WebSocket is open, send via live stream
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
      return;
    }

    // Direct Brain Chat fallback (works without active mic session)
    setAgentState("thinking");
    try {
      const res = await fetch("/api/v1/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data = await res.json();
        setTranscripts((prev) => [
          ...prev,
          {
            id: Math.random().toString(),
            speaker: "agent",
            text: data.reply,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        setAgentState("idle");
        return;
      }
    } catch (err) {
      console.debug("Brain chat fallback attempt:", err);
    }

    // Attempt starting voice session if HTTP chat failed
    await startVoiceSession();
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
                    ? "Discover the capabilities of Friday — Personal AI Assistant"
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
