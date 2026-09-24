"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Smartphone,
  Bot,
  Shield,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Zap,
  Volume2,
  DollarSign,
  Layers,
  ChevronRight,
} from "lucide-react";

interface WorkflowStage {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  badgeColor: string;
  actor: "Customer (WhatsApp)" | "FRIDAY (Front Brain)" | "Synaptic Bus & EDITH" | "Commercial Closed (Won)";
  icon: React.ReactNode;
  dialogueSpeaker: string;
  dialogueText: string;
  technicalAction: string;
  telemetryMetric: string;
  graphicUrl: string;
}

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: 1,
    title: "1. Inbound Wholesale Lead",
    subtitle: "Voice / Text message received via WhatsApp multi-device gateway",
    badge: "INBOUND SSL",
    badgeColor: "text-sky-500 border-sky-500/30 bg-sky-500/10",
    actor: "Customer (WhatsApp)",
    icon: <Smartphone className="w-5 h-5 text-sky-500" />,
    dialogueSpeaker: "Rajesh (Grand Hospitality)",
    dialogueText:
      "Hello! We need 500 units of Darjeeling First Flush tea for our boutique hotels across India. Can you provide an 18% commercial discount for prompt payment?",
    technicalAction: "Baileys bridge receives message -> SQLite conversation record created -> Audio & text payload dispatched to FRIDAY.",
    telemetryMetric: "Ingestion Latency: 18ms",
    graphicUrl: "/whatsapp_hologram_phone.png",
  },
  {
    id: 2,
    title: "2. FRIDAY Multimodal Triage",
    subtitle: "110ms intent parsing, customer entity extraction, and memory lookup",
    badge: "GEMINI 3.1 LIVE",
    badgeColor: "text-purple-500 border-purple-500/30 bg-purple-500/10",
    actor: "FRIDAY (Front Brain)",
    icon: <Bot className="w-5 h-5 text-purple-500" />,
    dialogueSpeaker: "FRIDAY Core",
    dialogueText:
      "Welcome back, Rajesh! Verified buyer account with 2 previous fulfilled shipments. Analyzing 500-unit tier from commercial catalog and requesting policy approval...",
    technicalAction: "Multimodal Gemini Flash Live processes intent -> Queries customer history from SQLite -> Dispatches quote request to Inter-Brain Bus.",
    telemetryMetric: "Turn Speed: 110ms",
    graphicUrl: "/friday_ethereal_orb.png",
  },
  {
    id: 3,
    title: "3. Inter-Brain Bus & EDITH Policy",
    subtitle: "Margin ceiling defense & dynamic quantity-tier discount calculation",
    badge: "NEMOTRON 3.5",
    badgeColor: "text-amber-500 border-amber-500/30 bg-amber-500/10",
    actor: "Synaptic Bus & EDITH",
    icon: <Shield className="w-5 h-5 text-amber-500" />,
    dialogueSpeaker: "EDITH Commercial Brain",
    dialogueText:
      "18% discount exceeds authorized 5.0% margin ceiling for 500 units. Optimal counter-offer calculated: 8.0% wholesale discount plus complimentary insured air freight.",
    technicalAction: "<12ms Inter-Brain bus consensus -> NVIDIA Nemotron evaluates policy rules -> Generates auditable commercial quote record.",
    telemetryMetric: "Bus Consensus: 9.4ms",
    graphicUrl: "/edith_cyber_core.png",
  },
  {
    id: 4,
    title: "4. Autonomous Closing & Deal Won",
    subtitle: "Customer accepts counter-offer -> Proforma generated -> Logged to DB",
    badge: "DEAL WON",
    badgeColor: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
    actor: "Commercial Closed (Won)",
    icon: <CheckCircle2 className="w-5 h-5 text-emerald-500" />,
    dialogueSpeaker: "Rajesh (Grand Hospitality)",
    dialogueText:
      "That works perfectly for our finance department! Please send the proforma invoice with GST terms. Thank you for the rapid turnaround!",
    technicalAction: "WhatsApp bridge dispatches confirmation -> Pipeline value +₹1,25,000 -> Deal marked as WON -> Invoice generated.",
    telemetryMetric: "Revenue Added: +₹1,25,000",
    graphicUrl: "/synaptic_bus_highway.png",
  },
];

interface CinematicWorkflowTheaterProps {
  onTestSandbox?: () => void;
}

