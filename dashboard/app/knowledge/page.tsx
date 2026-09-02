"use client";

import React, { useState } from "react";
import { BookOpen, Search, Upload, FileText, CheckCircle2 } from "lucide-react";

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const docs = [
    {
      title: "North Bengal Tea Co. Quality Standards & Certifications",
      version: 2,
      chunks: 8,
      type: "Markdown",
      updated: "2026-09-02",
    },
    {
      title: "Wholesale Shipping, Door Delivery & Transit Times",
      version: 1,
      chunks: 5,
      type: "Markdown",
      updated: "2026-09-01",
    },
    {
      title: "Commercial Sampling Policy for Hospitality Buyers",
      version: 1,
      chunks: 4,
      type: "JSON FAQ",
      updated: "2026-08-30",
    },
  ];

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const res = await fetch("/api/v1/knowledge/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim(), top_k: 3 }),
      });
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Knowledge Base & Vector RAG</h2>
        <p className="text-sm text-slate-500 mt-1">
          Grounding truth architecture: parsed company documentation, FAQs, and semantic vector embeddings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Ingestion Table */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex justify-between items-center">
            <span className="font-bold text-xs uppercase tracking-wider text-slate-400">
              Active Documents
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {docs.map((d, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-slate-50">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-50 text-amber-800 mt-0.5">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-slate-900">{d.title}</h4>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Version {d.version} • {d.chunks} vector chunks • {d.type}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic Vector Search Tester */}
        <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-amber-700" />
            Semantic Retrieval Test
          </div>

          <div className="space-y-2 text-xs">
            <input
              type="text"
              placeholder="e.g. Do you provide free tea samples?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none"
            />
            <button
              onClick={handleSearch}
              className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors"
            >
              {searching ? "Searching Vector Space..." : "Test RAG Query"}
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {results.map((r, idx) => (
              <div key={idx} className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg text-xs space-y-1">
                <div className="flex justify-between items-center text-[10px] text-slate-400 font-medium">
                  <span>{r.document_title}</span>
                  <span className="font-bold text-amber-700">Score: {r.similarity_score}</span>
                </div>
                <div className="text-slate-800 leading-relaxed">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
