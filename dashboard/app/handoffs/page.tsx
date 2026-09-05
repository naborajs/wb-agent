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
        if (data && Array.isArray(data)) setHandoffs(data);
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
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">Operator Handoff Queue</h2>
        <p className="text-sm text-[var(--ed-text-muted)] mt-1">
          High-priority escalations requiring human authority: purchase confirmations, contract pricing, and explicit assistance requests.
        </p>
      </div>

      {handoffs.length === 0 ? (
        <div className="ed-panel rounded-xl p-12 text-center space-y-3" style={{ background: "var(--ed-surface)" }}>
          <div className="w-12 h-12 rounded-full bg-[var(--ed-success)]/10 text-[var(--ed-success)] flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-base text-[var(--ed-text-primary)]">All Conversations Autonomous</h3>
          <p className="text-xs text-[var(--ed-text-muted)] max-w-md mx-auto">
            No active escalations in queue. The autonomous AI agent is currently managing wholesale tea inquiries within authorized pricing and discount limits.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {handoffs.map((h) => (
            <div
              key={h.id}
              className={`p-5 ed-panel rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                h.status === "pending" ? "!border-[var(--ed-accent)]/30" : "opacity-60"
              }`}
              style={{ background: "var(--ed-surface)" }}
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span
                    className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider text-[var(--ed-danger)] border border-[var(--ed-danger)]/20"
                    style={{ background: "color-mix(in srgb, var(--ed-danger) 10%, transparent)" }}
                  >
                    {h.reason.replace("_", " ")}
                  </span>
                  <span className="text-xs text-[var(--ed-text-muted)] font-data">
                    {new Date(h.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <h4 className="font-bold text-sm text-[var(--ed-text-primary)] mt-1">{h.customer_intent}</h4>
                <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed max-w-2xl">{h.summary}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {h.status === "pending" ? (
                  <>
                    <a
                      href={`/conversations`}
                      className="ed-press ed-focus-ring px-4 py-2.5 rounded-lg border border-[var(--ed-border)] text-xs font-semibold text-[var(--ed-text-primary)] hover:border-[var(--ed-accent)]/40 hover:text-[var(--ed-accent)] inline-flex items-center gap-1.5 transition-colors shadow-sm"
                      style={{ background: "var(--ed-bg)" }}
                    >
                      Open Live Thread <ArrowUpRight className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => handleResolve(h.id, true)}
                      className="ed-interactive ed-press ed-focus-ring px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors inline-flex items-center justify-center gap-1.5 hover:opacity-95"
                      style={{ background: "var(--ed-success)", minHeight: "44px" }}
                    >
                      Resolve & Resume AI
                    </button>
                  </>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--ed-success)]">
                    <CheckCircle2 className="w-4 h-4" /> Resolved
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
