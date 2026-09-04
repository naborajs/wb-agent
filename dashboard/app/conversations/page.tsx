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
  QrCode,
  Copy,
  Check,
  RotateCcw,
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [waStatus, setWaStatus] = useState<{
    connected: boolean;
    pairingCode?: string;
    botPhone?: string;
    hasQR?: boolean;
  } | null>(null);
  const [isWaModalOpen, setIsWaModalOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [isSendingPing, setIsSendingPing] = useState(false);
  const [pingStatus, setPingStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

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

  // Fetch QR Code data URL from bridge proxy
  const fetchQrData = () => {
    fetch("/api/v1/whatsapp/qr")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.qrDataUrl) setQrDataUrl(data.qrDataUrl);
      })
      .catch(() => {});
  };

  // Dispatch WhatsApp Diagnostic Ping
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
        setPingStatus("✅ Ping sent to WhatsApp! Check your phone (+91 89006 53250).");
      } else {
        setPingStatus(`⚠️ ${data.detail || "Failed to send ping"}`);
      }
    } catch (e: any) {
      setPingStatus(`❌ Error: ${e.message}`);
    } finally {
      setIsSendingPing(false);
      setTimeout(() => setPingStatus(null), 6000);
    }
  };

  // Monitor WhatsApp Bridge Connection via FastAPI Proxy
  useEffect(() => {
    const checkWa = () => {
      fetch("/api/v1/whatsapp/status")
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data) {
            setWaStatus({
              connected: !!data.connected,
              pairingCode: data.pairing_code,
              botPhone: data.bot_phone,
              hasQR: data.has_qr,
            });
            if (!data.connected && data.has_qr && !qrDataUrl) {
              fetchQrData();
            }
          }
        })
        .catch(() => setWaStatus({ connected: false }));
    };
    checkWa();
    const interval = setInterval(checkWa, 3000);
    return () => clearInterval(interval);
  }, [qrDataUrl]);

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

  // Handle Reset / Clear Chat History
  const [isResetting, setIsResetting] = useState(false);
  const handleResetChat = async () => {
    if (!activeConvId || isResetting) return;
    if (!window.confirm("Are you sure you want to clear all messages and reset the sales stage for this conversation?")) {
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch(`/api/v1/conversations/${activeConvId}/reset`, {
        method: "POST",
      });
      if (res.ok) {
        const updated = await fetch(`/api/v1/conversations/${activeConvId}`).then(
          (r) => (r.ok ? r.json() : null)
        );
        if (updated) setActiveConvDetail(updated);
        loadConversations();
      }
    } catch (e) {
      console.error("Failed to reset conversation:", e);
    } finally {
      setIsResetting(false);
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
                {/* Real-Time WhatsApp Bot Connection Badge */}
                {waStatus?.connected ? (
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(true)}
                    title="WhatsApp Bot is Active! Click for connection details"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-500 text-[10px] font-semibold hover:bg-emerald-500/20 transition-all cursor-pointer"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>WhatsApp Live</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      fetchQrData();
                      setIsWaModalOpen(true);
                    }}
                    title="WhatsApp is disconnected. Click to connect bot"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-500 text-[10px] font-semibold hover:bg-amber-500/20 transition-all cursor-pointer animate-pulse"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    <span>Connect WhatsApp</span>
                  </button>
                )}

                {/* WhatsApp Test Ping Button */}
                <button
                  type="button"
                  onClick={handleSendPing}
                  disabled={isSendingPing}
                  title="Send instant WhatsApp ping to verify live message delivery"
                  className="px-2.5 py-1 rounded-lg border border-[var(--ed-border)] hover:border-emerald-500/40 hover:bg-emerald-500/10 text-[10px] font-semibold text-[var(--ed-text-muted)] hover:text-emerald-500 transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-2.5 h-2.5" />
                  {isSendingPing ? "Pinging..." : "Test Ping"}
                </button>

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

                {/* Reset Chat Button */}
                <button
                  type="button"
                  onClick={handleResetChat}
                  disabled={isResetting}
                  title="Clear messages and reset conversation to initial state"
                  className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 hover:border-rose-500/60 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${isResetting ? "animate-spin" : ""}`} />
                  <span>{isResetting ? "Resetting..." : "Reset"}</span>
                </button>
              </div>
            </div>

            {/* Quick Ping Status Notification Pill */}
            {pingStatus && (
              <div className="bg-emerald-500/10 border-b border-emerald-500/20 px-4 py-1.5 text-xs text-emerald-500 flex items-center justify-between shrink-0 animate-in fade-in duration-200">
                <span>{pingStatus}</span>
                <button onClick={() => setPingStatus(null)} className="text-emerald-500 hover:text-emerald-300">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* WhatsApp Connection Warning Banner (Only Shown When Disconnected) */}
            {waStatus && !waStatus.connected && (
              <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-2 text-xs flex items-center justify-between text-amber-500 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping shrink-0" />
                  <span>
                    <strong>WhatsApp Bot is Offline:</strong> Link bot phone (+91 89187 53100) to chat live from phone, OR use <strong>🧪 Simulate Customer</strong> below to test AI right now!
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      fetchQrData();
                      setIsWaModalOpen(true);
                    }}
                    className="underline hover:text-amber-300 inline-flex items-center gap-1 cursor-pointer"
                  >
                    <QrCode className="w-3.5 h-3.5" /> Scan QR / Pair Code
                  </button>
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

      {/* Modal: WhatsApp Bot Hub & Device Connection */}
      {isWaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[var(--ed-surface)] rounded-2xl border border-[var(--ed-border)] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${waStatus?.connected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
                <h3 className="font-bold text-base text-[var(--ed-text-primary)]">
                  WhatsApp Bot Connection Hub
                </h3>
              </div>
              <button
                onClick={() => setIsWaModalOpen(false)}
                className="text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] p-1 rounded-lg hover:bg-[var(--ed-bg)] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Connection Status Card */}
            <div className={`p-4 rounded-xl border mb-5 flex items-center justify-between ${
              waStatus?.connected
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-amber-400"
            }`}>
              <div>
                <div className="text-[11px] font-semibold uppercase tracking-wider opacity-80">
                  Connection Status
                </div>
                <div className="text-base font-bold flex items-center gap-1.5 mt-0.5">
                  {waStatus?.connected ? "🟢 Online & Active" : "🔴 Disconnected"}
                </div>
                <div className="text-xs opacity-90 mt-1 font-mono">
                  Bot Line: +{waStatus?.botPhone || "918918753100"}
                </div>
              </div>
              <button
                onClick={handleSendPing}
                disabled={isSendingPing}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1 shrink-0"
              >
                <Send className="w-3 h-3" />
                {isSendingPing ? "Sending..." : "Test Ping"}
              </button>
            </div>

            {pingStatus && (
              <div className="mb-4 p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-[var(--ed-border)] text-xs text-center font-medium animate-in fade-in">
                {pingStatus}
              </div>
            )}

            {/* Connected View */}
            {waStatus?.connected ? (
              <div className="space-y-4 text-xs text-[var(--ed-text-muted)]">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-[var(--ed-border)] space-y-2">
                  <div className="font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5">
                    <CheckCircle className="w-4 h-4 text-emerald-500" /> WhatsApp Multi-Device Paired
                  </div>
                  <p>
                    EDITH is actively connected on <strong>+{waStatus?.botPhone || "918918753100"}</strong>. Any buyer messaging this line receives automated consultative sales assistance with 0 latency.
                  </p>
                </div>
                <div className="p-3 bg-purple-500/8 border border-purple-500/20 rounded-xl text-purple-600 dark:text-purple-400 space-y-1">
                  <div className="font-bold flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5" /> Testing Directly from Phone:
                  </div>
                  <p>
                    Send any message from your phone (+91 89006 53250) to the bot (+91 89187 53100) to chat with EDITH live, or use the <strong>🧪 Simulate Customer</strong> toggle in this dashboard!
                  </p>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] font-semibold text-[var(--ed-text-primary)]"
                  >
                    Close
                  </button>
                </div>
              </div>
            ) : (
              /* Disconnected Linking View */
              <div className="space-y-4 text-xs">
                <p className="text-[var(--ed-text-muted)]">
                  Link your WhatsApp bot to start receiving and answering customer inquiries:
                </p>

                {/* QR Code Section */}
                <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-900 rounded-xl border border-[var(--ed-border)] shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Scan WhatsApp QR"
                      className="w-52 h-52 object-contain rounded-lg shadow-sm"
                    />
                  ) : (
                    <div className="w-52 h-52 flex flex-col items-center justify-center text-center p-4 space-y-2 text-slate-400">
                      <QrCode className="w-12 h-12 stroke-[1.5] animate-pulse" />
                      <span className="text-[11px]">Generating fresh QR Code...</span>
                    </div>
                  )}
                  <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                    <RefreshCw className="w-3 h-3 animate-spin" /> Auto-refreshes automatically
                  </div>
                </div>

                {/* 8-Digit Pairing Code Alternative */}
                {waStatus?.pairingCode && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-[var(--ed-border)] flex items-center justify-between">
                    <div>
                      <div className="text-[10px] font-semibold text-[var(--ed-text-muted)] uppercase">
                        Or Link With Code:
                      </div>
                      <div className="font-mono text-lg font-extrabold tracking-widest text-emerald-500">
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
                      className="px-3 py-1.5 rounded-lg border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] font-semibold flex items-center gap-1 transition-all"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedCode ? "Copied!" : "Copy"}
                    </button>
                  </div>
                )}

                {/* Step-by-Step Instructions */}
                <ol className="list-decimal pl-5 space-y-1 text-[11px] text-[var(--ed-text-muted)]">
                  <li>Open WhatsApp on the bot phone (<strong>+{waStatus?.botPhone || "918918753100"}</strong>)</li>
                  <li>Tap <strong>Settings / 3 dots &gt; Linked Devices</strong></li>
                  <li>Tap <strong>Link a Device</strong> and point phone at the QR above</li>
                </ol>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      fetchQrData();
                    }}
                    className="px-3 py-2 rounded-xl border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] font-semibold text-[var(--ed-text-primary)] flex items-center gap-1"
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> Refresh QR
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsWaModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
