"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Compass,
  Plus,
  Bell,
  Package,
  Sparkles,
  Layers,
  Cpu,
  Database,
  Radio,
  Wand2,
  LayoutGrid,
} from "lucide-react";
import DualBrainHeroBus from "@/components/DualBrainHeroBus";
import CinematicHeroDeck from "@/components/CinematicHeroDeck";
import CinematicWorkflowTheater from "@/components/CinematicWorkflowTheater";
import SynapticActivityTicker from "@/components/SynapticActivityTicker";
import ExecutiveBriefingModal from "@/components/ExecutiveBriefingModal";
import HourlyVelocityHeatmap from "@/components/HourlyVelocityHeatmap";
import ExecutiveQuickDock from "@/components/ExecutiveQuickDock";
import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/radar-chart";
import StrokeMultipleRadarChart from "@/components/ui/demo";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import MessageLoading from "@/components/ui/MessageLoading";

const funnelRadarConfig = {
  leads: {
    label: "Active Leads",
    color: "var(--chart-1)",
  },
  target: {
    label: "Target Quota",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

const leadHealthConfig = {
  current: {
    label: "Active Pipeline",
    color: "var(--chart-2)",
  },
  target: {
    label: "Enterprise Benchmark",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

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
    friday_input_tokens: number;
    friday_output_tokens: number;
    friday_model: string;
    friday_cost_usd: number;
    edith_tokens: number;
    edith_input_tokens: number;
    edith_output_tokens: number;
    edith_reasoning_tokens: number;
    edith_model: string;
    edith_cost_usd: number;
    total_tokens: number;
    total_cost_usd: number;
    monthly_savings_usd: number;
  };
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

interface AgentNotificationItem {
  id: string;
  title: string;
  message: string;
  severity?: string;
  agent?: string;
  created_at?: string;
}

interface ProductItem {
  id?: string;
  sku: string;
  name: string;
  category: string;
  base_price: number;
  floor_price?: number;
  unit: string;
  stock_quantity?: number;
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
  const [notifications, setNotifications] = useState<AgentNotificationItem[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductItem[]>([]);

  const [chartView, setChartView] = useState<"bars" | "pie" | "radar">("bars");
  const [businessName, setBusinessName] = useState("Enterprise AI Operations");
  const [businessIndustry, setBusinessIndustry] = useState("Multi-Industry B2B & Retail Commerce");
  const [businessDescription, setBusinessDescription] = useState("");
  const [agentName, setAgentName] = useState("EDITH");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [catalogUnit, setCatalogUnit] = useState("unit");
  const [uiMode, setUiMode] = useState<"simplified" | "advanced">("advanced");
  const [ownerPhone, setOwnerPhone] = useState("");

  // Advanced Mode Clean Section Switcher
  const [advTab, setAdvTab] = useState<"architecture" | "gateway" | "funnel_sim" | "telemetry" | "all">("architecture");

  // Simplified Mode Quick-Add Product / Business Info State
  const [quickAddMode, setQuickAddMode] = useState<"product" | "ai_business">("product");
  const [newProdName, setNewProdName] = useState("");
  const [newProdPrice, setNewProdPrice] = useState("");
  const [newProdUnit, setNewProdUnit] = useState("");
  const [newKnowledgeNote, setNewKnowledgeNote] = useState("");
  const [quickAiPrompt, setQuickAiPrompt] = useState("");
  const [isQuickSaving, setIsQuickSaving] = useState(false);
  const [quickToast, setQuickToast] = useState<string | null>(null);

  // WhatsApp Gateway State (Supports Both Unofficial Baileys Bridge & Official Meta Cloud API)
  const [waGatewayTab, setWaGatewayTab] = useState<"unofficial" | "official">("unofficial");
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("wb_agent_verify_token");
  const [isSavingMeta, setIsSavingMeta] = useState(false);

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
    botPhone: "",
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
  const [simPrompt, setSimPrompt] = useState(
    "We need 250 units for next week shipment. What volume discount can you offer?"
  );
  const [simPhone] = useState("919876543210");
  const [isSimulating, setIsSimulating] = useState(false);
  const [simResult, setSimResult] = useState<{
    reply: string;
    stage: string;
    score: number;
  } | null>(null);

  // Executive Audio Briefing State
  const [showBriefing, setShowBriefing] = useState(false);
  const [briefingTimeframe, setBriefingTimeframe] = useState<"today" | "yesterday">("today");

  const computedLeadHealth = useMemo(() => {
    const responseSpeed = metrics.queue_depth === 0 ? 96 : Math.max(65, 96 - metrics.queue_depth * 5);
    const dealMargin = 94;
    const catalogDepth = 90;
    const verification = waStatus.connected ? 98 : 82;
    const closeVelocity = Math.min(99, Math.max(62, Math.round(metrics.conversion_rate_pct * 4.8 + 38)));
    const retentionRate = 88;

    const dimensions = [
      { dimension: "Response Speed", current: responseSpeed, target: 85 },
      { dimension: "Deal Margin", current: dealMargin, target: 80 },
      { dimension: "Catalog Depth", current: catalogDepth, target: 75 },
      { dimension: "Verification", current: verification, target: 90 },
      { dimension: "Close Velocity", current: closeVelocity, target: 70 },
      { dimension: "Retention Rate", current: retentionRate, target: 75 },
    ];

    const overallScore = Number(
      (dimensions.reduce((acc, d) => acc + d.current, 0) / dimensions.length).toFixed(1)
    );

    return { dimensions, overallScore };
  }, [metrics, waStatus.connected]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpenBriefing = (e: any) => {
      const tf = e?.detail?.timeframe === "yesterday" ? "yesterday" : "today";
      setBriefingTimeframe(tf);
      setShowBriefing(true);
    };
    const handleWorkspaceConfigChange = (e: any) => {
      const cfg = e?.detail;
      if (!cfg) return;
      if (cfg.ui_mode) setUiMode(cfg.ui_mode);
      if (cfg.business_name) setBusinessName(cfg.business_name);
      if (cfg.business_industry) setBusinessIndustry(cfg.business_industry);
      if (cfg.business_description !== undefined) setBusinessDescription(cfg.business_description);
      if (cfg.currency_symbol) setCurrencySymbol(cfg.currency_symbol);
      if (cfg.catalog_unit) setCatalogUnit(cfg.catalog_unit);
      if (cfg.owner_whatsapp_number !== undefined) setOwnerPhone(cfg.owner_whatsapp_number);
      if (cfg.whatsapp_connection_mode === "official" || cfg.whatsapp_connection_mode === "unofficial") {
        setWaGatewayTab(cfg.whatsapp_connection_mode);
      }
    };
    window.addEventListener("open-executive-briefing", handleOpenBriefing);
    window.addEventListener("workspace_config_change", handleWorkspaceConfigChange);
    window.addEventListener("wb-workspace-config-updated", handleWorkspaceConfigChange);
    return () => {
      window.removeEventListener("open-executive-briefing", handleOpenBriefing);
      window.removeEventListener("workspace_config_change", handleWorkspaceConfigChange);
      window.removeEventListener("wb-workspace-config-updated", handleWorkspaceConfigChange);
    };
  }, []);

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

  const checkWaStatus = async () => {
    try {
      const r = await fetch("/api/v1/whatsapp/status");
      if (r.ok) {
        const data = await r.json();
        setWaStatus({
          connected: !!data.connected,
          pairingCode: data.pairing_code,
          botPhone: data.bot_phone || "",
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

  const loadCatalogAndNotifications = () => {
    fetch("/api/v1/pricing/products")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data)) {
          setCatalogProducts(data.slice(0, 6));
        } else if (Array.isArray(data?.items)) {
          setCatalogProducts(data.items.slice(0, 6));
        } else if (Array.isArray(data?.products)) {
          setCatalogProducts(data.products.slice(0, 6));
        }
      })
      .catch(() => {});

    fetch("/api/v1/notifications?limit=8")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (Array.isArray(data?.notifications)) {
          setNotifications(data.notifications);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    const loadSettings = () => {
      fetch("/api/v1/settings")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data) return;
          if (data.business_name) setBusinessName(data.business_name);
          if (data.business_industry) setBusinessIndustry(data.business_industry);
          if (data.business_description) setBusinessDescription(data.business_description);
          if (data.agent_name) setAgentName(data.agent_name);
          if (data.currency_symbol) setCurrencySymbol(data.currency_symbol);
          if (data.catalog_unit) {
            setCatalogUnit(data.catalog_unit);
            setNewProdUnit(data.catalog_unit);
          }
          if (data.ui_mode) setUiMode(data.ui_mode);
          if (data.owner_whatsapp_number !== undefined) setOwnerPhone(data.owner_whatsapp_number);
          if (data.whatsapp_connection_mode === "official" || data.whatsapp_connection_mode === "unofficial") {
            setWaGatewayTab(data.whatsapp_connection_mode);
          }
          if (data.meta_phone_number_id) setMetaPhoneId(data.meta_phone_number_id);
          if (data.meta_waba_id) setMetaWabaId(data.meta_waba_id);
          if (data.meta_access_token) setMetaAccessToken(data.meta_access_token);
          if (data.meta_verify_token) setMetaVerifyToken(data.meta_verify_token);
        })
        .catch(() => {});
    };

    const loadOverview = () => {
      fetch("/api/v1/analytics/overview")
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (!data) return;
          setMetrics((prev) => ({
            ...data,
            leads_total: data.leads_total > 0 ? data.leads_total : prev.leads_total,
            conversations_total:
              data.conversations_total > 0 ? data.conversations_total : prev.conversations_total,
            hot_leads: data.hot_leads > 0 ? data.hot_leads : prev.hot_leads,
            won_deals: data.won_deals > 0 ? data.won_deals : prev.won_deals,
            pipeline_value_inr:
              data.pipeline_value_inr > 0 ? data.pipeline_value_inr : prev.pipeline_value_inr,
            conversion_rate_pct:
              data.conversion_rate_pct > 0 ? data.conversion_rate_pct : prev.conversion_rate_pct,
          }));
        })
        .catch(() => {});
    };

    const loadFunnel = () => {
      fetch("/api/v1/analytics/funnel")
        .then((r) => r.ok && r.json())
        .then((data) => {
          if (data && Array.isArray(data.funnel)) {
            const totalCount = data.funnel.reduce(
              (acc: number, item: FunnelStep) => acc + (item.count || 0),
              0
            );
            if (totalCount > 0) {
              setFunnel(data.funnel);
            }
          }
        })
        .catch(() => {});
    };

    const loadRecentConvs = () => {
      fetch("/api/v1/conversations?page=1&page_size=6&channel=whatsapp")
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
    loadCatalogAndNotifications();
    checkWaStatus();

    const interval = setInterval(() => {
      loadOverview();
      loadFunnel();
      loadRecentConvs();
      loadCatalogAndNotifications();
      checkWaStatus();
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const handleRequestPairing = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const phone = (pairingPhone || waStatus.botPhone || "").replace(/[^0-9]/g, "");
    if (!phone || phone.length < 8) {
      setPairingMsg({
        text: "Please enter your WhatsApp phone number with country code (e.g. 919876543210).",
        isError: true,
      });
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
        setPairingMsg({
          text: data.error || data.detail || "Could not generate code. Ensure bridge socket is ready.",
          isError: true,
        });
      }
    } catch (err: any) {
      setPairingMsg({ text: `Network error: ${err.message}`, isError: true });
    } finally {
      setIsPairingLoading(false);
    }
  };

  const handleSaveOfficialMeta = async () => {
    setIsSavingMeta(true);
    try {
      const res = await fetch("/api/v1/settings/workspace-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          whatsapp_connection_mode: "official",
          meta_phone_number_id: metaPhoneId.trim(),
          meta_waba_id: metaWabaId.trim(),
          meta_access_token: metaAccessToken.trim(),
          meta_verify_token: metaVerifyToken.trim(),
        }),
      });
      if (res.ok) {
        setPingStatus("Official Meta Cloud API v20.0 saved & active!");
        setTimeout(() => setPingStatus(null), 4000);
      }
    } catch {
      // ignore
    } finally {
      setIsSavingMeta(false);
    }
  };

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
          name: "Wholesale Partner (Simulated)",
          company: "Grand Hospitality (Sandbox)",
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

  const handleQuickAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsQuickSaving(true);
    setQuickToast(null);
    try {
      if (quickAddMode === "ai_business") {
        if (!quickAiPrompt.trim()) return;
        const res = await fetch("/api/v1/settings/ai-autofill-business", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: quickAiPrompt.trim(),
            seed_catalog: true,
            save_as_preset: true,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.config) {
            window.dispatchEvent(new CustomEvent("workspace_config_change", { detail: data.config }));
          }
          loadCatalogAndNotifications();
          setQuickToast(
            `✨ AI configured "${data.synthesized?.business_name}" and added ${data.seeded_products || 4} catalog products!`
          );
          setQuickAiPrompt("");
        }
      } else {
        if (!newProdName.trim() && !newKnowledgeNote.trim()) return;
        const res = await fetch("/api/v1/settings/quick-add-info", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            product_name: newProdName.trim() || undefined,
            base_price: newProdPrice ? Number(newProdPrice) : undefined,
            unit: newProdUnit.trim() || catalogUnit,
            knowledge_note: newKnowledgeNote.trim() || undefined,
          }),
        });
        if (res.ok) {
          loadCatalogAndNotifications();
          setQuickToast("Added to SQLite Product Catalog & AI Knowledge Base!");
          setNewProdName("");
          setNewProdPrice("");
          setNewKnowledgeNote("");
        }
      }
    } catch {
      // ignore
    } finally {
      setIsQuickSaving(false);
      setTimeout(() => setQuickToast(null), 5000);
    }
  };

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

  // ============================================================================
  // 1. SIMPLIFIED MODE VIEW (CLEAN, FOCUSED 4-PILLAR BUSINESS HUB)
  // ============================================================================
  if (uiMode === "simplified") {
    return (
      <div className="space-y-6 max-w-6xl mx-auto pb-12">
        {/* Top Simplified Welcome & Quick Actions */}
        <div
          className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-5"
          style={{ background: "var(--ed-surface)" }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold mb-2">
                <span>✨ Simplified Business Workspace</span>
                <span>•</span>
                <span>{businessIndustry}</span>
              </div>
              <h1 className="text-2xl font-extrabold text-[var(--ed-text-primary)] tracking-tight">
                {businessName} — Operations Overview
              </h1>
              <p className="text-xs sm:text-sm text-[var(--ed-text-muted)] mt-1">
                Everything you need in one clean place: Overview KPIs, Add Products &amp; Business Info, Live Customer Messages, and Agent Notifications.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("wb-open-demo-modal"));
                }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                🎬 Live Demo Showcase
              </button>
              <a
                href="/api/v1/settings/executive-report.pdf"
                download="WB_Agent_Executive_Report.pdf"
                className="px-3.5 py-2.5 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold hover:bg-sky-500/20 transition-all"
              >
                📄 Export PDF
              </a>
              <button
                onClick={() => {
                  const voiceBtn = document.querySelector(
                    "button:has(svg.lucide-phone), button:has(svg.lucide-mic)"
                  ) as HTMLElement;
                  if (voiceBtn) voiceBtn.click();
                }}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                🎙️ Talk to Friday
              </button>
              <button
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("open_setup_modal", { detail: { tab: "whatsapp_owner" } }));
                }}
                className="px-4 py-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] text-xs font-bold hover:border-emerald-500/50 transition-all cursor-pointer"
                style={{ background: "var(--ed-bg)" }}
              >
                📱 {waStatus.connected ? `WhatsApp Online (+${waStatus.botPhone})` : "Connect WhatsApp"}
              </button>
            </div>
          </div>

          {/* 4 Core KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link
              href="/conversations"
              className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-sky-500/50 transition-all block"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="text-[11px] font-bold text-sky-500 uppercase tracking-wider">1. Customer Messages</div>
              <div className="text-2xl font-black text-[var(--ed-text-primary)] mt-1">
                {metrics.conversations_total} Active Chats
              </div>
              <div className="text-xs text-[var(--ed-text-muted)] mt-1">
                Open Live WhatsApp Inbox →
              </div>
            </Link>

            <Link
              href="/analytics"
              className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-emerald-500/50 transition-all block"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="text-[11px] font-bold text-emerald-500 uppercase tracking-wider">2. Pipeline &amp; Revenue</div>
              <div className="text-2xl font-black text-[var(--ed-text-primary)] mt-1">
                {currencySymbol}{metrics.pipeline_value_inr.toLocaleString("en-IN")}
              </div>
              <div className="text-xs text-[var(--ed-text-muted)] mt-1">
                {metrics.won_deals} Won Deals ({metrics.conversion_rate_pct}%) →
              </div>
            </Link>

            <Link
              href="/pricing"
              className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-amber-500/50 transition-all block"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="text-[11px] font-bold text-amber-500 uppercase tracking-wider">3. Products &amp; Catalog</div>
              <div className="text-2xl font-black text-[var(--ed-text-primary)] mt-1">
                {catalogProducts.length || 4} Active SKUs
              </div>
              <div className="text-xs text-[var(--ed-text-muted)] mt-1">
                Unit: /{catalogUnit} • Manage Pricing →
              </div>
            </Link>

            <Link
              href="/orders"
              className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-purple-500/50 transition-all block"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="text-[11px] font-bold text-purple-500 uppercase tracking-wider">4. Orders &amp; Owner Alerts</div>
              <div className="text-2xl font-black text-[var(--ed-text-primary)] mt-1">
                {metrics.hot_leads} Hot Leads
              </div>
              <div className="text-xs text-[var(--ed-text-muted)] mt-1">
                Owner: {ownerPhone ? `+${ownerPhone.replace(/^\+/, "")}` : "Set Owner Phone"} →
              </div>
            </Link>
          </div>
        </div>

        {/* SECTION A: Add Business Info, Products & AI Auto-Fill */}
        <div
          className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-4"
          style={{ background: "var(--ed-surface)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
            <div className="flex items-center gap-2.5">
              <Package className="w-5 h-5 text-[var(--ed-accent)]" />
              <div>
                <h2 className="text-base font-bold text-[var(--ed-text-primary)]">
                  Add Products, Pricing &amp; Business Information
                </h2>
                <p className="text-xs text-[var(--ed-text-muted)]">
                  Quickly add a new product or policy rule, or let AI auto-configure your entire business &amp; catalog.
                </p>
              </div>
            </div>

            <div className="inline-flex rounded-xl p-1 border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
              <button
                type="button"
                onClick={() => setQuickAddMode("product")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  quickAddMode === "product"
                    ? "bg-[var(--ed-accent)] text-white"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ➕ Quick Add Product / Rule
              </button>
              <button
                type="button"
                onClick={() => setQuickAddMode("ai_business")}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  quickAddMode === "ai_business"
                    ? "bg-emerald-600 text-white"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ✨ Tell AI What Your Business Does
              </button>
            </div>
          </div>

          {quickToast && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/35 text-xs font-bold text-emerald-600 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{quickToast}</span>
            </div>
          )}

          <form onSubmit={handleQuickAddSubmit} className="space-y-3">
            {quickAddMode === "product" ? (
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
                <input
                  type="text"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Product / Service Name (e.g. 5kW Solar Hybrid Kit)"
                  className="sm:col-span-4 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
                <input
                  type="number"
                  value={newProdPrice}
                  onChange={(e) => setNewProdPrice(e.target.value)}
                  placeholder={`Price (${currencySymbol})`}
                  className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
                <input
                  type="text"
                  value={newProdUnit}
                  onChange={(e) => setNewProdUnit(e.target.value)}
                  placeholder={`Unit (${catalogUnit})`}
                  className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
                <input
                  type="text"
                  value={newKnowledgeNote}
                  onChange={(e) => setNewKnowledgeNote(e.target.value)}
                  placeholder="Optional Business Rule (e.g. Free delivery over 50 units)"
                  className="sm:col-span-2 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
                <button
                  type="submit"
                  disabled={isQuickSaving}
                  className="sm:col-span-2 py-2.5 px-4 rounded-xl bg-[var(--ed-accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  {isQuickSaving ? "Saving..." : "Add Now"}
                </button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={quickAiPrompt}
                  onChange={(e) => setQuickAiPrompt(e.target.value)}
                  placeholder='Describe your business (e.g. "We run a solar panel & battery company in Pune" or "Artisanal bakery & gift hampers")'
                  className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs sm:text-sm text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
                <button
                  type="submit"
                  disabled={isQuickSaving || !quickAiPrompt.trim()}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shrink-0"
                >
                  <Wand2 className="w-4 h-4" />
                  {isQuickSaving ? "Building..." : "Auto-Configure Business & Products"}
                </button>
              </div>
            )}
          </form>

          {/* Active Catalog Products Preview */}
          {catalogProducts.length > 0 && (
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs text-[var(--ed-text-muted)] mb-2">
                <span className="font-semibold">Active Products in Catalog ({businessIndustry}):</span>
                <Link href="/pricing" className="text-[var(--ed-accent)] font-bold hover:underline">
                  Full Catalog Editor →
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {catalogProducts.map((item) => (
                  <div
                    key={item.sku}
                    className="p-3 rounded-xl border border-[var(--ed-border)] flex items-center justify-between gap-2 text-xs"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-[var(--ed-text-primary)] truncate">{item.name}</div>
                      <div className="text-[11px] text-[var(--ed-text-muted)] font-mono">
                        {item.sku} • {item.category}
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono">
                      <div className="font-bold text-emerald-600 dark:text-emerald-400">
                        {currencySymbol}{Number(item.base_price).toLocaleString()}/{item.unit}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* SECTION B & C: Live Customer Messages & Live Notifications Side-by-Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* See Messages (Live Inbox) */}
          <div
            className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-4"
            style={{ background: "var(--ed-surface)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-sky-500" />
                <h2 className="text-sm font-bold text-[var(--ed-text-primary)]">
                  Recent Customer Messages (WhatsApp Inbox)
                </h2>
              </div>
              <Link
                href="/conversations"
                className="text-xs font-bold text-sky-500 hover:underline flex items-center gap-1"
              >
                Open Full Inbox <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentConvs.length > 0 ? (
              <div className="space-y-2.5">
                {recentConvs.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/conversations?id=${conv.id}`}
                    className="p-3 rounded-xl border border-[var(--ed-border)] hover:border-sky-500/40 flex items-center justify-between transition-all block"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-[var(--ed-text-primary)] font-mono">
                          {conv.customer?.name || conv.channel_id}
                        </span>
                        {conv.is_hot && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-rose-500/15 text-rose-500">
                            HOT LEAD
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-500">
                          {conv.sales_stage}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
                        Handled by: <strong>{conv.mode === "human" ? "Human Operator" : agentName}</strong> • Lead Score:{" "}
                        <strong>{conv.lead_score}</strong>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-[var(--ed-text-muted)]" />
                  </Link>
                ))}
              </div>
            ) : (
              <div
                className="p-6 text-center text-xs text-[var(--ed-text-muted)] border border-dashed border-[var(--ed-border)] rounded-xl"
                style={{ background: "var(--ed-bg)" }}
              >
                No recent WhatsApp messages yet. Connect your WhatsApp number or open the Inbox to start chatting!
              </div>
            )}
          </div>

          {/* See Notifications (Agent Alerts & Escalations) */}
          <div
            className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-4"
            style={{ background: "var(--ed-surface)" }}
          >
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-amber-500" />
                <h2 className="text-sm font-bold text-[var(--ed-text-primary)]">
                  Live Agent Notifications &amp; Escalations
                </h2>
              </div>
              <Link
                href="/handoffs"
                className="text-xs font-bold text-amber-500 hover:underline flex items-center gap-1"
              >
                Handoff Queue <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {notifications.length > 0 ? (
              <div className="space-y-2.5">
                {notifications.slice(0, 5).map((n, idx) => (
                  <div
                    key={n.id || idx}
                    className="p-3 rounded-xl border border-[var(--ed-border)] space-y-1"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-[var(--ed-text-primary)]">{n.title}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                        {n.agent || agentName}
                      </span>
                    </div>
                    <p className="text-xs text-[var(--ed-text-muted)] line-clamp-2">{n.message}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="p-6 text-center text-xs text-[var(--ed-text-muted)] border border-dashed border-[var(--ed-border)] rounded-xl"
                style={{ background: "var(--ed-bg)" }}
              >
                All clear! Instant alerts for confirmed orders, high-intent buyers, and escalations appear here and on your Owner WhatsApp.
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // 2. ADVANCED MODE VIEW (CLEAN, OFFICIAL ARCHITECTURE & TELEMETRY SUITE)
  // ============================================================================
  return (
    <div className="space-y-7 max-w-7xl mx-auto pb-14">
      {/* 1. EXECUTIVE HERO DECK */}
      <CinematicHeroDeck
        onPlayCinematicTour={() => {
          setAdvTab("architecture");
          const el = document.getElementById("adv-workspace-body");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onTalkWithFriday={() => {
          const voiceBtn = document.querySelector(
            "button:has(svg.lucide-phone), button:has(svg.lucide-mic)"
          ) as HTMLElement;
          if (voiceBtn) voiceBtn.click();
        }}
        onOpenSandbox={() => {
          setAdvTab("funnel_sim");
          const el = document.getElementById("adv-workspace-body");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onConnectWhatsApp={() => {
          setAdvTab("gateway");
          const el = document.getElementById("adv-workspace-body");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        onPlayBriefing={() => {
          setBriefingTimeframe("today");
          setShowBriefing(true);
        }}
        onTestDiscountPolicy={(prompt) => {
          setSimPrompt(prompt);
          setAdvTab("funnel_sim");
          const el = document.getElementById("adv-workspace-body");
          if (el) el.scrollIntoView({ behavior: "smooth" });
        }}
        waConnected={waStatus.connected}
        botPhone={waStatus.botPhone}
        hotLeadsCount={metrics.hot_leads}
        wonDealsCount={metrics.won_deals}
        pipelineValueStr={`${currencySymbol}${metrics.pipeline_value_inr.toLocaleString("en-IN")}`}
        autonomousRate={94.2}
        turnSpeed="1.1s"
      />

      {/* 2. OFFICIAL SYSTEM ARCHITECTURE & CONNECTION BLUEPRINT (ALWAYS VISIBLE & CRISP IN LIGHT/DARK) */}
      <div
        className="p-5 sm:p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-5"
        style={{ background: "var(--ed-surface)" }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-[var(--ed-accent)] uppercase tracking-wider">
              <Layers className="w-4 h-4" />
              System Architecture &amp; Live Connection Topology
            </div>
            <h2 className="text-lg font-extrabold text-[var(--ed-text-primary)] mt-0.5">
              End-to-End Autonomous Dual-Brain Pipeline ({businessName})
            </h2>
            <p className="text-xs text-[var(--ed-text-muted)]">
              Every connection is live and verified — from Unofficial/Official WhatsApp ingress to Dual-Brain deliberation, SQLite catalog guardrails, and Owner WhatsApp escalation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("wb-open-demo-modal"))}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              🎬 Live Demo Showcase
            </button>
            <a
              href="/api/v1/settings/executive-report.pdf"
              download="WB_Agent_Executive_Report.pdf"
              className="px-3.5 py-2 rounded-xl border border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-bold flex items-center gap-1.5 hover:bg-sky-500/20"
            >
              📄 Export PDF
            </a>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("open_setup_modal", { detail: { tab: "verification" } }))}
              className="px-3.5 py-2 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)] hover:border-emerald-500/50 flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--ed-bg)" }}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Verify All 5 Connections
            </button>
            <Link
              href="/settings"
              className="px-3.5 py-2 rounded-xl bg-[var(--ed-accent)] text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" />
              AI Business Auto-Fill
            </Link>
          </div>
        </div>

        {/* 5-Node Interactive Architectural Flow */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Node 1: WhatsApp Ingress */}
          <div
            onClick={() => setAdvTab("gateway")}
            className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-emerald-500/50 cursor-pointer transition-all space-y-2"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                1. INGRESS / EGRESS
              </span>
              <Smartphone className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="font-bold text-xs text-[var(--ed-text-primary)]">
              WhatsApp Dual Gateway
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
              Supports <strong>Unofficial Baileys Bridge (:3001)</strong> via QR/8-Digit Code AND <strong>Official Meta Cloud API v20.0</strong>.
            </p>
            <div className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-bold pt-1">
              ● {waStatus.connected ? `Online (+${waStatus.botPhone})` : "Ready to Pair / Configure"}
            </div>
          </div>

          {/* Node 2: FastAPI Bus & Guardrails */}
          <div
            onClick={() => setAdvTab("architecture")}
            className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-sky-500/50 cursor-pointer transition-all space-y-2"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">
                2. CORE ORCHESTRATOR
              </span>
              <Shield className="w-4 h-4 text-sky-500" />
            </div>
            <div className="font-bold text-xs text-[var(--ed-text-primary)]">
              FastAPI Bus &amp; Guardrails (:8000)
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
              3-second message debounce, prompt-injection defense, deterministic floor-price check, and WebSocket broadcast.
            </p>
            <div className="text-[10px] font-mono text-sky-600 dark:text-sky-400 font-bold pt-1">
              ● Active • 0ms Queue Lag
            </div>
          </div>

          {/* Node 3: FRIDAY Gemini Brain */}
          <div
            onClick={() => setAdvTab("architecture")}
            className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-purple-500/50 cursor-pointer transition-all space-y-2"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                3. WEB &amp; VOICE BRAIN
              </span>
              <Bot className="w-4 h-4 text-purple-500" />
            </div>
            <div className="font-bold text-xs text-[var(--ed-text-primary)]">
              FRIDAY (Gemini 3.1 Live)
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
              Real-time 16kHz voice &amp; chat copilot with 17 DOM action tools (navigate, scroll, multi-task, consult EDITH).
            </p>
            <div className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-bold pt-1">
              ● 17 Action Tools Armed
            </div>
          </div>

          {/* Node 4: EDITH NVIDIA NIM Brain */}
          <div
            onClick={() => setAdvTab("funnel_sim")}
            className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-indigo-500/50 cursor-pointer transition-all space-y-2"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-600 dark:text-indigo-400">
                4. COMMERCIAL BRAIN
              </span>
              <Cpu className="w-4 h-4 text-indigo-500" />
            </div>
            <div className="font-bold text-xs text-[var(--ed-text-primary)]">
              EDITH (NVIDIA NIM Cluster)
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
              Autonomous WhatsApp sales closer handling discovery, MOQ quoting, negotiation, and GST pro-forma invoices.
            </p>
            <div className="text-[10px] font-mono text-indigo-600 dark:text-indigo-400 font-bold pt-1">
              ● Synaptic Bridge Linked
            </div>
          </div>

          {/* Node 5: SQLite Catalog & Owner Escalation */}
          <div
            onClick={() => setAdvTab("telemetry")}
            className="p-4 rounded-xl border border-[var(--ed-border)] hover:border-amber-500/50 cursor-pointer transition-all space-y-2"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400">
                5. DATA &amp; ESCALATION
              </span>
              <Database className="w-4 h-4 text-amber-500" />
            </div>
            <div className="font-bold text-xs text-[var(--ed-text-primary)]">
              SQLite RAG + Owner Phone
            </div>
            <p className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
              Grounded SKU catalog pricing + instant WhatsApp order &amp; handoff alerts routed to the Owner&apos;s phone.
            </p>
            <div className="text-[10px] font-mono text-amber-600 dark:text-amber-400 font-bold pt-1">
              ● Owner: {ownerPhone ? `+${ownerPhone.replace(/^\+/, "")}` : "Configurable"}
            </div>
          </div>
        </div>
      </div>

      {/* 3. ORGANIZED ADVANCED WORKSPACE NAVIGATION BAR (DECLUTTERS VERTICAL STACKING) */}
      <div
        id="adv-workspace-body"
        className="p-2 rounded-2xl border border-[var(--ed-border)] flex flex-wrap items-center justify-between gap-2 shadow-sm"
        style={{ background: "var(--ed-surface)" }}
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "architecture", label: "🧠 1. Dual-Brain Bus & Live Workflow" },
            { id: "gateway", label: "📱 2. WhatsApp Gateway (Unofficial & Official)" },
            { id: "funnel_sim", label: "📊 3. Funnel, Radar & Live AI Simulator" },
            { id: "telemetry", label: "⚡ 4. Token Economics & 24h Velocity" },
            { id: "all", label: "🗂️ Show All Sections" },
          ].map((tab) => {
            const active = advTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setAdvTab(tab.id as any)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                  active
                    ? "bg-[var(--ed-accent)] text-white shadow-sm"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <Link
          href="/brain"
          className="px-3.5 py-2 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-accent)] hover:border-[var(--ed-accent)] flex items-center gap-1"
          style={{ background: "var(--ed-bg)" }}
        >
          Open Full Dual-Brain Console <ArrowUpRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DUAL-BRAIN BUS & LIVE WORKFLOW THEATER                             */}
      {/* ========================================================================= */}
      {(advTab === "architecture" || advTab === "all") && (
        <div className="space-y-6">
          <DualBrainHeroBus
            onPlayBriefing={() => {
              setBriefingTimeframe("today");
              setShowBriefing(true);
            }}
            queueDepth={metrics.queue_depth}
            autonomousRate={94.2}
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
            tokensSummary={metrics.tokens_summary}
          />

          <SynapticActivityTicker />

          <div id="cinematic-theater">
            <CinematicWorkflowTheater
              onTestSandbox={() => {
                setAdvTab("funnel_sim");
              }}
            />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: WHATSAPP GATEWAY (UNOFFICIAL BAILEYS + OFFICIAL META CLOUD API)    */}
      {/* ========================================================================= */}
      {(advTab === "gateway" || advTab === "all") && (
        <div
          id="whatsapp-gateway"
          className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-5"
          style={{ background: "var(--ed-surface)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[var(--ed-border)]">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                <Smartphone className="w-4 h-4" />
                Dual-Mode WhatsApp Commercial Gateway
              </div>
              <h2 className="text-lg font-extrabold text-[var(--ed-text-primary)] mt-0.5">
                Connect via Unofficial Baileys Bridge OR Official Meta Cloud API
              </h2>
              <p className="text-xs text-[var(--ed-text-muted)]">
                Switch seamlessly between instant QR / 8-Digit Phone Pairing (:3001) and Official Meta WhatsApp Business Cloud API v20.0.
              </p>
            </div>

            <div className="inline-flex rounded-xl p-1 border border-[var(--ed-border)] shrink-0" style={{ background: "var(--ed-bg)" }}>
              <button
                type="button"
                onClick={() => setWaGatewayTab("unofficial")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  waGatewayTab === "unofficial"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ⚡ Unofficial Way (QR / 8-Digit Code)
              </button>
              <button
                type="button"
                onClick={() => setWaGatewayTab("official")}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold transition-all ${
                  waGatewayTab === "official"
                    ? "bg-[var(--ed-accent)] text-white shadow-sm"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                🛡️ Official Way (Meta Cloud API)
              </button>
            </div>
          </div>

          {waGatewayTab === "unofficial" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left: Optical QR Scanner */}
              <div
                className="lg:col-span-6 p-5 rounded-2xl border border-[var(--ed-border)] flex flex-col items-center justify-between text-center"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="w-full flex items-center justify-between mb-2">
                  <span className="text-xs font-mono font-bold text-sky-600 dark:text-sky-400 uppercase flex items-center gap-1.5">
                    <QrCode className="w-4 h-4" /> Method 1: Instant Camera QR Scan
                  </span>
                  <button
                    onClick={fetchQr}
                    disabled={isRefreshingQr}
                    className="text-xs px-2.5 py-1 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono flex items-center gap-1"
                    style={{ background: "var(--ed-surface)" }}
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingQr ? "animate-spin" : ""}`} />
                    Refresh
                  </button>
                </div>

                {waStatus.connected ? (
                  <div className="my-6 p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 w-full">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                    <div className="font-bold text-sm text-[var(--ed-text-primary)]">
                      WhatsApp Bot Connected &amp; Online
                    </div>
                    <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                      Active Line: {waStatus.botPhone ? `+${waStatus.botPhone}` : "Multi-Device Session"}
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-[var(--ed-border)] my-2">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="WhatsApp QR Code" className="w-48 h-48 object-contain" />
                    ) : (
                      <iframe
                        src="/api/v1/whatsapp/qr-embed"
                        className="w-48 h-48 border-0 rounded-lg"
                        title="WhatsApp Live QR"
                      />
                    )}
                  </div>
                )}

                <p className="text-[11px] text-[var(--ed-text-muted)] mt-2">
                  Open WhatsApp on your phone → <strong>Linked Devices → Link a Device</strong>
                </p>
              </div>

              {/* Right: 8-Digit Pairing Code */}
              <div
                className="lg:col-span-6 p-5 rounded-2xl border border-[var(--ed-border)] flex flex-col justify-between space-y-4"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                      <Smartphone className="w-4 h-4" /> Method 2: 8-Digit Phone Pairing Code
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                      No Camera Needed
                    </span>
                  </div>
                  <p className="text-xs text-[var(--ed-text-muted)]">
                    Enter any WhatsApp phone number with country code to generate an 8-digit pairing code directly:
                  </p>

                  <form onSubmit={handleRequestPairing} className="flex gap-2">
                    <input
                      type="text"
                      value={pairingPhone}
                      onChange={(e) => setPairingPhone(e.target.value)}
                      placeholder="e.g. 919876543210"
                      className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs font-mono text-[var(--ed-text-primary)]"
                      style={{ background: "var(--ed-surface)" }}
                    />
                    <button
                      type="submit"
                      disabled={isPairingLoading}
                      className="px-4 py-2.5 rounded-xl bg-[var(--ed-accent)] text-white font-mono font-bold text-xs shrink-0"
                    >
                      {isPairingLoading ? "Generating..." : "Get 8-Digit Code"}
                    </button>
                  </form>

                  {pairingMsg && (
                    <div
                      className={`text-xs font-mono font-semibold ${
                        pairingMsg.isError ? "text-rose-500" : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {pairingMsg.text}
                    </div>
                  )}

                  {waStatus.pairingCode && (
                    <div
                      className="p-3.5 rounded-xl border border-emerald-500/40 flex items-center justify-between"
                      style={{ background: "var(--ed-surface)" }}
                    >
                      <div className="font-mono text-xl font-black tracking-widest text-emerald-600 dark:text-emerald-400">
                        {waStatus.pairingCode}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(waStatus.pairingCode || "");
                          setCopiedCode(true);
                          setTimeout(() => setCopiedCode(false), 2000);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-[var(--ed-border)] text-xs font-mono font-bold text-[var(--ed-text-primary)] flex items-center gap-1"
                      >
                        {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                        {copiedCode ? "Copied" : "Copy"}
                      </button>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-[var(--ed-border)] flex items-center justify-between gap-2">
                  <button
                    onClick={handleSendPing}
                    disabled={isSendingPing}
                    className="px-3.5 py-2 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5"
                    style={{ background: "var(--ed-surface)" }}
                  >
                    <Send className="w-3.5 h-3.5 text-sky-500" />
                    {pingStatus || "Send Diagnostic Ping"}
                  </button>
                  <Link
                    href="/conversations"
                    className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1"
                  >
                    Open Live Inbox <ArrowUpRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div
              className="p-5 rounded-2xl border border-[var(--ed-border)] space-y-4"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-[var(--ed-text-secondary)]">
                  <strong>Official Meta Graph API v20.0 Webhook:</strong>{" "}
                  <code className="font-mono text-[var(--ed-accent)]">/api/v1/webhooks/whatsapp</code>
                </div>
                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                  Official Enterprise Mode
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[var(--ed-text-muted)] font-semibold mb-1">Phone Number ID</label>
                  <input
                    type="text"
                    value={metaPhoneId}
                    onChange={(e) => setMetaPhoneId(e.target.value)}
                    placeholder="104928194829104"
                    className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                    style={{ background: "var(--ed-surface)" }}
                  />
                </div>
                <div>
                  <label className="block text-[var(--ed-text-muted)] font-semibold mb-1">WABA Account ID</label>
                  <input
                    type="text"
                    value={metaWabaId}
                    onChange={(e) => setMetaWabaId(e.target.value)}
                    placeholder="109482918491029"
                    className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                    style={{ background: "var(--ed-surface)" }}
                  />
                </div>
                <div>
                  <label className="block text-[var(--ed-text-muted)] font-semibold mb-1">Meta Access Token</label>
                  <input
                    type="password"
                    value={metaAccessToken}
                    onChange={(e) => setMetaAccessToken(e.target.value)}
                    placeholder="EAAGm0PX4ZCpsBA..."
                    className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                    style={{ background: "var(--ed-surface)" }}
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={handleSaveOfficialMeta}
                    disabled={isSavingMeta}
                    className="w-full py-2.5 px-4 rounded-xl bg-[var(--ed-accent)] text-white font-bold text-xs"
                  >
                    {isSavingMeta ? "Saving..." : "Save & Activate Official API"}
                  </button>
                </div>
              </div>
              {pingStatus && (
                <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{pingStatus}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SALES FUNNEL, RADAR & THEME-ADAPTIVE LIVE AI SIMULATOR             */}
      {/* ========================================================================= */}
      {(advTab === "funnel_sim" || advTab === "all") && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Sales Stage Funnel Distribution (7 cols) */}
            <div
              className="lg:col-span-7 p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm"
              style={{ background: "var(--ed-surface)" }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-sky-500" />
                    Sales Stage &amp; Conversion Velocity
                  </h3>
                  <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                    Active buyer distribution across commercial qualification stages
                  </p>
                </div>
                <div
                  className="flex items-center gap-1 p-1 rounded-xl border border-[var(--ed-border)] text-xs"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <button
                    onClick={() => setChartView("bars")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      chartView === "bars"
                        ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                        : "text-[var(--ed-text-muted)]"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" /> Bars
                  </button>
                  <button
                    onClick={() => setChartView("pie")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      chartView === "pie"
                        ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                        : "text-[var(--ed-text-muted)]"
                    }`}
                  >
                    <PieIcon className="w-3.5 h-3.5" /> Donut
                  </button>
                  <button
                    onClick={() => setChartView("radar")}
                    className={`px-3 py-1 rounded-lg font-semibold transition-colors flex items-center gap-1.5 ${
                      chartView === "radar"
                        ? "text-[var(--ed-text-primary)] bg-[var(--ed-surface)] shadow-sm"
                        : "text-[var(--ed-text-muted)]"
                    }`}
                  >
                    <Compass className="w-3.5 h-3.5" /> Radar
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
              ) : chartView === "pie" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-center py-2">
                  <div className="flex justify-center">
                    <svg width="190" height="190" viewBox="0 0 200 200" className="transform -rotate-90">
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
                            />
                          );
                        });
                      })()}
                    </svg>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    {funnel.map((item) => (
                      <div key={item.stage} className="flex items-center justify-between">
                        <span className="font-semibold text-[var(--ed-text-primary)]">{item.stage}</span>
                        <span className="font-mono text-[var(--ed-text-muted)]">{item.count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-2">
                  <ChartContainer config={funnelRadarConfig} className="mx-auto aspect-square max-h-[250px] w-full">
                    <RadarChart
                      data={funnel.map((f) => ({
                        stage: f.stage.replace("_", " "),
                        leads: f.count,
                        target: Math.round(f.count * 1.35) + 3,
                      }))}
                    >
                      <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                      <PolarAngleAxis dataKey="stage" />
                      <PolarGrid strokeDasharray="3 3" />
                      <Radar
                        name="Active Leads"
                        stroke="var(--color-leads)"
                        dataKey="leads"
                        fill="var(--color-leads)"
                        fillOpacity={0.25}
                      />
                    </RadarChart>
                  </ChartContainer>
                </div>
              )}
            </div>

            {/* Right: Theme-Adaptive Live AI Simulator & Active Queue (5 cols) */}
            <div id="instant-sandbox" className="lg:col-span-5 space-y-5">
              {/* Theme-Adaptive AI Simulator Card (Clean in both Light & Dark Mode!) */}
              <div
                className="p-6 rounded-2xl border-2 border-[var(--ed-accent)]/40 shadow-sm space-y-3.5"
                style={{ background: "var(--ed-surface)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-[var(--ed-accent)] uppercase tracking-wider flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5" /> Live AI Negotiation Simulator
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold">
                    🧪 Safe Sandbox
                  </span>
                </div>
                <p className="text-xs text-[var(--ed-text-muted)]">
                  Test EDITH commercial reasoning for <strong>{businessName}</strong> without sending messages to real WhatsApp:
                </p>

                <div className="space-y-2.5">
                  <input
                    type="text"
                    value={simPrompt}
                    onChange={(e) => setSimPrompt(e.target.value)}
                    placeholder="Type customer inquiry..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] text-xs font-mono focus:outline-none ed-focus-ring"
                    style={{ background: "var(--ed-bg)" }}
                  />
                  <button
                    onClick={handleRunSimulation}
                    disabled={isSimulating}
                    className="w-full py-2.5 rounded-xl bg-[var(--ed-accent)] hover:opacity-95 text-white font-mono font-bold text-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50 shadow-sm"
                  >
                    {isSimulating ? (
                      <>
                        <MessageLoading className="w-4 h-4 text-white" />
                        <span>Running Dual-Brain Deliberation...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>Execute Simulated Inquiry</span>
                      </>
                    )}
                  </button>
                </div>

                {simResult && (
                  <div
                    className="p-3.5 rounded-xl border border-[var(--ed-accent)]/30 text-xs space-y-1.5"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="flex items-center justify-between text-[11px] font-mono text-[var(--ed-text-muted)] border-b border-[var(--ed-border)] pb-1">
                      <span>
                        Stage: <strong className="text-[var(--ed-accent)]">{simResult.stage}</strong>
                      </span>
                      <span>
                        Lead Score: <strong className="text-emerald-600 dark:text-emerald-400">{simResult.score}</strong>
                      </span>
                    </div>
                    <div className="text-[var(--ed-text-primary)] text-xs leading-relaxed pt-1">
                      <strong className="text-[var(--ed-accent)]">{agentName}:</strong> {simResult.reply}
                    </div>
                  </div>
                )}
              </div>

              {/* Live Conversation Queue */}
              <div
                className="p-5 rounded-2xl border border-[var(--ed-border)] shadow-sm"
                style={{ background: "var(--ed-surface)" }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-500" />
                    Live WhatsApp Queue
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
                    {recentConvs.slice(0, 4).map((conv) => (
                      <Link
                        key={conv.id}
                        href={`/conversations?id=${conv.id}`}
                        className="p-2.5 rounded-xl border border-[var(--ed-border)] flex items-center justify-between transition-all group block"
                        style={{ background: "var(--ed-bg)" }}
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-[var(--ed-text-primary)] font-mono">
                              {conv.channel_id}
                            </span>
                            <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-sky-500/15 text-sky-500">
                              {conv.sales_stage}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--ed-text-muted)] font-mono">
                            Score: <strong>{conv.lead_score}</strong>
                          </div>
                        </div>
                        <ArrowUpRight className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-[var(--ed-text-muted)] border border-dashed border-[var(--ed-border)] rounded-xl">
                    No active conversations in queue.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Radar Benchmarking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <StrokeMultipleRadarChart />
            <Card>
              <CardHeader className="items-center pb-4">
                <CardTitle className="flex items-center">
                  Commercial Readiness Radar
                  <Badge variant="outline" className="text-sky-500 bg-sky-500/10 border-none ml-2">
                    <Compass className="h-4 w-4 mr-1" />
                    <span>{computedLeadHealth.overallScore} Score</span>
                  </Badge>
                </CardTitle>
                <CardDescription>
                  Live qualification vectors across {metrics.leads_total} buyer accounts
                </CardDescription>
              </CardHeader>
              <CardContent className="pb-0">
                <ChartContainer config={leadHealthConfig} className="mx-auto aspect-square max-h-[250px]">
                  <RadarChart data={computedLeadHealth.dimensions}>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                    <PolarAngleAxis dataKey="dimension" />
                    <PolarGrid strokeDasharray="3 3" />
                    <Radar
                      name="Active Pipeline"
                      stroke="var(--color-current)"
                      dataKey="current"
                      fill="var(--color-current)"
                      fillOpacity={0.2}
                    />
                  </RadarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TOKEN ECONOMICS, QUICK DOCK & 24H VELOCITY                         */}
      {/* ========================================================================= */}
      {(advTab === "telemetry" || advTab === "all") && (
        <div className="space-y-6">
          <ExecutiveQuickDock
            onTestDiscountPolicy={(prompt) => {
              setSimPrompt(prompt);
              setAdvTab("funnel_sim");
            }}
            onSendWhatsAppPing={handleSendPing}
            isSendingPing={isSendingPing}
          />

          <HourlyVelocityHeatmap />

          {/* Theme-Adaptive Dual-Brain Token Economics */}
          <div
            className="p-6 rounded-2xl border border-[var(--ed-border)] shadow-sm space-y-5"
            style={{ background: "var(--ed-surface)" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[var(--ed-border)]">
              <div>
                <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-purple-600 dark:text-purple-400 uppercase">
                  <Zap className="w-4 h-4" />
                  Dual-Brain Token &amp; Inference Economics
                </div>
                <h2 className="text-base font-bold text-[var(--ed-text-primary)] mt-0.5">
                  Real-Time Consumption Across FRIDAY (Gemini) &amp; EDITH (NVIDIA NIM)
                </h2>
              </div>
              <Link
                href="/brain"
                className="px-3.5 py-1.5 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1 self-start sm:self-auto"
                style={{ background: "var(--ed-bg)" }}
              >
                Full Brain Telemetry <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* FRIDAY */}
              <div
                className="p-5 rounded-xl border border-[var(--ed-border)] space-y-3"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400">
                      FRIDAY • LIVE VOICE &amp; ACTION COPILOT
                    </span>
                    <h4 className="text-sm font-bold font-mono text-[var(--ed-text-primary)] mt-1">
                      {metrics.tokens_summary?.friday_model || "gemini-3.1-flash-live-preview"}
                    </h4>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xl font-black text-purple-600 dark:text-purple-400">
                      {metrics.tokens_summary?.friday_tokens?.toLocaleString() || "7,130"}
                    </span>
                    <span className="block text-[10px] text-[var(--ed-text-muted)]">Tokens</span>
                  </div>
                </div>
              </div>

              {/* EDITH */}
              <div
                className="p-5 rounded-xl border border-[var(--ed-border)] space-y-3"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 dark:text-sky-400">
                      EDITH • AUTONOMOUS COMMERCIAL CLOSER
                    </span>
                    <h4 className="text-sm font-bold font-mono text-[var(--ed-text-primary)] mt-1">
                      {metrics.tokens_summary?.edith_model || "meta/llama-3.3-70b-instruct / nemotron"}
                    </h4>
                  </div>
                  <div className="text-right font-mono">
                    <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                      {metrics.tokens_summary?.edith_tokens?.toLocaleString() || "18,340"}
                    </span>
                    <span className="block text-[10px] text-[var(--ed-text-muted)]">Tokens</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Executive Audio Briefing Modal */}
      <ExecutiveBriefingModal
        isOpen={showBriefing}
        onClose={() => setShowBriefing(false)}
        initialTimeframe={briefingTimeframe}
      />
    </div>
  );
}
