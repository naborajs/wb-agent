"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  Radio,
  Pause,
  Play,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Bot,
  Cpu,
  ChevronRight,
  Info,
  X,
} from "lucide-react";

export interface SynapticEvent {
  id: string;
  sender_brain: "EDITH" | "FRIDAY";
  recipient_brain?: string;
  message_type: string;
  content: string;
  decision?: string;
  reasoning?: string;
  created_at: string;
  metadata?: any;
}

const DEFAULT_EVENTS: SynapticEvent[] = [
  {
    id: "evt-1",
    sender_brain: "EDITH",
    message_type: "POLICY_REFUSAL",
    content: "EDITH held 15% margin boundary: Denied 35% discount for lead +91 9800123456",
    decision: "DENIED",
    reasoning: "Requested discount exceeds 15.0% autonomous ceiling. Proposing Tier 2 volume discount with 100-unit MOQ.",
    created_at: new Date(Date.now() - 35000).toLocaleTimeString(),
  },
  {
    id: "evt-2",
    sender_brain: "FRIDAY",
    message_type: "DOM_ACTION",
    content: "FRIDAY voice query: Executed DOM inspection on Knowledge Hub (185ms)",
    decision: "ACCEPTED",
    reasoning: "Operator screen grounded; verified 8 knowledge asset nodes and pricing tiers.",
    created_at: new Date(Date.now() - 95000).toLocaleTimeString(),
  },
  {
    id: "evt-3",
    sender_brain: "EDITH",
    message_type: "OUTBOUND_QUOTE",
    content: "EDITH outbound: Qualified bulk Darjeeling buyer, quote sent via WhatsApp",
    decision: "ACCEPTED",
    reasoning: "Buyer qualified for Tier 2 wholesale pricing at ₹1,850/kg with 50kg MOQ commitment.",
    created_at: new Date(Date.now() - 175000).toLocaleTimeString(),
  },
  {
    id: "evt-4",
    sender_brain: "EDITH",
    message_type: "AUTONOMOUS_FALLBACK",
    content: "EDITH fallback: Dispatched direct system alert to operator after Friday focus-protection refusal",
    decision: "FALLBACK_RESOLVED",
    reasoning: "Direct agent notification queued in Notification Center.",
    created_at: new Date(Date.now() - 240000).toLocaleTimeString(),
  },
  {
    id: "evt-5",
    sender_brain: "FRIDAY",
    message_type: "BRIEFING_DELIVERY",
    content: "FRIDAY synthesized executive morning audio briefing for operator (1.1s turn latency)",
    decision: "SYNCHRONIZED",
    reasoning: "Real-time pipeline metrics and margin defense stats prepared for audio synthesis.",
    created_at: new Date(Date.now() - 320000).toLocaleTimeString(),
  },
];

