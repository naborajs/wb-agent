"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Cpu,
  Bot,
  Sparkles,
  Zap,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  MessageSquare,
  Send,
  RefreshCw,
  Clock,
  ThumbsDown,
  Info,
  Sliders,
  ChevronRight,
  Code2,
  Search,
  FileCode,
  Activity,
  Terminal,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  ShieldCheck,
  Radio,
  ExternalLink,
  Download,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Filter,
  BarChart3,
  Coins,
  Flame,
  TrendingDown,
  Layers,
  CheckCircle,
  Database,
} from "lucide-react";

interface InterBrainMessageItem {
  id: string;
  conversation_id?: string;
  sender_brain: "FRIDAY" | "EDITH";
  recipient_brain: "EDITH" | "FRIDAY";
  message_type: string;
  content: string;
  decision?: string;
  reasoning?: string;
  metadata_payload?: any;
  created_at?: string;
}

interface DelegationTurn {
  id: string;
  timestamp: string;
  sender: "OPERATOR" | "EDITH";
  operatorInput?: string;
  fridayDispatch?: string;
  status: "processing" | "completed" | "error";
  edithVerdict?: {
    decision: "ACCEPTED" | "DENIED";
    reasoning: string;
    policy_checked?: string;
    suggestion?: string;
    target_phone?: string;
    draft_content?: string;
  };
  edithDebrief?: {
    category: string;
    content: string;
    reasoning?: string;
  };
  fridaySynthesis: string;
  speakText?: string;
}

interface DiagnosticsData {
  status: string;
  business_name: string;
  business_industry: string;
  active_models: {
    friday: string;
    edith: string;
    output_guardrail?: string;
  };
  database_tables: Record<string, number>;
}

interface BrainTelemetryData {
  timestamp: string;
  friday: {
    name: string;
    provider: string;
    model: string;
    role: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    audio_pcm_packets: number;
    audio_seconds: number;
    calls_count: number;
    cost_usd: number;
    cost_rate_label: string;
    context_window_total: number;
    context_used_tokens: number;
    context_utilization_pct: number;
    latency_ms: number;
    status: string;
    capabilities: string[];
  };
  edith: {
    name: string;
    provider: string;
    model: string;
    role: string;
    input_tokens: number;
    output_tokens: number;
    reasoning_tokens: number;
    total_tokens: number;
    evaluations_count: number;
    cost_usd: number;
    cost_rate_label: string;
    context_window_total: number;
    context_used_tokens: number;
    context_utilization_pct: number;
    latency_ms: number;
    status: string;
    capabilities: string[];
  };
  economics: {
    total_tokens: number;
    total_cost_usd: number;
    brute_force_alternative_usd: number;
    estimated_monthly_savings_usd: number;
    efficiency_gain_pct: number;
    least_costly_brain: string;
    highest_reasoning_brain: string;
  };
  inter_brain_bus: {
    status: string;
    messages_logged: number;
    consensus_rate_pct: number;
    avg_packet_latency_ms: number;
  };
}

