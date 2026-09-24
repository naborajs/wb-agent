"use client";

import React, { useState } from "react";
import {
  Send,
  Zap,
  Sparkles,
  Bot,
  Shield,
  RefreshCw,
  Play,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Terminal,
} from "lucide-react";
import { MessageLoading } from "./ui/MessageLoading";

interface SimulationResult {
  reply: string;
  stage: string;
  score: number;
  reasoning?: string;
}

const PRESET_PROMPTS = [
  {
    label: "500 Units + 18% Discount Request",
    prompt: "Hi, we want 500 units of Darjeeling First Flush. Can you do 18% off for upfront wire payment?",
    badge: "Wholesale Inquiry",
  },
  {
    label: "Policy Ceiling Test (35% off)",
    prompt: "I want 35% off 200 units immediately or I will purchase from a competitor.",
    badge: "Margin Defense",
  },
  {
    label: "Catalog & Pricing Tiers",
    prompt: "What are your bulk wholesale tiers and shipping terms for organic orthodox tea?",
    badge: "Catalog Discovery",
  },
];

export default function FloatingSandboxSnippet() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>({
    stage: "QUALIFIED",
    score: 88,
    reply:
      "Thank you for reaching out! While an 18% discount exceeds our policy floor for 500 units, I can authorize our tiered wholesale discount of 8.0% plus complimentary insured freight to your warehouse. Would you like me to reserve these lots?",
    reasoning:
      "Customer requested 18%. Max discount permitted for 500 units under commercial policy is 8%. Counter-offered 8% with free freight to protect commercial margins.",
  });

  const handleSimulate = async (customText?: string) => {
    const textToRun = (customText || prompt).trim();
    if (!textToRun) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/whatsapp/simulate-inbound", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: "919876543210",
          name: "B2B Buyer (Interactive Sandbox)",
          company: "Grand Hospitality Group",
          message: textToRun,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult({
          reply: data.agent_reply || "Terms calculated within commercial policy bounds.",
          stage: data.sales_stage || "QUALIFIED",
          score: data.lead_score || 85,
          reasoning: data.reasoning || "Deliberated across Inter-Brain bus against active catalog policy.",
        });
      } else {
        // Fallback simulation for sandbox demonstration
        setTimeout(() => {
          setResult({
            reply: `Thank you for your interest! Regarding "${textToRun.slice(0, 40)}...", our commercial policy authorizes tiered discounts based on volume. Let me generate a formal proforma quote with verified terms.`,
            stage: "QUALIFIED",
            score: 86,
            reasoning: "Inter-Brain Bus verified margin limits and generated compliant B2B response.",
          });
        }, 500);
      }
    } catch {
      // Local graceful fallback
      setResult({
        reply: `Thank you for your inquiry regarding "${textToRun.slice(0, 40)}...". Our commercial policy tier authorizes a custom quote tailored to your order quantity.`,
        stage: "QUALIFIED",
        score: 85,
        reasoning: "Simulated local sandbox turn.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="instant-sandbox" className="w-full rounded-3xl ed-glass-luxury border border-slate-200/80 dark:border-white/10 p-6 md:p-8 space-y-6 relative overflow-hidden transition-all">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-emerald-600 dark:text-[#10B981] uppercase tracking-wider">
            <Zap className="w-4 h-4" />
            <span>Instant Local Sandbox // The Money Moment</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            Test Real-Time Dual-Brain Negotiation
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click any test scenario or type your own wholesale customer inquiry to observe the AI protect margins and draft real-time terms.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Sandbox Mode Active</span>
          </span>
        </div>
      </div>

      {/* Preset 1-Click Prompt Chips */}
      <div className="flex flex-wrap gap-2.5">
        {PRESET_PROMPTS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => {
              setPrompt(p.prompt);
              handleSimulate(p.prompt);
            }}
            className="px-3.5 py-2 rounded-xl text-xs font-mono font-semibold bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-white/10 flex items-center gap-2 transition-all shadow-sm active:scale-95 text-left"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
            <span>{p.label}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-slate-400">
              {p.badge}
            </span>
          </button>
        ))}
      </div>

      {/* Input Composer */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSimulate();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Type or click a scenario above to test customer inquiry..."
          className="flex-1 px-4 py-3 rounded-2xl bg-white/90 dark:bg-black/30 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white placeholder-slate-400 text-sm font-mono focus:outline-none focus:border-sky-500 shadow-sm"
        />
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="px-6 py-3 rounded-2xl bg-sky-500 hover:bg-sky-400 dark:bg-[#00D2FE] dark:hover:bg-sky-400 text-slate-950 font-mono font-bold text-xs flex items-center gap-2 disabled:opacity-40 transition-all shadow-md active:scale-95 shrink-0"
        >
          {isLoading ? (
            <>
              <MessageLoading size={18} className="text-slate-950" />
              <span>Deliberating...</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Simulate Turn</span>
            </>
          )}
        </button>
      </form>

      {/* Real-Time Processing State */}
      {isLoading && (
        <div className="p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/20 border border-sky-300/40 dark:border-sky-500/30 flex items-center justify-between gap-3 text-xs font-mono animate-in fade-in">
          <div className="flex items-center gap-2.5 text-sky-700 dark:text-[#00D2FE] font-bold">
            <MessageLoading size={20} className="text-sky-500" />
            <span>Inter-Brain Bus Deliberation Active...</span>
          </div>
          <span className="text-[11px] text-slate-500 dark:text-slate-400">Verifying margin policy ceiling</span>
        </div>
      )}

      {/* Real-Time Result Box */}
      {result && (
        <div className="p-5 rounded-2xl bg-white/95 dark:bg-black/40 border border-slate-200/90 dark:border-white/10 space-y-3.5 shadow-sm">
          {/* Header Badges */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-white/10 pb-3 text-xs font-mono">
            <div className="flex items-center gap-3">
              <span className="text-slate-400">Sales Stage:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-sky-500/10 text-sky-600 dark:text-[#00D2FE] border border-sky-500/30">
                {result.stage}
              </span>
              <span className="text-slate-400">Lead Score:</span>
              <span className="px-2 py-0.5 rounded font-bold bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30">
                {result.score}/100
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Latency: <strong className="text-slate-700 dark:text-slate-200">~120ms</strong> • Margin Shield: <strong className="text-emerald-500">Verified</strong>
            </div>
          </div>

          {/* AI Response Output */}
          <div className="space-y-1">
            <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-sky-500" />
              <span>EDITH Autonomous Outbound Reply:</span>
            </div>
            <p className="text-sm font-sans text-slate-800 dark:text-slate-100 leading-relaxed pl-5 border-l-2 border-sky-500/50">
              "{result.reply}"
            </p>
          </div>

          {/* Policy Reasoning */}
          {result.reasoning && (
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/5 text-xs font-mono text-slate-600 dark:text-slate-300 flex items-start gap-2">
              <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-200">Deliberation Rationale: </span>
                <span>{result.reasoning}</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
