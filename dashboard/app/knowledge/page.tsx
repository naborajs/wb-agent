"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  BookOpen,
  Search,
  Upload,
  FileText,
  CheckCircle2,
  RotateCw,
  Sparkles,
  Bot,
  X,
  Layers,
  Clock,
  ShieldCheck,
  ChevronRight,
} from "lucide-react";

interface KnowledgeDoc {
  id?: string;
  title: string;
  version: number;
  chunk_count?: number;
  chunks?: number;
  source_type?: string;
  type?: string;
  updated_at?: string;
}

interface RetrievalSource {
  chunk_id: string;
  document_id: string;
  document_title: string;
  version: number;
  section_heading?: string;
  content: string;
  similarity_score: number;
}

interface AIQueryResponse {
  query: string;
  answer: string;
  model_used: string;
  confidence_score: number;
  sources: RetrievalSource[];
  executed_at: string;
}

const SAMPLE_QUERIES = [
  "What is the MOQ for Darjeeling tea?",
  "What are the typical delivery timelines?",
  "What volume discounts are available for 500kg?",
  "Do you provide commercial tasting samples?",
  "What quality certifications do you hold?",
];

export default function KnowledgeBasePage() {
  const [query, setQuery] = useState("");
  const [activeQuery, setActiveQuery] = useState<string | null>(null);
  const [aiAnswer, setAiAnswer] = useState<AIQueryResponse | null>(null);
  const [results, setResults] = useState<RetrievalSource[]>([]);
  const [searching, setSearching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNotice, setRefreshNotice] = useState<string | null>(null);
  const [recentQueries, setRecentQueries] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const [docs, setDocs] = useState<KnowledgeDoc[]>([
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
    {
      title: "Wholesale Logistics, Transit Timelines & Delivery Policy",
      version: 1,
      chunk_count: 1,
      source_type: "Markdown",
      updated_at: "2026-09-06",
    },
    {
      title: "Wholesale Pricing Tiers, Packaging & Minimum Order Quantities (MOQs)",
      version: 1,
      chunk_count: 1,
      source_type: "Markdown",
      updated_at: "2026-09-06",
    },
  ]);

  const fetchDocuments = async () => {
    try {
      const res = await fetch("/api/v1/knowledge/documents");
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          setDocs(data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch knowledge documents:", e);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  // Proper Refresh System: Re-indexes enterprise docs, re-syncs state, and clears stale query caches
  const handleRefresh = async () => {
    setRefreshing(true);
    setRefreshNotice(null);
    try {
      const res = await fetch("/api/v1/knowledge/refresh-index", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        if (data.documents && Array.isArray(data.documents)) {
          setDocs(data.documents);
        }
        setRefreshNotice("Index refreshed with active documents.");
      } else {
        await fetchDocuments();
        setRefreshNotice("Documents reloaded.");
      }
      // Reset search results & clear input
      setQuery("");
      setActiveQuery(null);
      setAiAnswer(null);
      setResults([]);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
      setTimeout(() => setRefreshNotice(null), 3500);
    } catch (err) {
      console.error("Refresh failed:", err);
      await fetchDocuments();
    } finally {
      setRefreshing(false);
    }
  };

  // Execute RAG Query & AI Answer Generation
  const handleSearch = async (overrideQuery?: string) => {
    const rawVal = overrideQuery !== undefined ? overrideQuery : (inputRef.current?.value ?? query);
    const targetQ = rawVal.trim();
    if (!targetQ) return;

    setQuery(targetQ);
    setActiveQuery(targetQ);
    setSearching(true);
    setAiAnswer(null);
    setResults([]);

    // Keep unique recent queries
    setRecentQueries((prev) => [targetQ, ...prev.filter((q) => q !== targetQ)].slice(0, 5));

    try {
      // 1. Try modern AI Answer Generation endpoint (/api/v1/knowledge/query)
      const queryRes = await fetch("/api/v1/knowledge/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: targetQ, top_k: 4 }),
      });

      if (queryRes.ok) {
        const queryData: AIQueryResponse = await queryRes.json();
        setAiAnswer(queryData);
        setResults(queryData.sources || []);
      } else {
        // Fallback to direct chunk search (/api/v1/knowledge/search)
        const searchRes = await fetch("/api/v1/knowledge/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: targetQ, top_k: 3 }),
        });
        if (searchRes.ok) {
          const searchData: RetrievalSource[] = await searchRes.json();
          setResults(searchData);
          if (searchData.length > 0) {
            const top = searchData[0];
            setAiAnswer({
              query: targetQ,
              answer: `According to ${top.document_title}: ${top.content.replace(/\n+/g, " ")}`,
              model_used: "Deterministic Vector RAG",
              confidence_score: top.similarity_score,
              sources: searchData,
              executed_at: new Date().toISOString(),
            });
          }
        }
      }
    } catch (e) {
      console.error("Knowledge query error:", e);
    } finally {
      setSearching(false);
    }
  };

  const clearQuery = () => {
    setQuery("");
    setActiveQuery(null);
    setAiAnswer(null);
    setResults([]);
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl ed-brand-avatar flex items-center justify-center p-2 shrink-0">
            <img
              src="/logo-icon.png"
              alt="EDITH RAG"
              className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.35)]"
            />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 mb-1">
              <Sparkles className="w-3 h-3 animate-pulse text-sky-500" />
              <span>Neural Vector RAG & Ground Truth Engine</span>
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
              Knowledge Base & Vector RAG
            </h2>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Deterministic estate knowledge truth: certifications, wholesale MOQs, transit timelines, and live AI question synthesis.
            </p>
          </div>
        </div>

        {/* Global Refresh & Status Actions */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {refreshNotice && (
            <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-medium animate-in fade-in flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{refreshNotice}</span>
            </div>
          )}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="ed-press ed-focus-ring px-3.5 py-2 rounded-xl text-xs font-semibold border border-[var(--ed-border)] bg-[var(--ed-surface)] hover:bg-[var(--ed-bg)] text-[var(--ed-text-primary)] flex items-center gap-2 transition-all shadow-sm cursor-pointer disabled:opacity-50"
            title="Refresh knowledge base index and re-sync documents"
          >
            <RotateCw className={`w-3.5 h-3.5 text-sky-500 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Refreshing Index..." : "Refresh Index"}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Active Documents Table (5 cols) */}
        <div className="lg:col-span-5 ed-panel rounded-2xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-[var(--ed-border)] flex justify-between items-center bg-[var(--ed-bg)]/50">
            <div className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-sky-500" />
              <span className="font-bold text-xs uppercase tracking-wider text-[var(--ed-text-muted)]">
                Active Grounded Documents ({docs.length})
              </span>
            </div>
            <span className="text-[10px] font-medium text-[var(--ed-text-muted)]">100% GI Verified</span>
          </div>

          <div className="divide-y divide-[var(--ed-border)] flex-1 overflow-y-auto max-h-[580px]">
            {docs.map((d, idx) => (
              <div
                key={idx}
                className="p-4 flex flex-col gap-2 hover:bg-[var(--ed-bg)]/60 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div
                    className="p-2 rounded-xl text-[var(--ed-accent)] mt-0.5 shrink-0"
                    style={{ background: "color-mix(in srgb, var(--ed-accent) 10%, transparent)" }}
                  >
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-xs text-[var(--ed-text-primary)] leading-snug break-words">
                      {d.title}
                    </h4>
                    <div className="text-[11px] text-[var(--ed-text-muted)] mt-1 flex items-center gap-2 flex-wrap">
                      <span>Version {d.version}</span>
                      <span>•</span>
                      <span className="font-data">{d.chunk_count || d.chunks || 1} vector chunks</span>
                      <span>•</span>
                      <span className="capitalize">{d.source_type || d.type || "Markdown"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1 text-[11px]">
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Vector Indexed
                  </span>
                  <span className="text-[var(--ed-text-muted)] text-[10px]">
                    {d.updated_at ? `Updated ${d.updated_at.slice(0, 10)}` : "Live"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Column: Semantic Vector Search & Live AI Sourced Answer (7 cols) */}
        <div className="lg:col-span-7 ed-panel rounded-2xl p-5 space-y-5 flex flex-col">
          {/* Tester Header */}
          <div className="flex items-center justify-between">
            <div className="font-bold text-[var(--ed-text-primary)] text-sm flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-500">
                <Search className="w-4 h-4" />
              </div>
              <div>
                <span>Semantic Retrieval & AI Answer Test</span>
                <p className="text-[11px] font-normal text-[var(--ed-text-muted)]">
                  Ask any operational question. Grounded answer and source chunks load live.
                </p>
              </div>
            </div>

            {/* Quick Reset Button */}
            {(activeQuery || results.length > 0 || aiAnswer) && (
              <button
                type="button"
                onClick={clearQuery}
                className="ed-press text-xs text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] px-2.5 py-1 rounded-lg border border-[var(--ed-border)] hover:bg-[var(--ed-bg)] transition-colors flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                <span>Clear</span>
              </button>
            )}
          </div>

          {/* Input Bar with Direct Value Binding */}
          <div className="space-y-2 text-xs">
            <div className="relative flex items-center">
              <input
                ref={inputRef}
                type="text"
                placeholder="e.g. Do you provide free tea samples? Or what are delivery timelines?"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                className="w-full p-3 pl-3.5 pr-20 border border-[var(--ed-border)] rounded-xl text-xs text-[var(--ed-text-primary)] placeholder:text-[var(--ed-text-muted)] ed-focus-ring focus:outline-none shadow-sm transition-all"
                style={{ background: "var(--ed-bg)" }}
              />

              {query && (
                <button
                  type="button"
                  onClick={clearQuery}
                  className="absolute right-12 p-1 text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors cursor-pointer"
                  title="Clear input"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                type="button"
                onClick={() => handleSearch()}
                disabled={searching || (!query.trim() && !inputRef.current?.value?.trim())}
                className="absolute right-2 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-600 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all cursor-pointer"
              >
                {searching ? (
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ChevronRight className="w-3.5 h-3.5" />
                )}
              </button>
            </div>

            {/* Test RAG Query Full Button (matches voice agent clicks) */}
            <button
              id="test-rag-query-btn"
              onClick={() => handleSearch()}
              disabled={searching}
              className="ed-interactive ed-press ed-focus-ring w-full px-6 py-2.5 rounded-xl text-xs font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #0ea5e9 0%, #0284c7 100%)" }}
            >
              {searching ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin" />
                  <span>Searching Vector Space & Synthesizing Answer...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Test RAG Query</span>
                </>
              )}
            </button>
          </div>

          {/* Interactive Sample Questions Pills */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--ed-text-muted)]">
              Quick Test Prompts:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {SAMPLE_QUERIES.map((sq, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setQuery(sq);
                    if (inputRef.current) inputRef.current.value = sq;
                    handleSearch(sq);
                  }}
                  className="ed-press text-[11px] px-2.5 py-1 rounded-lg border border-[var(--ed-border)] bg-[var(--ed-bg)] hover:border-sky-500/50 hover:bg-sky-500/10 text-[var(--ed-text-muted)] hover:text-sky-600 dark:hover:text-sky-400 transition-all cursor-pointer text-left"
                >
                  "{sq}"
                </button>
              ))}
            </div>
          </div>

          {/* Loading Skeleton */}
          {searching && (
            <div className="p-5 rounded-2xl border border-sky-500/30 bg-sky-500/5 space-y-3 animate-pulse">
              <div className="flex items-center gap-2 text-sky-500 text-xs font-semibold">
                <Bot className="w-4 h-4 animate-bounce" />
                <span>EDITH Neural Grounding Engine is processing query...</span>
              </div>
              <div className="h-3.5 bg-sky-500/20 rounded-md w-3/4" />
              <div className="h-3 bg-sky-500/15 rounded-md w-full" />
              <div className="h-3 bg-sky-500/15 rounded-md w-5/6" />
            </div>
          )}

          {/* SOURCED AI ANSWER CARD (Rendered Live on Webpage!) */}
          {!searching && aiAnswer && (
            <div className="rounded-2xl border-2 border-sky-500/40 bg-gradient-to-br from-sky-500/10 via-[var(--ed-surface)] to-[var(--ed-surface)] p-5 space-y-3 shadow-lg animate-in fade-in zoom-in-95 duration-200">
              {/* Card Meta Bar */}
              <div className="flex items-center justify-between gap-2 flex-wrap border-b border-[var(--ed-border)]/70 pb-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-xl bg-sky-500 text-white shadow-sm">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-xs text-[var(--ed-text-primary)]">
                      Grounded AI Answer
                    </h3>
                    <span className="text-[10px] text-[var(--ed-text-muted)]">
                      Question: "{aiAnswer.query}"
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-sky-500/15 text-sky-600 dark:text-sky-400 border border-sky-500/30">
                    {aiAnswer.model_used}
                  </span>
                  {aiAnswer.confidence_score > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-data bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                      Match: {(aiAnswer.confidence_score * 100).toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>

              {/* Sourced Answer Body */}
              <div className="text-xs text-[var(--ed-text-primary)] leading-relaxed font-normal whitespace-pre-line">
                {aiAnswer.answer}
              </div>

              {/* Timestamp footer */}
              <div className="pt-2 flex items-center justify-between text-[10px] text-[var(--ed-text-muted)]">
                <span className="flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  <span>Sourced from verified enterprise documentation</span>
                </span>
                <span>
                  {new Date(aiAnswer.executed_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Sourced Vector Chunks & Citations */}
          {!searching && results.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[var(--ed-text-muted)] uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[var(--ed-accent)]" />
                  <span>Retrieved Knowledge Chunks ({results.length})</span>
                </span>
                <span className="text-[10px] text-[var(--ed-text-muted)]">Cosine Similarity Sorted</span>
              </div>

              <div className="space-y-2.5">
                {results.map((r, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 border border-[var(--ed-border)] rounded-xl text-xs space-y-2 hover:border-sky-500/40 transition-colors"
                    style={{ background: "var(--ed-bg)" }}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <span className="font-semibold text-[var(--ed-text-primary)] block text-xs">
                          {r.document_title}
                        </span>
                        {r.section_heading && (
                          <span className="text-[10px] text-[var(--ed-accent)] font-medium">
                            § {r.section_heading}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-sky-500"
                            style={{
                              width: `${Math.min(100, Math.max(8, r.similarity_score * 100))}%`,
                            }}
                          />
                        </div>
                        <span className="font-bold text-[10px] text-[var(--ed-accent)] font-data">
                          {(r.similarity_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    </div>

                    <div className="text-[var(--ed-text-primary)] leading-relaxed text-[11px] bg-[var(--ed-surface)] p-2.5 rounded-lg border border-[var(--ed-border)]/50 whitespace-pre-line font-mono text-[10.5px]">
                      {r.content}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Empty State when no search executed yet */}
          {!searching && !aiAnswer && results.length === 0 && (
            <div className="h-44 rounded-2xl border border-dashed border-[var(--ed-border)] flex flex-col items-center justify-center text-center p-6 space-y-2 bg-[var(--ed-bg)]/40">
              <Search className="w-6 h-6 text-[var(--ed-text-muted)] opacity-50" />
              <div className="text-xs font-semibold text-[var(--ed-text-primary)]">
                No active RAG query executed yet
              </div>
              <p className="text-[11px] text-[var(--ed-text-muted)] max-w-sm">
                Type a question above, click any of the Quick Test Prompts, or speak to EDITH to test vector retrieval and AI answer synthesis.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
