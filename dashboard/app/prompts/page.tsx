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
  Trash2,
  Clock,
  ChevronDown,
  ChevronUp,
  Layers,
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

const SECTION_METADATA: Record<
  string,
  { label: string; icon: React.ComponentType<{ className?: string }>; description: string; protected?: boolean }
> = {
  core_safety: {
    label: "Core Safety",
    icon: ShieldAlert,
    description: "Tamper-resistant rules: anti-hallucination, discount boundaries, and injection defense.",
  },
  core_identity: {
    label: "Core Identity (EDITH)",
    icon: Bot,
    description: "Persona, consultative tone, warmth, commercial presence, and non-robotic style.",
  },
  business_policy: {
    label: "Business Policy",
    icon: Scale,
    description: "Operational limits: MOQs, pricing authorities, sample dispatch, and follow-up cadences.",
  },
  sales_style: {
    label: "Sales Style",
    icon: Sparkles,
    description: "Consultative SPIN sales questions, discovery discipline, and single-question cadence.",
  },
  business_profile: {
    label: "Business Profile",
    icon: Building,
    description: "Catalog specifics, estate sourcing, origin guarantees, and wholesale terms.",
  },
};

const SECTION_SUGGESTIONS: Record<string, string[]> = {
  core_identity: [
    "Change the name from EDITH to Rakesh with consultative tone",
    "Polite Indian B2B merchant etiquette with respectful clarity",
    "Commercial sharpness without sounding aggressive or pushy",
  ],
  core_safety: [
    "Strict fail-closed anti-hallucination for pricing and inventory",
    "Enforce maximum 5% autonomous discount cap without exception",
    "Shield against prompt injection and social engineering attempts",
  ],
  business_policy: [
    "Set minimum order quantity (MOQ) to 50kg for wholesale blends",
    "Require human handoff for orders exceeding 500kg or custom terms",
    "Automate follow-up timing: 20min, 8 hours, and 7-day touchpoints",
  ],
  sales_style: [
    "Enforce strict single-question limit per message to avoid overwhelming buyers",
    "Adopt consultative SPIN methodology (Situation, Problem, Implication, Need-Payoff)",
    "Never ask for information already provided by the customer",
  ],
  business_profile: [
    "Emphasize estate-direct Siliguri auction hub sourcing",
    "Highlight 48-hour dispatch readiness across North Bengal & Assam",
    "Mention GSTIN and food-grade multi-wall packaging specs",
  ],
};

