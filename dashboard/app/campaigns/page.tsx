"use client";

import React, { useState } from "react";
import {
  Send,
  Play,
  Pause,
  Clock,
  ShieldCheck,
  Flame,
  Users,
  CheckCircle2,
  Plus,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
} from "lucide-react";

interface CampaignItem {
  id: string;
  name: string;
  target_segment: string;
  status: "active" | "paused" | "completed" | "draft";
  total_leads: number;
  sent_count: number;
  replied_count: number;
  daily_quota: number;
  jitter_range: string;
  template_preview: string;
  created_at: string;
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([
    {
      id: "camp_01",
      name: "Siliguri Café Autumn Outreach",
      target_segment: "Café & Bistros",
      status: "active",
      total_leads: 85,
      sent_count: 34,
      replied_count: 14,
      daily_quota: 50,
      jitter_range: "25s – 45s (Anti-Ban Jitter)",
      template_preview: "Namaste! North Bengal Tea Co. se bol rahe hain. Hum Siliguri ke cafes ke liye direct estate Assam Kadak CTC provide karte hain...",
      created_at: "2026-09-02",
    },
    {
      id: "camp_02",
      name: "Darjeeling Hotel Buffet Orthodox Drive",
      target_segment: "Hotels & Resorts",
      status: "paused",
      total_leads: 42,
      sent_count: 28,
      replied_count: 9,
      daily_quota: 30,
      jitter_range: "30s – 50s (High Safety)",
      template_preview: "Hello! We are supplying fresh Autumnal Darjeeling FTGFOP1 directly from Kurseong estates with 5kg vacuum packaging...",
      created_at: "2026-09-01",
    },
    {
      id: "camp_03",
      name: "Kolkata Wholesale Bulk Tea Sacks",
      target_segment: "Distributors & Retail",
      status: "completed",
      total_leads: 120,
      sent_count: 120,
      replied_count: 38,
      daily_quota: 100,
      jitter_range: "25s – 45s (Standard)",
      template_preview: "Greetings! Bulk Dooars & Assam CTC tea available in 50kg HDPE sacks with immediate dispatch from Siliguri hub...",
      created_at: "2026-08-25",
    },
  ]);

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSegment, setNewSegment] = useState("Café & Bistros");
  const [newQuota, setNewQuota] = useState(50);
  const [newTemplate, setNewTemplate] = useState(
    "Namaste! North Bengal Tea Co. se bol rahe hain. Hum cafes ke liye direct estate Assam Kadak CTC provide karte hain..."
  );

  const toggleStatus = (id: string) => {
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === id) {
          const nextStatus = c.status === "active" ? "paused" : "active";
          return { ...c, status: nextStatus };
        }
        return c;
      })
    );
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const newCamp: CampaignItem = {
      id: `camp_${Date.now()}`,
      name: newName.trim(),
      target_segment: newSegment,
      status: "active",
      total_leads: 50,
      sent_count: 0,
      replied_count: 0,
      daily_quota: newQuota,
      jitter_range: "25s – 45s (Anti-Ban Jitter)",
      template_preview: newTemplate.trim(),
      created_at: new Date().toISOString().split("T")[0],
    };
    setCampaigns([newCamp, ...campaigns]);
    setIsCreateOpen(false);
    setNewName("");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--ed-border)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <Send className="w-5 h-5" />
            </span>
            Automated B2B Campaign Drip & Anti-Ban Outreach
          </h1>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Rate-limited WhatsApp cold campaigns with randomized jitter pacing (25–45s) and consultative auto-handoff.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsCreateOpen(true)}
            className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Create New Campaign
          </button>
        </div>
      </div>

      {/* Safety & Anti-Ban Status Banner */}
      <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              WhatsApp Anti-Ban Protection Active
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                100% Policy Compliant
              </span>
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
              Enforcing randomized inter-message jitter (<strong>25.0s – 45.0s</strong>) and sender daily volume ceiling.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 font-mono text-[11px] bg-[var(--ed-bg)] px-3 py-1.5 rounded-lg border border-[var(--ed-border)] shrink-0">
          <span className="text-[var(--ed-text-muted)]">Active Bridge:</span>
          <span className="font-bold text-[var(--ed-text-primary)]">+91 89187 53100</span>
        </div>
      </div>

      {/* Campaign Cards List */}
      <div className="grid grid-cols-1 gap-4">
        {campaigns.map((c) => {
          const progressPct = c.total_leads > 0 ? Math.round((c.sent_count / c.total_leads) * 100) : 0;
          const replyPct = c.sent_count > 0 ? Math.round((c.replied_count / c.sent_count) * 100) : 0;

          return (
            <div key={c.id} className="ed-panel p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-3">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="font-bold text-sm text-[var(--ed-text-primary)]">{c.name}</h3>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        c.status === "active"
                          ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                          : c.status === "paused"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                          : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                      }`}
                    >
                      ● {c.status}
                    </span>
                    <span className="text-[11px] text-[var(--ed-text-muted)]">
                      Target: <strong className="text-[var(--ed-text-primary)]">{c.target_segment}</strong>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleStatus(c.id)}
                    disabled={c.status === "completed"}
                    className={`ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                      c.status === "active"
                        ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
                        : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                    }`}
                  >
                    {c.status === "active" ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause Drip
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Resume Drip
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Stats & Progress Row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Dispatch Progress</span>
                  <div className="font-bold text-[var(--ed-text-primary)] font-data text-sm mt-0.5">
                    {c.sent_count} / {c.total_leads} <span className="text-xs text-[var(--ed-text-muted)]">({progressPct}%)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Replied & Handoff</span>
                  <div className="font-bold text-emerald-500 font-data text-sm mt-0.5">
                    {c.replied_count} <span className="text-xs text-[var(--ed-text-muted)]">({replyPct}% response rate)</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Jitter Delay Safety</span>
                  <div className="font-bold text-[var(--ed-text-primary)] text-xs mt-0.5 truncate">
                    {c.jitter_range}
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                  <span className="text-[10px] text-[var(--ed-text-muted)] block">Daily Quota</span>
                  <div className="font-bold text-[var(--ed-text-primary)] font-data text-sm mt-0.5">
                    {c.daily_quota} msgs / day
                  </div>
                </div>
              </div>

              {/* Template Quote & Auto Handoff Notice */}
              <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex-1">
                  <span className="text-[10px] uppercase font-bold text-[var(--ed-text-muted)] block mb-1">
                    Outreach Message Preview
                  </span>
                  <p className="text-[11px] text-[var(--ed-text-primary)] italic line-clamp-1">
                    "{c.template_preview}"
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 shrink-0">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Auto-Transitions to EDITH on Buyer Reply</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <Send className="w-5 h-5 text-red-500" /> Create New Outreach Campaign
            </h3>
            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                  Campaign Name
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Siliguri Tea Barista Outreach Q4"
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Target Segment
                  </label>
                  <select
                    value={newSegment}
                    onChange={(e) => setNewSegment(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  >
                    <option value="Café & Bistros">Café & Bistros</option>
                    <option value="Hotels & Resorts">Hotels & Resorts</option>
                    <option value="Distributors & Retail">Distributors & Retail</option>
                    <option value="Office Pantries">Office Pantries</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Daily Volume Quota
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="200"
                    value={newQuota}
                    onChange={(e) => setNewQuota(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                  Initial WhatsApp Template
                </label>
                <textarea
                  rows={3}
                  required
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                />
              </div>

              <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)]">
                🛡️ <strong>Safety Guarantee:</strong> All dispatches will be randomized between 25.0s and 45.0s per send.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary px-4 py-2 rounded-xl text-white font-semibold shadow-md"
                >
                  Launch Drip Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
