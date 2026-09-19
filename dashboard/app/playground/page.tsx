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
  Plus,
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
                    <span className="text-orange-400 font-bold">•</span>
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

function FloatingRobotMascot() {
  const [imgLoaded, setImgLoaded] = useState(false);

  return (
    <div className="relative group cursor-pointer select-none">
      {/* Soft warm ambient radial glow (Amber / Orange & Emerald) */}
      <div className="absolute -inset-6 rounded-full bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-emerald-500/15 blur-2xl opacity-60 group-hover:opacity-100 transition-opacity pointer-events-none" />

      {/* Mascot Container: Loads transparent PNG with instant SVG backup */}
      <div className="relative w-28 h-36 sm:w-32 sm:h-40 md:w-36 md:h-44 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
        {/* Transparent PNG from user screenshot */}
        <img
          src="/ai-mascot-transparent.png"
          alt="AI Mascot"
          onLoad={() => setImgLoaded(true)}
          className={`w-full h-full object-contain filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.7)] transition-opacity duration-300 ${
            imgLoaded ? "opacity-100" : "opacity-0 absolute"
          }`}
        />

        {/* Crisp Vector SVG (Matches screenshot geometry exactly, renders instantly with zero background) */}
        {!imgLoaded && (
          <svg
            viewBox="0 0 160 180"
            className="w-full h-full filter drop-shadow-[0_12px_24px_rgba(255,107,0,0.3)]"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient id="robotBodyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="60%" stopColor="#F5F5F7" />
                <stop offset="100%" stopColor="#E2E3E8" />
              </linearGradient>
              <linearGradient id="robotTitaniumGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#555866" />
                <stop offset="100%" stopColor="#2A2C35" />
              </linearGradient>
              <linearGradient id="headBezelGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="100%" stopColor="#E0E2EC" />
              </linearGradient>
            </defs>

            {/* Left Wing / Arm */}
            <path
              d="M 44 88 C 28 92 18 116 20 138 C 22 148 30 152 38 144 C 48 132 54 112 52 94 Z"
              fill="url(#robotTitaniumGrad)"
            />

            {/* Right Wing / Arm */}
            <path
              d="M 116 88 C 132 92 142 116 140 138 C 138 148 130 152 122 144 C 112 132 106 112 108 94 Z"
              fill="url(#robotTitaniumGrad)"
            />

            {/* White Torso / Shield Body */}
            <path
              d="M 46 88 C 46 88 80 88 114 88 C 122 106 122 135 106 156 C 94 170 80 176 80 176 C 80 176 66 170 54 156 C 38 135 38 106 46 88 Z"
              fill="url(#robotBodyGrad)"
            />

            {/* Body 3 Dots (...) */}
            <circle cx="68" cy="116" r="3.5" fill="#20222A" />
            <circle cx="80" cy="116" r="3.5" fill="#20222A" />
            <circle cx="92" cy="116" r="3.5" fill="#20222A" />

            {/* Vent bar */}
            <rect x="70" y="130" width="20" height="4" rx="2" fill="#20222A" />

            {/* Left Ear / Headphone */}
            <rect x="30" y="44" width="16" height="26" rx="8" fill="url(#robotTitaniumGrad)" />

            {/* Right Ear / Headphone */}
            <rect x="114" y="44" width="16" height="26" rx="8" fill="url(#robotTitaniumGrad)" />

            {/* Neck */}
            <rect x="71" y="78" width="18" height="12" rx="3" fill="#A0A5B5" />

            {/* Head Bezel */}
            <rect
              x="42"
              y="22"
              width="76"
              height="58"
              rx="18"
              fill="url(#headBezelGrad)"
              stroke="#D2D6E2"
              strokeWidth="1.5"
            />

            {/* Head Screen */}
            <rect x="48" y="28" width="64" height="46" rx="13" fill="#0A0C14" />

            {/* Left Eye (Smiling Curve) */}
            <path
              d="M 58 48 C 60 41 68 41 70 48"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />

            {/* Right Eye (Smiling Curve) */}
            <path
              d="M 82 48 C 84 41 92 41 94 48"
              stroke="#FFFFFF"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>

      {/* Online indicator */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0d0d12]/95 border border-orange-500/30 text-[9px] font-bold text-orange-300 shadow-lg whitespace-nowrap">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
        <span>ONLINE</span>
      </div>
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

  // Quick Action Menu (from + button)
  const [isQuickMenuOpen, setIsQuickMenuOpen] = useState<boolean>(false);

  // Side Panel & UI Controls
  const [isSidePanelOpen, setIsSidePanelOpen] = useState<boolean>(false);
  const [activeSideTab, setActiveSideTab] = useState<"params" | "history">("params");
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState<boolean>(false);

  // Chat conversation state
  const [inputMessage, setInputMessage] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isComposerFocused, setIsComposerFocused] = useState<boolean>(false);
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

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentModel =
    PLAYGROUND_MODELS.find((m) => m.id === selectedModelId) || PLAYGROUND_MODELS[0];

  // Copy helper
  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Clear Chat History
  const handleClearHistory = () => {
    setMessages([]);
    setIsQuickMenuOpen(false);
  };

  // Update Persona & System Prompt
  const handleSelectPersona = (p: PersonaPreset) => {
    setSelectedPersona(p);
    setSystemPrompt(p.systemPrompt);
  };

  // 1-Click Operational Role Assignment
  const handleAssignToRole = async () => {
    setIsAssigningRole(true);
    setAssignRoleMsg("");
    try {
      const res = await fetch("/api/v1/brain/assign-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: targetRole,
          model_id: currentModel.id,
        }),
      });

      if (res.ok) {
        setAssignRoleMsg(`✅ Assigned ${currentModel.name} to ${targetRole}!`);
        setTimeout(() => setAssignRoleMsg(""), 4000);
      } else {
        setAssignRoleMsg("❌ Failed to update model role mapping");
      }
    } catch {
      setAssignRoleMsg("❌ Network error assigning role");
    } finally {
      setIsAssigningRole(false);
    }
  };

  // Upgrade Prompt with AI (using fast NVIDIA NIM endpoint)
  const handleUpgradePrompt = async () => {
    const raw = inputMessage.trim();
    if (!raw) {
      setUpgradeNotice("Please write a draft prompt to upgrade!");
      setTimeout(() => setUpgradeNotice(""), 3000);
      return;
    }

    setIsUpgradingPrompt(true);
    setUpgradeNotice("✨ Upgrading prompt via NVIDIA AI...");

    try {
      const res = await fetch("/api/v1/brain/upgrade-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: raw,
          model_id: currentModel.id,
          target_category: activeFeature,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.upgraded_prompt) {
          setInputMessage(data.upgraded_prompt);
          setUpgradeNotice(`✨ Prompt upgraded by ${data.model_used.split("/").pop()}!`);
          setTimeout(() => setUpgradeNotice(""), 3500);
        }
      } else {
        setUpgradeNotice("⚠️ Could not upgrade prompt with AI.");
        setTimeout(() => setUpgradeNotice(""), 3000);
      }
    } catch {
      setUpgradeNotice("⚠️ Network error while upgrading prompt.");
      setTimeout(() => setUpgradeNotice(""), 3000);
    } finally {
      setIsUpgradingPrompt(false);
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  // Save Parameters to .env
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
    <div className="relative min-h-[calc(100vh-4rem)] flex flex-col bg-[#07070B] text-white overflow-x-hidden selection:bg-orange-500/30 selection:text-orange-200">
      {/* Ambient Warm Obsidian Glow (Orange & Amber warmth, zero blue/pink) */}
      <div
        className="pointer-events-none absolute inset-0 z-0 opacity-70"
        style={{
          background:
            "radial-gradient(circle at 50% 8%, rgba(255, 107, 0, 0.14) 0%, rgba(25, 18, 12, 0.4) 38%, rgba(7, 7, 11, 0.95) 75%, #07070B 100%)",
        }}
      />

      {/* ========================================================================= */}
      {/* Top Header Bar: Liquid Glass Model Selector & Navigation                  */}
      {/* ========================================================================= */}
      <header className="relative z-20 flex items-center justify-between px-3 sm:px-6 py-3 border-b border-white/10 bg-[#07070B]/80 backdrop-blur-2xl">
        {/* Left: Liquid Glass Model Selector Pill */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
            className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-xs sm:text-sm font-medium transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] group"
          >
            <span className="w-5 h-5 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center text-xs">
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
              <span className="hidden sm:inline-block px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Google
              </span>
            )}
          </button>

          {/* Liquid Glass Model Dropdown Menu */}
          {isModelDropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-72 sm:w-80 rounded-2xl bg-[#0f1015]/95 backdrop-blur-2xl border border-white/15 shadow-[0_16px_40px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.15)] p-2 z-50 max-h-[70vh] overflow-y-auto">
              <div className="px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-orange-400">
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
                      ? "bg-orange-500/20 text-orange-300 font-semibold border border-orange-500/30"
                      : "text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  <div className="truncate">
                    <div className="truncate font-medium">{m.name}</div>
                    <div className="text-[10px] text-zinc-500">{m.latencyEst} · {m.pricingLabel}</div>
                  </div>
                  {selectedModelId === m.id && <Check className="w-3.5 h-3.5 text-orange-400 flex-shrink-0" />}
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
                      ? "bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30"
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

        {/* Center: Dual-Brain Studio Status */}
        <div className="hidden md:flex items-center gap-2 text-xs font-medium text-zinc-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#10b981]" />
          <span className="text-zinc-200 font-semibold">Dual-Brain Testing Studio</span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-300 font-mono">{currentModel.contextLimit} Context</span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {messages.length > 0 && (
            <button
              onClick={handleClearHistory}
              title="Start New Chat"
              className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
              <span className="hidden sm:inline">New Test</span>
            </button>
          )}

          <button
            onClick={() => {
              setActiveSideTab("history");
              setIsSidePanelOpen(true);
            }}
            title="View Test History"
            className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-zinc-400 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-zinc-300" />
            <span className="hidden sm:inline">History</span>
          </button>

          <button
            onClick={() => {
              setActiveSideTab("params");
              setIsSidePanelOpen(true);
            }}
            className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.2)]"
          >
            <Sliders className="w-3.5 h-3.5 text-orange-400" />
            <span>Parameters</span>
            <span className="text-[10px] text-orange-300 font-mono">T:{temperature}</span>
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* Main Center Area: Messages / Empty State Mascot                           */}
      {/* ========================================================================= */}
      <main className="relative z-10 flex-1 flex flex-col max-w-4xl w-full mx-auto px-3 sm:px-6 pt-4 pb-48">
        {messages.length === 0 ? (
          /* Empty State: Dark Theme with Warm Amber/White/Green Accents */
          <div className="flex-1 flex flex-col items-center justify-center text-center py-8 sm:py-12 my-auto">
            {/* Title Greeting */}
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-6">
              HI Operator{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-amber-200 to-white">
                Ready to Achieve Great Things?
              </span>
            </h1>

            {/* Centered 2D Transparent Mascot with Floating Liquid Glass Speech Bubbles */}
            <div className="relative my-4 flex items-center justify-center">
              {/* Left Speech Bubble */}
              <div className="hidden sm:flex absolute -left-36 md:-left-44 top-2 items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-xs text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)] animate-pulse">
                <span>🤖</span>
                <span>Hey there! Need a boost?</span>
              </div>

              {/* Floating 2D Mascot */}
              <FloatingRobotMascot />

              {/* Right Speech Bubble */}
              <div className="hidden sm:flex absolute -right-36 md:-right-48 bottom-4 items-center gap-1.5 px-3.5 py-1.5 rounded-2xl bg-white/[0.08] backdrop-blur-xl border border-white/15 text-xs text-zinc-100 shadow-[0_8px_32px_rgba(0,0,0,0.6)]">
                <span className="text-emerald-400">⚡</span>
                <span className="text-emerald-300 font-medium">NVIDIA Zero-Cost Ready</span>
              </div>
            </div>

            {/* Model Capabilities Pill */}
            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/15 text-xs text-zinc-300 shadow-md">
              <span className="text-white font-semibold">{currentModel.name}</span>
              <span className="text-zinc-600">·</span>
              <span className="text-zinc-300">{currentModel.contextLimit} Context</span>
              <span className="text-zinc-600">·</span>
              <span className={currentModel.isFree ? "text-emerald-400 font-bold" : "text-orange-400 font-bold"}>
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
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400 flex-shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[88%] sm:max-w-[80%] rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed backdrop-blur-xl ${
                    msg.role === "user"
                      ? "bg-gradient-to-r from-orange-600/30 via-amber-600/25 to-orange-500/30 border border-orange-500/40 text-white shadow-[0_4px_20px_rgba(255,107,0,0.2)]"
                      : "bg-[#101116]/90 border border-white/10 text-zinc-200 shadow-[0_8px_30px_rgba(0,0,0,0.7),inset_0_1px_1px_rgba(255,255,255,0.08)]"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <RenderMarkdown content={msg.content} />
                  ) : (
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  )}

                  {/* Telemetry Bar for Assistant Turns */}
                  {msg.telemetry && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center gap-2 text-[10px] text-zinc-400">
                      <span className="inline-flex items-center gap-1 font-mono text-cyan-400">
                        <Zap className="w-3 h-3 text-cyan-400" />
                        {msg.telemetry.latency_ms}ms
                      </span>
                      <span className="text-zinc-600">·</span>
                      <span className="font-mono text-zinc-400">
                        {msg.telemetry.tokens.prompt_tokens} in / {msg.telemetry.tokens.completion_tokens} out
                      </span>
                      <span className="text-zinc-600">·</span>
                      {msg.telemetry.pricing.is_free_nvidia ? (
                        <span className="font-bold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">
                          $0.00 Free
                        </span>
                      ) : (
                        <span className="font-mono text-white">
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
                          <Copy className="w-3 h-3 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.role === "user" && (
                  <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-zinc-200 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {isGenerating && (
              <div className="flex gap-3 items-center text-xs text-orange-400 pl-1">
                <RefreshCw className="w-4 h-4 animate-spin text-orange-400" />
                <span>Generating response from {currentModel.name}...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </main>

      {/* ========================================================================= */}
      {/* Floating Liquid Glass Composer (Exact Reference Screenshots 1 & 2)        */}
      {/* ========================================================================= */}
      <div className="fixed bottom-0 left-0 right-0 z-30 px-3 sm:px-6 pb-4 pt-2 bg-gradient-to-t from-[#07070B] via-[#07070B]/95 to-transparent pointer-events-none">
        <div className="max-w-3xl mx-auto space-y-2 pointer-events-auto">
          {/* Notification Banner for Prompt Upgrade */}
          {upgradeNotice && (
            <div className="text-center text-xs font-semibold text-orange-300 bg-[#16120e]/90 border border-orange-500/40 rounded-xl py-1 px-3 shadow-md animate-fadeIn">
              {upgradeNotice}
            </div>
          )}

          {/* The Liquid Glass Chatbox Container */}
          <div
            className={`relative rounded-3xl sm:rounded-[28px] bg-[#111217]/85 backdrop-blur-2xl border transition-all duration-300 shadow-[0_16px_50px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.14)] ${
              isComposerFocused || isGenerating
                ? "border-orange-500/60 shadow-[0_0_35px_rgba(255,107,0,0.25)]"
                : "border-white/15 hover:border-white/25"
            }`}
          >
            {/* Top Glowing Electric Orange Plasma Wave Beam (Active state from screenshot) */}
            <div
              className={`absolute -top-[1px] left-0 right-0 h-[2px] overflow-visible pointer-events-none transition-opacity duration-300 ${
                isComposerFocused || isGenerating || inputMessage.trim().length > 0
                  ? "opacity-100"
                  : "opacity-40"
              }`}
            >
              {/* Left corner orange neon accent (matching screenshot top-left rim) */}
              <div className="absolute top-0 left-0 w-28 h-6 rounded-tl-3xl sm:rounded-tl-[28px] border-t-2 border-l-2 border-[#ff6b00] shadow-[0_0_15px_#ff6b00]" />

              {/* Electric Plasma Lightning Wave across the top */}
              <svg
                className="absolute -top-[8px] left-8 sm:left-14 right-0 w-[calc(100%-2rem)] sm:w-[calc(100%-3.5rem)] h-5 pointer-events-none overflow-visible"
                preserveAspectRatio="none"
                viewBox="0 0 400 20"
              >
                <defs>
                  <filter id="plasma-glow-box" x="-20%" y="-50%" width="140%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur1" />
                    <feMerge>
                      <feMergeNode in="blur1" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <linearGradient id="plasmaGradBox" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ff7b00" stopOpacity="1" />
                    <stop offset="35%" stopColor="#ff9900" stopOpacity="0.9" />
                    <stop offset="70%" stopColor="#ff5500" stopOpacity="0.85" />
                    <stop offset="100%" stopColor="#ff3300" stopOpacity="0.2" />
                  </linearGradient>
                  <linearGradient id="plasmaCoreBox" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                    <stop offset="30%" stopColor="#ffebaa" stopOpacity="0.9" />
                    <stop offset="75%" stopColor="#ff8800" stopOpacity="0.7" />
                    <stop offset="100%" stopColor="#ff4400" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                {/* Wavy Electric Beam */}
                <path
                  d="M 0 10 Q 30 6, 65 13 T 130 8 T 200 12 T 270 7 T 340 12 L 400 10"
                  fill="none"
                  stroke="url(#plasmaGradBox)"
                  strokeWidth="3.5"
                  filter="url(#plasma-glow-box)"
                />
                {/* Bright white/gold electric core */}
                <path
                  d="M 0 10 Q 30 8, 65 12 T 130 9 T 200 11 T 270 8 T 340 11 L 400 10"
                  fill="none"
                  stroke="url(#plasmaCoreBox)"
                  strokeWidth="1.2"
                />
              </svg>
            </div>

            {/* Quick Action Popup Menu (when + is clicked) */}
            {isQuickMenuOpen && (
              <div className="absolute bottom-full left-3 mb-3 w-56 rounded-2xl bg-[#14151c]/95 backdrop-blur-2xl border border-white/15 p-2 shadow-2xl z-40 space-y-1 animate-fadeIn">
                <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                  Quick Actions
                </div>
                <button
                  onClick={() => {
                    setInputMessage("Voice greeting inquiry");
                    setIsQuickMenuOpen(false);
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <Mic className="w-3.5 h-3.5 text-orange-400" />
                  <span>Realtime Voice Mode</span>
                </button>
                <button
                  onClick={() => {
                    setInputMessage("Lead Rajesh (+91 98001 23456) asks: Can you give 35% discount on 500kg wholesale order?");
                    setIsQuickMenuOpen(false);
                    if (textareaRef.current) textareaRef.current.focus();
                  }}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-zinc-200 hover:text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Load Wholesale Deal</span>
                </button>
                <button
                  onClick={handleClearHistory}
                  className="w-full text-left px-2.5 py-1.5 rounded-xl text-xs text-red-300 hover:text-red-200 hover:bg-red-500/20 flex items-center gap-2 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5 text-red-400" />
                  <span>Clear Current Chat</span>
                </button>
              </div>
            )}

            {/* Inner Content Padding */}
            <div className="p-3 sm:p-4">
              {/* Top Row inside composer: Model Tier / Role / Telemetry Pill */}
              <div className="flex items-center justify-between pb-2 text-[10px] sm:text-xs text-zinc-400 border-b border-white/5">
                <div className="flex items-center gap-1.5">
                  <span className="text-orange-400">⚡</span>
                  <span className="font-semibold text-zinc-200">
                    {currentModel.name}
                  </span>
                  <span className="text-zinc-600">|</span>
                  <span className="text-zinc-400">{selectedPersona.name}</span>
                </div>

                {currentModel.isFree ? (
                  <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/30 text-[9px]">
                    NVIDIA Zero-Cost Key ($0.00)
                  </span>
                ) : (
                  <span className="text-orange-300 font-semibold text-[10px]">
                    Google Gemini API
                  </span>
                )}
              </div>

              {/* Textarea Input (Placeholder: "Chat with Suba" / "Chat with Friday & EDITH...") */}
              <div className="pt-2">
                <textarea
                  ref={textareaRef}
                  value={inputMessage}
                  onFocus={() => setIsComposerFocused(true)}
                  onBlur={() => setIsComposerFocused(false)}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  rows={2}
                  placeholder="Chat with Friday & EDITH... ask to negotiate wholesale deals, check policies, or test latency"
                  className="w-full bg-transparent border-0 resize-none text-xs sm:text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-0 leading-relaxed font-sans"
                />
              </div>

              {/* Bottom Action Row (Matching screenshot exact controls: Left Plus Button + Pill Capsule) */}
              <div className="flex items-center justify-between pt-2.5 border-t border-white/5 mt-1">
                {/* Left Action Controls: Circular Plus Button + Dynamic Feature Pills */}
                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-[65%] sm:max-w-[70%]">
                  {/* Circular '+' Glass Button (Exact look from screenshot) */}
                  <button
                    type="button"
                    onClick={() => setIsQuickMenuOpen(!isQuickMenuOpen)}
                    title="Quick Tools & Attachments"
                    className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/[0.08] hover:bg-white/[0.15] active:scale-95 border border-white/15 flex items-center justify-center text-white/90 hover:text-white transition-all shadow-sm flex-shrink-0 ${
                      isQuickMenuOpen ? "bg-white/20 text-white rotate-45" : ""
                    }`}
                  >
                    <Plus className="w-4 h-4 sm:w-5 sm:h-5 transition-transform" />
                  </button>

                  {/* Dynamic Model Feature Pills */}
                  {currentModel.features.map((feat) => (
                    <button
                      key={feat}
                      onClick={() => setActiveFeature(feat)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[10px] sm:text-xs font-medium transition-all flex-shrink-0 ${
                        activeFeature === feat
                          ? "bg-orange-500/20 text-orange-300 border border-orange-500/40 font-semibold shadow-[0_0_12px_rgba(255,107,0,0.25)]"
                          : "bg-white/[0.04] text-zinc-400 hover:text-white border border-white/5 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span>{feat}</span>
                    </button>
                  ))}
                </div>

                {/* Right Capsule Container: Upgrade Prompt Icon + Liquid Orange Pill Button (Exact Screenshot look) */}
                <div className="flex items-center gap-1.5 p-1 bg-black/60 backdrop-blur-xl border border-white/10 rounded-full shadow-inner flex-shrink-0">
                  {/* ✨ AI Prompt Upgrader Button */}
                  <button
                    onClick={handleUpgradePrompt}
                    disabled={isUpgradingPrompt}
                    title="Upgrade prompt with NVIDIA AI"
                    className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 flex items-center gap-1 transition-colors flex-shrink-0"
                  >
                    <Sparkles className={`w-4 h-4 text-orange-400 ${isUpgradingPrompt ? "animate-spin" : ""}`} />
                    <span className="hidden sm:inline text-[11px] font-semibold text-zinc-300">
                      {isUpgradingPrompt ? "Upgrading..." : "Upgrade"}
                    </span>
                  </button>

                  {/* The Liquid Orange Pill Button (Exact look from media_1789828694529.png) */}
                  <button
                    onClick={handleSendMessage}
                    disabled={!inputMessage.trim() || isGenerating}
                    title="Send Query"
                    className={`flex items-center justify-center gap-1.5 px-4 sm:px-5 py-2 rounded-full font-bold text-xs text-white transition-all shadow-[0_4px_18px_rgba(255,85,0,0.45),inset_0_1px_1px_rgba(255,255,255,0.4)] ring-1 ring-white/20 ${
                      inputMessage.trim() && !isGenerating
                        ? "bg-gradient-to-b from-[#ff6b2b] via-[#ff5500] to-[#d43800] hover:brightness-110 active:scale-95 shadow-[0_4px_22px_rgba(255,85,0,0.65)] cursor-pointer"
                        : "bg-gradient-to-b from-[#ff6b2b]/60 to-[#d43800]/60 opacity-60 cursor-not-allowed"
                    }`}
                  >
                    {isGenerating ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                    ) : (
                      <Send className="w-3.5 h-3.5 text-white fill-white/25" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Categorized Test Presets Chips (Beneath Composer in Frosted Liquid Glass) */}
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white/[0.04] hover:bg-white/[0.1] border border-white/10 hover:border-orange-500/40 text-zinc-300 hover:text-white text-[10px] sm:text-xs whitespace-nowrap transition-all flex-shrink-0 shadow-sm"
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
          {/* Backdrop */}
          <div
            onClick={() => setIsSidePanelOpen(false)}
            className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
          />

          {/* Drawer Body in Liquid Glass */}
          <aside className="relative w-full max-w-md bg-[#0e0f14]/95 backdrop-blur-2xl border-l border-white/10 shadow-2xl flex flex-col h-full z-10 animate-slideIn">
            {/* Drawer Header */}
            <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveSideTab("params")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeSideTab === "params"
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      : "text-zinc-400 hover:text-white"
                  }`}
                >
                  ⚙️ Parameters & Roles
                </button>
                <button
                  onClick={() => setActiveSideTab("history")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    activeSideTab === "history"
                      ? "bg-orange-500/20 text-orange-300 border border-orange-500/30"
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
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-950/20 p-4 space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-300 flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-orange-400" /> 1-Click Assign Model to Role
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
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none focus:border-orange-400"
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
                        className="w-full py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white text-xs font-bold transition-all shadow-[0_4px_16px_rgba(255,85,0,0.3)] flex items-center justify-center gap-1.5"
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
                      <Bot className="w-3.5 h-3.5 text-orange-400" /> Persona Presets
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {PERSONA_PRESETS.map((persona) => (
                        <button
                          key={persona.id}
                          onClick={() => handleSelectPersona(persona)}
                          className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                            selectedPersona.id === persona.id
                              ? "border-orange-500 bg-orange-500/15 text-white font-medium"
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
                      className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-zinc-200 focus:outline-none focus:border-orange-400 font-mono resize-none leading-relaxed"
                    />
                  </div>

                  {/* 4. Inference Sliders */}
                  <div className="space-y-4 pt-2 border-t border-white/10">
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-300">
                        <span>Temperature (Creativity)</span>
                        <span className="font-mono text-orange-400">{temperature.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={temperature}
                        onChange={(e) => setTemperature(parseFloat(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
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
                        <span className="font-mono text-orange-400">{maxTokens}</span>
                      </div>
                      <input
                        type="range"
                        min="256"
                        max="4096"
                        step="128"
                        value={maxTokens}
                        onChange={(e) => setMaxTokens(parseInt(e.target.value))}
                        className="w-full accent-orange-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-zinc-300">
                        <span>Request Timeout</span>
                        <span className="font-mono text-orange-400">{timeoutSecs}s</span>
                      </div>
                      <select
                        value={timeoutSecs}
                        onChange={(e) => setTimeoutSecs(parseInt(e.target.value))}
                        className="w-full px-3 py-2 rounded-xl bg-black/50 border border-white/10 text-xs text-white focus:outline-none"
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
                      className="text-[11px] text-orange-400 hover:underline flex items-center gap-1"
                    >
                      + New Chat
                    </button>
                  </div>

                  <div className="space-y-2">
                    {chatHistoryList.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer group"
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
          <RefreshCw className="w-5 h-5 animate-spin text-orange-400 mr-2" />
          Loading Dual-Brain Testing Studio...
        </div>
      }
    >
      <PlaygroundInner />
    </Suspense>
  );
}
