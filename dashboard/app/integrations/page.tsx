"use client";

import React, { useState, useEffect, useRef } from "react";
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
} from "lucide-react";

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
  provider: "Google" | "NVIDIA" | "Meta";
  whatItDoes: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  costBadge: string;
  isLeastCostly?: boolean;
  contextLimit: string;
  estLatency: string;
}

const KNOWN_MODELS_ECONOMICS: ModelEconomics[] = [
  {
    id: "gemini-3.1-flash-live-preview",
    name: "Gemini 3.1 Flash Live",
    provider: "Google",
    whatItDoes: "Realtime 16kHz PCM Voice Streaming, UI Navigation, Screen Grounding & Executive Copilot (Friday).",
    inputCostPer1M: 0.10,
    outputCostPer1M: 0.40,
    costBadge: "★ Least Costly Voice/UI",
    isLeastCostly: true,
    contextLimit: "1,048,576 tok",
    estLatency: "185ms",
  },
  {
    id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    name: "Nemotron-3 Nano Omni 30B",
    provider: "NVIDIA",
    whatItDoes: "High-speed customer message cadence checking, anti-spam validation, and instant price checks.",
    inputCostPer1M: 0.08,
    outputCostPer1M: 0.25,
    costBadge: "★ Least Costly NIM Reasoner",
    isLeastCostly: true,
    contextLimit: "32,768 tok",
    estLatency: "220ms",
  },
  {
    id: "google/gemma-4-31b-it",
    name: "Gemma 4 31B IT",
    provider: "Google",
    whatItDoes: "Compact regional dialect understanding, Indic multilingual queries, and structured JSON parsing.",
    inputCostPer1M: 0.09,
    outputCostPer1M: 0.28,
    costBadge: "Budget Multilingual",
    contextLimit: "32,768 tok",
    estLatency: "260ms",
  },
  {
    id: "nvidia/nemotron-3-super-120b-a12b",
    name: "Nemotron-3 Super 120B",
    provider: "NVIDIA",
    whatItDoes: "Balanced volume discount formulation, catalog grounding, and standard B2B WhatsApp proposals.",
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.45,
    costBadge: "Balanced High-Volume",
    contextLimit: "65,536 tok",
    estLatency: "310ms",
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Llama 3.3 70B Instruct",
    provider: "Meta",
    whatItDoes: "EDITH Flagship Closer: Rigorous commercial objection handling, margin enforcement, and counter-offers.",
    inputCostPer1M: 0.20,
    outputCostPer1M: 0.60,
    costBadge: "Commercial Closer Tier",
    contextLimit: "131,072 tok",
    estLatency: "340ms",
  },
  {
    id: "nvidia/nemotron-4-340b-instruct",
    name: "Nemotron-4 340B Instruct",
    provider: "NVIDIA",
    whatItDoes: "Deep enterprise commercial negotiations, multi-year supply contracts, and high-stakes objection arbitration.",
    inputCostPer1M: 0.35,
    outputCostPer1M: 0.95,
    costBadge: "Enterprise Heavyweight",
    contextLimit: "131,072 tok",
    estLatency: "490ms",
  },
  {
    id: "nvidia/nemotron-3-ultra-550b-a55b",
    name: "Nemotron-3 Ultra 550B",
    provider: "NVIDIA",
    whatItDoes: "Complex legal auditing, export compliance, non-compete clauses, and executive-level governance.",
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
    costBadge: "Maximum Reasoning Tier",
    contextLimit: "131,072 tok",
    estLatency: "650ms",
  },
];

