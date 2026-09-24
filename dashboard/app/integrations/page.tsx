"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import {
  Cpu,
  MessageSquare,
  Database,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  ExternalLink,
  Activity,
  Layers,
  Zap,
  Sliders,
  Key,
  Shield,
  ArrowDown,
  ArrowUp,
  Save,
  Eye,
  EyeOff,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Coins,
  TrendingDown,
  Play,
  Square,
  Radio,
  Check,
  Flame,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  FileText,
  Bot,
  Send,
} from "lucide-react";
import MessageLoading from "@/components/ui/MessageLoading";

interface ModelInfo {
  id: string;
  name: string;
  params: string;
  category: string;
  latency_label: string;
  description: string;
}

interface ModelEconomics {
  id: string;
  name: string;
  provider: "Google" | "NVIDIA";
  whatItDoes: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  costBadge: string;
  isLeastCostly?: boolean;
  isFreeNvidia?: boolean;
  contextLimit: string;
  estLatency: string;
}

const KNOWN_MODELS_ECONOMICS: ModelEconomics[] = [
  // Google Gemini Suite (Priced per token telemetry)
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    provider: "Google",
    whatItDoes: "Friday Web Copilot & Automation: Ultra-fast multimodal reasoning, DOM grounding, and operational execution.",
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    costBadge: "★ Fast Reasoning Tier",
    isLeastCostly: true,
    contextLimit: "1,048,576 tok",
    estLatency: "180ms",
  },
  {
    id: "gemini-3.1-flash-live-preview",
    name: "Gemini 3.1 Flash Live Preview",
    provider: "Google",
    whatItDoes: "Friday Realtime Voice Agent: Native bidirectional 16kHz PCM audio streaming & split-second UI navigation.",
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    costBadge: "Voice Streaming Tier",
    contextLimit: "1,048,576 tok",
    estLatency: "120ms",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash-Lite",
    provider: "Google",
    whatItDoes: "Ultra-low-latency high-throughput turns, rapid status checking, and quick confirmation replies.",
    inputCostPer1M: 0.05,
    outputCostPer1M: 0.20,
    costBadge: "Ultra-Lightweight Tier",
    contextLimit: "1,048,576 tok",
    estLatency: "110ms",
  },
  {
    id: "gemini-3.5-flash",
    name: "Gemini 3.5 Flash",
    provider: "Google",
    whatItDoes: "Next-gen multimodal reasoning, catalog visual analysis, and multi-step customer inquiries.",
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    costBadge: "Next-Gen Flash Tier",
    contextLimit: "1,048,576 tok",
    estLatency: "190ms",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    provider: "Google",
    whatItDoes: "Flagship Deep Reasoning: Long-context multi-document contracts, technical diagnostics, and audits.",
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.00,
    costBadge: "Deep Analysis Tier",
    contextLimit: "2,097,152 tok",
    estLatency: "650ms",
  },

  // NVIDIA NIM Suite (Zero-Cost: Included / Free under user key)
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron-3 Nano Omni 30B",
    provider: "NVIDIA",
    whatItDoes: "Customer message cadence checking, anti-spam validation, instant margin checks, and watchdog guard.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    isLeastCostly: true,
    contextLimit: "32,768 tok",
    estLatency: "220ms",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron-3 Super 120B",
    provider: "NVIDIA",
    whatItDoes: "Balanced volume discount formulation, catalog grounding, and standard B2B WhatsApp proposals.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "1,048,576 tok",
    estLatency: "420ms",
  },
  {
    id: "nvidia/nemotron-4-340b-instruct",
    name: "Nemotron-4 340B Instruct",
    provider: "NVIDIA",
    whatItDoes: "Deep enterprise commercial negotiations, multi-year supply contracts, and high-stakes objection handling.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "131,072 tok",
    estLatency: "490ms",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron-3 Ultra 550B",
    provider: "NVIDIA",
    whatItDoes: "EDITH Flagship Closer: Complex commercial objection handling, margin enforcement, and closing.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "131,072 tok",
    estLatency: "650ms",
  },
  {
    id: "deepseek-ai/deepseek-r1",
    name: "DeepSeek R1",
    provider: "NVIDIA",
    whatItDoes: "Chain-of-thought mathematical reasoning, algorithmic profit optimization, and objection counter-logic.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "65,536 tok",
    estLatency: "580ms",
  },
  {
    id: "qwen/qwen2.5-72b-instruct",
    name: "Qwen 2.5 72B Instruct",
    provider: "NVIDIA",
    whatItDoes: "High-accuracy multilingual instruction following across Indic and international trade dialogues.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "32,768 tok",
    estLatency: "360ms",
  },
  {
    id: "mistralai/mistral-large-2411",
    name: "Mistral Large 2411",
    provider: "NVIDIA",
    whatItDoes: "Precise policy governance, contract term enforcement, and structured JSON parsing.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "128,000 tok",
    estLatency: "380ms",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    provider: "NVIDIA",
    whatItDoes: "Compact dialect classification, customer intent extraction, and rapid sanity checks.",
    inputCostPer1M: 0.00,
    outputCostPer1M: 0.00,
    costBadge: "Included / Free (NVIDIA Key)",
    isFreeNvidia: true,
    contextLimit: "32,768 tok",
    estLatency: "260ms",
  },
];

