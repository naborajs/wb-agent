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

  const heroStats = [
    {
      label: "Hot Leads",
      value: metrics.hot_leads,
      sub: "Score ≥ 80 or Purchase Intent",
      icon: Flame,
      color: "var(--ed-danger)",
    },
    {
      label: "Human Handoffs",
      value: metrics.pending_handoffs,
      sub: "Requires operator attention",
      icon: AlertCircle,
      color: "var(--ed-warning)",
    },
    {
      label: "Won Deals",
      value: metrics.won_deals,
      sub: `${metrics.conversion_rate_pct}% conversion rate`,
      icon: CheckCircle2,
      color: "var(--ed-success)",
    },
    {
      label: "Pipeline Value",
      value: `₹${metrics.pipeline_value_inr.toLocaleString("en-IN")}`,
      sub: "Active commercial quotes",
      icon: TrendingUp,
      color: "var(--ed-accent)",
    },
  ];

  const stageColors: Record<string, string> = {
    NEW: "#6B6B80",
    DISCOVERY: "#3b82f6",
    QUALIFIED: "#8b5cf6",
    RECOMMENDATION: "var(--ed-accent)",
    PURCHASE_INTENT: "#ec4899",
    HUMAN_HANDOFF: "var(--ed-warning)",
    WON: "var(--ed-success)",
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
            Wholesale Operations Center
          </h2>
          <p className="text-sm text-[var(--ed-text-muted)] mt-1">
            Autonomous acquisition, qualification, and B2B conversion for North Bengal Tea Co.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold text-[var(--ed-success)] border border-[var(--ed-success)]/20" style={{ background: "color-mix(in srgb, var(--ed-success) 8%, transparent)" }}>
            <span className="w-2 h-2 rounded-full bg-[var(--ed-success)] animate-pulse"></span>
            System Operational (Queue: {metrics.queue_depth})
          </div>
        </div>
      </div>

      {/* KPI Cards Grid — Glass Treatment + Entrance Animation */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {heroStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="ed-glass ed-entrance ed-lift rounded-xl p-5 flex flex-col justify-between"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--ed-text-muted)]">
                  {stat.label}
                </span>
                <span
                  className="p-2 rounded-lg"
                  style={{ background: `color-mix(in srgb, ${stat.color} 12%, transparent)` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </span>
              </div>
              <div className="mt-4">
                <div className="text-3xl font-bold font-data text-[var(--ed-text-primary)]">
                  {stat.value}
                </div>
                <div className="text-xs font-medium mt-1" style={{ color: stat.color }}>
                  {stat.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Funnel & Strategy Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Funnel Distribution */}
        <div className="lg:col-span-2 p-6 ed-panel rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[var(--ed-accent)]" />
                Sales Stage Distribution
              </h3>
              <p className="text-xs text-[var(--ed-text-muted)]">Live distribution of active B2B conversations across stages</p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--ed-border)] text-xs" style={{ background: "var(--ed-bg)" }}>
              <button
                onClick={() => setChartView("bars")}
                className={`ed-press px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "bars"
                    ? "text-[var(--ed-text-primary)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
                style={chartView === "bars" ? { background: "var(--ed-surface)" } : {}}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Funnel Bars
              </button>
              <button
                onClick={() => setChartView("pie")}
                className={`ed-press px-3 py-1 rounded-md font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "pie"
                    ? "text-[var(--ed-text-primary)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
                style={chartView === "pie" ? { background: "var(--ed-surface)" } : {}}
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
                const color = stageColors[item.stage] || "var(--ed-accent)";
                return (
                  <div key={item.stage} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ed-text-primary)] font-semibold">{item.stage}</span>
                      <span className="text-[var(--ed-text-muted)] font-data">{item.count} leads</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--ed-bg)" }}>
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, background: color }}
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
                  const total = funnel.reduce((acc, f) => acc + f.count, 0) || 1;
                  return funnel.map((item) => {
                    const pct = Math.round((item.count / total) * 100);
                    const color = stageColors[item.stage] || "#64748b";
                    return (
                      <div key={item.stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-[var(--ed-text-primary)]">{item.stage}</span>
                        </div>
                        <span className="font-data text-[var(--ed-text-muted)]">
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
        <div className="p-6 ed-panel rounded-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold mb-2">
              <Shield className="w-4 h-4 text-[var(--ed-success)]" />
              Safety & Authority Rules
            </div>
            <p className="text-xs text-[var(--ed-text-muted)] mb-4 leading-relaxed">
              The AI layer reasons, interprets, and plans. The database and deterministic pricing engines enforce authority.
            </p>
            <ul className="space-y-2.5 text-xs text-[var(--ed-text-primary)]">
              <li className="flex items-start gap-2">
                <span className="text-[var(--ed-success)] font-bold">✓</span>
                <span>Max autonomous discount capped at <strong>5.0%</strong>.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ed-success)] font-bold">✓</span>
                <span>Wholesale orders &gt;500kg escalate to human operator.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ed-success)] font-bold">✓</span>
                <span>Immediate follow-up cancellation upon customer reply.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-[var(--ed-success)] font-bold">✓</span>
                <span>Prompt injection defenses sanitize all incoming text.</span>
              </li>
            </ul>
          </div>

          <div className="mt-6 pt-4 border-t border-[var(--ed-border)]">
            <a
              href="/conversations"
              className="ed-btn-primary ed-press ed-focus-ring w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{ minHeight: "44px" }}
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
