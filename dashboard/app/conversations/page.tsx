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

  // Poll conversations list every 3 seconds
  useEffect(() => {
    loadConversations();
    const interval = setInterval(loadConversations, 3000);
    return () => clearInterval(interval);
  }, []);

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

  // Handle Send Manual Operator Message
  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeConvId || isSending) return;
    const textToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const res = await fetch(`/api/v1/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          content: textToSend,
        }),
      });
      if (res.ok) {
        const updated = await fetch(`/api/v1/conversations/${activeConvId}`).then(
          (r) => (r.ok ? r.json() : null)
        );
        if (updated) setActiveConvDetail(updated);
        loadConversations();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSending(false);
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
    <div className="h-[calc(100vh-6.5rem)] flex rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* 1. Left Panel: Conversation Threads */}
      <div className="w-80 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 bg-white dark:bg-slate-900">
        {/* Search & Actions */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search leads, phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <button
              onClick={() => setIsNewChatOpen(true)}
              title="Start New Chat by Phone"
              className="p-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white transition-colors shrink-0 shadow-sm"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            <button
              onClick={() => setFilterMode("all")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === "all"
                  ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              All ({conversations.length})
            </button>
            <button
              onClick={() => setFilterMode("hot")}
              className={`px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors ${
                filterMode === "hot"
                  ? "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              <Flame className="w-3 h-3 text-rose-500" /> Hot
            </button>
            <button
              onClick={() => setFilterMode("human")}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                filterMode === "human"
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold"
                  : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
              }`}
            >
              Takeover
            </button>
          </div>
        </div>

        {/* Thread List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === activeConvId;
              return (
                <div
                  key={c.id}
                  onClick={() => setActiveConvId(c.id)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected
                      ? "bg-amber-50/70 dark:bg-amber-950/30 border-l-4 border-amber-600"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {c.customer_name || c.company_name || c.channel_id}
                    </span>
                    {c.is_hot && (
                      <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300">
                        <Flame className="w-2.5 h-2.5" /> HOT
                      </span>
                    )}
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate mb-2">
                    {c.company_name ? `${c.company_name} • ` : ""}
                    {c.channel_id}
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-400">
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                      {c.sales_stage}
                    </span>
                    <span
                      className={`font-semibold ${
                        c.mode === "HUMAN"
                          ? "text-amber-600 dark:text-amber-400"
                          : "text-emerald-600 dark:text-emerald-400"
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
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-950/40">
        {!activeConv ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 dark:bg-slate-950">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <Bot className="w-6 h-6 text-slate-400" />
            </div>
            <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
              No Conversation Selected
            </h4>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Select a conversation from the left inbox or start a new chat!
            </p>
          </div>
        ) : (
          <>
            {/* Chat Header */}
            <div className="h-14 px-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  {activeConvDetail?.customer?.name ||
                    activeConvDetail?.customer?.company_name ||
                    activeConv.channel_id}
                  {activeConv.is_hot && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                      <Flame className="w-3 h-3" /> Hot Lead
                    </span>
                  )}
                </h3>
                <div className="text-xs text-slate-400 mt-0.5">
                  WhatsApp: {activeConv.channel_id}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeConv.mode === "HUMAN" ? (
                  <button
                    onClick={() => handleTakeover("AI")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Play className="w-3.5 h-3.5" /> Resume AI
                  </button>
                ) : (
                  <button
                    onClick={() => handleTakeover("HUMAN")}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                  >
                    <Pause className="w-3.5 h-3.5" /> Take Over
                  </button>
                )}
              </div>
            </div>

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
                          ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700 rounded-tl-sm"
                          : msg.sender_type === "human"
                          ? "bg-amber-700 text-white rounded-tr-sm"
                          : "bg-slate-900 dark:bg-amber-950/80 border border-slate-800 dark:border-amber-700/50 text-white rounded-tr-sm"
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
                              <User className="w-3 h-3 text-amber-200" />
                              <span className="text-amber-200 font-semibold">
                                Operator
                              </span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span className="text-emerald-400 font-semibold">
                                EDITH (Nemotron AI)
                              </span>
                            </>
                          )}
                        </div>

                        {/* Report & Feedback Button for AI Messages */}
                        {isAI && (
                          <div>
                            {msg.reported ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300 bg-amber-900/60 px-1.5 py-0.5 rounded border border-amber-500/40">
                                <AlertTriangle className="w-2.5 h-2.5" /> Reported ({msg.correction_category})
                              </span>
                            ) : (
                              <button
                                onClick={() => setReportingMessage(msg)}
                                title="Report / Correct this response"
                                className="inline-flex items-center gap-1 text-[9px] opacity-70 hover:opacity-100 text-amber-300 hover:underline"
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
                        <div className="mt-2 pt-2 border-t border-white/10 text-[10px] text-emerald-200 bg-emerald-950/40 p-1.5 rounded">
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
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center gap-2">
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={
                  activeConv.mode === "HUMAN"
                    ? "Type manual message as Operator..."
                    : "Take over to message manually..."
                }
                className="flex-1 px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isSending || !inputText.trim()}
                className="p-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-40 transition-colors"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      {/* 3. Right Panel: Customer Intelligence & Memory Profile */}
      {activeConvDetail && (
        <div className="w-72 flex flex-col shrink-0 bg-white dark:bg-slate-900 p-5 space-y-5 overflow-y-auto text-xs">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Customer Profile
            </div>
            <div className="font-bold text-sm text-slate-900 dark:text-white">
              {activeConvDetail.customer.name || "Unknown Lead"}
            </div>
            <div className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">
              {activeConvDetail.customer.company_name || "Company Not Provided"}
            </div>
          </div>

          <div className="space-y-2 text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <span>{activeConvDetail.customer.phone || "—"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Building className="w-3.5 h-3.5 text-slate-400" />
              <span>Type: {activeConvDetail.customer.company_type || "Wholesale"}</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-slate-400" />
              <span>Language: {activeConvDetail.customer.preferred_language || "English"}</span>
            </div>
          </div>

          {/* AI Sales Intelligence */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sales Intelligence
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Lead Score:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {activeConvDetail.conversation.lead_score}/100
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Sales Stage:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded">
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
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Structured Memory Summary
            </div>
            <p className="text-slate-600 dark:text-slate-300 text-xs leading-relaxed bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              {activeConvDetail.summary ||
                "Discovery stage active. Gathering beverage menu details, estimated volume, and delivery destination."}
            </p>
          </div>
        </div>
      )}

      {/* Modal: Initiate New Chat */}
      {isNewChatOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-600" /> Start New WhatsApp Chat
              </h3>
              <button
                onClick={() => setIsNewChatOpen(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleInitiateChat} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="+91 98765 43210"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Rajesh Mehra"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Company Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Darjeeling Chai Cafe"
                    value={newCompany}
                    onChange={(e) => setNewCompany(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Opening Message (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Type an opening outreach message..."
                  value={newInitialMsg}
                  onChange={(e) => setNewInitialMsg(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewChatOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isInitiating || !newPhone.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" /> Report & Correct AI Response
              </h3>
              <button
                onClick={() => setReportingMessage(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs text-slate-600 dark:text-slate-300 mb-4 border border-slate-200 dark:border-slate-700">
              <span className="font-bold block text-slate-900 dark:text-white mb-1">Reported Message:</span>
              "{reportingMessage.content}"
            </div>

            <form onSubmit={handleSubmitReport} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Issue Category *
                </label>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
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
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Explanation *
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Explain why this response was inaccurate or suboptimal..."
                  value={reportExplanation}
                  onChange={(e) => setReportExplanation(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ideal Corrected Response (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="How should EDITH have answered this customer turn?"
                  value={reportCorrectedText}
                  onChange={(e) => setReportCorrectedText(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="chkKnowledge"
                  checked={reportIsKnowledge}
                  onChange={(e) => setReportIsKnowledge(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <label htmlFor="chkKnowledge" className="text-slate-700 dark:text-slate-300 cursor-pointer">
                  Promote to verified Business Knowledge candidate for operator approval
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReportingMessage(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReport || !reportExplanation.trim()}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
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
