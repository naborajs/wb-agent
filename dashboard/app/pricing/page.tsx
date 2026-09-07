"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { DollarSign, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import Link from "next/link";

export default function PricingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/knowledge?tab=pricing_rule");
    }, 600);
    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 shadow-xl shadow-emerald-500/5 animate-pulse">
        <DollarSign className="w-8 h-8" />
      </div>
      <h1 className="text-2xl font-bold text-slate-100 mb-3">
        Pricing Rules has merged into Knowledge RAG Hub
      </h1>
      <p className="text-slate-400 max-w-lg mb-8 text-sm leading-relaxed">
        Volume tiers, discount ceilings, and the interactive Quote Simulator are now unified inside the central Knowledge RAG Hub with real-time Dual-Brain update chat.
      </p>
      <Link
        href="/knowledge?tab=pricing_rule"
        className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-semibold rounded-xl transition shadow-lg shadow-emerald-500/20"
      >
        <ShieldCheck className="w-4 h-4" />
        Open Pricing Rules in Knowledge Hub
        <ArrowRight className="w-4 h-4 ml-1" />
      </Link>
    </div>
  );
}
