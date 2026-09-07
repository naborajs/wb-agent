"use client";

import React, { useState, useEffect } from "react";
import {
  DollarSign,
  ShieldAlert,
  Calculator,
  ArrowRight,
  CheckCircle2,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  TrendingDown,
  Layers,
  Search,
} from "lucide-react";

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  product_id?: string | null;
  min_quantity: number;
  max_quantity: number | null;
  min_quantity_kg?: number;
  max_quantity_kg?: number | null;
  discount_percentage: number;
  fixed_price?: number | null;
  customer_segment?: string | null;
  min_margin_percentage?: number;
  max_autonomous_discount_percentage: number;
  requires_human_approval: boolean;
  is_active: boolean;
  rule_metadata?: Record<string, any>;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([
    {
      id: "rule_1",
      rule_name: "Tier 1: 50+ Units Commercial Volume Tier",
      rule_type: "volume_tier",
      min_quantity: 50,
      max_quantity: 99.99,
      discount_percentage: 5.0,
      max_autonomous_discount_percentage: 5.0,
      requires_human_approval: false,
      is_active: true,
      rule_metadata: { formula: "units >= 50 ? 5% : 0%" },
    },
    {
      id: "rule_2",
      rule_name: "Tier 2: 100+ Units Commercial Volume Tier",
      rule_type: "volume_tier",
      min_quantity: 100,
      max_quantity: 499.99,
      discount_percentage: 10.0,
      max_autonomous_discount_percentage: 7.5,
      requires_human_approval: false,
      is_active: true,
      rule_metadata: { formula: "units >= 100 ? 10% : 5%" },
    },
    {
      id: "rule_3",
      rule_name: "Tier 3: 500+ Units Wholesale / Distributor Tier",
      rule_type: "volume_tier",
      min_quantity: 500,
      max_quantity: null,
      discount_percentage: 15.0,
      max_autonomous_discount_percentage: 10.0,
      requires_human_approval: true,
      is_active: true,
      rule_metadata: { formula: "units >= 500 ? 15% (Approval Req.) : 10%" },
    },
    {
      id: "rule_4",
      rule_name: "Enterprise Account: Direct Partner Terms",
      rule_type: "customer_segment",
      customer_segment: "enterprise",
      min_quantity: 1,
      max_quantity: null,
      discount_percentage: 18.0,
      max_autonomous_discount_percentage: 12.0,
      requires_human_approval: true,
      is_active: true,
      rule_metadata: { formula: "segment == 'enterprise' ? 18% : 0%" },
    },
  ]);

  const [filterType, setFilterType] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // New Rule form state
  const [newRule, setNewRule] = useState({
    rule_name: "",
    rule_type: "volume_tier",
    min_quantity: 100,
    max_quantity: 499,
    discount_percentage: 10.0,
    max_autonomous_discount_percentage: 7.0,
    customer_segment: "",
    requires_human_approval: false,
    formula: "",
  });

  // Quote Simulator state
  const [calcProduct, setCalcProduct] = useState("Standard Commercial Package");
  const [calcBaseRate, setCalcBaseRate] = useState<number>(350);
  const [calcQty, setCalcQty] = useState<number>(100);
  const [calcDiscount, setCalcDiscount] = useState<number>(0);
  const [calcResult, setCalcResult] = useState<any>(null);

  const loadRules = () => {
    fetch("/api/v1/pricing/rules")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          const resolved = data.map((r: any) => ({
            ...r,
            min_quantity: r.min_quantity ?? r.min_quantity_kg ?? 0,
            max_quantity: r.max_quantity ?? r.max_quantity_kg ?? null,
          }));
          setRules(resolved);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadRules();
  }, []);

  const handleCreateRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        rule_name: newRule.rule_name,
        rule_type: newRule.rule_type,
        min_quantity: Number(newRule.min_quantity),
        max_quantity: newRule.max_quantity ? Number(newRule.max_quantity) : null,
        min_quantity_kg: Number(newRule.min_quantity),
        max_quantity_kg: newRule.max_quantity ? Number(newRule.max_quantity) : null,
        discount_percentage: Number(newRule.discount_percentage),
        max_autonomous_discount_percentage: Number(newRule.max_autonomous_discount_percentage),
        customer_segment: newRule.customer_segment || null,
        requires_human_approval: newRule.requires_human_approval,
        is_active: true,
        rule_metadata: newRule.formula ? { formula: newRule.formula } : {},
      };

      const res = await fetch("/api/v1/pricing/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsAddModalOpen(false);
        setNewRule({
          rule_name: "",
          rule_type: "volume_tier",
          min_quantity: 100,
          max_quantity: 499,
          discount_percentage: 10.0,
          max_autonomous_discount_percentage: 7.0,
          customer_segment: "",
          requires_human_approval: false,
          formula: "",
        });
        loadRules();
      } else {
        // Optimistic UI fallback
        const fakeRule: PricingRule = {
          id: `rule_${Date.now()}`,
          ...payload,
          min_quantity: payload.min_quantity,
          max_quantity: payload.max_quantity,
        };
        setRules((prev) => [...prev, fakeRule]);
        setIsAddModalOpen(false);
      }
    } catch (e) {
      console.error("Error creating pricing rule", e);
    }
  };

  const handleSaveEditRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const payload = {
        rule_name: editingRule.rule_name,
        rule_type: editingRule.rule_type,
        min_quantity: editingRule.min_quantity,
        max_quantity: editingRule.max_quantity,
        min_quantity_kg: editingRule.min_quantity,
        max_quantity_kg: editingRule.max_quantity,
        discount_percentage: editingRule.discount_percentage,
        max_autonomous_discount_percentage: editingRule.max_autonomous_discount_percentage,
        customer_segment: editingRule.customer_segment,
        requires_human_approval: editingRule.requires_human_approval,
        is_active: editingRule.is_active,
      };

      const res = await fetch(`/api/v1/pricing/rules/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingRule(null);
        loadRules();
      } else {
        setRules((prev) =>
          prev.map((r) => (r.id === editingRule.id ? { ...editingRule } : r))
        );
        setEditingRule(null);
      }
    } catch (e) {
      console.error("Error editing pricing rule", e);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this business rule?")) return;
    try {
      const res = await fetch(`/api/v1/pricing/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      } else {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error("Error deleting rule", e);
    }
  };

  const handleToggleRuleStatus = (rule: PricingRule) => {
    const updated = { ...rule, is_active: !rule.is_active };
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    fetch(`/api/v1/pricing/rules/${rule.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: updated.is_active }),
    }).catch(() => {});
  };

  const handleTestQuote = () => {
    let matchedTierDiscount = 0;
    let requiresApproval = false;

    // Evaluate live rules
    for (const r of rules.filter((r) => r.is_active)) {
      const minQ = r.min_quantity ?? r.min_quantity_kg ?? 0;
      const maxQ = r.max_quantity ?? r.max_quantity_kg ?? null;

      if (calcQty >= minQ && (!maxQ || calcQty <= maxQ)) {
        if (r.discount_percentage > matchedTierDiscount) {
          matchedTierDiscount = r.discount_percentage;
          if (r.requires_human_approval) requiresApproval = true;
        }
      }
    }

    const effectiveDisc = Math.max(matchedTierDiscount, Math.min(calcDiscount, 10.0));
    if (calcDiscount > 10.0) requiresApproval = true;

    const subtotal = calcBaseRate * calcQty;
    const discountAmt = subtotal * (effectiveDisc / 100);
    const total = subtotal - discountAmt;

    setCalcResult({
      product: calcProduct,
      baseRate: calcBaseRate,
      effectiveDisc,
      subtotal,
      discountAmt,
      total,
      requiresApproval,
    });
  };

  const filteredRules = rules.filter((r) => {
    if (filterType !== "ALL" && r.rule_type !== filterType) {
      if (filterType === "APPROVAL" && !r.requires_human_approval) return false;
      if (filterType !== "APPROVAL") return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.rule_name.toLowerCase().includes(q);
      const matchType = r.rule_type.toLowerCase().includes(q);
      const matchSeg = r.customer_segment?.toLowerCase().includes(q) ?? false;
      return matchName || matchType || matchSeg;
    }
    return true;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
            Configurable Pricing & Negotiation Rules
          </h2>
          <p className="text-sm text-[var(--ed-text-muted)] mt-1">
            Spreadsheet-style business rules editor for volume tiers, customer segments, negotiation caps, and approval workflows.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Business Rule
        </button>
      </div>

      {/* Visual Volume Discount Curve & Margin Graph */}
      <div className="ed-glass ed-lift rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-[var(--ed-success)]" />
              Volume Discount Curve & Autonomous Authority Boundary
            </h3>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Live step-curve depicting deterministic discount tiers and autonomous agent concession limits across order quantities.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-[var(--ed-success)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--ed-success)]" /> Volume Discount (%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-[var(--ed-warning)]">
              <span className="w-2.5 h-2.5 rounded-full bg-[var(--ed-warning)]" /> Autonomous Margin Limit (%)
            </span>
          </div>
        </div>

        {/* SVG Step Curve Graph */}
        <div className="relative pt-2 overflow-x-auto">
          <div className="min-w-[600px] sm:min-w-0">
            <svg viewBox="0 0 800 210" className="w-full h-40 sm:h-44">
              <line x1="60" y1="20" x2="780" y2="20" stroke="var(--ed-border)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
              <line x1="60" y1="65" x2="780" y2="65" stroke="var(--ed-border)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
              <line x1="60" y1="110" x2="780" y2="110" stroke="var(--ed-border)" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.4" />
              <line x1="60" y1="155" x2="780" y2="155" stroke="var(--ed-border)" strokeWidth="1" opacity="0.6" />

              {/* Y Axis Labels */}
              <text x="50" y="24" textAnchor="end" fill="var(--ed-text-muted)" fontSize="10" className="font-data">15%</text>
              <text x="50" y="69" textAnchor="end" fill="var(--ed-text-muted)" fontSize="10" className="font-data">10%</text>
              <text x="50" y="114" textAnchor="end" fill="var(--ed-text-muted)" fontSize="10" className="font-data">5%</text>
              <text x="50" y="159" textAnchor="end" fill="var(--ed-text-muted)" fontSize="10" className="font-data">0%</text>

              {/* Volume Shaded Area */}
              <polygon
                points="60,155 180,155 180,110 340,110 340,65 540,65 540,20 780,20 780,155"
                fill="url(#discountGradient)"
                opacity="0.25"
              />
              <defs>
                <linearGradient id="discountGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--ed-success)" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="var(--ed-success)" stopOpacity="0.05" />
                </linearGradient>
              </defs>

              {/* Step Line for Volume Discount */}
              <polyline
                points="60,155 180,155 180,110 340,110 340,65 540,65 540,20 780,20"
                fill="none"
                stroke="var(--ed-success)"
                strokeWidth="3"
              />

              {/* Autonomous Limit Line */}
              <polyline
                points="60,155 180,155 180,110 340,110 340,90 540,90 540,65 780,65"
                fill="none"
                stroke="var(--ed-warning)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* Data Points */}
              <circle cx="180" cy="110" r="4.5" fill="var(--ed-success)" stroke="var(--ed-surface)" strokeWidth="2" />
              <circle cx="340" cy="65" r="4.5" fill="var(--ed-success)" stroke="var(--ed-surface)" strokeWidth="2" />
              <circle cx="540" cy="20" r="4.5" fill="var(--ed-success)" stroke="var(--ed-surface)" strokeWidth="2" />

              {/* X Axis Labels */}
              <text x="60" y="178" textAnchor="middle" fill="var(--ed-text-muted)" fontSize="10">0 units (Standard)</text>
              <text x="180" y="178" textAnchor="middle" fill="var(--ed-text-muted)" fontSize="10">50 units (5%)</text>
              <text x="340" y="178" textAnchor="middle" fill="var(--ed-text-muted)" fontSize="10">100 units (10%)</text>
              <text x="540" y="178" textAnchor="middle" fill="var(--ed-text-muted)" fontSize="10">500 units (15%)</text>
              <text x="760" y="178" textAnchor="middle" fill="var(--ed-text-muted)" fontSize="10">1000+ units (Custom)</text>
            </svg>
          </div>
        </div>
      </div>

      {/* Spreadsheet & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: "ALL", label: "All Rules" },
            { id: "volume_tier", label: "Volume Tiers" },
            { id: "customer_segment", label: "Customer Segments" },
            { id: "APPROVAL", label: "Requires Approval" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterType(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                filterType === tab.id
                  ? "bg-[var(--ed-accent)] text-white border-[var(--ed-accent)] shadow-sm"
                  : "bg-[var(--ed-surface)] border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--ed-text-muted)]" />
          <input
            type="text"
            placeholder="Search rules..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 rounded-lg border border-[var(--ed-border)] text-xs text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] focus:outline-none ed-focus-ring"
            style={{ background: "var(--ed-surface)" }}
          />
        </div>
      </div>

      {/* Rules Grid & Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spreadsheet-style Rules Table */}
        <div className="lg:col-span-2 ed-panel rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-[var(--ed-border)] flex items-center justify-between font-bold text-xs uppercase tracking-wider text-[var(--ed-text-muted)]" style={{ background: "var(--ed-bg)" }}>
            <span className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[var(--ed-accent)]" />
              Configurable Business Rules ({filteredRules.length})
            </span>
            <span className="text-[10px] font-normal text-[var(--ed-text-muted)]">
              Realtime Deterministic Engine
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[var(--ed-text-primary)] min-w-[680px]">
              <thead className="text-[var(--ed-text-muted)] uppercase tracking-wider border-b border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
                <tr>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Rule Name & Formula</th>
                  <th className="py-3 px-4">Type / Scope</th>
                  <th className="py-3 px-4">Min-Max (Units)</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Cap</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--ed-border)]">
                {filteredRules.map((r) => {
                  const minQ = r.min_quantity ?? r.min_quantity_kg ?? 0;
                  const maxQ = r.max_quantity ?? r.max_quantity_kg ?? null;

                  return (
                    <tr key={r.id} className={`hover:bg-[var(--ed-bg)] transition-colors ${!r.is_active ? "opacity-50" : ""}`}>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleRuleStatus(r)}
                          title={r.is_active ? "Rule active. Click to pause." : "Rule paused. Click to activate."}
                          className={`w-3 h-3 rounded-full transition-transform hover:scale-125 ${
                            r.is_active ? "bg-[var(--ed-success)] shadow-sm" : "bg-[var(--ed-text-muted)]"
                          }`}
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[var(--ed-text-primary)]">
                          {r.rule_name}
                        </div>
                        {r.rule_metadata?.formula && (
                          <div className="text-[10px] font-mono text-[var(--ed-accent)] mt-0.5">
                            {r.rule_metadata.formula}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium border border-[var(--ed-border)] text-[var(--ed-text-muted)]" style={{ background: "var(--ed-bg)" }}>
                          {r.rule_type.replace("_", " ")}
                        </span>
                        {r.customer_segment && (
                          <div className="text-[10px] text-[var(--ed-text-muted)] mt-0.5 capitalize">
                            {r.customer_segment}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 font-data text-[var(--ed-text-muted)]">
                        {minQ} - {maxQ ? `${maxQ}` : "Open"}
                      </td>
                      <td className="py-3 px-4 font-bold font-data text-[var(--ed-success)]">
                        {r.discount_percentage}%
                      </td>
                      <td className="py-3 px-4 text-[var(--ed-warning)] font-semibold font-data">
                        {r.max_autonomous_discount_percentage}%
                      </td>
                      <td className="py-3 px-4">
                        {r.requires_human_approval ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--ed-warning)] border border-[var(--ed-warning)]/20" style={{ background: "color-mix(in srgb, var(--ed-warning) 10%, transparent)" }}>
                            <ShieldAlert className="w-3 h-3 text-[var(--ed-warning)]" /> Required
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-[var(--ed-success)] border border-[var(--ed-success)]/20" style={{ background: "color-mix(in srgb, var(--ed-success) 10%, transparent)" }}>
                            <CheckCircle2 className="w-3 h-3 text-[var(--ed-success)]" /> Autonomous
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setEditingRule(r)}
                            className="ed-press p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)]"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteRule(r.id)}
                            className="ed-press p-1.5 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-danger)] hover:bg-[var(--ed-danger)]/10"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Quote & Margin Simulator */}
        <div className="ed-panel rounded-xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Calculator className="w-4 h-4 text-[var(--ed-accent)]" />
            Deterministic Quote Simulator
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                Target Product / Service
              </label>
              <input
                type="text"
                value={calcProduct}
                onChange={(e) => setCalcProduct(e.target.value)}
                className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-medium ed-focus-ring"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Base Price (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  value={calcBaseRate}
                  onChange={(e) => setCalcBaseRate(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                />
              </div>

              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Order Units
                </label>
                <input
                  type="number"
                  min="1"
                  value={calcQty}
                  onChange={(e) => setCalcQty(Number(e.target.value))}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                />
              </div>
            </div>

            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                Negotiated Discount Request (%)
              </label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.5"
                value={calcDiscount}
                onChange={(e) => setCalcDiscount(Number(e.target.value))}
                className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
              />
            </div>

            <button
              onClick={handleTestQuote}
              className="ed-btn-primary ed-press ed-focus-ring w-full py-3 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2"
            >
              Simulate Quote <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {calcResult && (
              <div className="mt-4 p-3.5 rounded-lg border border-[var(--ed-border)] space-y-2" style={{ background: "var(--ed-bg)" }}>
                <div className="flex justify-between font-bold text-[var(--ed-text-primary)]">
                  <span>Product:</span>
                  <span className="truncate max-w-[150px]">{calcResult.product}</span>
                </div>
                <div className="flex justify-between text-[var(--ed-text-muted)]">
                  <span>Base Rate:</span>
                  <span className="font-data">₹{calcResult.baseRate} / unit</span>
                </div>
                <div className="flex justify-between text-[var(--ed-text-muted)]">
                  <span>Effective Discount:</span>
                  <span className="font-bold font-data text-[var(--ed-success)]">
                    {calcResult.effectiveDisc}%
                  </span>
                </div>
                <div className="flex justify-between text-[var(--ed-text-muted)]">
                  <span>Discount Value:</span>
                  <span className="font-data">-₹{calcResult.discountAmt.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-[var(--ed-border)] flex justify-between font-bold text-[var(--ed-text-primary)] text-sm">
                  <span>Commercial Total:</span>
                  <span className="font-data text-[var(--ed-accent)]">
                    ₹{calcResult.total.toLocaleString()}
                  </span>
                </div>

                {calcResult.requiresApproval && (
                  <div className="mt-2 p-2 rounded text-[11px] font-semibold flex items-center gap-1.5 text-[var(--ed-warning)] border border-[var(--ed-warning)]/20" style={{ background: "color-mix(in srgb, var(--ed-warning) 10%, transparent)" }}>
                    <ShieldAlert className="w-3.5 h-3.5 text-[var(--ed-warning)] shrink-0" />
                    Exceeds AI autonomous boundary. Human handoff required.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD PRICING RULE MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--ed-border)] shadow-2xl max-w-lg w-full p-6 space-y-4" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[var(--ed-accent)]" />
                Add New Business Pricing Rule
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="ed-press p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tier 4: 1000+ Units Institutional Contract"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Rule Type
                  </label>
                  <select
                    value={newRule.rule_type}
                    onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                  >
                    <option value="volume_tier">Volume Tier</option>
                    <option value="customer_segment">Customer Segment</option>
                    <option value="promotional">Promotional</option>
                    <option value="custom_formula">Custom Formula</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Customer Segment (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. enterprise, wholesale"
                    value={newRule.customer_segment}
                    onChange={(e) => setNewRule({ ...newRule, customer_segment: e.target.value })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Min Quantity (Units)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newRule.min_quantity}
                    onChange={(e) => setNewRule({ ...newRule, min_quantity: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Max Quantity (Units)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave blank for Open"
                    value={newRule.max_quantity || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        max_quantity: e.target.value ? Number(e.target.value) : 0,
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Discount Percentage (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max="100"
                    value={newRule.discount_percentage}
                    onChange={(e) => setNewRule({ ...newRule, discount_percentage: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Max Autonomous Limit (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max="50"
                    value={newRule.max_autonomous_discount_percentage}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        max_autonomous_discount_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Custom Formula / Spreadsheet Condition (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. units >= 1000 ? 20% : 15%"
                  value={newRule.formula}
                  onChange={(e) => setNewRule({ ...newRule, formula: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-mono ed-focus-ring"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newRule.requires_human_approval}
                  onChange={(e) =>
                    setNewRule({ ...newRule, requires_human_approval: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[var(--ed-accent)] ed-focus-ring"
                />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Require Human Approval to Apply This Rule
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ed-border)]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="ed-press px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary ed-press ed-focus-ring px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRICING RULE MODAL */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl border border-[var(--ed-border)] shadow-2xl max-w-md w-full p-6 space-y-4" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="font-bold text-base text-[var(--ed-text-primary)]">
                Edit Rule: {editingRule.rule_name}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="ed-press p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={editingRule.rule_name}
                  onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] ed-focus-ring"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Min Quantity (Units)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editingRule.min_quantity}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, min_quantity: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Max Quantity (Units)
                  </label>
                  <input
                    type="number"
                    placeholder="Open"
                    value={editingRule.max_quantity || ""}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        max_quantity: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRule.discount_percentage}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, discount_percentage: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-bold font-data ed-focus-ring"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[var(--ed-text-primary)] mb-1">
                    Autonomous Limit (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRule.max_autonomous_discount_percentage}
                    onChange={(e) =>
                      setEditingRule({
                        ...editingRule,
                        max_autonomous_discount_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] font-data ed-focus-ring"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={editingRule.requires_human_approval}
                  onChange={(e) =>
                    setEditingRule({ ...editingRule, requires_human_approval: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-[var(--ed-accent)] ed-focus-ring"
                />
                <span className="font-semibold text-[var(--ed-text-primary)]">
                  Require Human Approval
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3 border-t border-[var(--ed-border)]">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="ed-press px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] hover:bg-[var(--ed-bg)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="ed-btn-primary ed-press ed-focus-ring px-5 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
