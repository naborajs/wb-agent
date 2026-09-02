"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, CheckCircle2, User, ArrowUpRight } from "lucide-react";

export default function HandoffsPage() {
  const [handoffs, setHandoffs] = useState<any[]>([
    {
      id: "h_1",
      conversation_id: "conv_demo_2",
      reason: "purchase_intent",
      summary: "Customer ready to order 100kg Assam CTC. Needs GST invoice and banking details.",
      customer_intent: "Commercial closing",
      status: "pending",
      created_at: new Date().toISOString(),
    },
    {
      id: "h_2",
      conversation_id: "conv_demo_3",
      reason: "custom_pricing",
      summary: "Distributor requested 20% discount on 1000kg bulk blend (exceeds 5% autonomous authority).",
      customer_intent: "Large volume contract",
      status: "pending",
      created_at: new Date().toISOString(),
    },
  ]);

  useEffect(() => {
    fetch("/api/v1/handoffs")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) setHandoffs(data);
      })
      .catch(() => {});
  }, []);

  const handleResolve = async (id: string, resumeAi: boolean) => {
    try {
      const res = await fetch(`/api/v1/handoffs/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resume_ai: resumeAi }),
      });
      if (res.ok) {
        setHandoffs((prev) =>
          prev.map((h) => (h.id === id ? { ...h, status: "resolved" } : h))
        );
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Operator Handoff Queue</h2>
        <p className="text-sm text-slate-500 mt-1">
          High-priority escalations requiring human authority: purchase confirmations, contract pricing, and explicit assistance requests.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {handoffs.map((h) => (
          <div
            key={h.id}
            className={`p-5 rounded-xl border bg-white shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
              h.status === "pending" ? "border-amber-200" : "border-slate-200 opacity-60"
            }`}
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-50 text-rose-600 border border-rose-200">
                  {h.reason.replace("_", " ")}
                </span>
                <span className="text-xs text-slate-400">
                  {new Date(h.created_at).toLocaleTimeString()}
                </span>
              </div>
              <h4 className="font-bold text-sm text-slate-900 mt-1">{h.customer_intent}</h4>
              <p className="text-xs text-slate-600 leading-relaxed max-w-2xl">{h.summary}</p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {h.status === "pending" ? (
                <>
                  <a
                    href={`/conversations`}
                    className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
                  >
                    Open Live Thread <ArrowUpRight className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={() => handleResolve(h.id, true)}
                    className="px-3.5 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold border border-emerald-200 transition-colors"
                  >
                    Resolve & Resume AI
                  </button>
                </>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                  <CheckCircle2 className="w-4 h-4" /> Resolved
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
