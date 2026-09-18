"use client";

import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface CopyToClipboardProps {
  text: string;
  label?: string;
  className?: string;
}

export const CopyToClipboard: React.FC<CopyToClipboardProps> = ({
  text,
  label,
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-mono transition-colors ${
        copied
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300"
          : "hover:bg-slate-100 text-slate-600 dark:text-slate-400 dark:hover:bg-slate-800"
      } ${className}`}
      title={copied ? "Copied to clipboard!" : `Copy ${label || text}`}
    >
      {copied ? (
        <>
          <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="text-[11px] font-sans font-medium text-emerald-700 dark:text-emerald-300">
            Copied!
          </span>
        </>
      ) : (
        <>
          <Copy className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
          {label && <span className="font-sans text-[11px]">{label}</span>}
        </>
      )}
    </button>
  );
};
