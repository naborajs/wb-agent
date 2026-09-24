"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RefreshCw,
  Filter,
  Ban,
  Phone,
  Building,
  User,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import MessageLoading from "@/components/ui/MessageLoading";

interface FollowupRecord {
  id: string;
  conversation_id: string;
  customer_id: string;
  campaign_id?: string | null;
  scheduled_for: string;
  step: number;
  status: "scheduled" | "sent" | "cancelled" | "suppressed" | "failed";
  cancel_reason?: string | null;
  template_id?: string | null;
  attempt_count: number;
  max_attempts: number;
  customer_name: string;
  customer_phone: string;
  company_name: string;
  sales_stage: string;
  created_at?: string;
}

export default function FollowupsPage() {
  const [followups, setFollowups] = useState<FollowupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const fetchFollowups = useCallback(async () => {
    try {
      setLoading(true);
      const url = filter === "all" ? "/api/v1/campaigns/followups" : `/api/v1/campaigns/followups?status=${filter}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFollowups(data.followups || []);
      }
    } catch (err) {
      console.error("Failed to fetch follow-ups:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchFollowups();
  }, [fetchFollowups]);

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this scheduled follow-up?")) return;
    try {
      setCancellingId(id);
      const res = await fetch(`/api/v1/campaigns/followups/${id}/cancel?reason=manual_operator_cancelled`, {
        method: "POST",
      });
      if (res.ok) {
        setFollowups((prev) =>
          prev.map((f) => (f.id === id ? { ...f, status: "cancelled", cancel_reason: "manual_operator_cancelled" } : f))
        );
      }
    } catch (err) {
      console.error("Failed to cancel followup:", err);
    } finally {
      setCancellingId(null);
    }
  };

  const scheduledCount = followups.filter((f) => f.status === "scheduled").length;
  const sentCount = followups.filter((f) => f.status === "sent").length;
  const cancelledCount = followups.filter((f) => f.status === "cancelled").length;

  const formatScheduledDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return isoStr;
    }
  };

  const getStepLabel = (step: number) => {
    if (step === 1) return "Step 1: Day 0 Nudge (2h)";
    if (step === 2) return "Step 2: Value Proposition (Day 1)";
    if (step === 3) return "Step 3: Sample Offer (Day 3)";
    return `Step ${step}: Cadence Nudge`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2">
            <Calendar className="w-6 h-6 text-[var(--ed-accent)]" />
            Follow-up Sequence Engine
          </h2>
          <p className="text-sm text-[var(--ed-text-muted)] mt-1">
            Automated B2B outreach cadence (Day 0, Day 1, Day 3) with guaranteed ADR-009 pre-dispatch cancellation upon customer response.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchFollowups}
            disabled={loading}
            className="ed-press ed-focus-ring flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-[var(--ed-text-primary)] border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] transition-colors"
          >
            {loading ? (
              <MessageLoading className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
            Refresh
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="ed-panel p-4 rounded-xl border border-[var(--ed-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--ed-text-muted)] font-medium">Scheduled Nudges</span>
            <Clock className="w-4 h-4 text-[var(--ed-accent)]" />
          </div>
          <div className="text-2xl font-bold text-[var(--ed-text-primary)] mt-1">{scheduledCount}</div>
          <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Awaiting dispatch window</div>
        </div>

        <div className="ed-panel p-4 rounded-xl border border-[var(--ed-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--ed-text-muted)] font-medium">Dispatched & Delivered</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--ed-text-primary)] mt-1">{sentCount}</div>
          <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Delivered to prospect WhatsApp</div>
        </div>

        <div className="ed-panel p-4 rounded-xl border border-[var(--ed-border)]">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--ed-text-muted)] font-medium">Auto-Cancelled (Protected)</span>
            <ShieldCheck className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-[var(--ed-text-primary)] mt-1">{cancelledCount}</div>
          <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">Spam prevented upon customer reply</div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[var(--ed-border)] pb-2 overflow-x-auto">
        {[
          { key: "all", label: "All Sequences" },
          { key: "scheduled", label: "Scheduled" },
          { key: "sent", label: "Sent" },
          { key: "cancelled", label: "Cancelled / Suppressed" },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filter === tab.key
                ? "bg-[var(--ed-accent)] text-white shadow-sm"
                : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)]"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Data Table */}
      <div className="ed-panel rounded-xl overflow-hidden border border-[var(--ed-border)]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--ed-text-muted)] min-w-[700px]">
            <thead
              className="font-semibold border-b border-[var(--ed-border)] uppercase tracking-wider text-[var(--ed-text-muted)]"
              style={{ background: "var(--ed-bg)" }}
            >
              <tr>
                <th className="px-5 py-3">Customer & Channel</th>
                <th className="px-5 py-3">Sequence Step</th>
                <th className="px-5 py-3">Scheduled For</th>
                <th className="px-5 py-3">WhatsApp Policy Guard</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--ed-border)]">
              {loading && followups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-xs text-[var(--ed-text-muted)]">
                    <MessageLoading className="w-5 h-5 mx-auto mb-2 text-[var(--ed-accent)]" />
                    Loading sequence jobs from backend...
                  </td>
                </tr>
              ) : followups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-xs text-[var(--ed-text-muted)]">
                    <div className="max-w-xs mx-auto space-y-2">
                      <Clock className="w-8 h-8 text-[var(--ed-text-muted)] mx-auto opacity-50" />
                      <div className="font-semibold text-[var(--ed-text-primary)]">No follow-ups in this view</div>
                      <div className="text-[11px]">
                        When prospects enter discovery or stall in the pipeline, EDITH schedules autonomous follow-up cadences automatically.
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                followups.map((f) => (
                  <tr key={f.id} className="hover:bg-[var(--ed-bg)]/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                        {f.customer_name}
                      </div>
                      <div className="text-[11px] text-[var(--ed-text-muted)] font-data flex items-center gap-1 mt-0.5">
                        <Phone className="w-3 h-3" />
                        {f.customer_phone || "No phone recorded"}
                        {f.company_name && (
                          <span className="text-[10px] text-[var(--ed-text-muted)] font-sans">
                            · {f.company_name}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-medium text-[var(--ed-text-primary)]">{getStepLabel(f.step)}</div>
                      <div className="text-[10px] text-[var(--ed-text-muted)]">Stage: {f.sales_stage}</div>
                    </td>
                    <td className="px-5 py-3.5 text-[var(--ed-text-muted)] font-data text-[11px]">
                      {f.scheduled_for ? formatScheduledDate(f.scheduled_for) : "Immediate"}
                    </td>
                    <td className="px-5 py-3.5">
                      {f.cancel_reason ? (
                        <span className="font-mono text-[11px] text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {f.cancel_reason}
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Auto-cancels on reply
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          f.status === "scheduled"
                            ? "text-[var(--ed-accent)] border border-[var(--ed-accent)]/20 bg-[var(--ed-accent)]/10"
                            : f.status === "sent"
                            ? "text-emerald-500 border border-emerald-500/20 bg-emerald-500/10"
                            : "text-[var(--ed-text-muted)] border border-[var(--ed-border)] bg-[var(--ed-bg)]"
                        }`}
                      >
                        {f.status === "scheduled" ? (
                          <>
                            <Clock className="w-3 h-3" /> Scheduled
                          </>
                        ) : f.status === "sent" ? (
                          <>
                            <CheckCircle2 className="w-3 h-3" /> Sent
                          </>
                        ) : (
                          <>
                            <XCircle className="w-3 h-3" /> {f.status}
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {f.status === "scheduled" && (
                        <button
                          onClick={() => handleCancel(f.id)}
                          disabled={cancellingId === f.id}
                          className="ed-press ed-focus-ring inline-flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 border border-rose-500/20 transition-colors"
                          title="Cancel scheduled sequence"
                        >
                          <Ban className="w-3 h-3" />
                          {cancellingId === f.id ? "Cancelling..." : "Cancel"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
