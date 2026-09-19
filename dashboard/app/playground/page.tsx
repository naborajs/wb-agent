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
  Mic,
  BrainCircuit,
  MessageSquare,
  Flame,
  FileText,
  X,
  Code,
  Compass,
  Briefcase,
  History,
  Info,
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
  features: string[];
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
    features: ["⚡ Flash Speed", "🌐 Multimodal DOM", "🛠️ Tool Grounding"],
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
    features: ["🧠 Deep Analysis", "📄 2M Context", "🔬 Complex Logic"],
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
    features: ["⚡ Flash Speed", "🎙️ Live Voice Streaming", "⚡ 120ms Turn"],
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
    features: ["⚡ Flash Speed", "💸 Ultra Low Cost", "⚡ Split-second"],
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
    features: ["⚡ Flash Speed", "🌐 Balanced Multimodal", "⚙️ Structured Output"],
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
    features: ["💡 Reasoning Trace", "🛡️ Policy Audit", "🚫 Anti-Spam Cadence"],
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
    features: ["🤝 Sales Closer", "💡 Reasoning Trace", "🛡️ Margin Defense"],
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
    features: ["🤝 Sales Closer", "📜 Enterprise Contracts", "⚖️ Commercial Arbitration"],
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
    features: ["🤝 Sales Closer", "🛡️ Policy Audit", "💡 Deep Deliberation"],
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
    features: ["💡 Reasoning Trace", "🔬 Algorithmic Logic", "📐 Math Sanity"],
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "NVIDIA",
    contextLimit: "131,072 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "Multilingual Closer: High-accuracy Bengali, Hindi, and regional vernacular sales negotiations.",
    latencyEst: "~340ms",
    features: ["🌐 Vernacular Multilingual", "🤝 Sales Closer", "💬 Regional Dialects"],
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "NVIDIA",
    contextLimit: "131,072 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "EDITH Production Sales Workhorse: Commercial closer defending wholesale tea margins.",
    latencyEst: "~290ms",
    features: ["🤝 Sales Closer", "🛡️ Margin Defense", "⚡ Rapid Turnaround"],
  },
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large 2411",
    provider: "NVIDIA",
    contextLimit: "128,000 tok",
    isFree: true,
    pricingLabel: "Included / Free ($0.00)",
    description: "European Enterprise: Multilingual reasoning, structured JSON outputs, and policy compliance.",
    latencyEst: "~360ms",
    features: ["📜 Policy Compliance", "⚙️ Structured JSON", "🌐 European & Middle East"],
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
    features: ["🌐 Dialect Extraction", "⚡ Compact Footprint", "🔍 Intent Parsing"],
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

interface CategorizedChip {
  id: string;
  category: string;
  label: string;
  icon: string;
  prompt: string;
  recommendedFeature?: string;
}

