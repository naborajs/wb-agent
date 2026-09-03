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
  }, [activeTab]);

  // Handle Save New Version
  const handleSave = async () => {
    if (!draftContent.trim()) return;
    setIsSaving(true);
    setStatusMsg(null);

    try {
      const res = await fetch(`/api/v1/prompts/${activeTab}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draftContent,
          change_summary: changeSummary || undefined,
        }),
      });

      if (res.ok) {
        setStatusMsg({ text: `Successfully updated ${SECTION_METADATA[activeTab]?.label || activeTab}!` });
        setChangeSummary("");
        await loadSections();
        await loadHistory(activeTab);
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
        <h2 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)]">
          Modular System Prompts
        </h2>
        <p className="text-xs text-[var(--ed-text-muted)] mt-1">
          Independent, version-controlled system instruction sections with live editing and rollback (Sections 66, 67, 68).
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs font-semibold ${
            statusMsg.error
              ? "bg-[var(--ed-danger)]/10 text-[var(--ed-danger)] border-[var(--ed-danger)]/30"
              : "bg-[var(--ed-success)]/10 text-[var(--ed-success)] border-[var(--ed-success)]/30"
          }`}
        >
          {statusMsg.error ? <AlertCircle className="w-4 h-4 shrink-0 text-[var(--ed-danger)]" /> : <CheckCircle className="w-4 h-4 shrink-0 text-[var(--ed-success)]" />}
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
                    <SectionIcon className={`w-4 h-4 ${isSelected ? "text-[var(--ed-accent)]" : "text-[var(--ed-text-muted)]"}`} />
                    <span className={`text-xs font-bold ${isSelected ? "text-[var(--ed-text-primary)]" : "text-[var(--ed-text-muted)]"}`}>
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

        {/* Center/Right: Active Editor & Version History */}
        <div className="lg:col-span-3 space-y-6">
          <div className="ed-panel rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                  <Icon className="w-4 h-4 text-[var(--ed-accent)]" />
                  {currentMeta.label}
                  <span className="text-xs px-2 py-0.5 rounded border border-[var(--ed-border)] text-[var(--ed-text-muted)] font-data" style={{ background: "var(--ed-bg)" }}>
                    v{currentSection?.version || 1}
                  </span>
                </h3>
                <p className="text-xs text-[var(--ed-text-muted)] mt-1">
                  {currentMeta.description}
                </p>
              </div>

              <button
                onClick={handleSave}
                disabled={isSaving || !draftContent.trim()}
                className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-semibold shadow-md transition-all disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5" />
                {isSaving ? "Saving..." : "Save & Activate"}
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ed-text-primary)] mb-1.5">
                Instruction Text
              </label>
              <textarea
                rows={12}
                value={draftContent}
                onChange={(e) => setDraftContent(e.target.value)}
                className="w-full p-3.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] font-mono text-xs text-[var(--ed-text-primary)] leading-relaxed ed-focus-ring"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--ed-text-primary)] mb-1.5">
                Change Summary (Audit Log)
              </label>
              <input
                type="text"
                placeholder="e.g. Updated discovery questions for restaurant chains"
                value={changeSummary}
                onChange={(e) => setChangeSummary(e.target.value)}
                className="w-full px-3.5 py-2 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-xs text-[var(--ed-text-primary)] ed-focus-ring"
              />
            </div>
          </div>

          {/* Version History Table */}
          <div className="ed-panel rounded-xl p-6">
            <h4 className="font-bold text-xs text-[var(--ed-text-primary)] flex items-center gap-1.5 mb-3">
              <History className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
              Version History & Rollback
            </h4>

            {history.length === 0 ? (
              <p className="text-xs text-[var(--ed-text-muted)]">No previous versions recorded for this section.</p>
            ) : (
              <div className="divide-y divide-[var(--ed-border)] text-xs">
                {history.map((h) => (
                  <div key={h.version} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-data font-bold text-[var(--ed-text-primary)]">
                          v{h.version}
                        </span>
                        {h.is_active && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ed-success)]/10 text-[var(--ed-success)] border border-[var(--ed-success)]/20">
                            Active
                          </span>
                        )}
                        <span className="text-[var(--ed-text-muted)] text-[11px]">
                          by {h.author}
                        </span>
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
