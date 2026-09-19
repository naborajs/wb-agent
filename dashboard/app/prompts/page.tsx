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
  Plus,
  Pin,
  GitCompare,
  FileText,
  Truck,
  HelpCircle,
  ArrowUp,
  ArrowDown,
  Bookmark,
  ExternalLink,
} from "lucide-react";

interface DynamicSection {
  id: string;
  key: string;
  display_name: string;
  icon: string;
  description: string;
  order_index: number;
  is_active: boolean;
  is_system: boolean;
  is_archived: boolean;
  preferred_model_tier?: string;
  active_version: number;
  active_content: string;
  token_count: number;
  author: string;
  quality_score?: number;
  quality_grade?: string;
  pinned?: boolean;
  change_summary?: string;
}

interface VersionHistoryItem {
  version: number;
  content: string;
  is_active: boolean;
  pinned: boolean;
  author: string;
  change_summary?: string;
  created_at?: string;
  token_count?: number;
  quality_score?: number;
  quality_grade?: string;
  rating_breakdown?: {
    clarity?: number;
    constraint_strength?: number;
    b2b_effectiveness?: number;
    safety_grounding?: number;
  };
  model_used?: string;
}

interface DiffChunk {
  type: "add" | "delete" | "equal";
  line: string;
  old_line_no: number | null;
  new_line_no: number | null;
}

interface DiffResult {
  section: string;
  from_version: number;
  to_version: number;
  from_author: string;
  to_author: string;
  from_summary?: string;
  to_summary?: string;
  chunks: DiffChunk[];
  added_count: number;
  removed_count: number;
  unchanged_count: number;
  total_lines: number;
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
  token_count?: number;
  latency_ms: number;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  ShieldAlert,
  Bot,
  Scale,
  Sparkles,
  Building,
  RefreshCw,
  Truck,
  FileText,
  BadgeCheck: CheckCircle,
  HelpCircle,
  Layers,
  Zap,
  Star,
};

const PALETTE = [
  "#EF4444", // Red
  "#0284C7", // Sky
  "#F59E0B", // Amber
  "#10B981", // Emerald
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#14B8A6", // Teal
  "#F97316", // Orange
  "#6366F1", // Indigo
  "#64748B", // Slate
];

const DELIBERATION_STAGES = [
  {
    title: "Intent Analysis & Cross-Section Mapping",
    desc: "Ingesting user directives and verifying non-contradiction with other active prompt modules...",
    icon: Cpu,
  },
  {
    title: "NemoTron 550B Deep Frontier Deliberation",
    desc: "Running extensive deliberation on commercial B2B sales tone, pricing boundaries & SPIN dialogue...",
    icon: BrainCircuit,
  },
  {
    title: "Synthesizing Directives & Negative Constraints",
    desc: "Drafting complete production prompt, anti-hallucination guardrails, and deterministic rules...",
    icon: Zap,
  },
  {
    title: "Quality Benchmarking & Database Activation",
    desc: "Benchmarking 4 dimensions (Clarity, Constraint, B2B, Safety) and auto-activating version in database...",
    icon: Activity,
  },
];

