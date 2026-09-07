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
  Edit3,
  Save,
  Table,
  Copy,
  Printer,
  FileCode,
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
  verdict?: "ACCEPTED" | "DENIED" | "INFO";
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

  // Interactive Asset Viewer & Manual Editor Modal State
  const [editingItem, setEditingItem] = useState<KnowledgeItemRecord | null>(null);
  const [editorMode, setEditorMode] = useState<"spreadsheet" | "document" | "raw">("spreadsheet");
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState<
    "business_info" | "pricing_rule" | "catalog_product" | "agent_guidance" | "custom"
  >("pricing_rule");
  const [editContentText, setEditContentText] = useState("");
  const [editSku, setEditSku] = useState("");
  const [editBasePrice, setEditBasePrice] = useState<number | "">("");
  const [editUnit, setEditUnit] = useState("kg");
  const [editMoq, setEditMoq] = useState<number | "">("");
  const [editMinQty, setEditMinQty] = useState<number | "">("");
  const [editMaxQty, setEditMaxQty] = useState<number | "">("");
  const [editDiscountPct, setEditDiscountPct] = useState<number | "">("");
  const [editMaxAutonDiscount, setEditMaxAutonDiscount] = useState<number | "">("");
  const [editCustomerSegment, setEditCustomerSegment] = useState("wholesale");
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editSaveToast, setEditSaveToast] = useState<string | null>(null);
  const [copiedDocContent, setCopiedDocContent] = useState(false);

  // Universal Multi-Industry Dynamic Spreadsheet Matrix State
  const [gridColumns, setGridColumns] = useState<string[]>([]);
  const [gridRows, setGridRows] = useState<string[][]>([]);
  const [newColName, setNewColName] = useState("");
  const [addingCol, setAddingCol] = useState(false);
  const [docEditing, setDocEditing] = useState(false);
  const [fridayActionNotice, setFridayActionNotice] = useState<string | null>(null);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [rawCsvInput, setRawCsvInput] = useState("");

  // Universal Multi-Industry Schema Presets (Wholesale, Manufacturing, SaaS, Logistics)
  const INDUSTRY_PRESETS = [
    {
      id: "wholesale",
      label: "📦 Wholesale & Distribution",
      columns: ["Tier / Item", "Min Qty", "Max Qty", "Base Tariff (₹)", "Discount %", "Margin Ceiling %", "Lead Time", "Payment Terms"],
      rows: [
        ["Standard Commercial", "50", "99", "450", "5%", "10%", "2-3 Days", "Net 15"],
        ["Volume Tier", "100", "499", "410", "12%", "15%", "3-5 Days", "Net 30"],
        ["Distributor Consignment", "500", "2000", "360", "18%", "20%", "5-7 Days", "50% Advance"],
      ],
    },
    {
      id: "manufacturing",
      label: "🏭 Manufacturing & Materials",
      columns: ["Part # / Material", "Grade / Spec", "Unit MOQ", "Unit Cost (₹)", "Bulk Discount %", "QC Standard", "Dispatch SLA"],
      rows: [
        ["ALUM-6061-T6", "Aerospace Grade Billet", "100 kg", "280", "8%", "ISO 9001 / ASTM B221", "48 Hours"],
        ["STEEL-316L", "Marine Austenitic Stainless", "250 kg", "340", "12%", "EN 10088-3 Cert", "72 Hours"],
        ["POLY-HDPE-01", "High Density Polymer Granules", "500 kg", "110", "15%", "RoHS Compliant", "24 Hours"],
      ],
    },
    {
      id: "saas",
      label: "💻 SaaS & Cloud Services",
      columns: ["Plan / Tier", "Seats / Quota", "Monthly (₹)", "Annual (₹)", "Volume Discount %", "SLA Guarantee", "Support Level"],
      rows: [
        ["Starter Cloud", "1-5 Users", "2499", "24990", "10%", "99.5%", "Email / Standard"],
        ["Growth Business", "6-25 Users", "7999", "79990", "15%", "99.9%", "Priority 24/7"],
        ["Enterprise Custom", "Unlimited", "24999", "249990", "25%", "99.99%", "Dedicated TAM"],
      ],
    },
    {
      id: "logistics",
      label: "🚚 Logistics & Freight",
      columns: ["Zone / Route", "Weight Min (kg)", "Weight Max (kg)", "Base Tariff (₹)", "Fuel Surcharge %", "Transit Days", "Tracking"],
      rows: [
        ["Intra-State Surface", "20", "100", "45/kg", "4%", "1-2 Days", "Live GPS / API"],
        ["Inter-State Metro Hubs", "100", "500", "38/kg", "5%", "3-4 Days", "Automated Milestones"],
        ["National Bulk Cargo", "500", "5000", "28/kg", "6%", "4-6 Days", "Dedicated Container"],
      ],
    },
  ];

  const applyIndustryPreset = (preset: (typeof INDUSTRY_PRESETS)[0]) => {
    syncGridToContent(preset.columns, preset.rows);
  };

  const handleImportCsv = () => {
    if (!rawCsvInput.trim()) return;
    const lines = rawCsvInput.trim().split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const delimiter = lines[0].includes("\t") ? "\t" : lines[0].includes("|") ? "|" : ",";
    const parseLine = (line: string) => {
      if (delimiter === "|") {
        return line.slice(line.startsWith("|") ? 1 : 0, line.endsWith("|") ? -1 : undefined).split("|").map((s) => s.trim());
      }
      return line.split(delimiter).map((s) => s.trim().replace(/^["']|["']$/g, ""));
    };

    const parsedHeader = parseLine(lines[0]).filter(Boolean);
    const dataLines = lines.slice(1).filter((l) => !l.includes("---"));
    const parsedRows = dataLines.map((l) => {
      const cells = parseLine(l);
      while (cells.length < parsedHeader.length) cells.push("");
      return cells.slice(0, parsedHeader.length);
    });

    if (parsedHeader.length > 0 && parsedRows.length > 0) {
      syncGridToContent(parsedHeader, parsedRows);
      setShowCsvImport(false);
      setRawCsvInput("");
    }
  };

  // Quote Simulator State
  const [simQty, setSimQty] = useState(150);
  const [simPrice, setSimPrice] = useState(450);
  const [simSegment, setSimSegment] = useState("wholesale");

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Helper: Parse markdown table into columns and rows
  const parseMarkdownTable = (text: string): { columns: string[]; rows: string[][] } | null => {
    if (!text) return null;
    const lines = text.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("|") && l.endsWith("|"));
    if (lines.length >= 2) {
      const headerLine = lines[0];
      const headers = headerLine.slice(1, -1).split("|").map((h) => h.trim());
      const dataLines = lines.slice(1).filter((l) => !l.replace(/[\s|:-]/g, "") === false && !l.includes("---"));
      const rows = dataLines.map((l) => l.slice(1, -1).split("|").map((c) => c.trim()));
      if (headers.length > 0 && rows.length > 0) {
        return { columns: headers, rows };
      }
    }
    return null;
  };

  // Helper: Format columns and rows into Markdown table
  const formatMarkdownTable = (cols: string[], rows: string[][]): string => {
    if (cols.length === 0) return "";
    const header = `| ${cols.join(" | ")} |`;
    const sep = `| ${cols.map(() => "---").join(" | ")} |`;
    const body = rows.map((r) => `| ${cols.map((_, i) => r[i] !== undefined ? r[i] : "").join(" | ")} |`).join("\n");
    return `${header}\n${sep}\n${body}`;
  };

  // Sync grid change to content text
  const syncGridToContent = (cols: string[], rows: string[][]) => {
    setGridColumns(cols);
    setGridRows(rows);
    const tableMd = formatMarkdownTable(cols, rows);
    // Keep non-table header lines if present
    const nonTableLines = editContentText.split("\n").filter((l) => !l.trim().startsWith("|") || !l.trim().endsWith("|")).join("\n").trim();
    const updatedContent = nonTableLines ? `${nonTableLines}\n\n${tableMd}` : tableMd;
    setEditContentText(updatedContent);
  };

  // Dynamic Add Column
  const handleAddColumn = (name?: string) => {
    const colName = name?.trim() || newColName.trim() || `Parameter ${gridColumns.length + 1}`;
    const updatedCols = [...gridColumns, colName];
    const updatedRows = gridRows.map((r) => [...r, ""]);
    syncGridToContent(updatedCols, updatedRows);
    setNewColName("");
    setAddingCol(false);
  };

  // Dynamic Delete Column
  const handleDeleteColumn = (colIdx: number) => {
    if (gridColumns.length <= 1) return;
    const updatedCols = gridColumns.filter((_, i) => i !== colIdx);
    const updatedRows = gridRows.map((r) => r.filter((_, i) => i !== colIdx));
    syncGridToContent(updatedCols, updatedRows);
  };

  // Dynamic Add Row
  const handleAddRow = (initialRow?: string[]) => {
    const newRow = initialRow && initialRow.length === gridColumns.length 
      ? initialRow 
      : gridColumns.map((_, i) => (i === 0 ? `Item ${gridRows.length + 1}` : ""));
    const updatedRows = [...gridRows, newRow];
    syncGridToContent(gridColumns, updatedRows);
  };

  // Dynamic Delete Row
  const handleDeleteRow = (rowIdx: number) => {
    if (gridRows.length <= 1) return;
    const updatedRows = gridRows.filter((_, i) => i !== rowIdx);
    syncGridToContent(gridColumns, updatedRows);
  };

  // Update Specific Cell
  const handleCellChange = (rowIdx: number, colIdx: number, val: string) => {
    const updatedRows = gridRows.map((r, ri) =>
      ri === rowIdx ? r.map((c, ci) => (ci === colIdx ? val : c)) : r
    );
    syncGridToContent(gridColumns, updatedRows);

    // If editing a pricing rule or catalog item, auto-sync numeric attributes
    if (rowIdx === 0) {
      const colLower = (gridColumns[colIdx] || "").toLowerCase();
      if (colLower.includes("min") || colLower.includes("moq")) {
        const n = Number(val);
        if (!isNaN(n)) setEditMinQty(n);
      }
      if (colLower.includes("discount") || colLower.includes("rate")) {
        const n = Number(val.replace("%", "").trim());
        if (!isNaN(n)) setEditDiscountPct(n);
      }
      if (colLower.includes("price") || colLower.includes("cost") || colLower.includes("tariff")) {
        const n = Number(val.replace("₹", "").trim());
        if (!isNaN(n)) setEditBasePrice(n);
      }
      if (colLower.includes("sku") || colLower.includes("code")) {
        setEditSku(val);
      }
    }
  };

  // Rename Column Header
  const handleRenameColumn = (colIdx: number, newName: string) => {
    const updatedCols = gridColumns.map((c, i) => (i === colIdx ? newName : c));
    syncGridToContent(updatedCols, gridRows);
  };

  // Helper to open the editor with full multi-industry parsing
  const handleOpenEditor = (item: KnowledgeItemRecord) => {
    setEditingItem(item);
    setEditTitle(item.title);
    setEditCategory(item.category);
    setEditContentText(item.content_text);
    setEditSku(item.sku || "");
    setEditBasePrice(item.base_price !== null && item.base_price !== undefined ? item.base_price : "");
    setEditUnit(item.unit || "kg");
    setEditMoq(item.min_order_quantity !== null && item.min_order_quantity !== undefined ? item.min_order_quantity : "");
    setEditMinQty(item.min_quantity !== null && item.min_quantity !== undefined ? item.min_quantity : "");
    setEditMaxQty(item.max_quantity !== null && item.max_quantity !== undefined ? item.max_quantity : "");
    setEditDiscountPct(item.discount_percentage !== null && item.discount_percentage !== undefined ? item.discount_percentage : "");
    setEditMaxAutonDiscount(item.max_autonomous_discount !== null && item.max_autonomous_discount !== undefined ? item.max_autonomous_discount : "");
    setEditCustomerSegment(item.customer_segment || "wholesale");
    setDocEditing(false);

    // Parse existing Markdown table if present
    const parsed = parseMarkdownTable(item.content_text);
    if (parsed) {
      setGridColumns(parsed.columns);
      setGridRows(parsed.rows);
    } else if (item.category === "pricing_rule") {
      setGridColumns(["Tier Name", "Min Volume", "Max Volume", "Discount %", "Ceiling %", "Segment", "Lead Time / Custom"]);
      setGridRows([[
        item.title,
        String(item.min_quantity || 100),
        String(item.max_quantity || "No limit"),
        String(item.discount_percentage || 12),
        String(item.max_autonomous_discount || 15),
        item.customer_segment || "wholesale",
        "3-5 days delivery"
      ]]);
    } else if (item.category === "catalog_product") {
      setGridColumns(["SKU Code", "Product Name", "Base Price", "Unit", "MOQ", "Specification / Grade", "Availability"]);
      setGridRows([[
        item.sku || "PROD-001",
        item.title,
        String(item.base_price || 450),
        item.unit || "unit",
        String(item.min_order_quantity || 10),
        "Commercial Grade",
        "In Stock"
      ]]);
    } else {
      setGridColumns(["Clause / Parameter", "Policy Specification", "Governance Scope", "Standard / SLA"]);
      setGridRows([[
        item.title,
        item.content_text.replace(/^#+\s+/gm, "").slice(0, 100) || "Enterprise policy directive",
        item.customer_segment || "All Operations",
        "ISO/Commercial Compliance"
      ]]);
    }

    // Natural default view
    if (item.category === "pricing_rule" || item.category === "catalog_product") {
      setEditorMode("spreadsheet");
    } else {
      setEditorMode("document");
    }
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSavingEdit(true);
    setEditSaveToast(null);

    try {
      const payload: any = {
        title: editTitle.trim() || editingItem.title,
        category: editCategory,
        content_text: editContentText.trim() || editingItem.content_text,
        sku: editSku.trim() || null,
        base_price: editBasePrice !== "" ? Number(editBasePrice) : null,
        unit: editUnit || "unit",
        min_order_quantity: editMoq !== "" ? Number(editMoq) : null,
        min_quantity: editMinQty !== "" ? Number(editMinQty) : null,
        max_quantity: editMaxQty !== "" ? Number(editMaxQty) : null,
        discount_percentage: editDiscountPct !== "" ? Number(editDiscountPct) : null,
        max_autonomous_discount: editMaxAutonDiscount !== "" ? Number(editMaxAutonDiscount) : null,
        customer_segment: editCustomerSegment || null,
      };

      const res = await fetch(`/api/v1/knowledge/items/${editingItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        const updatedRecord = data.item || {
          ...editingItem,
          ...payload,
          version: (editingItem.version || 1) + 1,
        };

        setItems((prev) =>
          prev.map((it) => (it.id === editingItem.id ? updatedRecord : it))
        );

        setEditSaveToast("Saved successfully! Knowledge and RAG chunks synchronized live.");
        window.dispatchEvent(new CustomEvent("knowledge-hub-updated"));
        setTimeout(() => {
          setEditingItem(null);
          setEditSaveToast(null);
        }, 800);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Failed to save: ${err.detail || "Server error"}`);
      }
    } catch (e) {
      alert("Network error updating knowledge asset.");
    } finally {
      setIsSavingEdit(false);
    }
  };

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

  // Real-Time FRIDAY Voice Copilot Action Bus (Visual clicking, typing, adding rows/columns, saving)
  useEffect(() => {
    const handleFridayOpen = (e: any) => {
      const query = (e.detail?.query || e.detail?.title || e.detail?.id || "").toLowerCase().trim();
      let match = items.find((it) =>
        it.id.toLowerCase().includes(query) ||
        it.title.toLowerCase().includes(query) ||
        it.category.toLowerCase().includes(query) ||
        (it.sku && it.sku.toLowerCase().includes(query))
      );
      if (!match && items.length > 0) match = items[0];
      if (match) {
        handleOpenEditor(match);
        setFridayActionNotice(`FRIDAY: Opened knowledge editor for "${match.title}"`);
        setTimeout(() => setFridayActionNotice(null), 4000);
      }
    };

    const handleFridaySwitch = (e: any) => {
      const mode = e.detail?.mode;
      if (mode === "spreadsheet" || mode === "document" || mode === "raw") {
        setEditorMode(mode);
        if (mode === "document") setDocEditing(true);
        setFridayActionNotice(`FRIDAY: Switched editor view to ${mode.toUpperCase()} mode`);
        setTimeout(() => setFridayActionNotice(null), 4000);
      }
    };

    const handleFridayAddCol = (e: any) => {
      const name = e.detail?.name;
      handleAddColumn(name);
      setFridayActionNotice(`FRIDAY: Added dynamic column "${name || 'New Parameter'}"`);
      setTimeout(() => setFridayActionNotice(null), 4000);
    };

    const handleFridayAddRow = (e: any) => {
      const vals = e.detail?.values;
      handleAddRow(vals);
      setFridayActionNotice("FRIDAY: Added new row to dynamic matrix");
      setTimeout(() => setFridayActionNotice(null), 4000);
    };

    const handleFridayEdit = (e: any) => {
      const { field, value, rowIndex, colIndex, colName } = e.detail || {};
      const f = (field || "").toLowerCase();
      if (f === "title") setEditTitle(String(value));
      else if (f === "sku") setEditSku(String(value));
      else if (f === "price" || f === "base_price") setEditBasePrice(value === "" ? "" : Number(value));
      else if (f === "unit") setEditUnit(String(value));
      else if (f === "moq") setEditMoq(value === "" ? "" : Number(value));
      else if (f === "min_qty" || f === "min_quantity") setEditMinQty(value === "" ? "" : Number(value));
      else if (f === "max_qty" || f === "max_quantity") setEditMaxQty(value === "" ? "" : Number(value));
      else if (f === "discount" || f === "discount_pct") setEditDiscountPct(value === "" ? "" : Number(value));
      else if (f === "ceiling" || f === "max_discount") setEditMaxAutonDiscount(value === "" ? "" : Number(value));
      else if (f === "segment") setEditCustomerSegment(String(value));
      else if (f === "content" || f === "text") setEditContentText(String(value));
      else if (f === "cell") {
        const r = typeof rowIndex === "number" ? rowIndex : 0;
        let c = typeof colIndex === "number" ? colIndex : 0;
        if (colName) {
          const idx = gridColumns.findIndex((cn) => cn.toLowerCase().includes(String(colName).toLowerCase()));
          if (idx !== -1) c = idx;
        }
        handleCellChange(r, c, String(value));
      }
      setFridayActionNotice(`FRIDAY: Updated ${field} -> "${value}"`);
      setTimeout(() => setFridayActionNotice(null), 4000);
    };

    const handleFridaySave = () => {
      handleSaveEdit();
      setFridayActionNotice("FRIDAY: Persisted knowledge asset live to RAG embeddings");
      setTimeout(() => setFridayActionNotice(null), 4000);
    };

    window.addEventListener("friday-open-editor" as any, handleFridayOpen);
    window.addEventListener("friday-switch-mode" as any, handleFridaySwitch);
    window.addEventListener("friday-add-column" as any, handleFridayAddCol);
    window.addEventListener("friday-add-row" as any, handleFridayAddRow);
    window.addEventListener("friday-edit-field" as any, handleFridayEdit);
    window.addEventListener("friday-save-editor" as any, handleFridaySave);

    return () => {
      window.removeEventListener("friday-open-editor" as any, handleFridayOpen);
      window.removeEventListener("friday-switch-mode" as any, handleFridaySwitch);
      window.removeEventListener("friday-add-column" as any, handleFridayAddCol);
      window.removeEventListener("friday-add-row" as any, handleFridayAddRow);
      window.removeEventListener("friday-edit-field" as any, handleFridayEdit);
      window.removeEventListener("friday-save-editor" as any, handleFridaySave);
    };
  }, [items, gridColumns, gridRows, editContentText, editingItem, editTitle, editCategory, editSku, editBasePrice, editUnit, editMoq, editMinQty, editMaxQty, editDiscountPct, editMaxAutonDiscount, editCustomerSegment]);

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

                      <h4
                        onClick={() => handleOpenEditor(item)}
                        className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate cursor-pointer hover:text-cyan-600 dark:hover:text-cyan-400 transition flex items-center gap-1.5"
                        title="Click to view and edit"
                      >
                        {item.title}
                        <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-slate-400 transition" />
                      </h4>

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
                        onClick={() => handleOpenEditor(item)}
                        className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition font-medium flex items-center gap-1.5 shadow-sm"
                        title="View spreadsheet or edit manually"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                        <span>Edit</span>
                      </button>

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

                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* EDITH Deliberation & Policy Badge (Shown only for actual file creation/modification verdicts) */}
                    {msg.verdict && msg.verdict !== "INFO" && (
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

      {/* 4. Interactive Asset Viewer & Manual Editor Modal (Excel Grid, PDF Doc Preview, & Live Editor) */}
      {editingItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl relative my-auto flex flex-col max-h-[94vh] overflow-hidden transition-all">
            {/* Friday Live Action Copilot Notice */}
            {fridayActionNotice && (
              <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between animate-pulse shadow-md z-10">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-200" />
                  <span className="font-bold tracking-wide">{fridayActionNotice}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded font-bold">FRIDAY LIVE COPILOT</span>
              </div>
            )}

            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 flex-wrap min-w-0">
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                    editCategory === "pricing_rule"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                      : editCategory === "catalog_product"
                      ? "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500/20"
                      : editCategory === "agent_guidance"
                      ? "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20"
                      : editCategory === "custom"
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20"
                  }`}
                >
                  {editCategory.replace("_", " ")}
                </span>

                <span className="text-xs px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-mono">
                  v{editingItem.version || 1}.0
                </span>

                <span
                  className={`text-xs px-2 py-0.5 rounded-full flex items-center gap-1 font-medium ${
                    editingItem.is_active
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20"
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${editingItem.is_active ? "bg-emerald-500" : "bg-red-500"}`} />
                  {editingItem.is_active ? "Active in RAG" : "Paused"}
                </span>

                {editSku && (
                  <span className="text-xs px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 font-mono border border-cyan-500/20">
                    SKU: {editSku}
                  </span>
                )}
              </div>

              {/* View Switcher Controls */}
              <div className="flex items-center gap-1.5 bg-slate-200/80 dark:bg-slate-800 p-1 rounded-xl self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setEditorMode("spreadsheet")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    editorMode === "spreadsheet"
                      ? "bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Excel Grid</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorMode("document")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    editorMode === "document"
                      ? "bg-white dark:bg-slate-900 text-red-600 dark:text-red-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 text-red-500" />
                  <span>PDF / Doc Preview</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditorMode("raw")}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                    editorMode === "raw"
                      ? "bg-white dark:bg-slate-900 text-cyan-600 dark:text-cyan-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5 text-cyan-500" />
                  <span>Text Editor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition ml-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Quick Properties Bar */}
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              <div className="sm:col-span-2">
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Asset Title
                </label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                  placeholder="Asset title..."
                />
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Category
                </label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="pricing_rule">Pricing Rules (Volume Tiers)</option>
                  <option value="catalog_product">Catalog Product / SKU</option>
                  <option value="business_info">Business Info & Policies</option>
                  <option value="agent_guidance">Agent Guidance & Guardrails</option>
                  <option value="custom">Custom Parameters</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400 block mb-1">
                  Customer Segment
                </label>
                <select
                  value={editCustomerSegment}
                  onChange={(e) => setEditCustomerSegment(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="wholesale">Wholesale Buyer</option>
                  <option value="distributor">Distributor / Bulk</option>
                  <option value="retail">Retail Store</option>
                  <option value="all">All Buyer Segments</option>
                </select>
              </div>
            </div>

            {/* Modal Body Container (Mode Dependent) */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-950/40">
              {/* MODE 1: UNIVERSAL MULTI-INDUSTRY SPREADSHEET / EXCEL GRID */}
              {editorMode === "spreadsheet" && (
                <div className="space-y-4">
                  {/* Industry Template Ribbon */}
                  <div className="bg-slate-100/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 border border-emerald-500/20">
                        <FileSpreadsheet className="w-4 h-4" />
                        <span>Dynamic Sheet: {editCategory.toUpperCase()}_GRID.xlsx</span>
                      </div>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600 dark:text-slate-400 font-mono">
                        {gridRows.length} Rows × {gridColumns.length} Columns
                      </span>
                    </div>

                    {/* Quick Industry Presets */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-500 mr-1">Industry Templates:</span>
                      {INDUSTRY_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => applyIndustryPreset(preset)}
                          className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 text-[11px] font-medium transition flex items-center gap-1"
                          title={`Switch columns & rows to ${preset.label}`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grid Controls & Column Creator Toolbar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs shadow-sm">
                    <div className="flex items-center gap-2 flex-wrap flex-1 min-w-[280px]">
                      <button
                        type="button"
                        onClick={() => handleAddRow()}
                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1.5 transition shadow-sm"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>

                      <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-1">
                        <input
                          type="text"
                          value={newColName}
                          onChange={(e) => setNewColName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleAddColumn();
                            }
                          }}
                          placeholder="New Column (e.g. Lead Time, Warranty, SLA)..."
                          className="bg-transparent px-2 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none w-56 font-sans"
                        />
                        <button
                          type="button"
                          onClick={() => handleAddColumn()}
                          className="px-2.5 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-semibold transition"
                        >
                          + Add Column
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCsvImport(!showCsvImport)}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium flex items-center gap-1.5 transition"
                      >
                        <Table className="w-3.5 h-3.5 text-cyan-500" />
                        <span>{showCsvImport ? "Close Table Importer" : "Paste CSV / Table"}</span>
                      </button>
                    </div>
                  </div>

                  {/* CSV / Markdown Table Importer Drawer */}
                  {showCsvImport && (
                    <div className="p-3 bg-cyan-500/5 dark:bg-cyan-950/20 border border-cyan-500/20 rounded-xl space-y-2 animate-fade-in text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          Paste Raw CSV, TSV, or Markdown Table to populate dynamic spreadsheet:
                        </span>
                        <button
                          type="button"
                          onClick={handleImportCsv}
                          disabled={!rawCsvInput.trim()}
                          className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold disabled:opacity-50 transition"
                        >
                          Parse & Load Grid
                        </button>
                      </div>
                      <textarea
                        rows={3}
                        value={rawCsvInput}
                        onChange={(e) => setRawCsvInput(e.target.value)}
                        placeholder="e.g.&#10;Tier,Min Qty,Discount,Lead Time&#10;Standard,50,5%,2-3 Days&#10;Bulk,100,12%,4-5 Days"
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg p-2 font-mono text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  )}

                  {/* Dynamic Multi-Column Grid Table */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                    <table className="w-full text-xs text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                          <th className="p-2.5 w-12 text-center bg-slate-200/70 dark:bg-slate-800/70 font-mono text-slate-500">#</th>
                          {gridColumns.map((colName, cIdx) => (
                            <th key={cIdx} className="p-2 min-w-[150px] group border-r border-slate-200 dark:border-slate-800/60 last:border-r-0">
                              <div className="flex items-center justify-between gap-1">
                                <input
                                  type="text"
                                  value={colName}
                                  onChange={(e) => handleRenameColumn(cIdx, e.target.value)}
                                  className="bg-transparent border-b border-transparent hover:border-slate-400 dark:hover:border-slate-600 focus:border-emerald-500 px-1 py-0.5 font-bold text-slate-800 dark:text-slate-200 text-xs w-full focus:outline-none truncate"
                                  title="Click to rename column header"
                                />
                                {gridColumns.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteColumn(cIdx)}
                                    className="p-1 text-slate-400 hover:text-red-500 rounded opacity-0 group-hover:opacity-100 transition"
                                    title="Delete column"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </th>
                          ))}
                          <th className="p-2 w-12 text-center text-slate-400 font-normal">Del</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 font-mono">
                        {gridRows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition">
                            <td className="p-2 text-center bg-slate-50 dark:bg-slate-900/60 font-bold text-slate-400 select-none">
                              {rIdx + 1}
                            </td>
                            {gridColumns.map((col, cIdx) => (
                              <td key={cIdx} className="p-1.5 border-r border-slate-100 dark:border-slate-800/50 last:border-r-0">
                                <input
                                  type="text"
                                  value={row[cIdx] !== undefined ? row[cIdx] : ""}
                                  onChange={(e) => handleCellChange(rIdx, cIdx, e.target.value)}
                                  className="w-full bg-transparent hover:bg-slate-100/50 dark:hover:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-950 border border-transparent focus:border-emerald-500 rounded-md px-2 py-1 text-xs text-slate-900 dark:text-slate-100 focus:outline-none transition shadow-none focus:shadow-sm"
                                  placeholder="Type cell value..."
                                />
                              </td>
                            ))}
                            <td className="p-1 text-center">
                              {gridRows.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleDeleteRow(rIdx)}
                                  className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded transition"
                                  title="Delete row"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    {/* Bottom Add Row Strip */}
                    <div className="p-2.5 bg-slate-50/60 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
                      <button
                        type="button"
                        onClick={() => handleAddRow()}
                        className="px-3 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Row</span>
                      </button>
                      <span className="text-[11px] text-slate-400">
                        Spreadsheet cells dynamically synchronize into markdown tables and semantic RAG vectors.
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 2: INTERACTIVE & INLINE-EDITABLE PDF / DOCUMENT MODE */}
              {editorMode === "document" && (
                <div className="space-y-4 max-w-3xl mx-auto">
                  {/* PDF Toolbar */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 dark:text-red-400 font-semibold border border-red-500/20">
                        PDF Format
                      </span>
                      <span className="text-slate-500 font-medium">
                        {docEditing ? "Direct Inline Editing Mode" : "Official Specification Sheet Preview"}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setDocEditing(!docEditing)}
                        className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1.5 transition shadow-sm ${
                          docEditing
                            ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                            : "bg-red-600 hover:bg-red-500 text-white"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>{docEditing ? "Finish Inline Editing" : "Click to Edit Document"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(editContentText);
                          setCopiedDocContent(true);
                          setTimeout(() => setCopiedDocContent(false), 2000);
                        }}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-1.5 transition"
                      >
                        {copiedDocContent ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                        <span>{copiedDocContent ? "Copied" : "Copy Document"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditorMode("raw")}
                        className="px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 font-medium flex items-center gap-1.5 transition shadow-sm"
                      >
                        <FileCode className="w-3.5 h-3.5 text-cyan-500" />
                        <span>Raw Markdown</span>
                      </button>
                    </div>
                  </div>

                  {/* Official PDF Document Card */}
                  <div className={`bg-white dark:bg-slate-900 border rounded-2xl p-6 sm:p-8 shadow-md relative overflow-hidden space-y-6 transition ${
                    docEditing ? "border-red-500/50 ring-2 ring-red-500/20" : "border-slate-200 dark:border-slate-800"
                  }`}>
                    {/* Top Accent Strip */}
                    <div
                      className={`h-1.5 -mt-6 -mx-6 sm:-mt-8 sm:-mx-8 ${
                        editCategory === "pricing_rule"
                          ? "bg-gradient-to-r from-emerald-500 to-teal-500"
                          : editCategory === "catalog_product"
                          ? "bg-gradient-to-r from-cyan-500 to-blue-500"
                          : editCategory === "agent_guidance"
                          ? "bg-gradient-to-r from-indigo-500 to-purple-500"
                          : editCategory === "custom"
                          ? "bg-gradient-to-r from-amber-500 to-orange-500"
                          : "bg-gradient-to-r from-red-500 to-rose-500"
                      }`}
                    />

                    {/* Document Official Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
                      <div className="flex items-center gap-3">
                        <img src="/logo-icon.png" alt="Company Logo" className="w-9 h-9 rounded-xl object-contain bg-slate-100 dark:bg-slate-800 p-1 border border-slate-200 dark:border-slate-700" />
                        <div>
                          <div className="text-xs font-bold uppercase tracking-wider text-slate-500">Commercial Intelligence Directive</div>
                          <div className="text-sm font-bold text-slate-900 dark:text-slate-100">Enterprise Specification Sheet</div>
                        </div>
                      </div>

                      <div className="text-right font-mono text-[11px] text-slate-500 space-y-0.5">
                        <div>REF: <strong className="text-slate-800 dark:text-slate-200">DOC-{editingItem.id.slice(0, 8).toUpperCase()}</strong></div>
                        <div>REVISION: <strong className="text-slate-800 dark:text-slate-200">v{editingItem.version || 1}.0</strong></div>
                        <div>EFFECTIVE: <strong className="text-emerald-600 dark:text-emerald-400">Active</strong></div>
                      </div>
                    </div>

                    {/* Document Title & Badges (Inline Editable or View) */}
                    <div className="space-y-3">
                      {docEditing ? (
                        <div>
                          <label className="text-[10px] uppercase font-bold text-red-500 tracking-wider block mb-1">
                            Document Heading (Editable)
                          </label>
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full text-xl font-bold bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-red-500 leading-tight"
                            placeholder="Type document title..."
                          />
                        </div>
                      ) : (
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 leading-tight cursor-pointer hover:text-red-600 transition" onClick={() => setDocEditing(true)} title="Click to edit heading">
                          {editTitle}
                        </h2>
                      )}

                      <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          Scope: {editCustomerSegment.toUpperCase()}
                        </span>
                        {editSku && (
                          <span className="px-2.5 py-0.5 rounded-full font-mono bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            SKU: {editSku}
                          </span>
                        )}
                        {editDiscountPct && (
                          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            {editDiscountPct}% Volume Discount
                          </span>
                        )}
                        {editBasePrice && (
                          <span className="px-2.5 py-0.5 rounded-full font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            Tariff: ₹{editBasePrice} / {editUnit}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Document Body: Direct Inline Rich Editor or Print View */}
                    <div className="space-y-2">
                      {docEditing ? (
                        <div>
                          <label className="text-[10px] uppercase font-bold text-red-500 tracking-wider block mb-1">
                            Document Clauses & Terms (Click & Type Directly)
                          </label>
                          <textarea
                            rows={12}
                            value={editContentText}
                            onChange={(e) => setEditContentText(e.target.value)}
                            className="w-full text-sm text-slate-900 dark:text-slate-100 leading-relaxed font-sans bg-slate-50 dark:bg-slate-950 p-5 rounded-xl border border-red-500/40 focus:outline-none focus:ring-2 focus:ring-red-500/30 whitespace-pre-wrap shadow-inner"
                            placeholder="Type specifications, clauses, terms, or policies here..."
                          />
                        </div>
                      ) : (
                        <div
                          onClick={() => setDocEditing(true)}
                          className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed space-y-3 font-sans whitespace-pre-wrap bg-slate-50 dark:bg-slate-950/50 p-5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 cursor-text hover:border-slate-400 dark:hover:border-slate-600 transition"
                          title="Click anywhere to edit this document directly"
                        >
                          {editContentText}
                        </div>
                      )}
                    </div>

                    {/* Document Official Footer */}
                    <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
                      <div>Supervised by: <strong>EDITH (NVIDIA NIM) & FRIDAY</strong></div>
                      <div>Status: Verified by Commercial Governance Engine</div>
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: DIRECT MANUAL TEXTAREA EDITOR */}
              {editorMode === "raw" && (
                <div className="space-y-3">
                  {/* Markdown Quick Formatting Toolbar */}
                  <div className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-2 flex flex-wrap items-center gap-1.5 text-xs">
                    <span className="text-[11px] font-bold text-slate-500 px-1">Quick Tools:</span>
                    <button
                      type="button"
                      onClick={() => setEditContentText((prev) => prev + "\n### Section Heading\n")}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-semibold"
                    >
                      # Heading
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditContentText((prev) => prev + "**Bold Term** ")}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-bold"
                    >
                      B Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditContentText((prev) => prev + "\n- Specification item\n- Clause detail\n")}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                    >
                      • Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditContentText((prev) => prev + "\n| Tier | Min Qty | Discount |\n| --- | --- | --- |\n| Standard | 50 | 5% |\n| Volume | 100 | 12% |\n")}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 font-mono"
                    >
                      | Table |
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditContentText((prev) => prev + "\n> [!NOTE]\n> Commercial terms approved under operator directive.\n")}
                      className="px-2 py-1 rounded bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700"
                    >
                      &gt; Note Callout
                    </button>
                  </div>

                  {/* Live Monospace Text Editor */}
                  <div className="relative">
                    <textarea
                      rows={14}
                      value={editContentText}
                      onChange={(e) => setEditContentText(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-xs sm:text-sm font-mono text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed shadow-inner"
                      placeholder="Type custom terms, specifications, or rules here..."
                    />
                  </div>

                  {/* Character / Word Counters */}
                  <div className="flex items-center justify-between text-xs text-slate-500 px-1">
                    <div className="flex items-center gap-3">
                      <span>Characters: <strong className="text-slate-800 dark:text-slate-200">{editContentText.length}</strong></span>
                      <span>Words: <strong className="text-slate-800 dark:text-slate-200">{editContentText.trim().split(/\s+/).filter(Boolean).length}</strong></span>
                      <span>Lines: <strong className="text-slate-800 dark:text-slate-200">{editContentText.split("\n").length}</strong></span>
                    </div>
                    <span className="text-[11px] text-slate-400">Changes update directly to SQLite embeddings on save.</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
              <div>
                {editSaveToast && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-500" />
                    {editSaveToast}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Discard / Cancel
                </button>

                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={isSavingEdit || !editTitle.trim()}
                  className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-emerald-500/20"
                >
                  {isSavingEdit ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  <span>{isSavingEdit ? "Saving & Re-Indexing..." : "Save Changes (Live Sync)"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
