"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Send,
  Trash2,
  Copy,
  Check,
  Bot,
  User,
  Sliders,
  Radio,
  Coins,
  ShieldCheck,
  Cpu,
  RefreshCw,
  Terminal,
  ExternalLink,
  ChevronDown,
  Clock,
  CheckCircle,
  AlertCircle,
  Save,
  CheckCheck,
  Settings,
  ArrowRight,
} from "lucide-react";

interface PlaygroundModel {
  id: string;
  name: string;
  provider: "Google" | "NVIDIA";
  contextLimit: string;
  isFree: boolean;
  pricingLabel: string;
  description: string;
  latencyEst: string;
}

const PLAYGROUND_MODELS: PlaygroundModel[] = [
  // Google Gemini Models
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    contextLimit: "1,048,576 tok",
    isFree: false,
    pricingLabel: "$0.10/1M in · $0.40/1M out",
    description: "Friday Flagship: Ultra-fast multimodal reasoning, DOM grounding, and operational execution.",
    latencyEst: "~180ms",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    contextLimit: "2,097,152 tok",
    isFree: false,
    pricingLabel: "$1.25/1M in · $5.00/1M out",
    description: "Deep Frontier: Long-context multi-document contract analysis and technical diagnostics.",
    latencyEst: "~650ms",
  },
  {
    id: "gemini-3.1-flash-live-preview",
    name: "Gemini 3.1 Flash Live",
    provider: "Google",
    contextLimit: "1,048,576 tok",
    isFree: false,
    pricingLabel: "$0.10/1M in · $0.40/1M out",
    description: "Live Voice: Bidirectional 16kHz PCM audio streaming & rapid copilot navigation.",
    latencyEst: "~120ms",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    contextLimit: "1,048,576 tok",
    isFree: false,
    pricingLabel: "$0.05/1M in · $0.20/1M out",
    description: "Ultra-Lightweight: Lowest cost turns for split-second conversational interactions.",
    latencyEst: "~110ms",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    contextLimit: "1,048,576 tok",
    isFree: false,
    pricingLabel: "$0.10/1M in · $0.40/1M out",
    description: "Next-Gen Flash: Balanced multimodal reasoning and structured execution.",
    latencyEst: "~190ms",
  },

  // NVIDIA NIM Models (Included / Free under key)
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron-3 Nano Omni 30B",
    provider: "NVIDIA",
    contextLimit: "32,768 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Cadence Guard: Sub-second cadence checking, anti-spam validation, and price checks.",
    latencyEst: "~220ms",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron-3 Super 120B",
    provider: "NVIDIA",
    contextLimit: "1,048,576 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Frontier Reasoner: High-volume discount formulation & standard WhatsApp proposals.",
    latencyEst: "~420ms",
  },
  {
    id: "nvidia/nemotron-4-340b-instruct",
    name: "Nemotron-4 340B Instruct",
    provider: "NVIDIA",
    contextLimit: "131,072 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Enterprise Closer: High-stakes commercial arbitration and complex supplier agreements.",
    latencyEst: "~490ms",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron-3 Ultra 550B",
    provider: "NVIDIA",
    contextLimit: "131,072 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "EDITH Flagship Closer: Rigorous objection defense, margin enforcement, and counter-offers.",
    latencyEst: "~650ms",
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "NVIDIA",
    contextLimit: "65,536 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Chain-of-Thought Flagship: Deep algorithmic negotiation and mathematical optimization.",
    latencyEst: "~580ms",
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "NVIDIA",
    contextLimit: "32,768 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Multilingual Specialist: Indic languages and international cross-border trade dialects.",
    latencyEst: "~360ms",
  },
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large 2411",
    provider: "NVIDIA",
    contextLimit: "128,000 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Policy & Instruction: Strict margin governance, contract checks, and structured JSON parsing.",
    latencyEst: "~380ms",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    provider: "NVIDIA",
    contextLimit: "32,768 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Dialect Grounding: Compact intent extraction and dialect query parsing.",
    latencyEst: "~260ms",
  },
];

