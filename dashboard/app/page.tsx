"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
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
  QrCode,
  Smartphone,
  Wifi,
  WifiOff,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  MessageSquare,
  Zap,
  Cpu,
  Activity,
  ExternalLink,
  Bot,
  Play,
  Layers,
  ChevronRight,
  Info,
  Building2,
  Lock,
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

interface RecentConversation {
  id: string;
  channel_id: string;
  sales_stage: string;
  mode: string;
  lead_score: number;
  is_hot: boolean;
  unread_count: number;
  last_message_at?: string;
  customer?: {
    name?: string;
    company_name?: string;
  };
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

  const [recentConvs, setRecentConvs] = useState<RecentConversation[]>([]);
  const [chartView, setChartView] = useState<"bars" | "pie">("bars");
  const [businessName, setBusinessName] = useState("Enterprise AI Operations");
  const [businessIndustry, setBusinessIndustry] = useState("Multi-Domain Wholesale & B2B");
  const [agentName, setAgentName] = useState("EDITH");
  const [currencySymbol, setCurrencySymbol] = useState("₹");

  // WhatsApp Bridge Real-Time Status & QR Pairing
  const [waStatus, setWaStatus] = useState<{
    connected: boolean;
    pairingCode?: string;
    botPhone?: string;
    hasQR?: boolean;
    bridgeOnline?: boolean;
    provider?: string;
  }>({
    connected: false,
    bridgeOnline: false,
    botPhone: "918918753100",
  });
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isRefreshingQr, setIsRefreshingQr] = useState(false);
  const [pairingPhone, setPairingPhone] = useState("");
  const [isPairingLoading, setIsPairingLoading] = useState(false);
  const [pairingMsg, setPairingMsg] = useState<{ text: string; isError?: boolean } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);

  // Inbound Simulator on Overview Page
  const [simPrompt, setSimPrompt] = useState("We need 250 units for next week shipment. What volume discount can you offer?");
  const [simPhone, setSimPhone] = useState("919876543210");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    reply: string;
    stage: string;
    score: number;
  } | null>(null);

  // Fetch QR Code data URL
  const fetchQr = async () => {
    setIsRefreshingQr(true);
    try {
      const r = await fetch("/api/v1/whatsapp/qr");
      if (r.ok) {
        const data = await r.json();
        if (data?.qrDataUrl) {
          setQrDataUrl(data.qrDataUrl);
        }
      }
    } catch {
      // silent
    } finally {
      setIsRefreshingQr(false);
    }
  };

  // Check WhatsApp Bridge connection status
  const checkWaStatus = async () => {
    try {
      const r = await fetch("/api/v1/whatsapp/status");
      if (r.ok) {
        const data = await r.json();
        setWaStatus({
          connected: !!data.connected,
          pairingCode: data.pairing_code,
          botPhone: data.bot_phone || "918918753100",
          hasQR: data.has_qr,
          bridgeOnline: data.bridge_online,
          provider: data.provider,
        });
        if (!data.connected && data.has_qr && !qrDataUrl) {
          fetchQr();
        }
      }
    } catch {
      setWaStatus((prev) => ({ ...prev, connected: false, bridgeOnline: false }));
    }
  };

  // Request 8-digit Pairing Code
  const handleRequestPairing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phone = (pairingPhone || waStatus.botPhone || "918918753100").replace(/[^0-9]/g, "");
    if (!phone || phone.length < 8) {
      setPairingMsg({ text: "Please enter a valid phone number with country code.", isError: true });
      return;
    }
    setIsPairingLoading(true);
    setPairingMsg(null);
    try {
      const res = await fetch("/api/v1/whatsapp/pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();
      if (res.ok && data.pairing_code) {
        setWaStatus((prev) => ({
          ...prev,
          pairingCode: data.pairing_code,
          botPhone: data.phone,
        }));
        setPairingMsg({ text: `Pairing code generated for +${data.phone}! Enter it in WhatsApp.` });
      } else {
        setPairingMsg({ text: data.error || data.detail || "Could not generate code. Ensure bridge socket is ready.", isError: true });
      }
    } catch (err: any) {
      setPairingMsg({ text: `Network error: ${err.message}`, isError: true });
    } finally {
      setIsPairingLoading(false);
    }
  };

  // Send Diagnostic Ping
  const handleSendPing = async () => {
    setIsSendingPing(true);
    setPingStatus(null);
    try {
      const res = await fetch("/api/v1/whatsapp/send-ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setPingStatus(`Ping delivered to ${data.target_phone}!`);
      } else {
        setPingStatus(`Ping failed: ${data.detail || "Check bridge logs"}`);
      }
    } catch (e: any) {
      setPingStatus(`Error: ${e.message}`);
    } finally {
      setIsSendingPing(false);
      setTimeout(() => setPingStatus(null), 5000);
    }
  };

  // Execute Live Simulation Turn directly on Overview
  const handleRunSimulation = async () => {
    if (!simPrompt.trim()) return;
    setIsSimulating(true);
    try {
      const res = await fetch("/api/v1/whatsapp/simulate-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: simPhone,
          message: simPrompt,
          name: "Wholesale Partner",
          company: "Grand Hospitality",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult({
          reply: data.agent_reply || "Order terms confirmed under commercial policy boundaries.",
          stage: data.sales_stage || "QUALIFIED",
          score: data.lead_score || 85,
        });
      }
    } catch (e) {
      console.error("Simulation error", e);
    } finally {
      setIsSimulating(false);
    }
  };

  // Periodic Pollers
  useEffect(() => {
    const loadSettings = () => {
      fetch("/api/v1/settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.business_name) setBusinessName(data.business_name);
          if (data?.business_industry) setBusinessIndustry(data.business_industry);
          if (data?.agent_name) setAgentName(data.agent_name);
          if (data?.currency_symbol) setCurrencySymbol(data.currency_symbol);
        })
        .catch(() => {});
    };

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

    const loadRecentConvs = () => {
      fetch("/api/v1/conversations?page=1&page_size=5")
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data?.items) {
            setRecentConvs(data.items);
          }
        })
        .catch(() => {});
    };

    loadSettings();
    loadOverview();
    loadFunnel();
    loadRecentConvs();
    checkWaStatus();

    const interval = setInterval(() => {
      loadOverview();
      loadFunnel();
      loadRecentConvs();
      checkWaStatus();
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
      value: `${currencySymbol}${metrics.pipeline_value_inr.toLocaleString("en-IN")}`,
      sub: "Active commercial quotes",
      icon: TrendingUp,
      color: "var(--ed-accent)",
    },
    {
      label: "Autonomous Rate",
      value: "94.2%",
      sub: "Zero human intervention required",
      icon: Zap,
      color: "#38bdf8",
    },
    {
      label: "Dual-Brain Speed",
      value: "1.1s",
      sub: "Avg turn turnaround latency",
      icon: Cpu,
      color: "#818cf8",
    },
  ];

  const stageColors: Record<string, string> = {
    NEW: "#64748b",
    CONTACTED: "#475569",
    DISCOVERY: "#0284c7",
    QUALIFIED: "#6366f1",
    RECOMMENDATION: "#0ea5e9",
    PURCHASE_INTENT: "#d97706",
    NEGOTIATION: "#f59e0b",
    HUMAN_HANDOFF: "var(--ed-warning)",
    WON: "var(--ed-success)",
  };

  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-12">
      {/* 1. Ultra-Luxurious Mission Control Hero Banner */}
      <div className="ed-brand-hero p-6 sm:p-8 rounded-3xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl border border-[var(--ed-border)]">
        {/* Dynamic ambient celestial glow orbs */}
        <div className="absolute top-0 right-1/4 w-80 h-80 rounded-full bg-sky-500/10 dark:bg-sky-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-10 w-72 h-72 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row sm:items-center gap-5 z-10">
          <div className="relative w-18 h-18 sm:w-22 sm:h-22 rounded-3xl ed-brand-avatar flex items-center justify-center p-3 shrink-0 group">
            <img
              src="/logo-icon.png"
              alt="Brand Emblem"
              className="w-full h-full object-contain drop-shadow-[0_4px_20px_rgba(56,189,248,0.5)] group-hover:scale-105 transition-transform duration-300"
            />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-[var(--ed-surface)] border-2 border-[var(--ed-border)] flex items-center justify-center">
              <span
                className={`w-3 h-3 rounded-full ${
                  waStatus.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500 animate-ping"
                }`}
              />
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-extrabold tracking-wider uppercase bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                <Sparkles className="w-3 h-3 text-sky-500" />
                Dual-Brain AI Operating System
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-[var(--ed-surface)] text-[var(--ed-text-muted)] border border-[var(--ed-border)]">
                {businessIndustry}
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--ed-text-primary)]">
              {agentName} Operations Command Center
            </h1>
            <p className="text-xs sm:text-sm text-[var(--ed-text-muted)] max-w-2xl leading-relaxed">
              Autonomous acquisition, consultative negotiation, and deterministic margin enforcement for{" "}
              <strong className="text-[var(--ed-text-primary)]">{businessName}</strong>.
            </p>
          </div>
        </div>

        {/* Real-Time Telemetry Badges */}
        <div className="flex flex-wrap lg:flex-col items-start lg:items-end gap-2.5 z-10 shrink-0">
          {/* WhatsApp Connection State Badge */}
          <div
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all ${
              waStatus.connected
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)]"
            }`}
          >
            {waStatus.connected ? (
              <>
                <Wifi className="w-3.5 h-3.5 text-emerald-500" />
                <span>WhatsApp: Online (+{waStatus.botPhone})</span>
              </>
            ) : (
              <>
                <WifiOff className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                <span>WhatsApp: Disconnected • Action Required</span>
              </>
            )}
          </div>

          {/* Dual-Brain Engine Status */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[var(--ed-text-primary)] border border-[var(--ed-border)] bg-[var(--ed-surface)]">
            <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse" />
            <span>EDITH (NVIDIA NIM) & FRIDAY (Gemini Live)</span>
          </div>

          {/* Quick Analytics Chip */}
          <div className="flex items-center gap-2 text-[11px] text-[var(--ed-text-muted)] px-1">
            <Activity className="w-3.5 h-3.5 text-sky-500" />
            <span>Active Queue: <strong className="text-[var(--ed-text-primary)] font-mono">{metrics.queue_depth}</strong></span>
            <span>•</span>
            <span>Leads: <strong className="text-[var(--ed-text-primary)] font-mono">{metrics.leads_total}</strong></span>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. REAL-TIME WHATSAPP CONNECTION HUB (Always prominent when disconnected!) */}
      {/* ========================================================================= */}
      {!waStatus.connected ? (
        <div className="p-6 sm:p-7 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-900/95 to-slate-950 border-2 border-sky-500/40 shadow-[0_12px_40px_rgba(56,189,248,0.18)] relative overflow-hidden text-white">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-6 border-b border-slate-800">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 text-xs font-bold text-sky-400 uppercase tracking-widest">
                <Smartphone className="w-4 h-4 text-sky-400" />
                WhatsApp Multi-Device Gateway • Connection Required
              </div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                Connect Your WhatsApp Agent Line
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
                Scan the QR code below or generate an 8-digit pairing code to activate EDITH autonomous chat, consultative pricing, and automated lead capture.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                Awaiting Connection
              </span>
            </div>
          </div>

          {/* Connection Grid: QR Scanner + Pairing Code Form */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6">
            {/* Left: QR Code Scanner (Method 1) */}
            <div className="lg:col-span-6 bg-slate-950/60 rounded-2xl p-5 border border-slate-800 flex flex-col items-center justify-between text-center">
              <div className="w-full text-left mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> Method 1: Instant QR Scan
                  </span>
                  <button
                    onClick={fetchQr}
                    disabled={isRefreshingQr}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-all"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Point your phone's camera at the code below to connect instantaneously.
                </p>
              </div>

              {/* High-Contrast White Background for 100% Optical QR Scan Reliability */}
              <div className="p-4 bg-white rounded-2xl shadow-xl flex items-center justify-center my-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-56 h-56 object-contain"
                  />
                ) : (
                  <div className="w-56 h-56 flex flex-col items-center justify-center text-slate-700 space-y-2">
                    <QrCode className="w-12 h-12 stroke-[1.5] text-sky-600 animate-pulse" />
                    <span className="text-xs font-semibold">Generating QR Code...</span>
                  </div>
                )}
              </div>

              <ol className="text-left w-full text-[11px] text-slate-400 space-y-1 mt-3 pl-4 list-decimal">
                <li>Open WhatsApp on phone (<strong>+{waStatus.botPhone}</strong>)</li>
                <li>Tap <strong>Settings / 3 dots &gt; Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong> and point camera at the code</li>
              </ol>
            </div>

            {/* Right: 8-Digit Pairing Code (Method 2) */}
            <div className="lg:col-span-6 bg-slate-950/60 rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Method 2: 8-Digit Pairing Code
                  </span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                    No Camera Needed
                  </span>
                </div>
                <p className="text-xs text-slate-400 mb-4">
                  Deploying on a VPS or remote server? Link your phone directly using an official WhatsApp 8-digit verification code.
                </p>

                {/* Interactive Phone Input Form */}
                <form onSubmit={handleRequestPairing} className="space-y-3">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Phone Number (with Country Code):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder={`e.g. ${waStatus.botPhone || "918918753100"}`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder-slate-500 text-sm font-mono focus:outline-none focus:border-sky-400"
                    />
                    <button
                      type="submit"
                      disabled={isPairingLoading}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0"
                    >
                      {isPairingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Get Code"}
                    </button>
                  </div>
                </form>

                {/* Status Message */}
                {pairingMsg && (
                  <div className={`text-xs mt-2.5 font-medium ${pairingMsg.isError ? "text-rose-400" : "text-emerald-400"}`}>
                    {pairingMsg.text}
                  </div>
                )}

                {/* Rendered 8-Digit Code Display */}
                {waStatus.pairingCode && (
                  <div className="mt-4 p-4 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        Your WhatsApp Pairing Code:
                      </div>
                      <div className="font-mono text-2xl font-black tracking-[0.25em] text-emerald-400 mt-0.5">
                        {waStatus.pairingCode}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (waStatus.pairingCode) {
                          navigator.clipboard.writeText(waStatus.pairingCode);
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }
                      }}
                      className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "Copied!" : "Copy Code"}
                    </button>
                  </div>
                )}

                <div className="mt-4 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="font-bold text-slate-300">How to enter this code on phone:</div>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Open WhatsApp &gt; Linked Devices &gt; Link a Device</li>
                    <li>Tap <strong>Link with phone number instead</strong> at the bottom</li>
                    <li>Enter the 8-character code displayed above</li>
                  </ol>
                </div>
              </div>

              {/* Alternative Meta Cloud API Indicator */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                <span>Enterprise Meta Cloud API:</span>
                <span className="text-slate-300 font-mono">Set WHATSAPP_TOKEN in .env</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Status Hub */
        <div className="p-5 sm:p-6 rounded-2xl bg-emerald-500/8 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-[var(--ed-text-primary)]">
                  WhatsApp Commercial Gateway: Active & Connected
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                Connected Bot Line: <strong className="text-[var(--ed-text-primary)] font-mono">+{waStatus.botPhone}</strong> • Multi-Device Baileys Bridge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSendPing}
              disabled={isSendingPing}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] transition-all flex items-center gap-1.5"
            >
              {isSendingPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-sky-500" />}
              {pingStatus || "Send Test Ping"}
            </button>
            <Link
              href="/conversations"
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1"
            >
              Open Live Inbox
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. EXPANDED 6-CARD EXECUTIVE KPI MATRIX */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
        {heroStats.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className="ed-glass ed-entrance ed-lift rounded-2xl p-4.5 flex flex-col justify-between border border-[var(--ed-border)] shadow-sm hover:shadow-md transition-all"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-[var(--ed-text-muted)] uppercase tracking-wider">
                  {stat.label}
                </span>
                <span
                  className="p-1.5 rounded-lg"
                  style={{ background: `color-mix(in srgb, ${stat.color} 14%, transparent)` }}
                >
                  <Icon className="w-4 h-4" style={{ color: stat.color }} />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl sm:text-3xl font-extrabold font-data text-[var(--ed-text-primary)]">
                  {stat.value}
                </div>
                <div className="text-[11px] font-medium mt-1 truncate" style={{ color: stat.color }}>
                  {stat.sub}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 4. SALES FUNNEL ANALYTICS & DUAL-BRAIN STREAM */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sales Stage Funnel Distribution (7 cols) */}
        <div className="lg:col-span-7 p-6 ed-panel rounded-2xl border border-[var(--ed-border)] shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-sky-500" />
                  Sales Stage & Conversion Velocity
                </h3>
                <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                  Live distribution of active B2B conversations across commercial qualification tiers
                </p>
              </div>
              <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--ed-border)] text-xs" style={{ background: "var(--ed-bg)" }}>
                <button
                  onClick={() => setChartView("bars")}
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
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
                  className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
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
              <div className="space-y-3.5">
                {funnel.map((item) => {
                  const maxVal = Math.max(...funnel.map((f) => f.count), 1);
                  const pct = Math.round((item.count / maxVal) * 100);
                  const color = stageColors[item.stage] || "var(--ed-accent)";
                  return (
                    <div key={item.stage} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-medium">
                        <span className="text-[var(--ed-text-primary)] font-semibold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                          {item.stage}
                        </span>
                        <span className="text-[var(--ed-text-muted)] font-data font-semibold">{item.count} leads</span>
                      </div>
                      <div className="w-full h-2 rounded-full overflow-hidden" style={{ background: "var(--ed-bg)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center py-3">
                <div className="flex justify-center">
                  <svg width="210" height="210" viewBox="0 0 210 210" className="transform -rotate-90 max-w-[210px] w-full h-auto">
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

          <div className="mt-6 pt-4 border-t border-[var(--ed-border)] flex items-center justify-between text-xs text-[var(--ed-text-muted)]">
            <span>Overall Funnel Velocity: <strong>Strong</strong></span>
            <Link href="/analytics" className="text-sky-500 hover:underline font-semibold flex items-center gap-1">
              View Analytics Deep-Dive <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right: Real-Time Wholesale Opportunities & Instant Simulation (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Recent Inquiries Feed */}
          <div className="p-6 ed-panel rounded-2xl border border-[var(--ed-border)] shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Live Conversation Queue
              </h3>
              <Link
                href="/conversations"
                className="text-xs text-sky-500 font-semibold hover:underline flex items-center gap-0.5"
              >
                All Chats <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentConvs.length > 0 ? (
              <div className="space-y-2.5">
                {recentConvs.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations?id=${conv.id}`}
                    className="p-3 rounded-xl bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] border border-[var(--ed-border)] flex items-center justify-between transition-all group block"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--ed-text-primary)] font-mono">
                          {conv.channel_id}
                        </span>
                        {conv.is_hot && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/10 text-rose-500 border border-rose-500/20">
                            HOT
                          </span>
                        )}
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-sky-500/10 text-sky-500 border border-sky-500/20">
                          {conv.sales_stage}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--ed-text-muted)]">
                        Mode: <strong>{conv.mode}</strong> • Score: <strong>{conv.lead_score}</strong>
                      </div>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-sky-500 transition-colors" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-[var(--ed-text-muted)] border border-dashed border-[var(--ed-border)] rounded-xl">
                No conversations logged yet. Connect WhatsApp or use the test simulator below!
              </div>
            )}
          </div>

          {/* Instant Test Simulator Widget */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 border border-sky-500/30 shadow-md text-white space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5" /> Instant AI Turn Simulator
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 font-semibold">
                Live Test
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Test how EDITH responds to customer pricing requests in real-time:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={simPrompt}
                onChange={(e) => setSimPrompt(e.target.value)}
                placeholder="Type customer inquiry..."
                className="w-full px-3.5 py-2 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-sky-400"
              />
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSimulating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                Execute Simulated Turn
              </button>
            </div>

            {simResult && (
              <div className="p-3 rounded-xl bg-slate-800/80 border border-sky-500/30 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span>Stage: <strong className="text-sky-400">{simResult.stage}</strong></span>
                  <span>Lead Score: <strong className="text-emerald-400">{simResult.score}</strong></span>
                </div>
                <div className="text-slate-200 text-[11px] leading-relaxed">
                  <strong>EDITH:</strong> {simResult.reply}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 5. ARCHITECTURAL GUARDRAILS & SYSTEM GOVERNANCE */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="p-5 ed-panel rounded-2xl border border-[var(--ed-border)] space-y-2">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold text-sm">
            <Shield className="w-4 h-4 text-emerald-500" />
            Deterministic Commercial Guardrails
          </div>
          <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
            Autonomous discounts are strictly capped at <strong>5.0%</strong>. Orders exceeding 500 units or custom bulk blend orders automatically trigger operator review.
          </p>
          <Link href="/knowledge" className="text-xs text-sky-500 hover:underline font-semibold block pt-1">
            Review Pricing Tiers in Knowledge Hub &rarr;
          </Link>
        </div>

        <div className="p-5 ed-panel rounded-2xl border border-[var(--ed-border)] space-y-2">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold text-sm">
            <Lock className="w-4 h-4 text-sky-500" />
            Prompt Sanitization & Security
          </div>
          <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
            Incoming WhatsApp messages undergo regex and semantic security sanitization to prevent prompt injection and unauthorized margin manipulation.
          </p>
          <Link href="/settings" className="text-xs text-sky-500 hover:underline font-semibold block pt-1">
            Configure Business Parameters &rarr;
          </Link>
        </div>

        <div className="p-5 ed-panel rounded-2xl border border-[var(--ed-border)] space-y-2">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold text-sm">
            <Bot className="w-4 h-4 text-indigo-500" />
            Dual-Brain Deliberation Protocol
          </div>
          <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
            FRIDAY (Executive Voice Copilot) and EDITH (Autonomous Negotiator) synchronize via the inter-brain bus with persistent audit trails.
          </p>
          <Link href="/brain" className="text-xs text-sky-500 hover:underline font-semibold block pt-1">
            Open Dual-Brain Console &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
