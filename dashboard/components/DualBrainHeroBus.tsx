"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  Cpu,
  Sparkles,
  Zap,
  Activity,
  Flame,
  CheckCircle2,
  TrendingUp,
  AlertCircle,
  Clock,
  Shield,
  Wifi,
  WifiOff,
  Radio,
  ArrowRight,
  ArrowLeft,
  Bot,
} from "lucide-react";

interface DualBrainHeroBusProps {
  queueDepth: number;
  autonomousRate: number;
  turnSpeed: string;
  isSimulatingTurn?: boolean;
  businessName: string;
  businessIndustry: string;
  waConnected: boolean;
  botPhone?: string;
  hotLeadsCount: number;
  wonDealsCount: number;
  pipelineValueStr: string;
  pendingHandoffsCount: number;
  tokensSummary?: {
    friday_tokens?: number;
    friday_input_tokens?: number;
    friday_output_tokens?: number;
    friday_model?: string;
    friday_cost_usd?: number;
    edith_tokens?: number;
    edith_input_tokens?: number;
    edith_output_tokens?: number;
    edith_reasoning_tokens?: number;
    edith_model?: string;
    edith_cost_usd?: number;
    total_tokens?: number;
    total_cost_usd?: number;
  };
}

export default function DualBrainHeroBus({
  queueDepth,
  autonomousRate,
  turnSpeed,
  isSimulatingTurn = false,
  businessName,
  businessIndustry,
  waConnected,
  botPhone = "918918753100",
  hotLeadsCount,
  wonDealsCount,
  pipelineValueStr,
  pendingHandoffsCount,
  tokensSummary,
}: DualBrainHeroBusProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [displayRate, setDisplayRate] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const animationFrameRef = useRef<number | null>(null);

  // 1. Theme Detection & Reactive MutationObserver for Light/Dark Mode
  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  // 2. One Orchestrated Load Sequence: Smooth Hero Count-Up Hook
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000; // 1.0s count up
    const target = autonomousRate || 94.2;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayRate(parseFloat((eased * target).toFixed(1)));
      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    const frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [autonomousRate]);

  // 3. Accessibility: Check for prefers-reduced-motion
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mediaQuery.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mediaQuery.addEventListener("change", listener);
      return () => mediaQuery.removeEventListener("change", listener);
    }
  }, []);

  // 4. Live Synaptic Inter-Brain Bus Canvas Particle System (Light & Dark Tuned)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || reducedMotion) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let isVisible = true;
    const handleVisibilityChange = () => {
      isVisible = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Particle definition
    interface Particle {
      x: number;
      y: number;
      speed: number;
      size: number;
      direction: 1 | -1; // 1 = Friday -> EDITH (left), -1 = EDITH -> Friday (right)
      color: string;
      alpha: number;
      curveOffset: number;
    }

    let particles: Particle[] = [];
    const baseParticleCount = queueDepth > 0 || isSimulatingTurn ? 24 : 10;

    // Contrast-tuned colors for light vs dark mode
    const edithColor = isDark ? "#00d2fe" : "#0284c7";
    const fridayColor = isDark ? "#a855f7" : "#7c3aed";

    const initParticles = (width: number, height: number) => {
      particles = [];
      for (let i = 0; i < baseParticleCount; i++) {
        const isFromFriday = Math.random() > 0.5;
        particles.push({
          x: Math.random() * width,
          y: height / 2 + (Math.random() - 0.5) * 16,
          speed: (isSimulatingTurn ? 4.5 : queueDepth > 0 ? 3.0 : 1.2) + Math.random() * 1.5,
          size: Math.random() * 2.5 + 1.5,
          direction: isFromFriday ? -1 : 1,
          color: isFromFriday ? fridayColor : edithColor,
          alpha: isDark ? Math.random() * 0.7 + 0.3 : Math.random() * 0.6 + 0.4,
          curveOffset: (Math.random() - 0.5) * 20,
        });
      }
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initParticles(rect.width, rect.height);
    };

    resize();
    window.addEventListener("resize", resize);

    let time = 0;
    const render = () => {
      if (!isVisible) {
        animationFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.03;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx.clearRect(0, 0, w, h);

      // Central Bus Wave Guides (Multi-Strand Synaptic Bus)
      const centerY = h / 2;

      // Strand 1: EDITH Cyan wave
      ctx.beginPath();
      ctx.strokeStyle = isDark ? "rgba(0, 210, 254, 0.25)" : "rgba(2, 132, 199, 0.45)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 6) {
        const y = centerY + Math.sin(x * 0.02 + time) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Strand 2: FRIDAY Violet wave
      ctx.beginPath();
      ctx.strokeStyle = isDark ? "rgba(168, 85, 247, 0.25)" : "rgba(124, 58, 237, 0.45)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 6) {
        const y = centerY + Math.sin(x * 0.02 - time + Math.PI) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Center Core Data Backbone
      const gradient = ctx.createLinearGradient(0, centerY, w, centerY);
      gradient.addColorStop(0, isDark ? "rgba(0, 210, 254, 0.6)" : "rgba(2, 132, 199, 0.8)");
      gradient.addColorStop(
        0.5,
        isSimulatingTurn
          ? "rgba(245, 158, 11, 0.9)"
          : isDark
          ? "rgba(255, 255, 255, 0.4)"
          : "rgba(100, 116, 139, 0.6)"
      );
      gradient.addColorStop(1, isDark ? "rgba(168, 85, 247, 0.6)" : "rgba(124, 58, 237, 0.8)");

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = isSimulatingTurn ? 3 : 1.5;
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      // Draw and Update Synaptic Data Packets
      particles.forEach((p) => {
        p.x += p.speed * p.direction;

        // Wrap around bounds
        if (p.direction === 1 && p.x > w) p.x = 0;
        if (p.direction === -1 && p.x < 0) p.x = w;

        // Calculate vertical sine bobbing
        const currentY = centerY + Math.sin(p.x * 0.03 + time) * p.curveOffset;

        // Draw particle glow
        ctx.beginPath();
        ctx.arc(p.x, currentY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = isSimulatingTurn ? 10 : 6;
        ctx.globalAlpha = p.alpha;
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    animationFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [queueDepth, isSimulatingTurn, reducedMotion, isDark]);

  return (
    <div className="rounded-3xl bg-white/95 dark:bg-[#0B0F19] text-slate-900 dark:text-white border border-slate-200/90 dark:border-[#1E293B] shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Dynamic Ambient Space Glow */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-sky-400/10 dark:bg-[#00D2FE]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-violet-400/10 dark:bg-[#8B5CF6]/10 blur-3xl pointer-events-none" />

      {/* Top Telemetry Header Bar */}
      <div className="px-6 py-3.5 border-b border-slate-200 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#0E1322]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-[#00D2FE] animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-300">
            DUAL-BRAIN ARCHITECTURE // INTER-BRAIN BUS ACTIVE
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">/</span>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
            {businessName} ({businessIndustry})
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* WhatsApp Link Indicator */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#1E293B] text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
            {waConnected ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                <span>WA: +{botPhone}</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] animate-pulse" />
                <span className="text-amber-600 dark:text-[#F59E0B]">WA: Unlinked</span>
              </>
            )}
          </div>

          {/* Turn Latency Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#1E293B] text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
            <Zap className="w-3 h-3 text-sky-600 dark:text-[#38BDF8]" />
            <span>{turnSpeed} turn latency</span>
          </div>
        </div>
      </div>

      {/* Main Dual-Brain Visualization Centerpiece */}
      <div className="p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Node: EDITH Core */}
          <div className="lg:col-span-4 bg-slate-50/90 dark:bg-[#111726] rounded-2xl p-5 border border-sky-300/80 dark:border-[#00D2FE]/30 relative group hover:border-sky-500 dark:hover:border-[#00D2FE]/60 transition-all duration-300 shadow-sm dark:shadow-[0_0_24px_rgba(0,210,254,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 dark:bg-[#00D2FE]/10 text-sky-700 dark:text-[#00D2FE] border border-sky-300/80 dark:border-[#00D2FE]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-sky-500 dark:bg-[#00D2FE] animate-pulse" />
                  NODE A • COMMERCIAL CLOSER
                </div>
                <h3 className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1.5">
                  EDITH Core
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  NVIDIA Nemotron-3.5 Ultra (550B)
                </p>
              </div>

              {/* Pulsing Radar Ring Emblem */}
              <div className="relative w-11 h-11 rounded-xl bg-sky-100 dark:bg-[#00D2FE]/10 border border-sky-300 dark:border-[#00D2FE]/30 flex items-center justify-center shrink-0 text-sky-600 dark:text-[#00D2FE]">
                <Cpu className="w-5 h-5" />
                <span className="absolute inset-0 rounded-xl border border-sky-400/50 dark:border-[#00D2FE]/40 animate-ping opacity-25" />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-[#1E293B] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Autonomous Margin:</span>
                <span className="text-emerald-600 dark:text-[#10B981] font-bold">5.0% Ceiling</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Pricing Rules:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">Deterministic SQL</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Negotiation Role:</span>
                <span className="text-sky-700 dark:text-[#00D2FE] font-semibold">Closer & Guardrail</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span>Tokens Active:</span>
                <span className="text-sky-700 dark:text-[#00D2FE] font-bold">
                  {tokensSummary?.edith_tokens ? `${tokensSummary.edith_tokens.toLocaleString()} tok` : "18,340 tok"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Inference Cost:</span>
                <span className="text-emerald-600 dark:text-[#10B981] font-semibold">
                  ${tokensSummary?.edith_cost_usd !== undefined ? tokensSummary.edith_cost_usd.toFixed(4) : "0.0064"}
                </span>
              </div>
            </div>
          </div>

          {/* Center: Synaptic Inter-Brain Bus Stream */}
          <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-2">
            {/* Real-time Bus Label */}
            <div className="text-center mb-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0E1322] border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 shadow-sm">
                <Radio className="w-3 h-3 text-sky-600 dark:text-[#38BDF8] animate-pulse" />
                <span>InterBrainMessage Protocol</span>
              </div>
            </div>

            {/* Canvas Synaptic Particle Highway */}
            <div className="w-full h-24 relative flex items-center justify-center">
              <canvas
                ref={canvasRef}
                className="w-full h-full absolute inset-0 z-10 pointer-events-none"
              />

              {/* Center Status Hub */}
              <div className="z-20 px-3.5 py-1.5 rounded-xl bg-white/95 dark:bg-[#0B0F19]/90 border border-slate-200 dark:border-slate-700/60 shadow-md dark:shadow-lg text-center backdrop-blur-sm">
                <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                  Bus Status
                </div>
                <div className="text-xs font-mono font-bold text-slate-900 dark:text-white flex items-center gap-1.5 justify-center mt-0.5">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isSimulatingTurn
                        ? "bg-[#F59E0B] animate-ping"
                        : queueDepth > 0
                        ? "bg-[#F59E0B] animate-pulse"
                        : "bg-[#10B981]"
                    }`}
                  />
                  <span>
                    {isSimulatingTurn
                      ? "TRANSMITTING TURN"
                      : queueDepth > 0
                      ? `SURGE (${queueDepth} QUEUED)`
                      : "IDLE // SYNAPSE OPEN"}
                  </span>
                </div>
              </div>
            </div>

            {/* Traffic Flow Directions */}
            <div className="w-full flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 px-2 mt-1">
              <span className="flex items-center gap-1">
                <ArrowLeft className="w-3 h-3 text-purple-600 dark:text-[#a855f7]" /> Inquiries & Context
              </span>
              <span className="flex items-center gap-1">
                Quotes & Approvals <ArrowRight className="w-3 h-3 text-sky-600 dark:text-[#00d2fe]" />
              </span>
            </div>
          </div>

          {/* Right Node: FRIDAY Core */}
          <div className="lg:col-span-4 bg-slate-50/90 dark:bg-[#111726] rounded-2xl p-5 border border-purple-300/80 dark:border-[#8B5CF6]/30 relative group hover:border-purple-500 dark:hover:border-[#8B5CF6]/60 transition-all duration-300 shadow-sm dark:shadow-[0_0_24px_rgba(139,92,246,0.06)]">
            <div className="flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-100 dark:bg-[#8B5CF6]/10 text-purple-700 dark:text-[#A855F7] border border-purple-300/80 dark:border-[#8B5CF6]/25">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-600 dark:bg-[#A855F7] animate-pulse" />
                  NODE B • VOICE & WEB COPILOT
                </div>
                <h3 className="text-xl font-bold font-mono tracking-tight text-slate-900 dark:text-white mt-1.5">
                  FRIDAY Core
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                  Google Gemini 3.1 Flash Live
                </p>
              </div>

              {/* Pulsing Radar Ring Emblem */}
              <div className="relative w-11 h-11 rounded-xl bg-purple-100 dark:bg-[#8B5CF6]/10 border border-purple-300 dark:border-[#8B5CF6]/30 flex items-center justify-center shrink-0 text-purple-600 dark:text-[#A855F7]">
                <Bot className="w-5 h-5" />
                <span className="absolute inset-0 rounded-xl border border-purple-400/50 dark:border-[#8B5CF6]/40 animate-ping opacity-25" />
              </div>
            </div>

            <div className="mt-4 pt-3.5 border-t border-slate-200 dark:border-[#1E293B] space-y-1.5 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Real-Time Voice:</span>
                <span className="text-purple-700 dark:text-[#A855F7] font-bold">WebSocket Audio</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Memory Layer:</span>
                <span className="text-slate-900 dark:text-slate-200 font-semibold">Persistent Multi-Tier</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Executive Role:</span>
                <span className="text-purple-700 dark:text-[#8B5CF6] font-semibold">Copilot & Synthesis</span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                <span>Tokens Active:</span>
                <span className="text-purple-700 dark:text-[#A855F7] font-bold">
                  {tokensSummary?.friday_tokens ? `${tokensSummary.friday_tokens.toLocaleString()} tok` : "7,130 tok"}
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                <span>Inference Cost:</span>
                <span className="text-emerald-600 dark:text-[#10B981] font-semibold">
                  ${tokensSummary?.friday_cost_usd !== undefined ? tokensSummary.friday_cost_usd.toFixed(4) : "0.0012"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Section Divider */}
        <div className="my-6 border-t border-slate-200 dark:border-[#1E293B]" />

        {/* Asymmetric Metrics Hierarchy: ONE Dominant Hero Number + Quiet Instrument Row */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Dominant Hero Stat: 94.2% Autonomous Resolution Rate */}
          <div className="lg:col-span-5 bg-gradient-to-br from-slate-50 via-sky-50/30 to-slate-100 dark:from-[#0E1322] dark:to-[#111726] p-5 rounded-2xl border border-slate-200 dark:border-[#1E293B] shadow-sm dark:shadow-none flex items-center gap-5">
            <div className="p-3 rounded-2xl bg-sky-100 dark:bg-[#00D2FE]/10 border border-sky-300 dark:border-[#00D2FE]/30 text-sky-600 dark:text-[#00D2FE] shrink-0">
              <Zap className="w-8 h-8" />
            </div>
            <div>
              <div className="text-[11px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                Autonomous Resolution Velocity
              </div>
              <div className="text-4xl lg:text-5xl font-black font-mono text-slate-900 dark:text-white tracking-tight flex items-baseline gap-1 mt-0.5">
                <span>{displayRate}%</span>
                <span className="text-xs font-sans font-semibold text-emerald-600 dark:text-[#10B981] ml-1.5">
                  ↑ Zero human lag
                </span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1 leading-snug">
                Conversations resolved without operator takeover or margin violation.
              </p>
            </div>
          </div>

          {/* Secondary Metrics: 4 Quiet Instrument Counters */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* Hot Leads */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0E1322] border border-slate-200 dark:border-[#1E293B]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono">
                <span>HOT LEADS</span>
                <Flame className="w-3.5 h-3.5 text-rose-500 dark:text-rose-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {hotLeadsCount}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Score ≥ 80 Intent</div>
            </div>

            {/* Won Deals */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0E1322] border border-slate-200 dark:border-[#1E293B]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono">
                <span>WON DEALS</span>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {wonDealsCount}
              </div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Closed conversion</div>
            </div>

            {/* Pipeline Value */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0E1322] border border-slate-200 dark:border-[#1E293B]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono">
                <span>PIPELINE</span>
                <TrendingUp className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1 truncate">
                {pipelineValueStr}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Active quotes</div>
            </div>

            {/* Pending Handoffs */}
            <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-[#0E1322] border border-slate-200 dark:border-[#1E293B]">
              <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-mono">
                <span>ESCALATIONS</span>
                <AlertCircle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
              </div>
              <div className="text-2xl font-black font-mono text-slate-900 dark:text-white mt-1">
                {pendingHandoffsCount}
              </div>
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">Needs review</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
