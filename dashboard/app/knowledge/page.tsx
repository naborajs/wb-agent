"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  DollarSign,
  Package,
  BookOpen,
  Bot,
  Cpu,
  Sparkles,
  Plus,
  Search,
  Upload,
  RefreshCw,
  Layers,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Volume2,
  VolumeX,
  Trash2,
  Edit2,
  FileSpreadsheet,
  FileText,
  MessageSquare,
  ChevronRight,
  Clock,
  Send,
  Sliders,
  Check,
  X,
  Calculator,
} from "lucide-react";

interface KnowledgeItemRecord {
  id: string;
  category: "business_info" | "pricing_rule" | "catalog_product" | "agent_guidance" | "custom";
  title: string;
  sku?: string | null;
  source_type: string;
  content_text: string;
  structured_data: Record<string, any>;
  base_price?: number | null;
  currency?: string | null;
  unit?: string | null;
  min_order_quantity?: number | null;
  min_quantity?: number | null;
  max_quantity?: number | null;
  discount_percentage?: number | null;
  max_autonomous_discount?: number | null;
  customer_segment?: string | null;
  version: number;
  chunk_count: number;
  is_active: boolean;
  created_by_brain: string;
  created_at?: string;
  updated_at?: string;
}

interface ChatMessage {
  id: string;
  sender: "operator" | "friday" | "edith";
  text: string;
  proposal?: any;
  verdict?: "ACCEPTED" | "DENIED";
  reasoning?: string;
  suggestion?: string;
  created_at: string;
}

interface RetrievalSource {
  chunk_id: string;
  document_id?: string;
  item_id?: string;
  category: string;
  document_title: string;
  version: number;
  section_heading?: string;
  content: string;
  similarity_score: number;
}

interface AIQueryResponse {
  query: string;
  answer: string;
  model_used: string;
  confidence_score: number;
  sources: RetrievalSource[];
  executed_at: string;
}

const CATEGORY_TABS = [
  { id: "all", label: "All Items", icon: Layers, color: "text-indigo-400" },
  { id: "business_info", label: "Business Info", icon: FileText, color: "text-blue-400" },
  { id: "pricing_rule", label: "Pricing Rules", icon: DollarSign, color: "text-emerald-400" },
  { id: "catalog_product", label: "Catalog", icon: Package, color: "text-cyan-400" },
  { id: "agent_guidance", label: "Agent Guidance", icon: BookOpen, color: "text-purple-400" },
  { id: "custom", label: "Custom", icon: Sliders, color: "text-amber-400" },
];

const QUICK_CHAT_SUGGESTIONS = [
  "Increase Tier 2 volume discount to 12% for 200 units",
  "Update baseline catalog MOQ to 25 units",
  "Add 7-day transit damage replacement policy",
  "Give 35% discount for 50 units", // Will trigger EDITH's autonomous refusal!
];

