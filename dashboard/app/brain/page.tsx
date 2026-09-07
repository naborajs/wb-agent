"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardShell from "@/components/DashboardShell";
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

export default function DualBrainPage() {
  const [messages, setMessages] = useState<InterBrainMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "debriefs">("all");
  const [customTask, setCustomTask] = useState("");
  const [targetPhone, setTargetPhone] = useState("+91 98001 23456");
  const [requestedDiscount, setRequestedDiscount] = useState<number | undefined>(undefined);
  const [executing, setExecuting] = useState(false);
  const [lastVerdict, setLastVerdict] = useState<any | null>(null);

  // Direct chat with Friday
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatResponses, setChatResponses] = useState<
    Array<{ speaker: string; text: string; consulted_edith?: boolean; timestamp: string }>
  >([
    {
      speaker: "Friday",
      text: "Hello! I am Friday, your personal executive web assistant. My partner AI brain EDITH manages our external WhatsApp sales and negotiations. How can I assist you today?",
      timestamp: "Just now",
    },
  ]);

  const streamEndRef = useRef<HTMLDivElement>(null);

  // Fetch initial dialogue history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:8000/api/v1/brain/dialogues?limit=40");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.dialogues)) {
          setMessages(data.dialogues);
        }
      }
    } catch (err) {
      console.debug("Failed to fetch dialogues:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();

    // Listen to real-time Inter-Brain WebSocket events
    let ws: WebSocket | null = null;
    try {
      ws = new WebSocket("ws://localhost:8000/api/v1/ws/org_default");
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
    } catch (e) {}

    return () => {
      if (ws) ws.close();
    };
  }, []);

  // Execute task request to EDITH
  const runTaskRequest = async (taskText: string, phone?: string, discount?: number) => {
    setExecuting(true);
    setLastVerdict(null);
    try {
      const res = await fetch("http://localhost:8000/api/v1/brain/request-edith", {
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
              customer_message: "Your minimum order quantity is completely stupid and useless! Give me 5kg or shut up!",
              sentiment_score: -0.9,
            }
          : {
              phone: "+91 88888 12345",
              topic: "International Air Freight & Halal Export Certification",
              customer_message: "Do you supply Halal-certified products with CIF air delivery to Dubai?",
            };

      await fetch("http://localhost:8000/api/v1/brain/edith-debrief", {
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

  // Send direct question to Friday
  const sendFridayChat = async () => {
    const text = chatPrompt.trim();
    if (!text || chatLoading) return;

    setChatPrompt("");
    setChatLoading(true);

    const userEntry = { speaker: "Operator", text, timestamp: "Just now" };
    setChatResponses((prev) => [...prev, userEntry]);

    try {
      const res = await fetch("http://localhost:8000/api/v1/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatResponses((prev) => [
          ...prev,
          {
            speaker: "Friday",
            text: data.reply,
            consulted_edith: data.consulted_edith,
            timestamp: new Date().toLocaleTimeString(),
          },
        ]);
        if (data.consulted_edith) {
          fetchHistory();
        }
      }
    } catch (err) {
      console.error("Friday chat failed:", err);
    } finally {
      setChatLoading(false);
    }
  };

  const filteredMessages = messages.filter((m) => {
    if (activeTab === "requests") return m.message_type === "TASK_REQUEST" || m.message_type === "TASK_RESPONSE";
    if (activeTab === "debriefs") return m.message_type === "DEBRIEF" || m.message_type === "FEATURE_REQUEST";
    return true;
  });

  return (
    <DashboardShell>
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
                Two independent AI brains working in tandem. <strong className="text-sky-600 dark:text-sky-400">Friday (Google Gemini)</strong> serves as your personal executive web assistant and UI copilot, while <strong className="text-emerald-600 dark:text-emerald-400">EDITH (NVIDIA NIM)</strong> autonomously executes WhatsApp sales, consultative discoveries, and deterministic negotiations with independent agency and refusal authority.
              </p>
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

          {/* Brain Identity Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
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
                    <p className="text-xs text-gray-500 dark:text-gray-400">Powered by Google Gemini 2.5 Flash</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Active Web Assistant
                </div>
              </div>

              <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
                Direct personal assistant to the operator. Embedded in browser voice and dashboard controls, executes DOM actions, explains business metrics, and delegates commercial tasks to EDITH.
              </p>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Self-Identity: <strong className="text-gray-700 dark:text-gray-300">Friday</strong></span>
                <span>Role: Direct Web Assistant</span>
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
                Commercial closer managing external WhatsApp client negotiations. Possesses independent judgment to evaluate Friday's requests, <strong>accept or deny with reasons</strong>, and post emotional debriefs.
              </p>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span>Self-Identity: <strong className="text-gray-700 dark:text-gray-300">EDITH</strong></span>
                <span>Role: WhatsApp Sales Engine</span>
              </div>
            </div>
          </div>
        </div>

        {/* Dual Grid: Left = Inter-Brain Test Bench & Friday Chat, Right = Live Thought Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Interactive Test Bench (5 Cols) */}
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
                        "Offer 35% discount to lead for immediate order placement",
                        "+91 98001 23456",
                        35.0
                      )
                    }
                    disabled={executing}
                    className="w-full text-left p-3 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 transition-colors flex items-start gap-3"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs text-rose-700 dark:text-rose-400 block">
                        Test Autonomous Refusal (Excessive Discount)
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        Request 35% discount (exceeds 15% threshold) → EDITH must DENY
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() =>
                      runTaskRequest(
                        "Send commercial quote for 200 units with standard 10% volume discount",
                        "+91 98001 23456",
                        10.0
                      )
                    }
                    disabled={executing}
                    className="w-full text-left p-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors flex items-start gap-3"
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs text-emerald-700 dark:text-emerald-400 block">
                        Test Autonomous Approval (Valid Policy)
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        Request 10% commercial tier → EDITH evaluates and ACCEPTS
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => runTestDebrief("RUDE_CUSTOMER")}
                    disabled={executing}
                    className="w-full text-left p-3 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 transition-colors flex items-start gap-3"
                  >
                    <ThumbsDown className="w-4 h-4 text-purple-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs text-purple-700 dark:text-purple-400 block">
                        Test Emotional Debrief (Rude Customer)
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        EDITH shares reflection with Friday about an aggressive client
                      </span>
                    </div>
                  </button>

                  <button
                    onClick={() => runTestDebrief("KNOWLEDGE_GAP")}
                    disabled={executing}
                    className="w-full text-left p-3 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 transition-colors flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-xs text-amber-700 dark:text-amber-400 block">
                        Test Feature Gap Request (Missing Knowledge)
                      </span>
                      <span className="text-[11px] text-gray-500 dark:text-gray-400">
                        EDITH alerts Friday about unsupported documentation/feature
                      </span>
                    </div>
                  </button>
                </div>
              </div>

              {/* Custom Dispatch Form */}
              <div className="space-y-3 pt-3 border-t border-gray-100 dark:border-zinc-800">
                <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Custom Task Delegation
                </span>
                <input
                  type="text"
                  value={customTask}
                  onChange={(e) => setCustomTask(e.target.value)}
                  placeholder="e.g., Send promo with 12% discount to cafe owner"
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={targetPhone}
                    onChange={(e) => setTargetPhone(e.target.value)}
                    placeholder="Recipient Phone"
                    className="w-2/3 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none"
                  />
                  <button
                    onClick={() => runTaskRequest(customTask, targetPhone, requestedDiscount)}
                    disabled={executing || !customTask.trim()}
                    className="w-1/3 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-all disabled:opacity-40"
                  >
                    {executing ? "Thinking..." : "Delegate"}
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
                </div>
              )}
            </div>

            {/* Direct Talk With Friday (Chat Drawer) */}
            <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <Bot className="w-4 h-4 text-sky-500" />
                  Speak Directly With Friday
                </h3>
                <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">Gemini 2.5</span>
              </div>

              <div className="h-56 overflow-y-auto space-y-3 p-3 rounded-2xl bg-gray-50 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800 text-xs">
                {chatResponses.map((item, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      item.speaker === "Friday" ? "items-start" : "items-end"
                    }`}
                  >
                    <span className="text-[10px] text-gray-400 font-medium mb-0.5">
                      {item.speaker} • {item.timestamp}
                    </span>
                    <div
                      className={`max-w-[88%] p-3 rounded-2xl leading-relaxed shadow-sm ${
                        item.speaker === "Friday"
                          ? "bg-white dark:bg-zinc-800 text-gray-900 dark:text-white border border-gray-100 dark:border-zinc-700"
                          : "bg-sky-600 text-white"
                      }`}
                    >
                      {item.text}
                      {item.consulted_edith && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-200/50 dark:border-zinc-700/50 text-[10px] text-sky-600 dark:text-sky-400 font-medium flex items-center gap-1">
                          <Zap className="w-3 h-3" />
                          Consulted partner EDITH across Inter-Brain Bus
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Chat Input */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={chatPrompt}
                  onChange={(e) => setChatPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") sendFridayChat();
                  }}
                  placeholder="Ask Friday: 'What is your name?' or 'How is EDITH?'"
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <button
                  onClick={sendFridayChat}
                  disabled={chatLoading || !chatPrompt.trim()}
                  className="p-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-40 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
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
                Live WebSocket Feed
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
    </DashboardShell>
  );
}
