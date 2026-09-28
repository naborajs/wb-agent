"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import VoiceAgent from "./VoiceAgent";
import { SystemHealthBadge } from "./SystemHealthBadge";
import { clickElement, typeText, setColorTheme, scrollPage } from "./voice/domActions";
import { getWebSocketUrl } from "@/lib/utils";
import {
  Inbox,
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  BarChart3,
  Settings,
  ShieldCheck,
  Radio,
  ShoppingBag,
  Sun,
  Moon,
  LogOut,
  Smartphone,
  User,
  Cpu,
  Menu,
  X,
  Send,
  TrendingUp,
  Bell,
  CheckCircle,
  RefreshCw,
  Activity,
  Sparkles,
  Sliders,
} from "lucide-react";
import FloatingPathsBackground from "./ui/FloatingPathsBackground";
import MessageLoading from "./ui/MessageLoading";
import OnboardingAndModeModal, { WorkspaceConfigState } from "./OnboardingAndModeModal";

const navigation: Array<{
  name: string;
  href: string;
  icon: any;
  featureKey?: string;
  advancedOnly?: boolean;
}> = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Dual Brains", href: "/brain", icon: Cpu, featureKey: "dual_brain_console", advancedOnly: true },
  { name: "Playground", href: "/playground", icon: Sparkles, featureKey: "ai_playground", advancedOnly: true },
  { name: "Notifications", href: "/notifications", icon: Bell },
  { name: "Live Inbox", href: "/conversations", icon: Inbox, featureKey: "conversations_inbox" },
  { name: "Leads", href: "/leads", icon: Users, featureKey: "leads_crm" },
  { name: "Campaigns", href: "/campaigns", icon: Send, featureKey: "campaigns" },
  { name: "Analytics", href: "/analytics", icon: TrendingUp, featureKey: "analytics" },
  { name: "Orders", href: "/orders", icon: ShoppingBag, featureKey: "orders_invoices" },
  { name: "Knowledge Hub RAG", href: "/knowledge", icon: ShieldCheck, featureKey: "knowledge_rag", advancedOnly: true },
  { name: "Modular Prompts", href: "/prompts", icon: BookOpen, featureKey: "modular_prompts", advancedOnly: true },
  { name: "Integrations", href: "/integrations", icon: Radio },
  { name: "Follow-ups", href: "/followups", icon: Calendar, featureKey: "followups", advancedOnly: true },
  { name: "Handoffs", href: "/handoffs", icon: AlertTriangle, featureKey: "handoffs", advancedOnly: true },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface WatchdogAlertItem {
  id: string;
  severity: "info" | "warning" | "critical";
  category: string;
  title: string;
  description: string;
  suggested_action?: string;
  model_used?: string;
  created_at?: string;
}

