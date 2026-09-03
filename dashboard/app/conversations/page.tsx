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
        {/* Search & Tabs */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div className="flex gap-1">
            {["all", "hot", "human"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`flex-1 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors ${
                  filterMode === mode
                    ? "bg-slate-900 dark:bg-amber-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {mode === "hot" ? "🔥 Hot" : mode === "human" ? "Human" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {filteredConversations.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No conversations found.
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
                      ? "bg-amber-500/10 dark:bg-amber-950/40 border-l-4 border-amber-600 dark:border-amber-500"
                      : "hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {c.customer_name || c.channel_id}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.is_hot && (
                        <span className="flex items-center text-[10px] font-bold text-rose-500 dark:text-rose-400">
                          <Flame className="w-3 h-3 fill-rose-500" />
                        </span>
                      )}
                      <span className="text-[10px] font-semibold text-slate-400 font-mono">
                        {c.lead_score}/100
                      </span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 truncate">
                    {c.company_name || c.channel_id}
                  </div>

                  <div className="flex items-center justify-between mt-2 text-[10px]">
                    <span className="px-1.5 py-0.5 rounded font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {c.sales_stage}
                    </span>
                    <span
                      className={`font-semibold ${
                        c.mode === "HUMAN" ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
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
              Select a conversation from the left inbox or send a message on WhatsApp to{" "}
              <span className="font-semibold text-slate-600 dark:text-slate-300">+91 8918753100</span>!
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
                      <div className="flex items-center gap-1.5 mb-1 opacity-70 text-[10px]">
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

                      <div className="whitespace-pre-wrap">{msg.content}</div>

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
              {activeConvDetail.customer?.name || "Prospective Buyer"}
            </div>
            <div className="text-slate-500 dark:text-slate-400 mt-0.5">
              {activeConvDetail.customer?.company_name || "Commercial Buyer"}
            </div>
            <div className="text-slate-400 text-[11px] mt-0.5">
              {activeConvDetail.customer?.primary_phone}
            </div>
          </div>

          <div className="space-y-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Sales Stage:</span>
              <span className="font-bold text-slate-900 dark:text-white">
                {activeConvDetail.conversation?.sales_stage}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">Lead Score:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">
                {activeConvDetail.conversation?.lead_score}/100
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 dark:text-slate-400">City / State:</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {activeConvDetail.customer?.city || "India"}
              </span>
            </div>
          </div>

          {/* Extracted Customer Memory */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Extracted Facts & Memory
            </div>
            <div className="space-y-1 text-[11px]">
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Business Type
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeConvDetail.customer?.company_type || "Hospitality / Cafe"}
                </span>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[9px] uppercase font-bold">
                  Opt-In Permission
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" /> Confirmed
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