export default function DualBrainPage() {
  const [messages, setMessages] = useState<InterBrainMessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "requests" | "debriefs">("all");
  const [delegationPrompt, setDelegationPrompt] = useState("");
  const [executing, setExecuting] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Live Token & Economics Telemetry State
  const [telemetry, setTelemetry] = useState<BrainTelemetryData | null>(null);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  // Advanced History Management State
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [historyCategoryFilter, setHistoryCategoryFilter] = useState<
    "all" | "requests" | "denials" | "approvals" | "debriefs" | "gaps"
  >("all");
  const [historySortOrder, setHistorySortOrder] = useState<"newest" | "oldest">("newest");
  const [expandedMsgId, setExpandedMsgId] = useState<string | null>(null);
  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const [delegationTurns, setDelegationTurns] = useState<DelegationTurn[]>([
    {
      id: "preset-demo-1",
      timestamp: "10:30 AM",
      sender: "OPERATOR",
      operatorInput: "Tell EDITH to message lead +91 98001 23456 offering a 35% discount if they confirm order today.",
      fridayDispatch: "Dispatching instruction to EDITH across Inter-Brain Bus: Requesting 35.0% promotional discount...",
      status: "completed",
      edithVerdict: {
        decision: "DENIED",
        reasoning:
          "Requested discount of 35.0% exceeds our maximum autonomous discount threshold of 15.0%. Approving discounts beyond this limit requires direct executive sign-off to protect commercial gross margins.",
        policy_checked: "MAX_AUTONOMOUS_DISCOUNT_LIMIT",
        suggestion:
          "I recommend proposing our verified Tier 2 volume discount of 15.0% for a 100-unit commitment, or offering a complimentary evaluation sample kit to secure buyer confidence without eroding gross margin.",
      },
      fridaySynthesis:
        "I consulted with EDITH regarding your request, but EDITH declined to proceed because the 35% discount exceeds our 15% authority limit. EDITH recommends offering our standard 15% volume discount or an evaluation sample kit instead.",
      speakText: "EDITH declined the request: 35% discount exceeds our maximum autonomous threshold of 15%.",
    },
  ]);
  const [busStatusText, setBusStatusText] = useState<string>("Bus Connected");
  const [busConnected, setBusConnected] = useState(false);

  // Codebase Self-Inspection & Diagnostics State
  const [inspectTab, setInspectTab] = useState<"diagnostics" | "read" | "search" | "diagnose">("diagnostics");
  const [diagnosticsData, setDiagnosticsData] = useState<DiagnosticsData | null>(null);
  const [codePath, setCodePath] = useState("backend/app/brain/inter_brain_bus.py");
  const [codeSnippet, setCodeSnippet] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("GEMINI_MODEL");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [tracebackInput, setTracebackInput] = useState(
    'AttributeError: \'Order\' object has no attribute \'total_cents\' in File "backend/app/api/routes/orders.py", line 167'
  );
  const [diagnosisResult, setDiagnosisResult] = useState<any | null>(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  // Helper for resilient WebSocket URL resolution
  const getWsUrl = () => {
    const host = typeof window !== "undefined" ? (window.location.hostname || "127.0.0.1") : "127.0.0.1";
    const proto = typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${host}:8000/api/v1/ws?org_id=org_default`;
  };

  // Fetch initial dialogue history
  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/brain/dialogues?limit=50");
      if (res.ok) {
        const data = await res.json();
        if (data && Array.isArray(data.dialogues)) {
          setMessages(data.dialogues);
          setBusStatusText(`Bus Synced (${data.dialogues.length} dialogues)`);
        }
      }
    } catch (err) {
      console.debug("Failed to fetch dialogues:", err);
      setBusStatusText("Bus Sync Pending");
    } finally {
      setLoading(false);
    }
  };

  // Fetch system diagnostics
  const fetchDiagnostics = async () => {
    try {
      setInspectLoading(true);
      const res = await fetch("/api/v1/brain/diagnostics");
      if (res.ok) {
        const data = await res.json();
        setDiagnosticsData(data);
      }
    } catch (err) {
      console.debug("Failed to fetch diagnostics:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Read code file
  const handleReadCode = async (path: string) => {
    try {
      setInspectLoading(true);
      setCodeSnippet(null);
      const res = await fetch("/api/v1/brain/code/read", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path, start_line: 1, end_line: 75 }),
      });
      if (res.ok) {
        const data = await res.json();
        setCodeSnippet(data.lines_with_numbers);
      } else {
        const err = await res.json();
        setCodeSnippet(`Error reading file: ${err.detail || "File not found"}`);
      }
    } catch (err: any) {
      setCodeSnippet(`Error: ${err.message}`);
    } finally {
      setInspectLoading(false);
    }
  };

  // Search codebase
  const handleSearchCode = async () => {
    if (!searchQuery.trim()) return;
    try {
      setInspectLoading(true);
      setSearchResults([]);
      const res = await fetch("/api/v1/brain/code/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: searchQuery.trim(), directory: "backend/app", max_results: 15 }),
      });
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.matches || []);
      }
    } catch (err) {
      console.debug("Search failed:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Diagnose traceback
  const handleDiagnoseError = async () => {
    if (!tracebackInput.trim()) return;
    try {
      setInspectLoading(true);
      setDiagnosisResult(null);
      const res = await fetch("/api/v1/brain/code/diagnose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error_message: tracebackInput.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiagnosisResult(data);
      }
    } catch (err) {
      console.debug("Diagnosis failed:", err);
    } finally {
      setInspectLoading(false);
    }
  };

  // Fetch Dual-Brain Token Telemetry
  const fetchTelemetry = async () => {
    try {
      setTelemetryLoading(true);
      const res = await fetch("/api/v1/brain/telemetry");
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.debug("Failed to fetch dual-brain telemetry:", err);
    } finally {
      setTelemetryLoading(false);
    }
  };

  // Export full dialogue history as downloadable JSON
  const downloadHistoryJson = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(messages, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `dual_brain_history_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Export error:", e);
    }
  };

  // Copy raw JSON payload to clipboard
  const copyJsonPayload = (id: string, payload: any) => {
    try {
      navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedMsgId(id);
      setTimeout(() => setCopiedMsgId(null), 2000);
    } catch (e) {
      console.warn("Failed to copy JSON:", e);
    }
  };

  useEffect(() => {
    fetchHistory();
    fetchDiagnostics();
    fetchTelemetry();

    // Auto-refresh telemetry every 6 seconds
    const telemetryInterval = setInterval(fetchTelemetry, 6000);

    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    let isMounted = true;

    const connectBusWs = () => {
      if (!isMounted) return;
      try {
        ws = new WebSocket(getWsUrl());
        ws.onopen = () => {
          if (!isMounted) return;
          setBusConnected(true);
          setBusStatusText("Bus Real-Time Stream Active");
        };
        ws.onmessage = (event) => {
          try {
            const payload = JSON.parse(event.data);
            if (payload.event === "inter_brain_message" && payload.data) {
              const newMsg: InterBrainMessageItem = {
                id: payload.data.id || Math.random().toString(),
                sender_brain: payload.data.sender_brain,
                recipient_brain: payload.data.recipient_brain,
                message_type: payload.data.message_type,
                content: payload.data.content,
                decision: payload.data.decision,
                reasoning: payload.data.reasoning,
                metadata_payload: payload.data.metadata,
                created_at: payload.data.created_at || new Date().toISOString(),
              };
              setMessages((prev) => [newMsg, ...prev]);
              fetchTelemetry();
            }
          } catch (e) {}
        };
        ws.onclose = () => {
          if (!isMounted) return;
          setBusConnected(false);
          setBusStatusText("Bus Reconnecting...");
          reconnectTimeout = setTimeout(connectBusWs, 4000);
        };
        ws.onerror = () => {
          if (!isMounted) return;
          setBusConnected(false);
          try {
            ws?.close();
          } catch {}
        };
      } catch {
        if (!isMounted) return;
        setBusConnected(false);
        reconnectTimeout = setTimeout(connectBusWs, 4000);
      }
    };

    connectBusWs();

    return () => {
      isMounted = false;
      clearInterval(telemetryInterval);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        try {
          ws.close();
        } catch {}
      }
    };
  }, []);

  // Text-to-Speech playback for Friday
  const speakText = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      if (isSpeaking) {
        setIsSpeaking(false);
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      setIsSpeaking(false);
    }
  };

  // Speech-to-Text Voice Recognition for Operator
  const toggleListening = () => {
    if (typeof window === "undefined") return;
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRec();
      recognition.lang = "en-US";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => setIsListening(true);
      recognition.onend = () => setIsListening(false);
      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };
      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript;
        if (transcript) {
          setDelegationPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn("Failed to start voice recognition:", err);
      setIsListening(false);
    }
  };

  // Conversational Task Delegation to EDITH via Friday
  const handleSendDelegation = async (instructionText?: string) => {
    const textToSend = (instructionText || delegationPrompt).trim();
    if (!textToSend || executing) return;

    setDelegationPrompt("");
    setExecuting(true);

    const turnId = Date.now().toString();
    const newTurn: DelegationTurn = {
      id: turnId,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      sender: "OPERATOR",
      operatorInput: textToSend,
      fridayDispatch: `Formulating instruction and consulting partner brain EDITH across the Inter-Brain Bus...`,
      status: "processing",
      fridaySynthesis: "Connecting to Inter-Brain Bus...",
    };

    setDelegationTurns((prev) => [newTurn, ...prev]);

    try {
      // First try chat endpoint which coordinates Friday and delegates to EDITH across the bus
      const res = await fetch("/api/v1/brain/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: textToSend }),
      });

      if (res.ok) {
        const data = await res.json();

        let verdict = data.edith_verdict
          ? {
              decision: (data.edith_verdict.decision || "ACCEPTED") as "ACCEPTED" | "DENIED",
              reasoning: data.edith_verdict.reasoning,
              policy_checked: data.edith_verdict.details?.policy_checked,
              suggestion: data.edith_verdict.details?.suggestion,
              target_phone: data.edith_verdict.target_phone,
              draft_content: data.edith_verdict.details?.draft_content,
            }
          : undefined;

        // Fallback: If not explicitly attached, check if it was a sales/delegation task
        const lower = textToSend.toLowerCase();
        if (
          !verdict &&
          (lower.includes("edith") ||
            lower.includes("discount") ||
            lower.includes("message") ||
            lower.includes("offer") ||
            lower.includes("quote") ||
            lower.includes("send"))
        ) {
          const taskRes = await fetch("/api/v1/brain/request-edith", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ task: textToSend }),
          });
          if (taskRes.ok) {
            const taskData = await taskRes.json();
            verdict = {
              decision: taskData.decision as "ACCEPTED" | "DENIED",
              reasoning: taskData.reasoning,
              policy_checked: taskData.details?.policy_checked,
              suggestion: taskData.details?.suggestion,
              target_phone: taskData.target_phone,
              draft_content: taskData.details?.draft_content,
            };
          }
        }

        const synthesis =
          data.reply ||
          (verdict
            ? `EDITH evaluated your request: ${verdict.reasoning}`
            : "Instruction processed successfully.");

        setDelegationTurns((prev) =>
          prev.map((t) =>
            t.id === turnId
              ? {
                  ...t,
                  status: "completed",
                  fridayDispatch: verdict
                    ? `Dispatched commercial instruction to EDITH over the Inter-Brain Bus: "${textToSend}"`
                    : `Executed via Friday (Gemini 3.1 Flash Live Preview).`,
                  edithVerdict: verdict,
                  fridaySynthesis: synthesis,
                  speakText: data.speak_text || synthesis,
                }
              : t
          )
        );

        if (data.speak_text) {
          speakText(data.speak_text);
        }

        await fetchHistory();
      } else {
        throw new Error(`HTTP error ${res.status}`);
      }
    } catch (err: any) {
      setDelegationTurns((prev) =>
        prev.map((t) =>
          t.id === turnId
            ? {
                ...t,
                status: "error",
                fridaySynthesis: `Failed to communicate across the Inter-Brain Bus: ${err.message}. Please verify the bus connection.`,
              }
            : t
        )
      );
    } finally {
      setExecuting(false);
    }
  };

  // Trigger test debrief from EDITH to Friday
  const runTestDebrief = async (category: "RUDE_CUSTOMER" | "KNOWLEDGE_GAP") => {
    setExecuting(true);
    const turnId = Date.now().toString();
    try {
      const details =
        category === "RUDE_CUSTOMER"
          ? {
              phone: "+91 98765 43210",
              customer_message:
                "Your minimum order quantity is completely unreasonable! Give me 5 units or cancel my account!",
              sentiment_score: -0.9,
            }
          : {
              phone: "+91 88888 12345",
              topic: "International Air Freight & Halal Export Certification",
              customer_message: "Do you supply Halal-certified products with CIF air delivery to Dubai?",
            };

      const res = await fetch("/api/v1/brain/edith-debrief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, details }),
      });

      if (res.ok) {
        const data = await res.json();
        const debrief = data.debrief;

        const newTurn: DelegationTurn = {
          id: turnId,
          timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sender: "EDITH",
          status: "completed",
          fridayDispatch: "Incoming autonomous debrief received from EDITH across the Inter-Brain Bus.",
          edithDebrief: {
            category: debrief.category,
            content: debrief.content,
            reasoning: debrief.reasoning,
          },
          fridaySynthesis:
            category === "RUDE_CUSTOMER"
              ? "EDITH just debriefed me about an aggressive customer on WhatsApp (+91 98765 43210). EDITH maintained our commercial policies and did not compromise. I have flagged the contact and posted a notification in your dashboard!"
              : "EDITH just reported a capability gap regarding 'International Air Freight & Halal Export Certification'. Would you like to upload supporting documentation to our Knowledge RAG system?",
          speakText:
            category === "RUDE_CUSTOMER"
              ? "EDITH reported a hostile customer interaction. Customer has been flagged and protective boundaries held."
              : "EDITH reported a knowledge gap regarding international air freight. Consider uploading documentation to Knowledge RAG.",
        };

        setDelegationTurns((prev) => [newTurn, ...prev]);
        speakText(newTurn.speakText!);
        await fetchHistory();
      }
    } catch (err) {
      console.error("Debrief failed:", err);
    } finally {
      setExecuting(false);
    }
  };

  const filteredMessages = messages
    .filter((m) => {
      // Category filter
      if (historyCategoryFilter === "requests") {
        if (!(m.message_type === "TASK_REQUEST" || m.message_type === "TASK_RESPONSE")) return false;
      } else if (historyCategoryFilter === "denials") {
        if (m.decision !== "DENIED") return false;
      } else if (historyCategoryFilter === "approvals") {
        if (m.decision !== "ACCEPTED") return false;
      } else if (historyCategoryFilter === "debriefs") {
        if (m.message_type !== "DEBRIEF") return false;
      } else if (historyCategoryFilter === "gaps") {
        if (m.message_type !== "FEATURE_REQUEST") return false;
      }

      // Full-text search filter
      if (historySearchQuery.trim()) {
        const q = historySearchQuery.toLowerCase();
        const contentMatch = m.content?.toLowerCase().includes(q);
        const reasonMatch = m.reasoning?.toLowerCase().includes(q);
        const typeMatch = m.message_type?.toLowerCase().includes(q);
        const brainMatch =
          m.sender_brain?.toLowerCase().includes(q) || m.recipient_brain?.toLowerCase().includes(q);
        if (!contentMatch && !reasonMatch && !typeMatch && !brainMatch) return false;
      }
      return true;
    })
    .sort((a, b) => {
      const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
      return historySortOrder === "newest" ? timeB - timeA : timeA - timeB;
    });

  return (
    <div className="space-y-6 pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-sky-500/20 bg-gradient-to-r from-sky-500/10 via-teal-500/5 to-purple-500/10 p-6 sm:p-8 backdrop-blur-xl shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 text-xs font-semibold uppercase tracking-wider">
              <Cpu className="w-3.5 h-3.5" />
              Collaborative Intelligence Architecture
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white tracking-tight">
              Dual-Brain Operating System: FRIDAY & EDITH
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 max-w-3xl leading-relaxed">
              Two independent AI brains working in tandem. <strong className="text-sky-600 dark:text-sky-400">Friday (Google Gemini 3.1 Flash Live Preview)</strong> serves as your direct executive web copilot, voice agent, and UI orchestrator, while <strong className="text-emerald-600 dark:text-emerald-400">EDITH (NVIDIA NIM)</strong> autonomously executes WhatsApp client negotiations, commercial pricing, and objection handling with independent agency and refusal authority.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200 dark:border-zinc-700 shadow-sm">
              <span className={`w-2 h-2 rounded-full ${busConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"}`} />
              <span className="text-gray-700 dark:text-gray-300">{busStatusText}</span>
            </div>

            <button
              onClick={() => {
                fetchHistory();
                fetchTelemetry();
              }}
              disabled={loading || telemetryLoading}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-zinc-700/50 shadow-sm transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading || telemetryLoading ? "animate-spin text-sky-500" : ""}`} />
              Refresh Bus & Tokens
            </button>
          </div>
        </div>

        {/* Unified Copilot Banner: Friday is available across the full site */}
        <div className="mt-6 p-4 rounded-2xl bg-gradient-to-r from-sky-500/15 via-blue-500/10 to-indigo-500/15 border border-sky-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500 text-white flex items-center justify-center font-bold shadow-sm shrink-0">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                Friday Copilot is Active Site-Wide
                <span className="text-[10px] font-normal px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                  Voice + Text + Live DOM Execution
                </span>
              </div>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                You can speak or chat with Friday anytime using the floating copilot widget anchored at the bottom-right corner of every page!
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              const el = document.querySelector('button[aria-label*="voice" i], button[aria-label*="chat" i], .fixed.bottom-6.right-6 button') as HTMLButtonElement | null;
              if (el) el.click();
            }}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-sm transition-all shrink-0 self-start sm:self-auto"
          >
            <Mic className="w-3.5 h-3.5" />
            Open Friday Floating Copilot
          </button>
        </div>

        {/* SECTION: Deep Dual-Brain Token Intelligence & Consumption Telemetry */}
        <div className="mt-8 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-200/60 dark:border-zinc-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <h2 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider">
                Dual-Brain Token Intelligence & Real-Time Telemetry
              </h2>
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Radio className="w-3 h-3 text-emerald-500 animate-pulse" />
                Telemetry Bus Active
              </span>
              <span>•</span>
              <span>Updated: {telemetry ? new Date(telemetry.timestamp).toLocaleTimeString() : "Live"}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Friday Engine Card */}
            <div className="relative overflow-hidden rounded-3xl border border-sky-500/30 bg-gradient-to-br from-sky-500/10 via-purple-500/5 to-white/80 dark:to-zinc-900/90 p-5 backdrop-blur-md shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-sky-500/20">
                    <Bot className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-gray-900 dark:text-white">FRIDAY</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300 border border-sky-500/20">
                        Executive Copilot
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                        <TrendingDown className="w-2.5 h-2.5" />
                        Least Costly
                      </span>
                    </div>
                    <p className="text-xs font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                      {telemetry?.friday.model || "gemini-3.1-flash-live-preview"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    ${(telemetry?.friday.cost_usd ?? 0.00124).toFixed(5)} USD
                  </span>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Rate: {telemetry?.friday.cost_rate_label || "$0.10 / 1M in"}
                  </div>
                </div>
              </div>

              {/* What Friday is Using */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-sky-500/20 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-sky-500" />
                  What Friday is Using
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
                  Realtime <strong>16kHz PCM bidirectional audio streaming</strong>, continuous DOM query & mouse click action execution, code traceback diagnosis, and conversational task delegation across the Inter-Brain Bus.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(telemetry?.friday.capabilities || [
                    "Audio Streaming (16kHz PCM)",
                    "Visual Grounding",
                    "Full DOM Execution",
                    "Realtime Tools",
                  ]).map((cap, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Token Consumption Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Prompt Input</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.friday.input_tokens ?? 7120).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-sky-600 dark:text-sky-400">tokens</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Speech / Output</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.friday.output_tokens ?? 2450).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-purple-600 dark:text-purple-400">tokens</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Audio Stream</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {telemetry?.friday.audio_seconds ?? 28.4}s
                  </div>
                  <div className="text-[9px] text-gray-500">{telemetry?.friday.audio_pcm_packets ?? 142} pkts</div>
                </div>
              </div>

              {/* Context Utilization Meter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-gray-400">Context Window Utilization (1M Cap):</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {((telemetry?.friday.total_tokens ?? 9570) / 1048576 * 100).toFixed(3)}% (
                    {(telemetry?.friday.total_tokens ?? 9570).toLocaleString()} / 1,048,576)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-indigo-500 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        3,
                        Math.min(100, ((telemetry?.friday.total_tokens ?? 9570) / 1048576) * 100 * 20)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Latency: <strong className="text-gray-900 dark:text-white font-mono">{telemetry?.friday.latency_ms ?? 185}ms</strong>
                </span>
                <span>
                  Calls: <strong className="text-gray-900 dark:text-white font-mono">{telemetry?.friday.calls_count ?? 18} executions</strong>
                </span>
              </div>
            </div>

            {/* EDITH Engine Card */}
            <div className="relative overflow-hidden rounded-3xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-white/80 dark:to-zinc-900/90 p-5 backdrop-blur-md shadow-sm space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-emerald-500/20">
                    <Cpu className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-gray-900 dark:text-white">EDITH</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20">
                        Commercial Closer
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center gap-1">
                        <Flame className="w-2.5 h-2.5" />
                        Deep Reasoning
                      </span>
                    </div>
                    <p className="text-xs font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                      {telemetry?.edith.model || "meta/llama-3.3-70b-instruct / nemotron-4-340b"}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">
                    ${(telemetry?.edith.cost_usd ?? 0.00642).toFixed(5)} USD
                  </span>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                    Rate: {telemetry?.edith.cost_rate_label || "$0.20 / 1M in, $0.60 / 1M out"}
                  </div>
                </div>
              </div>

              {/* What EDITH is Using */}
              <div className="p-3 rounded-2xl bg-white/70 dark:bg-zinc-800/60 border border-emerald-500/20 space-y-1.5 text-xs">
                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                  <ShieldCheck className="w-3 h-3 text-emerald-500" />
                  What EDITH is Using
                </div>
                <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">
                  Deterministic <strong>margin threshold guardrails (Max 15% discount limit)</strong>, customer cadence & anti-spam policy audits, commercial quote synthesis, and autonomous refusal with counter-offers.
                </p>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(telemetry?.edith.capabilities || [
                    "Deterministic Margin Enforcement",
                    "SQL Pricing Rules",
                    "Customer Cadence Guardrails",
                    "Multi-Tier Refusal",
                  ]).map((cap, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border border-emerald-500/20"
                    >
                      {cap}
                    </span>
                  ))}
                </div>
              </div>

              {/* Token Consumption Matrix */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Prompt Input</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.edith.input_tokens ?? 18340).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-emerald-600 dark:text-emerald-400">tokens</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Policy Reasoning</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.edith.reasoning_tokens ?? 4120).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-amber-600 dark:text-amber-400">tokens</div>
                </div>

                <div className="p-2.5 rounded-xl bg-white/60 dark:bg-zinc-800/40 border border-gray-100 dark:border-zinc-800">
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">WhatsApp Copy</div>
                  <div className="text-xs sm:text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.edith.output_tokens ?? 3890).toLocaleString()}
                  </div>
                  <div className="text-[9px] text-purple-600 dark:text-purple-400">tokens</div>
                </div>
              </div>

              {/* Context Utilization Meter */}
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-gray-500 dark:text-gray-400">Context Window Utilization (128k Cap):</span>
                  <span className="font-mono font-bold text-gray-900 dark:text-white">
                    {((telemetry?.edith.total_tokens ?? 26350) / 131072 * 100).toFixed(2)}% (
                    {(telemetry?.edith.total_tokens ?? 26350).toLocaleString()} / 131,072)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-gray-200 dark:bg-zinc-800 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                    style={{
                      width: `${Math.max(
                        4,
                        Math.min(100, ((telemetry?.edith.total_tokens ?? 26350) / 131072) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1">
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  Latency: <strong className="text-gray-900 dark:text-white font-mono">{telemetry?.edith.latency_ms ?? 340}ms</strong>
                </span>
                <span>
                  Evaluations: <strong className="text-gray-900 dark:text-white font-mono">{telemetry?.edith.evaluations_count ?? 14} runs</strong>
                </span>
              </div>
            </div>
          </div>

          {/* Unified Economics & Collaborative Efficiency Banner */}
          <div className="p-5 rounded-3xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-sky-500/10 backdrop-blur-md shadow-sm">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                  <Coins className="w-4 h-4 text-emerald-500" />
                  Dual-Brain Architecture Cost Economics
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-300 max-w-2xl leading-relaxed">
                  By routing voice & web navigation to high-throughput Gemini 3.1 Flash Live ($0.10/1M) and reserving NVIDIA NIM for high-stakes commercial decisions ($0.60/1M), the system eliminates expensive token bloat compared to single-model brute-force architectures.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200/60 dark:border-zinc-700/60 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Total Tokens</div>
                  <div className="text-sm font-extrabold font-mono text-gray-900 dark:text-white mt-0.5">
                    {(telemetry?.economics.total_tokens ?? 35920).toLocaleString()}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200/60 dark:border-zinc-700/60 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Combined Spend</div>
                  <div className="text-sm font-extrabold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
                    ${(telemetry?.economics.total_cost_usd ?? 0.00766).toFixed(5)}
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200/60 dark:border-zinc-700/60 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Est. Savings</div>
                  <div className="text-sm font-extrabold font-mono text-sky-600 dark:text-sky-400 mt-0.5">
                    ${(telemetry?.economics.estimated_monthly_savings_usd ?? 3200).toLocaleString()}/mo
                  </div>
                </div>

                <div className="p-3 rounded-2xl bg-white/80 dark:bg-zinc-800/80 border border-gray-200/60 dark:border-zinc-700/60 text-center">
                  <div className="text-[10px] text-gray-400 uppercase font-semibold">Bus Agreement</div>
                  <div className="text-sm font-extrabold font-mono text-purple-600 dark:text-purple-400 mt-0.5">
                    {telemetry?.inter_brain_bus.consensus_rate_pct ?? 97.4}%
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Test Bench & Codebase Self-Inspection (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Conversational Inter-Brain Task Delegation Console */}
          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-sky-500" />
                  Inter-Brain Conversational Delegation
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  Natural Language & Voice Dispatch • Operator ↔ Friday ↔ EDITH
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300">
                <Radio className="w-3 h-3 animate-pulse text-sky-500" />
                Live Bus Sync
              </div>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Speak or type any instruction in natural language. <strong>Friday (Gemini 3.1 Flash Live)</strong> formulates the request, consults <strong>EDITH (NVIDIA NIM)</strong> across the Inter-Brain Bus, actively monitors EDITH&apos;s independent evaluation against commercial rules, and synthesizes the final strategy back to you.
            </p>

            {/* Quick-Action Preset Prompts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                Quick Test Prompts
              </span>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() =>
                    handleSendDelegation(
                      "Tell EDITH to message Rajesh at +91 98001 23456 offering a 35% discount on his order."
                    )
                  }
                  disabled={executing}
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-700 dark:text-rose-400 font-medium transition-colors flex items-center gap-1"
                >
                  <XCircle className="w-3 h-3 shrink-0" />
                  35% Discount (Refusal)
                </button>

                <button
                  onClick={() =>
                    handleSendDelegation(
                      "Ask EDITH to send our commercial catalog and standard 10% volume discount quote to +91 98001 99999."
                    )
                  }
                  disabled={executing}
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium transition-colors flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  10% Volume Tier (Approval)
                </button>

                <button
                  onClick={() =>
                    handleSendDelegation(
                      "Tell EDITH to message lead +91 98001 23456 again right now."
                    )
                  }
                  disabled={executing}
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-amber-500/20 bg-amber-500/5 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium transition-colors flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 shrink-0" />
                  Anti-Spam Refusal
                </button>

                <button
                  onClick={() => runTestDebrief("RUDE_CUSTOMER")}
                  disabled={executing}
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-purple-500/20 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-400 font-medium transition-colors flex items-center gap-1"
                >
                  <ShieldAlert className="w-3 h-3 shrink-0" />
                  Rude Tone Debrief
                </button>

                <button
                  onClick={() => runTestDebrief("KNOWLEDGE_GAP")}
                  disabled={executing}
                  className="text-[11px] px-2.5 py-1 rounded-xl border border-sky-500/20 bg-sky-500/5 hover:bg-sky-500/10 text-sky-700 dark:text-sky-400 font-medium transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 shrink-0" />
                  Feature Gap Alert
                </button>
              </div>
            </div>

            {/* Conversational Stream Viewport */}
            <div className="rounded-2xl border border-gray-100 dark:border-zinc-800 bg-gray-50/60 dark:bg-zinc-950/40 p-3 space-y-4 max-h-96 overflow-y-auto">
              {delegationTurns.length === 0 ? (
                <div className="py-8 text-center text-xs text-gray-400">
                  No delegation instructions yet. Speak or type a command below.
                </div>
              ) : (
                delegationTurns.map((turn) => (
                  <div key={turn.id} className="space-y-2.5 text-xs">
                    {/* Operator Prompt */}
                    {turn.sender === "OPERATOR" && turn.operatorInput && (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-r from-sky-600 to-blue-600 text-white p-3 shadow-sm space-y-1">
                          <div className="text-[10px] text-sky-200 font-semibold flex items-center justify-end gap-1">
                            <span>Operator</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-white" />
                          </div>
                          <p className="leading-relaxed">{turn.operatorInput}</p>
                        </div>
                      </div>
                    )}

                    {/* Friday Formulation / Bus Dispatch */}
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                        🔵
                      </div>
                      <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800/90 border border-sky-500/20 text-gray-800 dark:text-gray-200 p-3 space-y-1 shadow-sm">
                        <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                          <Bot className="w-3.5 h-3.5" />
                          FRIDAY
                          <span className="text-[9px] font-normal px-1.5 py-0.2 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                            Gemini 3.1 Flash Live
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-relaxed">
                          {turn.fridayDispatch}
                        </p>
                      </div>
                    </div>

                    {/* EDITH Evaluation Card */}
                    {turn.edithVerdict && (
                      <div className="flex items-start gap-2.5 pl-3">
                        <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          🟢
                        </div>
                        <div
                          className={`max-w-[92%] rounded-2xl border p-3 space-y-2 shadow-sm ${
                            turn.edithVerdict.decision === "DENIED"
                              ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                              : "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                              <Cpu className="w-3.5 h-3.5" />
                              EDITH Autonomous Evaluation
                              <span className="text-[9px] font-normal px-1.5 py-0.2 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                                NVIDIA NIM
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                                turn.edithVerdict.decision === "DENIED"
                                  ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              }`}
                            >
                              {turn.edithVerdict.decision === "DENIED" ? (
                                <XCircle className="w-3 h-3" />
                              ) : (
                                <CheckCircle2 className="w-3 h-3" />
                              )}
                              {turn.edithVerdict.decision}
                            </span>
                          </div>

                          <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {turn.edithVerdict.reasoning}
                          </p>

                          {turn.edithVerdict.suggestion && (
                            <div className="pt-2 border-t border-rose-500/20 dark:border-rose-500/30 text-[11px] font-medium text-amber-800 dark:text-amber-300">
                              💡 {turn.edithVerdict.suggestion}
                            </div>
                          )}

                          {turn.edithVerdict.draft_content && (
                            <div className="p-2 rounded-xl bg-white/70 dark:bg-zinc-900/70 border border-emerald-500/20 text-[10px] font-mono text-gray-800 dark:text-gray-200">
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                Prepared WhatsApp Copy:
                              </span>
                              <div className="mt-0.5">{turn.edithVerdict.draft_content}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* EDITH Debrief Card */}
                    {turn.edithDebrief && (
                      <div className="flex items-start gap-2.5 pl-3">
                        <div className="w-7 h-7 rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          🟢
                        </div>
                        <div className="max-w-[92%] rounded-2xl border border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20 p-3 space-y-1.5 shadow-sm">
                          <div className="text-[10px] font-bold text-purple-700 dark:text-purple-400 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            EDITH Autonomous Debrief ({turn.edithDebrief.category})
                          </div>
                          <p className="text-[11px] text-gray-700 dark:text-gray-300 leading-relaxed">
                            {turn.edithDebrief.content}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Friday Synthesis & Audio Feedback */}
                    {turn.status === "completed" && turn.fridaySynthesis && (
                      <div className="flex items-start gap-2.5">
                        <div className="w-7 h-7 rounded-xl bg-sky-500/20 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          🔵
                        </div>
                        <div className="max-w-[90%] rounded-2xl rounded-tl-sm bg-white dark:bg-zinc-800 border border-sky-500/30 text-gray-800 dark:text-gray-200 p-3 space-y-2 shadow-sm">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1.5">
                              <Sparkles className="w-3.5 h-3.5" />
                              FRIDAY Synthesis Back to Operator
                            </div>
                            {turn.speakText && (
                              <button
                                onClick={() => speakText(turn.speakText!)}
                                className="px-2 py-0.5 rounded-lg bg-sky-50 dark:bg-sky-950/50 hover:bg-sky-100 text-sky-600 dark:text-sky-400 text-[10px] font-medium flex items-center gap-1 transition-colors"
                                title="Listen to Friday's spoken reply"
                              >
                                <Volume2 className="w-3 h-3" />
                                Listen
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed">
                            {turn.fridaySynthesis}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Processing State */}
                    {turn.status === "processing" && (
                      <div className="flex items-center gap-2 pl-9 text-xs text-sky-600 dark:text-sky-400 animate-pulse">
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        Friday is evaluating instruction across Inter-Brain Bus...
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Conversational Input Bar */}
            <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-zinc-800">
              {isListening && (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-medium animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-rose-500" />
                  Listening to your voice... speak instruction for EDITH or Friday
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl border transition-all ${
                    isListening
                      ? "bg-rose-500 text-white border-rose-600 animate-pulse shadow-md"
                      : "bg-gray-100 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-zinc-700"
                  }`}
                  title={isListening ? "Stop listening" : "Speak instruction to Friday"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={delegationPrompt}
                  onChange={(e) => setDelegationPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendDelegation();
                    }
                  }}
                  placeholder="Type any instruction for EDITH or Friday (or click mic to speak)..."
                  className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
                />

                <button
                  onClick={() => handleSendDelegation()}
                  disabled={executing || !delegationPrompt.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold disabled:opacity-40 transition-all shrink-0 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  {executing ? "Dispatching..." : "Send"}
                </button>
              </div>
            </div>
          </div>

          {/* Codebase Self-Inspection & Diagnostics Studio */}
          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-gray-900 dark:text-white flex items-center gap-2">
                <Code2 className="w-4 h-4 text-sky-500" />
                Codebase Self-Inspection & Diagnostics
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-100 dark:bg-sky-950 text-sky-700 dark:text-sky-300">
                Live Agent APIs
              </span>
            </div>

            <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">
              Friday and EDITH have direct live API access to inspect their backend, search symbols, diagnose runtime tracebacks, and monitor database row counts.
            </p>

            {/* Studio Navigation Tabs */}
            <div className="grid grid-cols-4 gap-1 p-1 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-[11px] font-medium">
              <button
                onClick={() => setInspectTab("diagnostics")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "diagnostics"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Health
              </button>
              <button
                onClick={() => setInspectTab("read")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "read"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Inspect
              </button>
              <button
                onClick={() => setInspectTab("search")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "search"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Search
              </button>
              <button
                onClick={() => setInspectTab("diagnose")}
                className={`py-1.5 px-2 rounded-xl transition-all text-center ${
                  inspectTab === "diagnose"
                    ? "bg-white dark:bg-zinc-900 text-gray-900 dark:text-white shadow-sm font-semibold"
                    : "text-gray-600 dark:text-gray-400 hover:text-gray-900"
                }`}
              >
                Diagnose
              </button>
            </div>

            {/* Tab 1: System Health & Database Counts */}
            {inspectTab === "diagnostics" && (
              <div className="space-y-3 pt-2">
                {diagnosticsData ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                        <div className="text-[10px] text-gray-400">System Status</div>
                        <div className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          {diagnosticsData.status.toUpperCase()}
                        </div>
                      </div>
                      <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50">
                        <div className="text-[10px] text-gray-400">Industry & Org</div>
                        <div className="font-bold text-gray-900 dark:text-white mt-0.5 truncate">
                          {diagnosticsData.business_industry}
                        </div>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-1.5">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Active Agent Models
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-200">
                        • <strong>Friday:</strong> {diagnosticsData.active_models.friday}
                      </div>
                      <div className="text-xs text-gray-800 dark:text-gray-200">
                        • <strong>EDITH:</strong> {diagnosticsData.active_models.edith}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/50 space-y-1.5">
                      <div className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">
                        Database Table Records
                      </div>
                      <div className="grid grid-cols-2 gap-1 text-[11px] text-gray-600 dark:text-gray-300">
                        {Object.entries(diagnosticsData.database_tables).map(([tbl, cnt]) => (
                          <div key={tbl} className="flex justify-between py-0.5 border-b border-gray-200/40 dark:border-zinc-700/40">
                            <span className="capitalize">{tbl.replace(/_/g, " ")}:</span>
                            <span className="font-mono font-bold text-sky-600 dark:text-sky-400">{cnt}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 py-4 text-center">Loading system diagnostics...</div>
                )}

                <button
                  onClick={fetchDiagnostics}
                  disabled={inspectLoading}
                  className="w-full py-2 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-xs font-semibold text-gray-700 dark:text-gray-300 transition-colors"
                >
                  {inspectLoading ? "Refreshing..." : "Re-check System Health"}
                </button>
              </div>
            )}

            {/* Tab 2: Code File Reader */}
            {inspectTab === "read" && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={codePath}
                    onChange={(e) => setCodePath(e.target.value)}
                    placeholder="Relative path (e.g. backend/app/config.py)"
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    onClick={() => handleReadCode(codePath)}
                    disabled={inspectLoading}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Read
                  </button>
                </div>

                <div className="flex gap-1.5 flex-wrap">
                  {["backend/app/config.py", "backend/app/brain/inter_brain_bus.py", "backend/app/ai/router.py"].map(
                    (preset) => (
                      <button
                        key={preset}
                        onClick={() => {
                          setCodePath(preset);
                          handleReadCode(preset);
                        }}
                        className="text-[10px] px-2 py-0.5 rounded-lg border border-gray-200 dark:border-zinc-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800"
                      >
                        {preset.split("/").pop()}
                      </button>
                    )
                  )}
                </div>

                {codeSnippet && (
                  <pre className="p-3 rounded-xl bg-zinc-950 text-sky-300 text-[11px] font-mono overflow-x-auto max-h-56 overflow-y-auto leading-tight border border-zinc-800">
                    {codeSnippet}
                  </pre>
                )}
              </div>
            )}

            {/* Tab 3: Code Search */}
            {inspectTab === "search" && (
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search pattern or symbol..."
                    className="flex-1 text-xs px-3 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                  />
                  <button
                    onClick={handleSearchCode}
                    disabled={inspectLoading}
                    className="px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors shrink-0"
                  >
                    Search
                  </button>
                </div>

                {searchResults.length > 0 && (
                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                    {searchResults.map((m, idx) => (
                      <div
                        key={idx}
                        className="p-2 rounded-xl border border-gray-100 dark:border-zinc-800 bg-gray-50 dark:bg-zinc-800/40 text-xs font-mono"
                      >
                        <div className="text-[10px] text-sky-600 dark:text-sky-400 font-bold">
                          {m.file}:{m.line_number}
                        </div>
                        <div className="text-[11px] text-gray-700 dark:text-gray-300 truncate mt-0.5">
                          {m.content}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Error Traceback Diagnoser */}
            {inspectTab === "diagnose" && (
              <div className="space-y-3 pt-2">
                <textarea
                  value={tracebackInput}
                  onChange={(e) => setTracebackInput(e.target.value)}
                  placeholder="Paste Python error message or traceback..."
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 font-mono"
                />

                <button
                  onClick={handleDiagnoseError}
                  disabled={inspectLoading}
                  className="w-full py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold transition-colors"
                >
                  {inspectLoading ? "Analyzing..." : "Diagnose Root Cause"}
                </button>

                {diagnosisResult && (
                  <div className="p-3 rounded-xl border border-sky-500/20 bg-sky-500/5 text-xs space-y-2">
                    <div className="font-bold text-sky-700 dark:text-sky-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Root-Cause Analysis
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-[11px]">
                      {diagnosisResult.diagnosis}
                    </p>
                    {diagnosisResult.identified_file && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400 font-mono">
                        Identified: {diagnosisResult.identified_file} (Line {diagnosisResult.identified_line})
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Advanced History Management & Inter-Brain Stream (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* History Management Controls Bar */}
          <div className="rounded-3xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 shadow-sm space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-bold text-sm text-gray-900 dark:text-white flex items-center gap-2">
                  <Database className="w-4 h-4 text-sky-500" />
                  Inter-Brain Bus Dialogue History & Audit Log
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Full deterministic audit trail of autonomous deliberations, decisions, and token consumption.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setHistorySortOrder(historySortOrder === "newest" ? "oldest" : "newest")}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                  title="Toggle Chronological Sort Order"
                >
                  <Clock className="w-3 h-3 text-sky-500" />
                  {historySortOrder === "newest" ? "Newest First" : "Oldest First"}
                </button>

                <button
                  onClick={downloadHistoryJson}
                  className="px-2.5 py-1.5 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-[11px] font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors flex items-center gap-1"
                  title="Export dialogue audit log as JSON"
                >
                  <Download className="w-3 h-3 text-emerald-500" />
                  Export JSON
                </button>
              </div>
            </div>

            {/* Search Input Bar */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={historySearchQuery}
                onChange={(e) => setHistorySearchQuery(e.target.value)}
                placeholder="Search history by content, reason, policy, phone (+91...), or decision..."
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 placeholder:text-gray-400"
              />
              {historySearchQuery && (
                <button
                  onClick={() => setHistorySearchQuery("")}
                  className="absolute right-2.5 top-2.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Category Chips */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                onClick={() => setHistoryCategoryFilter("all")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "all"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                All Messages ({messages.length})
              </button>

              <button
                onClick={() => setHistoryCategoryFilter("requests")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "requests"
                    ? "bg-sky-600 text-white shadow-sm"
                    : "bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                }`}
              >
                Task Requests & Responses
              </button>

              <button
                onClick={() => setHistoryCategoryFilter("denials")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "denials"
                    ? "bg-rose-600 text-white shadow-sm"
                    : "bg-rose-500/10 text-rose-700 dark:text-rose-400 hover:bg-rose-500/20"
                }`}
              >
                <XCircle className="w-3 h-3" />
                Autonomous Refusals (
                {messages.filter((m) => m.decision === "DENIED").length})
              </button>

              <button
                onClick={() => setHistoryCategoryFilter("approvals")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "approvals"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/20"
                }`}
              >
                <CheckCircle2 className="w-3 h-3" />
                Approvals (
                {messages.filter((m) => m.decision === "ACCEPTED").length})
              </button>

              <button
                onClick={() => setHistoryCategoryFilter("debriefs")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "debriefs"
                    ? "bg-purple-600 text-white shadow-sm"
                    : "bg-purple-500/10 text-purple-700 dark:text-purple-400 hover:bg-purple-500/20"
                }`}
              >
                <AlertTriangle className="w-3 h-3" />
                Debriefs (
                {messages.filter((m) => m.message_type === "DEBRIEF").length})
              </button>

              <button
                onClick={() => setHistoryCategoryFilter("gaps")}
                className={`text-[11px] px-2.5 py-1 rounded-xl transition-all font-medium flex items-center gap-1 ${
                  historyCategoryFilter === "gaps"
                    ? "bg-amber-600 text-white shadow-sm"
                    : "bg-amber-500/10 text-amber-700 dark:text-amber-400 hover:bg-amber-500/20"
                }`}
              >
                <Sparkles className="w-3 h-3" />
                Feature Gaps (
                {messages.filter((m) => m.message_type === "FEATURE_REQUEST").length})
              </button>
            </div>
          </div>

          {/* Timeline Stream */}
          <div className="space-y-3.5">
            {filteredMessages.length === 0 ? (
              <div className="p-12 text-center rounded-3xl border border-dashed border-gray-200 dark:border-zinc-800 text-gray-400 space-y-2 bg-white dark:bg-zinc-900">
                <Cpu className="w-8 h-8 mx-auto text-gray-300 dark:text-zinc-600" />
                <p className="text-sm font-medium">No matching inter-brain dialogues found.</p>
                <p className="text-xs text-gray-500">
                  {historySearchQuery
                    ? `No records match "${historySearchQuery}". Try clearing search.`
                    : "Use the test bench on the left to delegate tasks or trigger autonomous debriefs."}
                </p>
                {historySearchQuery && (
                  <button
                    onClick={() => {
                      setHistorySearchQuery("");
                      setHistoryCategoryFilter("all");
                    }}
                    className="mt-2 text-xs px-3 py-1.5 rounded-xl bg-sky-600 text-white font-medium shadow-sm"
                  >
                    Clear Filter
                  </button>
                )}
              </div>
            ) : (
              filteredMessages.map((msg) => {
                const isFriday = msg.sender_brain === "FRIDAY";
                const isDenied = msg.decision === "DENIED";
                const isAccepted = msg.decision === "ACCEPTED";
                const isDebrief = msg.message_type === "DEBRIEF";
                const isFeatureGap = msg.message_type === "FEATURE_REQUEST";
                const isExpanded = expandedMsgId === msg.id;

                // Estimate approximate tokens and cost for this single packet
                const approxTokens = Math.max(80, Math.round((msg.content?.length || 0) / 3.8 + 120));
                const approxCost = isFriday ? approxTokens * 0.00000015 : approxTokens * 0.00000045;

                return (
                  <div
                    key={msg.id}
                    className={`p-4 rounded-3xl border transition-all duration-200 shadow-sm ${
                      isDenied
                        ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/20"
                        : isDebrief
                        ? "border-purple-500/30 bg-purple-500/5 dark:bg-purple-950/20"
                        : isFeatureGap
                        ? "border-amber-500/30 bg-amber-500/5 dark:bg-amber-950/20"
                        : isAccepted
                        ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20"
                        : "border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900"
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            isFriday
                              ? "bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300 border border-sky-500/20"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20"
                          }`}
                        >
                          {msg.sender_brain} → {msg.recipient_brain}
                        </span>

                        <span className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                          {msg.message_type.replace(/_/g, " ")}
                        </span>

                        {msg.decision && (
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase flex items-center gap-1 ${
                              isDenied
                                ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300 border border-rose-500/20"
                                : isAccepted
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 border border-emerald-500/20"
                                : "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-300"
                            }`}
                          >
                            {isDenied && <XCircle className="w-3 h-3" />}
                            {isAccepted && <CheckCircle2 className="w-3 h-3" />}
                            {msg.decision}
                          </span>
                        )}

                        {/* Token Footprint Badge */}
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-700">
                          ~{approxTokens} tok • ${approxCost.toFixed(6)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {msg.created_at ? new Date(msg.created_at).toLocaleTimeString() : "Just now"}
                        </span>

                        <button
                          onClick={() => setExpandedMsgId(isExpanded ? null : msg.id)}
                          className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-[10px] font-mono text-gray-600 dark:text-gray-400 transition-colors flex items-center gap-0.5"
                          title="Inspect raw bus event JSON payload"
                        >
                          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                          JSON
                        </button>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-normal">
                      {msg.content}
                    </div>

                    {/* Reasoning Rationale */}
                    {msg.reasoning && (
                      <div className="mt-2.5 pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex items-start gap-2 text-[11px] text-gray-600 dark:text-gray-300">
                        <Info className="w-3.5 h-3.5 text-sky-500 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-semibold text-gray-800 dark:text-gray-100">
                            Independent Commercial Rationale:{" "}
                          </strong>
                          {msg.reasoning}
                        </div>
                      </div>
                    )}

                    {/* Expandable Raw JSON Inspector */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-gray-200/60 dark:border-zinc-800/80 space-y-2">
                        <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                          <span>Raw Bus Message Packet ID: {msg.id}</span>
                          <button
                            onClick={() => copyJsonPayload(msg.id, msg)}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold text-sky-600 dark:text-sky-400 hover:underline"
                          >
                            {copiedMsgId === msg.id ? (
                              <>
                                <Check className="w-3 h-3 text-emerald-500" />
                                Copied to Clipboard
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy JSON
                              </>
                            )}
                          </button>
                        </div>
                        <pre className="p-3 rounded-2xl bg-zinc-950 text-sky-300 text-[10px] font-mono overflow-x-auto max-h-48 overflow-y-auto leading-relaxed border border-zinc-800">
                          {JSON.stringify(msg, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
