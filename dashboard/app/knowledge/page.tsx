"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldCheck,
  DollarSign,
  Package,
  BookOpen,
  Bot,
  Sparkles,
  Plus,
  Search,
  Upload,
  RefreshCw,
  Layers,
  CheckCircle2,
  Trash2,
  FileSpreadsheet,
  FileText,
  Clock,
  Send,
  Sliders,
  Check,
  X,
  Calculator,
  Image as ImageIcon,
  Paperclip,
  CheckCircle,
  AlertCircle,
  Eye,
  ArrowUpRight,
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
  sender: "operator" | "edith";
  text: string;
  image_preview?: string;
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
  { id: "all", label: "All Items", icon: Layers, color: "text-slate-700 dark:text-slate-300" },
  { id: "business_info", label: "Business Info", icon: FileText, color: "text-red-600 dark:text-red-400" },
  { id: "pricing_rule", label: "Pricing Rules", icon: DollarSign, color: "text-emerald-600 dark:text-emerald-400" },
  { id: "catalog_product", label: "Catalog", icon: Package, color: "text-cyan-600 dark:text-cyan-400" },
  { id: "agent_guidance", label: "Agent Guidance", icon: BookOpen, color: "text-indigo-600 dark:text-indigo-400" },
  { id: "custom", label: "Custom", icon: Sliders, color: "text-amber-600 dark:text-amber-400" },
];

const QUICK_CHAT_SUGGESTIONS = [
  "Create a new pricing tier: 20% discount on 200+ units",
  "Update baseline catalog MOQ to 25 units",
  "Add 7-day transit damage replacement policy",
  "Give 35% discount for 50 units", // Triggers EDITH's commercial policy refusal!
];

