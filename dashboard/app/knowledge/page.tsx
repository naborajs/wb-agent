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
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">Knowledge Base & Vector RAG</h2>
        <p className="text-sm text-[var(--ed-text-muted)] mt-1">
          Grounding truth architecture: parsed company documentation, FAQs, and semantic vector embeddings.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document Ingestion Table */}
        <div className="lg:col-span-2 ed-panel rounded-xl overflow-hidden">
          <div className="p-4 border-b border-[var(--ed-border)] flex justify-between items-center">
            <span className="font-bold text-xs uppercase tracking-wider text-[var(--ed-text-muted)]">
              Active Documents
            </span>
          </div>

          <div className="divide-y divide-[var(--ed-border)]">
            {docs.map((d, idx) => (
              <div key={idx} className="p-4 flex items-center justify-between hover:bg-[var(--ed-bg)] transition-colors">
                <div className="flex items-start gap-3">
                  <div
                    className="p-2 rounded-lg text-[var(--ed-accent)] mt-0.5"
                    style={{ background: "color-mix(in srgb, var(--ed-accent) 8%, transparent)" }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-xs text-[var(--ed-text-primary)]">{d.title}</h4>
                    <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
                      Version <span className="font-data">{d.version}</span> • <span className="font-data">{d.chunks}</span> vector chunks • {d.type}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ed-success)]">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Indexed
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Semantic Vector Search Tester */}
        <div className="p-5 ed-panel rounded-xl space-y-4">
          <div className="font-bold text-[var(--ed-text-primary)] text-sm flex items-center gap-2">
            <Search className="w-4 h-4 text-[var(--ed-accent)]" />
            Semantic Retrieval Test
          </div>

          <div className="space-y-2 text-xs">
            <input
              type="text"
              placeholder="e.g. Do you provide free tea samples?"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="w-full p-2.5 border border-[var(--ed-border)] rounded-lg text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] ed-focus-ring focus:outline-none"
              style={{ background: "var(--ed-bg)" }}
            />
            <button
              onClick={handleSearch}
              className="ed-interactive ed-press ed-focus-ring w-full px-6 py-3 rounded-xl text-sm font-semibold text-white shadow-sm transition-colors flex items-center justify-center"
              style={{ background: "var(--ed-accent)", minHeight: "44px" }}
            >
              {searching ? "Searching Vector Space..." : "Test RAG Query"}
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {results.map((r, idx) => (
              <div
                key={idx}
                className="p-3 border border-[var(--ed-border)] rounded-lg text-xs space-y-1"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex justify-between items-center text-[10px] text-[var(--ed-text-muted)] font-medium">
                  <span>{r.document_title}</span>
                  <span className="font-bold text-[var(--ed-accent)] font-data">Score: {r.similarity_score}</span>
                </div>
                <div className="text-[var(--ed-text-primary)] leading-relaxed">{r.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
