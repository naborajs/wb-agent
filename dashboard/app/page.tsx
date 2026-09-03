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
  PieChart as PieIcon,
  BarChart3,
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

  const [chartView, setChartView] = useState<"bars" | "pie">("bars");

  useEffect(() => {
    const loadOverview = () => {
      fetch("/api/v1/analytics/overview")
        .then((r) => r.ok && r.json())
        .then((data) => data && setMetrics(data))
        .catch(() => {});
    };

    const loadFunnel = () => {
      fetch("/api/v1/analytics/funnel")
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data && Array.isArray(data.funnel)) {
            setFunnel(data.funnel);
          }
        })
        .catch(() => {});
    };

    loadOverview();
    loadFunnel();
    const interval = setInterval(() => {
      loadOverview();
      loadFunnel();
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Wholesale Operations Center
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Autonomous acquisition, qualification, and B2B conversion for North Bengal Tea Co.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            System Operational (Queue: {metrics.queue_depth})
          </div>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Hot Leads */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Hot Leads
            </span>
            <span className="p-2 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.hot_leads}</div>
            <div className="text-xs text-rose-600 dark:text-rose-400 font-medium mt-1 flex items-center gap-1">
              Score ≥ 80 or Purchase Intent
            </div>
          </div>
        </div>

        {/* Pending Handoffs */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Human Handoffs
            </span>
            <span className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.pending_handoffs}</div>
            <div className="text-xs text-amber-600 dark:text-amber-400 font-medium mt-1 flex items-center gap-1">
              Requires operator attention
            </div>
          </div>
        </div>

        {/* Won Deals */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Won Deals
            </span>
            <span className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">{metrics.won_deals}</div>
            <div className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 flex items-center gap-1">
              {metrics.conversion_rate_pct}% conversion rate
            </div>
          </div>
        </div>

        {/* Pipeline Value */}
        <div className="p-5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Pipeline Value
            </span>
            <span className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-bold text-slate-900 dark:text-white">
              ₹{metrics.pipeline_value_inr.toLocaleString("en-IN")}
            </div>
            <div className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Active commercial quotes
            </div>
          </div>
        </div>
      </div>

      {/* Funnel & Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Funnel Distribution */}
        <div className="lg:col-span-2 p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-amber-500" />
                Sales Stage Distribution
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Live distribution of active B2B conversations across stages</p>
            </div>
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setChartView("bars")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "bars"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Funnel Bars
              </button>
              <button
                onClick={() => setChartView("pie")}
                className={`px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "pie"
                    ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" /> Donut Chart
              </button>
            </div>
          </div>

          {chartView === "bars" ? (
            <div className="space-y-4">
              {funnel.map((item) => {
                const maxVal = Math.max(...funnel.map((f) => f.count), 1);
                const pct = Math.round((item.count / maxVal) * 100);
                return (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-700 dark:text-slate-300 font-semibold">{item.stage}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">{item.count} leads</span>
                    </div>
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-amber-600 dark:bg-amber-500 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center py-2">
              {/* Dynamic SVG Donut */}
              <div className="flex justify-center">
                <svg width="210" height="210" viewBox="0 0 210 210" className="transform -rotate-90">
                  {(() => {
                    const stageColors: Record<string, string> = {
                      NEW: "#94a3b8",
                      DISCOVERY: "#3b82f6",
                      QUALIFIED: "#8b5cf6",
                      RECOMMENDATION: "#f59e0b",
                      PURCHASE_INTENT: "#ec4899",
                      HUMAN_HANDOFF: "#f97316",
                      WON: "#10b981",
                    };
                    const total = funnel.reduce((acc, f) => acc + f.count, 0) || 1;
                    const circumference = 2 * Math.PI * 75;
                    let accumulated = 0;

                    return funnel.map((item) => {
                      const ratio = item.count / total;
                      const dash = ratio * circumference;
                      const offset = -accumulated * circumference;
                      accumulated += ratio;
                      const color = stageColors[item.stage] || "#64748b";

                      return (
                        <circle
                          key={item.stage}
                          cx="105"
                          cy="105"
                          r="75"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="28"
                          strokeDasharray={`${dash} ${circumference}`}
                          strokeDashoffset={offset}
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>

              {/* Legend with lead counts & percentages */}
              <div className="space-y-2 text-xs">
                {(() => {
                  const stageColors: Record<string, string> = {
                    NEW: "#94a3b8",
                    DISCOVERY: "#3b82f6",
                    QUALIFIED: "#8b5cf6",
                    RECOMMENDATION: "#f59e0b",
                    PURCHASE_INTENT: "#ec4899",
                    HUMAN_HANDOFF: "#f97316",
                    WON: "#10b981",
                  };
                  const total = funnel.reduce((acc, f) => acc + f.count, 0) || 1;
                  return funnel.map((item) => {
                    const pct = Math.round((item.count / total) * 100);
                    const color = stageColors[item.stage] || "#64748b";
                    return (
                      <div key={item.stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-slate-700 dark:text-slate-300">{item.stage}</span>
                        </div>
                        <span className="font-mono text-slate-500 dark:text-slate-400">
                          {item.count} leads ({pct}%)
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>

        {/* Architectural Guardrails Card */}
        <div className="p-6 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold mb-2">
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Safety & Authority Rules
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 leading-relaxed">
              The AI layer reasons, interprets, and plans. The database and deterministic pricing engines enforce authority.
            </p>
            <ul className="space-y-2.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Max autonomous discount capped at <strong>5.0%</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Wholesale orders &gt;500kg escalate to human operator.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Immediate follow-up cancellation upon customer reply.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                <span>Prompt injection defenses sanitize all incoming text.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
            <a
              href="/conversations"
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
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
