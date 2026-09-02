"use client";

import React, { useEffect, useState } from "react";
import {
  Users,
  Flame,
  AlertCircle,
  TrendingUp,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Shield,
  Send,
} from "lucide-react";

interface AnalyticsData {
  leads_total: number;
  conversations_total: number;
  hot_leads: number;
  pending_handoffs: number;
  won_deals: number;
  pipeline_value_inr: number;
  queue_depth: number;
  conversion_rate_pct: number;
  system_status: string;
}

interface FunnelStep {
  stage: string;
  count: number;
}

export default function DashboardOverview() {
  const [metrics, setMetrics] = useState<AnalyticsData>({
    leads_total: 124,
    conversations_total: 48,
    hot_leads: 7,
    pending_handoffs: 2,
    won_deals: 14,
    pipeline_value_inr: 485000,
    queue_depth: 0,
    conversion_rate_pct: 11.3,
    system_status: "operational",
  });

  const [funnel, setFunnel] = useState<FunnelStep[]>([
    { stage: "NEW", count: 32 },
    { stage: "DISCOVERY", count: 28 },
    { stage: "QUALIFIED", count: 18 },
    { stage: "RECOMMENDATION", count: 14 },
    { stage: "PURCHASE_INTENT", count: 8 },
    { stage: "HUMAN_HANDOFF", count: 6 },
    { stage: "WON", count: 14 },
  ]);

  useEffect(() => {
    const loadOverview = () => {
      fetch("/api/v1/analytics/overview")
        .then((r) => r.ok && r.json())
        .then((data) => data && setMetrics(data))
        .catch(() => {});

      fetch("/api/v1/analytics/funnel")
        .then((r) => r.ok && r.json())
        .then((data) => data && Array.isArray(data) && setFunnel(data))
        .catch(() => {});
    };

    loadOverview();
    const interval = setInterval(loadOverview, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Title & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">
            Wholesale Operations Center
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Autonomous acquisition, qualification, and B2B conversion for North Bengal Tea Co.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200/60 text-xs font-semibold text-emerald-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Queue Healthy (Depth: {metrics.queue_depth})
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hot Leads */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Hot Leads
            </span>
            <span className="p-2 rounded-lg bg-rose-50 text-rose-600">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{metrics.hot_leads}</div>
            <div className="text-xs text-rose-600 font-medium mt-1 flex items-center gap-1">
              Score ≥ 80 or Purchase Intent
            </div>
          </div>
        </div>

        {/* Pending Handoffs */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Human Handoffs
            </span>
            <span className="p-2 rounded-lg bg-amber-50 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{metrics.pending_handoffs}</div>
            <div className="text-xs text-amber-600 font-medium mt-1 flex items-center gap-1">
              Requires operator attention
            </div>
          </div>
        </div>

        {/* Won Deals */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Won Deals
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">{metrics.won_deals}</div>
            <div className="text-xs text-emerald-600 font-medium mt-1 flex items-center gap-1">
              {metrics.conversion_rate_pct}% conversion rate
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Pipeline Value
            </span>
            <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900">
              ₹{metrics.pipeline_value_inr.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              Active commercial quotes
            </div>
          </div>
        </div>
      </div>

      {/* Funnel & Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Funnel Distribution */}
        <div className="lg:col-span-2 p-6 bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-bold text-slate-900">Sales Stage Funnel</h3>
              <p className="text-xs text-slate-500">Live distribution of active B2B conversations</p>
            </div>
            <span className="text-xs font-medium text-slate-400">16-Stage State Machine</span>
          </div>

          <div className="space-y-4">
            {funnel.map((item) => {
              const maxVal = Math.max(...funnel.map((f) => f.count), 1);
              const pct = Math.round((item.count / maxVal) * 100);
              return (
                <div key={item.stage} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-700 font-semibold">{item.stage}</span>
                    <span className="text-slate-500">{item.count} leads</span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-700 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Architectural Guardrails Card */}
        <div className="p-6 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 font-bold mb-2">
              <Shield className="w-4 h-4 text-emerald-600" />
              Safety & Authority Rules
            </div>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              The AI layer reasons, interprets, and plans. The database and deterministic pricing engines enforce authority.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Max autonomous discount capped at <strong>5.0%</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Wholesale orders &gt;500kg escalate to human operator.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Immediate follow-up cancellation upon customer reply.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 font-bold">✓</span>
                <span>Prompt injection defenses sanitize all incoming text.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <a
              href="/conversations"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              Open Live Inbox
              <ArrowUpRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
