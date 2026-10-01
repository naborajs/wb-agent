"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowUpRight,
  TrendingUp,
  MessageSquare,
  Send,
  ShoppingBag,
  Sliders,
  ChevronDown,
  ChevronUp,
  Info,
  RefreshCw,
  CheckCircle2,
  Radio,
  Plus,
} from "lucide-react";
import Dashboard from "@/components/ui/dashboard-4";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  tokens_summary?: {
    friday_tokens: number;
    edith_tokens: number;
    total_tokens: number;
  };
}

export default function HomePage() {
  const [showMoreInfo, setShowMoreInfo] = useState(false);
  const [businessName, setBusinessName] = useState("Enterprise AI Operations");
  const [businessIndustry, setBusinessIndustry] = useState("Multi-Industry Commerce");
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [quickNote, setQuickNote] = useState("");
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // Fetch business context and analytics data
  const refreshData = async () => {
    setLoading(true);
    try {
      const [settingsRes, analyticsRes] = await Promise.all([
        fetch("/api/v1/settings").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/v1/analytics/dashboard").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (settingsRes?.business_name) {
        setBusinessName(settingsRes.business_name);
      }
      if (settingsRes?.business_industry) {
        setBusinessIndustry(settingsRes.business_industry);
      }
      if (settingsRes?.currency_symbol) {
        setCurrencySymbol(settingsRes.currency_symbol);
      }
      if (analyticsRes) {
        setAnalytics(analyticsRes);
      }
    } catch {
      // Keep elegant fallback defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleQuickKnowledgeAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickNote.trim()) return;
    try {
      const res = await fetch("/api/v1/settings/quick-add-info", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ knowledge_note: quickNote.trim() }),
      });
      if (res.ok) {
        setQuickToast("Business policy updated in agent memory.");
        setQuickNote("");
        setTimeout(() => setQuickToast(null), 3500);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 pb-16 pt-2 px-1 sm:px-2">
      {/* Top Minimalist Header & Info Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs uppercase tracking-wider text-muted-foreground font-mono">
              {businessIndustry}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground mt-1">
            {businessName}
          </h1>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowMoreInfo(!showMoreInfo)}
            className="rounded-xl text-xs font-medium gap-1.5 border-border/70 text-foreground hover:bg-muted"
          >
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{showMoreInfo ? "Less info" : "More info"}</span>
            {showMoreInfo ? (
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={refreshData}
            disabled={loading}
            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
            aria-label="Refresh telemetry"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Main Dashboard - Minimal Black & White (Matches Screenshot) */}
      <Dashboard />

      {/* Expandable "More Info" Section (revealed when user clicks "More info") */}
      {showMoreInfo && (
        <div className="space-y-4 pt-4 border-t border-border/60 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-foreground">
                Extended Operational Intelligence
              </h2>
              <p className="text-xs text-muted-foreground">
                Deep pipeline telemetry, conversational agent loads, and catalog sync.
              </p>
            </div>
            <Badge variant="outline" className="text-xs border-border/80 text-muted-foreground">
              Autonomous OS
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Extended Telemetry Card */}
            <Card className="rounded-2xl border border-border/60 bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Conversation Pipeline</span>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Active Leads</span>
                  <span className="font-mono font-semibold text-foreground">
                    {analytics?.leads_total || 248}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">High Intent Leads</span>
                  <span className="font-mono font-semibold text-emerald-500">
                    {analytics?.hot_leads || 38}
                  </span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Assisted Handoffs</span>
                  <span className="font-mono font-semibold text-foreground">
                    {analytics?.pending_handoffs || 4}
                  </span>
                </div>
              </div>
            </Card>

            {/* AI Reasoning Load Card */}
            <Card className="rounded-2xl border border-border/60 bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Dual-Brain Engine Activity</span>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">FRIDAY (Fast Conversational)</span>
                  <span className="font-mono font-semibold text-foreground">Active · 99.8% uptime</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">EDITH (Negotiation &amp; Pricing)</span>
                  <span className="font-mono font-semibold text-foreground">Online · 0.4s p95</span>
                </div>
                <div className="flex justify-between py-1.5 px-2 rounded-lg bg-muted/40">
                  <span className="text-muted-foreground">Total Tokens Processed</span>
                  <span className="font-mono font-semibold text-foreground">
                    {(analytics?.tokens_summary?.total_tokens || 148200).toLocaleString()}
                  </span>
                </div>
              </div>
            </Card>

            {/* Quick Policy / Knowledge Updater */}
            <Card className="rounded-2xl border border-border/60 bg-card p-5">
              <span className="text-xs font-medium text-muted-foreground">Instant Knowledge Update</span>
              <form onSubmit={handleQuickKnowledgeAdd} className="mt-3 space-y-2.5">
                <input
                  type="text"
                  placeholder="e.g. Free shipping on all orders over $150 this weekend"
                  value={quickNote}
                  onChange={(e) => setQuickNote(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-foreground"
                />
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-muted-foreground">
                    {quickToast || "Saved directly to agent memory"}
                  </span>
                  <Button type="submit" size="sm" className="rounded-xl text-xs h-8">
                    Update Agent
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
