"use client";

import React, { useState } from "react";
import { BookOpen, Search, Upload, FileText, CheckCircle2 } from "lucide-react";

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const [docs, setDocs] = useState<any[]>([
    {
      title: "North Bengal Tea Co. Quality Standards & Certifications",
      version: 1,
      chunk_count: 1,
      source_type: "Markdown",
      updated_at: "2026-09-02",
    },
    {
      title: "Commercial Sampling Policy for Hospitality Buyers",
      version: 1,
      chunk_count: 1,
      source_type: "Markdown",
      updated_at: "2026-09-02",
    },
  ]);

  React.useEffect(() => {
    fetch("/api/v1/knowledge/documents")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data && Array.isArray(data) && data.length > 0) {
          setDocs(data);
        }
      })
      .catch(() => {});
  }, []);

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
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl ed-brand-avatar flex items-center justify-center p-2 shrink-0">
          <img
            src="/logo-icon.png"
            alt="EDITH RAG"
            className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]"
          />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 mb-1">
            <span>✨</span>
            <span>Neural RAG Grounding Engine</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">Knowledge Base & Vector RAG</h2>
          <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
            Deterministic tea domain truth: parsed company documentation, certifications, and high-dimensional semantic embeddings.
          </p>
        </div>
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
              <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[var(--ed-bg)] transition-colors">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div
                    className="p-2 rounded-lg text-[var(--ed-accent)] mt-0.5 shrink-0"
                    style={{ background: "color-mix(in srgb, var(--ed-accent) 8%, transparent)" }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-xs text-[var(--ed-text-primary)] break-words">{d.title}</h4>
                    <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
                      Version <span className="font-data">{d.version}</span> • <span className="font-data">{d.chunk_count || d.chunks || 1}</span> vector chunks • {d.source_type || d.type || "Markdown"}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--ed-success)] shrink-0 self-start sm:self-auto">
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