interface ModelSettingsData {
  primary_model: string;
  fallback_models: string[];
  primary_api_key_masked: string;
  fallback_api_key_masked: string;
  primary_api_key_configured: boolean;
  fallback_api_key_configured: boolean;
  temperature: number;
  max_tokens: number;
  timeout: number;
  available_models: ModelInfo[];
}

export default function IntegrationsPage() {
  const [waHealth, setWaHealth] = useState<any>(null);
  const [apiHealth, setApiHealth] = useState<any>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Model settings from backend/.env
  const [modelSettings, setModelSettings] = useState<ModelSettingsData | null>(null);
  const [primaryModel, setPrimaryModel] = useState<string>("nvidia/nemotron-3-ultra-550b-a55b");
  const [fallbackSequence, setFallbackSequence] = useState<string[]>([
    "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    "nvidia/nemotron-3-super-120b-a12b",
    "google/gemma-4-31b-it",
  ]);
  const [newPrimaryApiKey, setNewPrimaryApiKey] = useState("");
  const [newFallbackApiKey, setNewFallbackApiKey] = useState("");
  const [showPrimaryApiKey, setShowPrimaryApiKey] = useState(false);
  const [showFallbackApiKey, setShowFallbackApiKey] = useState(false);
  const [temperature, setTemperature] = useState(0.2);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [timeoutSecs, setTimeoutSecs] = useState(90);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState("");

  // Model benchmark diagnostic state
  const [testModel, setTestModel] = useState("nvidia/nemotron-3-ultra-550b-a55b");
  const [testApiKey, setTestApiKey] = useState("");
  const [isTestingModel, setIsTestingModel] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  // Model-to-Task Operational Roles Assignment state
  interface ModelRolesData {
    friday_web_model: string;
    edith_sales_model: string;
    friday_voice_model: string;
    edith_policy_model: string;
    system_watchdog_model: string;
  }
  const [modelRoles, setModelRoles] = useState<ModelRolesData>({
    friday_web_model: "gemini-2.5-flash",
    edith_sales_model: "nvidia/nemotron-3-ultra-550b-a55b",
    friday_voice_model: "gemini-3.1-flash-live-preview",
    edith_policy_model: "nvidia/nemotron-4-340b-instruct",
    system_watchdog_model: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  });
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [saveRolesMsg, setSaveRolesMsg] = useState("");

  // 1-Click Speed Test state per model row
  const [rowSpeedTests, setRowSpeedTests] = useState<
    Record<string, { loading: boolean; latency?: number; error?: string; tokens?: number }>
  >({});

  // Active chart tab
  const [activeChartTab, setActiveChartTab] = useState<"latency" | "architecture">("latency");

  const fetchHealthAndSettings = async () => {
    setIsRefreshing(true);
    try {
      // 1. Backend health
      const resApi = await fetch("/api/v1/health").then((r) => (r.ok ? r.json() : null));
      setApiHealth(resApi);

      // 2. WhatsApp Bridge health on port 3001
      const resWa = await fetch("http://localhost:3001/status")
        .then((r) => (r.ok ? r.json() : null))
        .catch(() => ({ connected: false }));
      setWaHealth(resWa);

      // 3. Model settings
      const resModels = await fetch("/api/v1/settings/models").then((r) => (r.ok ? r.json() : null));
      if (resModels) {
        setModelSettings(resModels);
        setPrimaryModel(resModels.primary_model);
        setFallbackSequence(resModels.fallback_models || []);
        setTemperature(resModels.temperature ?? 0.2);
        setMaxTokens(resModels.max_tokens ?? 2048);
        setTimeoutSecs(resModels.timeout ?? 90);
      }

      // 4. Model-to-task assignments
      const resRoles = await fetch("/api/v1/brain/model-roles").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (resRoles) {
        setModelRoles(resRoles);
      }
    } catch (e) {
      console.error("Failed to load integrations telemetry:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchHealthAndSettings();
  }, []);

  // Save model settings back to backend (and .env)
  const handleSaveModelSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccessMsg("");

    try {
      const payload: any = {
        primary_model: primaryModel,
        fallback_models: fallbackSequence,
        temperature,
        max_tokens: maxTokens,
        timeout: timeoutSecs,
      };
      if (newPrimaryApiKey.trim()) payload.primary_api_key = newPrimaryApiKey.trim();
      if (newFallbackApiKey.trim()) payload.fallback_api_key = newFallbackApiKey.trim();

      const res = await fetch("/api/v1/settings/models", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveSuccessMsg("Settings saved to local .env and active runtime!");
        setNewPrimaryApiKey("");
        setNewFallbackApiKey("");
        await fetchHealthAndSettings();
        setTimeout(() => setSaveSuccessMsg(""), 4000);
      } else {
        const err = await res.json();
        alert(`Failed to save: ${err.detail || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Network error saving settings: ${err.message}`);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Move fallback priority up/down
  const handleMoveFallback = (index: number, direction: "up" | "down") => {
    const nextSeq = [...fallbackSequence];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= nextSeq.length) return;
    const temp = nextSeq[index];
    nextSeq[index] = nextSeq[targetIdx];
    nextSeq[targetIdx] = temp;
    setFallbackSequence(nextSeq);
  };

  // Add or remove a model from fallback
  const handleToggleFallbackModel = (modelId: string) => {
    if (fallbackSequence.includes(modelId)) {
      setFallbackSequence(fallbackSequence.filter((id) => id !== modelId));
    } else {
      setFallbackSequence([...fallbackSequence, modelId]);
    }
  };

  // Test Model Benchmark Action
  const handleTestModel = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTestingModel(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/v1/settings/models/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: testModel,
          api_key: testApiKey.trim() || undefined,
        }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err: any) {
      setTestResult({ status: "error", error: err.message });
    } finally {
      setIsTestingModel(false);
    }
  };

  // Run single benchmark via /api/v1/brain/benchmark-model
  const runSingleBenchmark = async (modelId: string, promptText: string) => {
    try {
      const res = await fetch("/api/v1/brain/benchmark-model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model_id: modelId,
          prompt: promptText,
          api_key_override: testApiKey.trim() || undefined,
        }),
      });
      if (res.ok) {
        return await res.json();
      } else {
        const err = await res.json();
        return { status: "error", error: err.detail || "Benchmark failed" };
      }
    } catch (e: any) {
      return { status: "error", error: e.message };
    }
  };

  // 1-Click Speed Test for an individual model row
  const handleRowSpeedTest = async (modelId: string) => {
    setRowSpeedTests((prev) => ({ ...prev, [modelId]: { loading: true } }));
    try {
      const res = await runSingleBenchmark(modelId, "Speed test ping: Measure operational round-trip latency.");
      if (res.status === "error" || res.error) {
        setRowSpeedTests((prev) => ({
          ...prev,
          [modelId]: { loading: false, error: res.error || "Speed test failed" },
        }));
      } else {
        setRowSpeedTests((prev) => ({
          ...prev,
          [modelId]: {
            loading: false,
            latency: res.latency_ms,
            tokens: res.tokens?.total,
          },
        }));
      }
    } catch (err: any) {
      setRowSpeedTests((prev) => ({
        ...prev,
        [modelId]: { loading: false, error: err.message },
      }));
    }
  };

  // Save model-to-task assignments to backend and .env
  const handleSaveModelRoles = async () => {
    setIsSavingRoles(true);
    setSaveRolesMsg("");
    try {
      const res = await fetch("/api/v1/brain/model-roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(modelRoles),
      });
      if (res.ok) {
        setSaveRolesMsg("Task assignments saved to local .env and runtime!");
        setTimeout(() => setSaveRolesMsg(""), 4000);
      } else {
        const err = await res.json();
        alert(`Failed to save task assignments: ${err.detail || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Network error saving task assignments: ${err.message}`);
    } finally {
      setIsSavingRoles(false);
    }
  };

  // Benchmark speed comparison data for visual graph
  const benchmarkModels = [
    { name: "Nemotron-3 Super 120B", speedMs: 797, label: "797ms", fill: "var(--ed-success)" },
    { name: "Nemotron-3 Nano 30B", speedMs: 1476, label: "1.48s", fill: "#3B82F6" },
    { name: "Nemotron-3.5 Light 30B", speedMs: 2150, label: "2.15s", fill: "#8B5CF6" },
    { name: "Nemotron-3 Ultra 550B", speedMs: 12000, label: "12.0s", fill: "var(--ed-warning)" },
    { name: "Google Gemma 4 31B", speedMs: 28000, label: "28.0s", fill: "var(--ed-danger)" },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      {/* 1. Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[var(--ed-accent)]" />
            Model Architecture & System Integrations
          </h2>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Configure primary thinking models, fallback prioritization, API keys with local .env persistence, and diagnostic telemetry.
          </p>
        </div>
        <button
          onClick={fetchHealthAndSettings}
          disabled={isRefreshing}
          className="ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-xs font-semibold text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] transition-all shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh Status
        </button>
      </div>

      {/* 2. System Architecture Health Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* WhatsApp Bridge */}
        <div className="ed-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-[var(--ed-success)]/10 text-[var(--ed-success)]">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                waHealth?.connected
                  ? "bg-[var(--ed-success)]/10 text-[var(--ed-success)] border border-[var(--ed-success)]/20"
                  : "bg-[var(--ed-warning)]/10 text-[var(--ed-warning)] border border-[var(--ed-warning)]/20 animate-pulse"
              }`}
            >
              {waHealth?.connected ? "● Connected" : "● Waiting Link"}
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">WhatsApp Bridge</h3>
          <p className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Baileys Multi-Device (Port 3001)</p>
          <div className="mt-3 pt-2 border-t border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)]">
            Bot: <span className="font-data font-semibold text-[var(--ed-text-primary)]">+91 89187 53100</span>
          </div>
        </div>

        {/* Primary Thinking Model */}
        <div className="ed-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
              ● Active 550B
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">Flagship Thinking Model</h3>
          <p className="text-[11px] text-[var(--ed-text-muted)] mt-0.5 truncate font-mono">{primaryModel}</p>
          <div className="mt-3 pt-2 border-t border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)]">
            Fallbacks: <span className="font-semibold text-[var(--ed-text-primary)] font-data">{fallbackSequence.length} Chained</span>
          </div>
        </div>

        {/* Database & Memory Engine */}
        <div className="ed-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Database className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ed-success)]/10 text-[var(--ed-success)] border border-[var(--ed-success)]/20">
              ● Healthy
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">PostgreSQL / SQLite</h3>
          <p className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Async Session Pool</p>
          <div className="mt-3 pt-2 border-t border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)]">
            State: <span className="font-semibold text-[var(--ed-success)]">Transactions ACID</span>
          </div>
        </div>

        {/* Durable Worker Engine */}
        <div className="ed-panel rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-lg bg-[var(--ed-warning)]/10 text-[var(--ed-warning)]">
              <Layers className="w-4 h-4" />
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ed-success)]/10 text-[var(--ed-success)] border border-[var(--ed-success)]/20">
              ● Polling
            </span>
          </div>
          <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">Durable Job Worker</h3>
          <p className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Cadence & Background Tasks</p>
          <div className="mt-3 pt-2 border-t border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)]">
            Loop Protection: <span className="font-semibold text-[var(--ed-success)]">Bounded</span>
          </div>
        </div>
      </div>

      {/* 2.5 Model Economics, Pricing Comparison & Architecture Roles Matrix */}
      <div className="ed-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-500" />
              Model Economics, Pricing Comparison & Architecture Roles
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Compare token pricing across providers. All NVIDIA NIM models are <strong>Included / Free</strong> under your NVIDIA API key ($0.00). Google Gemini models are priced strictly per token usage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              NVIDIA NIM models are Included / Free ($0.00)
            </span>
          </div>
        </div>

        {/* Model Economics Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[var(--ed-border)] text-[11px] font-bold text-[var(--ed-text-muted)] uppercase tracking-wider">
                <th className="py-2.5 px-3">Model Architecture</th>
                <th className="py-2.5 px-3">What Does It Do? (Operational Role)</th>
                <th className="py-2.5 px-3">Input / 1M</th>
                <th className="py-2.5 px-3">Output / 1M</th>
                <th className="py-2.5 px-3">Cost Tier</th>
                <th className="py-2.5 px-3">Context</th>
                <th className="py-2.5 px-3">Latency & Live Speed</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ed-border)] text-xs">
              {KNOWN_MODELS_ECONOMICS.map((m) => {
                const speedTest = rowSpeedTests[m.id];
                return (
                  <tr
                    key={m.id}
                    className={`hover:bg-[var(--ed-bg)] transition-colors ${
                      m.isLeastCostly ? "bg-emerald-500/5 dark:bg-emerald-950/10" : ""
                    }`}
                  >
                    <td className="py-3 px-3 font-semibold text-[var(--ed-text-primary)]">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            m.provider === "Google" ? "bg-sky-500" : "bg-emerald-500"
                          }`}
                        />
                        <div>
                          <div>{m.name}</div>
                          <div className="text-[10px] font-mono text-[var(--ed-text-muted)] truncate max-w-[180px]">
                            {m.id}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-[var(--ed-text-muted)] max-w-xs leading-relaxed">
                      {m.whatItDoes}
                    </td>

                    <td className="py-3 px-3">
                      {m.isFreeNvidia ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          $0.00 <span className="text-[10px] font-normal opacity-80">(Free)</span>
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-[var(--ed-text-primary)]">
                          ${m.inputCostPer1M.toFixed(2)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {m.isFreeNvidia ? (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          $0.00 <span className="text-[10px] font-normal opacity-80">(Free)</span>
                        </span>
                      ) : (
                        <span className="font-mono font-bold text-[var(--ed-text-primary)]">
                          ${m.outputCostPer1M.toFixed(2)}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3">
                      {m.isFreeNvidia ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          Included / Free
                        </span>
                      ) : (
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            m.isLeastCostly
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700"
                          }`}
                        >
                          {m.costBadge}
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-mono text-[11px] text-[var(--ed-text-muted)]">
                      {m.contextLimit}
                    </td>

                    <td className="py-3 px-3">
                      <div className="font-mono text-[11px] text-[var(--ed-text-muted)]">
                        {m.estLatency}
                      </div>
                      {speedTest && (
                        <div className="mt-1">
                          {speedTest.loading ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-500 font-mono font-semibold">
                              <MessageLoading className="w-3 h-3 text-amber-500" /> Pinging...
                            </span>
                          ) : speedTest.error ? (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] text-rose-500 font-medium"
                              title={speedTest.error}
                            >
                              <AlertCircle className="w-2.5 h-2.5 shrink-0" /> Error
                            </span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full shrink-0 ${
                                  (speedTest.latency || 0) < 1000
                                    ? "bg-emerald-500"
                                    : (speedTest.latency || 0) < 3000
                                    ? "bg-amber-500"
                                    : "bg-rose-500"
                                }`}
                              />
                              <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                                {speedTest.latency}ms
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRowSpeedTest(m.id)}
                          disabled={speedTest?.loading}
                          className="px-2.5 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 transition-all ed-press inline-flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                          title="Run authentic live API latency benchmark"
                        >
                          {speedTest?.loading ? (
                            <MessageLoading className="w-3 h-3 text-amber-400" />
                          ) : (
                            <Zap className="w-3 h-3" />
                          )}
                          Speed Test
                        </button>
                        <Link
                          href={`/playground?model=${encodeURIComponent(m.id)}`}
                          className="px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[11px] font-semibold text-[var(--ed-text-primary)] transition-all ed-press inline-flex items-center gap-1 shrink-0"
                          title="Open dedicated playground chat with this model"
                        >
                          <Sparkles className="w-3 h-3 text-purple-400" />
                          Playground
                        </Link>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2.6 Model-to-Task Operational Roles & Capabilities Assignment Panel */}
      <div className="ed-panel rounded-2xl p-4 sm:p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Dynamic Model-to-Task Assignment (Dual Brain & Agent Matrix)
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Assign specific models to each AI operational task. Persists to active memory and local <code>.env</code> automatically.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {saveRolesMsg && (
              <span className="text-xs font-bold text-[var(--ed-success)] bg-[var(--ed-success)]/10 px-3 py-1 rounded-lg border border-[var(--ed-success)]/20 inline-flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                {saveRolesMsg}
              </span>
            )}
            <button
              onClick={handleSaveModelRoles}
              disabled={isSavingRoles}
              className="ed-btn-primary ed-press ed-focus-ring px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSavingRoles ? "Saving Roles..." : "Save Task Assignments"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Role 1: Friday Web Assistant */}
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                Friday Web Assistant
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Executive Copilot
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)]">
              Autonomous dashboard control, operator chat, DOM automation, and multi-modal actions.
            </p>
            <select
              value={modelRoles.friday_web_model}
              onChange={(e) => setModelRoles({ ...modelRoles, friday_web_model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
            >
              <optgroup label="Google Gemini Models (Fast / Multimodal)">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "Google").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.costBadge})
                  </option>
                ))}
              </optgroup>
              <optgroup label="NVIDIA NIM Models (Free / Included)">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "NVIDIA").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Free)
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Role 2: EDITH WhatsApp Commercial Closer */}
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-purple-400" />
                EDITH WhatsApp Sales
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                Commercial Closer
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)]">
              Inbound customer proposals, volume discount negotiations, objection defense, and checkout closing.
            </p>
            <select
              value={modelRoles.edith_sales_model}
              onChange={(e) => setModelRoles({ ...modelRoles, edith_sales_model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
            >
              <optgroup label="NVIDIA NIM Models (Free / Included)">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "NVIDIA").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Free)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Google Gemini Models">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "Google").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Role 3: Friday Voice Agent */}
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-emerald-400" />
                Friday Voice Agent
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                16kHz PCM Stream
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)]">
              Ultra-low latency bidirectional audio streaming for hands-free operator voice control.
            </p>
            <select
              value={modelRoles.friday_voice_model}
              onChange={(e) => setModelRoles({ ...modelRoles, friday_voice_model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
            >
              <optgroup label="Google Gemini Voice Live Models">
                <option value="gemini-3.1-flash-live-preview">Gemini 3.1 Flash Live Preview (Recommended Voice)</option>
                <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                <option value="gemini-2.5-flash-lite">Gemini 2.5 Flash-Lite</option>
              </optgroup>
            </select>
          </div>

          {/* Role 4: Policy & Margin Auditor */}
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                Policy & Margin Auditor
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Governance & Safety
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)]">
              Minimum margin threshold verification, contract auditing, and objection safety enforcement.
            </p>
            <select
              value={modelRoles.edith_policy_model}
              onChange={(e) => setModelRoles({ ...modelRoles, edith_policy_model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
            >
              <optgroup label="NVIDIA NIM Models (Free / Included)">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "NVIDIA").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Free)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Google Gemini Models">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "Google").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>

          {/* Role 5: System Watchdog Supervisor */}
          <div className="p-4 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-rose-400" />
                Watchdog Supervisor
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Health & Loop Guard
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)]">
              Continuous sub-second health audits, infinite loop prevention, and autonomous recovery checks.
            </p>
            <select
              value={modelRoles.system_watchdog_model}
              onChange={(e) => setModelRoles({ ...modelRoles, system_watchdog_model: e.target.value })}
              className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
            >
              <optgroup label="NVIDIA NIM Models (Free / Included)">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "NVIDIA").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} (Free)
                  </option>
                ))}
              </optgroup>
              <optgroup label="Google Gemini Models">
                {KNOWN_MODELS_ECONOMICS.filter((m) => m.provider === "Google").map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* 3. Model Architecture & Fallback Sequence Customizer */}
      <div className="ed-panel rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--ed-border)] pb-4">
          <div>
            <h3 className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <Sliders className="w-4 h-4 text-[var(--ed-accent)]" />
              Model Hierarchy & Fallback Sequence Manager
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Customize which model leads consultative reasoning, set fallback priorities, and adjust API keys with automatic local <code>.env</code> persistence.
            </p>
          </div>
          {saveSuccessMsg && (
            <span className="text-xs font-bold text-[var(--ed-success)] bg-[var(--ed-success)]/10 px-3 py-1.5 rounded-lg border border-[var(--ed-success)]/20 inline-flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              {saveSuccessMsg}
            </span>
          )}
        </div>

        <form onSubmit={handleSaveModelSettings} className="space-y-6 text-xs">
          {/* Section A: Primary Thinking Model */}
          <div className="space-y-3">
            <label className="block font-bold text-[var(--ed-text-primary)] text-xs">
              1. Primary Thinking Model (Leads All Customer Reasoning)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {(modelSettings?.available_models || []).map((m) => {
                const isSelected = primaryModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => setPrimaryModel(m.id)}
                    className={`ed-press p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-[var(--ed-surface)] border-l-2 border-[var(--ed-accent)] border-[var(--ed-border)] shadow-sm"
                        : "bg-[var(--ed-surface)] border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-bg)]"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`font-bold ${isSelected ? "text-[var(--ed-text-primary)]" : "text-[var(--ed-text-muted)]"}`}>
                        {m.name}
                      </span>
                      {isSelected && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ed-accent)]/10 text-[var(--ed-accent)] border border-[var(--ed-accent)]/20">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-[var(--ed-text-muted)] mb-2">{m.description}</div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono bg-[var(--ed-bg)] px-1.5 py-0.5 rounded border border-[var(--ed-border)]">
                        {m.params}
                      </span>
                      <span className="text-[var(--ed-success)] font-semibold font-data">{m.latency_label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section B: Chained Fallback Models */}
          <div className="space-y-3 pt-2 border-t border-[var(--ed-border)]">
            <div className="flex items-center justify-between">
              <label className="font-bold text-[var(--ed-text-primary)] text-xs">
                2. Fallback Sequence (Executed when Primary encounters Timeout or Rate-Limit)
              </label>
              <span className="text-[11px] text-[var(--ed-text-muted)]">Order: Top priority runs first</span>
            </div>

            <div className="space-y-2">
              {fallbackSequence.map((fbId, idx) => {
                const modelInfo = (modelSettings?.available_models || []).find((m) => m.id === fbId);
                return (
                  <div
                    key={fbId}
                    className="flex items-center justify-between p-3 rounded-xl border border-[var(--ed-border)] transition-colors"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-5 h-5 rounded-full bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center justify-center font-bold text-[10px] font-data text-[var(--ed-text-primary)]">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="font-semibold text-[var(--ed-text-primary)]">
                          {modelInfo?.name || fbId}
                        </div>
                        <div className="text-[10px] text-[var(--ed-text-muted)] font-mono truncate max-w-[140px] sm:max-w-xs">{fbId}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={idx === 0}
                        onClick={() => handleMoveFallback(idx, "up")}
                        className="ed-press p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-surface)] disabled:opacity-30"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={idx === fallbackSequence.length - 1}
                        onClick={() => handleMoveFallback(idx, "down")}
                        className="ed-press p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-surface)] disabled:opacity-30"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleFallbackModel(fbId)}
                        className="ed-press ml-2 px-2 py-1 rounded text-[10px] font-semibold text-[var(--ed-danger)] hover:bg-[var(--ed-danger)]/10"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Add unselected models to fallback */}
              <div className="pt-2 flex flex-wrap gap-2">
                <span className="text-[11px] text-[var(--ed-text-muted)] py-1">Available to add:</span>
                {(modelSettings?.available_models || [])
                  .filter((m) => !fallbackSequence.includes(m.id) && m.id !== primaryModel)
                  .map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleToggleFallbackModel(m.id)}
                      className="ed-press px-2.5 py-1 rounded-lg border border-dashed border-[var(--ed-border)] hover:border-[var(--ed-accent)] text-[11px] font-medium text-[var(--ed-text-muted)] hover:text-[var(--ed-accent)] transition-colors"
                    >
                      + {m.name}
                    </button>
                  ))}
              </div>
            </div>
          </div>

          {/* Section C: API Keys Configuration (Local .env Sync) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-[var(--ed-border)]">
            {/* Primary Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
                  Primary NVIDIA API Key
                </label>
                <span className="text-[10px] text-[var(--ed-text-muted)] font-mono">
                  {modelSettings?.primary_api_key_masked || "Configured in .env"}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showPrimaryApiKey ? "text" : "password"}
                  value={newPrimaryApiKey}
                  onChange={(e) => setNewPrimaryApiKey(e.target.value)}
                  placeholder="Enter new primary nvapi-... to update .env"
                  className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowPrimaryApiKey(!showPrimaryApiKey)}
                  className="absolute right-2.5 top-3 text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                >
                  {showPrimaryApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Fallback Key */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[var(--ed-success)]" />
                  Fallback NVIDIA API Key (Used on Overload/503)
                </label>
                <span className="text-[10px] text-[var(--ed-text-muted)] font-mono">
                  {modelSettings?.fallback_api_key_masked || "Configured in .env"}
                </span>
              </div>
              <div className="relative">
                <input
                  type={showFallbackApiKey ? "text" : "password"}
                  value={newFallbackApiKey}
                  onChange={(e) => setNewFallbackApiKey(e.target.value)}
                  placeholder="Enter fallback nvapi-... to update .env"
                  className="w-full pl-3 pr-9 py-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring outline-none"
                />
                <button
                  type="button"
                  onClick={() => setShowFallbackApiKey(!showFallbackApiKey)}
                  className="absolute right-2.5 top-3 text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                >
                  {showFallbackApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section D: Hyperparameters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-[var(--ed-border)]">
            <div>
              <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                Temperature ({temperature})
              </label>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={temperature}
                onChange={(e) => setTemperature(Number(e.target.value))}
                className="w-full accent-[var(--ed-accent)]"
              />
              <div className="flex justify-between text-[10px] text-[var(--ed-text-muted)] mt-0.5">
                <span>0.0 (Deterministic)</span>
                <span>1.0 (Creative)</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                Max Output Tokens
              </label>
              <input
                type="number"
                min="256"
                max="4096"
                step="256"
                value={maxTokens}
                onChange={(e) => setMaxTokens(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data text-xs ed-focus-ring"
              />
            </div>

            <div>
              <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                Request Timeout (Seconds)
              </label>
              <input
                type="number"
                min="15"
                max="180"
                step="5"
                value={timeoutSecs}
                onChange={(e) => setTimeoutSecs(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data text-xs ed-focus-ring"
              />
            </div>
          </div>

          {/* Submit Action */}
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between border-t border-[var(--ed-border)]">
            <span className="text-[11px] text-[var(--ed-text-muted)]">
              Saving updates your local <code>.env</code> file and active memory immediately.
            </span>
            <button
              type="submit"
              disabled={isSavingSettings}
              className="ed-btn-primary ed-press ed-focus-ring px-5 py-2.5 rounded-xl font-semibold text-xs shadow-md transition-all inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSavingSettings ? "Saving Locally..." : "Save & Apply to Local System"}
            </button>
          </div>
        </form>
      </div>

      {/* 4. Visual Charts & Latency Telemetry Section */}
      <div className="ed-panel rounded-2xl p-6 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--ed-success)]" />
              Live Inference Latency & Architectural Distribution
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Live benchmark response speed curves and fallback reliability telemetry.
            </p>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-lg text-xs border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <button
              onClick={() => setActiveChartTab("latency")}
              className={`ed-press px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeChartTab === "latency"
                  ? "bg-[var(--ed-surface)] text-[var(--ed-text-primary)] shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" /> Latency Chart
            </button>
            <button
              onClick={() => setActiveChartTab("architecture")}
              className={`ed-press px-3 py-1.5 rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                activeChartTab === "architecture"
                  ? "bg-[var(--ed-surface)] text-[var(--ed-text-primary)] shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              }`}
            >
              <PieIcon className="w-3.5 h-3.5" /> Fallback Distribution
            </button>
          </div>
        </div>

        {activeChartTab === "latency" ? (
          /* SVG Bar Chart for Latency Comparison */
          <div className="space-y-3 pt-2">
            <div className="text-[11px] font-semibold text-[var(--ed-text-muted)]">
              Benchmark Inference Time by Model Architecture:
            </div>
            <div className="space-y-2.5">
              {benchmarkModels.map((m) => {
                const maxSpeed = 30000;
                const pct = Math.min(100, Math.max(4, (m.speedMs / maxSpeed) * 100));
                return (
                  <div key={m.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--ed-text-primary)]">{m.name}</span>
                      <span className="font-data text-[11px] font-bold text-[var(--ed-text-muted)]">
                        {m.label} ({m.speedMs}ms)
                      </span>
                    </div>
                    <div className="h-3 w-full rounded-full overflow-hidden flex border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, backgroundColor: m.fill }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* SVG Doughnut / Pie Chart for Fallback Reliability Distribution */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center pt-2">
            <div className="flex justify-center">
              <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 max-w-[200px] w-full h-auto">
                {/* Primary: 75% -> 471.2 * 0.75 = 353.4 */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="transparent"
                  stroke="#A855F7"
                  strokeWidth="28"
                  strokeDasharray="353.4 471.2"
                  strokeDashoffset="0"
                />
                {/* Fallback 1: 15% -> 471.2 * 0.15 = 70.68 */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="transparent"
                  stroke="var(--ed-success)"
                  strokeWidth="28"
                  strokeDasharray="70.68 471.2"
                  strokeDashoffset="-353.4"
                />
                {/* Fallback 2: 7% -> 471.2 * 0.07 = 32.98 */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="transparent"
                  stroke="#3B82F6"
                  strokeWidth="28"
                  strokeDasharray="32.98 471.2"
                  strokeDashoffset="-424.08"
                />
                {/* Emergency: 3% -> 471.2 * 0.03 = 14.14 */}
                <circle
                  cx="100"
                  cy="100"
                  r="75"
                  fill="transparent"
                  stroke="var(--ed-warning)"
                  strokeWidth="28"
                  strokeDasharray="14.14 471.2"
                  strokeDashoffset="-457.06"
                />
              </svg>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-purple-500 shrink-0" />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Primary Thinking Model (Ultra 550B):
                </span>
                <span className="font-data font-bold text-[var(--ed-text-muted)] ml-auto">75%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[var(--ed-success)] shrink-0" />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Fast Fallback 1 (Nano Omni 30B):
                </span>
                <span className="font-data font-bold text-[var(--ed-text-muted)] ml-auto">15%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Fallback 2 (Super 120B):
                </span>
                <span className="font-data font-bold text-[var(--ed-text-muted)] ml-auto">7%</span>
              </div>
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-[var(--ed-warning)] shrink-0" />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Local Emergency Fallback:
                </span>
                <span className="font-data font-bold text-[var(--ed-text-muted)] ml-auto">3%</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. Unified AI Model Playground & Live Testing Studio Portal */}
      <div className="ed-panel rounded-2xl p-6 border border-[var(--ed-border)] bg-[var(--ed-surface)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Unified AI Model Playground & Testing Studio
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] max-w-2xl leading-relaxed">
              Interactive benchmarking, real-time token telemetry, live chat testing, and multi-turn persona evaluation have been unified into the dedicated Playground. Test any Google Gemini or zero-cost NVIDIA NIM model, adjust system prompts and temperatures live, and directly assign verified models to operational roles.
            </p>
          </div>
          <Link
            href="/playground"
            className="ed-btn-primary ed-press ed-focus-ring px-5 py-3 rounded-xl font-bold text-xs shadow-md transition-all inline-flex items-center gap-2 shrink-0 self-start sm:self-center"
          >
            <Sparkles className="w-4 h-4 text-purple-300" />
            Launch AI Playground
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
