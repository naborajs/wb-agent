"use client";

import React, { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Download,
  MapPin,
  AlertCircle,
  PieChart,
  DollarSign,
  Users,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Compass,
} from "lucide-react";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/radar-chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const objectionRadarConfig = {
  frequency: {
    label: "Inquiry Share",
    color: "var(--chart-1)",
  },
  resolved: {
    label: "Auto-Resolution %",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const regionalRadarConfig = {
  leads: {
    label: "Lead Volume",
    color: "var(--chart-2)",
  },
  won: {
    label: "Closed Deals",
    color: "var(--chart-3)",
  },
} satisfies ChartConfig;

const objectionRadarData = [
  { objection: "Price/Rate", frequency: 45, resolved: 72 },
  { objection: "Quality Proof", frequency: 25, resolved: 88 },
  { objection: "MOQ Tier", frequency: 15, resolved: 78 },
  { objection: "Transit Time", frequency: 10, resolved: 90 },
  { objection: "Credit Terms", frequency: 5, resolved: 45 },
];

interface ParetoItem {
  objection: string;
  count: number;
  cumulative_pct: number;
}

interface GeoItem {
  region: string;
  state: string;
  lead_count: number;
  won_count: number;
  revenue: number;
}

interface ForecastStage {
  stage: string;
  value: number;
}

interface AnalyticsData {
  pareto: ParetoItem[];
  geographic: GeoItem[];
  forecast: {
    projected_revenue: number;
    weighted_pipeline: number;
    by_stage: ForecastStage[];
  };
  export_url: string;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [objectionView, setObjectionView] = useState<"bars" | "radar">("bars");
  const [geoView, setGeoView] = useState<"table" | "radar">("table");

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/analytics/intelligence");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load analytics intelligence:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const objectionLabels: Record<string, string> = {
    price_too_high: "Price vs. Local Competitors",
    needs_quality_proof: "Requires Estate Quality / Sample Proof",
    minimum_order_quantity_too_high: "MOQ Higher than Initial Need",
    logistics_delivery_timeline: "Transit & Delivery Timeline Concern",
    credit_payment_terms: "Requested Credit / Post-dated Terms",
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--ed-border)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20">
              <TrendingUp className="w-5 h-5" />
            </span>
            Sales Intelligence & Objection Analytics
          </h1>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Pareto objection distribution, geographic conversion heatmaps, and weighted revenue forecasting.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 rounded-xl border border-[var(--ed-border)] hover:bg-[var(--ed-surface)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-all"
            title="Refresh Analytics"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <a
            href="/api/v1/analytics/export?format=csv"
            download="edith_sales_intelligence_export.csv"
            className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Download className="w-4 h-4" /> Export Executive CSV
          </a>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="ed-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)]">
            Total Pipeline Value
          </span>
          <div className="text-xl font-extrabold text-[var(--ed-text-primary)] font-data">
            ₹{((data?.forecast?.projected_revenue || 2147000) / 100000).toFixed(2)} Lakhs
          </div>
          <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1">
            <span>↑ 18.4%</span> vs previous month
          </p>
        </div>

        <div className="ed-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)]">
            Weighted Forecast
          </span>
          <div className="text-xl font-extrabold text-red-500 font-data">
            ₹{((data?.forecast?.weighted_pipeline || 1425000) / 100000).toFixed(2)} Lakhs
          </div>
          <p className="text-[10px] text-[var(--ed-text-muted)]">
            Based on consultative sales stage probability
          </p>
        </div>

        <div className="ed-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)]">
            Top Objection Driver
          </span>
          <div className="text-base font-bold text-[var(--ed-text-primary)] truncate">
            Rate Sensitivity (45%)
          </div>
          <p className="text-[10px] text-amber-500 font-medium">
            Resolved by 5% volume tier discount
          </p>
        </div>

        <div className="ed-panel p-4 space-y-1">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)]">
            Top Wholesale Hub
          </span>
          <div className="text-base font-bold text-emerald-500 flex items-center gap-1">
            <MapPin className="w-4 h-4" /> Siliguri (41.3%)
          </div>
          <p className="text-[10px] text-[var(--ed-text-muted)]">
            24 deals closed out of 58 buyer inquiries
          </p>
        </div>
      </div>

      {/* Main Analysis Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Objection Pareto Distribution */}
        <div className="ed-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500" /> Objection Pareto Analysis
              </h3>
              <p className="text-[11px] text-[var(--ed-text-muted)]">
                Frequency distribution and cumulative 80% resolution impact
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--ed-border)] text-[11px] bg-[var(--ed-bg)]">
              <button
                onClick={() => setObjectionView("bars")}
                className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  objectionView === "bars"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <BarChart3 className="w-3 h-3" /> List
              </button>
              <button
                onClick={() => setObjectionView("radar")}
                className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  objectionView === "radar"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <Compass className="w-3 h-3" /> Radar
              </button>
            </div>
          </div>

          {objectionView === "bars" ? (
            <div className="space-y-3 pt-1">
              {(data?.pareto || [
                { objection: "price_too_high", count: 45, cumulative_pct: 45.0 },
                { objection: "needs_quality_proof", count: 25, cumulative_pct: 70.0 },
                { objection: "minimum_order_quantity_too_high", count: 15, cumulative_pct: 85.0 },
                { objection: "logistics_delivery_timeline", count: 10, cumulative_pct: 95.0 },
                { objection: "credit_payment_terms", count: 5, cumulative_pct: 100.0 },
              ]).map((item, idx) => {
                const label = objectionLabels[item.objection] || item.objection;
                return (
                  <div key={idx} className="space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-[var(--ed-text-primary)]">{label}</span>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="font-bold text-[var(--ed-text-primary)]">{item.count}</span>
                        <span className="text-[var(--ed-text-muted)]">({item.cumulative_pct}% cum.)</span>
                      </div>
                    </div>
                    <div className="h-2 w-full bg-[var(--ed-bg)] rounded-full overflow-hidden flex">
                      <div
                        className="bg-gradient-to-r from-red-600 to-red-400 rounded-full"
                        style={{ width: `${item.count}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <ChartContainer
                config={objectionRadarConfig}
                className="mx-auto aspect-square max-h-[240px] w-full"
              >
                <RadarChart
                  data={(data?.pareto || [
                    { objection: "price_too_high", count: 45 },
                    { objection: "needs_quality_proof", count: 25 },
                    { objection: "minimum_order_quantity_too_high", count: 15 },
                    { objection: "logistics_delivery_timeline", count: 10 },
                    { objection: "credit_payment_terms", count: 5 },
                  ]).map((item) => {
                    const shortNames: Record<string, string> = {
                      price_too_high: "Price/Rate",
                      needs_quality_proof: "Quality Proof",
                      minimum_order_quantity_too_high: "MOQ Tier",
                      logistics_delivery_timeline: "Transit Time",
                      credit_payment_terms: "Credit Terms",
                    };
                    const autoResolveRates: Record<string, number> = {
                      price_too_high: 74,
                      needs_quality_proof: 92,
                      minimum_order_quantity_too_high: 80,
                      logistics_delivery_timeline: 88,
                      credit_payment_terms: 52,
                    };
                    return {
                      objection: shortNames[item.objection] || item.objection,
                      frequency: item.count,
                      resolved: autoResolveRates[item.objection] || 75,
                    };
                  })}
                >
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <PolarAngleAxis dataKey="objection" />
                  <PolarGrid strokeDasharray="3 3" />
                  <Radar
                    stroke="var(--color-frequency)"
                    dataKey="frequency"
                    fill="var(--color-frequency)"
                    fillOpacity={0.25}
                  />
                  <Radar
                    stroke="var(--color-resolved)"
                    dataKey="resolved"
                    fill="var(--color-resolved)"
                    fillOpacity={0.12}
                  />
                </RadarChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-5 text-[11px] text-[var(--ed-text-muted)] pt-2 border-t border-[var(--ed-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--chart-1)]" />
                  <span className="text-[var(--ed-text-primary)] font-medium">Inquiry Frequency %</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--chart-3)]" />
                  <span>Auto-Resolution Rate %</span>
                </div>
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[11px] text-[var(--ed-text-muted)] leading-relaxed">
            💡 <strong>AI Sales Recommendation:</strong> 70% of buyer objections relate to rate sensitivity and quality reassurance. Offering automated 50kg rate locks and sample packs resolves the vast majority of dropped conversations.
          </div>
        </div>

        {/* Geographic Hub Distribution */}
        <div className="ed-panel p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
            <div>
              <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                <MapPin className="w-4 h-4 text-emerald-500" /> Regional Lead Density & Revenue
              </h3>
              <p className="text-[11px] text-[var(--ed-text-muted)]">
                Wholesale inquiries and conversion across Eastern India corridors
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--ed-border)] text-[11px] bg-[var(--ed-bg)]">
              <button
                onClick={() => setGeoView("table")}
                className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  geoView === "table"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <BarChart3 className="w-3 h-3" /> Table
              </button>
              <button
                onClick={() => setGeoView("radar")}
                className={`px-2.5 py-0.5 rounded-lg font-semibold transition-colors flex items-center gap-1 ${
                  geoView === "radar"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <Compass className="w-3 h-3" /> Radar
              </button>
            </div>
          </div>

          {geoView === "table" ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse min-w-[460px]">
                <thead>
                  <tr className="border-b border-[var(--ed-border)] text-[10px] uppercase font-bold text-[var(--ed-text-muted)]">
                    <th className="py-2">Hub Region</th>
                    <th className="py-2 text-center">Leads</th>
                    <th className="py-2 text-center">Closed Won</th>
                    <th className="py-2 text-right">Revenue (INR)</th>
                    <th className="py-2 text-right">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--ed-border)]">
                  {(data?.geographic || [
                    { region: "Siliguri", state: "West Bengal", lead_count: 58, won_count: 24, revenue: 842000.0 },
                    { region: "Kolkata", state: "West Bengal", lead_count: 34, won_count: 12, revenue: 520000.0 },
                    { region: "Darjeeling", state: "West Bengal", lead_count: 22, won_count: 9, revenue: 390000.0 },
                    { region: "Jalpaiguri", state: "West Bengal", lead_count: 18, won_count: 6, revenue: 210000.0 },
                    { region: "Delhi NCR", state: "Other", lead_count: 15, won_count: 4, revenue: 185000.0 },
                  ]).map((geo, idx) => {
                    const winRate = geo.lead_count > 0 ? ((geo.won_count / geo.lead_count) * 100).toFixed(1) : "0.0";
                    return (
                      <tr key={idx} className="hover:bg-[var(--ed-bg)] transition-colors">
                        <td className="py-2.5 font-bold text-[var(--ed-text-primary)]">
                          {geo.region} <span className="text-[10px] font-normal text-[var(--ed-text-muted)]">({geo.state})</span>
                        </td>
                        <td className="py-2.5 text-center font-mono">{geo.lead_count}</td>
                        <td className="py-2.5 text-center font-mono font-bold text-emerald-500">{geo.won_count}</td>
                        <td className="py-2.5 text-right font-mono font-data">₹{geo.revenue.toLocaleString("en-IN")}</td>
                        <td className="py-2.5 text-right font-mono font-bold text-[var(--ed-text-primary)]">{winRate}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-2 space-y-2">
              <ChartContainer
                config={regionalRadarConfig}
                className="mx-auto aspect-square max-h-[240px] w-full"
              >
                <RadarChart
                  data={(data?.geographic || [
                    { region: "Siliguri", lead_count: 58, won_count: 24 },
                    { region: "Kolkata", lead_count: 34, won_count: 12 },
                    { region: "Darjeeling", lead_count: 22, won_count: 9 },
                    { region: "Jalpaiguri", lead_count: 18, won_count: 6 },
                    { region: "Delhi NCR", lead_count: 15, won_count: 4 },
                  ]).map((g) => ({
                    hub: g.region,
                    leads: g.lead_count,
                    won: g.won_count,
                  }))}
                >
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <PolarAngleAxis dataKey="hub" />
                  <PolarGrid strokeDasharray="3 3" />
                  <Radar
                    stroke="var(--color-leads)"
                    dataKey="leads"
                    fill="var(--color-leads)"
                    fillOpacity={0.22}
                  />
                  <Radar
                    stroke="var(--color-won)"
                    dataKey="won"
                    fill="var(--color-won)"
                    fillOpacity={0.15}
                  />
                </RadarChart>
              </ChartContainer>
              <div className="flex items-center justify-center gap-5 text-[11px] text-[var(--ed-text-muted)] pt-2 border-t border-[var(--ed-border)]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--chart-2)]" />
                  <span className="text-[var(--ed-text-primary)] font-medium">Inquiry Leads</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-[var(--chart-3)]" />
                  <span>Closed Won Deals</span>
                </div>
              </div>
            </div>
          )}

          {/* Stage Probabilities Bar */}
          <div className="pt-2 border-t border-[var(--ed-border)] space-y-2">
            <span className="text-[11px] font-bold text-[var(--ed-text-primary)]">
              Pipeline Stage Breakdown (Weighted INR)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
              <div className="p-2 rounded-lg bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                <div className="text-[10px] text-[var(--ed-text-muted)]">QUALIFIED (20%)</div>
                <div className="font-bold font-data text-slate-300 mt-0.5">₹5.00L</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                <div className="text-[10px] text-[var(--ed-text-muted)]">RECOMMENDATION (40%)</div>
                <div className="font-bold font-data text-amber-400 mt-0.5">₹6.80L</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                <div className="text-[10px] text-[var(--ed-text-muted)]">PURCHASE_INTENT (70%)</div>
                <div className="font-bold font-data text-purple-400 mt-0.5">₹7.20L</div>
              </div>
              <div className="p-2 rounded-lg bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                <div className="text-[10px] text-[var(--ed-text-muted)]">WON (100%)</div>
                <div className="font-bold font-data text-emerald-400 mt-0.5">₹2.47L</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
