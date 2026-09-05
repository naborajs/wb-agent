"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Inbox,
  Users,
  Coffee,
  DollarSign,
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
  User,
  Smartphone,
  Cpu,
  Menu,
  X,
  Send,
  TrendingUp,
  Bell,
  CheckCircle,
  RefreshCw,
  Activity,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Live Inbox", href: "/conversations", icon: Inbox },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Campaigns", href: "/campaigns", icon: Send },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Catalog", href: "/products", icon: Coffee },
  { name: "Pricing Rules", href: "/pricing", icon: DollarSign },
  { name: "Modular Prompts", href: "/prompts", icon: BookOpen },
  { name: "Integrations", href: "/integrations", icon: Radio },
  { name: "Knowledge RAG", href: "/knowledge", icon: ShieldCheck },
  { name: "Follow-ups", href: "/followups", icon: Calendar },
  { name: "Handoffs", href: "/handoffs", icon: AlertTriangle },
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

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  // Live WebSocket Heartbeat & Watchdog Alert Center state
  const [wsConnected, setWsConnected] = useState(false);
  const [wsLatency, setWsLatency] = useState<number | null>(null);
  const [alerts, setAlerts] = useState<WatchdogAlertItem[]>([]);
  const [watchdogOpen, setWatchdogOpen] = useState(false);
  const [auditing, setAuditing] = useState(false);
  const watchdogRef = useRef<HTMLDivElement>(null);

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
    fetch("http://localhost:8000/api/v1/watchdog/alerts")
      .then((res) => res.json())
      .then((data) => {
        if (data && Array.isArray(data.alerts)) {
          setAlerts(data.alerts);
        }
      })
      .catch(() => {});

    let ws: WebSocket | null = null;
    let pingInterval: NodeJS.Timeout | null = null;
    let pingStart = 0;

    const connectWs = () => {
      try {
        ws = new WebSocket("ws://localhost:8000/api/v1/ws");

        ws.onopen = () => {
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
            if (msg.event === "pong" || msg.type === "pong") {
              if (pingStart > 0) {
                const roundtrip = Math.round(performance.now() - pingStart);
                setWsLatency(roundtrip);
              }
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
            }
          } catch {}
        };

        ws.onclose = () => {
          setWsConnected(false);
          setWsLatency(null);
          if (pingInterval) clearInterval(pingInterval);
          setTimeout(connectWs, 3000);
        };

        ws.onerror = () => {
          setWsConnected(false);
          ws?.close();
        };
      } catch {
        setWsConnected(false);
      }
    };

    connectWs();

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);

  // Run on-demand diagnostic audit via Watchdog Supervisor
  const runAuditNow = async () => {
    setAuditing(true);
    try {
      const res = await fetch("http://localhost:8000/api/v1/watchdog/run-audit", { method: "POST" });
      if (res.ok) {
        const aRes = await fetch("http://localhost:8000/api/v1/watchdog/alerts");
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
      await fetch(`http://localhost:8000/api/v1/watchdog/alerts/${alertId}/resolve`, {
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
    };
    if (profileOpen || watchdogOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen, watchdogOpen]);

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

  const sidebarContent = (
    <>
      <div>
        {/* Brand Header */}
        <div className="p-4 border-b border-[var(--ed-border)] flex items-center gap-3">
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
                EDITH
              </h1>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                AI OS
              </span>
            </div>
            <div className="text-[11px] text-[var(--ed-text-muted)] truncate font-medium mt-0.5">
              North Bengal Tea Co.
            </div>
            <span className="text-[10px] font-medium text-[var(--ed-success)] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ed-success)]"></span>
              Autonomous Active
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          {navigation.map((item) => {
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
      <div className="p-4 border-t border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
        <div className="text-[10px] text-[var(--ed-text-muted)] font-semibold mb-1">
          Owner Command Channel
        </div>
        <div className="text-xs font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5 font-data">
          <Radio className="w-3.5 h-3.5 text-[var(--ed-success)]" />
          +91 89006 53250
        </div>
        <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
          Baileys Bridge v20.0
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden text-[var(--ed-text-primary)] transition-colors duration-200" style={{ background: "var(--ed-bg)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[var(--ed-border)] flex-col justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col justify-between shadow-2xl" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setMobileNavOpen(false)} className="ed-press p-2 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-[var(--ed-border)] px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
          <div className="flex items-center gap-3">
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

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[var(--ed-text-muted)]">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[11px]">
                <ShieldCheck className="w-3.5 h-3.5 text-[var(--ed-success)]" />
                <span>Deterministic Pricing & Policy Engine</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="ed-press ed-focus-ring p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
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
                  : "text-[var(--ed-danger)] border-[var(--ed-danger)]/25"
              }`}
              style={{
                background: wsConnected
                  ? "color-mix(in srgb, var(--ed-success) 8%, transparent)"
                  : "color-mix(in srgb, var(--ed-danger) 8%, transparent)",
              }}
              title={wsConnected ? `WebSocket connected · Latency: ${wsLatency !== null ? `${wsLatency}ms` : "OK"}` : "WebSocket disconnected"}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${wsConnected ? "bg-[var(--ed-success)] animate-pulse" : "bg-[var(--ed-danger)]"}`} />
              {wsConnected ? `Live · ${wsLatency !== null ? `${wsLatency}ms` : "Active"}` : "Reconnecting"}
            </span>

            {/* AI Watchdog Supervisor Center */}
            <div className="relative" ref={watchdogRef}>
              <button
                onClick={() => setWatchdogOpen(!watchdogOpen)}
                aria-label="AI Watchdog Supervisor Center"
                className="ed-press ed-focus-ring relative p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
                style={{
                  background: watchdogOpen ? "var(--ed-accent)" : "var(--ed-surface)",
                  color: watchdogOpen ? "#fff" : undefined,
                }}
                title="AI Watchdog Diagnostics & Anomaly Monitor"
              >
                <Bell className="w-4 h-4" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--ed-danger)] px-1 text-[9px] font-bold text-white shadow-sm">
                    {alerts.length}
                  </span>
                )}
              </button>

              {watchdogOpen && (
                <div
                  className="absolute right-0 top-12 w-80 sm:w-96 rounded-xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
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
                      className="ed-press px-2.5 py-1 rounded-md text-[11px] font-medium border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-primary)] hover:bg-[var(--ed-border)] transition-all flex items-center gap-1 disabled:opacity-50"
                    >
                      <RefreshCw className={`w-3 h-3 ${auditing ? "animate-spin text-[var(--ed-accent)]" : ""}`} />
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
                              className="text-[10px] font-semibold text-[var(--ed-accent)] hover:underline"
                            >
                              Mark Resolved
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
                <div className="absolute right-0 top-12 w-72 rounded-2xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden" style={{ background: "var(--ed-surface)" }}>
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
                            Online
                          </span>
                        </div>
                        <div className="text-[11px] text-[var(--ed-text-muted)]">Autonomous AI Sales System</div>
                      </div>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Bot WhatsApp</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">+91 89187 53100</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Owner WhatsApp</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">+91 89006 53250</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">System Version</div>
                        <div className="font-semibold text-[var(--ed-text-primary)]">EDITH v2.0.0 · Baileys v20.0</div>
                      </div>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="p-3 border-t border-[var(--ed-border)]">
                    <button className="ed-press ed-focus-ring w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-[var(--ed-danger)] border border-[var(--ed-danger)]/20 hover:bg-[var(--ed-danger)]/5 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 ed-bg-texture transition-colors duration-200">
          {children}
        </main>
      </div>
    </div>
  );
}
