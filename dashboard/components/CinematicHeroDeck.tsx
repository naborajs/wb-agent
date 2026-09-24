"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Zap,
  Mic,
  Cpu,
  Bot,
  Shield,
  Smartphone,
  Radio,
  ArrowRight,
  TrendingUp,
  Play,
  CheckCircle2,
  Lock,
  Layers,
  ChevronRight,
  Volume2,
} from "lucide-react";
import { motion } from "framer-motion";
import LiquidNebulaCanvas from "./ui/LiquidNebulaCanvas";
import { FloatingPaths } from "./ui/FloatingPathsBackground";
import NativeFridayOrb3D from "./3d/NativeFridayOrb3D";
import NativeEdithCore3D from "./3d/NativeEdithCore3D";

interface CinematicHeroDeckProps {
  onPlayCinematicTour?: () => void;
  onTalkWithFriday?: () => void;
  onOpenSandbox?: () => void;
  onConnectWhatsApp?: () => void;
  waConnected?: boolean;
  botPhone?: string;
  hotLeadsCount?: number;
  wonDealsCount?: number;
  pipelineValueStr?: string;
  autonomousRate?: number;
  turnSpeed?: string;
}

export default function CinematicHeroDeck({
  onPlayCinematicTour,
  onTalkWithFriday,
  onOpenSandbox,
  onConnectWhatsApp,
  waConnected = false,
  botPhone = "918918753100",
  hotLeadsCount = 7,
  wonDealsCount = 14,
  pipelineValueStr = "₹4,85,000",
  autonomousRate = 94.2,
  turnSpeed = "1.1s",
}: CinematicHeroDeckProps) {
  const [modelViewMode, setModelViewMode] = useState<"3d" | "render">("3d");

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-200/80 dark:border-white/10 shadow-2xl transition-all duration-300">
      {/* 1. Subtle Ambient Liquid Nebula Canvas & Floating Paths */}
      <LiquidNebulaCanvas className="opacity-30 dark:opacity-50" />
      <div className="absolute inset-0 opacity-35 dark:opacity-45 pointer-events-none">
        <FloatingPaths position={1} count={24} />
        <FloatingPaths position={-1} count={24} />
      </div>

      {/* 2. Top Specular Ambient Gradients */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-sky-500/15 dark:bg-[#00D2FE]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-purple-500/15 dark:bg-[#A855F7]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/10 dark:bg-[#10B981]/10 rounded-full blur-3xl pointer-events-none" />

      {/* 3. Main Content Container */}
      <div className="relative z-10 p-6 md:p-10 space-y-8">
        {/* Top Header Marquee */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-white/10">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-bold bg-white/80 dark:bg-white/5 border border-slate-200 dark:border-white/10 backdrop-blur-md text-sky-600 dark:text-[#00D2FE] shadow-sm">
              <span className="w-2 h-2 rounded-full bg-sky-500 dark:bg-[#00D2FE] animate-pulse" />
              <span>THE DUAL-BRAIN ARCHITECTURE</span>
              <span className="text-slate-400 dark:text-slate-600">•</span>
              <span className="text-purple-600 dark:text-[#A855F7]">GEMINI 3.1 LIVE & NEMOTRON 3.5</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-white">
              {"Autonomous AI Commercial Operating System".split(" ").map((word, wordIndex) => (
                <span key={wordIndex} className="inline-block mr-2.5 last:mr-0">
                  {word.split("").map((letter, letterIndex) => (
                    <motion.span
                      key={`${wordIndex}-${letterIndex}`}
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{
                        delay: wordIndex * 0.05 + letterIndex * 0.015,
                        type: "spring",
                        stiffness: 140,
                        damping: 24,
                      }}
                      className="inline-block"
                    >
                      {letter}
                    </motion.span>
                  ))}
                </span>
              ))}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-3xl leading-relaxed">
              Experience the symphony of two specialized artificial intelligences working in sub-12ms consensus:
              <strong> FRIDAY</strong> captures intent through multimodal voice & live vision; <strong>EDITH</strong> negotiates wholesale pricing under strict policy margin defense.
            </p>
          </div>

          {/* Interactive Mode & Quick Actions */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={() => setModelViewMode(modelViewMode === "3d" ? "render" : "3d")}
              className="px-3 py-1.5 rounded-xl text-xs font-mono font-semibold bg-white/80 dark:bg-white/5 hover:bg-slate-100 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition-all flex items-center gap-1.5 shadow-sm"
              title="Toggle Native 3D WebGL vs High-Res Render"
            >
              <Layers className="w-3.5 h-3.5 text-sky-500" />
              <span>View: <strong>{modelViewMode === "3d" ? "Native 3D" : "3D Concept"}</strong></span>
            </button>

            {onPlayCinematicTour && (
              <button
                onClick={onPlayCinematicTour}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-gradient-to-r from-sky-500 to-purple-600 hover:from-sky-400 hover:to-purple-500 text-white shadow-lg shadow-sky-500/20 active:scale-95 transition-all flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-white" />
                <span>Play Cinematic Tour</span>
              </button>
            )}
          </div>
        </div>

        {/* 4. The Grand Dual-Brain Floating Stage */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* LEFT: FRIDAY (Front Brain & Voice Copilot) */}
          <div className="lg:col-span-4 ed-glass-luxury ed-glass-card p-6 flex flex-col justify-between group">
            {/* Ambient Corner Aura */}
            <div className="absolute top-0 right-0 w-44 h-44 bg-purple-500/10 dark:bg-[#A855F7]/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Card Header Badge */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-purple-100 dark:bg-[#8B5CF6]/15 text-purple-700 dark:text-[#A855F7] border border-purple-200 dark:border-[#8B5CF6]/30">
                  <Bot className="w-3.5 h-3.5" />
                  <span>FRONT BRAIN // VOICE & VISION</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30 font-bold">
                  ACTIVE
                </span>
              </div>

              {/* Title & Specs */}
              <div className="mt-3">
                <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  FRIDAY Core
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
                    (Gemini 3.1 Live)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Real-time 16kHz PCM audio streaming, screen DOM-grounded tool execution, and split-second conversational empathy.
                </p>
              </div>

              {/* 3D Visual Centerpiece */}
              <div className="my-5 flex items-center justify-center relative min-h-[220px]">
                {modelViewMode === "3d" ? (
                  <NativeFridayOrb3D size={220} className="transform hover:scale-105 transition-transform" />
                ) : (
                  <div className="relative w-48 h-48 rounded-full flex items-center justify-center">
                    <img
                      src="/friday_ethereal_orb.png"
                      alt="FRIDAY Ethereal Quantum Orb"
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_25px_rgba(56,189,248,0.35)] animate-float-subtle"
                    />
                  </div>
                )}

                {/* Pulsing Audio Waveform Indicator */}
                <div className="absolute bottom-1 inset-x-4 p-2 rounded-xl bg-white/70 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-purple-500 animate-pulse" />
                    <span>Live 16kHz Audio Stream</span>
                  </div>
                  <div className="flex items-center gap-0.5 h-3">
                    <span className="w-1 h-2 bg-purple-500 rounded-full animate-pulse" />
                    <span className="w-1 h-3 bg-sky-400 rounded-full animate-pulse delay-75" />
                    <span className="w-1 h-2 bg-purple-400 rounded-full animate-pulse delay-150" />
                    <span className="w-1 h-3 bg-emerald-400 rounded-full animate-pulse delay-100" />
                  </div>
                </div>
              </div>

              {/* Key Telemetry Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Voice Latency</span>
                  <span className="font-bold text-slate-900 dark:text-white">~110ms Turn</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Context Window</span>
                  <span className="font-bold text-purple-600 dark:text-[#A855F7]">1,048,576 tok</span>
                </div>
              </div>
            </div>

            {/* Quick Trigger Button */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10">
              <button
                onClick={() => {
                  if (onTalkWithFriday) {
                    onTalkWithFriday();
                  } else {
                    const voiceBtn = document.querySelector("button:has(svg.lucide-phone), button:has(svg.lucide-mic)") as HTMLButtonElement;
                    if (voiceBtn) voiceBtn.click();
                  }
                }}
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center gap-2 shadow-md shadow-purple-600/25 active:scale-95 transition-all"
              >
                <Mic className="w-3.5 h-3.5" />
                <span>Talk with Friday (Live Voice)</span>
              </button>
            </div>
          </div>

          {/* CENTER: INTER-BRAIN SYNAPTIC HIGHWAY & CONSENSUS HUB */}
          <div className="lg:col-span-4 ed-glass-luxury ed-glass-card p-6 flex flex-col justify-between text-center relative overflow-hidden">
            {/* Ambient Center Glow */}
            <div className="absolute inset-0 bg-gradient-to-b from-sky-500/5 via-transparent to-emerald-500/5 pointer-events-none" />

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-sky-100 dark:bg-[#00D2FE]/15 text-sky-700 dark:text-[#00D2FE] border border-sky-300 dark:border-[#00D2FE]/30 mx-auto">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>SYNAPTIC DELIBERATION HIGHWAY</span>
              </div>

              <h3 className="text-lg font-bold font-mono text-slate-900 dark:text-white mt-2">
                &lt;12ms Consensus Protocol
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                Bidirectional neural bus exchanging buyer intent, margin checks, and SQLite catalog transactions in real time.
              </p>

              {/* Highway Graphic Banner */}
              <div className="my-5 relative rounded-2xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-inner group">
                <img
                  src="/synaptic_bus_highway.png"
                  alt="Synaptic Bus Highway"
                  className="w-full h-44 object-cover filter brightness-105 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-left">
                  <div className="text-[10px] font-mono text-sky-300 font-bold uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    Neural Deliberation Active
                  </div>
                  <div className="text-xs font-mono text-white font-semibold">
                    Autonomous Consensus Rate: <span className="text-emerald-400 font-bold">{autonomousRate}%</span>
                  </div>
                </div>
              </div>

              {/* Center Stats Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono text-left">
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Bus Velocity</span>
                  <span className="font-bold text-sky-500">&lt;12ms Latency</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Policy Guardrail</span>
                  <span className="font-bold text-amber-500">100% Defense</span>
                </div>
              </div>
            </div>

            {/* Quick Sandbox Trigger */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10">
              <button
                onClick={onOpenSandbox}
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-sky-500 hover:bg-sky-400 dark:bg-[#00D2FE] dark:hover:bg-sky-400 text-slate-950 flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all"
              >
                <Zap className="w-3.5 h-3.5 fill-slate-950" />
                <span>Test Live AI Sandbox</span>
              </button>
            </div>
          </div>

          {/* RIGHT: EDITH (Commercial Sales Closer & Policy Engine) */}
          <div className="lg:col-span-4 ed-glass-luxury ed-glass-card p-6 flex flex-col justify-between group">
            {/* Ambient Corner Aura */}
            <div className="absolute top-0 left-0 w-44 h-44 bg-amber-500/10 dark:bg-[#F59E0B]/10 rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Card Header Badge */}
              <div className="flex items-center justify-between">
                <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-100 dark:bg-[#F59E0B]/15 text-amber-700 dark:text-[#F59E0B] border border-amber-200 dark:border-[#F59E0B]/30">
                  <Shield className="w-3.5 h-3.5" />
                  <span>COMMERCIAL BRAIN // CLOSER</span>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30 font-bold">
                  AUTONOMOUS
                </span>
              </div>

              {/* Title & Specs */}
              <div className="mt-3">
                <h3 className="text-xl font-bold font-mono text-slate-900 dark:text-white flex items-center gap-2">
                  EDITH Core
                  <span className="text-xs font-normal text-slate-500 dark:text-slate-400 font-mono">
                    (Nemotron 3.5)
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  Enterprise consultative discovery, margin ceiling defense, dynamic quantity-tier pricing, and automated deal closing.
                </p>
              </div>

              {/* 3D Visual Centerpiece */}
              <div className="my-5 flex items-center justify-center relative min-h-[220px]">
                {modelViewMode === "3d" ? (
                  <NativeEdithCore3D size={220} className="transform hover:scale-105 transition-transform" />
                ) : (
                  <div className="relative w-48 h-48 rounded-2xl flex items-center justify-center">
                    <img
                      src="/edith_cyber_core.png"
                      alt="EDITH Cybernetic Monolithic Core"
                      className="w-full h-full object-contain filter drop-shadow-[0_10px_25px_rgba(245,158,11,0.35)] animate-float-delayed"
                    />
                  </div>
                )}

                {/* Margin Ceiling Dial Indicator */}
                <div className="absolute bottom-1 inset-x-4 p-2 rounded-xl bg-white/70 dark:bg-black/40 backdrop-blur-md border border-slate-200/80 dark:border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-600 dark:text-slate-300">
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-amber-500" />
                    <span>Margin Defense Ceiling</span>
                  </div>
                  <span className="font-bold text-amber-500 dark:text-[#F59E0B]">5.0% Limit</span>
                </div>
              </div>

              {/* Key Telemetry Badges */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Deals Won</span>
                  <span className="font-bold text-emerald-600 dark:text-[#10B981]">{wonDealsCount} Closed</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-100/80 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                  <span className="text-[10px] text-slate-400 block">Pipeline Value</span>
                  <span className="font-bold text-slate-900 dark:text-white">{pipelineValueStr}</span>
                </div>
              </div>
            </div>

            {/* Quick Trigger Button */}
            <div className="mt-5 pt-4 border-t border-slate-200/80 dark:border-white/10">
              <Link
                href="/knowledge"
                className="w-full py-2.5 rounded-xl font-mono text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 active:scale-95 transition-all"
              >
                <Cpu className="w-3.5 h-3.5" />
                <span>Configure Pricing & Policies</span>
              </Link>
            </div>
          </div>
        </div>

        {/* 5. Floating Bottom Gateway Bar: WhatsApp & Live Capabilities */}
        <div className="p-4 rounded-2xl ed-glass-luxury border border-slate-200/80 dark:border-white/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="relative w-11 h-11 rounded-xl overflow-hidden shrink-0 shadow-md">
              <img
                src="/whatsapp_hologram_phone.png"
                alt="WhatsApp Live Gateway"
                className="w-full h-full object-cover"
              />
              <span className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full ${waConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-400"}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold font-mono text-slate-900 dark:text-white">
                  WhatsApp Commercial Gateway:
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                  waConnected
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-[#10B981] border border-emerald-500/30"
                    : "bg-amber-500/15 text-amber-700 dark:text-[#F59E0B] border border-amber-500/30"
                }`}>
                  {waConnected ? "CONNECTED ONLINE" : "READY TO PAIR"}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Listening on +{botPhone} • Baileys Multi-Device Bridge & Meta Cloud Hybrid
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto">
            {!waConnected && (
              <button
                onClick={onConnectWhatsApp}
                className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center gap-1.5 shadow-sm active:scale-95 transition-all"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>Pair Phone via Code / QR</span>
              </button>
            )}
            <Link
              href="/conversations"
              className="flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-mono font-semibold bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-white/10 flex items-center justify-center gap-1 transition-all"
            >
              <span>Live Inbox</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