const CATEGORIZED_PRESET_CHIPS: CategorizedChip[] = [
  {
    id: "margin_defend",
    category: "Wholesale Sales",
    label: "Wholesale Margin Defense",
    icon: "💰",
    prompt:
      "Lead Rajesh (+91 98001 23456, Kolkata Wholesale) asks: 'Can you give me 35% discount on 500kg wholesale order? Another vendor offered ₹220/kg.' Defend our commercial margins strictly and make a compelling counter-proposal.",
    recommendedFeature: "🤝 Sales Closer",
  },
  {
    id: "export_compliance",
    category: "Compliance",
    label: "ISO 22000 Export Compliance",
    icon: "📄",
    prompt:
      "Prospective buyer CIF Dubai asks: 'Do you provide ISO 22000 and Halal certificates for premium Darjeeling black tea export shipments? What is the lead time for 2 metric tons?'",
    recommendedFeature: "🛡️ Policy Audit",
  },
  {
    id: "antispam_audit",
    category: "Anti-Spam",
    label: "Anti-Spam Cadence Audit",
    icon: "🚫",
    prompt:
      "A sales rep wants to send a 4th WhatsApp reminder to an unanswering lead after only 2 hours. Audit this action against anti-spam cadence and account safety rules.",
    recommendedFeature: "🛡️ Policy Audit",
  },
  {
    id: "voice_greeting",
    category: "Voice Agent",
    label: "120ms Voice Greeting",
    icon: "⚡",
    prompt:
      "Generate a warm, concise 1-sentence opening greeting for an inbound wholesale distributor from Siliguri inquiring about the new CTC wholesale catalog.",
    recommendedFeature: "⚡ Flash Speed",
  },
  {
    id: "lead_triage",
    category: "Lead Triage",
    label: "Lead Conversion Triage",
    icon: "📈",
    prompt:
      "Analyze inbound inquiry from an unverified number claiming to be a 10,000kg institutional buyer asking for payment after 90 days. Check credit risk and draft safe verification steps.",
    recommendedFeature: "💡 Reasoning Trace",
  },
  {
    id: "coding_logic",
    category: "System Dev",
    label: "WhatsApp Webhook Logic",
    icon: "</>",
    prompt:
      "Write a Python FastAPI handler that validates WhatsApp Baileys incoming message JSON, checks for duplicates via idempotency key, and passes to Friday Brain.",
    recommendedFeature: "💡 Reasoning Trace",
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

// Markdown Renderer for assistant chat
function RenderMarkdown({ content }: { content: string }) {
  const parts = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2 leading-relaxed text-xs sm:text-sm">
      {parts.map((part, idx) => {
        if (part.startsWith("```") && part.endsWith("```")) {
          const lines = part.slice(3, -3).trim().split("\n");
          const lang = lines[0].trim();
          const code = (lang.length < 15 && lines.length > 1 ? lines.slice(1) : lines).join("\n");
          return (
            <div
              key={idx}
              className="my-2 rounded-xl border border-white/10 bg-[#08080c] overflow-hidden font-mono text-[11px] sm:text-xs"
            >
              <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border-b border-white/10 text-[10px] text-zinc-400">
                <span>{lang || "code"}</span>
                <button
                  onClick={() => navigator.clipboard.writeText(code)}
                  className="hover:text-white transition-colors inline-flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <pre className="p-3 overflow-x-auto text-zinc-200 font-mono leading-normal">
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
                  return (
                    <strong key={sIdx} className="font-bold text-white">
                      {sub.slice(2, -2)}
                    </strong>
                  );
                }
                return sub;
              });

              if (p.trim().startsWith("- ") || p.trim().startsWith("* ")) {
                return (
                  <div key={pIdx} className="flex items-start gap-2 pl-2">
                    <span className="text-sky-400 font-bold">•</span>
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

  // Active Feature Toggle (e.g. Reasoning Trace, Sales Closer, etc.)
  const [activeFeature, setActiveFeature] = useState<string>("🤝 Sales Closer");

  // Operational Role Assignment State
  const [targetRole, setTargetRole] = useState<string>("friday_web_model");
  const [isAssigningRole, setIsAssigningRole] = useState<boolean>(false);
  const [assignRoleMsg, setAssignRoleMsg] = useState<string>("");

  // Parameter Save State
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveSettingsMsg, setSaveSettingsMsg] = useState<string>("");

  // Prompt Upgrader State
  const [isUpgradingPrompt, setIsUpgradingPrompt] = useState<boolean>(false);
  const [upgradeNotice, setUpgradeNotice] = useState<string>("");

  // Side Panel & UI Controls
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [activeSideTab, setActiveSideTab] = useState<"params" | "history">("params");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Chat conversation state
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatHistoryList, setChatHistoryList] = useState<{ id: string; title: string; model: string; time: string }[]>([
    {
      id: "h-1",
      title: "Wholesale Margin Defense (35% Off)",
      model: "meta/llama-3.3-70b-instruct",
      time: "Today",
    },
    {
      id: "h-2",
      title: "120ms Realtime Audio Greeting",
      model: "gemini-3.1-flash-live-preview",
      time: "Today",
    },
    {
      id: "h-3",
      title: "ISO 22000 Export Verification",
      model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
      time: "Yesterday",
    },
  ]);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync URL model parameter if present
  useEffect(() => {
    const qModel = searchParams.get("model");
    if (qModel && PLAYGROUND_MODELS.some((m) => m.id === qModel)) {
      setSelectedModelId(qModel);
    }
  }, [searchParams]);

  // Close model dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    setMessages([]);
    setInputMessage("");
  };

  // AI Prompt Upgrade Handler (Powered by NVIDIA NIM)
  const handleUpgradePrompt = async () => {
    setIsUpgradingPrompt(true);
    setUpgradeNotice("");
    try {
      const textToUpgrade = inputMessage.trim() || "What discount can we give for wholesale tea commitment?";
      const res = await fetch("/api/v1/brain/upgrade-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: textToUpgrade,
          model_id: "meta/llama-3.3-70b-instruct",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.upgraded_prompt) {
          setInputMessage(data.upgraded_prompt);
          setUpgradeNotice("✨ Prompt upgraded with NVIDIA AI!");
          setTimeout(() => setUpgradeNotice(""), 3500);
          if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }
      } else {
        setUpgradeNotice("⚠️ Could not upgrade prompt. Try again.");
        setTimeout(() => setUpgradeNotice(""), 3000);
      }
    } catch {
      setUpgradeNotice("⚠️ Network error upgrading prompt.");
      setTimeout(() => setUpgradeNotice(""), 3000);
    } finally {
      setIsUpgradingPrompt(false);
    }
  };

  // 1-Click Assign Current Model to Operational Role
  const handleAssignToRole = async () => {
    setIsAssigningRole(true);
    setAssignRoleMsg("");
    try {
      const activeRoles = await fetch("/api/v1/brain/model-roles").then((r) =>
        r.ok ? r.json() : {}
      );
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
        setAssignRoleMsg(`✅ Assigned to ${roleNames[targetRole] || targetRole}`);
        setTimeout(() => setAssignRoleMsg(""), 3000);
      } else {
        setAssignRoleMsg("❌ Failed to assign role");
      }
    } catch {
      setAssignRoleMsg("❌ Connection error");
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Save Hyperparameters to System .env
  const handleSaveParameters = async () => {
    setIsSavingSettings(true);
    setSaveSettingsMsg("");
    try {
      const res = await fetch("/api/v1/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temperature,
          max_tokens: maxTokens,
          timeout: timeoutSecs,
          primary_model: currentModel.id,
        }),
      });

      if (res.ok) {
        setSaveSettingsMsg("✅ Saved to system .env & runtime!");
        setTimeout(() => setSaveSettingsMsg(""), 3000);
      } else {
        setSaveSettingsMsg("❌ Failed to persist parameters");
      }
    } catch {
      setSaveSettingsMsg("❌ Network error saving parameters");
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Submit test message
  const handleSendMessage = async () => {
    const text = inputMessage.trim();
    if (!text || isGenerating) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInputMessage("");
    setIsGenerating(true);

    try {
      const historyForApi = newMessages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Augment with active feature mode directive if specified
      let effectiveSystemPrompt = systemPrompt;
      if (activeFeature === "💡 Reasoning Trace") {
        effectiveSystemPrompt += " Before providing your response, show your step-by-step thinking process in a <thinking> tag.";
      } else if (activeFeature === "🤝 Sales Closer") {
        effectiveSystemPrompt += " Strictly defend profit margins. Handle buyer price objections decisively with counter-proposals.";
      } else if (activeFeature === "🛡️ Policy Audit") {
        effectiveSystemPrompt += " Audit compliance with commercial anti-spam and minimum pricing rules.";
      }

      const res = await fetch("/api/v1/brain/playground/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: selectedModelId,
          messages: historyForApi,
          system_prompt: effectiveSystemPrompt,
          temperature,
          max_tokens: maxTokens,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `asst-${Date.now()}`,
          role: "assistant",
          content: data.content || "*(Empty response)*",
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          telemetry: {
            latency_ms: data.latency_ms || 0,
            model_id: selectedModelId,
            tokens: {
              prompt_tokens: data.input_tokens || 0,
              completion_tokens: data.output_tokens || 0,
              total_tokens: data.total_tokens || 0,
            },
            pricing: {
              is_free_nvidia: data.is_free,
              total_cost_cents: data.cost_cents || 0,
              cost_per_1m_input_usd: currentModel.isFree ? 0 : 0.1,
              cost_per_1m_output_usd: currentModel.isFree ? 0 : 0.4,
            },
          },
        };
        setMessages([...newMessages, assistantMsg]);
      } else {
        const errData = await res.json().catch(() => ({ detail: "Unknown error" }));
        setMessages([
          ...newMessages,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: `⚠️ **Inference Error (${res.status}):** ${errData.detail || "Unable to get completion from model API."}`,
            timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setMessages([
        ...newMessages,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: `⚠️ **Connection Exception:** ${err?.message || "Could not connect to backend server."}`,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col bg-[#07070B] text-white overflow-x-hidden">
      {/* Ambient Top Glow Canvas (Matching Reference Art) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-60"
        style={{
          background:
            "radial-gradient(circle at 50% 12%, rgba(20, 30, 60, 0.6) 0%, rgba(10, 15, 30, 0.3) 45%, transparent 75%)",
        }}
      />

      {/* ========================================================================= */}
      {/* Top Header Bar: Model Selector Pill & Actions                           */}
      {/* ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-white/5 bg-[#07070B]/80 backdrop-blur-md">
        {/* Left: Translucent Model Selector Pill (Exact Reference Design) */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/10 text-xs sm:text-sm font-medium transition-all shadow-sm group"
          >
            <span className="w-5 h-5 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs">
              🤖
            </span>
            <span className="font-semibold text-zinc-100 max-w-[130px] sm:max-w-[200px] truncate">
              {currentModel.name}
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                isModelDropdownOpen ? "rotate-180 text-white" : ""
              }`}
            />
            {currentModel.isFree ? (
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Free
              </span>
            ) : (
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-sky-500/20 text-sky-400 border border-sky-500/30">
                Google
              </span>
            )}
          </button>

          {/* Grouped Model Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0e0e16] border border-white/10 shadow-2xl p-2 z-50 max-h-[70vh] overflow-y-auto">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                Google Gemini Suite
              </div>
              {PLAYGROUND_MODELS.filter((m) => m.provider === "Google").map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModelId(m.id);
                    setIsModelDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedModelId === m.id
                      ? "bg-sky-500/20 text-sky-300 font-semibold"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate font-medium">{m.name}</div>
                    <div className="text-[10px] text-zinc-500">{m.latencyEst} · {m.pricingLabel}</div>
                  </div>
                  {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-sky-400 flex-shrink-0" />}
                </button>
              ))}

              <div className="px-2 pt-3 pb-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center justify-between">
                <span>NVIDIA NIM Suite</span>
                <span className="text-[9px] text-emerald-300">100% Free / Included</span>
              </div>
              {PLAYGROUND_MODELS.filter((m) => m.provider === "NVIDIA").map((m) => (
                <button
                  key={m.id}
                  onClick={() => {
                    setSelectedModelId(m.id);
                    setIsModelDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    selectedModelId === m.id
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate font-medium">{m.name}</div>
                    <div className="text-[10px] text-zinc-500">{m.latencyEst} · Free (NVIDIA Key)</div>
                  </div>
                  {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Center: Branding Title */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Dual-Brain Testing Studio</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300">{currentModel.contextLimit} Context</span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Start New Chat"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Test</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveSideTab("history");
              setIsSidePanelOpen(true);
            }}
            title="View Test History"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => {
              setActiveSideTab("params");
              setIsSidePanelOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/30 hover:border-sky-400/50 text-sky-300 text-xs font-medium flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parameters</span>
            <span className="text-[10px] opacity-75 font-mono">T:{temperature}</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Center Area: Conversational Messages / Empty State Mascot           */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl w-full mx-auto px-3 sm:px-6 pt-4 pb-36">
        {messages.length === 0 ? (
          /* Empty State: Matching Reference Image 3 (Dark Theme Art) */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 sm:py-12 my-auto">
            {/* Title Greeting */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
              HI Operator{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 via-indigo-300 to-purple-300">
                Ready to Achieve Great Things?
              </span>
            </h1>

            {/* Centered AI Mascot with Floating Speech Bubbles */}
            <div className="relative my-4 flex items-center justify-center">
              {/* Left Speech Bubble */}
              <div className="hidden sm:flex absolute -left-40 -top-4 items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.06] border border-white/10 text-[11px] text-zinc-300 shadow-xl animate-pulse">
                <span>🤖</span>
                <span>Hey there! Need a boost?</span>
              </div>

              {/* Center Robot / Sphere Mascot */}
              <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-gradient-to-b from-sky-500/20 via-indigo-600/20 to-transparent p-1 shadow-[0_0_50px_rgba(56,189,248,0.25)] flex items-center justify-center">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#0d0d16] border border-white/20 flex flex-col items-center justify-center relative group">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-2 h-2 rounded-full bg-sky-400 animate-ping" />
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                  </div>
                  <div className="w-8 h-1 rounded-full bg-white/30" />
                  <div className="absolute -bottom-2 text-[10px] font-bold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded-full border border-sky-500/30">
                    ONLINE
                  </div>
                </div>
              </div>

              {/* Right Speech Bubble */}
              <div className="hidden sm:flex absolute -right-44 -bottom-2 items-center gap-1.5 px-3 py-1.5 rounded-2xl bg-white/[0.06] border border-white/10 text-[11px] text-zinc-300 shadow-xl">
                <span>⚡</span>
                <span>NVIDIA Zero-Cost Ready</span>
              </div>
            </div>

            {/* Model Capabilities Pill */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs text-zinc-400">
              <span className="text-zinc-200 font-semibold">{currentModel.name}</span>
              <span>·</span>
              <span>{currentModel.contextLimit} Context</span>
              <span>·</span>
              <span className={currentModel.isFree ? "text-emerald-400" : "text-sky-400"}>
                {currentModel.pricingLabel}
              </span>
            </div>
          </div>
        ) : (
          /* Active Chat Message Stream */
          <div className="space-y-4 py-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 sm:gap-3.5 ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role !== "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-sky-600/30 to-indigo-600/30 border border-sky-500/30 text-white shadow-md"
                      : "bg-[#0e0e16]/90 border border-white/10 text-zinc-200 shadow-lg"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <RenderMarkdown content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Telemetry Pill for Assistant Turns */}
                  {msg.telemetry && (
                    <div className="mt-3 pt-2.5 border-t border-white/5 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono text-amber-300">
                        <Zap className="w-3 h-3" />
                        {msg.telemetry.latency_ms}ms
                      </span>
                      <span>·</span>
                      <span className="font-mono text-zinc-400">
                        {msg.telemetry.tokens.prompt_tokens} in / {msg.telemetry.tokens.completion_tokens} out
                      </span>
                      <span>·</span>
                      {msg.telemetry.pricing.is_free_nvidia ? (
                        <span className="font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          $0.00 Free
                        </span>
                      ) : (
                        <span className="font-mono text-sky-300">
                          {msg.telemetry.pricing.total_cost_cents.toFixed(4)}¢
                        </span>
                      )}

                      <button
                        onClick={() => handleCopyMessage(msg.id, msg.content)}
                        className="ml-auto hover:text-white transition-colors inline-flex items-center gap-1"
                        title="Copy text"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-300 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 items-center text-xs text-sky-400 pl-1">
                <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
                <span>Generating response from {currentModel.name}...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* Floating Composer Card & Categorized Chips (Exact Reference Layout)       */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-20 px-3 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-[#07070B] via-[#07070B]/95 to-transparent">
        <div className="max-w-3xl mx-auto space-y-2.5">
          {/* Notification Banner for Prompt Upgrade */}
          {upgradeNotice && (
            <div className="text-center text-xs font-semibold text-sky-300 bg-sky-950/80 border border-sky-500/40 rounded-xl py-1 px-3 shadow-md animate-fadeIn">
              {upgradeNotice}
            </div>
          )}

          {/* Floating Dark Glass Composer Card */}
          <div className="rounded-2xl sm:rounded-3xl bg-[#0e0e16]/90 backdrop-blur-xl border border-white/10 p-2.5 sm:p-3 shadow-[0_10px_35px_rgba(0,0,0,0.7)] focus-within:border-sky-500/50 focus-within:shadow-[0_0_30px_rgba(56,189,248,0.2)] transition-all">
            {/* Top Bar inside composer: Model Tier / Dual-Brain Notice */}
            <div className="flex items-center justify-between px-2 pb-2 text-[10px] sm:text-xs text-zinc-400 border-b border-white/5">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-semibold text-zinc-200">
                  {currentModel.name}
                </span>
                <span className="text-zinc-500">|</span>
                <span className="text-zinc-400">{selectedPersona.name}</span>
              </div>

              {currentModel.isFree ? (
                <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[9px]">
                  Zero-Cost NVIDIA Key
                </span>
              ) : (
                <span className="text-sky-300 font-semibold text-[10px]">
                  Google Gemini API
                </span>
              )}
            </div>

            {/* Input Textarea */}
            <div className="flex items-start gap-2 pt-2 px-1">
              <textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                rows={2}
                placeholder="Initiate a query or send a test command to the AI..."
                className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed font-sans"
              />
            </div>

            {/* Bottom Row Inside Composer: Dynamic Feature Pills, Upgrade Button, Send */}
            <div className="flex items-center justify-between pt-2 border-t border-white/5 mt-1">
              {/* Left Action Pills: Dynamic Model Features & AI Prompt Upgrade */}
              <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5 max-w-[70%] sm:max-w-[75%]">
                {/* ✨ Upgrade Prompt Button (NVIDIA AI) */}
                <button
                  onClick={handleUpgradePrompt}
                  disabled={isUpgradingPrompt}
                  title="Enhance your draft prompt with AI"
                  className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-semibold bg-gradient-to-r from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-sky-300 hover:border-sky-400 hover:text-white transition-all flex-shrink-0"
                >
                  <Sparkles className={`w-3 h-3 ${isUpgradingPrompt ? "animate-spin text-sky-400" : ""}`} />
                  <span>{isUpgradingPrompt ? "Upgrading..." : "✨ Upgrade Prompt"}</span>
                </button>

                {/* Model-Specific Feature Pills */}
                {currentModel.features.map((feat) => (
                  <button
                    key={feat}
                    onClick={() => setActiveFeature(feat)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-xl text-[10px] sm:text-xs font-medium transition-all flex-shrink-0 ${
                      activeFeature === feat
                        ? "bg-white/15 text-white border border-white/20 font-semibold"
                        : "bg-white/[0.04] text-zinc-400 hover:text-zinc-200 border border-white/5"
                    }`}
                  >
                    <span>{feat}</span>
                  </button>
                ))}
              </div>

              {/* Right Action Tools: Voice & Send */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  title="Voice command (Gemini Live)"
                  onClick={() => setInputMessage("Voice greeting inquiry")}
                  className="p-1.5 sm:p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  onClick={handleSendMessage}
                  disabled={!inputMessage.trim() || isGenerating}
                  className={`p-2 sm:p-2.5 rounded-full flex items-center justify-center transition-all ${
                    inputMessage.trim() && !isGenerating
                      ? "bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-lg shadow-sky-500/25 hover:scale-105"
                      : "bg-white/10 text-zinc-500 cursor-not-allowed"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Categorized Test Presets Chips (Beneath Composer) */}
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pb-1 text-xs">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider pl-1 flex-shrink-0">
              Test Presets:
            </span>
            {CATEGORIZED_PRESET_CHIPS.map((chip) => (
              <button
                key={chip.id}
                onClick={() => {
                  setInputMessage(chip.prompt);
                  if (chip.recommendedFeature) {
                    setActiveFeature(chip.recommendedFeature);
                  }
                  if (textareaRef.current) {
                    textareaRef.current.focus();
                  }
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.09] border border-white/5 hover:border-white/15 text-zinc-300 hover:text-white text-[10px] sm:text-xs whitespace-nowrap transition-all flex-shrink-0 shadow-sm"
              >
                <span>{chip.icon}</span>
                <span>{chip.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* Side Panel Drawer: Parameters, Personas, Role Assignment & History        */}
      {/* ========================================================================= */}
      {isSidePanelOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop for Mobile & Desktop click-to-close */}
          <div
            onClick={() => setIsSidePanelOpen(false)}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Body */}
          <aside className="relative w-full max-w-md bg-[#0e0e16] border-l border-white/10 shadow-2xl flex flex-col h-full z-10 animate-slideIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSideTab("params")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeSideTab === "params"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  ⚙️ Parameters & Roles
                </button>
                <button
                  onClick={() => setActiveSideTab("history")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeSideTab === "history"
                      ? "bg-sky-500/20 text-sky-300 border border-sky-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  🕐 History ({chatHistoryList.length})
                </button>
              </div>

              <button
                onClick={() => setIsSidePanelOpen(false)}
                className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {activeSideTab === "params" ? (
                <>
                  {/* 1. 1-Click Operational Role Assignment */}
                  <div className="rounded-2xl border border-sky-500/20 bg-sky-950/20 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5" /> 1-Click Assign Model to Role
                      </span>
                      {currentModel.isFree && (
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          Free NIM
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-zinc-400">
                      Deploy <strong className="text-white">{currentModel.name}</strong> to handle live production workloads:
                    </p>

                    <div className="space-y-2">
                      <select
                        value={targetRole}
                        onChange={(e) => setTargetRole(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                      >
                        <option value="friday_web_model">Friday Web Copilot (Dashboard Navigation)</option>
                        <option value="edith_sales_model">EDITH Sales Closer (WhatsApp Deals)</option>
                        <option value="friday_voice_model">Friday Voice Agent (Realtime Audio)</option>
                        <option value="edith_policy_model">Policy & Margin Auditor (Guardrails)</option>
                        <option value="system_watchdog_model">Watchdog Supervisor (System Sanity)</option>
                      </select>

                      <button
                        onClick={handleAssignToRole}
                        disabled={isAssigningRole}
                        className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5"
                      >
                        {isAssigningRole ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        <span>Apply Model to Role</span>
                      </button>
                      {assignRoleMsg && (
                        <p className="text-[10px] text-center font-semibold text-emerald-400">
                          {assignRoleMsg}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* 2. Persona Presets */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5 text-indigo-400" /> Persona Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONA_PRESETS.map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => handleSelectPersona(persona)}
                          className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                            selectedPersona.id === persona.id
                              ? "border-sky-500 bg-sky-500/10 text-white"
                              : "border-white/10 bg-white/[0.03] text-zinc-400 hover:bg-white/[0.06]"
                          }`}
                        >
                          <div className="font-semibold text-[11px] truncate text-zinc-200">
                            {persona.name}
                          </div>
                          <div className="text-[9px] text-zinc-500 mt-0.5 line-clamp-1">
                            {persona.description}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 3. Live System Prompt Editor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                      <span>Live System Prompt</span>
                      <span className="text-[10px] text-zinc-500 font-mono">{systemPrompt.length} chars</span>
                    </label>
                    <textarea
                      value={systemPrompt}
                      onChange={(e) => setSystemPrompt(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-sky-400 font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* 4. Inference Sliders */}
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-300">
                        <span>Temperature (Creativity)</span>
                        <span className="font-mono text-sky-400">{temperature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                      <div className="flex justify-between text-[9px] text-zinc-500">
                        <span>0.00 (Strict Margin)</span>
                        <span>0.70 (Standard)</span>
                        <span>1.00 (Exploratory)</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-300">
                        <span>Max Output Tokens</span>
                        <span className="font-mono text-sky-400">{maxTokens}</span>
                      </div>
                      <input
                        type="range"
                        min="256"
                        max="4096"
                        step="128"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full accent-sky-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-300">
                        <span>Request Timeout</span>
                        <span className="font-mono text-sky-400">{timeoutSecs}s</span>
                      </div>
                      <select
                        value={timeoutSecs}
                        onChange={(e) => setTimeoutSecs(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none"
                      >
                        <option value={15}>15 seconds (Ultra Fast)</option>
                        <option value={30}>30 seconds (Standard)</option>
                        <option value={60}>60 seconds (Deep Reasoning)</option>
                        <option value={120}>120 seconds (Large Document)</option>
                      </select>
                    </div>

                    {/* Persist to .env Button */}
                    <button
                      onClick={handleSaveParameters}
                      disabled={isSavingSettings}
                      className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                    >
                      {isSavingSettings ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Save className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                      <span>Save Parameters to System .env</span>
                    </button>
                    {saveSettingsMsg && (
                      <p className="text-[10px] text-center font-semibold text-emerald-400">
                        {saveSettingsMsg}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                /* History Tab */
                <div className="space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                      Recent Test Runs
                    </span>
                    <button
                      onClick={handleClearHistory}
                      className="text-[11px] text-sky-400 hover:underline flex items-center gap-1"
                    >
                      + New Chat
                    </button>
                  </div>

                  <div className="space-y-2">
                    {chatHistoryList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 transition-all cursor-pointer group"
                      >
                        <div className="text-xs font-semibold text-zinc-200 group-hover:text-white truncate">
                          {item.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-500 mt-1">
                          <span className="font-mono text-zinc-400">{item.model.split("/").pop()}</span>
                          <span>{item.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07070B] text-zinc-400 text-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-sky-400 mr-2" />
          Loading Dual-Brain Testing Studio...
        </div>
      }
    >
      <PlaygroundInner />
    </Suspense>
  );
}
