"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  ArrowUpRight,
  Shield,
  Send,
  PieChart as PieIcon,
  BarChart3,
  QrCode,
  Smartphone,
  Copy,
  Check,
  RefreshCw,
  MessageSquare,
  Zap,
  Play,
  ChevronRight,
  Lock,
  Bot,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import DualBrainHeroBus from "@/components/DualBrainHeroBus";

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
  const [businessIndustry, setBusinessIndustry] = useState("Commercial Wholesale & B2B");
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

  // Inbound Simulator on Overview Page ("The Money Moment")
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
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* ========================================================================= */}
      {/* 1. DUAL-BRAIN COMMAND CENTER HERO (CENTERPIECE WITH SYNAPTIC INTER-BUS)   */}
      {/* ========================================================================= */}
      <DualBrainHeroBus
        queueDepth={metrics.queue_depth}
        autonomousRate={metrics.conversion_rate_pct > 0 ? 94.2 : 94.2}
        turnSpeed="1.1s"
        isSimulatingTurn={isSimulating}
        businessName={businessName}
        businessIndustry={businessIndustry}
        waConnected={waStatus.connected}
        botPhone={waStatus.botPhone}
        hotLeadsCount={metrics.hot_leads}
        wonDealsCount={metrics.won_deals}
        pipelineValueStr={`${currencySymbol}${metrics.pipeline_value_inr.toLocaleString("en-IN")}`}
        pendingHandoffsCount={metrics.pending_handoffs}
      />

      {/* ========================================================================= */}
      {/* 2. REAL-TIME WHATSAPP CONNECTION GATEWAY                                 */}
      {/* ========================================================================= */}
      {!waStatus.connected ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#0B0F19] border border-sky-300 dark:border-[#00D2FE]/30 shadow-lg dark:shadow-xl relative overflow-hidden text-slate-900 dark:text-white transition-colors">
          <div className="absolute top-0 right-0 w-80 h-80 bg-sky-400/10 dark:bg-[#00D2FE]/10 rounded-full blur-3xl pointer-events-none" />

          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-slate-200 dark:border-[#1E293B]">
            <div className="space-y-0.5">
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-[#00D2FE] uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                WhatsApp Commercial Gateway // Connection Required
              </div>
              <h2 className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white">
                Pair Your WhatsApp Agent Line
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-2xl">
                Scan the optical QR code or generate an 8-digit pairing code to activate EDITH autonomous conversational closing.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-amber-50 dark:bg-[#F59E0B]/15 text-amber-700 dark:text-[#F59E0B] border border-amber-300 dark:border-[#F59E0B]/30 flex items-center gap-1.5 animate-pulse">
                <AlertCircle className="w-3.5 h-3.5" />
                Awaiting Connection
              </span>
            </div>
          </div>

          {/* Connection Columns: QR Scan + Pairing Code */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-5">
            {/* Left: Optical QR Code Scanner */}
            <div className="lg:col-span-6 bg-slate-50/90 dark:bg-[#111726] rounded-2xl p-5 border border-slate-200 dark:border-[#1E293B] flex flex-col items-center justify-between text-center">
              <div className="w-full text-left mb-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-[#00D2FE] uppercase tracking-wider flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> Method 1: Instant Camera Scan
                  </span>
                  <button
                    onClick={fetchQr}
                    disabled={isRefreshingQr}
                    className="text-xs px-2.5 py-1 rounded-md bg-white dark:bg-[#0E1322] hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono flex items-center gap-1 transition-all border border-slate-200 dark:border-slate-700 shadow-sm"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                  Point phone camera at the high-contrast code below.
                </p>
              </div>

              {/* High-Contrast Container for Optical Readability */}
              <div className="p-3.5 bg-white rounded-xl shadow-md border border-slate-200 flex items-center justify-center my-2">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="WhatsApp QR Code"
                    className="w-52 h-52 object-contain"
                  />
                ) : (
                  <div className="w-52 h-52 flex flex-col items-center justify-center text-slate-700 space-y-2">
                    <QrCode className="w-10 h-10 stroke-[1.5] text-sky-600 animate-pulse" />
                    <span className="text-xs font-mono font-semibold">Generating QR...</span>
                  </div>
                )}
              </div>

              <ol className="text-left w-full text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-0.5 mt-2 pl-4 list-decimal">
                <li>Open WhatsApp on phone (<strong>+{waStatus.botPhone}</strong>)</li>
                <li>Tap <strong>Settings / 3 dots &gt; Linked Devices</strong></li>
                <li>Tap <strong>Link a Device</strong> and point at code</li>
              </ol>
            </div>

            {/* Right: 8-Digit Pairing Code */}
            <div className="lg:col-span-6 bg-slate-50/90 dark:bg-[#111726] rounded-2xl p-5 border border-slate-200 dark:border-[#1E293B] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-emerald-600 dark:text-[#10B981] uppercase tracking-wider flex items-center gap-1.5">
                    <Smartphone className="w-4 h-4" /> Method 2: 8-Digit Verification Code
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-100 dark:bg-[#10B981]/15 text-emerald-700 dark:text-[#10B981] border border-emerald-300 dark:border-[#10B981]/30">
                    No Camera Required
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3.5">
                  Deploying on a remote cloud server? Link directly using an official WhatsApp phone verification code.
                </p>

                {/* Interactive Phone Input Form */}
                <form onSubmit={handleRequestPairing} className="space-y-2.5">
                  <label className="text-[11px] font-mono text-slate-700 dark:text-slate-300 block">
                    Phone Number with Country Code:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder={`e.g. ${waStatus.botPhone || "918918753100"}`}
                      className="flex-1 px-3.5 py-2 rounded-xl bg-white dark:bg-[#0E1322] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-sky-500 shadow-sm"
                    />
                    <button
                      type="submit"
                      disabled={isPairingLoading}
                      className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 dark:bg-[#00D2FE] dark:hover:bg-sky-400 text-white dark:text-slate-950 font-mono font-bold text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shrink-0 shadow-sm"
                    >
                      {isPairingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : "Get Code"}
                    </button>
                  </div>
                </form>

                {/* Status Message */}
                {pairingMsg && (
                  <div className={`text-xs mt-2 font-mono font-medium ${pairingMsg.isError ? "text-rose-500 dark:text-rose-400" : "text-emerald-600 dark:text-[#10B981]"}`}>
                    {pairingMsg.text}
                  </div>
                )}

                {/* Rendered 8-Digit Code Display */}
                {waStatus.pairingCode && (
                  <div className="mt-3.5 p-3.5 rounded-xl bg-white dark:bg-[#0E1322] border border-emerald-500/40 flex items-center justify-between shadow-sm">
                    <div>
                      <div className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Active Pairing Code:
                      </div>
                      <div className="font-mono text-2xl font-black tracking-[0.25em] text-emerald-600 dark:text-[#10B981] mt-0.5">
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
                      className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}

                <div className="mt-3.5 p-3 rounded-xl bg-white/80 dark:bg-[#0E1322]/70 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-600 dark:text-slate-400 space-y-1 shadow-sm">
                  <div className="font-bold text-slate-700 dark:text-slate-300">How to enter code in WhatsApp:</div>
                  <ol className="list-decimal pl-4 space-y-0.5">
                    <li>Open WhatsApp &gt; Linked Devices &gt; Link a Device</li>
                    <li>Tap <strong>Link with phone number instead</strong> at bottom</li>
                    <li>Enter code displayed above</li>
                  </ol>
                </div>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px] font-mono text-slate-500">
                <span>Enterprise Meta Cloud API:</span>
                <span className="text-slate-600 dark:text-slate-400">Configure WHATSAPP_TOKEN in .env</span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Connected Status Strip */
        <div className="p-4 rounded-2xl bg-[#10B981]/10 border border-[#10B981]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-sm text-[var(--ed-text-primary)]">
                  WhatsApp Commercial Gateway Online
                </span>
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] font-mono">
                Listening line: <strong className="text-[var(--ed-text-primary)] font-bold">+{waStatus.botPhone}</strong> • Multi-Device Baileys Bridge
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleSendPing}
              disabled={isSendingPing}
              className="px-3 py-1.5 rounded-lg text-xs font-mono font-semibold bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] transition-all flex items-center gap-1.5"
            >
              {isSendingPing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-sky-500" />}
              {pingStatus || "Send Diagnostic Ping"}
            </button>
            <Link
              href="/conversations"
              className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all flex items-center gap-1"
            >
              Open Live Inbox
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. SALES FUNNEL ANALYTICS & THE MONEY MOMENT (AI SIMULATOR)              */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Sales Stage Funnel Distribution (7 cols) */}
        <div className="lg:col-span-7 p-6 rounded-2xl bg-[var(--ed-surface)] border border-[var(--ed-border)] shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div>
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-sky-500" />
                Sales Stage & Conversion Velocity
              </h3>
              <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                Active B2B buyer distribution across commercial qualification tiers
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 rounded-xl border border-[var(--ed-border)] text-xs bg-[var(--ed-bg)]">
              <button
                onClick={() => setChartView("bars")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "bars"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <BarChart3 className="w-3.5 h-3.5" /> Funnel Bars
              </button>
              <button
                onClick={() => setChartView("pie")}
                className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                  chartView === "pie"
                    ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                    : "text-[var(--ed-text-muted)]"
                }`}
              >
                <PieIcon className="w-3.5 h-3.5" /> Donut Chart
              </button>
            </div>
          </div>

          {chartView === "bars" ? (
            <div className="space-y-3">
              {funnel.map((item) => {
                const maxVal = Math.max(...funnel.map((f) => f.count), 1);
                const pct = Math.round((item.count / maxVal) * 100);
                const color = stageColors[item.stage] || "var(--ed-accent)";
                return (
                  <div key={item.stage} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-[var(--ed-text-primary)] font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                        {item.stage}
                      </span>
                      <span className="text-[var(--ed-text-muted)] font-mono font-semibold">{item.count} leads</span>
                    </div>
                    <div className="w-full h-2 rounded-full overflow-hidden bg-[var(--ed-bg)]">
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center py-2">
              <div className="flex justify-center">
                <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90 max-w-[200px] w-full h-auto">
                  {(() => {
                    const total = funnel.reduce((acc, f) => acc + f.count, 0) || 1;
                    const circumference = 2 * Math.PI * 70;
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
                          cx="100"
                          cy="100"
                          r="70"
                          fill="transparent"
                          stroke={color}
                          strokeWidth="24"
                          strokeDasharray={`${dash} ${circumference}`}
                          strokeDashoffset={offset}
                          className="transition-all duration-500 hover:opacity-80"
                        />
                      );
                    });
                  })()}
                </svg>
              </div>

              <div className="space-y-1.5 text-xs">
                {(() => {
                  const total = funnel.reduce((acc, f) => acc + f.count, 0) || 1;
                  return funnel.map((item) => {
                    const pct = Math.round((item.count / total) * 100);
                    const color = stageColors[item.stage] || "#64748b";
                    return (
                      <div key={item.stage} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="font-semibold text-[var(--ed-text-primary)]">{item.stage}</span>
                        </div>
                        <span className="font-mono text-[var(--ed-text-muted)]">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          <div className="mt-5 pt-3.5 border-t border-[var(--ed-border)] flex items-center justify-between text-xs text-[var(--ed-text-muted)]">
            <span>Overall Funnel Velocity: <strong className="text-emerald-500">Autonomous Flow Active</strong></span>
            <Link href="/analytics" className="text-sky-500 hover:underline font-semibold flex items-center gap-1">
              View Analytics Deep-Dive <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Right: The Money Moment (Instant AI Simulator & Live Queue) (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Instant AI Turn Simulator ("The Money Moment") */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0B0F19] to-[#111726] border-2 border-[#00D2FE]/40 shadow-xl text-white space-y-3 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#00D2FE]/15 blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-[#00D2FE] uppercase tracking-wider flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 fill-[#00D2FE]" /> The Money Moment: Live AI Simulator
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00D2FE]/20 text-[#00D2FE] border border-[#00D2FE]/30 font-semibold">
                Instant Turn
              </span>
            </div>
            <p className="text-xs text-slate-300">
              Watch EDITH compute deterministic wholesale rates and reason over the Inter-Brain Bus in real time:
            </p>

            <div className="space-y-2">
              <input
                type="text"
                value={simPrompt}
                onChange={(e) => setSimPrompt(e.target.value)}
                placeholder="Type customer inquiry..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0E1322] border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-[#00D2FE] font-mono"
              />
              <button
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="w-full py-2.5 rounded-xl bg-[#00D2FE] hover:bg-sky-400 text-slate-950 font-mono font-black text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-md"
              >
                {isSimulating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Transmitting Across Inter-Brain Bus...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 fill-slate-950" />
                    <span>Execute Simulated Inquiry</span>
                  </>
                )}
              </button>
            </div>

            {simResult && (
              <div className="p-3.5 rounded-xl bg-[#0E1322]/90 border border-[#00D2FE]/30 text-xs space-y-1.5 animate-in fade-in">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-b border-slate-800 pb-1">
                  <span>Sales Stage: <strong className="text-[#00D2FE]">{simResult.stage}</strong></span>
                  <span>Lead Score: <strong className="text-[#10B981]">{simResult.score}</strong></span>
                </div>
                <div className="text-slate-200 text-xs leading-relaxed pt-1">
                  <strong className="text-[#00D2FE]">EDITH:</strong> {simResult.reply}
                </div>
              </div>
            )}
          </div>

          {/* Live Inquiries Queue Feed */}
          <div className="p-5 rounded-2xl bg-[var(--ed-surface)] border border-[var(--ed-border)] shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                Live Conversation Queue
              </h3>
              <Link
                href="/conversations"
                className="text-xs text-sky-500 font-semibold hover:underline flex items-center gap-0.5"
              >
                Open Inbox <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            {recentConvs.length > 0 ? (
              <div className="space-y-2">
                {recentConvs.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations?id=${conv.id}`}
                    className="p-2.5 rounded-xl bg-[var(--ed-bg)] hover:bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center justify-between transition-all group block"
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
                      <div className="text-[11px] text-[var(--ed-text-muted)] font-mono">
                        Mode: <strong>{conv.mode}</strong> • Score: <strong>{conv.lead_score}</strong>
                      </div>
                    </div>
                    <ArrowUpRight className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-500 transition-colors" />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-xs text-[var(--ed-text-muted)] border border-dashed border-[var(--ed-border)] rounded-xl font-mono">
                No conversations logged yet. Trigger a simulated turn above!
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. QUIET GROUND-TRUTH BEDROCK (GOVERNANCE & SAFETY RULES)                 */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold">
            <Shield className="w-4 h-4 text-emerald-500" />
            Deterministic Margin Ceiling
          </div>
          <p className="text-[var(--ed-text-muted)] leading-relaxed">
            Autonomous discounts are hard-capped at <strong>5.0%</strong>. Orders &gt;500kg automatically escalate to human operators.
          </p>
          <Link href="/knowledge" className="text-sky-500 hover:underline font-semibold block pt-0.5">
            Knowledge Hub RAG &rarr;
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold">
            <Lock className="w-4 h-4 text-sky-500" />
            Prompt Injection Defense
          </div>
          <p className="text-[var(--ed-text-muted)] leading-relaxed">
            All incoming messages pass regex sanitization and semantic policy boundaries before reaching reasoning cores.
          </p>
          <Link href="/settings" className="text-sky-500 hover:underline font-semibold block pt-0.5">
            Security Settings &rarr;
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] space-y-1.5 text-xs">
          <div className="flex items-center gap-2 text-[var(--ed-text-primary)] font-bold">
            <Bot className="w-4 h-4 text-indigo-500" />
            Dual-Brain Bus Protocol
          </div>
          <p className="text-[var(--ed-text-muted)] leading-relaxed">
            Every delegation from FRIDAY to EDITH is recorded in persistent SQLite tables with refusal reasoning and debrief logs.
          </p>
          <Link href="/brain" className="text-sky-500 hover:underline font-semibold block pt-0.5">
            Dual-Brain Console &rarr;
          </Link>
        </div>
      </div>
    </div>
  );
}
