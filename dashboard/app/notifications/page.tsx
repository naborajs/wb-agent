"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  Sparkles,
  Zap,
  RefreshCw,
  Clock,
  Trash2,
  Check,
  ExternalLink,
  ShieldAlert,
  Bot,
  Cpu,
} from "lucide-react";

interface NotificationItem {
  id: string;
  sender_brain: "FRIDAY" | "EDITH";
  title: string;
  content: string;
  category: string;
  severity: "info" | "warning" | "critical" | "success";
  is_read: boolean;
  action_url?: string;
  metadata_payload?: any;
  created_at?: string;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterBrain, setFilterBrain] = useState<"all" | "EDITH" | "FRIDAY">("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/notifications?limit=100");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.notifications)) {
          setNotifications(data.notifications);
          setUnreadCount(data.unread_count || 0);
        }
      }
    } catch (e) {
      console.debug("Failed to fetch notifications:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Listen to real-time agent notifications over WebSocket
    const host = typeof window !== "undefined" ? (window.location.hostname || "127.0.0.1") : "127.0.0.1";
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket(`${proto}//${host}:8000/api/v1/ws`);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.event === "agent_notification" && msg.data) {
            setNotifications((prev) => [msg.data, ...prev]);
            setUnreadCount((c) => c + 1);
          }
        } catch {}
      };
    } catch {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch {}
  };

  const deleteItem = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}`, { method: "DELETE" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (filterBrain !== "all" && n.sender_brain !== filterBrain) return false;
    if (filterSeverity !== "all" && n.severity !== filterSeverity) return false;
    return true;
  });

  const edithCount = notifications.filter((n) => n.sender_brain === "EDITH").length;
  const fridayCount = notifications.filter((n) => n.sender_brain === "FRIDAY").length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                Autonomous Agent Notifications
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Real-time alerts, policy decisions, commercial updates, and emotional debriefs dispatched independently by EDITH and Friday.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin text-sky-500" : ""}`} />
            Refresh
          </button>

          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Mark All Read ({unreadCount})
            </button>
          )}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <div className="text-[11px] text-gray-400 font-medium">Total Alerts</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {notifications.length}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 shadow-sm">
          <div className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold uppercase tracking-wider">
            Unread
          </div>
          <div className="text-2xl font-bold text-amber-700 dark:text-amber-300 mt-1">
            {unreadCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 shadow-sm">
          <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase tracking-wider">
            From EDITH (WhatsApp)
          </div>
          <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300 mt-1">
            {edithCount}
          </div>
        </div>

        <div className="p-4 rounded-2xl border border-sky-500/30 bg-sky-500/5 shadow-sm">
          <div className="text-[11px] text-sky-600 dark:text-sky-400 font-semibold uppercase tracking-wider">
            From Friday (Copilot)
          </div>
          <div className="text-2xl font-bold text-sky-700 dark:text-sky-300 mt-1">
            {fridayCount}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800/80 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilterBrain("all")}
            className={`px-3 py-1.5 rounded-xl font-medium transition-all ${
              filterBrain === "all"
                ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            All Senders
          </button>
          <button
            onClick={() => setFilterBrain("EDITH")}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
              filterBrain === "EDITH"
                ? "bg-white dark:bg-zinc-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            EDITH ({edithCount})
          </button>
          <button
            onClick={() => setFilterBrain("FRIDAY")}
            className={`px-3 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-all ${
              filterBrain === "FRIDAY"
                ? "bg-white dark:bg-zinc-900 text-sky-600 dark:text-sky-400 shadow-sm font-semibold"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-sky-500" />
            Friday ({fridayCount})
          </button>
        </div>

        <div className="flex items-center gap-1 pr-1">
          {["all", "warning", "critical", "success", "info"].map((sev) => (
            <button
              key={sev}
              onClick={() => setFilterSeverity(sev)}
              className={`px-2.5 py-1 rounded-lg text-[11px] capitalize transition-all ${
                filterSeverity === sev
                  ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white font-bold shadow-sm"
                  : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-16 text-center rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 space-y-2">
            <Bell className="w-10 h-10 mx-auto text-gray-300 dark:text-zinc-600" />
            <p className="text-sm font-medium">No notifications matching this filter.</p>
            <p className="text-xs text-gray-500">
              Both EDITH and Friday continuously monitor WhatsApp customer conversations, business policies, and platform operations and will notify you proactively.
            </p>
          </div>
        ) : (
          filtered.map((item) => {
            const isEdith = item.sender_brain === "EDITH";
            const isWarning = item.severity === "warning";
            const isCritical = item.severity === "critical";
            const isSuccess = item.severity === "success";

            return (
              <div
                key={item.id}
                className={`p-4 sm:p-5 rounded-3xl border transition-all duration-200 shadow-sm ${
                  !item.is_read
                    ? isCritical
                      ? "border-rose-500/40 bg-rose-500/5 dark:bg-rose-950/20"
                      : isWarning
                      ? "border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20"
                      : isSuccess
                      ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/20"
                      : "border-sky-500/40 bg-sky-500/5 dark:bg-sky-950/20"
                    : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 opacity-80"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 mt-0.5 ${
                        isEdith
                          ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                          : "bg-sky-500/20 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {isEdith ? "🟢" : "🔵"}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            isEdith
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                          }`}
                        >
                          {item.sender_brain}
                        </span>

                        <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-300">
                          {item.category.replace(/_/g, " ")}
                        </span>

                        {!item.is_read && (
                          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                        )}

                        <h3 className="font-bold text-sm text-gray-900 dark:text-white">
                          {item.title}
                        </h3>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed">
                        {item.content}
                      </p>

                      <div className="pt-2 flex items-center gap-4 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {item.created_at ? new Date(item.created_at).toLocaleString() : "Recently"}
                        </span>

                        {item.action_url && (
                          <Link
                            href={item.action_url}
                            className="text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 font-medium"
                          >
                            Open Action
                            <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!item.is_read && (
                      <button
                        onClick={() => markAsRead(item.id)}
                        className="p-2 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-zinc-800 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="p-2 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors"
                      title="Dismiss notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