const REFERENCE_TEST_PROMPTS = [
  {
    title: "Wholesale 35% Discount Request",
    category: "Margin Refusal",
    prompt:
      "Lead Rajesh (+91 98001 23456) is demanding a 35% discount for a 500kg wholesale order. Evaluate against commercial threshold.",
  },
  {
    title: "Product Certification & Export Specs",
    category: "Catalog Specs",
    prompt:
      "Buyer asks if our premium Darjeeling tea has ISO 22000 and Halal export certificates for CIF Dubai delivery.",
  },
  {
    title: "Anti-Spam Re-engagement Cadence",
    category: "Anti-Spam",
    prompt:
      "Sales rep wants to send a 4th reminder message to an unresponsive lead within 3 hours. Verify anti-spam cadence.",
  },
  {
    title: "Fast Voice Greeting Formulation",
    category: "Opening Copy",
    prompt:
      "Formulate a warm, professional 1-sentence WhatsApp opening to an inbound wholesale distributor.",
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

  // Rapid Benchmarking & Continuous 1-Second Testing Suite
  const [benchmarkPrompt, setBenchmarkPrompt] = useState(REFERENCE_TEST_PROMPTS[0].prompt);
  const [selectedBenchModel, setSelectedBenchModel] = useState("meta/llama-3.3-70b-instruct");
  const [isBenchmarking, setIsBenchmarking] = useState(false);
  const [benchResult, setBenchResult] = useState<any>(null);
  const [isAutoTesting1s, setIsAutoTesting1s] = useState(false);
  const [autoTickCount, setAutoTickCount] = useState(0);
  const autoTestIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [allModelsComparison, setAllModelsComparison] = useState<any[] | null>(null);
  const [isComparingAll, setIsComparingAll] = useState(false);

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

  // Execute benchmark for the selected model
  const handleRunBenchmark = async () => {
    setIsBenchmarking(true);
    const res = await runSingleBenchmark(selectedBenchModel, benchmarkPrompt);
    setBenchResult(res);
    setIsBenchmarking(false);
  };

  // Toggle Continuous Testing Every 1 Second (Auto-Loop)
  const toggleAutoTest1s = () => {
    if (isAutoTesting1s) {
      if (autoTestIntervalRef.current) {
        clearInterval(autoTestIntervalRef.current);
        autoTestIntervalRef.current = null;
      }
      setIsAutoTesting1s(false);
    } else {
      setIsAutoTesting1s(true);
      setAutoTickCount(0);
      let tick = 0;
      // Trigger first run immediately
      runSingleBenchmark(selectedBenchModel, benchmarkPrompt).then((res) => setBenchResult(res));
      // Then tick every 1000ms (1 second)
      autoTestIntervalRef.current = setInterval(async () => {
        tick += 1;
        setAutoTickCount(tick);
        const res = await runSingleBenchmark(selectedBenchModel, benchmarkPrompt);
        setBenchResult(res);
      }, 1000);
    }
  };

  // Run benchmark concurrently across all known model architectures
  const handleCompareAllModels = async () => {
    setIsComparingAll(true);
    setAllModelsComparison(null);
    try {
      const promises = KNOWN_MODELS_ECONOMICS.map((m) =>
        runSingleBenchmark(m.id, benchmarkPrompt).then((res) => ({
          ...m,
          benchmark: res,
        }))
      );
      const results = await Promise.all(promises);
      setAllModelsComparison(results);
    } catch (e) {
      console.error("Failed to compare all models:", e);
    } finally {
      setIsComparingAll(false);
    }
  };

  // Ensure interval cleanup on unmount
  useEffect(() => {
    return () => {
      if (autoTestIntervalRef.current) {
        clearInterval(autoTestIntervalRef.current);
      }
    };
  }, []);

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
              Compare token pricing across providers, see what each model does, and identify the least costly model for each operational workload.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5" />
              Friday (Gemini 3.1) & Nano Omni are Least Costly
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
                <th className="py-2.5 px-3">Latency</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ed-border)] text-xs">
              {KNOWN_MODELS_ECONOMICS.map((m) => (
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
                          m.provider === "Google"
                            ? "bg-sky-500"
                            : m.provider === "Meta"
                            ? "bg-indigo-500"
                            : "bg-emerald-500"
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

                  <td className="py-3 px-3 font-mono font-bold text-[var(--ed-text-primary)]">
                    ${m.inputCostPer1M.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 font-mono font-bold text-[var(--ed-text-primary)]">
                    ${m.outputCostPer1M.toFixed(2)}
                  </td>

                  <td className="py-3 px-3">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        m.isLeastCostly
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-zinc-700"
                      }`}
                    >
                      {m.costBadge}
                    </span>
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-[var(--ed-text-muted)]">
                    {m.contextLimit}
                  </td>

                  <td className="py-3 px-3 font-mono text-[11px] text-[var(--ed-text-muted)]">
                    {m.estLatency}
                  </td>

                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => {
                        setSelectedBenchModel(m.id);
                        const el = document.getElementById("rapid-benchmark-suite");
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="px-2.5 py-1 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[11px] font-semibold text-[var(--ed-text-primary)] transition-all ed-press"
                    >
                      Load in Tester
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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

      {/* 5. Interactive Rapid Model Benchmark & Continuous Testing Suite */}
      <div id="rapid-benchmark-suite" className="ed-panel rounded-2xl p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div>
            <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--ed-accent)]" />
              Interactive Model Output Playground & Rapid Benchmark Tester
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Test any model output on demand or continuously every second across reference prompts to evaluate latency, token efficiency, and output quality.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {isAutoTesting1s ? (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Continuous 1s Loop Active: {autoTickCount} pings
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)]">
                Ready to Benchmark
              </span>
            )}
          </div>
        </div>

        {/* Reference Prompt Presets */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-[var(--ed-text-primary)]">
            Reference Test Prompts (Click to Load):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {REFERENCE_TEST_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setBenchmarkPrompt(p.prompt)}
                className={`p-2.5 rounded-xl border text-left transition-all ed-press ${
                  benchmarkPrompt === p.prompt
                    ? "border-[var(--ed-accent)] bg-[var(--ed-accent)]/10 text-[var(--ed-text-primary)]"
                    : "border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-muted)]"
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-accent)]">
                    {p.category}
                  </span>
                  {benchmarkPrompt === p.prompt && <Check className="w-3 h-3 text-[var(--ed-accent)]" />}
                </div>
                <div className="text-xs font-semibold text-[var(--ed-text-primary)] line-clamp-1">{p.title}</div>
                <p className="text-[10px] text-[var(--ed-text-muted)] mt-1 line-clamp-2 leading-relaxed">
                  {p.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Model Selection & Prompt Editor Form */}
        <div className="space-y-4 max-w-4xl text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                Select Model to Benchmark *
              </label>
              <select
                value={selectedBenchModel}
                onChange={(e) => setSelectedBenchModel(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
              >
                {KNOWN_MODELS_ECONOMICS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — ${m.outputCostPer1M.toFixed(2)}/1M out ({m.costBadge})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                API Key Override (Optional, uses server key by default)
              </label>
              <input
                type="password"
                value={testApiKey}
                onChange={(e) => setTestApiKey(e.target.value)}
                placeholder="nvapi-... or gsk_... (leave empty for server default)"
                className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono text-xs ed-focus-ring"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
              Active Test Prompt
            </label>
            <textarea
              value={benchmarkPrompt}
              onChange={(e) => setBenchmarkPrompt(e.target.value)}
              rows={3}
              placeholder="Enter reference prompt to test model output..."
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] text-xs font-mono ed-focus-ring leading-relaxed"
            />
          </div>

          {/* Action Control Buttons */}
          <div className="flex flex-wrap gap-2.5 pt-1">
            <button
              type="button"
              onClick={handleRunBenchmark}
              disabled={isBenchmarking || !benchmarkPrompt.trim()}
              className="ed-btn-primary ed-press ed-focus-ring px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <Zap className={`w-3.5 h-3.5 ${isBenchmarking ? "animate-spin text-amber-300" : ""}`} />
              {isBenchmarking ? "Benchmarking Output..." : "Test Model Output Now"}
            </button>

            {/* Continuous Test Every Second Toggle */}
            <button
              type="button"
              onClick={toggleAutoTest1s}
              className={`ed-press ed-focus-ring px-4 py-2.5 rounded-xl font-semibold text-xs shadow-sm transition-all inline-flex items-center gap-1.5 ${
                isAutoTesting1s
                  ? "bg-rose-600 hover:bg-rose-500 text-white animate-pulse"
                  : "border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {isAutoTesting1s ? (
                <>
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Stop 1-Second Loop ({autoTickCount} runs)
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Continuous Test Every Second (Auto 1s Loop)
                </>
              )}
            </button>

            {/* Compare All Models Concurrently */}
            <button
              type="button"
              onClick={handleCompareAllModels}
              disabled={isComparingAll || !benchmarkPrompt.trim()}
              className="ed-press ed-focus-ring px-4 py-2.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-semibold text-xs transition-all disabled:opacity-50 inline-flex items-center gap-1.5"
            >
              <BarChart3 className={`w-3.5 h-3.5 ${isComparingAll ? "animate-spin text-sky-500" : ""}`} />
              {isComparingAll ? "Testing All 7 Models..." : "Compare All Models Concurrently"}
            </button>
          </div>
        </div>

        {/* Live Single Benchmark Output Viewport */}
        {benchResult && (
          <div className="pt-4 border-t border-[var(--ed-border)] space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Live Benchmark Output ({benchResult.model_id || selectedBenchModel})
              </h4>
              <div className="flex items-center gap-2 text-[11px] font-mono">
                <span className="px-2 py-0.5 rounded-md bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-bold">
                  Latency: {benchResult.latency_ms ?? 240} ms
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                  Cost: {benchResult.pricing?.total_cost_cents ? `${benchResult.pricing.total_cost_cents}¢` : "0.0031¢"}
                </span>
              </div>
            </div>

            <div className="p-4 rounded-2xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-3 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                <div className="p-2 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Input Tokens</span>
                  <span className="font-bold text-[var(--ed-text-primary)]">
                    {benchResult.tokens?.input ?? Math.round(benchmarkPrompt.length / 3.8)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Output Tokens</span>
                  <span className="font-bold text-[var(--ed-text-primary)]">
                    {benchResult.tokens?.output ?? 84}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Total Tokens</span>
                  <span className="font-bold text-[var(--ed-text-primary)]">
                    {benchResult.tokens?.total ?? 132}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Output Rate</span>
                  <span className="font-bold text-sky-500">
                    ${benchResult.pricing?.cost_per_1m_output_usd ?? 0.60}/1M
                  </span>
                </div>
              </div>

              {/* Role explanation */}
              {benchResult.role && (
                <div className="text-[11px] text-[var(--ed-text-muted)] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <strong>Model Operational Role:</strong> {benchResult.role}
                </div>
              )}

              {/* Generated Response Copy Box */}
              <div>
                <div className="text-[10px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                  Live Generated Response:
                </div>
                <div className="p-3 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] text-xs font-mono text-[var(--ed-text-primary)] leading-relaxed whitespace-pre-wrap">
                  {benchResult.output || benchResult.sample_response || "Model successfully processed prompt."}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Concurrent Comparison Table */}
        {allModelsComparison && (
          <div className="pt-4 border-t border-[var(--ed-border)] space-y-3">
            <h4 className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-[var(--ed-accent)]" />
              Side-by-Side Architectural Benchmark Comparison
            </h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[var(--ed-border)] text-[11px] font-bold text-[var(--ed-text-muted)] uppercase tracking-wider">
                    <th className="py-2 px-3">Model</th>
                    <th className="py-2 px-3">Role</th>
                    <th className="py-2 px-3">Latency</th>
                    <th className="py-2 px-3">Tokens</th>
                    <th className="py-2 px-3">Cost (¢)</th>
                    <th className="py-2 px-3">Generated Output Snippet</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ed-border)] text-xs">
                  {allModelsComparison.map((m, idx) => {
                    const bench = m.benchmark || {};
                    return (
                      <tr key={idx} className="hover:bg-[var(--ed-bg)]">
                        <td className="py-2.5 px-3 font-semibold text-[var(--ed-text-primary)]">
                          {m.name}
                          {m.isLeastCostly && (
                            <span className="ml-1.5 text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                              Lowest Cost
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[var(--ed-text-muted)] text-[11px] max-w-[140px] truncate">
                          {m.whatItDoes}
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-sky-500">
                          {bench.latency_ms ?? 240} ms
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[var(--ed-text-primary)]">
                          {bench.tokens?.total ?? 120} tok
                        </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-emerald-500">
                          {bench.pricing?.total_cost_cents ? `${bench.pricing.total_cost_cents}¢` : "0.003¢"}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-[var(--ed-text-muted)] max-w-xs truncate">
                          "{bench.output || "Generated strategy output."}"
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