export default function PromptsPage() {
  const [sections, setSections] = useState<DynamicSection[]>([]);
  const [activeKey, setActiveKey] = useState<string>("core_identity");
  const [draftContent, setDraftContent] = useState<string>("");
  const [changeSummary, setChangeSummary] = useState<string>("");
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState<boolean>(true);
  const [historyLimit, setHistoryLimit] = useState<number>(5);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Diff Modal State
  const [selectedVersionsForDiff, setSelectedVersionsForDiff] = useState<number[]>([]);
  const [diffModalOpen, setDiffModalOpen] = useState<boolean>(false);
  const [diffData, setDiffData] = useState<DiffResult | null>(null);
  const [isLoadingDiff, setIsLoadingDiff] = useState<boolean>(false);

  // New Section Modal State
  const [newSectionModalOpen, setNewSectionModalOpen] = useState<boolean>(false);
  const [newSecTab, setNewSecTab] = useState<"ai" | "manual">("ai");
  const [aiDraftPrompt, setAiDraftPrompt] = useState<string>("");
  const [isDraftingSection, setIsDraftingSection] = useState<boolean>(false);
  const [manualName, setManualName] = useState<string>("");
  const [manualKey, setManualKey] = useState<string>("");
  const [manualDesc, setManualDesc] = useState<string>("");
  const [manualIcon, setManualIcon] = useState<string>("Sparkles");
  const [manualStarter, setManualStarter] = useState<string>("");

  // AI Copilot state
  const [userIntent, setUserIntent] = useState<string>("");
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [activeDeliberationStage, setActiveDeliberationStage] = useState<number>(0);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);
  const [aiResult, setAiResult] = useState<OptimizationResult | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null);
  const [mounted, setMounted] = useState<boolean>(false);

  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Fetch all sections
  const refreshData = async (targetKey?: string, preserveDraftIfDirty: boolean = false) => {
    const currentKey = targetKey || activeKey;
    setIsRefreshing(true);
    try {
      const cacheBust = Date.now();
      const fetchOpts: RequestInit = {
        cache: "no-store",
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      };

      const [sectionsRes, historyRes] = await Promise.all([
        fetch(`/api/v1/prompts/sections?_t=${cacheBust}`, fetchOpts),
        fetch(`/api/v1/prompts/sections/${currentKey}/history?_t=${cacheBust}`, fetchOpts),
      ]);

      if (sectionsRes.ok) {
        const data = await sectionsRes.json();
        const secList: DynamicSection[] = data.sections || [];
        setSections(secList);

        const currentSec = secList.find((s) => s.key === currentKey || s.id === currentKey);
        if (currentSec && !preserveDraftIfDirty) {
          setDraftContent(currentSec.active_content);
        }
      }

      if (historyRes.ok) {
        const histData = await historyRes.json();
        setHistory(histData.history || []);
      }
      setLastRefreshedAt(new Date());
    } catch (err: any) {
      loggerError("Failed to fetch prompt sections:", err);
    } finally {
      setIsRefreshing(false);
    }
  };

  function loggerError(msg: string, e: any) {
    if (process.env.NODE_ENV !== "production") {
      console.error(msg, e);
    }
  }

  useEffect(() => {
    setMounted(true);
    refreshData();
  }, []);

  // Sync draft content when switching section tab
  const handleTabChange = (newKey: string) => {
    setActiveKey(newKey);
    setSelectedVersionsForDiff([]);
    setAiResult(null);
    setStatusMsg(null);
    refreshData(newKey, false);
  };

  // Timer for AI deliberation animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOptimizing) {
      setElapsedSeconds(0);
      setActiveDeliberationStage(0);
      interval = setInterval(() => {
        setElapsedSeconds((prev) => {
          const next = prev + 1;
          if (next > 12) setActiveDeliberationStage(3);
          else if (next > 7) setActiveDeliberationStage(2);
          else if (next > 2) setActiveDeliberationStage(1);
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOptimizing]);

  const activeSection = sections.find((s) => s.key === activeKey || s.id === activeKey) || sections[0];

  // Save active prompt as a new version
  const handleSavePrompt = async () => {
    if (!draftContent.trim() || isSaving || !activeSection) return;
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeSection.key}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent.trim(),
          change_summary: changeSummary.trim() || "Manual update via dashboard editor",
          author: "operator",
        }),
      });

      if (res.ok) {
        setChangeSummary("");
        setUserIntent("");
        await refreshData(activeSection.key, false);
        setStatusMsg({ text: "✨ Prompt saved & activated as new production version!" });
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail || "Failed to update prompt section", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", error: true });
    } finally {
      setIsSaving(false);
    }
  };

  // AI Prompt Optimization
  const handleAIOptimize = async () => {
    if (!userIntent.trim() || !activeSection) return;
    setIsOptimizing(true);
    setStatusMsg(null);
    setAiResult(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeSection.key}/ai-optimize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_intent: userIntent.trim(),
          current_prompt: draftContent || undefined,
          model_tier: activeSection.preferred_model_tier || "ultra-550b",
        }),
      });

      if (res.ok) {
        const data: OptimizationResult = await res.json();
        setAiResult(data);
        setDraftContent(data.optimized_prompt);
        setChangeSummary(`NemoTron: ${data.summary_of_changes}`);
        setUserIntent("");

        if (editorRef.current) {
          editorRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
        }

        await refreshData(activeSection.key, false);
        setStatusMsg({
          text: `✨ Prompt upgraded & activated as v${data.version || "new"}! (Score: ${data.rating_score}/100 · ${data.rating_grade})`,
        });
      } else {
        const err = await res.json().catch(() => ({}));
        setStatusMsg({
          text: err.detail || "Optimization could not be completed. Please adjust your instructions and retry.",
          error: true,
        });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error during AI optimization", error: true });
    } finally {
      setIsOptimizing(false);
    }
  };

  // Toggle active / inactive on section
  const handleToggleSection = async (sec: DynamicSection, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/v1/prompts/sections/${sec.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !sec.is_active }),
      });
      if (res.ok) {
        await refreshData(activeKey, true);
      }
    } catch (err) {
      loggerError("Failed to toggle section:", err);
    }
  };

  // Reorder section
  const handleMoveSection = async (sec: DynamicSection, direction: "up" | "down", e: React.MouseEvent) => {
    e.stopPropagation();
    const sorted = [...sections].sort((a, b) => a.order_index - b.order_index);
    const idx = sorted.findIndex((s) => s.id === sec.id);
    if (direction === "up" && idx > 0) {
      const prev = sorted[idx - 1];
      await Promise.all([
        fetch(`/api/v1/prompts/sections/${sec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: prev.order_index }),
        }),
        fetch(`/api/v1/prompts/sections/${prev.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: sec.order_index }),
        }),
      ]);
      await refreshData(activeKey, true);
    } else if (direction === "down" && idx < sorted.length - 1) {
      const next = sorted[idx + 1];
      await Promise.all([
        fetch(`/api/v1/prompts/sections/${sec.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: next.order_index }),
        }),
        fetch(`/api/v1/prompts/sections/${next.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ order_index: sec.order_index }),
        }),
      ]);
      await refreshData(activeKey, true);
    }
  };

  // Archive section (with confirmation)
  const handleArchiveSection = async (sec: DynamicSection, e: React.MouseEvent) => {
    e.stopPropagation();
    if (sec.is_system) {
      alert("System sections are protected by policy and cannot be archived or deleted.");
      return;
    }
    if (!confirm(`Are you sure you want to archive custom section '${sec.display_name}'?`)) return;

    try {
      const res = await fetch(`/api/v1/prompts/sections/${sec.id}`, { method: "DELETE" });
      if (res.ok) {
        setStatusMsg({ text: `Section '${sec.display_name}' archived.` });
        const remaining = sections.filter((s) => s.id !== sec.id);
        if (remaining.length > 0) {
          handleTabChange(remaining[0].key);
        } else {
          await refreshData();
        }
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to archive section");
      }
    } catch (err: any) {
      alert(err.message || "Network error");
    }
  };

  // Rollback to version
  const handleRollback = async (version: number) => {
    if (!activeSection) return;
    const reason = prompt(`Rollback ${activeSection.display_name} to Version ${version}. Enter reason:`, "Manual regression rollback");
    if (reason === null) return;

    try {
      const res = await fetch(`/api/v1/prompts/sections/${activeSection.key}/activate/${version}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason || "Manual rollback", author: "operator" }),
      });
      if (res.ok) {
        await refreshData(activeSection.key, false);
        setStatusMsg({ text: `✨ Rolled back ${activeSection.display_name} to Version ${version}.` });
      }
    } catch (err: any) {
      alert("Rollback failed: " + err.message);
    }
  };

  // Toggle pin on version
  const handleTogglePin = async (version: number) => {
    if (!activeSection) return;
    try {
      const res = await fetch(`/api/v1/prompts/sections/${activeSection.key}/versions/${version}/pin`, {
        method: "POST",
      });
      if (res.ok) {
        await refreshData(activeSection.key, true);
      }
    } catch (err: any) {
      loggerError("Failed to toggle pin:", err);
    }
  };

  // Reset to default
  const handleResetToDefault = async () => {
    if (!activeSection) return;
    if (!confirm(`Restore '${activeSection.display_name}' to pristine factory default instructions?`)) return;
    try {
      const res = await fetch(`/api/v1/prompts/sections/${activeSection.key}/reset-to-default`, { method: "POST" });
      if (res.ok) {
        await refreshData(activeSection.key, false);
        setStatusMsg({ text: `✨ Reset ${activeSection.display_name} to factory default instructions.` });
      }
    } catch (err: any) {
      alert("Failed to reset: " + err.message);
    }
  };

  // Prune inactive versions
  const handlePruneHistory = async () => {
    if (!activeSection) return;
    if (!confirm(`Prune inactive unpinned versions for ${activeSection.display_name}? Pinned & active versions will be safely preserved.`)) return;
    try {
      const res = await fetch(`/api/v1/prompts/sections/${activeSection.key}/prune`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keep_latest: 2 }),
      });
      if (res.ok) {
        const data = await res.json();
        await refreshData(activeSection.key, true);
        alert(`Pruned ${data.deleted_count} inactive versions.`);
      }
    } catch (err: any) {
      alert("Failed to prune: " + err.message);
    }
  };

  // Select version for diff comparison
  const handleSelectForDiff = (version: number) => {
    if (selectedVersionsForDiff.includes(version)) {
      setSelectedVersionsForDiff(selectedVersionsForDiff.filter((v) => v !== version));
    } else {
      if (selectedVersionsForDiff.length >= 2) {
        setSelectedVersionsForDiff([selectedVersionsForDiff[1], version]);
      } else {
        setSelectedVersionsForDiff([...selectedVersionsForDiff, version]);
      }
    }
  };

  // Open diff modal
  const handleOpenDiff = async () => {
    if (selectedVersionsForDiff.length !== 2 || !activeSection) return;
    const from_v = Math.min(...selectedVersionsForDiff);
    const to_v = Math.max(...selectedVersionsForDiff);
    setIsLoadingDiff(true);
    setDiffModalOpen(true);
    try {
      const res = await fetch(`/api/v1/prompts/sections/${activeSection.key}/diff?from=${from_v}&to=${to_v}`);
      if (res.ok) {
        const data = await res.json();
        setDiffData(data);
      }
    } catch (err) {
      loggerError("Failed to fetch diff:", err);
    } finally {
      setIsLoadingDiff(false);
    }
  };

  // AI Draft Section from scratch
  const handleAiDraftSection = async () => {
    if (!aiDraftPrompt.trim()) return;
    setIsDraftingSection(true);
    try {
      const res = await fetch("/api/v1/prompts/ai-draft-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain_description: aiDraftPrompt.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const p = data.proposal;
        setManualKey(p.key);
        setManualName(p.display_name);
        setManualDesc(p.description);
        setManualIcon(p.icon || "Sparkles");
        setManualStarter(p.starter_instructions);
        setNewSecTab("manual");
      }
    } catch (err: any) {
      alert("AI draft failed: " + err.message);
    } finally {
      setIsDraftingSection(false);
    }
  };

  // Create section submit
  const handleCreateSectionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualKey.trim() || !manualName.trim()) return;

    try {
      const res = await fetch("/api/v1/prompts/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: manualKey.trim(),
          display_name: manualName.trim(),
          description: manualDesc.trim() || undefined,
          icon: manualIcon || "Sparkles",
          starter_instructions: manualStarter.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewSectionModalOpen(false);
        setAiDraftPrompt("");
        setManualKey("");
        setManualName("");
        setManualDesc("");
        setManualStarter("");
        await refreshData(data.section.key, false);
        setActiveKey(data.section.key);
        setStatusMsg({ text: `✨ Custom section '${data.section.display_name}' created successfully!` });
      } else {
        const err = await res.json();
        alert(err.detail || "Failed to create section");
      }
    } catch (err: any) {
      alert("Failed to create section: " + err.message);
    }
  };

  // Calculate dynamic token budget
  const activeSections = sections.filter((s) => s.is_active && !s.is_archived);
  const totalTokens = activeSections.reduce((acc, s) => acc + (s.token_count || Math.round(s.active_content?.length / 4) || 100), 0);

  const CurrentIcon = activeSection ? ICON_MAP[activeSection.icon] || Sparkles : Sparkles;

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-2 sm:px-4 pb-16">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[var(--ed-border)] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-bold text-[var(--ed-text-primary)]">Modular System Prompts</h1>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded-full border border-sky-500/20">
              <Zap className="w-3 h-3 text-sky-500" />
              NemoTron 3 Ultra 550B Architect
            </span>
          </div>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Dynamic, database-driven system prompt sections with git-style line diffs and instant rollback.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setNewSectionModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--ed-accent)] text-white hover:brightness-110 shadow-sm transition-all ed-press"
          >
            <Plus className="w-3.5 h-3.5" />
            New Section
          </button>

          {activeSection?.is_system && (
            <button
              onClick={handleResetToDefault}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] transition-all ed-press"
              title="Restore factory seed instructions"
            >
              <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
              Factory Default
            </button>
          )}

          <button
            onClick={() => refreshData(activeKey, true)}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] transition-all ed-press"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[var(--ed-accent)] ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMsg && (
        <div
          className={`p-3 rounded-xl border text-xs font-medium flex items-center justify-between transition-all ${
            statusMsg.error
              ? "bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400"
              : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMsg.error ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            <span>{statusMsg.text}</span>
          </div>
          <button onClick={() => setStatusMsg(null)} className="text-muted hover:opacity-75">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Grid: Left Section Switcher + Right Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Sections CRUD List + Token Donut */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-[var(--ed-text-muted)] px-1">
            <span>PROMPT SECTIONS ({sections.length})</span>
            <span className="text-[10px] text-emerald-600 font-data">{activeSections.length} ACTIVE IN LIVE PROMPT</span>
          </div>

          <div className="space-y-2">
            {sections.map((sec, idx) => {
              const SecIcon = ICON_MAP[sec.icon] || Sparkles;
              const isSelected = activeKey === sec.key || activeKey === sec.id;

              return (
                <div
                  key={sec.id}
                  onClick={() => handleTabChange(sec.key)}
                  className={`group relative rounded-xl border transition-all cursor-pointer p-3.5 ${
                    isSelected
                      ? "bg-[var(--ed-surface)] border-l-4 border-l-[var(--ed-accent)] border-[var(--ed-border)] shadow-sm"
                      : "bg-[var(--ed-surface)] border-[var(--ed-border)] hover:bg-[var(--ed-bg)]"
                  } ${!sec.is_active ? "opacity-60 bg-muted/20" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                          isSelected ? "bg-[var(--ed-accent)]/15 text-[var(--ed-accent)]" : "bg-[var(--ed-bg)] text-[var(--ed-text-muted)]"
                        }`}
                      >
                        <SecIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className={`text-xs font-bold ${isSelected ? "text-[var(--ed-text-primary)]" : "text-[var(--ed-text-secondary)]"}`}>
                            {sec.display_name}
                          </span>
                          {sec.is_system && (
                            <span className="text-[9px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.2 rounded border border-amber-500/20 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              System
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-[var(--ed-text-muted)] line-clamp-1 mt-0.5">{sec.description || "Operational rules"}</p>
                      </div>
                    </div>

                    {/* Active toggle switch */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleToggleSection(sec, e)}
                        className={`w-8 h-4 rounded-full p-0.5 transition-colors ${sec.is_active ? "bg-emerald-500" : "bg-zinc-400 dark:bg-zinc-600"}`}
                        title={sec.is_active ? "Enabled in live prompt" : "Disabled (omitted from live prompt)"}
                      >
                        <div className={`w-3 h-3 rounded-full bg-white transition-transform ${sec.is_active ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  </div>

                  {/* Card Footer: Version, Token Count, Quality Score, and Actions */}
                  <div className="flex items-center justify-between text-[10px] text-[var(--ed-text-muted)] mt-2 pt-2 border-t border-[var(--ed-border)]/50">
                    <div className="flex items-center gap-2 font-data">
                      <span>v{sec.active_version}</span>
                      <span>·</span>
                      <span>{sec.token_count || 100} tok</span>
                      {sec.quality_score && (
                        <>
                          <span>·</span>
                          <span className="text-emerald-600 font-semibold">{sec.quality_score}/100</span>
                        </>
                      )}
                    </div>

                    {/* Move up / down & archive */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                      <button
                        onClick={(e) => handleMoveSection(sec, "up", e)}
                        disabled={idx === 0}
                        className="p-1 rounded hover:bg-[var(--ed-bg)] disabled:opacity-30"
                        title="Move Up"
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => handleMoveSection(sec, "down", e)}
                        disabled={idx === sections.length - 1}
                        className="p-1 rounded hover:bg-[var(--ed-bg)] disabled:opacity-30"
                        title="Move Down"
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                      {!sec.is_system && (
                        <button
                          onClick={(e) => handleArchiveSection(sec, e)}
                          className="p-1 rounded text-red-500 hover:bg-red-500/10"
                          title="Archive Section"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Token Budget Donut Card */}
          <div className="ed-panel rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-[var(--ed-text-primary)]">
              <span className="flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                Prompt Token Budget
              </span>
              <span className="font-data text-[10px] text-[var(--ed-text-muted)]">
                {totalTokens} tokens total
              </span>
            </div>

            {/* SVG Donut */}
            <div className="flex justify-center py-2">
              <svg width="130" height="130" viewBox="0 0 120 120" className="transform -rotate-90">
                {(() => {
                  const circ = 2 * Math.PI * 40;
                  let accumulated = 0;

                  return activeSections.map((sec, i) => {
                    const count = sec.token_count || 100;
                    const ratio = count / (totalTokens || 1);
                    const dash = Math.max(1, ratio * circ);
                    const offset = -accumulated * circ;
                    accumulated += ratio;
                    const color = PALETTE[i % PALETTE.length];

                    return (
                      <circle
                        key={sec.id}
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

            {/* Dynamic Legend with Real Display Names */}
            <div className="space-y-1.5 pt-2 border-t border-[var(--ed-border)] max-h-48 overflow-y-auto">
              {activeSections.map((sec, i) => {
                const count = sec.token_count || 100;
                const pct = Math.round((count / (totalTokens || 1)) * 100);
                const color = PALETTE[i % PALETTE.length];

                return (
                  <div key={sec.id} className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-2 truncate max-w-[170px]">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                      <span className="truncate text-[var(--ed-text-secondary)] font-medium">{sec.display_name}</span>
                    </div>
                    <span className="font-data text-[10px] text-[var(--ed-text-muted)]">
                      {count} tok ({pct}%)
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Editor + History + AI Copilot */}
        <div className="lg:col-span-8 space-y-6">
          {activeSection ? (
            <div className="ed-panel rounded-xl p-4 sm:p-6 space-y-4">
              {/* Active Section Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--ed-accent)]/10 text-[var(--ed-accent)] flex items-center justify-center">
                    <CurrentIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-[var(--ed-text-primary)]">{activeSection.display_name}</h2>
                      <span className="text-[10px] font-data bg-[var(--ed-bg)] px-2 py-0.5 rounded border border-[var(--ed-border)]">
                        v{activeSection.active_version}
                      </span>
                      {activeSection.pinned && (
                        <span className="text-[9px] font-semibold bg-sky-500/10 text-sky-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Pin className="w-2.5 h-2.5" /> Pinned
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[var(--ed-text-muted)]">{activeSection.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-all ed-press ${
                      showHistory
                        ? "bg-[var(--ed-accent)]/10 border-[var(--ed-accent)] text-[var(--ed-accent)]"
                        : "bg-[var(--ed-surface)] border-[var(--ed-border)] text-[var(--ed-text-muted)]"
                    }`}
                  >
                    <History className="w-3.5 h-3.5" />
                    History ({history.length})
                  </button>

                  <button
                    onClick={handleSavePrompt}
                    disabled={isSaving}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5 transition-all ed-press disabled:opacity-50"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSaving ? "Saving..." : "Save & Activate"}
                  </button>
                </div>
              </div>

              {/* Textarea Editor */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-[var(--ed-text-muted)] font-data">
                  <span>PRODUCTION SYSTEM INSTRUCTION</span>
                  <span>
                    {draftContent.length} chars · ~{Math.round(draftContent.length / 4)} tokens
                  </span>
                </div>
                <textarea
                  ref={editorRef}
                  value={draftContent}
                  onChange={(e) => setDraftContent(e.target.value)}
                  rows={14}
                  className="w-full rounded-xl p-3.5 text-xs font-mono bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)] leading-relaxed resize-y"
                  placeholder="Enter system prompt instructions for this section..."
                />
              </div>

              {/* Audit Log Change Summary */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">CHANGE SUMMARY (AUDIT LOG)</label>
                <input
                  type="text"
                  value={changeSummary}
                  onChange={(e) => setChangeSummary(e.target.value)}
                  placeholder="e.g. Added 5% max discount rule and updated enterprise customer handoff threshold"
                  className="w-full rounded-xl px-3 py-2 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)]"
                />
              </div>

              {/* Version History Accordion */}
              {showHistory && (
                <div className="pt-4 border-t border-[var(--ed-border)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-[var(--ed-accent)]" />
                      <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">Version History & Git Diffs</h3>
                    </div>

                    <div className="flex items-center gap-2">
                      {selectedVersionsForDiff.length === 2 && (
                        <button
                          onClick={handleOpenDiff}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 transition-all"
                        >
                          <GitCompare className="w-3.5 h-3.5" />
                          Compare v{Math.min(...selectedVersionsForDiff)} vs v{Math.max(...selectedVersionsForDiff)}
                        </button>
                      )}
                      <button
                        onClick={handlePruneHistory}
                        className="px-2.5 py-1 rounded-lg text-[11px] font-semibold border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-all"
                        title="Bulk delete unpinned inactive versions"
                      >
                        Prune Inactive
                      </button>
                    </div>
                  </div>

                  {selectedVersionsForDiff.length > 0 && selectedVersionsForDiff.length < 2 && (
                    <div className="text-[11px] text-sky-600 bg-sky-500/10 px-3 py-1.5 rounded-lg">
                      Select one more version to compute a line-by-line diff.
                    </div>
                  )}

                  {/* History Timeline */}
                  <div className="space-y-2">
                    {history.slice(0, historyLimit).map((v) => {
                      const isSelectedDiff = selectedVersionsForDiff.includes(v.version);

                      return (
                        <div
                          key={v.version}
                          className={`p-3 rounded-xl border transition-all ${
                            v.is_active
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : isSelectedDiff
                              ? "bg-sky-500/10 border-sky-500/30"
                              : "bg-[var(--ed-bg)] border-[var(--ed-border)]"
                          }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleSelectForDiff(v.version)}
                                className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                                  isSelectedDiff ? "bg-sky-500 border-sky-500 text-white" : "border-zinc-400"
                                }`}
                                title="Select for Git Diff"
                              >
                                {isSelectedDiff && <Check className="w-3 h-3" />}
                              </button>

                              <span className="text-xs font-bold text-[var(--ed-text-primary)] font-data">v{v.version}</span>

                              {v.is_active && (
                                <span className="text-[9px] font-bold bg-emerald-500/15 text-emerald-600 px-1.5 py-0.2 rounded border border-emerald-500/20">
                                  ACTIVE
                                </span>
                              )}

                              <span className="text-[10px] text-[var(--ed-text-muted)]">by {v.author}</span>

                              {v.quality_score && (
                                <span className="text-[10px] font-semibold bg-purple-500/10 text-purple-600 px-1.5 py-0.2 rounded font-data">
                                  {v.quality_score}/100 ({v.quality_grade || "A"})
                                </span>
                              )}

                              {v.token_count && (
                                <span className="text-[10px] text-[var(--ed-text-muted)] font-data">{v.token_count} tokens</span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={() => handleTogglePin(v.version)}
                                className={`p-1 rounded hover:bg-[var(--ed-surface)] transition-all ${
                                  v.pinned ? "text-sky-500" : "text-zinc-400 hover:text-zinc-600"
                                }`}
                                title={v.pinned ? "Pinned (Protected from pruning)" : "Pin this version"}
                              >
                                <Bookmark className={`w-3.5 h-3.5 ${v.pinned ? "fill-sky-500" : ""}`} />
                              </button>

                              {!v.is_active && (
                                <button
                                  onClick={() => handleRollback(v.version)}
                                  className="px-2 py-1 rounded text-[10px] font-bold bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] transition-all"
                                  title="Rollback to this version"
                                >
                                  Activate
                                </button>
                              )}
                            </div>
                          </div>

                          {v.change_summary && (
                            <p className="text-[11px] text-[var(--ed-text-secondary)] mt-1.5 pl-6 italic">
                              "{v.change_summary}"
                            </p>
                          )}
                        </div>
                      );
                    })}

                    {history.length > historyLimit && (
                      <button
                        onClick={() => setHistoryLimit(history.length)}
                        className="w-full py-2 text-xs font-semibold text-[var(--ed-accent)] hover:underline text-center"
                      >
                        Show {history.length - historyLimit} older versions...
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="ed-panel rounded-xl p-12 text-center text-muted">
              <p>No section selected. Create a new section or select from the list.</p>
            </div>
          )}

          {/* AI Prompt Architect Panel */}
          <div className="ed-panel rounded-xl p-4 sm:p-6 space-y-4 border-2 border-sky-500/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 flex items-center justify-center">
                  <Wand2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[var(--ed-text-primary)]">NemoTron 3 Ultra 550B Prompt Architect</h3>
                  <p className="text-[10px] text-[var(--ed-text-muted)]">
                    Cross-section consistency · Deterministic directives · Auto-benchmarking
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Live Copilot
              </span>
            </div>

            <div className="space-y-2">
              <textarea
                value={userIntent}
                onChange={(e) => setUserIntent(e.target.value)}
                rows={3}
                placeholder={`Describe desired updates for ${activeSection?.display_name || "this section"} in plain English (e.g. "Enforce strict single-question cadence and polite Indian B2B merchant etiquette")...`}
                className="w-full rounded-xl p-3 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <div className="flex justify-between items-center">
                <p className="text-[10px] text-[var(--ed-text-muted)]">
                  Reads all other active sections as context to stop rule contradictions.
                </p>
                <button
                  onClick={handleAIOptimize}
                  disabled={isOptimizing || !userIntent.trim()}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center gap-1.5 transition-all ed-press disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isOptimizing ? "Deliberating..." : "Upgrade with NemoTron"}
                </button>
              </div>
            </div>

            {/* Deliberation Stepper Streaming Animation */}
            {isOptimizing && (
              <div className="p-4 rounded-xl bg-[var(--ed-bg)] border border-sky-500/20 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-sky-600">
                  <span>FRONTIER META-PROMPT DELIBERATION</span>
                  <span className="font-data text-[10px]">{elapsedSeconds}s</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {DELIBERATION_STAGES.map((stg, sIdx) => {
                    const StageIcon = stg.icon;
                    const isActive = sIdx === activeDeliberationStage;
                    const isDone = sIdx < activeDeliberationStage;

                    return (
                      <div
                        key={sIdx}
                        className={`p-2.5 rounded-lg border text-xs transition-all ${
                          isActive
                            ? "bg-sky-500/10 border-sky-500 text-sky-600"
                            : isDone
                            ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-600"
                            : "opacity-40 border-[var(--ed-border)]"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 font-semibold">
                          <StageIcon className="w-3.5 h-3.5" />
                          <span className="text-[11px]">{stg.title}</span>
                        </div>
                        <p className="text-[10px] opacity-75 mt-0.5 line-clamp-1">{stg.desc}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* AI Results Quality Breakdown */}
            {aiResult && (
              <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                    Quality Score: {aiResult.rating_score}/100 ({aiResult.rating_grade})
                  </span>
                  <span className="text-[10px] text-[var(--ed-text-muted)] font-data">{aiResult.model_used}</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)]">Clarity</span>
                    <p className="text-sm font-bold text-[var(--ed-text-primary)] font-data">
                      {aiResult.rating_breakdown.clarity}%
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)]">Constraints</span>
                    <p className="text-sm font-bold text-[var(--ed-text-primary)] font-data">
                      {aiResult.rating_breakdown.constraint_strength}%
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)]">B2B Effectiveness</span>
                    <p className="text-sm font-bold text-[var(--ed-text-primary)] font-data">
                      {aiResult.rating_breakdown.b2b_effectiveness}%
                    </p>
                  </div>
                  <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)]">Safety Grounding</span>
                    <p className="text-sm font-bold text-[var(--ed-text-primary)] font-data">
                      {aiResult.rating_breakdown.safety_grounding}%
                    </p>
                  </div>
                </div>

                <p className="text-xs text-[var(--ed-text-secondary)] italic">"{aiResult.summary_of_changes}"</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Git Diff Modal */}
      {diffModalOpen && diffData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ed-panel w-full max-w-4xl max-h-[85vh] flex flex-col rounded-2xl border border-[var(--ed-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-4 border-b border-[var(--ed-border)] flex items-center justify-between bg-[var(--ed-surface)]">
              <div className="flex items-center gap-2">
                <GitCompare className="w-5 h-5 text-emerald-500" />
                <div>
                  <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                    Git Diff: Version {diffData.from_version} → Version {diffData.to_version}
                  </h3>
                  <p className="text-[10px] text-[var(--ed-text-muted)]">
                    {diffData.section} · {diffData.total_lines} total lines compared
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-data">
                  +{diffData.added_count}
                </span>
                <span className="text-[11px] font-bold text-red-600 bg-red-500/10 px-2 py-0.5 rounded font-data">
                  -{diffData.removed_count}
                </span>
                <button
                  onClick={() => setDiffModalOpen(false)}
                  className="p-1 rounded-lg hover:bg-[var(--ed-bg)] text-[var(--ed-text-muted)]"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Diff Chunks Viewer */}
            <div className="flex-1 overflow-y-auto p-4 font-mono text-xs leading-relaxed space-y-0.5 bg-[var(--ed-bg)]">
              {diffData.chunks.map((chk, cIdx) => {
                let rowBg = "hover:bg-zinc-500/5 text-[var(--ed-text-secondary)]";
                let sign = " ";
                if (chk.type === "add") {
                  rowBg = "bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 font-semibold";
                  sign = "+";
                } else if (chk.type === "delete") {
                  rowBg = "bg-red-500/15 text-red-800 dark:text-red-300 line-through opacity-75";
                  sign = "-";
                }

                return (
                  <div key={cIdx} className={`flex items-start gap-3 py-0.5 px-2 rounded ${rowBg}`}>
                    <span className="w-8 text-[10px] text-[var(--ed-text-muted)] font-data select-none text-right flex-shrink-0">
                      {chk.old_line_no || chk.new_line_no || ""}
                    </span>
                    <span className="w-3 select-none text-center flex-shrink-0 font-bold">{sign}</span>
                    <span className="break-all whitespace-pre-wrap">{chk.line}</span>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-[var(--ed-border)] bg-[var(--ed-surface)] flex justify-end">
              <button
                onClick={() => setDiffModalOpen(false)}
                className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-surface)] transition-all"
              >
                Close Diff
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Section Modal */}
      {newSectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="ed-panel w-full max-w-lg rounded-2xl border border-[var(--ed-border)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-[var(--ed-border)] flex items-center justify-between bg-[var(--ed-surface)]">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[var(--ed-accent)]" />
                <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">Create New Prompt Section</h3>
              </div>
              <button onClick={() => setNewSectionModalOpen(false)} className="text-muted hover:opacity-75">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tabs: AI Draft vs Manual */}
            <div className="flex border-b border-[var(--ed-border)] bg-[var(--ed-bg)] text-xs font-bold">
              <button
                onClick={() => setNewSecTab("ai")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  newSecTab === "ai"
                    ? "bg-[var(--ed-surface)] border-b-2 border-b-sky-500 text-sky-600"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ✨ AI Draft with NemoTron
              </button>
              <button
                onClick={() => setNewSecTab("manual")}
                className={`flex-1 py-2.5 text-center transition-colors ${
                  newSecTab === "manual"
                    ? "bg-[var(--ed-surface)] border-b-2 border-b-sky-500 text-sky-600"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ✏️ Manual Configuration
              </button>
            </div>

            <div className="p-5 space-y-4">
              {newSecTab === "ai" ? (
                <div className="space-y-3">
                  <p className="text-xs text-[var(--ed-text-muted)]">
                    Describe the new policy, rule domain, or customer segment you want to govern. NemoTron will author
                    the complete section structure, icon, and production prompt text.
                  </p>
                  <textarea
                    value={aiDraftPrompt}
                    onChange={(e) => setAiDraftPrompt(e.target.value)}
                    rows={4}
                    placeholder="e.g. 'Add returns and replacement rules for wholesale tea consignments damaged in transit, with 48h reporting requirements'..."
                    className="w-full rounded-xl p-3 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                  <button
                    onClick={handleAiDraftSection}
                    disabled={isDraftingSection || !aiDraftPrompt.trim()}
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-700 text-white flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                    {isDraftingSection ? "Designing New Section..." : "Draft Section Architecture"}
                  </button>
                </div>
              ) : (
                <form onSubmit={handleCreateSectionSubmit} className="space-y-3">
                  <div>
                    <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">DISPLAY NAME</label>
                    <input
                      type="text"
                      required
                      value={manualName}
                      onChange={(e) => {
                        setManualName(e.target.value);
                        if (!manualKey) {
                          setManualKey(e.target.value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
                        }
                      }}
                      placeholder="e.g. Returns & Refund Policy"
                      className="w-full rounded-xl px-3 py-2 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">SLUG KEY</label>
                      <input
                        type="text"
                        required
                        value={manualKey}
                        onChange={(e) => setManualKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                        placeholder="e.g. returns_policy"
                        className="w-full rounded-xl px-3 py-2 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)] font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">ICON</label>
                      <select
                        value={manualIcon}
                        onChange={(e) => setManualIcon(e.target.value)}
                        className="w-full rounded-xl px-3 py-2 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)]"
                      >
                        <option value="Sparkles">Sparkles</option>
                        <option value="ShieldAlert">Shield</option>
                        <option value="Scale">Scale</option>
                        <option value="Truck">Truck</option>
                        <option value="Building">Building</option>
                        <option value="FileText">FileText</option>
                        <option value="Layers">Layers</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">DESCRIPTION</label>
                    <input
                      type="text"
                      value={manualDesc}
                      onChange={(e) => setManualDesc(e.target.value)}
                      placeholder="1-sentence overview of this module's domain"
                      className="w-full rounded-xl px-3 py-2 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-[var(--ed-text-muted)]">STARTER INSTRUCTIONS</label>
                    <textarea
                      value={manualStarter}
                      onChange={(e) => setManualStarter(e.target.value)}
                      rows={5}
                      placeholder="Initial production directives and negative constraints..."
                      className="w-full rounded-xl p-3 text-xs bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--ed-accent)] font-mono"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--ed-accent)] hover:brightness-110 text-white transition-all ed-press"
                  >
                    Save & Activate New Section
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
