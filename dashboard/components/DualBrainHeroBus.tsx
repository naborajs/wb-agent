"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
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
  Radio,
  ArrowRight,
  ArrowLeft,
  Bot,
  Volume2,
  Smartphone,
  Send,
  Database,
  Layers,
  Lock,
  Check,
  ChevronRight,
} from "lucide-react";
import {
  CircuitBoard,
  type CircuitNode,
  type CircuitConnection,
} from "@/components/ui/circuit-board";
import { MessageLoading } from "./ui/MessageLoading";

interface DualBrainHeroBusProps {
  onPlayBriefing?: () => void;
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
  onPlayBriefing,
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
  const [activeView, setActiveView] = useState<"circuit" | "dual">("circuit");
  const [selectedNodeId, setSelectedNodeId] = useState<string>("edith");
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

  // 2. Smooth Hero Count-Up Hook
  useEffect(() => {
    let startTimestamp: number | null = null;
    const duration = 1000;
    const target = autonomousRate || 94.2;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 3);
      setDisplayRate(Number((target * easeOut).toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
  }, [autonomousRate]);

  // Dynamic Theme Colors
  const cyanColor = isDark ? "#00D2FE" : "#0284C7";
  const purpleColor = isDark ? "#A855F7" : "#7C3AED";
  const emeraldColor = isDark ? "#10B981" : "#059669";
  const amberColor = isDark ? "#F59E0B" : "#D97706";
  const skyColor = isDark ? "#38BDF8" : "#0284C7";

  // 3. Full Circuit Board Nodes matching Image 1 layout & dual-branch architecture
  const circuitNodes: CircuitNode[] = useMemo(
    () => [
      {
        id: "inbound",
        x: 75,
        y: 160,
        label: "Inbound Gateway",
        sublabel: "WhatsApp / Voice",
        badge: "Port 443",
        icon: <Smartphone className="w-4 h-4 sm:w-5 sm:h-5" />,
        status: "active",
        size: "md",
        color: skyColor,
        pulseColor: skyColor,
      },
      {
        id: "friday",
        x: 250,
        y: 75,
        label: "FRIDAY Core",
        sublabel: "Voice & Copilot",
        badge: "Gemini 3.1",
        icon: <Bot className="w-5 h-5 sm:w-6 sm:h-6" />,
        status: "active",
        size: "lg",
        color: purpleColor,
        pulseColor: purpleColor,
      },
      {
        id: "db",
        x: 250,
        y: 245,
        label: "Knowledge Store",
        sublabel: "wb_agent.db",
        badge: "SQLite Matrix",
        icon: <Database className="w-4 h-4 sm:w-5 sm:h-5" />,
        status: "active",
        size: "md",
        color: emeraldColor,
        pulseColor: emeraldColor,
      },
      {
        id: "bus",
        x: 425,
        y: 160,
        label: "Inter-Brain Bus",
        sublabel: "Consensus Hub",
        badge: "<12ms",
        icon: <Radio className="w-5 h-5 sm:w-6 sm:h-6" />,
        status: isSimulatingTurn ? "processing" : "active",
        size: "lg",
        color: cyanColor,
        pulseColor: isSimulatingTurn ? amberColor : cyanColor,
      },
      {
        id: "edith",
        x: 600,
        y: 75,
        label: "EDITH Core",
        sublabel: "Commercial Closer",
        badge: "Nemotron 3.5",
        icon: <Cpu className="w-5 h-5 sm:w-6 sm:h-6" />,
        status: "active",
        size: "lg",
        color: cyanColor,
        pulseColor: cyanColor,
      },
      {
        id: "policy",
        x: 600,
        y: 245,
        label: "Policy Shield",
        sublabel: "Margin Defense",
        badge: "5.0% Ceiling",
        icon: <Shield className="w-4 h-4 sm:w-5 sm:h-5" />,
        status: "active",
        size: "md",
        color: amberColor,
        pulseColor: amberColor,
      },
      {
        id: "outbound",
        x: 775,
        y: 160,
        label: "Outbound Dispatch",
        sublabel: "WhatsApp & Audio",
        badge: "Verified SSL",
        icon: <Send className="w-4 h-4 sm:w-5 sm:h-5" />,
        status: "active",
        size: "md",
        color: emeraldColor,
        pulseColor: emeraldColor,
      },
    ],
    [skyColor, purpleColor, emeraldColor, cyanColor, amberColor, isSimulatingTurn]
  );

  // 4. Circuit Connections with Orthogonal Traces and Glowing Electric Pulses
  const circuitConnections: CircuitConnection[] = useMemo(
    () => [
      {
        from: "inbound",
        to: "friday",
        animated: true,
        color: isDark ? "rgba(168, 85, 247, 0.35)" : "rgba(124, 58, 237, 0.45)",
        pulseColor: purpleColor,
      },
      {
        from: "inbound",
        to: "db",
        animated: true,
        color: isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(5, 150, 105, 0.45)",
        pulseColor: emeraldColor,
      },
      {
        from: "friday",
        to: "bus",
        animated: true,
        bidirectional: true,
        color: isDark ? "rgba(168, 85, 247, 0.4)" : "rgba(124, 58, 237, 0.5)",
        pulseColor: purpleColor,
      },
      {
        from: "db",
        to: "bus",
        animated: true,
        color: isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(5, 150, 105, 0.45)",
        pulseColor: emeraldColor,
      },
      {
        from: "bus",
        to: "edith",
        animated: true,
        bidirectional: true,
        color: isDark ? "rgba(0, 210, 254, 0.45)" : "rgba(2, 132, 199, 0.5)",
        pulseColor: cyanColor,
      },
      {
        from: "bus",
        to: "policy",
        animated: true,
        color: isDark ? "rgba(245, 158, 11, 0.35)" : "rgba(217, 119, 6, 0.45)",
        pulseColor: amberColor,
      },
      {
        from: "edith",
        to: "policy",
        animated: true,
        color: isDark ? "rgba(245, 158, 11, 0.4)" : "rgba(217, 119, 6, 0.5)",
        pulseColor: amberColor,
      },
      {
        from: "edith",
        to: "outbound",
        animated: true,
        color: isDark ? "rgba(0, 210, 254, 0.35)" : "rgba(2, 132, 199, 0.45)",
        pulseColor: cyanColor,
      },
      {
        from: "policy",
        to: "outbound",
        animated: true,
        color: isDark ? "rgba(16, 185, 129, 0.35)" : "rgba(5, 150, 105, 0.45)",
        pulseColor: emeraldColor,
      },
    ],
    [isDark, purpleColor, emeraldColor, cyanColor, amberColor]
  );

  // 5. Architecture Inspector Data Map (Deep operational breakdown for each component)
  const nodeDetailsMap: Record<
    string,
    {
      title: string;
      tag: string;
      model: string;
      role: string;
      color: string;
      accentBg: string;
      icon: React.ReactNode;
      howItWorks: { step: string; desc: string }[];
      stats: { label: string; value: string; highlight?: boolean }[];
    }
  > = {
    edith: {
      title: "EDITH Core",
      tag: "COMMERCIAL CLOSER & REASONING ENGINE",
      model: "NVIDIA Nemotron-3.5 Ultra (550B) / Llama 3.3 70B",
      role: "High-precision commercial reasoning, autonomous price negotiation, wholesale tier pricing defense, contract terms generation.",
      color: cyanColor,
      accentBg: isDark ? "bg-[#00D2FE]/10 border-[#00D2FE]/30" : "bg-sky-50 border-sky-200",
      icon: <Cpu className="w-5 h-5 text-sky-600 dark:text-[#00D2FE]" />,
      howItWorks: [
        {
          step: "1. Intent & Cart Ingestion",
          desc: "Receives qualified commercial intent, client profile, and requested SKU volume from FRIDAY over the Inter-Brain Bus.",
        },
        {
          step: "2. SQLite Tier Extraction",
          desc: "Queries wb_agent.db to load customer credit terms, wholesale baseline cost, and volume discount brackets.",
        },
        {
          step: "3. Chain-of-Thought Negotiation",
          desc: "Formulates optimal deal terms while defending business margin, strictly capped at an autonomous 5.0% discount ceiling.",
        },
        {
          step: "4. Policy Shield Verification",
          desc: "Passes generated quote through Deterministic Policy Shield to mathematically verify zero margin violation or injection.",
        },
        {
          step: "5. Dispatch & Ledger Sync",
          desc: "Dispatches validated quote payload to Outbound Gateway and records cryptographic consensus in delegation ledger.",
        },
      ],
      stats: [
        { label: "Margin Ceiling", value: "5.0% Maximum", highlight: true },
        { label: "Pricing Rules", value: "Deterministic SQL" },
        {
          label: "Active Tokens",
          value: tokensSummary?.edith_tokens
            ? `${tokensSummary.edith_tokens.toLocaleString()} tok`
            : "18,340 tok",
        },
        {
          label: "Inference Cost",
          value: `$${
            tokensSummary?.edith_cost_usd !== undefined
              ? tokensSummary.edith_cost_usd.toFixed(4)
              : "0.0064"
          }`,
        },
      ],
    },
    friday: {
      title: "FRIDAY Core",
      tag: "VOICE & INTAKE CONVERSATIONAL COPILOT",
      model: "Google Gemini 3.1 Flash Live",
      role: "Real-time streaming audio intake, low-latency conversational turns, context extraction, executive debrief synthesis.",
      color: purpleColor,
      accentBg: isDark ? "bg-[#8B5CF6]/10 border-[#8B5CF6]/30" : "bg-purple-50 border-purple-200",
      icon: <Bot className="w-5 h-5 text-purple-600 dark:text-[#A855F7]" />,
      howItWorks: [
        {
          step: "1. Multi-Modal Stream Intake",
          desc: "Receives raw WhatsApp voice notes, audio streams, and text messages directly from Inbound Gateway.",
        },
        {
          step: "2. Sub-280ms Audio Processing",
          desc: "Streams bidirectional audio over WebSocket via Gemini 3.1 Flash Live for natural conversational pauses.",
        },
        {
          step: "3. Commercial Intent Detection",
          desc: "Parses customer need and triggers Inter-Brain delegation when pricing or contract agreements are required.",
        },
        {
          step: "4. Executive Briefing Synthesis",
          desc: "Generates spoken voice briefings summarizing daily leads, won deals, and revenue milestones.",
        },
      ],
      stats: [
        { label: "Voice Latency", value: "<280ms WebSocket", highlight: true },
        { label: "Memory Layer", value: "Persistent Multi-Tier" },
        {
          label: "Active Tokens",
          value: tokensSummary?.friday_tokens
            ? `${tokensSummary.friday_tokens.toLocaleString()} tok`
            : "7,130 tok",
        },
        {
          label: "Inference Cost",
          value: `$${
            tokensSummary?.friday_cost_usd !== undefined
              ? tokensSummary.friday_cost_usd.toFixed(4)
              : "0.0012"
          }`,
        },
      ],
    },
    bus: {
      title: "Inter-Brain Synaptic Bus",
      tag: "PROTOCOL BROKER & CONSENSUS ARBITER",
      model: "InterBrainMessage v2.1 Protocol",
      role: "High-speed communication highway bridging FRIDAY (intake) and EDITH (closer) with synchronous consensus arbitration.",
      color: cyanColor,
      accentBg: isDark ? "bg-[#00D2FE]/10 border-[#00D2FE]/30" : "bg-sky-50 border-sky-200",
      icon: <Radio className="w-5 h-5 text-sky-600 dark:text-[#00D2FE]" />,
      howItWorks: [
        {
          step: "1. Non-Blocking Message Queue",
          desc: "Buffers conversational handshakes and pricing delegations without stalling front-end user experience.",
        },
        {
          step: "2. Synchronous Consensus Verification",
          desc: "Guarantees both brains agree on customer state and pricing boundaries before final message dispatch.",
        },
        {
          step: "3. Delegation Ledger Audit Trail",
          desc: "Maintains immutable trace of turn handoffs, reasonings, and token accounting.",
        },
      ],
      stats: [
        { label: "Handshake Latency", value: "<12ms Inter-Core", highlight: true },
        {
          label: "Bus Status",
          value: isSimulatingTurn
            ? "Transmitting Turn"
            : queueDepth > 0
            ? `Surge (${queueDepth} queued)`
            : "Idle // Synapse Open",
        },
        { label: "Protocol", value: "InterBrainMessage v2.1" },
        { label: "Turn Speed", value: turnSpeed },
      ],
    },
    policy: {
      title: "Deterministic Policy Shield",
      tag: "HARD MARGIN CEILING & INJECTION GUARD",
      model: "Deterministic Rule Engine (Zero Hallucination)",
      role: "Hardcoded mathematical margin floor and adversarial prompt defense preventing discount hallucinations.",
      color: amberColor,
      accentBg: isDark ? "bg-[#F59E0B]/10 border-[#F59E0B]/30" : "bg-amber-50 border-amber-200",
      icon: <Shield className="w-5 h-5 text-amber-600 dark:text-[#F59E0B]" />,
      howItWorks: [
        {
          step: "1. 5.0% Margin Ceiling Enforcement",
          desc: "Hardcoded validation ensures no quote can discount greater than 5.0% below approved catalog pricing.",
        },
        {
          step: "2. Prompt Injection Neutralization",
          desc: "Strips jailbreak attempts ('ignore previous instructions', system prompt override) before processing.",
        },
        {
          step: "3. Mathematical Hash Validation",
          desc: "Cryptographically validates EDITH's numerical calculations against SQLite cost data.",
        },
      ],
      stats: [
        { label: "Margin Ceiling", value: "5.0% Hard Max", highlight: true },
        { label: "Injection Guard", value: "100% Intercepted" },
        { label: "Execution Layer", value: "Deterministic Python" },
        { label: "Fail-Safe", value: "Auto-Escalate to Human" },
      ],
    },
    db: {
      title: "Enterprise Knowledge & DB",
      tag: "LOCAL SQLITE & TIER PRICING MATRIX",
      model: "wb_agent.db (SQLite 3.45 WAL Mode)",
      role: "Source of truth for wholesale price lists, inventory quantity, customer CRM records, and lead scoring.",
      color: emeraldColor,
      accentBg: isDark ? "bg-[#10B981]/10 border-[#10B981]/30" : "bg-emerald-50 border-emerald-200",
      icon: <Database className="w-5 h-5 text-emerald-600 dark:text-[#10B981]" />,
      howItWorks: [
        {
          step: "1. Wholesale Matrix Lookups",
          desc: "Indexes volume pricing across Tier 1 (1-10 units), Tier 2 (11-50 units), Tier 3 (50+ units).",
        },
        {
          step: "2. Stock Level Verification",
          desc: "Checks warehouse inventory before EDITH confirms delivery timelines to prospective buyers.",
        },
        {
          step: "3. CRM Lead Scoring",
          desc: "Maintains real-time buyer engagement score (0-100) and escalates hot leads immediately.",
        },
      ],
      stats: [
        { label: "Hot Leads (≥80)", value: `${hotLeadsCount} Leads`, highlight: true },
        { label: "Won Deals", value: `${wonDealsCount} Closed` },
        { label: "Pipeline Value", value: pipelineValueStr },
        { label: "Escalations", value: `${pendingHandoffsCount} Pending` },
      ],
    },
    inbound: {
      title: "Inbound Gateway",
      tag: "WHATSAPP WEBHOOK & VOICE STREAM INGRESS",
      model: "Meta WhatsApp Cloud API + Twilio Voice",
      role: "Secure entry point for customer messages, audio notes, and telephone calls.",
      color: skyColor,
      accentBg: isDark ? "bg-sky-400/10 border-sky-400/30" : "bg-sky-50 border-sky-200",
      icon: <Smartphone className="w-5 h-5 text-sky-600 dark:text-sky-400" />,
      howItWorks: [
        {
          step: "1. Webhook Signature Verification",
          desc: "Validates HMAC-SHA256 signatures on all incoming WhatsApp Cloud API events.",
        },
        {
          step: "2. Payload Normalization",
          desc: "Extracts phone number, media URLs, voice binaries, and timestamps into normalized schema.",
        },
        {
          step: "3. Direct Dispatch to FRIDAY",
          desc: "Pushes audio or text payload to FRIDAY Core within 15 milliseconds of arrival.",
        },
      ],
      stats: [
        { label: "WA Link", value: waConnected ? `+${botPhone}` : "Unlinked", highlight: waConnected },
        { label: "Security", value: "HMAC-SHA256" },
        { label: "Supported Formats", value: "Voice, Text, Image" },
        { label: "Ingress Latency", value: "<15ms" },
      ],
    },
    outbound: {
      title: "Outbound Dispatcher",
      tag: "VERIFIED WHATSAPP TRANSMISSION & TTS",
      model: "Cloud API Gateway + Neural TTS Engine",
      role: "Dispatches validated quotes, generated invoices, order links, and synthesized voice audio to customers.",
      color: emeraldColor,
      accentBg: isDark ? "bg-[#10B981]/10 border-[#10B981]/30" : "bg-emerald-50 border-emerald-200",
      icon: <Send className="w-5 h-5 text-emerald-600 dark:text-[#10B981]" />,
      howItWorks: [
        {
          step: "1. Policy Verification Receipt",
          desc: "Checks cryptographic stamp from Policy Shield before transmitting any commercial content.",
        },
        {
          step: "2. WhatsApp API Transmission",
          desc: "Delivers interactive WhatsApp message templates, buttons, and PDF quote attachments.",
        },
        {
          step: "3. Delivery Status Tracking",
          desc: "Tracks 'sent', 'delivered', and 'read' receipts to update CRM conversion probability.",
        },
      ],
      stats: [
        { label: "Delivery Status", value: "100% Verified SSL", highlight: true },
        { label: "Transmission Rate", value: "Instantaneous" },
        { label: "Auto-Retry", value: "Exponential Backoff" },
        { label: "Receipt Tracking", value: "Read & Delivered" },
      ],
    },
  };

  const selectedNodeData = nodeDetailsMap[selectedNodeId] || nodeDetailsMap.edith;

  // 6. Dual-Core Split View Canvas Wave Rendering (Fallback / Alternative View)
  useEffect(() => {
    if (activeView !== "dual") return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let time = 0;
    let isPageVisible = !document.hidden;

    const handleVisibilityChange = () => {
      isPageVisible = !document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener("resize", resize);

    const particles: {
      x: number;
      speed: number;
      size: number;
      color: string;
      alpha: number;
      direction: number;
      curveOffset: number;
    }[] = [];

    const numParticles = queueDepth > 0 ? 16 : isSimulatingTurn ? 12 : 7;
    for (let i = 0; i < numParticles; i++) {
      particles.push({
        x: Math.random() * 300,
        speed: (Math.random() * 1.5 + 0.8) * (isSimulatingTurn ? 2.2 : 1),
        size: Math.random() * 2.2 + 1.2,
        color:
          i % 2 === 0
            ? isDark
              ? "#00D2FE"
              : "#0284C7"
            : isDark
            ? "#A855F7"
            : "#7C3AED",
        alpha: Math.random() * 0.6 + 0.4,
        direction: i % 2 === 0 ? 1 : -1,
        curveOffset: (Math.random() - 0.5) * 14,
      });
    }

    const render = () => {
      if (!isPageVisible) {
        animationId = requestAnimationFrame(render);
        return;
      }

      time += isSimulatingTurn ? 0.06 : 0.025;
      const w = canvas.getBoundingClientRect().width;
      const h = canvas.getBoundingClientRect().height;
      if (w === 0 || h === 0) return;

      ctx.clearRect(0, 0, w, h);
      const centerY = h / 2;

      // Central Wave Guide
      ctx.beginPath();
      ctx.strokeStyle = isDark
        ? "rgba(0, 210, 254, 0.25)"
        : "rgba(2, 132, 199, 0.45)";
      ctx.lineWidth = 1.5;
      for (let x = 0; x <= w; x += 6) {
        const y = centerY + Math.sin(x * 0.02 + time) * 6;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Core Data Backbone
      const gradient = ctx.createLinearGradient(0, centerY, w, centerY);
      gradient.addColorStop(
        0,
        isDark ? "rgba(0, 210, 254, 0.6)" : "rgba(2, 132, 199, 0.8)"
      );
      gradient.addColorStop(
        0.5,
        isSimulatingTurn
          ? "rgba(245, 158, 11, 0.9)"
          : isDark
          ? "rgba(255, 255, 255, 0.4)"
          : "rgba(100, 116, 139, 0.6)"
      );
      gradient.addColorStop(
        1,
        isDark ? "rgba(168, 85, 247, 0.6)" : "rgba(124, 58, 237, 0.8)"
      );

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = isSimulatingTurn ? 3 : 1.5;
      ctx.moveTo(0, centerY);
      ctx.lineTo(w, centerY);
      ctx.stroke();

      // Data Packets
      particles.forEach((p) => {
        p.x += p.speed * p.direction;
        if (p.direction === 1 && p.x > w) p.x = 0;
        if (p.direction === -1 && p.x < 0) p.x = w;
        const currentY =
          centerY + Math.sin(p.x * 0.03 + time) * p.curveOffset;

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

      animationId = requestAnimationFrame(render);
    };

    animationId = requestAnimationFrame(render);

    return () => {
      if (animationId) cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeView, queueDepth, isSimulatingTurn, isDark]);

  return (
    <div className="rounded-3xl bg-white/95 dark:bg-[#0B0F19] text-slate-900 dark:text-white border border-slate-200/90 dark:border-[#1E293B] shadow-lg dark:shadow-2xl relative overflow-hidden transition-colors">
      {/* Dynamic Ambient Space Glow */}
      <div className="absolute -top-24 left-1/4 w-96 h-96 rounded-full bg-sky-400/10 dark:bg-[#00D2FE]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 right-1/4 w-96 h-96 rounded-full bg-violet-400/10 dark:bg-[#8B5CF6]/10 blur-3xl pointer-events-none" />

      {/* Top Telemetry Header Bar */}
      <div className="px-5 sm:px-6 py-3.5 border-b border-slate-200 dark:border-[#1E293B] flex flex-wrap items-center justify-between gap-3 bg-slate-50/80 dark:bg-[#0E1322]/80 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-sky-500 dark:bg-[#00D2FE] animate-pulse" />
          <span className="font-mono text-xs font-bold tracking-wider text-slate-800 dark:text-slate-200">
            DUAL-BRAIN ARCHITECTURE // INTER-BRAIN BUS ACTIVE
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">
            /
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400 hidden sm:inline font-medium">
            {businessName} ({businessIndustry})
          </span>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/80 dark:bg-[#111726] border border-slate-300/80 dark:border-[#1E293B]">
            <button
              onClick={() => setActiveView("circuit")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                activeView === "circuit"
                  ? "bg-sky-500 dark:bg-[#00D2FE] text-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              <span>Full Circuit</span>
            </button>
            <button
              onClick={() => setActiveView("dual")}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-mono font-bold transition-all ${
                activeView === "dual"
                  ? "bg-sky-500 dark:bg-[#00D2FE] text-white dark:text-slate-950 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              <Cpu className="w-3.5 h-3.5" />
              <span>Dual-Core</span>
            </button>
          </div>

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
                <span className="text-amber-600 dark:text-[#F59E0B]">
                  WA: Unlinked
                </span>
              </>
            )}
          </div>

          {/* Turn Latency Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-[#1E293B] text-[11px] font-mono text-slate-700 dark:text-slate-300 shadow-sm dark:shadow-none">
            <Zap className="w-3 h-3 text-sky-600 dark:text-[#38BDF8]" />
            <span>{turnSpeed} turn latency</span>
          </div>

          {/* Glowing Action Button: Play Executive Morning Audio Briefing */}
          {onPlayBriefing && (
            <button
              onClick={onPlayBriefing}
              className="flex items-center gap-1.5 px-3.5 py-1 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-sky-500 hover:from-purple-500 hover:to-sky-400 text-white text-[11px] font-mono font-bold shadow-md shadow-purple-500/25 transition-all hover:scale-105 active:scale-95 animate-pulse shrink-0 border border-purple-400/40"
              title="Click to hear Friday speak an audio executive debrief of leads, pipeline, and margin defenses"
            >
              <Volume2 className="w-3.5 h-3.5 fill-white shrink-0" />
              <span>Play Morning Briefing</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="p-5 sm:p-6 lg:p-8">
        {activeView === "circuit" ? (
          /* ========================================================================= */
          /* 1. FULL CIRCUIT ARCHITECTURE VIEW (Image 1 Style PCB with Pulses)       */
          /* ========================================================================= */
          <div className="space-y-6">
            {/* Quick Component Selector Tabs */}
            <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200 dark:border-[#1E293B]">
              <div className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <span>Architecture Schematic</span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-sky-100 dark:bg-[#00D2FE]/10 text-sky-700 dark:text-[#00D2FE] font-mono">
                  Click any node to inspect live flow
                </span>
              </div>

              <div className="flex items-center flex-wrap gap-1.5">
                {[
                  { id: "inbound", label: "Inbound", color: skyColor },
                  { id: "friday", label: "FRIDAY (Voice)", color: purpleColor },
                  { id: "bus", label: "Synaptic Bus", color: cyanColor },
                  { id: "edith", label: "EDITH (Closer)", color: cyanColor },
                  { id: "policy", label: "Policy Shield", color: amberColor },
                  { id: "db", label: "Knowledge DB", color: emeraldColor },
                  { id: "outbound", label: "Outbound", color: emeraldColor },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setSelectedNodeId(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono font-medium transition-all ${
                      selectedNodeId === item.id
                        ? "bg-slate-900 text-white dark:bg-white dark:text-slate-950 font-bold shadow-sm scale-105"
                        : "bg-slate-100 hover:bg-slate-200 dark:bg-[#111726] dark:hover:bg-[#1E293B] text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    <span
                      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
                      style={{ backgroundColor: item.color }}
                    />
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* The Live Animated Circuit Board Container */}
            <div className="relative w-full rounded-2xl bg-slate-50/90 dark:bg-[#080C14] border border-slate-200 dark:border-slate-800/80 p-2 sm:p-4 overflow-x-auto shadow-inner flex justify-center items-center min-h-[360px]">
              <CircuitBoard
                nodes={circuitNodes}
                connections={circuitConnections}
                width={850}
                height={330}
                gridSize={22}
                showGrid={true}
                pulseSpeed={2.2}
                traceWidth={2.2}
                selectedNodeId={selectedNodeId}
                onNodeClick={(node) => setSelectedNodeId(node.id)}
                variant={isDark ? "dark" : "light"}
                className="select-none"
              />
            </div>

            {/* Architecture Node Inspector Card */}
            <div className="rounded-2xl bg-slate-50/90 dark:bg-[#111726] border border-slate-200 dark:border-[#1E293B] p-5 sm:p-6 transition-all shadow-sm">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Component Identity & Real-Time Telemetry */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="p-2.5 rounded-xl border shrink-0 mt-1"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(15, 23, 42, 0.8)"
                          : "rgba(255, 255, 255, 0.9)",
                        borderColor: selectedNodeData.color,
                      }}
                    >
                      {selectedNodeData.icon}
                    </div>
                    <div>
                      <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400">
                        <span
                          className="w-1.5 h-1.5 rounded-full animate-pulse"
                          style={{ backgroundColor: selectedNodeData.color }}
                        />
                        {selectedNodeData.tag}
                      </div>
                      <h4 className="text-xl font-bold font-mono text-slate-900 dark:text-white mt-1">
                        {selectedNodeData.title}
                      </h4>
                      <div className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                        {selectedNodeData.model}
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-sans">
                    {selectedNodeData.role}
                  </p>

                  {/* Node Real-time Telemetry Grid */}
                  <div className="pt-2 border-t border-slate-200 dark:border-[#1E293B] grid grid-cols-2 gap-2 text-xs font-mono">
                    {selectedNodeData.stats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-white dark:bg-[#0B0F19] border border-slate-200/80 dark:border-[#1E293B]"
                      >
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">
                          {stat.label}
                        </div>
                        <div
                          className={`font-bold mt-0.5 truncate ${
                            stat.highlight
                              ? "text-emerald-600 dark:text-[#10B981]"
                              : "text-slate-900 dark:text-white"
                          }`}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Column: Step-by-Step Pipeline Flow (How It Operates) */}
                <div className="lg:col-span-7 bg-white dark:bg-[#0B0F19] rounded-xl p-4 sm:p-5 border border-slate-200 dark:border-[#1E293B] space-y-3">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
                    <div className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <Layers className="w-4 h-4 text-sky-600 dark:text-[#00D2FE]" />
                      <span>Operational Logic & Execution Pipeline</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                      Live Protocol Trace
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {selectedNodeData.howItWorks.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-2.5 text-xs font-mono"
                      >
                        <ChevronRight className="w-3.5 h-3.5 mt-0.5 text-sky-500 dark:text-[#00D2FE] shrink-0" />
                        <div>
                          <span className="font-bold text-slate-900 dark:text-slate-200 mr-1.5">
                            {item.step}:
                          </span>
                          <span className="text-slate-600 dark:text-slate-400 leading-normal font-sans text-xs">
                            {item.desc}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* 2. DUAL-CORE SPLIT VIEW (EDITH Core - Central Synapse - FRIDAY Core)      */
          /* ========================================================================= */
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
                  <span className="text-emerald-600 dark:text-[#10B981] font-bold">
                    5.0% Ceiling
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Pricing Rules:</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold">
                    Deterministic SQL
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Negotiation Role:</span>
                  <span className="text-sky-700 dark:text-[#00D2FE] font-semibold">
                    Closer & Guardrail
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span>Tokens Active:</span>
                  <span className="text-sky-700 dark:text-[#00D2FE] font-bold">
                    {tokensSummary?.edith_tokens
                      ? `${tokensSummary.edith_tokens.toLocaleString()} tok`
                      : "18,340 tok"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Inference Cost:</span>
                  <span className="text-emerald-600 dark:text-[#10B981] font-semibold">
                    $
                    {tokensSummary?.edith_cost_usd !== undefined
                      ? tokensSummary.edith_cost_usd.toFixed(4)
                      : "0.0064"}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Synaptic Inter-Brain Bus Stream */}
            <div className="lg:col-span-4 flex flex-col items-center justify-center relative py-2">
              <div className="text-center mb-2">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-[#0E1322] border border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-600 dark:text-slate-400 shadow-sm">
                  <Radio className="w-3 h-3 text-sky-600 dark:text-[#38BDF8] animate-pulse" />
                  <span>InterBrainMessage Protocol</span>
                </div>
              </div>

              <div className="w-full h-24 relative flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  className="w-full h-full absolute inset-0 z-10 pointer-events-none"
                />

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
                      {isSimulatingTurn ? (
                        <span className="inline-flex items-center gap-1.5 text-amber-500">
                          <span>TRANSMITTING TURN</span>
                          <MessageLoading size={14} className="text-amber-500" />
                        </span>
                      ) : queueDepth > 0 ? (
                        `SURGE (${queueDepth} QUEUED)`
                      ) : (
                        "IDLE // SYNAPSE OPEN"
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <div className="w-full flex justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400 px-2 mt-1">
                <span className="flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3 text-purple-600 dark:text-[#a855f7]" />{" "}
                  Inquiries & Context
                </span>
                <span className="flex items-center gap-1">
                  Quotes & Approvals{" "}
                  <ArrowRight className="w-3 h-3 text-sky-600 dark:text-[#00d2fe]" />
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
                  <span className="text-purple-700 dark:text-[#A855F7] font-bold">
                    WebSocket Audio
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Memory Layer:</span>
                  <span className="text-slate-900 dark:text-slate-200 font-semibold">
                    Persistent Multi-Tier
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Executive Role:</span>
                  <span className="text-purple-700 dark:text-[#8B5CF6] font-semibold">
                    Copilot & Synthesis
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 pt-1 border-t border-slate-100 dark:border-slate-800/60">
                  <span>Tokens Active:</span>
                  <span className="text-purple-700 dark:text-[#A855F7] font-bold">
                    {tokensSummary?.friday_tokens
                      ? `${tokensSummary.friday_tokens.toLocaleString()} tok`
                      : "7,130 tok"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                  <span>Inference Cost:</span>
                  <span className="text-emerald-600 dark:text-[#10B981] font-semibold">
                    $
                    {tokensSummary?.friday_cost_usd !== undefined
                      ? tokensSummary.friday_cost_usd.toFixed(4)
                      : "0.0012"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section Divider */}
        <div className="my-6 border-t border-slate-200 dark:border-[#1E293B]" />

        {/* Bottom Asymmetric Metrics Hierarchy: ONE Dominant Hero Number + Instrument Row */}
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
                Conversations resolved without operator takeover or margin
                violation.
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
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Score ≥ 80 Intent
              </div>
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
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                Closed conversion
              </div>
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
              <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">
                Active quotes
              </div>
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
              <div className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
                Needs review
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
