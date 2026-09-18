"use client";

import React, { useEffect, useState } from "react";
import { Activity, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react";

interface SystemInfo {
  platform: {
    os: string;
    python_version: string;
  };
  service: {
    name: string;
    environment: string;
    uptime_seconds: number;
  };
  configuration: {
    agent_name: string;
    ai_model: string;
    whatsapp_provider: string;
  };
}

export const SystemHealthBadge: React.FC = () => {
  const [status, setStatus] = useState<"online" | "degraded" | "offline">("online");
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const fetchHealth = async () => {
    try {
      const res = await fetch("/api/v1/system/info");
      if (res.ok) {
        const data = await res.json();
        setInfo(data);
        setStatus("online");
      } else {
        setStatus("degraded");
      }
    } catch {
      setStatus("offline");
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => clearInterval(interval);
  }, []);

  const formatUptime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m ${Math.floor(seconds % 60)}s`;
  };

  return (
    <div className="relative inline-block text-left">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className={`flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
          status === "online"
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-800/50"
            : status === "degraded"
            ? "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-800/50"
            : "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:border-rose-800/50"
        }`}
        title="Click for platform diagnostics"
      >
        <span className="relative flex h-2 w-2">
          {status === "online" && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          )}
          <span
            className={`relative inline-flex rounded-full h-2 w-2 ${
              status === "online" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : "bg-rose-500"
            }`}
          />
        </span>
        <span className="font-semibold uppercase tracking-wider text-[10px]">
          {status === "online" ? "Online" : status === "degraded" ? "Degraded" : "Offline"}
        </span>
      </button>

      {showDetails && (
        <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 p-3 z-50 text-xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-2">
            <span className="font-semibold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-indigo-500" />
              Diagnostics
            </span>
            <button
              onClick={fetchHealth}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
              title="Refresh"
            >
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>

          {info ? (
            <div className="space-y-1.5 text-slate-600 dark:text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-400">Agent:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {info.configuration.agent_name}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Model:</span>
                <span className="font-mono text-[11px] text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                  {info.configuration.ai_model}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Channel:</span>
                <span className="font-medium capitalize text-slate-800 dark:text-slate-200">
                  {info.configuration.whatsapp_provider}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">
                  {formatUptime(info.service.uptime_seconds)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Environment:</span>
                <span className="font-medium capitalize text-slate-800 dark:text-slate-200">
                  {info.service.environment}
                </span>
              </div>
            </div>
          ) : (
            <p className="text-slate-400 text-center py-2">Loading diagnostics...</p>
          )}
        </div>
      )}
    </div>
  );
};
