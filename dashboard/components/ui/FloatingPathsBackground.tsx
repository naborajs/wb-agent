"use client";

import React, { useMemo } from "react";
import { motion } from "framer-motion";

interface FloatingPathsProps {
  position: number;
  count?: number;
}

function FloatingPaths({ position, count = 36 }: FloatingPathsProps) {
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
            strokeOpacity={0.04 + (path.id / count) * 0.075}
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