const DEFAULT_SEED_ITEMS: KnowledgeItemRecord[] = [
  {
    id: "seed_doc_quality_cert",
    category: "business_info",
    title: "Quality Standards & Origin Authenticity",
    source_type: "policy_document",
    content_text: "Our enterprise adheres to strict commercial quality controls, source verification, and batch inspection standards. 100% compliance with applicable industry safety, purity, and manufacturing standards with COA certificates.",
    structured_data: {},
    version: 1,
    chunk_count: 2,
    is_active: true,
    created_by_brain: "SYSTEM",
  },
  {
    id: "seed_doc_sampling_policy",
    category: "business_info",
    title: "Commercial Sampling Policy & Evaluation Protocol",
    source_type: "policy_document",
    content_text: "For verified commercial buyers, hospitality groups, and distributors: standard sample kit charge is credited back 100% against your first commercial order meeting the baseline MOQ. Express delivery transit 2-4 days.",
    structured_data: {},
    version: 1,
    chunk_count: 2,
    is_active: true,
    created_by_brain: "SYSTEM",
  },
  {
    id: "seed_doc_logistics",
    category: "business_info",
    title: "Wholesale Freight, Logistics & Fulfillment Policy",
    source_type: "policy_document",
    content_text: "Surface commercial freight transit time 3-5 business days to major trade hubs. Real-time electronic dispatch tracking dispatched within 2 hours of container loading with tamper-evident barrier seals.",
    structured_data: {},
    version: 1,
    chunk_count: 2,
    is_active: true,
    created_by_brain: "SYSTEM",
  },
  {
    id: "seed_pr_rule_vol_50",
    category: "pricing_rule",
    title: "Tier 1: 50kg+ Volume Discount",
    source_type: "pricing_engine",
    content_text: "Standard wholesale volume tier providing 5% autonomous discount for orders exceeding 50kg or 50 units.",
    structured_data: {},
    min_quantity: 50,
    max_quantity: 99,
    discount_percentage: 5,
    max_autonomous_discount: 10,
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
  {
    id: "seed_pr_rule_vol_100",
    category: "pricing_rule",
    title: "Tier 2: 100kg+ Volume Discount",
    source_type: "pricing_engine",
    content_text: "Enterprise volume tier providing 10% autonomous discount for bulk purchase orders from 100kg to 499kg.",
    structured_data: {},
    min_quantity: 100,
    max_quantity: 499,
    discount_percentage: 10,
    max_autonomous_discount: 15,
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
  {
    id: "seed_pr_rule_vol_500",
    category: "pricing_rule",
    title: "Tier 3: 500kg+ Wholesale / Distributor Tier",
    source_type: "pricing_engine",
    content_text: "Maximum autonomous wholesale distributor tier providing 15% discount for 500kg+ bulk consignments.",
    structured_data: {},
    min_quantity: 500,
    discount_percentage: 15,
    max_autonomous_discount: 15,
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
  {
    id: "seed_prod_darjeeling",
    category: "catalog_product",
    title: "Darjeeling Spring First Flush Special",
    sku: "TEA-DARJ-FF01",
    source_type: "product_catalog",
    content_text: "Single-estate high-grown floral first flush tea with muscatel notes. Hand-plucked tender shoots.",
    base_price: 1250,
    unit: "kg",
    min_order_quantity: 5,
    structured_data: {},
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
  {
    id: "seed_prod_assam",
    category: "catalog_product",
    title: "Assam Kadak CTC Granules",
    sku: "TEA-ASSAM-CTC",
    source_type: "product_catalog",
    content_text: "Heavy-bodied malty CTC granules optimized for hospitality high-yield milk tea decoctions.",
    base_price: 340,
    unit: "kg",
    min_order_quantity: 25,
    structured_data: {},
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
  {
    id: "seed_prod_dooars",
    category: "catalog_product",
    title: "Dooars Terai Hotel Master Blend",
    sku: "TEA-DOOARS-HOTEL",
    source_type: "product_catalog",
    content_text: "High-volume hotel and catering blend offering robust color, brisk flavor, and exceptional commercial economy.",
    base_price: 280,
    unit: "kg",
    min_order_quantity: 50,
    structured_data: {},
    version: 1,
    chunk_count: 1,
    is_active: true,
    created_by_brain: "EDITH",
  },
];

function KnowledgeHubMain() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";

  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [items, setItems] = useState<KnowledgeItemRecord[]>(DEFAULT_SEED_ITEMS);
  const [loading, setLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [stats, setStats] = useState<Record<string, number>>({
    total: DEFAULT_SEED_ITEMS.length,
    business_info: DEFAULT_SEED_ITEMS.filter((i) => i.category === "business_info").length,
    pricing_rule: DEFAULT_SEED_ITEMS.filter((i) => i.category === "pricing_rule").length,
    catalog_product: DEFAULT_SEED_ITEMS.filter((i) => i.category === "catalog_product").length,
    agent_guidance: 0,
    custom: 0,
  });

  // EDITH Update Chat Console State
  const [chatOpen, setChatOpen] = useState(true);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ data: string; name: string; type: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      sender: "edith",
      text: "Hello! I am EDITH, your autonomous commercial closer and knowledge policy engine. I maintain all enterprise policies, volume discount tiers, and catalog products with strict margin protection. You can order me to create files, update pricing rules, or attach a screenshot to extract policies directly!",
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

  // Create File / Knowledge Asset Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createCategory, setCreateCategory] = useState<
    "business_info" | "pricing_rule" | "catalog_product" | "agent_guidance" | "custom"
  >("pricing_rule");
  const [createTitle, setCreateTitle] = useState("");
  const [createContent, setCreateContent] = useState("");
  const [createSku, setCreateSku] = useState("");
  const [createBasePrice, setCreateBasePrice] = useState<number | "">("");
  const [createUnit, setCreateUnit] = useState("kg");
  const [createMoq, setCreateMoq] = useState<number | "">("");
  const [createMinQty, setCreateMinQty] = useState<number | "">("");
  const [createMaxQty, setCreateMaxQty] = useState<number | "">("");
  const [createDiscount, setCreateDiscount] = useState<number | "">("");
  const [createMaxAutoDiscount, setCreateMaxAutoDiscount] = useState<number | "">("");
  const [createSegment, setCreateSegment] = useState("wholesale");
  const [creating, setCreating] = useState(false);

  // Quote Simulator State
  const [simQty, setSimQty] = useState(150);
  const [simPrice, setSimPrice] = useState(450);
  const [simSegment, setSimSegment] = useState("wholesale");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Fetch Items & Stats from Backend
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, statsRes] = await Promise.all([
        fetch("/api/v1/knowledge/items"),
        fetch("/api/v1/knowledge/stats"),
      ]);
      if (itemsRes.ok) {
        const data = await itemsRes.json();
        if (Array.isArray(data) && data.length > 0) {
          setItems(data);
        }
      }
      if (statsRes.ok) {
        const s = await statsRes.json();
        if (s && typeof s === "object") {
          setStats(s);
        }
      }
    } catch (err) {
      console.warn("Using baseline seed knowledge items:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Listen for Voice Agent & WebSocket live updates
  useEffect(() => {
    const handleVoiceUpdate = () => {
      fetchData();
    };
    window.addEventListener("knowledge-hub-updated", handleVoiceUpdate);

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
        } catch {}
      };
    } catch {}

    return () => {
      window.removeEventListener("knowledge-hub-updated", handleVoiceUpdate);
      if (ws) ws.close();
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Handle Clipboard Paste for Screenshots (Ctrl+V)
  const handlePaste = (e: React.ClipboardEvent) => {
    const clipItems = e.clipboardData?.items;
    if (!clipItems) return;

    for (let i = 0; i < clipItems.length; i++) {
      if (clipItems[i].type.indexOf("image") !== -1) {
        const file = clipItems[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (uploadEvent) => {
            const base64 = uploadEvent.target?.result as string;
            setAttachedImage({
              data: base64,
              name: file.name || "Pasted screenshot",
              type: file.type || "image/png",
            });
          };
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  // Handle File Input Selection for Screenshot / Image
  const handleImageFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64 = uploadEvent.target?.result as string;
        setAttachedImage({
          data: base64,
          name: file.name,
          type: file.type || "image/png",
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Chat Submit to EDITH
  const handleSendChat = async (msgText?: string) => {
    const textToSend = msgText || chatInput;
    if ((!textToSend.trim() && !attachedImage) || chatLoading) return;

    const userMsg: ChatMessage = {
      id: `user_${Date.now()}`,
      sender: "operator",
      text: textToSend.trim(),
      image_preview: attachedImage?.data,
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!msgText) setChatInput("");
    const imgToSend = attachedImage;
    setAttachedImage(null);
    setChatLoading(true);

    try {
      const res = await fetch("/api/v1/knowledge/update-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend.trim(),
          category_hint: activeTab !== "all" ? activeTab : undefined,
          image_data: imgToSend?.data,
          mime_type: imgToSend?.type,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        const edithReply: ChatMessage = {
          id: `edith_${Date.now()}`,
          sender: "edith",
          text: result.reply_text,
          proposal: result.friday_proposal,
          verdict: result.decision,
          reasoning: result.edith_evaluation?.reasoning,
          suggestion: result.edith_evaluation?.suggestion,
          created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        };
        setChatMessages((prev) => [...prev, edithReply]);

        if (result.decision === "ACCEPTED") {
          fetchData();
        }
      } else {
        const err = await res.json();
        setChatMessages((prev) => [
          ...prev,
          {
            id: `err_${Date.now()}`,
            sender: "edith",
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
          sender: "edith",
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

  // Handle Item Toggle Active (Pause / Activate)
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

  // Handle Direct Create Knowledge Item Submit
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createTitle.trim()) return;

    setCreating(true);
    try {
      let contentText = createContent.trim();
      if (!contentText) {
        if (createCategory === "pricing_rule") {
          contentText = `### ${createTitle}\n- Minimum Quantity: ${createMinQty || 0} units\n- Discount Percentage: ${createDiscount || 0}%\n- Customer Segment: ${createSegment}`;
        } else if (createCategory === "catalog_product") {
          contentText = `### ${createTitle}\n- SKU: ${createSku || "N/A"}\n- Base Price: ₹${createBasePrice || 0} per ${createUnit}\n- MOQ: ${createMoq || 1}`;
        } else {
          contentText = createTitle;
        }
      }

      const payload = {
        title: createTitle.trim(),
        category: createCategory,
        content_text: contentText,
        source_type: "operator_creation",
        sku: createSku.trim() || undefined,
        base_price: createBasePrice !== "" ? Number(createBasePrice) : undefined,
        unit: createUnit || "kg",
        min_order_quantity: createMoq !== "" ? Number(createMoq) : undefined,
        min_quantity: createMinQty !== "" ? Number(createMinQty) : undefined,
        max_quantity: createMaxQty !== "" ? Number(createMaxQty) : undefined,
        discount_percentage: createDiscount !== "" ? Number(createDiscount) : undefined,
        max_autonomous_discount: createMaxAutoDiscount !== "" ? Number(createMaxAutoDiscount) : (createDiscount !== "" ? Number(createDiscount) : undefined),
        customer_segment: createSegment,
      };

      const res = await fetch("/api/v1/knowledge/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setCreateModalOpen(false);
        // Reset form
        setCreateTitle("");
        setCreateContent("");
        setCreateSku("");
        setCreateBasePrice("");
        setCreateMoq("");
        setCreateMinQty("");
        setCreateMaxQty("");
        setCreateDiscount("");
        setCreateMaxAutoDiscount("");
        fetchData();
      } else {
        const err = await res.json();
        alert(`Creation failed: ${err.detail || "Server error"}`);
      }
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setCreating(false);
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
      {/* 1. Header Banner with Multi-Gradient Branding */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm dark:shadow-xl relative overflow-hidden transition-colors">
        <div className="absolute -right-10 -bottom-10 w-72 h-72 bg-gradient-to-tr from-cyan-500/10 via-red-500/5 to-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                Dual-Brain Architecture
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                Friday (Gemini Live) & EDITH (NVIDIA NIM)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live Sync Active
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3">
              Knowledge Hub & RAG Engine
            </h1>
            <p className="text-slate-600 dark:text-slate-400 text-sm mt-1.5 max-w-2xl leading-relaxed">
              Unified enterprise intelligence: company policies, volume pricing tiers, catalog items, and voice-driven agent guidance with real-time EDITH deliberation.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setCreateModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-medium text-sm flex items-center gap-2 transition shadow-md shadow-red-500/20"
            >
              <Plus className="w-4 h-4" />
              Create Asset
            </button>

            <button
              onClick={() => setUploadModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 font-medium text-sm flex items-center gap-2 transition"
            >
              <Upload className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              Import File
            </button>

            <button
              onClick={() => setChatOpen(!chatOpen)}
              className={`px-4 py-2.5 rounded-xl font-medium text-sm flex items-center gap-2 transition shadow-sm ${
                chatOpen
                  ? "bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Bot className="w-4 h-4" />
              {chatOpen ? "Hide EDITH" : "Open EDITH"}
            </button>

            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 border border-slate-200 dark:border-slate-700 transition"
              title="Refresh Knowledge Index"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Quick Stats Grid with Curated Color Palette */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="bg-slate-50 dark:bg-slate-950/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800/60">
            <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">Total Assets</div>
            <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{stats.total || items.length}</div>
          </div>
          <div className="bg-red-50/50 dark:bg-red-950/20 p-3 rounded-xl border border-red-200/60 dark:border-red-900/40">
            <div className="text-xs text-red-600 dark:text-red-400 mb-1 flex items-center gap-1 font-medium">
              <FileText className="w-3.5 h-3.5" /> Business Info
            </div>
            <div className="text-xl font-bold text-red-600 dark:text-red-300">
              {stats.business_info ?? items.filter((i) => i.category === "business_info").length}
            </div>
          </div>
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-3 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
            <div className="text-xs text-emerald-600 dark:text-emerald-400 mb-1 flex items-center gap-1 font-medium">
              <DollarSign className="w-3.5 h-3.5" /> Pricing Rules
            </div>
            <div className="text-xl font-bold text-emerald-600 dark:text-emerald-300">
              {stats.pricing_rule ?? items.filter((i) => i.category === "pricing_rule").length}
            </div>
          </div>
          <div className="bg-cyan-50/50 dark:bg-cyan-950/20 p-3 rounded-xl border border-cyan-200/60 dark:border-cyan-900/40">
            <div className="text-xs text-cyan-600 dark:text-cyan-400 mb-1 flex items-center gap-1 font-medium">
              <Package className="w-3.5 h-3.5" /> Catalog SKUs
            </div>
            <div className="text-xl font-bold text-cyan-600 dark:text-cyan-300">
              {stats.catalog_product ?? items.filter((i) => i.category === "catalog_product").length}
            </div>
          </div>
          <div className="bg-indigo-50/50 dark:bg-indigo-950/20 p-3 rounded-xl border border-indigo-200/60 dark:border-indigo-900/40">
            <div className="text-xs text-indigo-600 dark:text-indigo-400 mb-1 flex items-center gap-1 font-medium">
              <BookOpen className="w-3.5 h-3.5" /> Agent Guidance
            </div>
            <div className="text-xl font-bold text-indigo-600 dark:text-indigo-300">
              {stats.agent_guidance ?? items.filter((i) => i.category === "agent_guidance").length}
            </div>
          </div>
          <div className="bg-amber-50/50 dark:bg-amber-950/20 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40">
            <div className="text-xs text-amber-600 dark:text-amber-400 mb-1 flex items-center gap-1 font-medium">
              <Sliders className="w-3.5 h-3.5" /> Custom Config
            </div>
            <div className="text-xl font-bold text-amber-600 dark:text-amber-300">
              {stats.custom ?? items.filter((i) => i.category === "custom").length}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workspace Layout (Center Table & Right EDITH Chat Panel) */}
      <div className={`grid grid-cols-1 ${chatOpen ? "lg:grid-cols-12" : ""} gap-6`}>
        {/* Left / Center Column: Tabbed Content & Tables */}
        <div className={`${chatOpen ? "lg:col-span-7 xl:col-span-8" : "w-full"} space-y-6`}>
          {/* Category Navigation Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-2 flex flex-wrap gap-1.5 shadow-sm transition-colors">
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
                      ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 shadow-sm border border-slate-300/80 dark:border-slate-700/80"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${tab.color}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      isActive
                        ? "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-200"
                        : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Filter Toolbar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white dark:bg-slate-900/60 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Search by title, SKU, or keyword..."
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <span className="text-xs text-slate-500">
                Showing {filteredItems.length} of {items.length} items
              </span>
            </div>
          </div>

          {/* Content Switcher: Pricing Rule Dedicated Quote Simulator */}
          {activeTab === "pricing_rule" && (
            <div className="bg-white dark:bg-slate-900 border border-emerald-500/30 rounded-2xl p-5 shadow-sm dark:shadow-lg space-y-4 transition-colors">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Live B2B Quote Simulator</h3>
                    <p className="text-xs text-slate-500">Calculates deterministic price tiers & discount boundaries</p>
                  </div>
                </div>
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                  Deterministic Math
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Order Quantity (Units)</label>
                  <input
                    type="number"
                    value={simQty}
                    onChange={(e) => setSimQty(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Base Price / Unit (₹)</label>
                  <input
                    type="number"
                    value={simPrice}
                    onChange={(e) => setSimPrice(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-600 dark:text-slate-400 block mb-1">Customer Segment</label>
                  <select
                    value={simSegment}
                    onChange={(e) => setSimSegment(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                  >
                    <option value="wholesale">Wholesale Buyer</option>
                    <option value="distributor">Distributor / Bulk</option>
                    <option value="retail">Retail Store</option>
                  </select>
                </div>
              </div>

              {/* Simulation Result */}
              <div className="bg-slate-50 dark:bg-slate-950/80 rounded-xl p-4 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-slate-500">Matched Volume Tier</div>
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">{simQuote.matchedRule}</div>
                  <div className="text-xs text-slate-500 mt-1">
                    Applied Discount: <strong className="text-slate-800 dark:text-slate-200">{simQuote.appliedDiscount}%</strong>
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
                  <div className="text-sm font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    -₹{simQuote.discountAmt.toLocaleString()}
                  </div>
                </div>
                <div className="border-l border-slate-200 dark:border-slate-800 pl-4">
                  <div className="text-xs text-slate-500">Final Order Quote</div>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                    ₹{simQuote.finalTotal.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">
                    (₹{simQuote.unitAfterDiscount.toFixed(2)} / unit)
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Items Table / Grid */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm transition-colors">
            {loading ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-red-500" />
                <p className="text-sm">Synchronizing knowledge assets...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="p-12 text-center text-slate-500 space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <BookOpen className="w-6 h-6" />
                </div>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No knowledge items found</p>
                <p className="text-xs max-w-sm mx-auto text-slate-500">
                  Click &apos;Create Asset&apos;, import a file, or speak to Friday to add your first asset in this category.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/70">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                            item.category === "pricing_rule"
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                              : item.category === "catalog_product"
                              ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                              : item.category === "agent_guidance"
                              ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                              : item.category === "custom"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                          }`}
                        >
                          {item.category.replace("_", " ").toUpperCase()}
                        </span>

                        {item.sku && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                            {item.sku}
                          </span>
                        )}

                        <span className="text-xs text-slate-400">v{item.version}</span>

                        <span
                          className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 ${
                            item.is_active
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                              : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              item.is_active ? "bg-emerald-500" : "bg-red-500"
                            }`}
                          />
                          {item.is_active ? "Active" : "Paused"}
                        </span>
                      </div>

                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{item.title}</h4>

                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.content_text.replace(/^#+\s+/gm, "").slice(0, 160)}...
                      </p>

                      {/* Structured Details Preview */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs text-slate-500">
                        {item.base_price !== null && item.base_price !== undefined && (
                          <span>
                            Base: <strong className="text-slate-900 dark:text-slate-200">₹{item.base_price}</strong> / {item.unit || "unit"}
                          </span>
                        )}
                        {item.min_order_quantity && (
                          <span>
                            MOQ: <strong className="text-slate-900 dark:text-slate-200">{item.min_order_quantity}</strong>
                          </span>
                        )}
                        {item.discount_percentage !== null && item.discount_percentage !== undefined && (
                          <span>
                            Discount: <strong className="text-emerald-600 dark:text-emerald-400">{item.discount_percentage}%</strong>
                          </span>
                        )}
                        {item.max_autonomous_discount !== null && item.max_autonomous_discount !== undefined && (
                          <span>
                            Ceiling: <strong className="text-slate-900 dark:text-slate-200">{item.max_autonomous_discount}%</strong>
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" /> {item.chunk_count} RAG chunks
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                      <button
                        onClick={() => handleToggleActive(item.id)}
                        className={`text-xs px-2.5 py-1 rounded-lg border transition font-medium ${
                          item.is_active
                            ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-red-50 dark:hover:bg-red-950/30 hover:text-red-600 dark:hover:text-red-400 hover:border-red-300"
                            : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20"
                        }`}
                      >
                        {item.is_active ? "Pause" : "Activate"}
                      </button>

                      <button
                        onClick={() => handleDeleteItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition"
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
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4 transition-colors">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-red-500" />
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Vector Semantic Q&A Console</h3>
              </div>
              <span className="text-xs text-slate-500">Tests cosine vector retrieval against active knowledge chunks</span>
            </div>

            <form onSubmit={handleRAGSearch} className="flex gap-2">
              <input
                type="text"
                value={ragQuery}
                onChange={(e) => setRagQuery(e.target.value)}
                placeholder="Ask any policy or pricing question (e.g. What discount applies for 150 units?)"
                className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
              <button
                type="submit"
                disabled={ragLoading || !ragQuery.trim()}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-medium transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-red-500/20"
              >
                {ragLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Query RAG
              </button>
            </form>

            {/* Answer Display */}
            {ragResult && (
              <div className="bg-slate-50 dark:bg-slate-950 rounded-xl p-4 border border-slate-200 dark:border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-red-600 dark:text-red-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Grounded Answer ({ragResult.model_used})
                  </span>
                  <span className="text-slate-500">
                    Confidence: {(ragResult.confidence_score * 100).toFixed(1)}%
                  </span>
                </div>
                <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed">{ragResult.answer}</p>

                {ragResult.sources && ragResult.sources.length > 0 && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-800/60">
                    <div className="text-xs text-slate-500 mb-1.5">Cited Source Chunks:</div>
                    <div className="space-y-1.5">
                      {ragResult.sources.map((s, idx) => (
                        <div key={idx} className="text-xs bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 flex items-start justify-between gap-2 shadow-xs">
                          <div>
                            <strong className="text-slate-900 dark:text-slate-200">[{idx + 1}] {s.document_title}</strong>
                            {s.section_heading && ` — ${s.section_heading}`}
                            <p className="text-slate-500 text-[11px] mt-0.5 line-clamp-1">{s.content}</p>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-300 shrink-0 font-medium">
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

        {/* Right Column: EDITH Agentic Update Chat Panel */}
        {chatOpen && (
          <div className="lg:col-span-5 xl:col-span-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col h-[780px] shadow-lg dark:shadow-2xl overflow-hidden sticky top-6 transition-colors">
            {/* Chat Panel Header - EDITH Live Branding */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/90 backdrop-blur flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center p-1 shadow-sm">
                  <img
                    src="/logo-icon.png"
                    alt="EDITH"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    EDITH Live
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-bold">
                      NVIDIA NIM
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Commercial & Policy Engine
                  </div>
                </div>
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
                  <div className="text-[11px] text-slate-500 mb-1 px-1 flex items-center gap-1">
                    {msg.sender === "operator" ? (
                      "Operator"
                    ) : (
                      <>
                        <span className="font-semibold text-red-600 dark:text-red-400">EDITH</span>
                      </>
                    )}
                    {" • "}
                    {msg.created_at}
                  </div>

                  <div
                    className={`max-w-[90%] rounded-2xl p-3.5 text-sm leading-relaxed ${
                      msg.sender === "operator"
                        ? "bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-br-none shadow-md shadow-red-500/10"
                        : "bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-200 rounded-bl-none shadow-xs"
                    }`}
                  >
                    {/* Attached Image Preview if operator sent screenshot */}
                    {msg.image_preview && (
                      <div className="mb-2 rounded-lg overflow-hidden border border-white/20 max-h-48">
                        <img
                          src={msg.image_preview}
                          alt="Attached Screenshot"
                          className="w-full h-auto object-cover"
                        />
                      </div>
                    )}

                    <p>{msg.text}</p>

                    {/* EDITH Deliberation & Policy Badge */}
                    {msg.verdict && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800/80 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                            Commercial Evaluation:
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                              msg.verdict === "ACCEPTED"
                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                            }`}
                          >
                            {msg.verdict === "ACCEPTED" ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                            {msg.verdict}
                          </span>
                        </div>

                        {msg.reasoning && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{msg.reasoning}</p>
                        )}

                        {msg.suggestion && (
                          <div className="text-xs bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 rounded-lg p-2 text-amber-800 dark:text-amber-300">
                            💡 {msg.suggestion}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {chatLoading && (
                <div className="flex items-center gap-2 text-slate-500 text-xs p-2">
                  <Bot className="w-4 h-4 animate-bounce text-red-500" />
                  <span>EDITH is evaluating commercial guardrails and writing file updates...</span>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/40">
              <div className="text-[11px] text-slate-500 mb-1.5 font-medium">Try an update directive:</div>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_CHAT_SUGGESTIONS.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSendChat(s)}
                    disabled={chatLoading}
                    className="text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700/60 transition disabled:opacity-50 text-left shadow-xs"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar with Screenshot Attachment and Paste Support */}
            <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              {attachedImage && (
                <div className="mb-2 p-1.5 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between gap-2 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 truncate">
                    <img
                      src={attachedImage.data}
                      alt="Attachment Preview"
                      className="w-7 h-7 rounded-md object-cover border border-slate-300 dark:border-slate-600 shrink-0"
                    />
                    <span className="truncate font-medium">{attachedImage.name}</span>
                  </div>
                  <button
                    onClick={() => setAttachedImage(null)}
                    className="p-1 text-slate-400 hover:text-red-500 transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendChat();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageFileSelect}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  title="Attach screenshot or document image"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onPaste={handlePaste}
                  placeholder="Order EDITH to update knowledge, or paste (Ctrl+V) screenshot..."
                  className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-red-500 transition-colors"
                />

                <button
                  type="submit"
                  disabled={chatLoading || (!chatInput.trim() && !attachedImage)}
                  className="p-2.5 bg-red-600 hover:bg-red-500 text-white rounded-xl transition disabled:opacity-50 shadow-md shadow-red-500/20"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Create File / Knowledge Asset Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-red-500" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Create Knowledge Asset / File</h3>
              </div>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Category
                </label>
                <select
                  value={createCategory}
                  onChange={(e) => setCreateCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-red-500"
                >
                  <option value="pricing_rule">Pricing Rule (Volume Tiers, Discounts)</option>
                  <option value="catalog_product">Catalog Product (SKU, Base Price, MOQ)</option>
                  <option value="business_info">Business Info (Policy, Certifications, FAQ)</option>
                  <option value="agent_guidance">Agent Guidance (Safety, Objections)</option>
                  <option value="custom">Custom Configuration</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Title / Name *
                </label>
                <input
                  type="text"
                  required
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  placeholder={
                    createCategory === "pricing_rule"
                      ? "e.g. Tier 4: 1000kg+ Enterprise Distributor Tier"
                      : createCategory === "catalog_product"
                      ? "e.g. Organic Oolong Special Reserve"
                      : "e.g. 14-Day Commercial Replacement Policy"
                  }
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              {/* Dynamic inputs based on selected category */}
              {createCategory === "pricing_rule" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Min Quantity (Units)
                    </label>
                    <input
                      type="number"
                      value={createMinQty}
                      onChange={(e) => setCreateMinQty(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 100"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Discount % *
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={createDiscount}
                      onChange={(e) => setCreateDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 12"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Max Autonomous Discount %
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      value={createMaxAutoDiscount}
                      onChange={(e) => setCreateMaxAutoDiscount(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 15"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Customer Segment
                    </label>
                    <select
                      value={createSegment}
                      onChange={(e) => setCreateSegment(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500"
                    >
                      <option value="wholesale">Wholesale Buyer</option>
                      <option value="distributor">Distributor / Bulk</option>
                      <option value="retail">Retail Store</option>
                    </select>
                  </div>
                </div>
              )}

              {createCategory === "catalog_product" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      SKU Code
                    </label>
                    <input
                      type="text"
                      value={createSku}
                      onChange={(e) => setCreateSku(e.target.value)}
                      placeholder="e.g. TEA-OOLONG-01"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Base Price (₹)
                    </label>
                    <input
                      type="number"
                      value={createBasePrice}
                      onChange={(e) => setCreateBasePrice(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 750"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={createUnit}
                      onChange={(e) => setCreateUnit(e.target.value)}
                      placeholder="e.g. kg, pack, carton"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                      Minimum Order Qty (MOQ)
                    </label>
                    <input
                      type="number"
                      value={createMoq}
                      onChange={(e) => setCreateMoq(e.target.value === "" ? "" : Number(e.target.value))}
                      placeholder="e.g. 10"
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1">
                  Content / Policy Details (Markdown supported)
                </label>
                <textarea
                  rows={4}
                  value={createContent}
                  onChange={(e) => setCreateContent(e.target.value)}
                  placeholder="Provide complete terms, specifications, or rules to be indexed into RAG embeddings..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || !createTitle.trim()}
                  className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-red-500/20"
                >
                  {creating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {creating ? "Creating & Embedding..." : "Create Asset"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload File Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">Multi-Format File Ingestion</h3>
              </div>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                  Select Category
                </label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-cyan-500"
                >
                  <option value="business_info">Business Info (Policies, Certifications, FAQs)</option>
                  <option value="pricing_rule">Pricing Rules (Volume Tiers, Discounts)</option>
                  <option value="catalog_product">Catalog (Products, SKUs, MOQs)</option>
                  <option value="agent_guidance">Agent Guidance (Safety, Objections)</option>
                  <option value="custom">Custom Parameters</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tagging CSV/XLSX as Pricing Rules or Catalog automatically parses rows into structured items.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-400 block mb-1.5">
                  Choose File (PDF, DOCX, XLSX, CSV, JSON, MD, TXT)
                </label>
                <input
                  type="file"
                  accept=".pdf,.docx,.xlsx,.xls,.csv,.json,.md,.txt"
                  onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-200 hover:file:bg-slate-200 dark:hover:file:bg-slate-700"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!uploadFile || uploading}
                  className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-sm font-semibold transition disabled:opacity-50 flex items-center gap-2 shadow-md shadow-cyan-500/20"
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
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading Knowledge Hub...</div>}>
      <KnowledgeHubMain />
    </Suspense>
  );
}