interface PersonaPreset {
  id: string;
  name: string;
  brain: "FRIDAY" | "EDITH" | "WATCHDOG" | "DEV";
  systemPrompt: string;
  description: string;
}

const PERSONA_PRESETS: PersonaPreset[] = [
  {
    id: "friday_copilot",
    name: "Friday Web Copilot",
    brain: "FRIDAY",
    description: "Dashboard executive assistant, UI navigation & operator support",
    systemPrompt:
      "You are Friday, an elite autonomous executive copilot and dashboard navigator for the enterprise WhatsApp business platform. You speak clearly, concisely, and professionally. You assist the operator with business insights, inventory queries, customer escalations, and system actions.",
  },
  {
    id: "edith_closer",
    name: "EDITH Commercial Closer",
    brain: "EDITH",
    description: "High-stakes sales closer, margin defense & counter-proposals",
    systemPrompt:
      "You are EDITH, the flagship commercial closer and revenue negotiator for WhatsApp inbound customers. You handle objections persuasively, protect commercial profit margins strictly, propose volume discounts constructively, and drive buyers toward order confirmation.",
  },
  {
    id: "margin_auditor",
    name: "Policy & Margin Auditor",
    brain: "WATCHDOG",
    description: "Governance, minimum margins & commercial policy safety",
    systemPrompt:
      "You are the commercial policy and margin governance auditor. Your responsibility is to analyze proposals and customer requests against commercial rules, prevent unauthorized discount concessions, audit compliance, and detect fraud.",
  },
  {
    id: "tech_architect",
    name: "Technical Architect",
    brain: "DEV",
    description: "Code architecture, API routing, latency telemetry & debugging",
    systemPrompt:
      "You are the lead systems architect for the dual-brain WhatsApp agent platform. You provide precise, production-grade technical explanations, architectural advice, and code solutions across FastAPI, Baileys, SQLite, and Next.js.",
  },
];

const PRESET_QUERIES = [
  {
    label: "35% Wholesale Discount",
    text: "Lead Rajesh (+91 98001 23456) asks: 'Can you give me 35% off on 500kg wholesale order? Another supplier offered ₹220/kg.' Defend our margins and make a compelling counter-offer.",
  },
  {
    label: "Product Specs & Export",
    text: "Prospective buyer CIF Dubai asks: 'Do you provide ISO 22000 and Halal certificates for premium Darjeeling black tea export shipments?'",
  },
  {
    label: "Anti-Spam Cadence Audit",
    text: "A sales rep wants to send a 4th WhatsApp reminder to an unanswering lead after only 2 hours. Audit this action against anti-spam and account safety rules.",
  },
  {
    label: "Fast Voice Greeting",
    text: "Generate a warm, concise 1-sentence opening greeting for an inbound wholesale distributor from West Bengal inquiring about wholesale catalogue.",
  },
];

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  telemetry?: {
    latency_ms: number;
    model_id: string;
    tokens: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
    pricing: {
      is_free_nvidia: boolean;
      total_cost_cents: number;
      cost_per_1m_input_usd: number;
      cost_per_1m_output_usd: number;
    };
  };
}

