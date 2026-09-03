"use client";

import React, { useState, useEffect } from "react";
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
  BarChart3,
  Sliders,
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

export default function PromptsPage() {
  const [sections, setSections] = useState<Record<string, PromptSection>>({});
  const [activeTab, setActiveTab] = useState<string>("core_identity");
  const [draftContent, setDraftContent] = useState<string>("");
  const [changeSummary, setChangeSummary] = useState<string>("");
  const [history, setHistory] = useState<VersionHistoryItem[]>([]);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; error?: boolean } | null>(null);

  // Load active sections
  const loadSections = async () => {
    try {
      const res = await fetch("/api/v1/prompts");
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections || {});
        if (data.sections && data.sections[activeTab]) {
          setDraftContent(data.sections[activeTab].content);
        }
      }
    } catch (e) {
      console.error("Failed to load prompts:", e);
    }
  };

  // Load history for active section
  const loadHistory = async (sec: string) => {
    try {
      const res = await fetch(`/api/v1/prompts/${sec}/history`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history || []);
      }
    } catch (e) {
      console.error("Failed to load history:", e);
    }
  };

  useEffect(() => {
    loadSections();
  }, []);

  useEffect(() => {
    if (sections[activeTab]) {
      setDraftContent(sections[activeTab].content);
    }
    loadHistory(activeTab);
    setStatusMsg(null);
  }, [activeTab]);

  // Handle Save New Version
  const handleSave = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeTab}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent.trim(),
          change_summary: changeSummary.trim() || "Dashboard update",
          author: "Admin Operator",
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMsg({ text: `Version ${data.version} published and activated successfully!` });
        setChangeSummary("");
        await loadSections();
        await loadHistory(activeTab);
      } else {
        const err = await res.json();
        setStatusMsg({ text: err.detail || "Failed to save prompt version", error: true });
      }
    } catch (err: any) {
      setStatusMsg({ text: err.message || "Network error", error: true });
    } finally {
      setIsSaving(false);
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
        setStatusMsg({ text: `Successfully rolled back to Version ${version}!` });
        await loadSections();
        await loadHistory(activeTab);
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

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
          Modular System Prompts
        </h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Independent, version-controlled system instruction sections with live editing and rollback (Sections 66, 67, 68).
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            statusMsg.error
              ? "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800"
              : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
          }`}
        >
          {statusMsg.error ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle className="w-4 h-4 shrink-0" />}
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
                className={`w-full text-left p-3.5 rounded-xl border transition-all ${
                  isSelected
                    ? "bg-amber-50/80 dark:bg-amber-950/30 border-amber-500/50 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <SectionIcon className={`w-4 h-4 ${isSelected ? "text-amber-600 dark:text-amber-400" : "text-slate-400"}`} />
                    <span className={`text-xs font-bold ${isSelected ? "text-amber-900 dark:text-amber-200" : "text-slate-800 dark:text-slate-200"}`}>
                      {meta.label}
                    </span>
                  </div>
                  {meta.protected && <Lock className="w-3 h-3 text-slate-400" />}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2">
                  <span>Version {secData?.version || 1}</span>
                  {secData?.is_default && <span className="text-amber-600 font-semibold">Default</span>}
                </div>
              </button>
            );
          })}

          {/* Prompt Assembly Token Distribution Donut Card */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-900 dark:text-white">
              <span className="flex items-center gap-1.5">
                <PieIcon className="w-3.5 h-3.5 text-purple-500" />
                Prompt Token Budget
              </span>
              <span className="font-mono text-[10px] text-slate-400">
                ~{Math.round(Object.values(sections).reduce((a, s) => a + (s?.content?.length || 0), 0) / 4)} tokens
              </span>
            </div>

            {/* SVG Donut */}
            <div className="flex justify-center py-1">
              <svg width="120" height="120" viewBox="0 0 120 120" className="transform -rotate-90">
                {(() => {
                  const palette: Record<string, string> = {
                    core_safety: "#ef4444",
                    core_identity: "#8b5cf6",
                    business_policy: "#f59e0b",
                    sales_style: "#10b981",
                    business_profile: "#3b82f6",
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
                    const color = palette[k] || "#64748b";

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
                  core_safety: "#ef4444",
                  core_identity: "#8b5cf6",
                  business_policy: "#f59e0b",
                  sales_style: "#10b981",
                  business_profile: "#3b82f6",
                };
                const total = Object.values(sections).reduce((a, s) => a + (s?.content?.length || 1), 0) || 1;
                const len = sections[k]?.content?.length || 100;
                const pct = Math.round((len / total) * 100);
                return (
                  <div key={k} className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: palette[k] }} />
                      <span className="truncate">{m.label.split(" ")[0]}</span>
                    </div>
                    <span className="font-mono font-semibold">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Center/Right: Active Editor & Version History */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Icon className="w-4 h-4 text-amber-600" />
                  {currentMeta.label}
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
                    v{currentSection?.version || 1}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {currentMeta.description}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !draftContent.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save & Activate"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Instruction Text
              </label>
              <textarea
                rows={12}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="w-full p-3.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 font-mono text-xs text-slate-900 dark:text-white leading-relaxed focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Change Summary (Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Updated discovery questions for restaurant chains"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Version History Table */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h4 className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5 text-slate-400" />
              Version History & Rollback
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-slate-400">No previous versions recorded for this section.</p>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {history.map((h) => (
                  <div key={h.version} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-slate-900 dark:text-white">
                          v{h.version}
                        </span>
                        {h.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                            Active
                          </span>
                        )}
                        <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                          by {h.author}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 text-[11px] mt-0.5">
                        {h.change_summary || "No description"}
                      </p>
                    </div>

                    {!h.is_active && (
                      <button
                        onClick={() => handleRollback(h.version)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-[11px] font-medium transition-colors"
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
