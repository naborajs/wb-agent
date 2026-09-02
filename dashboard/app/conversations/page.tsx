"use client";

import React, { useState, useEffect } from "react";
import {
  Search,
  Flame,
  User,
  Bot,
  Send,
  Pause,
  Play,
  CheckCircle2,
  Clock,
  ShieldAlert,
  Building,
  Phone,
  Tag,
  RefreshCw,
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
  const [conversations, setConversations] = useState<ConversationItem[]>([
    {
      id: "conv_demo_1",
      customer_id: "cust_demo_1",
      channel: "whatsapp",
      channel_id: "+918900653250",
      mode: "AI",
      sales_stage: "QUALIFIED",
      lead_score: 85,
      is_hot: true,
      unread_count: 0,
      last_message_at: new Date().toISOString(),
      customer_name: "Rahul Sharma",
      company_name: "Heritage Cafe, Siliguri",
    },
    {
      id: "conv_demo_2",
      customer_id: "cust_demo_2",
      channel: "whatsapp",
      channel_id: "+919832012345",
      mode: "HUMAN",
      sales_stage: "PURCHASE_INTENT",
      lead_score: 92,
      is_hot: true,
      unread_count: 1,
      last_message_at: new Date().toISOString(),
      customer_name: "Anita Paul",
      company_name: "Paul Sweets & Tea",
    },
  ]);

  const [activeConvId, setActiveConvId] = useState<string>("conv_demo_1");
  const [activeConvDetail, setActiveConvDetail] = useState<any>(null);
  const [inputText, setInputText] = useState("");
  const [filterMode, setFilterMode] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const activeConv = conversations.find((c) => c.id === activeConvId);

  // Load conversations from backend
  const loadConversations = () => {
    fetch("/api/v1/conversations")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && data.items && data.items.length > 0) {
          setConversations(data.items);
          if (!activeConvId) {
            setActiveConvId(data.items[0].id);
          }
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadConversations();
  }, []);

  // Load conversation detail
  useEffect(() => {
    if (!activeConvId) return;
    fetch(`/api/v1/conversations/${activeConvId}`)
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) setActiveConvDetail(data);
      })
      .catch(() => {});
  }, [activeConvId]);

  // Handle Takeover
  const handleTakeover = async (mode: string) => {
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
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Send
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText("");

    try {
      const res = await fetch(`/api/v1/conversations/${activeConvId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversation_id: activeConvId,
          content: textToSend,
          direction: "outbound",
          sender_type: "human",
        }),
      });
      if (res.ok) {
        const newMsg = await res.json();
        if (activeConvDetail) {
          setActiveConvDetail({
            ...activeConvDetail,
            messages: [...(activeConvDetail.messages || []), newMsg],
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const filteredConversations = conversations.filter((c) => {
    if (filterMode === "hot" && !c.is_hot) return false;
    if (filterMode === "human" && c.mode !== "HUMAN") return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = (c.customer_name || "").toLowerCase().includes(term);
      const matchCompany = (c.company_name || "").toLowerCase().includes(term);
      const matchPhone = c.channel_id.toLowerCase().includes(term);
      if (!matchName && !matchCompany && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="h-[calc(100vh-6.5rem)] flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* 1. Left Panel: Conversation Threads */}
      <div className="w-80 border-r border-slate-200 flex flex-col shrink-0">
        {/* Search & Tabs */}
        <div className="p-3 border-b border-slate-100 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400"
            />
          </div>

          <div className="flex gap-1">
            {["all", "hot", "human"].map((mode) => (
              <button
                key={mode}
                onClick={() => setFilterMode(mode)}
                className={`flex-1 py-1 text-[11px] font-semibold rounded-md uppercase tracking-wider ${
                  filterMode === mode
                    ? "bg-slate-900 text-white"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {mode === "hot" ? "🔥 Hot" : mode === "human" ? "Human" : "All"}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredConversations.map((c) => {
            const isActive = c.id === activeConvId;
            return (
              <div
                key={c.id}
                onClick={() => setActiveConvId(c.id)}
                className={`p-3.5 cursor-pointer transition-colors ${
                  isActive ? "bg-amber-50/50 border-l-4 border-amber-700" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-slate-900">
                    {c.is_hot && <Flame className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />}
                    <span>{c.customer_name || c.channel_id}</span>
                  </div>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                    {c.lead_score}/100
                  </span>
                </div>

                <div className="text-[11px] text-slate-500 mt-1 truncate">
                  {c.company_name || "Wholesale Buyer"}
                </div>

                <div className="flex items-center justify-between mt-2 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded font-medium bg-slate-100 text-slate-600">
                    {c.sales_stage}
                  </span>
                  <span
                    className={`font-semibold ${
                      c.mode === "HUMAN" ? "text-amber-600" : "text-emerald-600"
                    }`}
                  >
                    {c.mode === "HUMAN" ? "● Human Takeover" : "● AI Active"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Center Panel: Active Chat Timeline */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-slate-200 bg-slate-50/40">
        {/* Chat Header */}
        <div className="h-14 px-6 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              {activeConv?.customer_name || activeConv?.channel_id}
              {activeConv?.is_hot && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60">
                  <Flame className="w-3 h-3" /> Hot Lead
                </span>
              )}
            </h3>
            <div className="text-xs text-slate-400 mt-0.5">
              WhatsApp: {activeConv?.channel_id}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeConv?.mode === "HUMAN" ? (
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
                className={`flex flex-col ${isInbound ? "items-start" : "items-end"}`}
              >
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1 px-1">
                  {isInbound ? (
                    <>
                      <User className="w-3 h-3" /> Buyer
                    </>
                  ) : msg.sender_type === "human" ? (
                    <>
                      <User className="w-3 h-3 text-amber-600" /> Operator Rajiv
                    </>
                  ) : (
                    <>
                      <Bot className="w-3 h-3 text-emerald-600" /> AI Sales Consultant
                    </>
                  )}
                </div>

                <div
                  className={`max-w-md p-3.5 rounded-2xl text-xs leading-relaxed shadow-sm ${
                    isInbound
                      ? "bg-white text-slate-800 border border-slate-200/80 rounded-tl-sm"
                      : msg.sender_type === "human"
                      ? "bg-amber-600 text-white rounded-tr-sm"
                      : "bg-slate-900 text-white rounded-tr-sm"
                  }`}
                >
                  {msg.content}
                </div>

                <div className="text-[10px] text-slate-400 mt-1 px-1">
                  {new Date(msg.created_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Reply Box */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center gap-3">
          <textarea
            rows={1}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={
              activeConv?.mode === "HUMAN"
                ? "Type a manual reply as human operator..."
                : "AI is autonomous. Type message to automatically take over..."
            }
            className="flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-400 resize-none"
          />
          <button
            onClick={handleSendMessage}
            className="p-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 3. Right Panel: CRM Context, Memory & Lead Controls */}
      <div className="w-80 p-5 overflow-y-auto space-y-6 bg-white shrink-0">
        {/* Customer Profile */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Customer Identity
          </div>
          <div className="space-y-2 text-xs">
            <div className="flex items-center gap-2 text-slate-700 font-semibold">
              <Building className="w-4 h-4 text-slate-400" />
              {activeConvDetail?.customer?.company_name || "Company"}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Phone className="w-4 h-4 text-slate-400" />
              {activeConvDetail?.customer?.phone || activeConv?.channel_id}
            </div>
            <div className="flex items-center gap-2 text-slate-600">
              <Tag className="w-4 h-4 text-slate-400" />
              Language: {activeConvDetail?.customer?.preferred_language || "English"}
            </div>
          </div>
        </div>

        {/* Lead Score & Funnel Stage */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-semibold text-slate-700">Lead Score</span>
            <span className="text-sm font-bold text-amber-700">{activeConv?.lead_score}/100</span>
          </div>
          <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-700 rounded-full"
              style={{ width: `${activeConv?.lead_score || 10}%` }}
            ></div>
          </div>
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Stage:</span>
            <span className="font-semibold text-slate-800">{activeConv?.sales_stage}</span>
          </div>
        </div>

        {/* Rolling AI Summary */}
        {activeConvDetail?.summary && (
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
              AI Conversation Summary
            </div>
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200/60 text-xs text-amber-900 leading-relaxed">
              {activeConvDetail.summary}
            </div>
          </div>
        )}

        {/* Verified Customer Memory */}
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
            Long-Term Memory Facts
          </div>
          <div className="space-y-2">
            <div className="p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">requirement_volume</span>
                <span className="px-1.5 py-0.2 rounded font-bold bg-emerald-50 text-emerald-700 text-[10px]">
                  VERIFIED
                </span>
              </div>
              <div className="font-medium text-slate-800">100 kg / month</div>
            </div>
            <div className="p-2.5 rounded-lg border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-slate-400">product_preference</span>
                <span className="px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-700 text-[10px]">
                  CUSTOMER_SAID
                </span>
              </div>
              <div className="font-medium text-slate-800">Darjeeling First Flush & Assam Kadak</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