interface AgentNotificationItem {
  id: string;
  sender_brain: "FRIDAY" | "EDITH";
  title: string;
  content: string;
  category: string;
  severity: "info" | "warning" | "critical" | "success";
  is_read: boolean;
  action_url?: string;
  created_at?: string;
}

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Agent Autonomous Notifications State
  const [agentNotifs, setAgentNotifs] = useState<AgentNotificationItem[]>([]);
  const [agentNotifOpen, setAgentNotifOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [liveToast, setLiveToast] = useState<AgentNotificationItem | null>(null);
  const agentNotifRef = useRef<HTMLDivElement>(null);

  // Live WebSocket Heartbeat & Watchdog Alert Center state
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<WatchdogAlertItem[]>([]);
  const [watchdogOpen, setWatchdogOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const watchdogRef = useRef<HTMLDivElement>(null);
  const [businessName, setBusinessName] = useState("Enterprise AI Operations");
  const [agentName, setAgentName] = useState("EDITH");
  const [setupModalOpen, setSetupModalOpen] = useState(false);
  const [setupModalTab, setSetupModalTab] = useState<"whatsapp_owner" | "industry_features" | "verification">("whatsapp_owner");
  const [workspaceConfig, setWorkspaceConfig] = useState<WorkspaceConfigState>({
    ui_mode: "advanced",
    onboarding_completed: false,
    industry_preset_id: "ecommerce_retail",
    business_name: "Enterprise AI Operations",
    business_industry: "Multi-Industry B2B & Retail Commerce",
    business_tagline: "Autonomous Dual-Brain Sales, Support & Operations",
    catalog_unit: "unit",
    currency_symbol: "₹",
    owner_whatsapp_number: "",
    whatsapp_connected: false,
    bot_whatsapp_number: "",
    qr_available: false,
    feature_toggles: {
      voice_copilot: true,
      conversations_inbox: true,
      leads_crm: true,
      orders_invoices: true,
      analytics: true,
      campaigns: true,
      followups: true,
      handoffs: true,
      dynamic_pricing: true,
      knowledge_rag: true,
      ai_playground: true,
      dual_brain_console: true,
      modular_prompts: true,
    },
  });

  const applyWorkspaceConfigState = (cfg: WorkspaceConfigState) => {
    setWorkspaceConfig(cfg);
    if (cfg.business_name) setBusinessName(cfg.business_name);
    try {
      window.dispatchEvent(new CustomEvent("workspace_config_change", { detail: cfg }));
    } catch {}
  };

  const handleQuickModeToggle = async (targetMode: "simplified" | "advanced") => {
    const optimistic = { ...workspaceConfig, ui_mode: targetMode };
    applyWorkspaceConfigState(optimistic);
    try {
      const res = await fetch("/api/v1/settings/workspace-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ui_mode: targetMode }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) applyWorkspaceConfigState(data.config);
      }
    } catch {}
  };

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.business_name) {
          setBusinessName(data.business_name);
        }
        if (data?.agent_name) setAgentName(data.agent_name);
      })
      .catch(() => {});

    fetch("/api/v1/settings/workspace-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((cfg) => {
        if (cfg) {
          applyWorkspaceConfigState(cfg);
          const localDone = typeof window !== "undefined" ? localStorage.getItem("wb_onboarding_completed") : null;
          if (!cfg.onboarding_completed && localDone !== "true") {
            setSetupModalTab("whatsapp_owner");
            setSetupModalOpen(true);
          }
        }
      })
      .catch(() => {});

    const handleOpenModalEvent = (e: any) => {
      if (e?.detail?.tab) setSetupModalTab(e.detail.tab);
      setSetupModalOpen(true);
    };
    window.addEventListener("open_setup_modal", handleOpenModalEvent);
    return () => window.removeEventListener("open_setup_modal", handleOpenModalEvent);
  }, []);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("wb_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Fetch initial active watchdog alerts and setup real-time WebSocket connection
  useEffect(() => {
    fetch("/api/v1/watchdog/alerts")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {});

    fetch("/api/v1/notifications?limit=20")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.notifications)) {
          setAgentNotifs(data.notifications);
          setUnreadNotifCount(data.unread_count || 0);
        }
      })
      .catch(() => {});

    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let retryTimeout: NodeJS.Timeout | null = null;
    let pingStart = 0;
    let isMounted = true;

    const connectWs = () => {
      if (!isMounted) return;
      try {
        const wsUrl = getWebSocketUrl("/api/v1/ws");
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          if (!isMounted) return;
          setWsConnected(true);
          pingInterval = setInterval(() => {
            if (ws && ws.readyState === WebSocket.OPEN) {
              pingStart = performance.now();
              ws.send(JSON.stringify({ type: "ping" }));
            }
          }, 8000);
        };

        ws.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.event === "pong" || msg.type === "pong" || event.data === "pong") {
              if (pingStart > 0) {
                const roundtrip = Math.round(performance.now() - pingStart);
                setWsLatency(roundtrip);
              }
            } else if (msg.event === "agent_notification" && msg.data) {
              const notifItem = msg.data;
              setAgentNotifs((prev) => [notifItem, ...prev]);
              setUnreadNotifCount((prev) => prev + 1);
              setLiveToast(notifItem);
              setTimeout(() => setLiveToast(null), 8000);
            } else if (msg.event === "watchdog_alert") {
              const newAlert = msg.data;
              if (newAlert && newAlert.id) {
                setAlerts((prev) => {
                  if (prev.some((a) => a.id === newAlert.id)) return prev;
                  return [newAlert, ...prev];
                });
              }
            } else if (msg.event === "watchdog_alert_resolved") {
              const resolvedId = msg.data?.alert_id;
              if (resolvedId) {
                setAlerts((prev) => prev.filter((a) => a.id !== resolvedId));
              }
            } else if (msg.event === "friday_ui_action" && msg.data) {
              const uiAction = msg.data;
              try {
                if (uiAction.action === "click" && (uiAction.query || uiAction.target)) {
                  clickElement(uiAction.query || uiAction.target);
                } else if (uiAction.action === "type" && uiAction.target) {
                  typeText(uiAction.target, uiAction.text || "", Boolean(uiAction.submit));
                } else if (uiAction.action === "navigate" && (uiAction.path || uiAction.target)) {
                  router.push(uiAction.path || uiAction.target);
                } else if (uiAction.action === "scroll" || uiAction.action === "scroll_page") {
                  scrollPage(uiAction.direction || "down", uiAction.amount, uiAction.target || uiAction.section);
                } else if (uiAction.action === "theme" && (uiAction.theme || uiAction.value)) {
                  setColorTheme(uiAction.theme || uiAction.value);
                } else if (uiAction.action === "draft_reply") {
                  window.dispatchEvent(new CustomEvent("friday_draft_reply", { detail: uiAction }));
                }
                window.dispatchEvent(new CustomEvent("friday_ui_action", { detail: uiAction }));
              } catch (domErr) {
                console.warn("[DashboardShell] Error executing Friday UI action:", domErr);
              }
            } else if (msg.event === "friday_draft_reply" && msg.data) {
              window.dispatchEvent(new CustomEvent("friday_draft_reply", { detail: msg.data }));
            } else if (msg.event === "workspace_config_updated" && msg.data) {
              applyWorkspaceConfigState(msg.data);
            }
          } catch {}
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsConnected(false);
          setWsLatency(null);
          if (pingInterval) clearInterval(pingInterval);
          retryTimeout = setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          if (!isMounted) return;
          setWsConnected(false);
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        if (!isMounted) return;
        setWsConnected(false);
        retryTimeout = setTimeout(connectWs, 3000);
      }
    };

    const handleThemeChange = (e: any) => {
      const newTheme = e?.detail?.theme;
      if (newTheme === "dark") {
        document.documentElement.classList.add("dark");
      } else if (newTheme === "light") {
        document.documentElement.classList.remove("dark");
      }
    };
    window.addEventListener("theme_change", handleThemeChange);

    connectWs();

    return () => {
      isMounted = false;
      window.removeEventListener("theme_change", handleThemeChange);
      if (pingInterval) clearInterval(pingInterval);
      if (retryTimeout) clearTimeout(retryTimeout);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  // Run on-demand diagnostic audit via Watchdog Supervisor
  const runAuditNow = async () => {
    setAuditing(true);
    try {
      const res = await fetch("/api/v1/watchdog/run-audit", { method: "POST" });
      if (res.ok) {
        const aRes = await fetch("/api/v1/watchdog/alerts");
        const aData = await aRes.json();
        if (aData && Array.isArray(aData.alerts)) {
          setAlerts(aData.alerts);
        }
      }
    } catch (err) {
      console.error("Failed to run watchdog audit:", err);
    } finally {
      setAuditing(false);
    }
  };

  // Resolve an alert
  const resolveAlertItem = async (alertId: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== alertId));
    try {
      await fetch(`/api/v1/watchdog/alerts/${alertId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolved_by: "operator" }),
      });
    } catch (err) {
      console.error("Failed to resolve watchdog alert:", err);
    }
  };

  // Close panels on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
      if (watchdogRef.current && !watchdogRef.current.contains(e.target as Node)) {
        setWatchdogOpen(false);
      }
      if (agentNotifRef.current && !agentNotifRef.current.contains(e.target as Node)) {
        setAgentNotifOpen(false);
      }
    };
    if (profileOpen || watchdogOpen || agentNotifOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen, watchdogOpen, agentNotifOpen]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("wb_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("wb_theme", "light");
    }
  };

  const visibleNavigation = navigation.filter((item) => {
    if (workspaceConfig.ui_mode === "simplified" && item.advancedOnly) {
      return false;
    }
    if (item.featureKey && workspaceConfig.feature_toggles?.[item.featureKey] === false) {
      return false;
    }
    return true;
  });

  const formattedOwnerPhone = workspaceConfig.owner_whatsapp_number
    ? `+${workspaceConfig.owner_whatsapp_number.replace(/^\+/, "")}`
    : "Click to Set Owner #";

  const formattedBotPhone = workspaceConfig.bot_whatsapp_number
    ? `+${workspaceConfig.bot_whatsapp_number.replace(/^\+/, "")}`
    : workspaceConfig.whatsapp_connected
    ? "Connected (Linked)"
    : "Not Paired — Click Setup";

  const sidebarContent = (
    <div className="flex flex-col h-full justify-between overflow-hidden">
      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--ed-border)] flex items-center gap-3 shrink-0">
          <div className="relative w-12 h-12 rounded-2xl ed-brand-avatar flex items-center justify-center shrink-0 group">
            <img
              src="/logo-icon.png"
              alt="EDITH Logo"
              className="w-10 h-10 object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)] group-hover:scale-105 transition-transform duration-300"
            />
            {/* Live autonomous status orb */}
            <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[var(--ed-surface)] border-2 border-[var(--ed-border)] flex items-center justify-center">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </span>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="font-bold text-base leading-tight tracking-tight text-[var(--ed-text-primary)] truncate">
                {agentName}
              </h1>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                {workspaceConfig.ui_mode === "simplified" ? "SIMPLE" : "PRO OS"}
              </span>
            </div>
            <div className="text-[11px] text-[var(--ed-text-muted)] truncate font-medium mt-0.5" title={businessName}>
              {businessName}
            </div>
            <span className="text-[10px] font-medium text-[var(--ed-success)] flex items-center gap-1 mt-0.5 truncate">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ed-success)] shrink-0"></span>
              <span className="truncate">{workspaceConfig.business_industry || "Autonomous Active"}</span>
            </span>
          </div>
        </div>

        {/* Navigation Links with Smooth Scroll for mobile & smaller screens */}
        <nav className="p-3 space-y-0.5 overflow-y-auto flex-1">
          {visibleNavigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`ed-press ed-focus-ring flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                  isActive
                    ? "ed-nav-active"
                    : "text-[var(--ed-text-muted)] hover:bg-[var(--ed-bg)] hover:text-[var(--ed-text-primary)] border-l-2 border-transparent font-medium"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[var(--ed-accent)]" : "text-[var(--ed-text-muted)]"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Owner Notification Channel Footer */}
      <button
        onClick={() => {
          setSetupModalTab("whatsapp_owner");
          setSetupModalOpen(true);
        }}
        className="p-4 border-t border-[var(--ed-border)] shrink-0 text-left w-full hover:opacity-90 transition-opacity cursor-pointer"
        style={{ background: "var(--ed-bg)" }}
        title="Click to configure WhatsApp Bot & Owner Escalation numbers"
      >
        <div className="flex items-center justify-between text-[10px] text-[var(--ed-text-muted)] font-semibold mb-1">
          <span>Owner Escalation Channel</span>
          <span className="text-sky-500 underline">Configure</span>
        </div>
        <div className="text-xs font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5 font-data">
          <Radio className={`w-3.5 h-3.5 ${workspaceConfig.owner_whatsapp_number ? "text-[var(--ed-success)]" : "text-amber-500"}`} />
          {formattedOwnerPhone}
        </div>
        <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5 truncate">
          Bot: {formattedBotPhone}
        </div>
      </button>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden text-[var(--ed-text-primary)] transition-colors duration-200" style={{ background: "var(--ed-bg)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[var(--ed-border)] flex-col justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay with smooth touch bounds */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 max-w-[85vw] flex flex-col justify-between shadow-2xl overflow-hidden" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between p-3 border-b border-[var(--ed-border)]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg ed-brand-avatar flex items-center justify-center p-0.5">
                  <img src="/logo-icon.png" alt="EDITH" className="w-5 h-5 object-contain" />
                </div>
                <span className="font-bold text-sm text-[var(--ed-text-primary)]">Menu</span>
              </div>
              <button onClick={() => setMobileNavOpen(false)} className="ed-press p-2 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {sidebarContent}
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-[var(--ed-border)] px-3 sm:px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden ed-press p-2 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Mobile Brand Logo */}
            <div className="md:hidden flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl ed-brand-avatar flex items-center justify-center p-0.5 shrink-0">
                <img
                  src="/logo-icon.png"
                  alt="EDITH"
                  className="w-6 h-6 object-contain drop-shadow-[0_1px_4px_rgba(56,189,248,0.35)]"
                />
              </div>
              <span className="font-bold text-sm tracking-tight text-[var(--ed-text-primary)]">EDITH</span>
            </div>

            {/* Prominent Main Simplified vs Advanced Mode Toggle */}
            <div
              className="flex items-center p-0.5 rounded-xl border border-[var(--ed-border)]"
              style={{ background: "var(--ed-bg)" }}
              title="Switch between Simplified Business Mode and Advanced Developer Mode"
            >
              <button
                onClick={() => handleQuickModeToggle("simplified")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  workspaceConfig.ui_mode === "simplified"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                ✨ Simplified
              </button>
              <button
                onClick={() => handleQuickModeToggle("advanced")}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                  workspaceConfig.ui_mode === "advanced"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                🛠️ Advanced
              </button>
            </div>

            {/* Setup, WhatsApp Pairing & Feature Toggles Button */}
            <button
              onClick={() => {
                setSetupModalTab("whatsapp_owner");
                setSetupModalOpen(true);
              }}
              className="ed-press flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold hover:bg-emerald-500/20 transition-all"
              title="Connect WhatsApp Number, Set Owner Escalation Phone, Choose Industry & Toggle Features"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Setup, WhatsApp &amp; Features</span>
              <span className="lg:hidden">Setup</span>
            </button>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="ed-press ed-focus-ring p-2 sm:p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
              style={{ background: "var(--ed-surface)" }}
            >
              {mounted && darkMode ? (
                <Sun className="w-4 h-4 text-[var(--ed-warning)]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            {/* Live WebSocket Heartbeat Pill */}
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                wsConnected
                  ? "text-[var(--ed-success)] border-[var(--ed-success)]/25"
                  : "text-[var(--ed-warning)] border-[var(--ed-warning)]/25"
              }`}
              style={{ background: wsConnected ? "color-mix(in srgb, var(--ed-success) 8%, transparent)" : "color-mix(in srgb, var(--ed-warning) 8%, transparent)" }}
            >
              <Radio className={`w-3 h-3 ${wsConnected ? "animate-pulse" : ""}`} />
              {wsConnected ? (wsLatency !== null ? `${wsLatency}ms` : "Live") : "Reconnecting"}
            </span>

            {/* Live System & Diagnostics Status Badge */}
            <SystemHealthBadge />

            {/* Autonomous Agent Notifications Bell (EDITH & Friday) */}
            <div className="relative" ref={agentNotifRef}>
              <button
                onClick={() => setAgentNotifOpen(!agentNotifOpen)}
                className={`ed-press ed-focus-ring relative p-2 sm:p-2.5 rounded-lg border transition-all ${
                  unreadNotifCount > 0
                    ? "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400"
                    : "border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
                style={unreadNotifCount === 0 ? { background: "var(--ed-surface)" } : {}}
                aria-label="Agent Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-sky-500 px-1 text-[9px] font-bold text-white shadow-sm animate-pulse">
                    {unreadNotifCount}
                  </span>
                )}
              </button>

              {agentNotifOpen && (
                <div
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                  style={{ background: "var(--ed-surface)" }}
                >
                  <div className="p-3.5 border-b border-[var(--ed-border)] flex items-center justify-between" style={{ background: "var(--ed-bg)" }}>
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-sky-500" />
                      <span className="text-xs font-bold text-[var(--ed-text-primary)]">Agent Notifications</span>
                      <span className="text-[10px] text-[var(--ed-text-muted)]">EDITH & Friday</span>
                    </div>
                    <Link
                      href="/notifications"
                      onClick={() => setAgentNotifOpen(false)}
                      className="text-[11px] text-sky-600 dark:text-sky-400 hover:underline font-medium flex items-center gap-1"
                    >
                      View All
                    </Link>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-[var(--ed-border)] text-xs">
                    {agentNotifs.length === 0 ? (
                      <div className="p-8 text-center text-[var(--ed-text-muted)]">No agent notifications yet.</div>
                    ) : (
                      agentNotifs.slice(0, 8).map((n) => (
                        <div key={n.id} className="p-3 hover:bg-[var(--ed-bg)] transition-colors space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full uppercase ${n.sender_brain === "EDITH" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300" : "bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300"}`}>
                              {n.sender_brain}
                            </span>
                            <span className="text-[10px] text-[var(--ed-text-muted)]">{n.created_at ? new Date(n.created_at).toLocaleTimeString() : ""}</span>
                          </div>
                          <div className="font-semibold text-[var(--ed-text-primary)] truncate">{n.title}</div>
                          <div className="text-[11px] text-[var(--ed-text-muted)] line-clamp-2">{n.content}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Watchdog AI Alert Center Icon */}
            <div className="relative" ref={watchdogRef}>
              <button
                onClick={() => setWatchdogOpen(!watchdogOpen)}
                className={`ed-press ed-focus-ring relative p-2 sm:p-2.5 rounded-lg border transition-all ${
                  alerts.length > 0
                    ? "border-amber-500/40 bg-amber-500/10 text-amber-500"
                    : "border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
                style={alerts.length === 0 ? { background: "var(--ed-surface)" } : {}}
                aria-label="Watchdog Alerts"
              >
                <Activity className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--ed-danger)] px-1 text-[9px] font-bold text-white shadow-sm">
                    {alerts.length}
                  </span>
                )}
              </button>

              {watchdogOpen && (
                <div
                  className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 w-auto sm:w-96 max-w-[calc(100vw-1.5rem)] rounded-xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                  style={{ background: "var(--ed-surface)" }}
                >
                  {/* Watchdog Header */}
                  <div className="p-3.5 border-b border-[var(--ed-border)] flex items-center justify-between" style={{ background: "var(--ed-bg)" }}>
                    <div>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[var(--ed-text-primary)]">
                        <Cpu className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
                        AI Watchdog Supervisor
                      </div>
                      <div className="text-[10px] text-[var(--ed-text-muted)]">
                        Model: openai/gpt-oss-20b · Real-Time
                      </div>
                    </div>
                    <button
                      onClick={runAuditNow}
                      disabled={auditing}
                      className="ed-press px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-border)] transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      {auditing ? (
                        <MessageLoading className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
                      ) : (
                        <RefreshCw className="w-3 h-3 text-[var(--ed-accent)]" />
                      )}
                      {auditing ? "Auditing..." : "Audit Now"}
                    </button>
                  </div>

                  {/* Watchdog Alerts List */}
                  <div className="max-h-80 overflow-y-auto p-3 space-y-2.5">
                    {alerts.length === 0 ? (
                      <div className="py-6 text-center text-xs text-[var(--ed-text-muted)]">
                        <CheckCircle className="w-6 h-6 mx-auto mb-1.5 text-[var(--ed-success)]" />
                        All systems operational. No anomalies detected.
                      </div>
                    ) : (
                      alerts.map((alert) => (
                        <div
                          key={alert.id}
                          className="p-2.5 rounded-lg border border-[var(--ed-border)] text-xs space-y-1"
                          style={{ background: "var(--ed-bg)" }}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                alert.severity === "critical"
                                  ? "bg-red-500/15 text-red-500 border border-red-500/30"
                                  : alert.severity === "warning"
                                  ? "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-500 border border-blue-500/30"
                              }`}
                            >
                              {alert.severity}
                            </span>
                            <span className="text-[10px] text-[var(--ed-text-muted)]">
                              {alert.created_at ? new Date(alert.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Just now"}
                            </span>
                          </div>
                          <div className="font-semibold text-[var(--ed-text-primary)]">{alert.title}</div>
                          <p className="text-[11px] text-[var(--ed-text-secondary)] leading-relaxed">{alert.description}</p>
                          {alert.suggested_action && (
                            <div className="text-[10px] text-[var(--ed-text-muted)] italic pt-0.5">
                              Action: {alert.suggested_action}
                            </div>
                          )}
                          <div className="pt-1 flex justify-end">
                            <button
                              onClick={() => resolveAlertItem(alert.id)}
                              className="text-[10px] font-semibold text-[var(--ed-accent)] hover:underline flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" /> Mark Resolved
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="ed-press ed-focus-ring w-9 h-9 rounded-xl ed-brand-avatar flex items-center justify-center p-1"
                aria-label="Open profile"
              >
                <img
                  src="/logo-icon.png"
                  alt="EDITH"
                  className="w-full h-full object-contain drop-shadow-[0_1px_4px_rgba(56,189,248,0.35)]"
                />
              </button>

              {/* Profile Dropdown Panel */}
              {profileOpen && (
                <div className="fixed inset-x-3 top-16 sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 w-auto sm:w-72 max-w-[calc(100vw-1.5rem)] rounded-2xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden" style={{ background: "var(--ed-surface)" }}>
                  {/* Profile header */}
                  <div className="p-4 border-b border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl ed-brand-avatar flex items-center justify-center p-1 shrink-0">
                        <img
                          src="/logo-icon.png"
                          alt="EDITH"
                          className="w-9 h-9 object-contain drop-shadow-[0_2px_6px_rgba(56,189,248,0.35)]"
                        />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                          EDITH OS
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                            {workspaceConfig.whatsapp_connected ? "Online" : "Setup Ready"}
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--ed-text-muted)] truncate">
                          {workspaceConfig.business_industry}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Bot WhatsApp (Auto-Detected)</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">{formattedBotPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Owner Escalation WhatsApp</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">{formattedOwnerPhone}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Experience Mode</div>
                        <div className="font-semibold text-[var(--ed-text-primary)]">
                          {workspaceConfig.ui_mode === "simplified" ? "✨ Simplified Business" : "🛠️ Advanced Developer"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Configure / Switch WhatsApp Button */}
                  <div className="p-3 border-t border-[var(--ed-border)] space-y-2">
                    <button
                      onClick={() => {
                        setProfileOpen(false);
                        setSetupModalTab("whatsapp_owner");
                        setSetupModalOpen(true);
                      }}
                      className="ed-press ed-focus-ring w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Sliders className="w-3.5 h-3.5" />
                      Pair WhatsApp / Verify Setup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden ed-bg-texture relative">
          <FloatingPathsBackground />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 relative z-10 [transform:translateZ(0)]">
            {children}
          </main>
        </div>
      </div>

      {/* Real-Time Voice-Driven Agentic Control Layer (respects feature toggle) */}
      {workspaceConfig.feature_toggles?.voice_copilot !== false && <VoiceAgent />}

      {/* First-Run Onboarding, WhatsApp Pairing, Industry & Feature Control Modal */}
      <OnboardingAndModeModal
        isOpen={setupModalOpen}
        onClose={() => setSetupModalOpen(false)}
        config={workspaceConfig}
        onConfigUpdated={applyWorkspaceConfigState}
        initialTab={setupModalTab}
      />
    </div>
  );
}
