"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  Flame,
  User,
  Bot,
  Send,
  Pause,
  Play,
  Building,
  Phone,
  Tag,
  RefreshCw,
  Sparkles,
  MapPin,
  Calendar,
  CheckCircle,
  Plus,
  AlertTriangle,
  X,
  FileCheck,
  ExternalLink,
  Volume2,
  VolumeX,
  Mic,
  Radio,
} from "lucide-react";

interface ConversationItem {
  id: string;
  customer_id: string;
  channel: string;
  channel_id: string;
  mode: string;
  sales_stage: string;
  lead_score: number;
  is_hot: boolean;
  unread_count: number;
  last_message_at: string;
  customer_name?: string;
  company_name?: string;
}

interface Message {
  id: string;
  direction: string;
  sender_type: string;
  content: string;
  delivery_status: string;
  reported?: boolean;
  correction_category?: string;
  corrected_text?: string;
  created_at: string;
}

export default function LiveInboxPage() {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string>("");
  const [activeConvDetail, setActiveConvDetail] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isSimulatingCustomer, setIsSimulatingCustomer] = useState(false);
  const [waStatus, setWaStatus] = useState<{ connected: boolean; pairingCode?: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // New Chat Modal State
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newName, setNewName] = useState("");
  const [newCompany, setNewCompany] = useState("");
  const [newInitialMsg, setNewInitialMsg] = useState("");
  const [isInitiating, setIsInitiating] = useState(false);

  // Report Response Modal State
  const [reportingMessage, setReportingMessage] = useState<Message | null>(null);
  const [reportCategory, setReportCategory] = useState("wrong_price");
  const [reportExplanation, setReportExplanation] = useState("");
  const [reportCorrectedText, setReportCorrectedText] = useState("");
  const [reportIsKnowledge, setReportIsKnowledge] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Active conversation object
  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Real-Time WebSocket & Audio Notification State (R3)
  const [wsConnected, setWsConnected] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isTranscribingAudio, setIsTranscribingAudio] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Web Audio Synthesizer Chime
  const playChime = (type: "hot" | "normal" = "normal") => {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "hot") {
        osc.type = "triangle";
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.18, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Audio chime prevented by browser audio policy:", e);
    }
  };

  // Load conversations from backend
  const loadConversations = () => {
    fetch("/api/v1/conversations")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data && Array.isArray(data.items)) {
          setConversations(data.items);
          setActiveConvId((curr) => {
            if (!curr || !data.items.some((c: any) => c.id === curr)) {
              return data.items.length > 0 ? data.items[0].id : "";
            }
            return curr;
          });
        }
      })
      .catch((err) => console.error("Error loading conversations:", err));
  };

  // Poll conversations list every 3 seconds (fallback if WS reconnecting)
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 4000);
    return () => clearInterval(interval);
  }, []);

  // Persistent WebSocket stream for live inbox events (R3)
  useEffect(() => {
    if (typeof window === "undefined") return;
    let ws: WebSocket | null = null;
    let reconnectTimer: any = null;

    const connectWebSocket = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname || "localhost";
      const wsUrl = `${protocol}//${host}:8000/api/v1/ws/conversations`;

      try {
        ws = new WebSocket(wsUrl);

        ws.onopen = () => {
          setWsConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            loadConversations();
            if (activeConvId) {
              fetch(`/api/v1/conversations/${activeConvId}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => d && setActiveConvDetail(d))
                .catch(() => {});
            }

            if (data?.is_hot || (data?.lead_score && data.lead_score >= 80)) {
              playChime("hot");
            } else if (data?.type === "message" || data?.event === "message_received") {
              playChime("normal");
            }
          } catch {
            // Keep-alive or non-json message
          }
        };

        ws.onclose = () => {
          setWsConnected(false);
          reconnectTimer = setTimeout(connectWebSocket, 4000);
        };

        ws.onerror = () => {
          ws?.close();
        };
      } catch {
        reconnectTimer = setTimeout(connectWebSocket, 5000);
      }
    };

    connectWebSocket();
    return () => {
      if (ws) ws.close();
      if (reconnectTimer) clearTimeout(reconnectTimer);
    };
  }, [activeConvId, soundEnabled]);

  // Poll active conversation details every 2 seconds
  useEffect(() => {
    if (!activeConvId) {
      setActiveConvDetail(null);
      return;
    }

    const loadDetail = () => {
      fetch(`/api/v1/conversations/${activeConvId}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) setActiveConvDetail(data);
        })
        .catch(() => {});
    };

    loadDetail();
    const interval = setInterval(loadDetail, 2000);
    return () => clearInterval(interval);
  }, [activeConvId]);

  // Scroll to bottom whenever messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeConvDetail?.messages]);

  // Monitor WhatsApp Bridge Connection
  useEffect(() => {
    const checkWa = () => {
      fetch("http://localhost:3001/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setWaStatus(data))
        .catch(() => setWaStatus({ connected: false }));
    };
    checkWa();
    const interval = setInterval(checkWa, 4000);
    return () => clearInterval(interval);
  }, []);

  // Handle Takeover Mode (AI <-> HUMAN)
  const handleTakeover = async (mode: string) => {
    if (!activeConvId) return;
    try {
      const res = await fetch(`/api/v1/conversations/${activeConvId}/takeover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode, reason: "Operator dashboard action" }),
      });
      if (res.ok) {
        setConversations((prev) =>
          prev.map((c) => (c.id === activeConvId ? { ...c, mode } : c))
        );
        loadConversations();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Send Message (either Operator or Simulated Customer Turn)
  const handleSendMessage = async (textOverride?: string) => {
    const textToSend = (textOverride !== undefined ? textOverride : inputText).trim();
    if (!textToSend || !activeConvId || isSending) return;
    if (textOverride === undefined) setInputText("");
    setIsSending(true);

    try {
      if (isSimulatingCustomer) {
        // Trigger live AI consultation turn
        await fetch("/api/v1/agent/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConvId,
            inbound_message: textToSend,
          }),
        });
      } else {
        // Send manual operator message
        await fetch(`/api/v1/conversations/${activeConvId}/messages`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: activeConvId,
            content: textToSend,
          }),
        });
      }
      const updated = await fetch(`/api/v1/conversations/${activeConvId}`).then(
        (r) => (r.ok ? r.json() : null)
      );
      if (updated) setActiveConvDetail(updated);
      loadConversations();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
    }
  };

  // Handle Voice Note Audio Upload (R2)
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvId) return;
    setIsTranscribingAudio(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/v1/audio/transcribe", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.transcript) {
          setInputText(data.transcript);
          if (isSimulatingCustomer) {
            await handleSendMessage(data.transcript);
          }
        }
      }
    } catch (err) {
      console.error("Audio upload error:", err);
    } finally {
      setIsTranscribingAudio(false);
      if (audioInputRef.current) audioInputRef.current.value = "";
    }
  };

  // Handle Initiate New Conversation
  const handleInitiateChat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhone.trim()) return;
    setIsInitiating(true);

    try {
      const res = await fetch("/api/v1/conversations/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: newPhone.trim(),
          name: newName.trim() || undefined,
          company_name: newCompany.trim() || undefined,
          initial_message: newInitialMsg.trim() || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setIsNewChatOpen(false);
        setNewPhone("");
        setNewName("");
        setNewCompany("");
        setNewInitialMsg("");
        loadConversations();
        if (data.conversation_id) {
          setActiveConvId(data.conversation_id);
        }
      }
    } catch (err) {
      console.error("Failed to initiate chat:", err);
    } finally {
      setIsInitiating(false);
    }
  };

  // Handle Submit Report / Correction
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportingMessage || !activeConvId || !reportExplanation.trim()) return;
    setIsSubmittingReport(true);

    try {
      const res = await fetch(
        `/api/v1/conversations/${activeConvId}/messages/${reportingMessage.id}/report`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: reportCategory,
            explanation: reportExplanation.trim(),
            corrected_text: reportCorrectedText.trim() || undefined,
            is_business_knowledge: reportIsKnowledge,
          }),
        }
      );
      if (res.ok) {
        setReportingMessage(null);
        setReportExplanation("");
        setReportCorrectedText("");
        setReportIsKnowledge(false);
        // Refresh active conversation details
        const updated = await fetch(`/api/v1/conversations/${activeConvId}`).then(
          (r) => (r.ok ? r.json() : null)
        );
        if (updated) setActiveConvDetail(updated);
      }
    } catch (err) {
      console.error("Failed to submit report:", err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterMode === "hot" && !c.is_hot) return false;
    if (filterMode === "human" && c.mode !== "HUMAN") return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (c.customer_name || "").toLowerCase().includes(term);
      const matchCompany = (c.company_name || "").toLowerCase().includes(term);
      const matchPhone = (c.channel_id || "").toLowerCase().includes(term);
      if (!matchName && !matchCompany && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] overflow-hidden shadow-sm">
      {/* 1. Left Panel: Conversation Threads */}
      <div className="w-80 border-r border-[var(--ed-border)] flex flex-col shrink-0 bg-[var(--ed-surface)]">
        {/* Search & Actions */}
        <div className="p-3 border-b border-[var(--ed-border)] space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-[var(--ed-text-muted)] absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-xs text-[var(--ed-text-primary)] placeholder-[var(--ed-text-muted)] focus:outline-none focus:ring-2 ed-focus-ring"
              />
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              title="Start New Chat by Phone"
              className="p-1.5 rounded-lg bg-[var(--ed-accent)] hover:bg-[var(--ed-accent-hover)] text-white transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 text-[11px] font-medium text-[var(--ed-text-muted)]">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === "all"
                  ? "bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold"
                  : "hover:bg-[var(--ed-bg)]"
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setFilterMode("hot")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                filterMode === "hot"
                  ? "bg-[var(--ed-danger)]/8 text-[var(--ed-danger)] font-bold"
                  : "hover:bg-[var(--ed-bg)]"
              }`}
            >
              <Flame className="w-3 h-3 text-[var(--ed-danger)]" /> Hot
            </button>
            <button
              onClick={() => setFilterMode("human")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === "human"
                  ? "bg-[var(--ed-accent)]/8 text-[var(--ed-accent)] font-bold"
                  : "hover:bg-[var(--ed-bg)]"
              }`}
            >
              Takeover
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-[var(--ed-border)]">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-[var(--ed-text-muted)]">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === activeConvId;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-3.5 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-[var(--ed-surface)] border-l-2 border-[var(--ed-accent)] shadow-sm"
                      : "hover:bg-[var(--ed-bg)] border-l-2 border-transparent"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-[var(--ed-text-primary)] truncate">
                      {c.customer_name || c.company_name || c.channel_id}
                    </span>
                    {c.is_hot && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-[var(--ed-danger)]/10 text-[var(--ed-danger)] ed-glow-badge">
                        <Flame className="w-2.5 h-2.5" /> HOT
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-[var(--ed-text-muted)] truncate mb-2">
                    {c.company_name ? `${c.company_name} • ` : ""}
                    {c.channel_id}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[var(--ed-text-muted)]">
                    <span className="px-1.5 py-0.5 rounded bg-[var(--ed-bg)] font-medium">
                      {c.sales_stage}
                    </span>
                    <span
                      className={`font-semibold ${
                        c.mode === "HUMAN"
                          ? "text-[var(--ed-accent)]"
                          : "text-[var(--ed-success)]"
                      }`}
                    >
                      {c.mode === "HUMAN" ? "● Human" : "● AI"}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* 2. Center Panel: Active Chat Timeline */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[var(--ed-border)] bg-[var(--ed-bg)]">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
            <div className="w-12 h-12 rounded-full bg-[var(--ed-bg)] flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-[var(--ed-text-muted)]" />
            </div>
            <h4 className="text-sm font-semibold text-[var(--ed-text-primary)]">
              No Conversation Selected
            </h4>
            <p className="text-xs text-[var(--ed-text-muted)] mt-1 max-w-sm">
              Select a conversation from the left inbox or start a new chat!
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 px-6 border-b border-[var(--ed-border)] bg-[var(--ed-surface)] flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-[var(--ed-text-primary)] flex items-center gap-2">
                  {activeConvDetail?.customer?.name ||
                    activeConvDetail?.customer?.company_name ||
                    activeConv.channel_id}
                  {activeConv.is_hot && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ed-danger)]/8 text-[var(--ed-danger)] border border-[var(--ed-danger)]/20">
                      <Flame className="w-3 h-3" /> Hot Lead
                    </span>
                  )}
                </h3>
                <div className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                  WhatsApp: {activeConv.channel_id}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* WebSocket Live Sync & Sound Chime (R3) */}
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--ed-border)] text-[10px] font-semibold">
                  <Radio className={`w-3 h-3 ${wsConnected ? "text-emerald-500 animate-pulse" : "text-amber-500"}`} />
                  <span className={wsConnected ? "text-emerald-500" : "text-amber-500"}>
                    {wsConnected ? "WS Live" : "Polling"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  title={soundEnabled ? "Mute Operator Chime" : "Enable Operator Chime"}
                  className={`p-1.5 rounded-lg border transition-all ${
                    soundEnabled
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
                      : "border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                  }`}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
                {activeConv.mode === "HUMAN" ? (
                  <button
                    onClick={() => handleTakeover("AI")}
                    className="ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[var(--ed-success)] hover:opacity-90 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume AI
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeover("HUMAN")}
                    className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  >
                    <Pause className="w-3.5 h-3.5" /> Take Over
                  </button>
                )}
              </div>
            </div>

            {/* WhatsApp Connection Warning Banner */}
            {waStatus && !waStatus.connected && (
              <div className="bg-[var(--ed-accent)]/10 border-b border-[var(--ed-accent)]/20 px-4 py-2 text-xs flex items-center justify-between text-[var(--ed-accent)] shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[var(--ed-accent)] animate-ping shrink-0" />
                  <span>
                    <strong>WhatsApp Disconnected:</strong> Link bot (+91 89187 53100) using code <strong className="font-mono bg-[var(--ed-accent)]/15 px-1 py-0.5 rounded">6K571G8A</strong> to chat from your phone, OR use <strong>🧪 Simulate Customer</strong> below to test AI right now!
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                  <a
                    href="http://localhost:3001/code"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-[var(--ed-accent)] dark:hover:text-white inline-flex items-center gap-0.5"
                  >
                    Pairing Code <ExternalLink className="w-3 h-3" />
                  </a>
                  <a
                    href="http://localhost:3001/qr"
                    target="_blank"
                    rel="noreferrer"
                    className="underline hover:text-[var(--ed-accent)] dark:hover:text-white inline-flex items-center gap-0.5"
                  >
                    Scan QR <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(activeConvDetail?.messages || []).map((msg: Message) => {
                const isInbound = msg.direction === "inbound";
                const isAI = !isInbound && msg.sender_type !== "human";
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isInbound ? "items-start" : "items-end"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-xs shadow-sm leading-relaxed ${
                        isInbound
                          ? "bg-[var(--ed-surface)] text-slate-900 dark:text-slate-100 border border-[var(--ed-border)] rounded-tl-sm"
                          : msg.sender_type === "human"
                          ? "ed-btn-primary text-white rounded-tr-sm"
                          : "bg-[var(--ed-surface)] border border-[var(--ed-border)] text-[var(--ed-text-primary)] rounded-tr-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1 opacity-80 text-[10px]">
                        <div className="flex items-center gap-1.5">
                          {isInbound ? (
                            <>
                              <User className="w-3 h-3" />
                              <span>Customer</span>
                            </>
                          ) : msg.sender_type === "human" ? (
                            <>
                              <User className="w-3 h-3 text-[var(--ed-text-primary)]" />
                              <span className="text-[var(--ed-text-primary)] font-semibold">
                                Operator
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-[var(--ed-success)]" />
                              <span className="text-[var(--ed-success)] font-semibold">
                                EDITH (Nemotron AI)
                              </span>
                            </>
                          )}
                        </div>

                        {/* Report & Feedback Button for AI Messages */}
                        {isAI && (
                          <div>
                            {msg.reported ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-[var(--ed-accent)] bg-amber-900/60 px-1.5 py-0.5 rounded border border-[var(--ed-accent)]/40">
                                <AlertTriangle className="w-2.5 h-2.5" /> Reported ({msg.correction_category})
                              </span>
                            ) : (
                              <button
                                onClick={() => setReportingMessage(msg)}
                                title="Report / Correct this response"
                                className="inline-flex items-center gap-1 text-[9px] opacity-70 hover:opacity-100 text-[var(--ed-accent)] hover:underline"
                              >
                                <AlertTriangle className="w-2.5 h-2.5" /> Correct
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Corrected Text Display */}
                      {msg.reported && msg.corrected_text && (
                        <div className="mt-2 pt-2 border-t border-[var(--ed-border)] text-[10px] text-[var(--ed-success)] bg-[var(--ed-success)]/10 p-1.5 rounded">
                          <span className="font-bold">Human Correction:</span> {msg.corrected_text}
                        </div>
                      )}

                      <div className="mt-1.5 text-[9px] opacity-60 text-right">
                        {new Date(msg.created_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-[var(--ed-border)] bg-[var(--ed-surface)] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--ed-text-muted)] font-medium">Chat Mode:</span>
                  <button
                    type="button"
                    onClick={() => setIsSimulatingCustomer(false)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors ${
                      !isSimulatingCustomer
                        ? "bg-[var(--ed-accent)]/12 text-[var(--ed-accent)] border border-[var(--ed-accent)]/30 shadow-sm"
                        : "text-slate-500 hover:text-[var(--ed-text-primary)]"
                    }`}
                  >
                    👤 Operator Reply
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsSimulatingCustomer(true)}
                    className={`px-2.5 py-1 rounded-md font-semibold transition-colors inline-flex items-center gap-1 ${
                      isSimulatingCustomer
                        ? "bg-purple-500/12 text-purple-500 border border-purple-500/30 shadow-sm"
                        : "text-slate-500 hover:text-[var(--ed-text-primary)]"
                    }`}
                  >
                    <Sparkles className="w-3 h-3" /> 🧪 Simulate Customer (AI Replies)
                  </button>
                </div>
                {isSimulatingCustomer && (
                  <span className="text-[10px] text-purple-500 font-semibold">
                    ⚡ EDITH will process your message and reply immediately!
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder={
                    isSimulatingCustomer
                      ? "Type customer inquiry (e.g. 'What is the price for 50kg Assam CTC for my cafe?')..."
                      : activeConv.mode === "HUMAN"
                      ? "Type manual message as Operator..."
                      : "Take over to message manually..."
                  }
                  className={`flex-1 px-4 py-2.5 rounded-lg border text-xs text-[var(--ed-text-primary)] focus:outline-none focus:ring-2 ${
                    isSimulatingCustomer
                      ? "border-purple-500/30 bg-purple-500/8 ed-focus-ring"
                      : "border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 ed-focus-ring"
                  }`}
                />
                <input
                  type="file"
                  ref={audioInputRef}
                  onChange={handleAudioUpload}
                  accept="audio/*,.ogg,.opus,.mp3,.wav"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => audioInputRef.current?.click()}
                  disabled={isTranscribingAudio || isSending}
                  title="Upload WhatsApp Voice Note (.ogg, .opus, .mp3)"
                  className={`p-2.5 rounded-xl border border-[var(--ed-border)] hover:border-purple-500/50 hover:bg-purple-500/10 text-[var(--ed-text-muted)] hover:text-purple-400 transition-all shrink-0 ${
                    isTranscribingAudio ? "animate-pulse border-purple-500 text-purple-400" : ""
                  }`}
                >
                  <Mic className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleSendMessage()}
                  disabled={isSending || !inputText.trim()}
                  className={`px-5 py-2.5 rounded-xl text-white font-semibold text-xs disabled:opacity-40 transition-all inline-flex items-center gap-1.5 shrink-0 ed-press ed-focus-ring ${
                    isSimulatingCustomer
                      ? "bg-purple-600 hover:bg-purple-700 shadow-md"
                      : "ed-btn-primary"
                  }`}
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? "Processing..." : isSimulatingCustomer ? "Simulate & Reply" : "Send"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 3. Right Panel: Customer Intelligence & Memory Profile */}
      {activeConvDetail && (
        <div className="w-72 flex flex-col shrink-0 bg-[var(--ed-surface)] p-5 space-y-5 overflow-y-auto text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)] mb-2">
              Customer Profile
            </div>
            <div className="font-bold text-sm text-[var(--ed-text-primary)]">
              {activeConvDetail.customer.name || "Unknown Lead"}
            </div>
            <div className="text-[var(--ed-text-muted)] text-xs mt-0.5">
              {activeConvDetail.customer.company_name || "Company Not Provided"}
            </div>
          </div>

          <div className="space-y-2 text-[var(--ed-text-primary)]">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
              <span>{activeConvDetail.customer.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
              <span>Type: {activeConvDetail.customer.company_type || "Wholesale"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
              <span>Language: {activeConvDetail.customer.preferred_language || "English"}</span>
            </div>
          </div>

          {/* AI Sales Intelligence */}
          <div className="pt-4 border-t border-[var(--ed-border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)] mb-2">
              Sales Intelligence
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lead Score:</span>
                <span className="font-bold text-[var(--ed-accent)]">
                  {activeConvDetail.conversation.lead_score}/100
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sales Stage:</span>
                <span className="font-semibold text-[var(--ed-text-primary)] px-1.5 py-0.5 bg-[var(--ed-bg)] rounded">
                  {activeConvDetail.conversation.sales_stage}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Control Mode:</span>
                <span className="font-bold text-emerald-600">
                  {activeConvDetail.conversation.mode}
                </span>
              </div>
            </div>
          </div>

          {/* Conversation Summary */}
          <div className="pt-4 border-t border-[var(--ed-border)]">
            <div className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)] mb-2">
              Structured Memory Summary
            </div>
            <p className="text-[var(--ed-text-primary)] text-xs leading-relaxed bg-slate-50 dark:bg-[var(--ed-bg)] p-2.5 rounded-lg border border-[var(--ed-border)]">
              {activeConvDetail.summary ||
                "Discovery stage active. Gathering beverage menu details, estimated volume, and delivery destination."}
            </p>
          </div>
        </div>
      )}

      {/* Modal: Initiate New Chat */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--ed-surface)] rounded-2xl border border-[var(--ed-border)] w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" /> Start New WhatsApp Chat
              </h3>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="text-[var(--ed-text-muted)] hover:text-[var(--ed-text-muted)] dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateChat} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Mehra"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Darjeeling Chai Cafe"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Opening Message (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Type an opening outreach message..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(false)}
                  className="px-4 py-2 rounded-lg border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInitiating || !newPhone.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--ed-accent)] hover:bg-[var(--ed-accent-hover)] text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
                >
                  {isInitiating ? "Initiating..." : "Start Chat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Report / Correct AI Response */}
      {reportingMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--ed-surface)] rounded-2xl border border-[var(--ed-border)] w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Report & Correct AI Response
              </h3>
              <button
                onClick={() => setReportingMessage(null)}
                className="text-[var(--ed-text-muted)] hover:text-[var(--ed-text-muted)] dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-[var(--ed-text-primary)] mb-4 border border-[var(--ed-border)]">
              <span className="font-bold block text-[var(--ed-text-primary)] mb-1">Reported Message:</span>
              "{reportingMessage.content}"
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Issue Category *
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                >
                  <option value="wrong_price">Wrong Price / Unsupported Discount</option>
                  <option value="wrong_info">Factual Error / Unsupported Claim</option>
                  <option value="wrong_tone">Unprofessional or Inappropriate Tone</option>
                  <option value="missed_context">Missed Prior Context / Repeated Question</option>
                  <option value="repeated_question">Repeated Question</option>
                  <option value="unauthorized_claim">Unauthorized Commitment / Delivery Promise</option>
                  <option value="other">Other Sales Mistake</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Explanation *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this response was inaccurate or suboptimal..."
                  value={reportExplanation}
                  onChange={(e) => setReportExplanation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                />
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Ideal Corrected Response (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="How should EDITH have answered this customer turn?"
                  value={reportCorrectedText}
                  onChange={(e) => setReportCorrectedText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-[var(--ed-border)] bg-slate-50 dark:bg-slate-800 text-[var(--ed-text-primary)]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkKnowledge"
                  checked={reportIsKnowledge}
                  onChange={(e) => setReportIsKnowledge(e.target.checked)}
                  className="rounded text-amber-600 ed-focus-ring"
                />
                <label htmlFor="chkKnowledge" className="text-[var(--ed-text-primary)] cursor-pointer">
                  Promote to verified Business Knowledge candidate for operator approval
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingMessage(null)}
                  className="px-4 py-2 rounded-lg border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportExplanation.trim()}
                  className="px-4 py-2 rounded-lg bg-[var(--ed-accent)] hover:bg-[var(--ed-accent-hover)] text-white font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <FileCheck className="w-3.5 h-3.5" />
                  {isSubmittingReport ? "Submitting..." : "Submit Correction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
