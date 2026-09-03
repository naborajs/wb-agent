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
  BarChart3,
  PieChart as PieIcon,
} from "lucide-react";

interface PricingRule {
  id: string;
  rule_name: string;
  rule_type: string;
  min_quantity_kg: number;
  max_quantity_kg: number | null;
  discount_percentage: number;
  max_autonomous_discount_percentage: number;
  requires_human_approval: boolean;
  is_active: boolean;
}

export default function PricingRulesPage() {
  const [rules, setRules] = useState<PricingRule[]>([
    {
      id: "rule_1",
      rule_name: "Tier 1: 50kg+ Commercial Volume Discount",
      rule_type: "volume_tier",
      min_quantity_kg: 50,
      max_quantity_kg: 99.99,
      discount_percentage: 5.0,
      max_autonomous_discount_percentage: 5.0,
      requires_human_approval: false,
      is_active: true,
    },
    {
      id: "rule_2",
      rule_name: "Tier 2: 100kg+ Commercial Volume Discount",
      rule_type: "volume_tier",
      min_quantity_kg: 100,
      max_quantity_kg: 499.99,
      discount_percentage: 10.0,
      max_autonomous_discount_percentage: 7.5,
      requires_human_approval: false,
      is_active: true,
    },
    {
      id: "rule_3",
      rule_name: "Tier 3: 500kg+ Wholesale / Distributor Tier",
      rule_type: "volume_tier",
      min_quantity_kg: 500,
      max_quantity_kg: null,
      discount_percentage: 15.0,
      max_autonomous_discount_percentage: 10.0,
      requires_human_approval: true,
      is_active: true,
    },
  ]);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);

  // New Rule form state
  const [newRule, setNewRule] = useState({
    rule_name: "",
    min_quantity_kg: 200,
    max_quantity_kg: 499,
    discount_percentage: 12.0,
    max_autonomous_discount_percentage: 8.0,
    requires_human_approval: false,
  });

  // Quote Calculator state
  const [calcQty, setCalcQty] = useState<number>(100);
  const [calcDiscount, setCalcDiscount] = useState<number>(0);
  const [calcResult, setCalcResult] = useState<any>(null);

  const loadRules = () => {
    fetch("/api/v1/pricing/rules")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setRules(data);
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
      const res = await fetch("/api/v1/pricing/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...newRule,
          max_quantity_kg: newRule.max_quantity_kg || null,
        }),
      });
      if (res.ok) {
        setIsAddModalOpen(false);
        setNewRule({
          rule_name: "",
          min_quantity_kg: 200,
          max_quantity_kg: 499,
          discount_percentage: 12.0,
          max_autonomous_discount_percentage: 8.0,
          requires_human_approval: false,
        });
        loadRules();
      }
    } catch (e) {
      console.error("Error creating pricing rule", e);
    }
  };

  const handleSaveEditRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;

    try {
      const res = await fetch(`/api/v1/pricing/rules/${editingRule.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rule_name: editingRule.rule_name,
          min_quantity_kg: editingRule.min_quantity_kg,
          max_quantity_kg: editingRule.max_quantity_kg,
          discount_percentage: editingRule.discount_percentage,
          max_autonomous_discount_percentage: editingRule.max_autonomous_discount_percentage,
          requires_human_approval: editingRule.requires_human_approval,
        }),
      });
      if (res.ok) {
        setEditingRule(null);
        loadRules();
      }
    } catch (e) {
      console.error("Error editing pricing rule", e);
    }
  };

  const handleDeleteRule = async (id: string) => {
    if (!confirm("Are you sure you want to delete this pricing tier?")) return;
    try {
      const res = await fetch(`/api/v1/pricing/rules/${id}`, { method: "DELETE" });
      if (res.ok) {
        setRules((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (e) {
      console.error("Error deleting rule", e);
    }
  };

  const handleTestQuote = () => {
    const baseRate = 340; // Assam Kadak CTC
    let matchedTierDiscount = 0;
    let requiresApproval = false;

    // Evaluate live rules
    for (const r of rules) {
      if (calcQty >= r.min_quantity_kg && (!r.max_quantity_kg || calcQty <= r.max_quantity_kg)) {
        if (r.discount_percentage > matchedTierDiscount) {
          matchedTierDiscount = r.discount_percentage;
          if (r.requires_human_approval) requiresApproval = true;
        }
      }
    }

    const effectiveDisc = Math.max(matchedTierDiscount, Math.min(calcDiscount, 10.0));
    if (calcDiscount > 10.0) requiresApproval = true;

    const subtotal = baseRate * calcQty;
    const discountAmt = subtotal * (effectiveDisc / 100);
    const total = subtotal - discountAmt;

    setCalcResult({
      product: "Assam Kadak CTC Granules",
      baseRate,
      effectiveDisc,
      subtotal,
      discountAmt,
      total,
      requiresApproval,
    });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Deterministic Pricing & Negotiation Rules
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure volume discount tiers, negotiation authority limits, and human approval triggers directly.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Pricing Tier
        </button>
      </div>

      {/* Visual Volume Discount Curve & Margin Graph */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-emerald-500" />
              Interactive Volume Discount Curve & Effective Rate Graph
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Live step-curve showing effective wholesale price per kg and buyer savings across order quantities.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Volume Discount (%)
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Autonomous Margin Limit (%)
            </span>
          </div>
        </div>

        {/* SVG Step Curve Graph */}
        <div className="relative pt-2">
          <svg viewBox="0 0 800 210" className="w-full h-44 overflow-visible">
            {/* Grid lines */}
            <line x1="60" y1="20" x2="780" y2="20" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <line x1="60" y1="65" x2="780" y2="65" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <line x1="60" y1="110" x2="780" y2="110" stroke="#334155" strokeWidth="0.5" strokeDasharray="3 3" opacity="0.3" />
            <line x1="60" y1="155" x2="780" y2="155" stroke="#334155" strokeWidth="1" opacity="0.5" />

            {/* Y Axis Labels */}
            <text x="50" y="24" textAnchor="end" fill="#94a3b8" fontSize="10">15%</text>
            <text x="50" y="69" textAnchor="end" fill="#94a3b8" fontSize="10">10%</text>
            <text x="50" y="114" textAnchor="end" fill="#94a3b8" fontSize="10">5%</text>
            <text x="50" y="159" textAnchor="end" fill="#94a3b8" fontSize="10">0%</text>

            {/* Volume Shaded Area */}
            <polygon
              points="60,155 180,155 180,110 340,110 340,65 540,65 540,20 780,20 780,155"
              fill="url(#discountGradient)"
              opacity="0.25"
            />
            <defs>
              <linearGradient id="discountGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
              </linearGradient>
            </defs>

            {/* Step Line for Volume Discount */}
            <polyline
              points="60,155 180,155 180,110 340,110 340,65 540,65 540,20 780,20"
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
            />

            {/* Autonomous Limit Line */}
            <polyline
              points="60,155 180,155 180,110 340,110 340,90 540,90 540,65 780,65"
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Data Points */}
            <circle cx="180" cy="110" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle cx="340" cy="65" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
            <circle cx="540" cy="20" r="4.5" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

            {/* X Axis Labels */}
            <text x="60" y="178" textAnchor="middle" fill="#94a3b8" fontSize="10">0kg (Standard)</text>
            <text x="180" y="178" textAnchor="middle" fill="#94a3b8" fontSize="10">50kg Tier (5%)</text>
            <text x="340" y="178" textAnchor="middle" fill="#94a3b8" fontSize="10">100kg Tier (10%)</text>
            <text x="540" y="178" textAnchor="middle" fill="#94a3b8" fontSize="10">500kg Tier (15%)</text>
            <text x="760" y="178" textAnchor="middle" fill="#94a3b8" fontSize="10">1000kg+ (Custom)</text>
          </svg>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-xs uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Active Volume Tiers in Database
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 dark:text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                <tr>
                  <th className="py-3 px-4">Tier / Name</th>
                  <th className="py-3 px-4">Quantity Range</th>
                  <th className="py-3 px-4">Discount</th>
                  <th className="py-3 px-4">Autonomous Limit</th>
                  <th className="py-3 px-4">Approval</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-900 dark:text-white">
                      {r.rule_name}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 dark:text-slate-400">
                      {r.min_quantity_kg}kg - {r.max_quantity_kg ? `${r.max_quantity_kg}kg` : "Open"}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600 dark:text-emerald-400">
                      {r.discount_percentage}%
                    </td>
                    <td className="py-3 px-4 text-amber-700 dark:text-amber-400 font-semibold">
                      {r.max_autonomous_discount_percentage}%
                    </td>
                    <td className="py-3 px-4">
                      {r.requires_human_approval ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                          <ShieldAlert className="w-3 h-3 text-amber-500" /> Human Req.
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                          <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Autonomous
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setEditingRule(r)}
                          className="p-1 rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteRule(r.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Quote & Margin Simulator */}
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 pb-3">
            <Calculator className="w-4 h-4 text-amber-600" />
            Deterministic Quote Simulator
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Order Quantity (kg)
              </label>
              <input
                type="number"
                min="1"
                value={calcQty}
                onChange={(e) => setCalcQty(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
            </div>

            <div>
              <label className="block text-slate-600 dark:text-slate-400 font-medium mb-1">
                Negotiated Discount Request (%)
              </label>
              <input
                type="number"
                min="0"
                max="25"
                step="0.5"
                value={calcDiscount}
                onChange={(e) => setCalcDiscount(Number(e.target.value))}
                className="w-full p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <button
              onClick={handleTestQuote}
              className="w-full py-2.5 rounded-lg bg-slate-900 dark:bg-amber-600 hover:bg-slate-800 dark:hover:bg-amber-700 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Simulate Quote <ArrowRight className="w-3.5 h-3.5" />
            </button>

            {calcResult && (
              <div className="mt-4 p-3.5 rounded-lg bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 space-y-2">
                <div className="flex justify-between font-bold text-slate-900 dark:text-white">
                  <span>Product:</span>
                  <span>{calcResult.product}</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Base Rate:</span>
                  <span>₹{calcResult.baseRate}/kg</span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Effective Discount:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {calcResult.effectiveDisc}%
                  </span>
                </div>
                <div className="flex justify-between text-slate-600 dark:text-slate-400">
                  <span>Discount Value:</span>
                  <span>-₹{calcResult.discountAmt.toLocaleString()}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex justify-between font-bold text-slate-900 dark:text-white text-sm">
                  <span>Commercial Total:</span>
                  <span className="text-amber-600 dark:text-amber-400">
                    ₹{calcResult.total.toLocaleString()}
                  </span>
                </div>

                {calcResult.requiresApproval && (
                  <div className="mt-2 p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    Exceeds AI authority. Triggers human handoff alert to owner.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ADD PRICING TIER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-amber-600" />
                Add New Pricing / Volume Tier
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule / Tier Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tier 4: 1000kg+ Institutional Tier"
                  value={newRule.rule_name}
                  onChange={(e) => setNewRule({ ...newRule, rule_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Min Quantity (kg)
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={newRule.min_quantity_kg}
                    onChange={(e) => setNewRule({ ...newRule, min_quantity_kg: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Quantity (kg)
                  </label>
                  <input
                    type="number"
                    placeholder="Leave blank for Open"
                    value={newRule.max_quantity_kg || ""}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        max_quantity_kg: e.target.value ? Number(e.target.value) : 0,
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Volume Discount (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max="50"
                    value={newRule.discount_percentage}
                    onChange={(e) => setNewRule({ ...newRule, discount_percentage: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Autonomous (%)
                  </label>
                  <input
                    type="number"
                    required
                    step="0.5"
                    min="0"
                    max="20"
                    value={newRule.max_autonomous_discount_percentage}
                    onChange={(e) =>
                      setNewRule({
                        ...newRule,
                        max_autonomous_discount_percentage: Number(e.target.value),
                      })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={newRule.requires_human_approval}
                  onChange={(e) =>
                    setNewRule({ ...newRule, requires_human_approval: e.target.checked })
                  }
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Require Human Owner Approval for this Tier
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  Save Tier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PRICING TIER MODAL */}
      {editingRule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Edit Tier: {editingRule.rule_name}
              </h3>
              <button
                onClick={() => setEditingRule(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditRule} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Rule Name
                </label>
                <input
                  type="text"
                  required
                  value={editingRule.rule_name}
                  onChange={(e) => setEditingRule({ ...editingRule, rule_name: e.target.value })}
                  className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Volume Discount (%)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={editingRule.discount_percentage}
                    onChange={(e) =>
                      setEditingRule({ ...editingRule, discount_percentage: Number(e.target.value) })
                    }
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Max Autonomous (%)
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
                    className="w-full p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
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
                  className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                />
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Require Human Owner Approval
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold flex items-center gap-1.5"
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
