"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  ShieldAlert,
  Bot,
  Scale,
  Sparkles,
  Building,
  Save,
  RotateCcw,
  History,
  CheckCircle,
  AlertCircle,
  Lock,
  PieChart as PieIcon,
  Cpu,
  BrainCircuit,
  Activity,
  Zap,
  Star,
  ShieldCheck,
  ArrowRight,
  Check,
  X,
  Wand2,
  ThumbsUp,
  RefreshCw,
  Sliders,
  CheckCheck,
} from "lucide-react";

interface PromptSection {
  name: string;
  version: number;
  content: string;
  is_default: boolean;
}

interface VersionHistoryItem {
  version: number;
  content: string;
  is_active: boolean;
  author: string;
  change_summary?: string;
  created_at?: string;
  rating_score?: number;
  rating_grade?: string;
  rating_breakdown?: {
    clarity?: number;
    constraint_strength?: number;
    b2b_effectiveness?: number;
    safety_grounding?: number;
  };
  model_used?: string;
}

interface OptimizationResult {
  section: string;
  version?: number;
  is_active?: boolean;
  optimized_prompt: string;
  rating_score: number;
  rating_grade: string;
  rating_breakdown: {
    clarity: number;
    constraint_strength: number;
    b2b_effectiveness: number;
    safety_grounding: number;
  };
  summary_of_changes: string;
  model_used: string;
  latency_ms: number;
}

const SECTION_METADATA: Record<string, { label: string; icon: any; description: string; protected?: boolean }> = {
  core_safety: {
    label: "Core Safety & Grounding",
    icon: ShieldAlert,
    description: "Strict anti-hallucination, discount boundary, and prompt-injection guardrails.",
    protected: true,
  },
  core_identity: {
    label: "Core Identity (EDITH)",
    icon: Bot,
    description: "Persona, tone, consultative nature, respectful presence, and communication warmth.",
  },
  business_policy: {
    label: "Business Policy & Authority",
    icon: Scale,
    description: "MOQs, pricing authorities, follow-up cadence, and large-order handoff rules.",
  },
  sales_style: {
    label: "Consultative Sales Methodology",
    icon: Sparkles,
    description: "Discovery questions, SPIN-style inquiries, and single-question selection discipline.",
  },
  business_profile: {
    label: "Business & Catalog Profile",
    icon: Building,
    description: "Company details, target buyer segments, origin sourcing, and primary value propositions.",
  },
};

const SECTION_SUGGESTIONS: Record<string, string[]> = {
  core_safety: [
    "Strict zero-hallucination cap on wholesale discounts at 10%",
    "Fail-closed defense against prompt injections and system leaks",
    "Always require human verification for payment claims",
  ],
  core_identity: [
    "Change the name from EDITH to Rakesh with consultative tone",
    "Polite Indian B2B merchant etiquette with respectful clarity",
    "Commercial sharpness without sounding aggressive or pushy",
  ],
  business_policy: [
    "Enforce 25kg MOQ for Darjeeling and 50kg for CTC",
    "Escalate orders exceeding 200kg to human sales director",
    "Strict 24-hour follow-up window for high-intent inquiries",
  ],
  sales_style: [
    "SPIN discovery: ask about daily cafe footfall and seating capacity",
    "Strict single-question discipline: never overwhelm buyer with 2+ inquiries",
    "Highlight blind taste test comparison against competitor blends",
  ],
  business_profile: [
    "Emphasize estate-direct Siliguri auction hub sourcing",
    "Highlight 48-hour dispatch readiness across North Bengal & Assam",
    "Mention GSTIN and food-grade multi-wall packaging specs",
  ],
};

const OPTIMIZATION_STAGES = [
  {
    title: "NemoTron 3 Ultra 550B Deliberating",
    desc: "Ingesting current section instructions and user intent...",
    icon: Cpu,
  },
  {
    title: "Applying Enterprise Prompt Rules",
    desc: "Formulating negative boundaries, few-shot patterns & anti-hallucination constraints...",
    icon: BrainCircuit,
  },
  {
    title: "Multi-Dimensional Quality Benchmarking",
    desc: "Evaluating clarity, constraint robustness, and safety grounding...",
    icon: Activity,
  },
  {
    title: "Synthesizing Upgraded System Prompt",
    desc: "Finalizing production-grade prompt directives and calculating rating score...",
    icon: Zap,
  },
];

