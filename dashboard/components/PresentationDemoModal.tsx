"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Play,
  CheckCircle2,
  Sparkles,
  FileDown,
  Volume2,
  VolumeX,
  ArrowUpRight,
  X,
  Brain,
  MessageSquare,
  ShoppingBag,
  ShieldCheck,
  Bell,
  Loader2,
} from "lucide-react";
import { AiLoader } from "@/components/ui/ai-loader";

interface DemoStep {
  step: number;
  title: string;
  brain: string;
  status: string;
  detail: string;
  route: string;
}

interface DemoResult {
  success: boolean;
  business_name: string;
  business_industry: string;
  featured_product: string;
  featured_sku: string;
  order_number: string;
  total_amount: number;
  currency_symbol: string;
  conversation_id: string;
  steps: DemoStep[];
  narration_script: string;
}

interface PresentationDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PresentationDemoModal({ isOpen, onClose }: PresentationDemoModalProps) {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState(false);
  const [visibleStepCount, setVisibleStepCount] = useState(0);
  const [result, setResult] = useState<DemoResult | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!isOpen && typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const speakNarration = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.02;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch {
      setIsSpeaking(false);
    }
  };

  const stopSpeech = () => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  };

  const handleRunShowcase = async () => {
    setIsRunning(true);
    setVisibleStepCount(0);
    stopSpeech();

    try {
      const res = await fetch("/api/v1/settings/run-presentation-demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        const data: DemoResult = await res.json();
        setResult(data);
        if (voiceEnabled && data.narration_script) {
          speakNarration(data.narration_script);
        }
        const totalSteps = data.steps?.length || 5;
        for (let i = 1; i <= totalSteps; i++) {
          await new Promise((r) => setTimeout(r, 550));
          setVisibleStepCount(i);
        }
      }
    } catch (err) {
      console.error("Failed to run presentation demo:", err);
    } finally {
      setIsRunning(false);
    }
  };

  const stepIcons = [ShieldCheck, MessageSquare, Brain, ShoppingBag, Bell];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-3xl max-h-[90vh] rounded-3xl border border-[var(--ed-border)] shadow-2xl flex flex-col overflow-hidden"
        style={{ background: "var(--ed-surface)" }}
      >
        {/* Header */}
        <div
          className="px-6 py-4 border-b border-[var(--ed-border)] flex items-center justify-between gap-3"
          style={{ background: "var(--ed-bg)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-extrabold text-[var(--ed-text-primary)]">
                  Live End-to-End Presentation Showcase
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                  FRIDAY + EDITH LIVE
                </span>
              </div>
              <p className="text-xs text-[var(--ed-text-muted)]">
                Executes a real 5-stage autonomous negotiation, synaptic bus arbitration, GST order &amp; owner alert in 1 click
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
            style={{ background: "var(--ed-surface)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Action Control Bar */}
          <div
            className="p-4 rounded-2xl border border-[var(--ed-border)] flex flex-wrap items-center justify-between gap-3"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleRunShowcase}
                disabled={isRunning}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-2 shadow-md disabled:opacity-60 cursor-pointer"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Executing Live Dual-Brain Pipeline...
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    {result ? "Re-Run Live End-to-End Showcase" : "Start 1-Click Live Showcase"}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeech();
                    setVoiceEnabled(false);
                  } else {
                    setVoiceEnabled(!voiceEnabled);
                    if (!voiceEnabled && result?.narration_script) {
                      speakNarration(result.narration_script);
                    }
                  }
                }}
                className={`px-3 py-2.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                  voiceEnabled
                    ? "border-sky-500/40 bg-sky-500/15 text-sky-600 dark:text-sky-300"
                    : "border-[var(--ed-border)] text-[var(--ed-text-muted)]"
                }`}
              >
                {voiceEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                {isSpeaking ? "Speaking Narration..." : voiceEnabled ? "Voice Narration On" : "Voice Muted"}
              </button>
            </div>

            <a
              href="/api/v1/settings/executive-report.pdf"
              download="WB_Agent_Executive_Report.pdf"
              className="px-3.5 py-2.5 rounded-xl border border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/25 transition-colors"
            >
              <FileDown className="w-4 h-4" />
              Export Executive PDF
            </a>
          </div>

          {/* Summary KPI Banner after run */}
          {result && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div
                className="p-3.5 rounded-2xl border border-[var(--ed-border)]"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="text-[10px] font-mono uppercase text-[var(--ed-text-muted)] font-bold">
                  Active Business &amp; Domain
                </div>
                <div className="text-xs font-extrabold text-[var(--ed-text-primary)] mt-1 truncate">
                  {result.business_name}
                </div>
                <div className="text-[11px] text-sky-600 dark:text-sky-400 font-medium truncate">
                  {result.business_industry}
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl border border-[var(--ed-border)]"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="text-[10px] font-mono uppercase text-[var(--ed-text-muted)] font-bold">
                  Negotiated SKU &amp; Guardrail
                </div>
                <div className="text-xs font-extrabold text-[var(--ed-text-primary)] mt-1 truncate">
                  {result.featured_product}
                </div>
                <div className="text-[11px] font-mono text-sky-600 dark:text-sky-400 font-semibold">
                  SKU: {result.featured_sku} • Margin Protected
                </div>
              </div>

              <div
                className="p-3.5 rounded-2xl border border-emerald-500/35 bg-emerald-500/10"
              >
                <div className="text-[10px] font-mono uppercase text-emerald-600 dark:text-emerald-400 font-bold">
                  Confirmed Order &amp; GST Total
                </div>
                <div className="text-sm font-black font-mono text-[var(--ed-text-primary)] mt-1">
                  {result.currency_symbol}
                  {result.total_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Order #{result.order_number}
                </div>
              </div>
            </div>
          )}

          {/* 5-Stage Pipeline Steps */}
          {isRunning && !result ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <AiLoader fullScreen={false} size={150} text="Orchestrating" />
              <p className="text-xs font-mono text-[var(--ed-text-muted)] animate-pulse">
                Dual-Brain Synaptic Bus: Friday &amp; Edith are negotiating and generating order...
              </p>
            </div>
          ) : result ? (
            <div className="space-y-3">
              {result.steps.map((s, idx) => {
                const isRevealed = idx < visibleStepCount;
                const IconComp = stepIcons[idx % stepIcons.length];
                return (
                  <div
                    key={s.step}
                    className={`p-4 rounded-2xl border transition-all duration-300 ${
                      isRevealed
                        ? "border-emerald-500/40 opacity-100 translate-y-0"
                        : "border-[var(--ed-border)] opacity-40 translate-y-1"
                    }`}
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                            isRevealed
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : "bg-slate-500/10 text-[var(--ed-text-muted)]"
                          }`}
                        >
                          {isRevealed ? <CheckCircle2 className="w-4 h-4" /> : <IconComp className="w-4 h-4" />}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-xs font-extrabold text-[var(--ed-text-primary)]">
                              Step {s.step}: {s.title}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400">
                              {s.brain}
                            </span>
                          </div>
                          <p className="text-xs text-[var(--ed-text-muted)] mt-1 leading-relaxed">
                            {s.detail}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          onClose();
                          router.push(s.route);
                        }}
                        className="px-3 py-1.5 rounded-xl border border-[var(--ed-border)] text-[11px] font-bold text-[var(--ed-text-primary)] hover:border-[var(--ed-accent)] flex items-center gap-1 self-start sm:self-center shrink-0 cursor-pointer"
                        style={{ background: "var(--ed-surface)" }}
                      >
                        Inspect Live <ArrowUpRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              className="p-8 rounded-2xl border border-dashed border-[var(--ed-border)] text-center space-y-3"
              style={{ background: "var(--ed-bg)" }}
            >
              <Sparkles className="w-8 h-8 text-blue-500 mx-auto" />
              <div className="text-sm font-bold text-[var(--ed-text-primary)]">
                Ready for Your Live Presentation or Evaluation
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] max-w-xl mx-auto leading-relaxed">
                Click <strong>&ldquo;Start 1-Click Live Showcase&rdquo;</strong> above to automatically simulate an enterprise buyer inquiry in your active business domain, watch <strong>EDITH</strong> defend your floor price, see <strong>FRIDAY &leftrightarrow; EDITH</strong> collaborate on the Synaptic Bus, generate a GST Order, and narrate the full workflow aloud.
              </p>
            </div>
          )}
        </div>

        {/* Footer Quick Navigation */}
        <div
          className="px-6 py-3.5 border-t border-[var(--ed-border)] flex flex-wrap items-center justify-between gap-2 text-xs"
          style={{ background: "var(--ed-bg)" }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                onClose();
                router.push("/conversations");
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--ed-border)] font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--ed-surface)" }}
            >
              <MessageSquare className="w-3.5 h-3.5 text-emerald-500" /> Open Live Inbox
            </button>
            <button
              onClick={() => {
                onClose();
                router.push("/brain");
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--ed-border)] font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--ed-surface)" }}
            >
              <Brain className="w-3.5 h-3.5 text-sky-500" /> Open Dual-Brain Console
            </button>
            <button
              onClick={() => {
                onClose();
                router.push("/orders");
              }}
              className="px-3 py-1.5 rounded-xl border border-[var(--ed-border)] font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5 cursor-pointer"
              style={{ background: "var(--ed-surface)" }}
            >
              <ShoppingBag className="w-3.5 h-3.5 text-sky-500" /> View Orders &amp; Invoices
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[var(--ed-accent)] text-white font-bold cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