function KnowledgeHubMain() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [items, setItems] = useState<KnowledgeItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({});

  // Agentic Update Chat State
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "friday",
      text: "Hello! I am Friday, your personal executive web copilot. Together with my partner brain EDITH, we can update any knowledge, volume pricing tier, or catalog product right here. Just tell me what you would like to change!",
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    },
  ]);

  // Semantic RAG Test State
  const [ragQuery, setRagQuery] = useState("");
  const [ragLoading, setRagLoading] = useState(false);
  const [ragResult, setRagResult] = useState<AIQueryResponse | null>(null);

  // Modals
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadCategory, setUploadCategory] = useState("business_info");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Quote Simulator State
  const [simQty, setSimQty] = useState(150);
  const [simPrice, setSimPrice] = useState(450);
  const [simSegment, setSimSegment] = useState("wholesale");
  const [simDiscount, setSimDiscount] = useState(0);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Items & Stats
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, statsRes] = await Promise.all([
        fetch("/api/v1/knowledge/items"),
        fetch("/api/v1/knowledge/stats"),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItems(data);
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        setStats(s);
      }
    } catch (err) {
      console.error("Failed to load knowledge items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // WebSocket Live Sync
  useEffect(() => {
    let ws: WebSocket | null = null;
    try {
      const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.hostname;
      const port = "8000";
      ws = new WebSocket(`${proto}//${host}:${port}/api/v1/ws`);

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (
            data.type === "knowledge_item_updated" ||
            data.type === "knowledge_item_created" ||
            data.type === "knowledge_item_deleted"
          ) {
            fetchData();
          }
        } catch (e) {
          // ignore parsing error
        }
      };
    } catch (e) {
      // WS unavailable
    }

    return () => {
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Handle Chat Submit
  const handleSendChat = async (msgText?: string) => {
    const textToSend = msgText || chatInput;
    if (!textToSend.trim() || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "operator",
      text: textToSend.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!msgText) setChatInput("");
    setChatLoading(true);

    try {
      const res = await fetch("/api/v1/knowledge/update-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          category_hint: activeTab !== "all" ? activeTab : undefined,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const fridayReply: ChatMessage = {
          id: `friday_${Date.now()}`,
          sender: "friday",
          text: result.reply_text,
          proposal: result.friday_proposal,
          verdict: result.decision,
          reasoning: result.edith_evaluation?.reasoning,
          suggestion: result.edith_evaluation?.suggestion,
          created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, fridayReply]);

        // Trigger TTS if enabled
        if (ttsEnabled && result.speak_text && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(result.speak_text);
          utterance.rate = 1.05;
          window.speechSynthesis.speak(utterance);
        }

        // Refresh items table if accepted
        if (result.decision === "ACCEPTED") {
          fetchData();
        }
      } else {
        const err = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "friday",
            text: `Error processing request: ${err.detail || "Server error"}`,
            created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    } catch (err: any) {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          sender: "friday",
          text: `Communication error: ${err.message}`,
          created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  };

  // Handle RAG Semantic Search
  const handleRAGSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ragQuery.trim() || ragLoading) return;

    setRagLoading(true);
    setRagResult(null);

    try {
      const res = await fetch("/api/v1/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: ragQuery.trim(),
          category: activeTab !== "all" ? activeTab : undefined,
          top_k: 4,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setRagResult(data);
      }
    } catch (err) {
      console.error("RAG search failed:", err);
    } finally {
      setRagLoading(false);
    }
  };

  // Handle Item Toggle Active
  const handleToggleActive = async (id: string) => {
    try {
      await fetch(`/api/v1/knowledge/items/${id}/toggle-active`, { method: "PATCH" });
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_active: !i.is_active } : i))
      );
    } catch (err) {
      console.error("Toggle active failed:", err);
    }
  };

  // Handle Item Delete
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Are you sure you want to delete this knowledge asset?")) return;
    try {
      await fetch(`/api/v1/knowledge/items/${id}`, { method: "DELETE" });
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error("Delete failed:", err);
    }
  };

  // Handle File Upload
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    formData.append("category", uploadCategory);

    try {
      const res = await fetch("/api/v1/knowledge/upload", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        setUploadModalOpen(false);
        setUploadFile(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(`Upload error: ${err.detail || "Failed to process file"}`);
      }
    } catch (err: any) {
      alert(`Upload error: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  // Filter Items
  const filteredItems = items.filter((item) => {
    const matchesTab = activeTab === "all" || item.category === activeTab;
    const matchesSearch =
      !searchFilter.trim() ||
      item.title.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (item.sku && item.sku.toLowerCase().includes(searchFilter.toLowerCase())) ||
      item.content_text.toLowerCase().includes(searchFilter.toLowerCase());
    return matchesTab && matchesSearch;
  });

  // Calculate simulated pricing
  const calculateSimQuote = () => {
    // Find highest matching volume rule
    const volumeRules = items
      .filter((i) => i.category === "pricing_rule" && i.is_active)
      .sort((a, b) => (b.min_quantity || 0) - (a.min_quantity || 0));

    let appliedDiscount = 0;
    let matchedRule = "Baseline Tariff";
    let requiresApproval = false;

    for (const r of volumeRules) {
      const minQ = r.min_quantity || 0;
      const maxQ = r.max_quantity || Infinity;
      if (simQty >= minQ && simQty <= maxQ) {
        appliedDiscount = Number(r.discount_percentage) || 0;
        matchedRule = r.title;
        if (Number(r.max_autonomous_discount) && appliedDiscount > Number(r.max_autonomous_discount)) {
          requiresApproval = true;
        }
        break;
      }
    }

    const totalBefore = simQty * simPrice;
    const discountAmt = totalBefore * (appliedDiscount / 100);
    const finalTotal = totalBefore - discountAmt;
    const unitAfterDiscount = finalTotal / simQty;

    return {
      totalBefore,
      discountAmt,
      finalTotal,
      unitAfterDiscount,
      appliedDiscount,
      matchedRule,
      requiresApproval,
    };
  };

  const simQuote = calculateSimQuote();

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Dual-Brain Unified Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Friday (Gemini 3.1) & EDITH (NVIDIA NIM)
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-100 flex items-center gap-3">
              Knowledge Hub & RAG Engine
            </h1>
            <p className="text-slate-400 text-sm mt-1.5 max-w-2xl">
              Unified enterprise knowledge base: company policies, volume pricing rules, product catalog, and conversational agent guidance in one chat-driven workspace.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition shadow-lg ${
                chatOpen
                  ? "bg-indigo-600 text-white shadow-indigo-500/20 hover:bg-indigo-500"
                  : "bg-slate-800 text-slate-200 hover:bg-slate-700 border border-slate-700"
              }`}
            >
              <Bot className="w-4 h-4 text-indigo-300" />
              {chatOpen ? "Hide Update Chat" : "Open Update Chat"}
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-medium text-sm flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-cyan-400" />
              Import File
            </button>

            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700 transition"
              title="Refresh Knowledge Index"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-800/80">
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-slate-400 mb-1">Total Assets</div>
            <div className="text-lg font-bold text-slate-100">{stats.total || items.length}</div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-blue-400 mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3" /> Business Info
            </div>
            <div className="text-lg font-bold text-blue-300">
              {stats.business_info || items.filter((i) => i.category === "business_info").length}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-emerald-400 mb-1 flex items-center gap-1">
              <DollarSign className="w-3 h-3" /> Pricing Rules
            </div>
            <div className="text-lg font-bold text-emerald-300">
              {stats.pricing_rule || items.filter((i) => i.category === "pricing_rule").length}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-cyan-400 mb-1 flex items-center gap-1">
              <Package className="w-3 h-3" /> Catalog SKUs
            </div>
            <div className="text-lg font-bold text-cyan-300">
              {stats.catalog_product || items.filter((i) => i.category === "catalog_product").length}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-purple-400 mb-1 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Agent Guidance
            </div>
            <div className="text-lg font-bold text-purple-300">
              {stats.agent_guidance || items.filter((i) => i.category === "agent_guidance").length}
            </div>
          </div>
          <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div className="text-xs text-amber-400 mb-1 flex items-center gap-1">
              <Sliders className="w-3 h-3" /> Custom Config
            </div>
            <div className="text-lg font-bold text-amber-300">
              {stats.custom || items.filter((i) => i.category === "custom").length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout (Grid with optional Chat Panel) */}
      <div className={`grid grid-cols-1 ${chatOpen ? "lg:grid-cols-12" : ""} gap-6`}>
        {/* Left / Center Column: Tabbed Content & Tables */}
        <div className={`${chatOpen ? "lg:col-span-7 xl:col-span-8" : "w-full"} space-y-6`}>
          {/* Category Navigation Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5 shadow-sm">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count =
                tab.id === "all"
                  ? items.length
                  : items.filter((i) => i.category === tab.id).length;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-slate-800 text-slate-100 shadow-sm border border-slate-700/80"
                      : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive ? "bg-slate-700 text-slate-200" : "bg-slate-800 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by title, SKU, or keyword..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-400">
                Showing {filteredItems.length} of {items.length} items
              </span>
            </div>
          </div>

          {/* Content Switcher by Active Tab */}
          {activeTab === "pricing_rule" && (
            /* Dedicated Interactive Quote Simulator inside Pricing Tab */
            <div className="bg-slate-900 border border-emerald-500/20 rounded-2xl p-5 shadow-lg space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100">Live B2B Quote Simulator</h3>
                    <p className="text-xs text-slate-400">Calculates deterministic price tiers & discount boundary checks</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                  Deterministic Decimal Math
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Order Quantity (Units)</label>
                  <input
                    type="number"
                    value={simQty}
                    onChange={(e) => setSimQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Base Price / Unit (₹)</label>
                  <input
                    type="number"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Customer Segment</label>
                  <select
                    value={simSegment}
                    onChange={(e) => setSimSegment(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="wholesale">Wholesale Buyer</option>
                    <option value="distributor">Distributor / Bulk</option>
                    <option value="retail">Retail Store</option>
                  </select>
                </div>
              </div>

              {/* Simulation Result */}
              <div className="bg-slate-950/80 rounded-xl p-4 border border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Matched Volume Rule</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">{simQuote.matchedRule}</div>
                  <div className="text-xs text-slate-400 mt-1">
                    Applied Discount: <strong className="text-slate-200">{simQuote.appliedDiscount}%</strong>
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Gross Total</div>
                  <div className="text-sm font-medium text-slate-400 line-through mt-0.5">
                    ₹{simQuote.totalBefore.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500">Discount Savings</div>
                  <div className="text-sm font-semibold text-emerald-400 mt-0.5">
                    -₹{simQuote.discountAmt.toLocaleString()}
                  </div>
                </div>
                <div className="border-l border-slate-800 pl-4">
                  <div className="text-xs text-slate-500">Final Order Quote</div>
                  <div className="text-lg font-bold text-slate-100 mt-0.5">
                    ₹{simQuote.finalTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-400">
                    (₹{simQuote.unitAfterDiscount.toFixed(2)} / unit)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table / Grid */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
            {loading ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                <p className="text-sm">Loading knowledge assets...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-400 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-slate-300">No knowledge items found</p>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Type an update in the chat panel, import a file, or click &apos;Add Item&apos; to create your first asset in this category.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-800/70">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            item.category === "pricing_rule"
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : item.category === "catalog_product"
                              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                              : item.category === "agent_guidance"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : item.category === "custom"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                          }`}
                        >
                          {item.category.replace("_", " ").toUpperCase()}
                        </span>

                        {item.sku && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                            {item.sku}
                          </span>
                        )}

                        <span className="text-xs text-slate-500">v{item.version}</span>

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            item.is_active
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_active ? "bg-emerald-400" : "bg-slate-500"
                            }`}
                          />
                          {item.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-100 truncate">{item.title}</h4>

                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {item.content_text.replace(/^#+\s+/gm, "").slice(0, 160)}...
                      </p>

                      {/* Structured Details Preview */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-400">
                        {item.base_price !== null && item.base_price !== undefined && (
                          <span>
                            Base: <strong className="text-slate-200">₹{item.base_price}</strong> / {item.unit || "unit"}
                          </span>
                        )}
                        {item.min_order_quantity && (
                          <span>
                            MOQ: <strong className="text-slate-200">{item.min_order_quantity}</strong>
                          </span>
                        )}
                        {item.discount_percentage !== null && item.discount_percentage !== undefined && (
                          <span>
                            Discount: <strong className="text-emerald-400">{item.discount_percentage}%</strong>
                          </span>
                        )}
                        {item.max_autonomous_discount !== null && item.max_autonomous_discount !== undefined && (
                          <span>
                            Ceiling: <strong className="text-slate-200">{item.max_autonomous_discount}%</strong>
                          </span>
                        )}
                        <span className="text-slate-500 flex items-center gap-1">
                          <Layers className="w-3 h-3" /> {item.chunk_count} RAG chunks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                          item.is_active
                            ? "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {item.is_active ? "Pause" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete item and embeddings"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 3. Vector RAG Query Testing Console */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-100">Vector Semantic Q&A Console</h3>
              </div>
              <span className="text-xs text-slate-400">Tests cosine vector retrieval against active knowledge chunks</span>
            </div>

            <form onSubmit={handleRAGSearch} className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Ask any policy or pricing question (e.g. What discount applies for 150 units?)"
                className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={ragLoading || !ragQuery.trim()}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
              >
                {ragLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Query RAG
              </button>
            </form>

            {/* Answer Display */}
            {ragResult && (
              <div className="bg-slate-950 rounded-xl p-4 border border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-indigo-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Grounded AI Answer ({ragResult.model_used})
                  </span>
                  <span className="text-slate-400">
                    Confidence: {(ragResult.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-slate-200 leading-relaxed">{ragResult.answer}</p>

                {ragResult.sources && ragResult.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/60">
                    <div className="text-xs text-slate-500 mb-1.5">Cited Source Chunks:</div>
                    <div className="space-y-1.5">
                      {ragResult.sources.map((s, idx) => (
                        <div key={idx} className="text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800 text-slate-400 flex items-start justify-between gap-2">
                          <div>
                            <strong className="text-slate-300">[{idx + 1}] {s.document_title}</strong>
                            {s.section_heading && ` — ${s.section_heading}`}
                            <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{s.content}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 shrink-0">
                            {(s.similarity_score * 100).toFixed(0)}% match
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Dual-Brain Agentic Update Chat Panel */}
        {chatOpen && (
          <div className="lg:col-span-5 xl:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl flex flex-col h-[780px] shadow-2xl overflow-hidden sticky top-6">
            {/* Chat Panel Header */}
            <div className="p-4 border-b border-slate-800 bg-slate-900/90 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-indigo-500/20">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
                    Dual-Brain Update Console
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Friday & EDITH Live
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setTtsEnabled(!ttsEnabled)}
                  className={`p-1.5 rounded-lg border transition ${
                    ttsEnabled
                      ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/30"
                      : "text-slate-500 border-transparent hover:text-slate-300"
                  }`}
                  title={ttsEnabled ? "Speech audio enabled" : "Speech audio disabled"}
                >
                  {ttsEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Chat Message Stream */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === "operator" ? "items-end" : "items-start"
                  }`}
                >
                  <div className="text-[11px] text-slate-500 mb-1 px-1">
                    {msg.sender === "operator" ? "Operator" : "Friday (Gemini 3.1) & EDITH (NIM)"} • {msg.created_at}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.sender === "operator"
                        ? "bg-indigo-600 text-white rounded-br-none shadow-md shadow-indigo-500/10"
                        : "bg-slate-950 border border-slate-800 text-slate-200 rounded-bl-none"
                    }`}
                  >
                    <p>{msg.text}</p>

                    {/* EDITH Deliberation & Policy Badge */}
                    {msg.verdict && (
                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-400">EDITH Evaluation:</span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              msg.verdict === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            }`}
                          >
                            {msg.verdict === "ACCEPTED" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {msg.verdict}
                          </span>
                        </div>

                        {msg.reasoning && (
                          <p className="text-xs text-slate-400 leading-relaxed">{msg.reasoning}</p>
                        )}

                        {msg.suggestion && (
                          <div className="text-xs bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 text-amber-300">
                            💡 {msg.suggestion}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-400 text-xs p-2">
                  <Bot className="w-4 h-4 animate-bounce text-indigo-400" />
                  <span>Friday is formulating changes & EDITH is verifying commercial guardrails...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-3 border-t border-slate-800/60 bg-slate-950/40">
              <div className="text-[11px] text-slate-500 mb-1.5">Try an agentic update instruction:</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHAT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(s)}
                    disabled={chatLoading}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700/60 transition disabled:opacity-50 text-left"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="p-3 border-t border-slate-800 bg-slate-900">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Tell Friday & EDITH what to change..."
                  className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={chatLoading || !chatInput.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl transition disabled:opacity-50 shadow-md shadow-indigo-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Upload File Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-slate-100">Multi-Format File Ingestion</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Select Knowledge Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="business_info">Business Info (Policies, Certifications, FAQs)</option>
                  <option value="pricing_rule">Pricing Rules (Volume Tiers, Discounts)</option>
                  <option value="catalog_product">Catalog (Products, SKUs, MOQs)</option>
                  <option value="agent_guidance">Agent Guidance (Safety, Objections)</option>
                  <option value="custom">Custom Parameters</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tagging CSV/XLSX as Pricing Rules or Catalog parses structured tabular records automatically.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                  Choose File (PDF, DOCX, XLSX, CSV, JSON, MD, TXT)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.md,.txt"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-slate-200 hover:file:bg-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/20"
                >
                  {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? "Ingesting..." : "Upload & Index"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function KnowledgeHubPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400">Loading Knowledge Hub...</div>}>
      <KnowledgeHubMain />
    </Suspense>
  );
}