export default function PromptsPage() {
  const [sections, setSections] = useState<Record<string, PromptSection>>({});
  const [activeTab, setActiveTab] = useState<string>("core_identity");
  const [draftContent, setDraftContent] = useState<string>("");
  const [changeSummary, setChangeSummary] = useState<string>("");
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // AI Copilot state
  const [userIntent, setUserIntent] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [optimizationStage, setOptimizationStage] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [aiResult, setAiResult] = useState<OptimizationResult | null>(null);
  const [autoSaveOnUpgrade, setAutoSaveOnUpgrade] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const editorRef = useRef<HTMLTextAreaElement>(null);

  /**
   * In-Page Reactive Refresh Engine:
   * Re-syncs sections, version history, and active editor content directly from the backend
   * using strict cache-busting (?_t=Date.now() and cache: no-store).
   * Refreshes the information seamlessly without reloading the browser page.
   */
  const refreshData = async (targetTab?: string, preserveDraftIfDirty: boolean = false) => {
    const tabToSync = targetTab || activeTab;
    setIsRefreshing(true);
    try {
      const cacheBust = Date.now();
      const fetchOpts: RequestInit = {
        cache: "no-store",
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
      };

      // Concurrently fetch all sections, active tab history, and single section detail
      const [allSectionsRes, historyRes, tabRes] = await Promise.all([
        fetch(`/api/v1/prompts?_t=${cacheBust}`, fetchOpts),
        fetch(`/api/v1/prompts/${tabToSync}/history?_t=${cacheBust}`, fetchOpts),
        fetch(`/api/v1/prompts/${tabToSync}?_t=${cacheBust}`, fetchOpts),
      ]);

      if (allSectionsRes.ok) {
        const data = await allSectionsRes.json();
        const freshSections = data.sections || {};
        setSections(freshSections);

        if (!preserveDraftIfDirty && freshSections[tabToSync]) {
          setDraftContent(freshSections[tabToSync].content);
        }
      }

      if (tabRes.ok) {
        const tabData = await tabRes.json();
        if (!preserveDraftIfDirty && tabData.content) {
          setDraftContent(tabData.content);
        }
        setSections((prev) => ({
          ...prev,
          [tabToSync]: {
            name: tabToSync,
            version: tabData.version || 1,
            content: tabData.content,
            is_default: tabData.is_default || false,
            author: tabData.author,
            rating_score: tabData.rating_score,
            rating_grade: tabData.rating_grade,
          },
        }));
      }

      if (historyRes.ok) {
        const histData = await historyRes.json();
        setHistory(histData.history || []);
      }

      setLastRefreshedAt(new Date());
    } catch (e) {
      console.error("Failed to refresh prompt data in-page:", e);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    refreshData(activeTab, false);
  }, []);

  // When active tab changes, silently re-sync that tab's data
  useEffect(() => {
    setAiResult(null);
    setUserIntent("");
    refreshData(activeTab, false);
  }, [activeTab]);

  // Periodic background sync every 7 seconds to keep information 100% current without reloading
  useEffect(() => {
    const interval = setInterval(() => {
      // Only silent sync if user is not currently optimizing or editing
      if (!isOptimizing && !isSaving && !userIntent.trim()) {
        refreshData(activeTab, true);
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [activeTab, isOptimizing, isSaving, userIntent]);

  // Real-time WebSocket connection for live prompt sync across tabs and operators
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWs = () => {
      try {
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.hostname}:8000/api/v1/ws`;
        ws = new WebSocket(wsUrl);

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event_type === "prompt_updated" && msg.data) {
              const { section, version, author, rating_score } = msg.data;
              refreshData(activeTab, false);
              setStatusMsg({
                text: `⚡ Real-time sync: Active prompt updated to v${version} by ${author || "NemoTron"} (Score ${rating_score || 94}/100).`,
              });
            }
          } catch (e) {
            console.error("Failed to parse prompt WS event:", e);
          }
        };

        ws.onclose = () => {
          reconnectTimer = setTimeout(connectWs, 3000);
        };
      } catch (e) {
        console.error("Prompt WS error:", e);
      }
    };

    connectWs();

    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeTab]);

  // Stage cycling animation and timer during optimization
  useEffect(() => {
    let stageInterval: any;
    let timerInterval: any;
    if (isOptimizing) {
      setOptimizationStage(0);
      setElapsedSeconds(0);
      stageInterval = setInterval(() => {
        setOptimizationStage((prev) => (prev < 3 ? prev + 1 : prev));
      }, 1800);
      timerInterval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      setOptimizationStage(0);
      setElapsedSeconds(0);
    }
    return () => {
      clearInterval(stageInterval);
      clearInterval(timerInterval);
    };
  }, [isOptimizing]);

  // Handle Save New Version to backend
  const handleSave = async (overrideContent?: string, extraMeta?: Partial<OptimizationResult>) => {
    const textToSave = overrideContent !== undefined ? overrideContent : draftContent;
    if (!textToSave.trim()) return false;
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeTab}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: textToSave,
          change_summary:
            changeSummary ||
            (extraMeta?.summary_of_changes ? `NemoTron: ${extraMeta.summary_of_changes}` : undefined) ||
            "Updated prompt instruction",
          author: extraMeta ? "NemoTron-550B-Copilot" : "operator",
          rating_score: extraMeta?.rating_score,
          rating_grade: extraMeta?.rating_grade,
          rating_breakdown: extraMeta?.rating_breakdown,
          model_used: extraMeta?.model_used,
        }),
      });

      if (res.ok) {
        setChangeSummary("");
        setUserIntent("");
        // Seamlessly refresh information without reloading the page
        await refreshData(activeTab, false);
        setStatusMsg({ text: "✨ Prompt saved & activated as new production version!" });
        return true;
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail || "Failed to update prompt section", error: true });
        return false;
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", error: true });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // AI Optimize Request
  const handleAIOptimize = async () => {
    if (!userIntent.trim()) return;
    setIsOptimizing(true);
    setStatusMsg(null);
    setAiResult(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeTab}/ai-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_intent: userIntent.trim(),
          current_prompt: draftContent || undefined,
        }),
      });

      if (res.ok) {
        const data: OptimizationResult = await res.json();
        setAiResult(data);

        // 1. Instantly update the Instruction Text Editor with the upgraded prompt!
        setDraftContent(data.optimized_prompt);
        const autoSummary = `NemoTron: ${data.summary_of_changes}`;
        setChangeSummary(autoSummary);
        setUserIntent("");

        // Highlight editor smoothly
        if (editorRef.current) {
          editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // 2. Seamless in-page reactive refresh: immediately synchronize fresh sections, versions & history
        await refreshData(activeTab, false);

        // 3. Status confirmation
        setStatusMsg({
          text: `✨ Prompt upgraded & activated as v${data.version}! In-page data refreshed live (Score ${data.rating_score}/100 · ${data.rating_grade}).`,
        });
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail || "Optimization failed. Please try again.", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error during AI optimization", error: true });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Handle Rollback
  const handleRollback = async (version: number) => {
    if (!confirm(`Are you sure you want to rollback ${activeTab} to Version ${version}?`)) return;
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeTab}/rollback/${version}`, {
        method: "POST",
      });
      if (res.ok) {
        // Seamlessly refresh information without reloading the page
        await refreshData(activeTab, false);
        setStatusMsg({ text: `⚡ Successfully rolled back to Version ${version}!` });
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail || "Rollback failed", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Rollback network error", error: true });
    }
  };

  const currentMeta = SECTION_METADATA[activeTab] || {
    label: activeTab,
    icon: Bot,
    description: "",
  };
  const Icon = currentMeta.icon;
  const currentSection = sections[activeTab];
  const suggestions = SECTION_SUGGESTIONS[activeTab] || [];
  const ActiveStageIcon = OPTIMIZATION_STAGES[optimizationStage].icon;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2.5">
            Modular System Prompts
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-400 flex items-center gap-1">
              <Cpu className="w-3 h-3 text-purple-400" />
              NemoTron 3 Ultra 550B Architect
            </span>
          </h2>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Independent, version-controlled system instruction sections with live AI prompt engineering and instant rollback.
          </p>
        </div>

        {/* Live Sync & Reactive In-Page Refresh Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[11px] font-mono text-[var(--ed-text-muted)]">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <span>Synced {lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "now"}</span>
          </div>

          <button
            onClick={() => refreshData(activeTab, false)}
            disabled={isRefreshing}
            title="Silently refresh prompt data without reloading page"
            className="ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)] shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>{isRefreshing ? "Refreshing..." : "Refresh Data"}</span>
          </button>
        </div>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold animate-in fade-in ${
            statusMsg.error
              ? "bg-[var(--ed-danger)]/10 text-[var(--ed-danger)] border-[var(--ed-danger)]/30"
              : "bg-[var(--ed-success)]/10 text-[var(--ed-success)] border-[var(--ed-success)]/30"
          }`}
        >
          {statusMsg.error ? (
            <AlertCircle className="w-4 h-4 shrink-0 text-[var(--ed-danger)]" />
          ) : (
            <CheckCircle className="w-4 h-4 shrink-0 text-[var(--ed-success)]" />
          )}
          {statusMsg.text}
        </div>
      )}

      {/* Grid: Sections Navigation + Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left: Section Selector */}
        <div className="space-y-2">
          {Object.entries(SECTION_METADATA).map(([key, meta]) => {
            const SectionIcon = meta.icon;
            const isSelected = activeTab === key;
            const secData = sections[key];

            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`ed-press ed-focus-ring w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-[var(--ed-surface)] border-l-2 border-[var(--ed-accent)] border-[var(--ed-border)] shadow-sm"
                    : "bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:bg-[var(--ed-bg)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <SectionIcon
                      className={`w-4 h-4 ${isSelected ? "text-[var(--ed-accent)]" : "text-[var(--ed-text-muted)]"}`}
                    />
                    <span
                      className={`text-xs font-bold ${
                        isSelected ? "text-[var(--ed-text-primary)]" : "text-[var(--ed-text-muted)]"
                      }`}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {meta.protected && <Lock className="w-3 h-3 text-[var(--ed-text-muted)]" />}
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--ed-text-muted)] mt-2">
                  <span className="font-data">Version {secData?.version || 1}</span>
                  {secData?.is_default && <span className="text-[var(--ed-accent)] font-semibold">Default</span>}
                </div>
              </button>
            );
          })}

          {/* Prompt Assembly Token Distribution Donut Card */}
          <div className="ed-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--ed-text-primary)]">
              <span className="flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-purple-400" />
                Prompt Token Budget
              </span>
              <span className="font-data text-[10px] text-[var(--ed-text-muted)]">
                ~{Math.round(Object.values(sections).reduce((a, s) => a + (s?.content?.length || 0), 0) / 4)} tokens
              </span>
            </div>

            {/* SVG Donut */}
            <div className="flex justify-center py-1">
              <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                {(() => {
                  const palette: Record<string, string> = {
                    core_safety: "#EF4444",
                    core_identity: "#8B5CF6",
                    business_policy: "#F59E0B",
                    sales_style: "#10B981",
                    business_profile: "#3B82F6",
                  };
                  const total = Object.values(sections).reduce((a, s) => a + (s?.content?.length || 1), 0) || 1;
                  const circ = 2 * Math.PI * 40;
                  let accumulated = 0;

                  return Object.entries(sections).map(([k, s]) => {
                    const len = s?.content?.length || 100;
                    const ratio = len / total;
                    const dash = ratio * circ;
                    const offset = -accumulated * circ;
                    accumulated += ratio;
                    const color = palette[k] || "#64748B";

                    return (
                      <circle
                        key={k}
                        cx="60"
                        cy="60"
                        r="40"
                        fill="transparent"
                        stroke={color}
                        strokeWidth="16"
                        strokeDasharray={`${dash} ${circ}`}
                        strokeDashoffset={offset}
                        className="transition-all duration-300"
                      />
                    );
                  });
                })()}
              </svg>
            </div>

            {/* Micro Legend */}
            <div className="space-y-1.5 text-[10px]">
              {Object.entries(SECTION_METADATA).map(([k, m]) => {
                const palette: Record<string, string> = {
                  core_safety: "#EF4444",
                  core_identity: "#8B5CF6",
                  business_policy: "#F59E0B",
                  sales_style: "#10B981",
                  business_profile: "#3B82F6",
                };
                const total = Object.values(sections).reduce((a, s) => a + (s?.content?.length || 1), 0) || 1;
                const len = sections[k]?.content?.length || 100;
                const pct = Math.round((len / total) * 100);
                return (
                  <div key={k} className="flex items-center justify-between text-[var(--ed-text-muted)]">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: palette[k] }} />
                      <span className="truncate">{m.label.split(" ")[0]}</span>
                    </div>
                    <span className="font-data font-semibold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center/Right Column: 1. Main Editor -> 2. AI Prompt Architect -> 3. Version History */}
        <div className="lg:col-span-3 space-y-6">
          {/* 1. MAIN SYSTEM PROMPT EDITOR PANEL (Keep at top for immediate view & live reflection) */}
          <div className="ed-panel rounded-xl p-6 space-y-4 border border-[var(--ed-border)] bg-[var(--ed-surface)]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2 flex-wrap">
                  <Icon className="w-4 h-4 text-[var(--ed-accent)]" />
                  {currentMeta.label}
                  <span
                    className="text-xs px-2 py-0.5 rounded border border-[var(--ed-border)] text-[var(--ed-text-muted)] font-data"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    Version {currentSection?.version || 1}
                  </span>
                  {history[0]?.rating_score && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                      <Star className="w-2.5 h-2.5 fill-amber-400" />
                      Rating: {history[0].rating_score}/100 ({history[0].rating_grade || "A+"})
                    </span>
                  )}
                </h3>
                <p className="text-xs text-[var(--ed-text-muted)] mt-1">{currentMeta.description}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => refreshData(activeTab, false)}
                  disabled={isRefreshing}
                  title="In-page refresh: Re-sync latest active prompt and history from database"
                  className="ed-press ed-focus-ring inline-flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold border border-[var(--ed-border)] bg-[var(--ed-bg)] hover:bg-[var(--ed-surface)] text-[var(--ed-text-primary)] transition-all disabled:opacity-50 shrink-0"
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${isRefreshing ? "animate-spin" : ""}`} />
                  <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync Live"}</span>
                </button>

                <button
                  onClick={() => handleSave()}
                  disabled={isSaving || !draftContent.trim()}
                  className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50 shrink-0"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isSaving ? "Saving..." : "Save & Activate"}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-[var(--ed-text-primary)] flex items-center gap-2">
                  Instruction Text (Production System Prompt)
                  {currentSection?.content !== draftContent && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-normal">
                      Unsaved Draft Changes
                    </span>
                  )}
                </label>
                <span className="text-[10px] font-mono text-[var(--ed-text-muted)]">
                  {draftContent.length} chars · ~{Math.round(draftContent.length / 4)} tokens
                </span>
              </div>
              <textarea
                ref={editorRef}
                rows={11}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                placeholder="Enter system prompt instruction..."
                className="w-full p-3.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] font-mono text-xs text-[var(--ed-text-primary)] leading-relaxed ed-focus-ring shadow-inner"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ed-text-primary)] mb-1.5">
                Change Summary (Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Renamed agent to Rakesh and customized consultative inquiries"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-xs text-[var(--ed-text-primary)] ed-focus-ring"
              />
            </div>
          </div>

          {/* 2. AI PROMPT ARCHITECT COPILOT BOX (Placed right below editor for natural prompt writing) */}
          <div className="ed-panel rounded-xl p-5 border border-purple-500/30 bg-gradient-to-br from-[var(--ed-surface)] via-[var(--ed-surface)] to-purple-950/20 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center shadow-md shrink-0">
                  <Wand2 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                    NemoTron 3 Ultra 550B Prompt Architect
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      550B + 120B Fallback
                    </span>
                  </h4>
                  <p className="text-[11px] text-[var(--ed-text-muted)]">
                    Describe what you want to write or change in plain English. NemoTron will generate enterprise prompt instructions and auto-apply them above.
                  </p>
                </div>
              </div>

              {/* Auto-Save Toggle */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-purple-500/30 bg-purple-950/30 text-[11px] text-purple-200">
                <input
                  type="checkbox"
                  id="autoSaveToggle"
                  checked={autoSaveOnUpgrade}
                  onChange={(e) => setAutoSaveOnUpgrade(e.target.checked)}
                  className="rounded border-purple-500/50 text-purple-600 focus:ring-purple-500/50 cursor-pointer"
                />
                <label htmlFor="autoSaveToggle" className="cursor-pointer font-medium flex items-center gap-1 select-none">
                  <Zap className="w-3 h-3 text-amber-400" />
                  Auto-Save Version
                </label>
              </div>
            </div>

            {/* Suggestions chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-medium text-[var(--ed-text-muted)]">Suggestions:</span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserIntent(s)}
                  className="text-[10px] px-2 py-1 rounded-md border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-muted)] hover:text-purple-300 hover:border-purple-500/40 transition-all ed-press"
                >
                  + {s}
                </button>
              ))}
            </div>

            {/* Prompt description input */}
            <div className="space-y-3">
              <textarea
                rows={3}
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                placeholder={`Describe your requirements for ${currentMeta.label} in plain English (e.g. "Simply change the name from EDITH to Rakesh and make the tone consultative with single-question SPIN inquiries")...`}
                className="w-full p-3 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-xs text-[var(--ed-text-primary)] leading-relaxed ed-focus-ring placeholder:text-[var(--ed-text-muted)]/50"
              />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <span className="text-[10px] text-[var(--ed-text-muted)] flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                  Applies strict section boundaries, few-shot patterns, negative constraints, and zero-hallucination guardrails.
                </span>

                <button
                  onClick={handleAIOptimize}
                  disabled={isOptimizing || !userIntent.trim()}
                  className="ed-press ed-focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 hover:from-purple-500 hover:to-indigo-500 shadow-md transition-all disabled:opacity-50 shrink-0"
                >
                  <Sparkles className="w-4 h-4 text-amber-300 animate-spin" />
                  {isOptimizing ? `Deliberating (${elapsedSeconds}s)...` : "Upgrade with NemoTron 550B"}
                </button>
              </div>
            </div>

            {/* High-Tech Deliberation Animation */}
            {isOptimizing && (
              <div className="p-4 rounded-xl border border-purple-500/40 bg-purple-950/30 space-y-3 relative overflow-hidden">
                {/* Glowing cybernetic backdrop */}
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-purple-500/10 animate-pulse pointer-events-none" />

                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-9 h-9 rounded-xl bg-purple-600/30 border border-purple-400/50 flex items-center justify-center shrink-0 shadow-lg">
                    <ActiveStageIcon className="w-5 h-5 text-purple-200 animate-spin" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-purple-100 flex items-center gap-2">
                        {OPTIMIZATION_STAGES[optimizationStage].title}
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      </span>
                      <span className="text-[10px] font-mono text-purple-300">
                        {elapsedSeconds}s · Stage {optimizationStage + 1}/4
                      </span>
                    </div>
                    <p className="text-[11px] text-purple-300/80 mt-0.5">
                      {OPTIMIZATION_STAGES[optimizationStage].desc}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-purple-950/80 rounded-full h-2 overflow-hidden border border-purple-500/30 relative z-10">
                  <div
                    className="bg-gradient-to-r from-purple-500 via-indigo-400 to-amber-300 h-2 transition-all duration-300 rounded-full"
                    style={{ width: `${Math.min(100, ((optimizationStage + 1) / 4) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* AI Result & Rating Banner */}
            {aiResult && !isOptimizing && (
              <div className="p-4 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-4 animate-in fade-in">
                {/* Top Rating Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-1.5 text-emerald-300 font-bold font-data text-xs">
                      <Star className="w-3.5 h-3.5 fill-emerald-400 text-emerald-400" />
                      Score: {aiResult.rating_score}/100 · Grade {aiResult.rating_grade}
                    </div>
                    <span className="text-xs font-semibold text-emerald-200 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-400" />
                      {autoSaveOnUpgrade ? "Auto-Applied & Saved to History" : "Auto-Applied to Editor"}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-300/70">
                    Model: {aiResult.model_used.split("/").pop()} ({aiResult.latency_ms}ms)
                  </span>
                </div>

                {/* Micro Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Clarity</div>
                    <div className="font-bold text-emerald-400 font-data">{aiResult.rating_breakdown.clarity}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Constraints</div>
                    <div className="font-bold text-emerald-400 font-data">{aiResult.rating_breakdown.constraint_strength}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">B2B Efficacy</div>
                    <div className="font-bold text-emerald-400 font-data">{aiResult.rating_breakdown.b2b_effectiveness}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Safety Grounding</div>
                    <div className="font-bold text-emerald-400 font-data">{aiResult.rating_breakdown.safety_grounding}%</div>
                  </div>
                </div>

                {/* Summary of changes */}
                <div className="text-xs text-[var(--ed-text-muted)] space-y-1">
                  <div className="font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5 text-[11px]">
                    <ThumbsUp className="w-3 h-3 text-emerald-400" />
                    Key Architectural Changes:
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ed-text-muted)] bg-[var(--ed-surface)] p-2.5 rounded-lg border border-[var(--ed-border)]">
                    {aiResult.summary_of_changes}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                  <button
                    onClick={() => setAiResult(null)}
                    className="ed-press px-3 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] text-xs font-medium"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={() => {
                      setDraftContent(aiResult.optimized_prompt);
                      setChangeSummary(`NemoTron: ${aiResult.summary_of_changes}`);
                      setStatusMsg({ text: "Applied AI optimized prompt to editor! Review above." });
                    }}
                    className="ed-press inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-purple-500/40 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-semibold"
                  >
                    <ArrowRight className="w-3 h-3" /> Re-apply to Editor
                  </button>
                  <button
                    onClick={() => handleSave(aiResult.optimized_prompt, aiResult)}
                    disabled={isSaving}
                    className="ed-press inline-flex items-center gap-1 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm"
                  >
                    <Check className="w-3 h-3" /> Save & Activate (v{(currentSection?.version || 1) + 1})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. VERSION HISTORY & ROLLBACK TABLE */}
          <div className="ed-panel rounded-xl p-6 border border-[var(--ed-border)] bg-[var(--ed-surface)]">
            <h4 className="font-bold text-xs text-[var(--ed-text-primary)] flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
              Version History & Rollback
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-[var(--ed-text-muted)]">No previous versions recorded for this section. Upgrades will be recorded here automatically.</p>
            ) : (
              <div className="divide-y divide-[var(--ed-border)] text-xs">
                {history.map((h) => (
                  <div key={h.version} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-data font-bold text-[var(--ed-text-primary)]">v{h.version}</span>
                        {h.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ed-success)]/10 text-[var(--ed-success)] border border-[var(--ed-success)]/20">
                            Active
                          </span>
                        )}
                        {h.rating_score && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 font-data">
                            <Star className="w-2.5 h-2.5 fill-amber-400" />
                            {h.rating_score}/100 ({h.rating_grade || "A+"})
                          </span>
                        )}
                        <span className="text-[var(--ed-text-muted)] text-[11px]">by {h.author}</span>
                      </div>
                      <p className="text-[var(--ed-text-muted)] text-[11px] mt-0.5">
                        {h.change_summary || "No description"}
                      </p>
                    </div>

                    {!h.is_active && (
                      <button
                        onClick={() => handleRollback(h.version)}
                        className="ed-press ed-focus-ring inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-surface)] text-[11px] font-medium transition-all"
                      >
                        <RotateCcw className="w-3 h-3" /> Rollback
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