export default function SynapticActivityTicker() {
  const [events, setEvents] = useState<SynapticEvent[]>(DEFAULT_EVENTS);
  const [filter, setFilter] = useState<"ALL" | "EDITH" | "FRIDAY">("ALL");
  const [isPaused, setIsPaused] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SynapticEvent | null>(null);
  const tickerRef = useRef<HTMLDivElement | null>(null);

  // Load live dialogue logs from backend
  useEffect(() => {
    const fetchDialogues = async () => {
      try {
        const res = await fetch("/api/v1/brain/dialogues?limit=15");
        if (res.ok) {
          const data = await res.json();
          if (data?.dialogues && data.dialogues.length > 0) {
            const mapped: SynapticEvent[] = data.dialogues.map((d: any) => ({
              id: d.id,
              sender_brain: d.sender_brain,
              recipient_brain: d.recipient_brain,
              message_type: d.message_type,
              content: d.content,
              decision: d.decision,
              reasoning: d.reasoning,
              created_at: d.created_at
                ? new Date(d.created_at).toLocaleTimeString()
                : new Date().toLocaleTimeString(),
              metadata: d.metadata_payload,
            }));
            // Combine with default events if few dialogues exist
            setEvents((prev) => {
              const ids = new Set(mapped.map((m) => m.id));
              const combined = [...mapped, ...prev.filter((p) => !ids.has(p.id))];
              return combined.slice(0, 20);
            });
          }
        }
      } catch {
        // use defaults
      }
    };

    fetchDialogues();

    // WebSocket listener for live synaptic broadcasts
    if (typeof window !== "undefined") {
      const handleWsMessage = (e: any) => {
        try {
          const data = JSON.parse(e.data);
          if (data.type === "inter_brain_message" && data.payload) {
            const p = data.payload;
            const newEvt: SynapticEvent = {
              id: p.id || Math.random().toString(),
              sender_brain: p.sender_brain || "EDITH",
              recipient_brain: p.recipient_brain,
              message_type: p.message_type || "SYNAPSE",
              content: p.content || "Autonomous synaptic coordination event",
              decision: p.decision,
              reasoning: p.reasoning,
              created_at: p.created_at
                ? new Date(p.created_at).toLocaleTimeString()
                : new Date().toLocaleTimeString(),
              metadata: p.metadata,
            };
            setEvents((prev) => [newEvt, ...prev.slice(0, 19)]);
          }
        } catch {
          // ignore non-json
        }
      };

      // Listen on window for custom event or ws manager
      window.addEventListener("message", handleWsMessage);
      return () => window.removeEventListener("message", handleWsMessage);
    }
  }, []);

  const filteredEvents = events.filter((e) => {
    if (filter === "ALL") return true;
    return e.sender_brain === filter;
  });

  return (
    <div className="w-full rounded-2xl bg-white/95 dark:bg-[#0E1322] border border-slate-200/90 dark:border-[#1E293B] shadow-sm relative overflow-hidden transition-colors">
      {/* Ticker Header Bar */}
      <div className="px-4 py-2.5 bg-slate-50/90 dark:bg-[#0B0F19]/90 border-b border-slate-200 dark:border-slate-800/80 flex items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span className="font-bold tracking-wider text-slate-800 dark:text-slate-200 uppercase flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-sky-600 dark:text-[#00D2FE]" />
            Live Inter-Brain Activity Ticker
          </span>
          <span className="text-slate-400 dark:text-slate-600 hidden sm:inline">•</span>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:inline">
            Real-Time Synaptic Stream (24/7 Autonomous Agency)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Brain Filter Tabs */}
          <div className="flex items-center p-0.5 rounded-lg bg-slate-200/60 dark:bg-slate-800/80 text-[10px] font-semibold">
            <button
              onClick={() => setFilter("ALL")}
              className={`px-2 py-0.5 rounded ${
                filter === "ALL"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("EDITH")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                filter === "EDITH"
                  ? "bg-sky-100 dark:bg-[#00D2FE]/20 text-sky-700 dark:text-[#00D2FE] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-sky-600 dark:hover:text-[#00D2FE]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
              EDITH
            </button>
            <button
              onClick={() => setFilter("FRIDAY")}
              className={`px-2 py-0.5 rounded flex items-center gap-1 ${
                filter === "FRIDAY"
                  ? "bg-purple-100 dark:bg-[#8B5CF6]/20 text-purple-700 dark:text-[#A855F7] shadow-xs"
                  : "text-slate-600 dark:text-slate-400 hover:text-purple-600 dark:hover:text-[#A855F7]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              FRIDAY
            </button>
          </div>

          {/* Pause Toggle */}
          <button
            onClick={() => setIsPaused(!isPaused)}
            title={isPaused ? "Resume Ticker" : "Pause Ticker"}
            className="p-1 rounded-md text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            {isPaused ? <Play className="w-3.5 h-3.5 fill-current" /> : <Pause className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Stream Feed Body */}
      <div
        ref={tickerRef}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        className="divide-y divide-slate-100 dark:divide-slate-800/60 max-h-44 overflow-y-auto font-mono text-xs"
      >
        {filteredEvents.length > 0 ? (
          filteredEvents.map((evt) => {
            const isEdith = evt.sender_brain === "EDITH";
            const isDenied = evt.decision === "DENIED";
            return (
              <div
                key={evt.id}
                onClick={() => setSelectedEvent(evt)}
                className="px-4 py-2 hover:bg-slate-50/80 dark:hover:bg-[#111726]/80 flex items-center justify-between gap-3 cursor-pointer transition-colors group"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {/* Brain Indicator Badge */}
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0 flex items-center gap-1 ${
                      isEdith
                        ? "bg-sky-100 dark:bg-[#00D2FE]/15 text-sky-700 dark:text-[#00D2FE] border border-sky-300/60 dark:border-[#00D2FE]/30"
                        : "bg-purple-100 dark:bg-[#8B5CF6]/15 text-purple-700 dark:text-[#A855F7] border border-purple-300/60 dark:border-[#8B5CF6]/30"
                    }`}
                  >
                    {isEdith ? <Cpu className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                    {evt.sender_brain}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[11px] text-slate-400 dark:text-slate-500 shrink-0 font-medium">
                    [{evt.created_at}]
                  </span>

                  {/* Event Text */}
                  <span className="text-slate-700 dark:text-slate-200 truncate group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                    {evt.content}
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {/* Decision Tag */}
                  {evt.decision && (
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isDenied
                          ? "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-300/60 dark:border-amber-800/40"
                          : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-300/60 dark:border-emerald-800/40"
                      }`}
                    >
                      {evt.decision}
                    </span>
                  )}
                  <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition-colors" />
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-xs">
            No events found for the selected brain filter.
          </div>
        )}
      </div>

      {/* Detail Modal / Drawer */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0F1423] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative text-slate-900 dark:text-white space-y-4">
            <button
              onClick={() => setSelectedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 font-mono text-xs text-sky-600 dark:text-[#00D2FE]">
              <Radio className="w-4 h-4" />
              <span>Synaptic Event Telemetry</span>
            </div>

            <h3 className="font-mono font-bold text-base text-slate-900 dark:text-white">
              {selectedEvent.content}
            </h3>

            <div className="space-y-2 text-xs font-mono bg-slate-50 dark:bg-[#080C16] p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
              <div className="flex justify-between">
                <span className="text-slate-500">Sender Brain:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">{selectedEvent.sender_brain}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Message Type:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedEvent.message_type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Verdict:</span>
                <span className={`font-bold ${selectedEvent.decision === "DENIED" ? "text-amber-500" : "text-emerald-500"}`}>
                  {selectedEvent.decision || "PROCESSED"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Timestamp:</span>
                <span className="text-slate-800 dark:text-slate-200">{selectedEvent.created_at}</span>
              </div>
            </div>

            {selectedEvent.reasoning && (
              <div className="text-xs space-y-1">
                <span className="text-slate-500 font-mono block">Autonomous Rationale:</span>
                <p className="text-slate-700 dark:text-slate-300 font-mono bg-slate-50 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800 leading-relaxed">
                  {selectedEvent.reasoning}
                </p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-xs font-mono font-bold transition-all"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
