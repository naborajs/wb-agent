"use client";

import React, { useState } from "react";
import { Download } from "lucide-react";
import MessageLoading from "./ui/MessageLoading";

interface ExportCsvButtonProps {
  endpoint: string;
  filename?: string;
  label?: string;
  className?: string;
}

export const ExportCsvButton: React.FC<ExportCsvButtonProps> = ({
  endpoint,
  filename = "export.csv",
  label = "Export CSV",
  className = "",
}) => {
  const [loading, setLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setLoading(true);
      const res = await fetch(endpoint);
      if (!res.ok) throw new Error("Failed to export data");

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export download failed:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={loading}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50 ${className}`}
      title="Download CSV export"
    >
      {loading ? (
        <MessageLoading className="w-3.5 h-3.5 text-slate-400" />
      ) : (
        <Download className="w-3.5 h-3.5 text-slate-500" />
      )}
      <span>{label}</span>
    </button>
  );
};
