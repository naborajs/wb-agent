"use client";

import React, { useEffect, useRef, useCallback } from "react";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  baseAlpha: number;
  alpha: number;
  color: string;
  phase: number;
}

interface LiquidNebulaCanvasProps {
  className?: string;
  interactive?: boolean;
}

export default function LiquidNebulaCanvas({
  className = "",
  interactive = true,
}: LiquidNebulaCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, targetX: -1000, targetY: -1000 });
  const isVisibleRef = useRef(true);

  const initCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let width = (canvas.width = canvas.parentElement?.clientWidth || window.innerWidth);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 600);

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const colors = [
      "rgba(56, 189, 248, ",   // sky / cyan
      "rgba(168, 85, 247, ",   // violet / purple
      "rgba(16, 185, 129, ",   // emerald
      "rgba(245, 158, 11, ",   // warm amber
    ];

    // Initialize ambient micro-particles
    const particleCount = Math.min(Math.floor((width * height) / 18000), 55);
    const particles: Particle[] = [];

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.2 - Math.random() * 0.4,
        size: 1 + Math.random() * 2.2,
        baseAlpha: 0.15 + Math.random() * 0.35,
        alpha: 0.15 + Math.random() * 0.35,
        color: colors[Math.floor(Math.random() * colors.length)],
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;

    const render = () => {
      if (!isVisibleRef.current) {
        animFrameRef.current = requestAnimationFrame(render);
        return;
      }

      time += 0.007;
      ctx.clearRect(0, 0, width, height);

      // Smooth mouse follow
      mouseRef.current.x += (mouseRef.current.targetX - mouseRef.current.x) * 0.06;
      mouseRef.current.y += (mouseRef.current.targetY - mouseRef.current.y) * 0.06;

      // 1. Draw Liquid Wave Bands (Frosted Ethereal Streams)
      const waves = [
        { yOffset: height * 0.32, amplitude: 35, frequency: 0.0022, speed: 0.015, color: "rgba(56, 189, 248, 0.06)" },
        { yOffset: height * 0.52, amplitude: 45, frequency: 0.0018, speed: -0.012, color: "rgba(168, 85, 247, 0.05)" },
        { yOffset: height * 0.72, amplitude: 30, frequency: 0.0026, speed: 0.018, color: "rgba(16, 185, 129, 0.04)" },
      ];

      waves.forEach((wave) => {
        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 12) {
          const dx = x - mouseRef.current.x;
          const dy = wave.yOffset - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const mouseDisplace = dist < 220 ? Math.sin((dist / 220) * Math.PI) * -18 : 0;

          const y =
            wave.yOffset +
            Math.sin(x * wave.frequency + time * wave.speed * 60) * wave.amplitude +
            Math.cos(x * 0.001 + time * 0.8) * 12 +
            mouseDisplace;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = wave.color;
        ctx.fill();
      });

      // 2. Interactive Cursor Radial Glow Aura
      if (mouseRef.current.x > 0 && mouseRef.current.x < width) {
        const mouseGlow = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          260
        );
        mouseGlow.addColorStop(0, "rgba(56, 189, 248, 0.09)");
        mouseGlow.addColorStop(0.5, "rgba(168, 85, 247, 0.04)");
        mouseGlow.addColorStop(1, "transparent");
        ctx.fillStyle = mouseGlow;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Render Floating Luminescent Particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        p.phase += 0.02;

        // Wrap around bounds
        if (p.y < -10) {
          p.y = height + 10;
          p.x = Math.random() * width;
        }
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;

        // Mouse gentle repel
        const dx = p.x - mouseRef.current.x;
        const dy = p.y - mouseRef.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 140) {
          const force = (1 - dist / 140) * 0.8;
          p.x += (dx / dist) * force * 3;
          p.y += (dy / dist) * force * 3;
        }

        const alpha = p.baseAlpha + Math.sin(p.phase) * 0.15;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `${p.color}${Math.max(0.05, Math.min(0.85, alpha))})`;
        ctx.shadowColor = `${p.color}0.8)`;
        ctx.shadowBlur = p.size * 3.5;
        ctx.fill();
        ctx.shadowBlur = 0;
      });

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    const handleResize = () => {
      width = canvas.parentElement?.clientWidth || window.innerWidth;
      height = canvas.parentElement?.clientHeight || 600;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    const cleanup = initCanvas();

    // IntersectionObserver for CPU efficiency
    const observer = new IntersectionObserver(([entry]) => {
      isVisibleRef.current = entry.isIntersecting;
    });

    if (canvasRef.current) {
      observer.observe(canvasRef.current);
    }

    const handleVisibility = () => {
      isVisibleRef.current = document.visibilityState === "visible";
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
      if (cleanup) cleanup();
    };
  }, [initCanvas]);

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!interactive || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    mouseRef.current.targetX = e.clientX - rect.left;
    mouseRef.current.targetY = e.clientY - rect.top;
  };

  const handleMouseLeave = () => {
    mouseRef.current.targetX = -1000;
    mouseRef.current.targetY = -1000;
  };

  return (
    <canvas
      ref={canvasRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`absolute inset-0 w-full h-full pointer-events-auto select-none ${className}`}
      aria-hidden="true"
    />
  );
}
