"use client";

import React, { useState } from "react";
import { DollarSign, ShieldAlert, Calculator, ArrowRight, CheckCircle2 } from "lucide-react";

export default function PricingRulesPage() {
  const [calcQty, setCalcQty] = useState<number>(100);
  const [calcDiscount, setCalcDiscount] = useState<number>(0);
  const [calcResult, setCalcResult] = useState<any>(null);

  const rules = [
    {
      name: "Tier 1: 50kg+ Commercial Volume Discount",
      type: "volume_tier",
      minQty: "50 kg",
      maxQty: "99.99 kg",
      discount: "5.0%",
      maxAutonomous: "5.0%",
      humanApproval: false,
    },
    {
      name: "Tier 2: 100kg+ Commercial Volume Discount",
      type: "volume_tier",
      minQty: "100 kg",
      maxQty: "499.99 kg",
      discount: "10.0%",
      maxAutonomous: "7.5%",
      humanApproval: false,
    },
    {
      name: "Tier 3: 500kg+ Wholesale / Distributor Tier",
      type: "volume_tier",
      minQty: "500 kg",
      maxQty: "Open",
      discount: "15.0%",
      maxAutonomous: "10.0%",
      humanApproval: true,
    },
    {
      name: "Distributor Partner Base Discount",
      type: "customer_segment",
      minQty: "100 kg",
      maxQty: "Open",
      discount: "8.0%",
      maxAutonomous: "5.0%",
      humanApproval: false,
    },
  ];

  const handleTestQuote = () => {
    // Local calculation demonstration using deterministic rules
    const baseRate = 340; // Assam Kadak CTC
    let appliedDiscount = 0;
    let requiresApproval = false;

    if (calcQty >= 500) {
      appliedDiscount = 15;
      requiresApproval = true;
    } else if (calcQty >= 100) {
      appliedDiscount = 10;
    } else if (calcQty >= 50) {
      appliedDiscount = 5;
    }

    if (calcDiscount > 7.5) {
      requiresApproval = true;
    }

    const effectiveDisc = Math.max(appliedDiscount, Math.min(calcDiscount, 7.5));
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
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Deterministic Pricing & Negotiation Rules</h2>
        <p className="text-sm text-slate-500 mt-1">
          Uncompromising business rule boundaries. LLM cannot invent discounts or override minimum margin constraints.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Rules Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 font-bold text-xs uppercase tracking-wider text-slate-400">
            Active Rules in Database
          </div>
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Rule Name</th>
                <th className="px-4 py-3">Min Qty</th>
                <th className="px-4 py-3">Discount</th>
                <th className="px-4 py-3">Autonomous Cap</th>
                <th className="px-4 py-3">Human Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r, idx) => (
                <tr key={idx} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{r.name}</td>
                  <td className="px-4 py-3">{r.minQty}</td>
                  <td className="px-4 py-3 font-bold text-emerald-600">{r.discount}</td>
                  <td className="px-4 py-3">{r.maxAutonomous}</td>
                  <td className="px-4 py-3">
                    {r.humanApproval ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                        Mandatory
                      </span>
                    ) : (
                      <span className="text-slate-400">Autonomous</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Live Quote Simulator */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center gap-2 font-bold text-slate-900 text-sm">
            <Calculator className="w-4 h-4 text-amber-700" />
            Pricing & Margin Tester
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="text-slate-500 font-medium">Quantity (kg)</label>
              <input
                type="number"
                value={calcQty}
                onChange={(e) => setCalcQty(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>

            <div>
              <label className="text-slate-500 font-medium">Buyer Requested Extra Discount (%)</label>
              <input
                type="number"
                value={calcDiscount}
                onChange={(e) => setCalcDiscount(Number(e.target.value))}
                className="w-full mt-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold focus:outline-none"
              />
            </div>

            <button
              onClick={handleTestQuote}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              Test Pricing Engine
            </button>
          </div>

          {calcResult && (
            <div className="p-4 rounded-lg bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
              <div className="font-semibold text-slate-900">{calcResult.product}</div>
              <div className="flex justify-between text-slate-500">
                <span>Base Rate:</span>
                <span className="font-medium text-slate-800">₹{calcResult.baseRate}/kg</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Applied Discount:</span>
                <span className="font-bold text-emerald-600">{calcResult.effectiveDisc}%</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Subtotal:</span>
                <span className="font-medium text-slate-800">₹{calcResult.subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold border-t border-slate-200 pt-2">
                <span>Net Total:</span>
                <span>₹{calcResult.total.toLocaleString()}</span>
              </div>

              {calcResult.requiresApproval && (
                <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-[11px] font-semibold text-amber-800 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  Flags mandatory Human Handoff escalation
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