export default function CinematicWorkflowTheater({ onTestSandbox }: CinematicWorkflowTheaterProps) {
  const [currentStageIdx, setCurrentStageIdx] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const stageDurationMs = 5000;
  const updateIntervalMs = 50;

  // Auto-play progression loop
  useEffect(() => {
    if (!isPlaying) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    timerRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = prev + (updateIntervalMs / stageDurationMs) * 100;
        if (next >= 100) {
          setCurrentStageIdx((curr) => (curr + 1) % WORKFLOW_STAGES.length);
          return 0;
        }
        return next;
      });
    }, updateIntervalMs);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying]);

  const selectStage = (idx: number) => {
    setCurrentStageIdx(idx);
    setProgress(0);
  };

  const currentStage = WORKFLOW_STAGES[currentStageIdx];

  return (
    <div className="w-full rounded-3xl ed-glass-luxury border border-slate-200/80 dark:border-white/10 p-6 md:p-8 space-y-6 relative overflow-hidden transition-all">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-80 h-80 bg-sky-500/10 dark:bg-[#00D2FE]/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-white/10">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-mono font-bold text-sky-600 dark:text-[#00D2FE] uppercase tracking-wider">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Workflow Theater // Flow of Intelligence</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1">
            See the Autonomous Closing Engine in Action
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Follow a real-world B2B buyer interaction across all 4 stages of the Dual-Brain Operating System.
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="px-3 py-1.5 rounded-xl font-mono text-xs font-semibold bg-white/80 dark:bg-white/10 hover:bg-slate-100 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 flex items-center gap-1.5 transition-all shadow-sm"
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                <span>Resume</span>
              </>
            )}
          </button>
          <button
            onClick={() => {
              setCurrentStageIdx(0);
              setProgress(0);
              setIsPlaying(true);
            }}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/10 transition-all border border-slate-200 dark:border-white/10"
            title="Restart Tour"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Stage Step Progress Pills */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {WORKFLOW_STAGES.map((stage, idx) => {
          const isCurrent = idx === currentStageIdx;
          const isPassed = idx < currentStageIdx;

          return (
            <button
              key={stage.id}
              onClick={() => selectStage(idx)}
              className={`p-3 rounded-2xl border text-left transition-all relative overflow-hidden ${
                isCurrent
                  ? "bg-white dark:bg-white/10 border-sky-400 dark:border-[#00D2FE] shadow-lg shadow-sky-500/10"
                  : "bg-slate-50/70 dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-slate-300 dark:hover:border-white/20 opacity-80"
              }`}
            >
              {/* Progress bar inside active pill */}
              {isCurrent && (
                <div
                  className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-sky-400 to-purple-500 transition-all duration-75"
                  style={{ width: `${progress}%` }}
                />
              )}

              <div className="flex items-center justify-between text-[11px] font-mono font-bold mb-1">
                <span className={isCurrent ? "text-sky-600 dark:text-[#00D2FE]" : "text-slate-500 dark:text-slate-400"}>
                  STAGE 0{stage.id}
                </span>
                <span className={`px-1.5 py-0.2 rounded text-[9px] border ${stage.badgeColor}`}>
                  {stage.badge}
                </span>
              </div>
              <div className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                {stage.title.split(". ")[1]}
              </div>
            </button>
          );
        })}
      </div>

      {/* The Main Stage Showcase Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center pt-2">
        {/* Left: Graphic Visual Card (5 cols) */}
        <div className="lg:col-span-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-lg group bg-slate-900/90 aspect-square max-h-[320px] flex items-center justify-center">
          <img
            src={currentStage.graphicUrl}
            alt={currentStage.title}
            className="w-full h-full object-contain p-4 filter drop-shadow-xl group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-black/60 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold text-white flex items-center gap-1.5">
            {currentStage.icon}
            <span>{currentStage.actor}</span>
          </div>
          <div className="absolute bottom-3 right-3 px-2.5 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/15 text-[11px] font-mono font-bold text-emerald-400">
            {currentStage.telemetryMetric}
          </div>
        </div>

        {/* Right: Live Dialogue & Technical Action (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-md text-[11px] font-mono font-bold bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-[#00D2FE] border border-sky-200 dark:border-sky-800/40 mb-2">
              <span>{currentStage.title}</span>
            </div>
            <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white">
              {currentStage.subtitle}
            </h3>
          </div>

          {/* Dialogue Speech Bubble */}
          <div className="p-4 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/10 shadow-sm relative space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-white/10 pb-1.5">
              <span>SPEAKER: {currentStage.dialogueSpeaker}</span>
              <span className="text-sky-500">Live Transcript</span>
            </div>
            <p className="text-sm font-sans text-slate-800 dark:text-slate-200 leading-relaxed pt-1 italic">
              "{currentStage.dialogueText}"
            </p>
          </div>

          {/* Technical Execution Box */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-xs font-mono space-y-1">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
              Background Automation Execution:
            </div>
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {currentStage.technicalAction}
            </div>
          </div>

          {/* Bottom Action Footer */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs font-mono text-slate-500 dark:text-slate-400">
              Stage {currentStageIdx + 1} of 4 • Auto-playing
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => selectStage((currentStageIdx + 1) % WORKFLOW_STAGES.length)}
                className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 flex items-center gap-1 transition-all"
              >
                <span>Next Stage</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {onTestSandbox && (
                <button
                  onClick={onTestSandbox}
                  className="px-3.5 py-1.5 rounded-xl font-mono text-xs font-bold bg-sky-500 hover:bg-sky-400 dark:bg-[#00D2FE] dark:hover:bg-sky-400 text-slate-950 flex items-center gap-1.5 shadow-sm active:scale-95 transition-all"
                >
                  <Zap className="w-3.5 h-3.5 fill-slate-950" />
                  <span>Try Inquiry in Sandbox</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
