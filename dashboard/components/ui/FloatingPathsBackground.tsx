"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface FloatingPathsProps {
  position: number;
  count?: number;
}

export function FloatingPaths({ position, count = 36 }: FloatingPathsProps) {
  const paths = useMemo(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
        380 - i * 5 * position
      } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
        152 - i * 5 * position
      } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
        684 - i * 5 * position
      } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
      width: 0.6 + i * 0.035,
      duration: 18 + (i % 8) * 2.5,
    }));
  }, [position, count]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
      <svg
        className="w-full h-full text-slate-900 dark:text-white"
        viewBox="0 0 696 316"
        fill="none"
        preserveAspectRatio="xMidYMid slice"
        style={{
          maskImage:
            "radial-gradient(ellipse 92% 80% at 50% 45%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 92% 80% at 50% 45%, black 45%, rgba(0,0,0,0.5) 75%, transparent 100%)",
        }}
      >
        <title>Dynamic Background Flow Paths</title>
        {paths.map((path) => (
          <motion.path
            key={path.id}
            d={path.d}
            stroke="currentColor"
            strokeWidth={path.width}
            strokeOpacity={0.035 + (path.id / count) * 0.075}
            initial={{ pathLength: 0.35, opacity: 0.4 }}
            animate={{
              pathLength: [0.3, 0.95, 0.3],
              opacity: [0.25, 0.65, 0.25],
              pathOffset: [0, 1, 0],
            }}
            transition={{
              duration: path.duration,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        ))}
      </svg>
    </div>
  );
}

export default function FloatingPathsBackground({
  className = "",
  pathsCount = 36,
}: {
  className?: string;
  pathsCount?: number;
}) {
  return (
    <div
      className={`fixed inset-0 pointer-events-none select-none z-0 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Top subtle fading gradient to ensure top navigation stays crystal clear */}
      <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[var(--ed-bg)] via-[var(--ed-bg)]/80 to-transparent z-10 pointer-events-none" />

      {/* Layer 1: Forward Paths */}
      <FloatingPaths position={1} count={pathsCount} />

      {/* Layer 2: Inverted Counter Paths for Harmonious Depth */}
      <FloatingPaths position={-1} count={pathsCount} />

      {/* Bottom subtle fading gradient */}
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[var(--ed-bg)] via-[var(--ed-bg)]/70 to-transparent z-10 pointer-events-none" />
    </div>
  );
}

export function BackgroundPathsHero({
  title = "Dual Brain Operating System",
  ctaText = "Discover Autonomous Intelligence",
  onCtaClick,
}: {
  title?: string;
  ctaText?: string;
  onCtaClick?: () => void;
}) {
  const words = title.split(" ");

  return (
    <div className="relative min-h-[380px] w-full flex items-center justify-center overflow-hidden rounded-3xl my-4">
      <div className="absolute inset-0">
        <FloatingPaths position={1} count={32} />
        <FloatingPaths position={-1} count={32} />
      </div>

      <div className="relative z-10 container mx-auto px-4 text-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.5 }}
          className="max-w-4xl mx-auto"
        >
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-extrabold mb-6 tracking-tighter font-mono">
            {words.map((word, wordIndex) => (
              <span key={wordIndex} className="inline-block mr-3 last:mr-0">
                {word.split("").map((letter, letterIndex) => (
                  <motion.span
                    key={`${wordIndex}-${letterIndex}`}
                    initial={{ y: 60, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                      delay: wordIndex * 0.08 + letterIndex * 0.02,
                      type: "spring",
                      stiffness: 150,
                      damping: 25,
                    }}
                    className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-neutral-900 to-neutral-700/80 dark:from-white dark:to-white/80"
                  >
                    {letter}
                  </motion.span>
                ))}
              </span>
            ))}
          </h2>

          <div className="inline-block group relative bg-gradient-to-b from-black/10 to-white/10 dark:from-white/10 dark:to-black/10 p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
            <button
              onClick={onCtaClick}
              className="rounded-[1.15rem] px-8 py-4 text-sm sm:text-base font-mono font-semibold backdrop-blur-md bg-white/95 hover:bg-white/100 dark:bg-black/95 dark:hover:bg-black/100 text-black dark:text-white transition-all duration-300 group-hover:-translate-y-0.5 border border-black/10 dark:border-white/10 hover:shadow-md dark:hover:shadow-neutral-800/50 flex items-center gap-2 cursor-pointer"
            >
              <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                {ctaText}
              </span>
              <span className="opacity-70 group-hover:opacity-100 group-hover:translate-x-1.5 transition-all duration-300">
                →
              </span>
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