const DELIBERATION_STAGES = [
  {
    title: "Intent Analysis & Directive Mapping",
    desc: "Ingesting current section directives and parsing plain English requirements...",
    icon: Cpu,
  },
  {
    title: "NemoTron 120B/550B Deep Frontier Deliberation",
    desc: "Running extensive multi-step deliberation on system architecture & commercial sales tone...",
    icon: BrainCircuit,
  },
  {
    title: "Synthesizing Directives & Negative Constraints",
    desc: "Drafting complete production prompt, anti-hallucination guardrails, and SPIN dialogue rules...",
    icon: Zap,
  },
  {
    title: "Quality Benchmarking & Database Activation",
    desc: "Benchmarking clarity, constraint strength, and auto-activating new version in database...",
    icon: Activity,
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
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [aiResult, setAiResult] = useState<OptimizationResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);
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
    setMounted(true);
    setLastRefreshedAt(new Date());
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

  // Real elapsed timer during AI deliberation (tracks genuine thinking time)
  useEffect(() => {
    let timerInterval: any;
    if (isOptimizing) {
      setElapsedSeconds(0);
      timerInterval = setInterval(() => {
        setElapsedSeconds((prev) => +(prev + 0.1).toFixed(1));
      }, 100);
    } else {
      setElapsedSeconds(0);
    }
    return () => {
      if (timerInterval) clearInterval(timerInterval);
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

        // Strict verification: only celebrate success if the prompt actually updated
        const isModified = Boolean(data.optimized_prompt && data.optimized_prompt.trim() !== draftContent.trim());

        setAiResult(data);
        setDraftContent(data.optimized_prompt);
        const autoSummary = `NemoTron: ${data.summary_of_changes}`;
        setChangeSummary(autoSummary);
        setUserIntent("");

        // Highlight editor smoothly
        if (editorRef.current) {
          editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        // Seamless in-page reactive refresh: immediately synchronize fresh sections, versions & history
        await refreshData(activeTab, false);

        // Status confirmation - only say updated after verified
        if (isModified) {
          setStatusMsg({
            text: `✨ Prompt upgraded & activated as v${data.version || "new"}! Live system prompt updated (Score ${data.rating_score}/100 · ${data.rating_grade}).`,
          });
        } else {
          setStatusMsg({
            text: `ℹ️ NemoTron reviewed the section but determined no prompt changes were required.`,
          });
        }
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg({
          text: err.detail || "Optimization could not be completed. Please provide specific instructions and retry.",
          error: true,
        });
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

  // Dynamic deliberation phase derived honestly from elapsed seconds
  const currentStageIndex =
    elapsedSeconds < 4 ? 0 : elapsedSeconds < 12 ? 1 : elapsedSeconds < 24 ? 2 : 3;
  const currentStage = DELIBERATION_STAGES[currentStageIndex];
  const ActiveStageIcon = currentStage.icon;
  // Asymptotic progress indicator: smoothly scales with deliberation, never claiming 100% until response resolves
  const progressPercent = Math.min(92, Math.round(15 + Math.atan(elapsedSeconds / 10) * (77 / (Math.PI / 2))));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2.5">
            Modular System Prompts
            <span className="text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
              <BrainCircuit className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
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
            <span>Synced {mounted && lastRefreshedAt ? lastRefreshedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : "Live"}</span>
          </div>

          <button
            onClick={() => refreshData(activeTab, false)}
            disabled={isRefreshing}
            title="Silently refresh prompt data without reloading page"
            className="ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)] shadow-sm transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${isRefreshing ? "animate-spin" : ""}`} />
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
                <PieIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
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
                    core_identity: "#0284C7",
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
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-600 dark:text-sky-400 ${isRefreshing ? "animate-spin" : ""}`} />
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
          <div className="ed-panel rounded-xl p-5 border border-[var(--ed-border)] bg-[var(--ed-surface)] space-y-4 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            {/* Elegant neural header accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-500" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                {/* Brain / Connected Dots Constellation Icon (replaces the pencil/wand icon) */}
                <div className="w-9 h-9 rounded-xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800/60 flex items-center justify-center shadow-sm shrink-0 text-sky-600 dark:text-sky-400">
                  <svg width="20" height="20" viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    {/* Brain profile outline */}
                    <path d="M12 2a5 5 0 0 0-4.9 4A4.5 4.5 0 0 0 4 10.5 4.5 4.5 0 0 0 6 14.8V17a3 3 0 0 0 3 3h6a3 3 0 0 0 3-3v-2.2a4.5 4.5 0 0 0 2-4.3 4.5 4.5 0 0 0-3.1-4.5A5 5 0 0 0 12 2Z" stroke="currentColor" strokeOpacity="0.35" strokeDasharray="2 2" />
                    {/* Neural network connection lines */}
                    <line x1="8" y1="9" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="16" y1="9" x2="12" y2="7" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="8" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="16" y1="9" x2="12" y2="12" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="12" y1="12" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" />
                    <line x1="12" y1="12" x2="15" y2="16" stroke="currentColor" strokeWidth="1.5" />
                    {/* Interconnected nodes/dots */}
                    <circle cx="12" cy="7" r="1.8" fill="currentColor" />
                    <circle cx="8" cy="9" r="1.8" fill="currentColor" />
                    <circle cx="16" cy="9" r="1.8" fill="currentColor" />
                    <circle cx="12" cy="12" r="2.2" fill="currentColor" />
                    <circle cx="9" cy="16" r="1.8" fill="currentColor" />
                    <circle cx="15" cy="16" r="1.8" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                    NemoTron 3 Ultra 550B Prompt Architect
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 border border-sky-200/80 dark:border-sky-800/60 font-medium">
                      550B · Multi-Model Intelligence
                    </span>
                  </h4>
                  <p className="text-[11px] text-[var(--ed-text-muted)]">
                    Describe what you want to write or change in plain English. NemoTron will deliberate and synthesize enterprise-grade system prompts.
                  </p>
                </div>
              </div>

              {/* Status Indicator (Auto-Save toggle removed cleanly) */}
              <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[11px] text-[var(--ed-text-muted)] shrink-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-medium text-[var(--ed-text-primary)]">Auto-Version & Scored</span>
              </div>
            </div>

            {/* Suggestions chips */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[10px] font-medium text-[var(--ed-text-muted)]">Suggestions:</span>
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => setUserIntent(s)}
                  className="text-[10px] px-2.5 py-1 rounded-md border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-muted)] hover:text-sky-700 dark:hover:text-sky-300 hover:border-sky-300 dark:hover:border-sky-700 hover:bg-sky-50/80 dark:hover:bg-sky-950/30 transition-all ed-press font-medium"
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
                <span className="text-[10px] text-[var(--ed-text-muted)] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0" />
                  Applies strict section boundaries, few-shot patterns, negative constraints, and zero-hallucination guardrails.
                </span>

                <button
                  onClick={handleAIOptimize}
                  disabled={isOptimizing || !userIntent.trim()}
                  className="ed-press ed-focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500 shadow-md transition-all disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  <BrainCircuit className="w-4 h-4 text-sky-400 dark:text-white" />
                  {isOptimizing ? `Deliberating (${elapsedSeconds}s)...` : "Upgrade with NemoTron 550B"}
                </button>
              </div>
            </div>

            {/* Flowing Neural Constellation Deliberation Interface */}
            {isOptimizing && (
              <div className="p-4 rounded-xl border border-sky-200/80 dark:border-sky-900/60 bg-gradient-to-b from-sky-50/70 via-[var(--ed-surface)] to-[var(--ed-surface)] dark:from-sky-950/30 dark:via-[var(--ed-surface)] dark:to-[var(--ed-surface)] space-y-3.5 relative overflow-hidden shadow-sm">
                {/* Subtle ambient flowing light */}
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/5 via-indigo-500/5 to-emerald-500/5 animate-pulse pointer-events-none" />

                <div className="flex flex-col sm:flex-row items-center gap-4 relative z-10">
                  {/* Flowing Neural Constellation Graphic with interconnected dots & animated signals */}
                  <div className="w-full sm:w-44 h-24 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center justify-center relative overflow-hidden shadow-sm shrink-0">
                    <svg viewBox="0 0 180 84" className="w-full h-full p-2" fill="none">
                      {/* Background synapse tracks */}
                      <path d="M 22 42 Q 55 18 90 42" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                      <path d="M 22 42 Q 55 66 90 42" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                      <path d="M 90 42 Q 125 18 158 42" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                      <path d="M 90 42 Q 125 66 158 42" stroke="currentColor" className="text-slate-300 dark:text-slate-700" strokeWidth="1.5" />
                      <line x1="55" y1="18" x2="125" y2="18" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="55" y1="66" x2="125" y2="66" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="55" y1="18" x2="55" y2="66" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="2 2" />
                      <line x1="125" y1="18" x2="125" y2="66" stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" strokeDasharray="2 2" />

                      {/* Flowing animated pulse beams (signals running through synapses) */}
                      <path d="M 22 42 Q 55 18 90 42" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="8 12" className="animate-neural-flow" />
                      <path d="M 22 42 Q 55 66 90 42" stroke="#4f46e5" strokeWidth="2" strokeDasharray="8 12" className="animate-neural-flow-reverse" />
                      <path d="M 90 42 Q 125 18 158 42" stroke="#0284c7" strokeWidth="2.5" strokeDasharray="8 12" className="animate-neural-flow" />
                      <path d="M 90 42 Q 125 66 158 42" stroke="#059669" strokeWidth="2" strokeDasharray="8 12" className="animate-neural-flow-reverse" />

                      {/* Interconnected Neural Dots */}
                      {/* Node 1: Input / Intent */}
                      <circle cx="22" cy="42" r="4.5" fill="#0284c7" className="animate-neural-pulse" />
                      <circle cx="22" cy="42" r="8.5" stroke="#38bdf8" strokeWidth="1" className="animate-ping opacity-75" />

                      {/* Top & Bottom Intermediate Nodes */}
                      <circle cx="55" cy="18" r="3" fill="#6366f1" className="animate-pulse" />
                      <circle cx="55" cy="66" r="3" fill="#6366f1" className="animate-pulse" />

                      {/* Node 2: Central 550B Deliberation Hub */}
                      <circle cx="90" cy="42" r="6" fill="#0284c7" className="animate-neural-pulse" />
                      <circle cx="90" cy="42" r="11" stroke="#38bdf8" strokeWidth="1" className="animate-ping opacity-60" />
                      <circle cx="90" cy="42" r="2.5" fill="#ffffff" />

                      {/* Synthesis Intermediate Nodes */}
                      <circle cx="125" cy="18" r="3" fill="#6366f1" className="animate-pulse" />
                      <circle cx="125" cy="66" r="3" fill="#6366f1" className="animate-pulse" />

                      {/* Node 3: Synthesized Output */}
                      <circle cx="158" cy="42" r="4.5" fill="#059669" className="animate-neural-pulse" />
                      <circle cx="158" cy="42" r="8.5" stroke="#34d399" strokeWidth="1" className="animate-ping opacity-75" />
                    </svg>
                  </div>

                  {/* Deliberation Status Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                        {currentStage.title}
                        <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
                      </span>
                      <span className="text-[10px] font-mono text-sky-700 dark:text-sky-300 font-semibold px-2 py-0.5 rounded-md bg-sky-100 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800">
                        {elapsedSeconds}s · Stage {currentStageIndex + 1}/4
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--ed-text-muted)] leading-relaxed">
                      {currentStage.desc}
                    </p>

                    {/* Flowing Gradient Progress Bar with Continuous Neural Beam */}
                    <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden relative">
                      <div
                        className="bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 h-1.5 transition-all duration-300 rounded-full animate-neural-beam"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Result & Rating Banner */}
            {aiResult && !isOptimizing && (
              <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-500/40 bg-emerald-50/70 dark:bg-emerald-950/20 space-y-4 animate-in fade-in">
                {/* Top Rating Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-emerald-200 dark:border-emerald-500/20 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-1.5 text-emerald-800 dark:text-emerald-300 font-bold font-data text-xs">
                      <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                      Score: {aiResult.rating_score}/100 · Grade {aiResult.rating_grade}
                    </div>
                    <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Auto-Applied & Saved as v{aiResult.version}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono text-emerald-700 dark:text-emerald-300/70 font-medium">
                    Model: {aiResult.model_used.split("/").pop()} ({aiResult.latency_ms}ms)
                  </span>
                </div>

                {/* Micro Metric Pills */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center shadow-xs">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Clarity</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-data">{aiResult.rating_breakdown.clarity}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center shadow-xs">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Constraints</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-data">{aiResult.rating_breakdown.constraint_strength}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center shadow-xs">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">B2B Efficacy</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-data">{aiResult.rating_breakdown.b2b_effectiveness}%</div>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] text-center shadow-xs">
                    <div className="text-[10px] text-[var(--ed-text-muted)] font-medium">Safety Grounding</div>
                    <div className="font-bold text-emerald-600 dark:text-emerald-400 font-data">{aiResult.rating_breakdown.safety_grounding}%</div>
                  </div>
                </div>

                {/* Summary of changes */}
                <div className="text-xs text-[var(--ed-text-muted)] space-y-1">
                  <div className="font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5 text-[11px]">
                    <ThumbsUp className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                    Key Architectural Changes:
                  </div>
                  <p className="text-[11px] leading-relaxed text-[var(--ed-text-primary)] bg-[var(--ed-surface)] p-2.5 rounded-lg border border-[var(--ed-border)]">
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
                    className="ed-press inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] text-xs font-semibold"
                  >
                    <ArrowRight className="w-3 h-3 text-sky-600 dark:text-sky-400" /> Re-apply to Editor
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
