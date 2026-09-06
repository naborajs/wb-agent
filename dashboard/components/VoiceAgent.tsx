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
  AlertTriangle,
  CheckCircle2,
  Radio,
  RefreshCw,
  Send,
  Zap,
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
} from "./voice/domActions";

type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type AgentState = "idle" | "listening" | "thinking" | "speaking" | "confirming";

interface TranscriptMessage {
  id: string;
  speaker: "user" | "agent" | "system";
  text: string;
  timestamp: string;
}

interface PendingConfirmation {
  actionName: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function VoiceAgent() {
  const pathname = usePathname();
  const router = useRouter();

  // Voice session state
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [agentState, setAgentState] = useState<AgentState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [muted, setMuted] = useState(false);
  const [micVolume, setMicVolume] = useState(0);

  // Transcripts & confirmation
  const [transcripts, setTranscripts] = useState<TranscriptMessage[]>([]);
  const [pendingConfirmation, setPendingConfirmation] = useState<PendingConfirmation | null>(null);

  // References
  const wsRef = useRef<WebSocket | null>(null);
  const streamerRef = useRef<AudioStreamer | null>(null);
  const transcriptsEndRef = useRef<HTMLDivElement>(null);
  const lastDestructiveActionTime = useRef(0);

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
  }, [transcripts]);

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
    setConnectionState("disconnected");
    setAgentState("idle");
    setPendingConfirmation(null);
    setMicVolume(0);
  }, []);

  // Send screen grounding context snapshot
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
                  .join("; ")}. Ground all explanations and actions in this visible context.`,
              },
            ],
          },
        ],
        turnComplete: true,
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
          // Check for destructive actions
          const textLower = (el.textContent || el.getAttribute("aria-label") || "").toLowerCase();
          const isDestructive =
            textLower.includes("delete") ||
            textLower.includes("kill") ||
            textLower.includes("remove") ||
            textLower.includes("send") ||
            textLower.includes("save settings");

          if (isDestructive && !args.confirmed) {
            // Require confirmation
            setAgentState("confirming");
            setPendingConfirmation({
              actionName: `Click "${el.innerText?.trim() || query}"`,
              description: `Are you sure you want to trigger this action?`,
              onConfirm: () => {
                highlightElement(el, "#eab308", 1200);
                el.click();
                setPendingConfirmation(null);
                setAgentState("listening");
              },
              onCancel: () => {
                setPendingConfirmation(null);
                setAgentState("listening");
              },
            });

            result = {
              success: false,
              requires_confirmation: true,
              message: `Requested confirmation from operator before clicking "${query}".`,
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
          // ALWAYS requires confirmation
          setAgentState("confirming");
          setPendingConfirmation({
            actionName: `Send WhatsApp to ${target}`,
            description: `Message: "${message}"`,
            onConfirm: async () => {
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
                    text: `WhatsApp message sent to ${target}`,
                    timestamp: new Date().toLocaleTimeString(),
                  },
                ]);
              } catch (e) {
                console.error("WhatsApp voice send failed:", e);
              } finally {
                setPendingConfirmation(null);
                setAgentState("listening");
              }
            },
            onCancel: () => {
              setPendingConfirmation(null);
              setAgentState("listening");
            },
          });

          result = {
            success: true,
            requires_verbal_confirmation: true,
            message: `Awaiting operator spoken or visual confirmation before dispatching message to ${target}.`,
          };
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

        setAgentState("confirming");
        setPendingConfirmation({
          actionName: `Send AI Promo to ${recipientName} (${targetPhone})`,
          description: `Nemotron will draft and dispatch WhatsApp message: "${instruction}"`,
          onConfirm: async () => {
            setPendingConfirmation(null);
            setAgentState("thinking");
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
              }
            } catch (err) {
              console.error("Promo dispatch failed:", err);
            } finally {
              setAgentState("listening");
            }
          },
          onCancel: () => {
            setPendingConfirmation(null);
            setAgentState("listening");
          },
        });

        result = {
          success: true,
          requires_verbal_confirmation: true,
          message: `Awaiting operator confirmation before asking Nemotron to send promotional message to ${targetPhone}.`,
        };
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

        setAgentState("confirming");
        setPendingConfirmation({
          actionName: "Clarification Needed",
          description: question + (options.length > 0 ? ` (Options: ${options.join(", ")})` : ""),
          onConfirm: () => {
            setPendingConfirmation(null);
            setAgentState("listening");
          },
          onCancel: () => {
            setPendingConfirmation(null);
            setAgentState("listening");
          },
        });

        result = {
          success: true,
          question: question,
          options: options,
          message: `Presented clarification question to operator: "${question}".`,
        };
      } else {
        result = { success: false, error: `Unknown tool function: ${name}` };
      }
    } catch (err: any) {
      result = { success: false, error: err?.message || String(err) };
    }

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
        if (!isMobile) setPanelOpen(true);

        // Send Setup Frame with tools and system prompt
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
                      "Sends a real customer-facing WhatsApp message. ALWAYS requires verbal or visual operator confirmation before executing.",
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
                ],
              },
            ],
          },
        };

        ws.send(JSON.stringify(setupMessage));

        // Start microphone recording
        await streamer.startRecording((base64Chunk) => {
          if (ws.readyState === WebSocket.OPEN && !muted) {
            const audioFrame = {
              realtimeInput: {
                mediaChunks: [
                  {
                    mimeType: "audio/pcm;rate=16000",
                    data: base64Chunk,
                  },
                ],
              },
            };
            ws.send(JSON.stringify(audioFrame));
          }
        });

        // Send initial screen grounding
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

            // Model Turn Parts
            if (sc.modelTurn && Array.isArray(sc.modelTurn.parts)) {
              for (const part of sc.modelTurn.parts) {
                // Audio chunk playback
                if (part.inlineData && part.inlineData.data) {
                  setAgentState("speaking");
                  streamer.playAudioChunk(part.inlineData.data);
                }

                // Text transcript from model
                if (part.text && part.text.trim()) {
                  setTranscripts((prev) => {
                    const last = prev[prev.length - 1];
                    if (last && last.speaker === "agent") {
                      return [
                        ...prev.slice(0, -1),
                        { ...last, text: last.text + part.text },
                      ];
                    }
                    return [
                      ...prev,
                      {
                        id: Math.random().toString(),
                        speaker: "agent",
                        text: part.text,
                        timestamp: new Date().toLocaleTimeString(),
                      },
                    ];
                  });
                }
              }
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
      {/* Visual Confirmation Dialog for Destructive Actions */}
      {pendingConfirmation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            className="w-full max-w-md p-5 rounded-2xl border border-amber-500/40 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150"
            style={{ background: "var(--ed-surface)" }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/30 shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-[var(--ed-text-primary)]">Confirmation Required</h3>
                <p className="text-xs text-[var(--ed-text-muted)]">Say "Yes" or click Confirm to execute.</p>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-1">
              <div className="text-xs font-bold text-[var(--ed-accent)]">{pendingConfirmation.actionName}</div>
              <div className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
                {pendingConfirmation.description}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                onClick={pendingConfirmation.onCancel}
                className="ed-press px-4 py-2 rounded-xl text-xs font-medium border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-muted)]"
              >
                Cancel
              </button>
              <button
                onClick={pendingConfirmation.onConfirm}
                className="ed-press px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-black flex items-center gap-1.5 shadow-md"
              >
                <CheckCircle2 className="w-4 h-4" />
                Confirm Action
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Live Transcripts Drawer (Suppressed on Mobile per §3) */}
      {!isMobile && panelOpen && connectionState === "connected" && (
        <div
          className="fixed bottom-20 right-6 w-96 max-h-[480px] rounded-2xl border border-[var(--ed-border)] shadow-2xl flex flex-col z-40 overflow-hidden animate-in slide-in-from-bottom-5 duration-200"
          style={{ background: "var(--ed-surface)" }}
        >
          {/* Header */}
          <div
            className="p-3.5 border-b border-[var(--ed-border)] flex items-center justify-between"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center gap-2">
              <div className="relative">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <span className="font-bold text-xs text-[var(--ed-text-primary)]">EDITH Voice Co-Pilot</span>
              <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-500 border border-sky-500/30">
                Gemini 3.1 Flash
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setMuted(!muted)}
                className="p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                title={muted ? "Unmute Mic" : "Mute Mic"}
              >
                {muted ? <MicOff className="w-3.5 h-3.5 text-red-500" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setPanelOpen(false)}
                className="p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Transcript Message Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 min-h-[220px] max-h-[340px] text-xs">
            {transcripts.length === 0 ? (
              <div className="py-12 text-center text-[var(--ed-text-muted)] space-y-2">
                <Sparkles className="w-6 h-6 mx-auto text-[var(--ed-accent)] opacity-60 animate-pulse" />
                <p className="font-medium">Listening to your voice...</p>
                <p className="text-[10px] text-[var(--ed-text-muted)]">
                  Try saying "Show me the pricing rules" or "What are our won deals?"
                </p>
              </div>
            ) : (
              transcripts.map((t) => (
                <div
                  key={t.id}
                  className={`p-2.5 rounded-xl text-xs leading-relaxed ${
                    t.speaker === "agent"
                      ? "bg-sky-500/10 text-[var(--ed-text-primary)] border border-sky-500/20 mr-4"
                      : t.speaker === "user"
                      ? "bg-[var(--ed-bg)] text-[var(--ed-text-primary)] border border-[var(--ed-border)] ml-4"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[11px]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] text-[var(--ed-text-muted)] font-mono mb-1">
                    <span className="font-bold uppercase tracking-wider">
                      {t.speaker === "agent" ? "EDITH" : t.speaker === "user" ? "You" : "Action"}
                    </span>
                    <span>{t.timestamp}</span>
                  </div>
                  <div>{t.text}</div>
                </div>
              ))
            )}
            <div ref={transcriptsEndRef} />
          </div>

          {/* Footer Status Bar */}
          <div
            className="px-3.5 py-2 border-t border-[var(--ed-border)] flex items-center justify-between text-[10px] text-[var(--ed-text-muted)]"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  agentState === "speaking"
                    ? "bg-emerald-500 animate-ping"
                    : agentState === "listening"
                    ? "bg-sky-500 animate-pulse"
                    : agentState === "thinking"
                    ? "bg-amber-500 animate-spin"
                    : "bg-gray-400"
                }`}
              />
              <span className="capitalize font-semibold">{agentState}</span>
            </div>
            <span className="font-mono text-[9px]">Live WebSocket</span>
          </div>
        </div>
      )}

      {/* Persistent Docked Talk Button (Available on Every Page) */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3">
        {/* Connection/Error Tooltip */}
        {errorMessage && (
          <div className="px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 text-xs shadow-lg animate-in fade-in">
            {errorMessage}
          </div>
        )}

        {/* Talk Button */}
        <button
          onClick={toggleVoiceSession}
          disabled={connectionState === "connecting"}
          aria-label={connectionState === "connected" ? "Stop Voice Co-Pilot" : "Start Voice Co-Pilot"}
          className={`relative ed-press group flex items-center justify-center rounded-2xl shadow-2xl transition-all duration-300 ${
            connectionState === "connected"
              ? "w-14 h-14 bg-gradient-to-tr from-sky-500 to-cyan-400 text-white shadow-sky-500/35 ring-4 ring-sky-500/25"
              : connectionState === "connecting"
              ? "w-12 h-12 bg-[var(--ed-surface)] border border-[var(--ed-border)] text-sky-500 animate-pulse"
              : "w-12 h-12 bg-[var(--ed-surface)] border border-[var(--ed-border)] hover:border-sky-500/50 text-[var(--ed-text-muted)] hover:text-sky-500"
          }`}
        >
          {/* Dynamic Audio Level Glow Pulse */}
          {connectionState === "connected" && (
            <span
              className="absolute inset-0 rounded-2xl bg-sky-400/30 pointer-events-none transition-transform duration-75"
              style={{
                transform: `scale(${1 + micVolume * 0.4})`,
                opacity: 0.5 + micVolume * 0.5,
              }}
            />
          )}

          {connectionState === "connecting" ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : connectionState === "connected" ? (
            <Mic className="w-6 h-6 animate-pulse" />
          ) : (
            <Mic className="w-5 h-5 group-hover:scale-110 transition-transform" />
          )}

          {/* Live indicator dot */}
          {connectionState === "connected" && (
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-[var(--ed-surface)]" />
            </span>
          )}
        </button>

        {/* Desktop transcript expander toggle button */}
        {!isMobile && connectionState === "connected" && !panelOpen && (
          <button
            onClick={() => setPanelOpen(true)}
            className="ed-press p-2.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] shadow-lg"
            title="Open Transcripts"
          >
            <Sparkles className="w-4 h-4 text-sky-500" />
          </button>
        )}
      </div>
    </>
  );
}
