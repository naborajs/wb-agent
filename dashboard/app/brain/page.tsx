"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Bot,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  ThumbsDown,
  Info,
  Sliders,
  ChevronRight,
  Code2,
  Search,
  FileCode,
  Activity,
  Terminal,
  Volume2,
  Mic,
  ExternalLink,
} from "lucide-react";

interface InterBrainMessageItem {
  id: string;
  conversation_id?: string;
  sender_brain: "FRIDAY" | "EDITH";
  recipient_brain: "EDITH" | "FRIDAY";
  message_type: string;
  content: string;
  decision?: string;
  reasoning?: string;
  metadata_payload?: any;
  created_at?: string;
}

interface DiagnosticsData {
  status: string;
  business_name: string;
  business_industry: string;
  active_models: {
    friday: string;
    edith: string;
    output_guardrail?: string;
  };
  database_tables: Record<string, number>;
}

export default function DualBrainPage() {
  const [messages, setMessages] = useState<InterBrainMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "debriefs">("all");
  const [customTask, setCustomTask] = useState("");
  const [targetPhone, setTargetPhone] = useState("+91 98001 23456");
  const [requestedDiscount, setRequestedDiscount] = useState<number | undefined>(undefined);
  const [executing, setExecuting] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<any | null>(null);
  const [busStatusText, setBusStatusText] = useState<string>("Bus Connected");
  const [busConnected, setBusConnected] = useState(false);

  // Codebase Self-Inspection & Diagnostics State
  const [inspectTab, setInspectTab] = useState<"diagnostics" | "read" | "search" | "diagnose">("diagnostics");
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsData | null>(null);
  const [codePath, setCodePath] = useState("backend/app/brain/inter_brain_bus.py");
  const [codeSnippet, setCodeSnippet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("GEMINI_MODEL");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [tracebackInput, setTracebackInput] = useState(
    'AttributeError: \'Order\' object has no attribute \'total_cents\' in File "backend/app/api/routes/orders.py", line 167'
  );
  const [diagnosisResult, setDiagnosisResult] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Helper for resilient WebSocket URL resolution
  const getWsUrl = () => {
    const host = typeof window !== "undefined" ? (window.location.hostname || "127.0.0.1") : "127.0.0.1";
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${host}:8000/api/v1/ws?org_id=org_default`;
  };

  // Fetch initial dialogue history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/brain/dialogues?limit=50");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.dialogues)) {
          setMessages(data.dialogues);
          setBusStatusText(`Bus Synced (${data.dialogues.length} dialogues)`);
        }
      }
    } catch (err) {
      console.debug("Failed to fetch dialogues:", err);
      setBusStatusText("Bus Sync Pending");
    } finally {
      setLoading(false);
    }
  };

  // Fetch system diagnostics
  const fetchDiagnostics = async () => {
    try {
      setInspectLoading(true);
      const res = await fetch("/api/v1/brain/diagnostics");
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (err) {
      console.debug("Failed to fetch diagnostics:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Read code file
  const handleReadCode = async (path: string) => {
    try {
      setInspectLoading(true);
      setCodeSnippet(null);
      const res = await fetch("/api/v1/brain/code/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, start_line: 1, end_line: 75 }),
      });
      if (res.ok) {
        const data = await res.json();
        setCodeSnippet(data.lines_with_numbers);
      } else {
        const err = await res.json();
        setCodeSnippet(`Error reading file: ${err.detail || "File not found"}`);
      }
    } catch (err: any) {
      setCodeSnippet(`Error: ${err.message}`);
    } finally {
      setInspectLoading(false);
    }
  };

  // Search codebase
  const handleSearchCode = async () => {
    if (!searchQuery.trim()) return;
    try {
      setInspectLoading(true);
      setSearchResults([]);
      const res = await fetch("/api/v1/brain/code/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), directory: "backend/app", max_results: 15 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
      }
    } catch (err) {
      console.debug("Search failed:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Diagnose traceback
  const handleDiagnoseError = async () => {
    if (!tracebackInput.trim()) return;
    try {
      setInspectLoading(true);
      setDiagnosisResult(null);
      const res = await fetch("/api/v1/brain/code/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error_message: tracebackInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnosisResult(data);
      }
    } catch (err) {
      console.debug("Diagnosis failed:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchDiagnostics();

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectBusWs = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket(getWsUrl());
        ws.onopen = () => {
          if (!isMounted) return;
          setBusConnected(true);
          setBusStatusText("Bus Real-Time Stream Active");
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === "inter_brain_message" && payload.data) {
              const newMsg: InterBrainMessageItem = {
                id: payload.data.id || Math.random().toString(),
                sender_brain: payload.data.sender_brain,
                recipient_brain: payload.data.recipient_brain,
                message_type: payload.data.message_type,
                content: payload.data.content,
                decision: payload.data.decision,
                reasoning: payload.data.reasoning,
                metadata_payload: payload.data.metadata,
                created_at: payload.data.created_at || new Date().toISOString(),
              };
              setMessages((prev) => [newMsg, ...prev]);
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (!isMounted) return;
          setBusConnected(false);
          setBusStatusText("Bus Reconnecting...");
          reconnectTimeout = setTimeout(connectBusWs, 4000);
        };
        ws.onerror = () => {
          if (!isMounted) return;
          setBusConnected(false);
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        if (!isMounted) return;
        setBusConnected(false);
        reconnectTimeout = setTimeout(connectBusWs, 4000);
      }
    };

    connectBusWs();

    return () => {
      isMounted = false;
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  // Execute task request to EDITH
  const runTaskRequest = async (taskText: string, phone?: string, discount?: number) => {
    setExecuting(true);
    setLastVerdict(null);
    try {
      const res = await fetch("/api/v1/brain/request-edith", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: taskText,
          target_phone: phone,
          requested_discount: discount,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setLastVerdict(data);
        await fetchHistory();
      }
    } catch (err) {
      console.error("Task dispatch failed:", err);
    } finally {
      setExecuting(false);
    }
  };

  // Trigger test debrief from EDITH to Friday
  const runTestDebrief = async (category: "RUDE_CUSTOMER" | "KNOWLEDGE_GAP") => {
    setExecuting(true);
    try {
      const details =
        category === "RUDE_CUSTOMER"
          ? {
              phone: "+91 98765 43210",
              customer_message: "Your minimum order quantity is completely unreasonable! Give me 5kg or shut up!",
              sentiment_score: -0.9,
            }
          : {
              phone: "+91 88888 12345",
              topic: "International Air Freight & Halal Export Certification",
              customer_message: "Do you supply Halal-certified products with CIF air delivery to Dubai?",
            };

      await fetch("/api/v1/brain/edith-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details }),
      });
      await fetchHistory();
    } catch (err) {
      console.error("Debrief failed:", err);
    } finally {
      setExecuting(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (activeTab === "requests") return m.message_type === "TASK_REQUEST" || m.message_type === "TASK_RESPONSE";
    if (activeTab === "debriefs") return m.message_type === "DEBRIEF" || m.message_type === "FEATURE_REQUEST";
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-teal-500/5 to-purple-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              Collaborative Intelligence Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Dual-Brain Operating System: FRIDAY & EDITH
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Two independent AI brains working in tandem. <strong className="text-sky-600 dark:text-sky-400">Friday (Google Gemini 3.1 Flash Live Preview)</strong> serves as your direct executive web copilot, voice agent, and UI orchestrator, while <strong className="text-emerald-600 dark:text-emerald-400">EDITH (NVIDIA NIM)</strong> autonomously executes WhatsApp client negotiations, commercial pricing, and objection handling with independent agency and refusal authority.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${busConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-gray-700 dark:text-gray-300">{busStatusText}</span>
            </div>

            <button
              onClick={fetchHistory}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-sky-500" : ""}`} />
              Refresh Bus
            </button>
          </div>
        </div>

        {/* Unified Copilot Banner: Friday is available across the full site */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Friday Copilot is Active Site-Wide
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Voice + Text + Live DOM Execution
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                You can speak or chat with Friday anytime using the floating copilot widget anchored at the bottom-right corner of every page!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const el = document.querySelector('button[aria-label*="voice" i], button[aria-label*="chat" i], .fixed.bottom-6.right-6 button') as HTMLButtonElement | null;
              if (el) el.click();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 self-start sm:self-auto"
          >
            <Mic className="w-3.5 h-3.5" />
            Open Friday Floating Copilot
          </button>
        </div>

        {/* Brain Identity Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          {/* Friday Brain */}
          <div className="p-5 rounded-2xl border border-sky-500/30 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
                  🔵
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    FRIDAY
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                      Executive Copilot
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">gemini-3.1-flash-live-preview</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Live Multimodal & Function Calling
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Direct personal copilot to the operator. Accessible across the entire website via the floating voice/text assistant widget at the bottom right. Inspects codebase, diagnoses errors, explains metrics, and delegates commercial tasks to EDITH.
            </p>

            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Model: <strong className="text-gray-700 dark:text-gray-300">gemini-3.1-flash-live-preview</strong></span>
              <span>Capabilities: <strong className="text-sky-600 dark:text-sky-400">Audio, Live API, Thinking</strong></span>
            </div>
          </div>

          {/* EDITH Brain */}
          <div className="p-5 rounded-2xl border border-emerald-500/30 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-md shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-lg">
                  🟢
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                    EDITH
                    <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      Commercial Closer
                    </span>
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Powered by NVIDIA NIM (Llama 3.3 / Nemotron)</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Independent Agency
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Commercial closer managing external WhatsApp client negotiations. Possesses independent judgment to evaluate Friday's requests, <strong>accept or deny with reasons & strategic suggestions</strong>, and post emotional debriefs.
            </p>

            <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
              <span>Self-Identity: <strong className="text-gray-700 dark:text-gray-300">EDITH</strong></span>
              <span>Role: WhatsApp Sales Engine</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Bench & Codebase Self-Inspection (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Test Bench Card */}
          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Inter-Brain Test Bench
              </h3>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">Test Agency & Refusal</span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Send instructions from Friday to EDITH and observe EDITH's independent evaluation against pricing policies, discount thresholds, and anti-spam intervals.
            </p>

            {/* Quick Preset Buttons */}
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Test Presets
              </span>
              <div className="grid grid-cols-1 gap-2">
                <button
                  onClick={() =>
                    runTaskRequest(
                      "Please send a special promo with 35% discount to this client.",
                      "+91 98001 23456",
                      35.0
                    )
                  }
                  disabled={executing}
                  className="w-full text-left p-3 rounded-2xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors text-xs space-y-1"
                >
                  <div className="font-semibold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
                    <XCircle className="w-3.5 h-3.5 shrink-0" />
                    Test Autonomous Refusal (Excessive Discount)
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Request 35% discount (exceeds 15% threshold) → EDITH must DENY
                  </div>
                </button>

                <button
                  onClick={() =>
                    runTaskRequest(
                      "Please dispatch our verified commercial tier catalog and standard 10% volume discount quote to the client.",
                      "+91 98001 99999",
                      10.0
                    )
                  }
                  disabled={executing}
                  className="w-full text-left p-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-xs space-y-1"
                >
                  <div className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Test Autonomous Approval (Valid Policy)
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    Request 10% commercial tier → EDITH evaluates and ACCEPTS
                  </div>
                </button>

                <button
                  onClick={() => runTestDebrief("RUDE_CUSTOMER")}
                  disabled={executing}
                  className="w-full text-left p-3 rounded-2xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors text-xs space-y-1"
                >
                  <div className="font-semibold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    Test Emotional Debrief (Rude Tone Alert)
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    EDITH encounters hostile tone on WhatsApp → debriefs Friday
                  </div>
                </button>

                <button
                  onClick={() => runTestDebrief("KNOWLEDGE_GAP")}
                  disabled={executing}
                  className="w-full text-left p-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors text-xs space-y-1"
                >
                  <div className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Test Autonomous Feature Gap Notification
                  </div>
                  <div className="text-[11px] text-gray-500 dark:text-gray-400">
                    EDITH notices missing knowledge doc → asks Friday to request it
                  </div>
                </button>
              </div>
            </div>

            {/* Custom Interactive Delegation Input */}
            <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-3">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Delegate Custom Task from Friday
              </span>

              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="Target Phone"
                  className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <input
                  type="number"
                  value={requestedDiscount ?? ""}
                  onChange={(e) => setRequestedDiscount(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="Discount % (e.g. 20)"
                  className="text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="e.g. Reach out to Ramesh and offer 25% discount"
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={() => runTaskRequest(customTask, targetPhone, requestedDiscount)}
                  disabled={executing || !customTask.trim()}
                  className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-40 transition-colors shrink-0"
                >
                  {executing ? "Evaluating..." : "Delegate"}
                </button>
              </div>
            </div>

            {/* Latest Verdict Feedback Alert */}
            {lastVerdict && (
              <div
                className={`p-4 rounded-2xl border text-xs leading-relaxed animate-in fade-in slide-in-from-top-2 ${
                  lastVerdict.decision === "DENIED"
                    ? "border-rose-500/30 bg-rose-500/10 text-rose-800 dark:text-rose-300"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-800 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  {lastVerdict.decision === "DENIED" ? (
                    <XCircle className="w-4 h-4 text-rose-500" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  )}
                  EDITH Verdict: {lastVerdict.decision}
                </div>
                <p>{lastVerdict.reasoning}</p>
                {lastVerdict.suggestion && (
                  <p className="mt-2 pt-2 border-t border-rose-500/20 dark:border-rose-500/30 font-medium text-[11px] text-amber-800 dark:text-amber-300">
                    💡 {lastVerdict.suggestion}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Codebase Self-Inspection & Diagnostics Studio */}
          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-500" />
                Codebase Self-Inspection & Diagnostics
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Live Agent APIs
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Friday and EDITH have direct live API access to inspect their backend, search symbols, diagnose runtime tracebacks, and monitor database row counts.
            </p>

            {/* Studio Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-[11px] font-medium">
              <button
                onClick={() => setInspectTab("diagnostics")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "diagnostics"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Health
              </button>
              <button
                onClick={() => setInspectTab("read")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "read"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Inspect
              </button>
              <button
                onClick={() => setInspectTab("search")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "search"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Search
              </button>
              <button
                onClick={() => setInspectTab("diagnose")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "diagnose"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Diagnose
              </button>
            </div>

            {/* Tab 1: System Health & Database Counts */}
            {inspectTab === "diagnostics" && (
              <div className="space-y-3 pt-2">
                {diagnosticsData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                        <div className="text-[10px] text-gray-400">System Status</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {diagnosticsData.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                        <div className="text-[10px] text-gray-400">Industry & Org</div>
                        <div className="font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                          {diagnosticsData.business_industry}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-1.5">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Active Agent Models
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-200">
                        • <strong>Friday:</strong> {diagnosticsData.active_models.friday}
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-200">
                        • <strong>EDITH:</strong> {diagnosticsData.active_models.edith}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-1.5">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Database Table Records
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        {Object.entries(diagnosticsData.database_tables).map(([tbl, cnt]) => (
                          <div key={tbl} className="flex justify-between py-0.5 border-b border-gray-200/40 dark:border-zinc-700/40">
                            <span className="capitalize">{tbl.replace(/_/g, " ")}:</span>
                            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{cnt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-4 text-center">Loading system diagnostics...</div>
                )}

                <button
                  onClick={fetchDiagnostics}
                  disabled={inspectLoading}
                  className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {inspectLoading ? "Refreshing..." : "Re-check System Health"}
                </button>
              </div>
            )}

            {/* Tab 2: Code File Reader */}
            {inspectTab === "read" && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codePath}
                    onChange={(e) => setCodePath(e.target.value)}
                    placeholder="Relative path (e.g. backend/app/config.py)"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    onClick={() => handleReadCode(codePath)}
                    disabled={inspectLoading}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Read
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {["backend/app/config.py", "backend/app/brain/inter_brain_bus.py", "backend/app/ai/router.py"].map(
                    (preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setCodePath(preset);
                          handleReadCode(preset);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      >
                        {preset.split("/").pop()}
                      </button>
                    )
                  )}
                </div>

                {codeSnippet && (
                  <pre className="p-3 rounded-xl bg-zinc-950 text-sky-300 text-[11px] font-mono overflow-x-auto max-h-56 overflow-y-auto leading-tight border border-zinc-800">
                    {codeSnippet}
                  </pre>
                )}
              </div>
            )}

            {/* Tab 3: Code Search */}
            {inspectTab === "search" && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pattern or symbol..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    onClick={handleSearchCode}
                    disabled={inspectLoading}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Search
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {searchResults.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 text-xs font-mono"
                      >
                        <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                          {m.file}:{m.line_number}
                        </div>
                        <div className="text-[11px] text-gray-700 dark:text-gray-300 truncate mt-0.5">
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Error Traceback Diagnoser */}
            {inspectTab === "diagnose" && (
              <div className="space-y-3 pt-2">
                <textarea
                  value={tracebackInput}
                  onChange={(e) => setTracebackInput(e.target.value)}
                  placeholder="Paste Python error message or traceback..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />

                <button
                  onClick={handleDiagnoseError}
                  disabled={inspectLoading}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                >
                  {inspectLoading ? "Analyzing..." : "Diagnose Root Cause"}
                </button>

                {diagnosisResult && (
                  <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-2">
                    <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Root-Cause Analysis
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[11px]">
                      {diagnosisResult.diagnosis}
                    </p>
                    {diagnosisResult.identified_file && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        Identified: {diagnosisResult.identified_file} (Line {diagnosisResult.identified_line})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Inter-Brain Thought Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Filter Tabs */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-xs font-medium">
              <button
                onClick={() => setActiveTab("all")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "all"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                All Dialogues ({messages.length})
              </button>
              <button
                onClick={() => setActiveTab("requests")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "requests"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Tasks & Refusals
              </button>
              <button
                onClick={() => setActiveTab("debriefs")}
                className={`px-3 py-1.5 rounded-xl transition-all ${
                  activeTab === "debriefs"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Debriefs & Gaps
              </button>
            </div>

            <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              Live Stream
            </span>
          </div>

          {/* Timeline Stream */}
          <div className="space-y-3.5">
            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 space-y-2">
                <Cpu className="w-8 h-8 mx-auto text-gray-300 dark:text-zinc-600" />
                <p className="text-sm font-medium">No inter-brain messages recorded yet.</p>
                <p className="text-xs text-gray-500">
                  Use the test bench on the left to delegate tasks to EDITH or trigger customer debriefs.
                </p>
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isFriday = msg.sender_brain === "FRIDAY";
                const isDenied = msg.decision === "DENIED";
                const isAccepted = msg.decision === "ACCEPTED";
                const isDebrief = msg.message_type === "DEBRIEF";
                const isFeatureGap = msg.message_type === "FEATURE_REQUEST";

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-3xl border transition-all duration-200 shadow-sm ${
                      isDenied
                        ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                        : isDebrief
                        ? "border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20"
                        : isFeatureGap
                        ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                        : isAccepted
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            isFriday
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          }`}
                        >
                          {msg.sender_brain} → {msg.recipient_brain}
                        </span>

                        <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          {msg.message_type.replace(/_/g, " ")}
                        </span>

                        {msg.decision && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isDenied
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                : isAccepted
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                            }`}
                          >
                            {isDenied && <XCircle className="w-3 h-3" />}
                            {isAccepted && <CheckCircle2 className="w-3 h-3" />}
                            {msg.decision}
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : "Just now"}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                      {msg.content}
                    </div>

                    {/* Reasoning Rationale */}
                    {msg.reasoning && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                        <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-gray-700 dark:text-gray-200">
                            Independent Rationale:{" "}
                          </strong>
                          {msg.reasoning}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