// Simple Markdown Renderer for assistant chat
function RenderMarkdown({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 leading-relaxed text-xs">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const lang = lines[0].trim();
          const code = (lang.length < 15 && lines.length > 1 ? lines.slice(1) : lines).join("\n");
          return (
            <div key={idx} className="my-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] overflow-hidden font-mono text-[11px]">
              <div className="flex items-center justify-between px-3 py-1.5 bg-[var(--ed-surface)] border-b border-[var(--ed-border)] text-[10px] text-[var(--ed-text-muted)]">
                <span>{lang || "code"}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-[var(--ed-text-primary)] transition-colors inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-[var(--ed-text-primary)] font-mono leading-normal">
                <code>{code}</code>
              </pre>
            </div>
          );
        }

        const paragraphs = part.split("\n\n");
        return (
          <div key={idx} className="space-y-1.5">
            {paragraphs.map((p, pIdx) => {
              if (!p.trim()) return null;
              const formatted = p.split(/(\*\*.*?\*\*)/g).map((sub, sIdx) => {
                if (sub.startsWith("**") && sub.endsWith("**")) {
                  return <strong key={sIdx} className="font-bold text-[var(--ed-text-primary)]">{sub.slice(2, -2)}</strong>;
                }
                return sub;
              });

              if (p.trim().startsWith("- ") || p.trim().startsWith("* ")) {
                return (
                  <div key={pIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-[var(--ed-accent)] font-bold">•</span>
                    <span>{formatted}</span>
                  </div>
                );
              }

              return <p key={pIdx}>{formatted}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function PlaygroundInner() {
  const searchParams = useSearchParams();
  const initialModel = searchParams.get("model") || "gemini-2.5-flash";

  // Core Model & Generation State
  const [selectedModelId, setSelectedModelId] = useState<string>(initialModel);
  const [selectedPersona, setSelectedPersona] = useState<PersonaPreset>(PERSONA_PRESETS[0]);
  const [systemPrompt, setSystemPrompt] = useState<string>(PERSONA_PRESETS[0].systemPrompt);
  const [temperature, setTemperature] = useState<number>(0.7);
  const [maxTokens, setMaxTokens] = useState<number>(2048);
  const [timeoutSecs, setTimeoutSecs] = useState<number>(60);

  // Operational Role Assignment State
  const [targetRole, setTargetRole] = useState<string>("friday_web_model");
  const [isAssigningRole, setIsAssigningRole] = useState<boolean>(false);
  const [assignRoleMsg, setAssignRoleMsg] = useState<string>("");

  // Parameter Save State
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveSettingsMsg, setSaveSettingsMsg] = useState<string>("");

  // Chat conversation state
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-msg",
      role: "assistant",
      content:
        "Welcome to the **AI Dual-Brain Playground & Model Testing Studio**! You have full interactive freedom to change models, calibrate temperatures and token ceilings, edit system prompts live, and directly assign verified models to operational tasks. Select any Google Gemini or zero-cost NVIDIA NIM model below to begin.",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync URL model parameter if present
  useEffect(() => {
    const qModel = searchParams.get("model");
    if (qModel && PLAYGROUND_MODELS.some((m) => m.id === qModel)) {
      setSelectedModelId(qModel);
    }
  }, [searchParams]);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  // Listen for Friday AI live configuration actions over WebSocket
  useEffect(() => {
    const handleFridayUiAction = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;
      if (!detail) return;

      if (detail.action === "playground_configure") {
        if (detail.model_id && PLAYGROUND_MODELS.some((m) => m.id === detail.model_id)) {
          setSelectedModelId(detail.model_id);
        }
        if (typeof detail.temperature === "number") {
          setTemperature(detail.temperature);
        }
        if (typeof detail.max_tokens === "number") {
          setMaxTokens(detail.max_tokens);
        }
        if (typeof detail.system_prompt === "string" && detail.system_prompt) {
          setSystemPrompt(detail.system_prompt);
        }
      }
    };

    window.addEventListener("friday_ui_action", handleFridayUiAction);
    return () => {
      window.removeEventListener("friday_ui_action", handleFridayUiAction);
    };
  }, []);

  const currentModel =
    PLAYGROUND_MODELS.find((m) => m.id === selectedModelId) || PLAYGROUND_MODELS[0];

  const handleSelectPersona = (persona: PersonaPreset) => {
    setSelectedPersona(persona);
    setSystemPrompt(persona.systemPrompt);
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        content: `Playground cleared. Ready to test **${currentModel.name}** with **${selectedPersona.name}** persona.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ]);
  };

  // 1-Click Assign Current Model to Operational Role
  const handleAssignToRole = async () => {
    setIsAssigningRole(true);
    setAssignRoleMsg("");
    try {
      // First fetch active roles to update only target role
      const activeRoles = await fetch("/api/v1/brain/model-roles").then((r) => r.ok ? r.json() : {});
      const updatedRoles = {
        ...activeRoles,
        [targetRole]: selectedModelId,
      };

      const res = await fetch("/api/v1/brain/model-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedRoles),
      });

      if (res.ok) {
        const roleNames: Record<string, string> = {
          friday_web_model: "Friday Web Copilot",
          edith_sales_model: "EDITH WhatsApp Sales",
          friday_voice_model: "Friday Voice Agent",
          edith_policy_model: "Policy & Margin Auditor",
          system_watchdog_model: "Watchdog Supervisor",
        };
        setAssignRoleMsg(`Applied ${currentModel.name} as ${roleNames[targetRole] || targetRole}!`);
        setTimeout(() => setAssignRoleMsg(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to assign role: ${err.detail || "Server error"}`);
      }
    } catch (e: any) {
      alert(`Network error assigning model role: ${e.message}`);
    } finally {
      setIsAssigningRole(false);
    }
  };

  // 1-Click Save Parameters to Local System .env
  const handleSaveParameters = async () => {
    setIsSavingSettings(true);
    setSaveSettingsMsg("");
    try {
      const payload = {
        primary_model: selectedModelId,
        temperature,
        max_tokens: maxTokens,
        timeout: timeoutSecs,
      };

      const res = await fetch("/api/v1/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSettingsMsg("Settings saved to active system & .env!");
        setTimeout(() => setSaveSettingsMsg(""), 4000);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save settings: ${err.detail || "Server error"}`);
      }
    } catch (e: any) {
      alert(`Network error saving settings: ${e.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || inputMessage;
    if (!promptToSend.trim() || isGenerating) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: promptToSend.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInputMessage("");
    setIsGenerating(true);

    try {
      const payload = {
        model_id: selectedModelId,
        system_prompt: systemPrompt,
        messages: nextMessages
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role, content: m.content })),
        temperature,
        max_tokens: maxTokens,
      };

      const res = await fetch("/api/v1/brain/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Chat generation failed" }));
        throw new Error(errData.detail || `Server error: ${res.status}`);
      }

      const data = await res.json();

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.reply || "No response text received from model.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        telemetry: {
          latency_ms: data.telemetry?.latency_ms ?? 0,
          model_id: data.model_id || selectedModelId,
          tokens: data.telemetry?.tokens || {
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
          },
          pricing: data.telemetry?.pricing || {
            is_free_nvidia: currentModel.isFree,
            total_cost_cents: 0,
            cost_per_1m_input_usd: 0,
            cost_per_1m_output_usd: 0,
          },
        },
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      const errorMessage: ChatMessage = {
        id: `error-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Generation Error**: ${err.message || "Failed to reach model API"}. Please verify your API key in Integrations.`,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-[calc(100vh-5rem)] max-w-7xl mx-auto gap-4 pb-4">
      {/* ============================================================ */}
      {/* LEFT COLUMN: Main Chat & Inference Workspace                */}
      {/* ============================================================ */}
      <div className="flex-1 flex flex-col min-w-0 h-full space-y-3">
        {/* Top Chat Header */}
        <div className="ed-panel rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--ed-accent)]/10 text-[var(--ed-accent)] shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[var(--ed-text-primary)]">
                  {currentModel.name}
                </h2>
                {currentModel.isFree ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    Included / Free ($0.00)
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                    {currentModel.pricingLabel}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[var(--ed-text-muted)] truncate max-w-md">
                {currentModel.description}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/integrations"
              className="ed-press px-2.5 py-1.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[11px] font-semibold text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-all inline-flex items-center gap-1"
            >
              <Radio className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
              Integrations
            </Link>

            <button
              type="button"
              onClick={handleClearHistory}
              className="ed-press px-2.5 py-1.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[11px] font-semibold text-[var(--ed-text-muted)] hover:text-[var(--ed-danger)] transition-all inline-flex items-center gap-1"
              title="Clear chat thread"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          </div>
        </div>

        {/* Chat Message Viewport */}
        <div className="flex-1 ed-panel rounded-2xl p-4 overflow-y-auto space-y-4 min-h-0">
          {messages.map((msg) => {
            const isUser = msg.role === "user";
            return (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-3xl ${isUser ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                {/* Avatar Icon */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                    isUser
                      ? "bg-[var(--ed-accent)] text-white shadow-sm"
                      : "bg-[var(--ed-surface)] border border-[var(--ed-border)] text-purple-400"
                  }`}
                >
                  {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                {/* Message Bubble */}
                <div className={`space-y-1.5 max-w-[85%] ${isUser ? "items-end" : ""}`}>
                  <div
                    className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                      isUser
                        ? "bg-[var(--ed-accent)] text-white shadow-sm"
                        : "bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] shadow-sm"
                    }`}
                  >
                    {isUser ? (
                      <div className="whitespace-pre-wrap font-medium">{msg.content}</div>
                    ) : (
                      <RenderMarkdown content={msg.content} />
                    )}
                  </div>

                  {/* Per-Turn Real Token & Latency Telemetry Pill */}
                  {msg.telemetry && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[10px] font-mono text-[var(--ed-text-muted)]">
                      <span className="px-2 py-0.5 rounded-md bg-[var(--ed-bg)] border border-[var(--ed-border)] inline-flex items-center gap-1 font-semibold text-[var(--ed-text-primary)]">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            msg.telemetry.latency_ms < 1000
                              ? "bg-emerald-500"
                              : msg.telemetry.latency_ms < 3000
                              ? "bg-amber-500"
                              : "bg-rose-500"
                          }`}
                        />
                        ⚡ {msg.telemetry.latency_ms}ms
                      </span>

                      <span className="px-2 py-0.5 rounded-md bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                        📊 {msg.telemetry.tokens.prompt_tokens} in / {msg.telemetry.tokens.completion_tokens} out ({msg.telemetry.tokens.total_tokens} tok)
                      </span>

                      {msg.telemetry.pricing.is_free_nvidia ? (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                          Included / Free ($0.00)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-500 font-bold border border-sky-500/20">
                          {msg.telemetry.pricing.total_cost_cents.toFixed(4)}¢
                        </span>
                      )}

                      <span className="px-1.5 py-0.5 rounded bg-[var(--ed-bg)] text-[9px] text-[var(--ed-text-muted)] truncate max-w-[120px]">
                        {msg.telemetry.model_id}
                      </span>

                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="hover:text-[var(--ed-text-primary)] transition-colors inline-flex items-center gap-0.5 ml-1"
                        title="Copy response"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-500" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {isGenerating && (
            <div className="flex gap-3 max-w-3xl mr-auto animate-pulse">
              <div className="w-7 h-7 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center justify-center shrink-0 text-purple-400">
                <Sparkles className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-[var(--ed-surface)] border border-[var(--ed-border)] text-xs text-[var(--ed-text-muted)] font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[var(--ed-accent)] animate-ping" />
                Inference running on {currentModel.name}...
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reference Prompts */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 shrink-0 no-scrollbar">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)] shrink-0">
            Quick Prompts:
          </span>
          {PRESET_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSendMessage(q.text)}
              disabled={isGenerating}
              className="px-2.5 py-1 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[11px] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] whitespace-nowrap transition-all ed-press shrink-0 disabled:opacity-50"
            >
              {q.label}
            </button>
          ))}
        </div>

        {/* Bottom Message Input Dock */}
        <div className="ed-panel rounded-2xl p-3 shrink-0 space-y-2">
          <div className="flex items-end gap-2">
            <textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask ${currentModel.name} anything as ${selectedPersona.name}... (Press Enter to send, Shift+Enter for new line)`}
              rows={2}
              className="flex-1 p-3 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] text-xs ed-focus-ring resize-none leading-relaxed"
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isGenerating || !inputMessage.trim()}
              className="ed-btn-primary ed-press ed-focus-ring px-4 py-3 rounded-xl font-semibold text-xs shadow-md transition-all disabled:opacity-40 inline-flex items-center justify-center shrink-0"
            >
              {isGenerating ? (
                <RefreshCw className="w-4 h-4 animate-spin text-amber-300" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--ed-text-muted)] font-mono px-1">
            <span>Testing Model: <strong>{currentModel.name}</strong> ({currentModel.latencyEst})</span>
            <span>Shift + Enter for new line · Enter to send</span>
          </div>
        </div>
      </div>

      {/* ============================================================ */}
      {/* RIGHT COLUMN: Playground Studio Controls & Live Settings    */}
      {/* ============================================================ */}
      <div className="w-full lg:w-80 xl:w-96 ed-panel rounded-2xl p-4 overflow-y-auto space-y-5 shrink-0 text-xs">
        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
          <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
            <Sliders className="w-4 h-4 text-[var(--ed-accent)]" />
            Playground Controls & Settings
          </h3>
          <span className="text-[10px] font-mono text-[var(--ed-text-muted)]">Live Config</span>
        </div>

        {/* 1. Model Selector Dropdown */}
        <div className="space-y-1.5">
          <label className="block font-bold text-[var(--ed-text-primary)] text-xs">
            1. Select Model to Test & Calibrate
          </label>
          <select
            value={selectedModelId}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-xs font-semibold ed-focus-ring cursor-pointer"
          >
            <optgroup label="Google Gemini Suite">
              {PLAYGROUND_MODELS.filter((m) => m.provider === "Google").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.pricingLabel})
                </option>
              ))}
            </optgroup>
            <optgroup label="NVIDIA NIM Suite (Zero-Cost / Free Key)">
              {PLAYGROUND_MODELS.filter((m) => m.provider === "NVIDIA").map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} (Free · $0.00)
                </option>
              ))}
            </optgroup>
          </select>

          {/* Model Spec Pills */}
          <div className="grid grid-cols-2 gap-2 pt-1 text-[10px] font-mono">
            <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
              <span className="text-[var(--ed-text-muted)] block">Context Limit</span>
              <span className="font-bold text-[var(--ed-text-primary)]">{currentModel.contextLimit}</span>
            </div>
            <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
              <span className="text-[var(--ed-text-muted)] block">Est Latency</span>
              <span className="font-bold text-emerald-500">{currentModel.latencyEst}</span>
            </div>
          </div>
        </div>

        {/* 2. Operational Role Assignment (1-Click Apply to Dual Brain) */}
        <div className="space-y-2.5 p-3 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)]">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[var(--ed-text-primary)] text-xs flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              Assign Tested Model to Role
            </label>
          </div>
          <p className="text-[11px] text-[var(--ed-text-muted)]">
            Like how <strong>{currentModel.name}</strong> performs? Assign it directly to an operational AI task:
          </p>

          <div className="space-y-2">
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] text-xs font-semibold ed-focus-ring"
            >
              <option value="friday_web_model">Friday Web Copilot (Dashboard Assistant)</option>
              <option value="edith_sales_model">EDITH WhatsApp Sales (Commercial Closer)</option>
              <option value="friday_voice_model">Friday Voice Agent (16kHz PCM Stream)</option>
              <option value="edith_policy_model">Policy & Margin Auditor (Governance)</option>
              <option value="system_watchdog_model">Watchdog Supervisor (Health & Loop Guard)</option>
            </select>

            <button
              type="button"
              onClick={handleAssignToRole}
              disabled={isAssigningRole}
              className="w-full ed-btn-primary ed-press ed-focus-ring py-2 rounded-lg font-semibold text-xs transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {isAssigningRole ? "Applying Role..." : "Apply Model to Role"}
            </button>

            {assignRoleMsg && (
              <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 block text-center">
                {assignRoleMsg}
              </span>
            )}
          </div>
        </div>

        {/* 3. Operational Persona Presets */}
        <div className="space-y-2 pt-1 border-t border-[var(--ed-border)]">
          <label className="block font-bold text-[var(--ed-text-primary)] text-xs">
            3. Persona Presets
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {PERSONA_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSelectPersona(p)}
                className={`p-2 rounded-lg text-left transition-all ed-press ${
                  selectedPersona.id === p.id
                    ? "bg-[var(--ed-accent)] text-white shadow-sm font-bold"
                    : "bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                <div className="text-[11px] truncate">{p.name}</div>
                <div className="text-[9px] opacity-75 truncate">{p.brain}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Live System Prompt Editor */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="font-bold text-[var(--ed-text-primary)] text-xs">
              4. System Prompt (Live Editable)
            </label>
            <span className="text-[10px] text-[var(--ed-text-muted)]">{systemPrompt.length} chars</span>
          </div>
          <textarea
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            rows={4}
            className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-[11px] ed-focus-ring leading-relaxed"
            placeholder="Enter custom instructions or persona prompts..."
          />
        </div>

        {/* 5. Inference Hyperparameters */}
        <div className="space-y-3 pt-1 border-t border-[var(--ed-border)]">
          <label className="block font-bold text-[var(--ed-text-primary)] text-xs">
            5. Hyperparameters
          </label>

          {/* Temperature */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--ed-text-primary)]">Temperature</span>
              <span className="font-mono text-[var(--ed-accent)] font-bold">{temperature.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-[var(--ed-accent)] cursor-pointer"
            />
            <div className="flex justify-between text-[9px] text-[var(--ed-text-muted)]">
              <span>0.0 (Precise / Margin Strict)</span>
              <span>1.0 (Creative)</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--ed-text-primary)]">Max Output Tokens</span>
              <span className="font-mono text-[var(--ed-accent)] font-bold">{maxTokens}</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-[var(--ed-accent)] cursor-pointer"
            />
          </div>

          {/* Request Timeout */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px]">
              <span className="font-semibold text-[var(--ed-text-primary)]">Request Timeout</span>
              <span className="font-mono text-[var(--ed-accent)] font-bold">{timeoutSecs}s</span>
            </div>
            <select
              value={timeoutSecs}
              onChange={(e) => setTimeoutSecs(Number(e.target.value))}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] text-xs font-mono ed-focus-ring"
            >
              <option value={15}>15 seconds (Ultra-Fast)</option>
              <option value={30}>30 seconds (Standard)</option>
              <option value={60}>60 seconds (Deep Reasoning)</option>
              <option value={90}>90 seconds (Ultra 550B / Pro)</option>
              <option value={120}>120 seconds (Maximum)</option>
            </select>
          </div>
        </div>

        {/* 6. Save Parameters to System Runtime & .env */}
        <div className="pt-2 border-t border-[var(--ed-border)] space-y-2">
          <button
            type="button"
            onClick={handleSaveParameters}
            disabled={isSavingSettings}
            className="w-full ed-press ed-focus-ring py-2.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] font-semibold text-xs text-[var(--ed-text-primary)] transition-all inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
            title="Save calibrated parameters directly to active runtime and .env"
          >
            <Save className="w-3.5 h-3.5 text-purple-400" />
            {isSavingSettings ? "Saving Settings..." : "Save Parameters to System .env"}
          </button>

          {saveSettingsMsg && (
            <span className="text-[11px] font-bold text-emerald-500 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 block text-center">
              {saveSettingsMsg}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-[calc(100vh-5rem)]">
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] text-xs text-[var(--ed-text-muted)] font-mono flex items-center gap-2">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[var(--ed-accent)]" />
            Loading AI Dual-Brain Playground...
          </div>
        </div>
      }
    >
      <PlaygroundInner />
    </Suspense>
  );
}
