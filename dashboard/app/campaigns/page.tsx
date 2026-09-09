"use client";

import React, { useState, useEffect } from "react";
import {
  Send,
  Play,
  Pause,
  Clock,
  ShieldCheck,
  Flame,
  Users,
  CheckCircle2,
  Plus,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  Bot,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Trash2,
  Check,
  X,
  Radio,
  Calendar,
  Layers,
  HelpCircle,
} from "lucide-react";

interface CampaignLeadStats {
  total_leads: number;
  sent_count: number;
  delivered_count: number;
  replied_count: number;
  failed_count: number;
  opted_out_count: number;
  response_rate: number;
  delivery_rate: number;
}

interface CampaignItem {
  id: string;
  name: string;
  description?: string;
  target_segment: string;
  lead_filter?: Record<string, any>;
  initial_message_template: string;
  daily_limit: number;
  status: "active" | "paused" | "completed" | "draft";
  scheduling_window?: {
    start_hour: number;
    end_hour: number;
    days_of_week: number[];
  };
  jitter_min_seconds: number;
  jitter_max_seconds: number;
  stop_conditions?: {
    max_replies?: number;
    min_response_rate?: number;
  };
  retry_config?: {
    max_attempts: number;
    delay_hours: number;
  };
  opt_out_handling: string;
  personalization_enabled: boolean;
  actor?: string;
  stats: CampaignLeadStats;
  created_at: string;
  updated_at: string;
}

interface SegmentInfo {
  segment_value: string;
  lead_count: number;
  field: string;
}

interface EdithSummary {
  total_messages_sent: number;
  total_leads_contacted: number;
  total_replies: number;
  overall_response_rate: number;
  sent_today: number;
  replied_today: number;
  active_campaigns_count: number;
  total_campaigns_count: number;
}

interface DraftResult {
  draft_id: string;
  draft: Record<string, any>;
  validation: {
    verdict: "ACCEPTED" | "FLAGGED" | "DENIED";
    is_valid: boolean;
    reasoning: string;
    issues: string[];
    recommendations: string[];
    matched_lead_count: number;
  };
  friday_explanation: string;
  edith_verdict: string;
  edith_reasoning: string;
  matched_lead_count: number;
  ready_to_launch: boolean;
}

const DEFAULT_SEGMENTS: SegmentInfo[] = [
  { segment_value: "all", lead_count: 0, field: "all" },
  { segment_value: "B2B Commercial Accounts", lead_count: 0, field: "company_type" },
  { segment_value: "Enterprise & Corporate", lead_count: 0, field: "company_type" },
  { segment_value: "Distributors & Retail", lead_count: 0, field: "company_type" },
  { segment_value: "Specialty & Boutique", lead_count: 0, field: "company_type" },
];

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<CampaignItem[]>([]);
  const [segments, setSegments] = useState<SegmentInfo[]>(DEFAULT_SEGMENTS);
  const [edithSummary, setEdithSummary] = useState<EdithSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Create Campaign Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newSegment, setNewSegment] = useState("all");
  const [newQuota, setNewQuota] = useState(50);
  const [newTemplate, setNewTemplate] = useState(
    "Hi {name}, hope things are running smoothly at {company_name}! We provide direct wholesale pricing and priority delivery in {city}. Would you like to view our commercial catalog?"
  );
  const [startHour, setStartHour] = useState(9);
  const [endHour, setEndHour] = useState(18);
  const [activeDays, setActiveDays] = useState<number[]>([1, 2, 3, 4, 5]); // Mon-Fri
  const [jitterMin, setJitterMin] = useState(25);
  const [jitterMax, setJitterMax] = useState(45);
  const [stopReplies, setStopReplies] = useState<number | "">(20);
  const [stopRate, setStopRate] = useState<number | "">(5.0);
  const [retryAttempts, setRetryAttempts] = useState(3);
  const [retryDelay, setRetryDelay] = useState(24);
  const [optOutAction, setOptOutAction] = useState("stop");
  const [personalizationEnabled, setPersonalizationEnabled] = useState(true);
  const [creating, setCreating] = useState(false);

  // Chat-Driven Campaign Creation Panel State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [draftResult, setDraftResult] = useState<DraftResult | null>(null);
  const [launchingDraft, setLaunchingDraft] = useState(false);

  // Live count for currently selected segment in modal
  const selectedSegmentObj = segments.find((s) => s.segment_value === newSegment);
  const currentSegmentCount = selectedSegmentObj ? selectedSegmentObj.lead_count : 0;
  const isZeroLeads = currentSegmentCount === 0;

  // Load real campaigns, segments, and EDITH activity summary from backend API
  const loadData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [cRes, sRes, eRes] = await Promise.all([
        fetch("/api/v1/campaigns"),
        fetch("/api/v1/campaigns/segments"),
        fetch("/api/v1/edith/activity/summary"),
      ]);

      if (cRes.ok) {
        const cData = await cRes.json();
        setCampaigns(cData);
      }
      if (sRes.ok) {
        const sData = await sRes.json();
        if (Array.isArray(sData) && sData.length > 0) {
          setSegments(sData);
        }
      }
      if (eRes.ok) {
        const eData = await eRes.json();
        setEdithSummary(eData);
      }
    } catch (err) {
      setErrorMessage("Unable to connect to campaigns API. Please verify backend service status.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Pause or Resume a Campaign via real backend API
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const action = currentStatus === "active" ? "pause" : "resume";
    setActionLoading(id);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/v1/campaigns/${id}/${action}`, { method: "POST" });
      if (res.ok) {
        const updated = await res.json();
        setCampaigns((prev) => prev.map((c) => (c.id === id ? updated : c)));
        // Refresh summary
        fetch("/api/v1/edith/activity/summary")
          .then((r) => r.ok && r.json())
          .then((d) => setEdithSummary(d));
      } else {
        const err = await res.json();
        setErrorMessage(err.detail || `Failed to ${action} campaign`);
      }
    } catch {
      setErrorMessage(`Network error while trying to ${action} campaign.`);
    } finally {
      setActionLoading(null);
    }
  };

  // Create Campaign via real API
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    if (isZeroLeads) {
      setErrorMessage(
        `Cannot launch campaign: 0 leads match target segment '${newSegment}'. Please upload matching leads on the Leads page before launching.`
      );
      return;
    }

    setCreating(true);
    setErrorMessage(null);

    const payload = {
      name: newName.trim(),
      target_segment: newSegment,
      initial_message_template: newTemplate.trim(),
      daily_limit: newQuota,
      scheduling_window: {
        start_hour: startHour,
        end_hour: endHour,
        days_of_week: activeDays,
      },
      jitter_min_seconds: jitterMin,
      jitter_max_seconds: jitterMax,
      stop_conditions: {
        max_replies: stopReplies === "" ? null : Number(stopReplies),
        min_response_rate: stopRate === "" ? null : Number(stopRate),
      },
      retry_config: {
        max_attempts: retryAttempts,
        delay_hours: retryDelay,
      },
      opt_out_handling: optOutAction,
      personalization_enabled: personalizationEnabled,
    };

    try {
      // Step 1: Create campaign
      const createRes = await fetch("/api/v1/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const err = await createRes.json();
        throw new Error(err.detail || "Failed to create campaign");
      }

      const createdCampaign: CampaignItem = await createRes.json();

      // Step 2: Launch campaign immediately
      const launchRes = await fetch(`/api/v1/campaigns/${createdCampaign.id}/launch`, {
        method: "POST",
      });

      if (!launchRes.ok) {
        const err = await launchRes.json();
        throw new Error(err.detail || "Campaign created as draft, but launch failed.");
      }

      const launchedCampaign: CampaignItem = await launchRes.json();
      setCampaigns([launchedCampaign, ...campaigns.filter((c) => c.id !== launchedCampaign.id)]);
      setIsCreateOpen(false);
      setNewName("");
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred during campaign creation.");
    } finally {
      setCreating(false);
    }
  };

  // Chat-Driven Drafting via Friday & EDITH
  const handleChatDraft = async () => {
    if (!chatPrompt.trim()) return;
    setChatLoading(true);
    setErrorMessage(null);
    setDraftResult(null);

    try {
      const res = await fetch("/api/v1/brain/campaign-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: chatPrompt.trim() }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Friday and EDITH were unable to draft the campaign.");
      }

      const data: DraftResult = await res.json();
      setDraftResult(data);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to draft campaign from chat instruction.");
    } finally {
      setChatLoading(false);
    }
  };

  // Launch the campaign drafted by Friday & validated by EDITH
  const handleLaunchDraft = async () => {
    if (!draftResult) return;
    setLaunchingDraft(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/v1/brain/campaign-draft/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ draft: draftResult.draft, launch: true }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Failed to launch drafted campaign.");
      }

      const outcome = await res.json();
      setIsChatOpen(false);
      setChatPrompt("");
      setDraftResult(null);
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to launch drafted campaign.");
    } finally {
      setLaunchingDraft(false);
    }
  };

  // Transfer draft values into the full Create modal so operator can review/edit
  const handleTransferToModal = () => {
    if (!draftResult) return;
    const d = draftResult.draft;
    setNewName(d.name || "");
    setNewSegment(d.target_segment || "all");
    setNewQuota(d.daily_limit || 50);
    setNewTemplate(d.initial_message_template || "");
    setJitterMin(d.jitter_min_seconds || 25);
    setJitterMax(d.jitter_max_seconds || 45);
    setPersonalizationEnabled(d.personalization_enabled ?? true);
    if (d.stop_on_replies) setStopReplies(d.stop_on_replies);
    if (d.stop_below_response_rate) setStopRate(d.stop_below_response_rate);
    setIsChatOpen(false);
    setIsCreateOpen(true);
  };

  const toggleDay = (day: number) => {
    if (activeDays.includes(day)) {
      if (activeDays.length > 1) setActiveDays(activeDays.filter((d) => d !== day));
    } else {
      setActiveDays([...activeDays, day].sort());
    }
  };

  const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[var(--ed-border)] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[var(--ed-text-primary)] flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-xs">
              <Send className="w-5 h-5" />
            </span>
            Automated B2B Campaign Drip & Anti-Ban Outreach
          </h1>
          <p className="text-xs text-[var(--ed-text-muted)] mt-1">
            Cold outreach campaigns grounded in real uploaded CRM leads, randomized jitter pacing (25–45s), and autonomous EDITH handoff.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Create with Friday Button */}
          <button
            onClick={() => {
              setIsChatOpen(!isChatOpen);
              setDraftResult(null);
            }}
            className="ed-press ed-focus-ring inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600/20 to-blue-600/20 hover:from-purple-600/30 hover:to-blue-600/30 text-purple-300 border border-purple-500/30 shadow-sm transition-all"
          >
            <Bot className="w-4 h-4 text-purple-400" />
            Create with Friday
          </button>

          {/* Create Campaign Modal Button */}
          <button
            onClick={() => setIsCreateOpen(true)}
            className="ed-btn-primary ed-press ed-focus-ring inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold shadow-md transition-all"
          >
            <Plus className="w-4 h-4" /> Create Campaign
          </button>

          {/* Refresh Button */}
          <button
            onClick={loadData}
            title="Refresh campaign telemetry"
            className="p-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start justify-between gap-3 text-xs animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-300">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Section 6: Interactive Chat-Driven Campaign Creation Panel */}
      {isChatOpen && (
        <div className="p-5 rounded-2xl bg-gradient-to-b from-purple-950/20 to-[var(--ed-surface)] border border-purple-500/30 shadow-xl space-y-4 animate-in slide-in-from-top-3 duration-200">
          <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                  Chat-Driven Campaign Creation
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    Friday & EDITH Inter-Brain
                  </span>
                </h3>
                <p className="text-[11px] text-[var(--ed-text-muted)]">
                  Describe your desired audience, offer, tone, and pacing. Friday drafts the campaign, and EDITH validates compliance against commercial guardrails.
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsChatOpen(false)}
              className="p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={chatPrompt}
              onChange={(e) => setChatPrompt(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !chatLoading && handleChatDraft()}
              placeholder="e.g. Launch a campaign for Cafe and Restaurant owners offering our 10% wholesale discount with 40 messages per day, personalized."
              className="flex-1 px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-[var(--ed-bg)] text-xs text-[var(--ed-text-primary)] focus:outline-none focus:ring-1 focus:ring-purple-500 placeholder-[var(--ed-text-muted)]"
            />
            <button
              onClick={handleChatDraft}
              disabled={chatLoading || !chatPrompt.trim()}
              className="px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 shadow-md transition-all shrink-0"
            >
              {chatLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Drafting...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Draft Campaign
                </>
              )}
            </button>
          </div>

          {/* Render Draft and EDITH Validation Result */}
          {draftResult && (
            <div className="p-4 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] space-y-3.5 text-xs">
              {/* Friday Draft Summary */}
              <div className="flex items-start gap-2.5 border-b border-[var(--ed-border)] pb-3">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1 flex-1">
                  <div className="font-bold text-[var(--ed-text-primary)]">Friday's Draft Specification:</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px]">
                    <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                      <span className="text-[10px] text-[var(--ed-text-muted)] block">Campaign Name</span>
                      <strong className="text-[var(--ed-text-primary)]">{draftResult.draft.name}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                      <span className="text-[10px] text-[var(--ed-text-muted)] block">Target Segment</span>
                      <strong className="text-[var(--ed-text-primary)]">{draftResult.draft.target_segment}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                      <span className="text-[10px] text-[var(--ed-text-muted)] block">Matching CRM Leads</span>
                      <strong
                        className={
                          draftResult.matched_lead_count > 0 ? "text-emerald-400" : "text-red-400"
                        }
                      >
                        {draftResult.matched_lead_count} real leads
                      </strong>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)]">
                      <span className="text-[10px] text-[var(--ed-text-muted)] block">Daily Quota</span>
                      <strong className="text-[var(--ed-text-primary)]">
                        {draftResult.draft.daily_limit} msgs/day
                      </strong>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[var(--ed-surface)] border border-[var(--ed-border)] mt-2">
                    <span className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                      Drafted Outreach Message:
                    </span>
                    <p className="text-[11px] text-[var(--ed-text-primary)] italic">
                      "{draftResult.draft.initial_message_template}"
                    </p>
                  </div>
                </div>
              </div>

              {/* EDITH Validation Evaluation */}
              <div className="flex items-start gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0 mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[var(--ed-text-primary)]">
                      EDITH Autonomous Guardrail Verdict:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        draftResult.edith_verdict === "ACCEPTED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : draftResult.edith_verdict === "FLAGGED"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          : "bg-red-500/20 text-red-400 border border-red-500/30"
                      }`}
                    >
                      ● {draftResult.edith_verdict}
                    </span>
                  </div>
                  <p className="text-[11px] text-[var(--ed-text-muted)]">
                    {draftResult.edith_reasoning}
                  </p>

                  {draftResult.validation.issues.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {draftResult.validation.issues.map((issue, idx) => (
                        <div key={idx} className="flex items-center gap-1.5 text-[11px] text-amber-400">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>{issue}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Draft Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[var(--ed-border)]">
                <button
                  onClick={handleTransferToModal}
                  className="px-3.5 py-1.5 rounded-xl border border-[var(--ed-border)] text-xs text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] flex items-center gap-1.5"
                >
                  <Sliders className="w-3.5 h-3.5" /> Customize in Modal
                </button>
                <button
                  onClick={handleLaunchDraft}
                  disabled={launchingDraft || !draftResult.ready_to_launch}
                  className={`px-4 py-1.5 rounded-xl text-xs font-semibold shadow-md flex items-center gap-2 transition-all ${
                    draftResult.ready_to_launch
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-gray-700 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {launchingDraft ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enrolling Leads & Launching...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5" /> Approve & Launch Campaign
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Safety & Real Observability Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--ed-text-primary)] text-xs">Anti-Ban Protection</div>
            <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
              Jitter <strong>25s–45s</strong> enforced
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--ed-text-primary)] text-xs">Messages Dispatched</div>
            <div className="text-sm font-bold text-blue-400 font-data mt-0.5">
              {edithSummary ? edithSummary.total_messages_sent : 0}{" "}
              <span className="text-[10px] text-[var(--ed-text-muted)] font-normal">
                ({edithSummary ? edithSummary.sent_today : 0} today)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--ed-text-primary)] text-xs">Buyer Replies</div>
            <div className="text-sm font-bold text-purple-400 font-data mt-0.5">
              {edithSummary ? edithSummary.total_replies : 0}{" "}
              <span className="text-[10px] text-[var(--ed-text-muted)] font-normal">
                ({edithSummary ? edithSummary.overall_response_rate : 0}% rate)
              </span>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[var(--ed-surface)] border border-[var(--ed-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-[var(--ed-text-primary)] text-xs">Real Contacted Leads</div>
            <div className="text-sm font-bold text-amber-400 font-data mt-0.5">
              {edithSummary ? edithSummary.total_leads_contacted : 0} distinct leads
            </div>
          </div>
        </div>
      </div>

      {/* Campaign Cards List (Real Data from Database) */}
      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="p-12 text-center text-xs text-[var(--ed-text-muted)] flex flex-col items-center gap-2">
            <RefreshCw className="w-6 h-6 animate-spin text-red-500" />
            <span>Loading real campaign telemetry from database...</span>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-12 text-center rounded-2xl bg-[var(--ed-surface)] border border-[var(--ed-border)] space-y-3">
            <Send className="w-8 h-8 text-[var(--ed-text-muted)] mx-auto opacity-50" />
            <h3 className="font-bold text-sm text-[var(--ed-text-primary)]">No Campaigns Active Yet</h3>
            <p className="text-xs text-[var(--ed-text-muted)] max-w-md mx-auto">
              Every campaign is linked directly to real leads in your database. Create a campaign targeting your uploaded lead segments or ask Friday to draft one for you.
            </p>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => setIsChatOpen(true)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30"
              >
                Create with Friday
              </button>
              <button
                onClick={() => setIsCreateOpen(true)}
                className="ed-btn-primary px-4 py-2 rounded-xl text-xs font-semibold shadow-md"
              >
                Create Campaign
              </button>
            </div>
          </div>
        ) : (
          campaigns.map((c) => {
            const stats = c.stats || {
              total_leads: 0,
              sent_count: 0,
              replied_count: 0,
              response_rate: 0,
            };
            const progressPct =
              stats.total_leads > 0 ? Math.round((stats.sent_count / stats.total_leads) * 100) : 0;

            return (
              <div key={c.id} className="ed-panel p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-sm text-[var(--ed-text-primary)]">{c.name}</h3>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          c.status === "active"
                            ? "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20"
                            : c.status === "paused"
                            ? "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                            : c.status === "draft"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-slate-500/10 text-slate-400 border border-slate-500/20"
                        }`}
                      >
                        ● {c.status}
                      </span>
                      <span className="text-[11px] text-[var(--ed-text-muted)]">
                        Target: <strong className="text-[var(--ed-text-primary)]">{c.target_segment}</strong>
                      </span>
                      {c.personalization_enabled && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> EDITH Personalized
                        </span>
                      )}
                      {c.actor === "friday_agent" && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          Agentic: Friday
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleStatus(c.id, c.status)}
                      disabled={actionLoading === c.id || c.status === "completed"}
                      className={`ed-press ed-focus-ring inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all ${
                        c.status === "active"
                          ? "bg-amber-500/10 text-amber-500 border border-amber-500/20 hover:bg-amber-500/20"
                          : "bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20"
                      }`}
                    >
                      {actionLoading === c.id ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : c.status === "active" ? (
                        <>
                          <Pause className="w-3.5 h-3.5" /> Pause Drip
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5" /> Resume Drip
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Real Stats & Progress Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)] block">Dispatch Progress</span>
                    <div className="font-bold text-[var(--ed-text-primary)] font-data text-sm mt-0.5">
                      {stats.sent_count} / {stats.total_leads}{" "}
                      <span className="text-xs text-[var(--ed-text-muted)] font-normal">
                        ({progressPct}%)
                      </span>
                    </div>
                    {/* Progress track */}
                    <div className="w-full bg-[var(--ed-surface)] h-1.5 rounded-full overflow-hidden mt-2">
                      <div
                        className="bg-blue-500 h-full rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, progressPct)}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)] block">Replied & Handoff</span>
                    <div className="font-bold text-emerald-500 font-data text-sm mt-0.5">
                      {stats.replied_count}{" "}
                      <span className="text-xs text-[var(--ed-text-muted)] font-normal">
                        ({stats.response_rate}% response rate)
                      </span>
                    </div>
                    <div className="text-[10px] text-[var(--ed-text-muted)] mt-2">
                      Verified from real lead replies
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)] block">Jitter Delay Safety</span>
                    <div className="font-bold text-[var(--ed-text-primary)] text-xs mt-0.5 truncate">
                      {c.jitter_min_seconds}s – {c.jitter_max_seconds}s (Randomized)
                    </div>
                    <div className="text-[10px] text-emerald-500 mt-2 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Anti-Ban Active
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)]">
                    <span className="text-[10px] text-[var(--ed-text-muted)] block">Daily Quota</span>
                    <div className="font-bold text-[var(--ed-text-primary)] font-data text-sm mt-0.5">
                      {c.daily_limit} msgs / day
                    </div>
                    <div className="text-[10px] text-[var(--ed-text-muted)] mt-2 truncate">
                      {c.scheduling_window
                        ? `${c.scheduling_window.start_hour}:00–${c.scheduling_window.end_hour}:00 UTC`
                        : "24/7 Window"}
                    </div>
                  </div>
                </div>

                {/* Template Preview & Auto Handoff Notice */}
                <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex-1">
                    <span className="text-[10px] uppercase font-bold text-[var(--ed-text-muted)] block mb-1">
                      Outreach Message Template
                    </span>
                    <p className="text-[11px] text-[var(--ed-text-primary)] italic line-clamp-1">
                      "{c.initial_message_template}"
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-[11px] font-semibold text-purple-400 shrink-0">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Transitions to EDITH on Buyer Reply</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Expanded Section 4 Create Campaign Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs overflow-y-auto">
          <div className="bg-[var(--ed-surface)] border border-[var(--ed-border)] rounded-2xl p-6 max-w-2xl w-full shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
              <h3 className="text-base font-bold text-[var(--ed-text-primary)] flex items-center gap-2">
                <Send className="w-5 h-5 text-red-500" /> Create New Outreach Campaign
              </h3>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="p-1 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              {/* Campaign Name */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Commercial Q4 Re-engagement Campaign"
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>

              {/* Target Segment with Live Count and Zero-Lead Blocking */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Target Segment *
                  </label>
                  <select
                    value={newSegment}
                    onChange={(e) => setNewSegment(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  >
                    {segments.map((seg) => (
                      <option key={seg.segment_value} value={seg.segment_value}>
                        {seg.segment_value} ({seg.lead_count} real leads)
                      </option>
                    ))}
                  </select>
                  {/* Live matching count alert */}
                  <div
                    className={`mt-1.5 text-[11px] font-semibold flex items-center gap-1.5 ${
                      isZeroLeads ? "text-red-400" : "text-emerald-400"
                    }`}
                  >
                    {isZeroLeads ? (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>0 leads match this segment. Upload leads before launching.</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                        <span>{currentSegmentCount} verified leads ready to enroll</span>
                      </>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Daily Volume Quota (Anti-Ban Safe: 10–100)
                  </label>
                  <input
                    type="number"
                    min="10"
                    max="100"
                    value={newQuota}
                    onChange={(e) => setNewQuota(parseInt(e.target.value, 10))}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  />
                  <span className="text-[10px] text-[var(--ed-text-muted)] mt-1 block">
                    Capped to 100/day to protect sender WhatsApp reputation.
                  </span>
                </div>
              </div>

              {/* Scheduling Window (Section 4) */}
              <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] space-y-2.5">
                <div className="font-bold text-[var(--ed-text-primary)] text-xs flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-400" /> Dispatch Scheduling Window
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                      Start Hour (UTC): {startHour}:00
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={startHour}
                      onChange={(e) => setStartHour(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                      End Hour (UTC): {endHour}:00
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="23"
                      value={endHour}
                      onChange={(e) => setEndHour(parseInt(e.target.value, 10))}
                      className="w-full"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                    Active Dispatch Days:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {dayNames.map((dName, idx) => {
                      const dayVal = idx + 1; // 1 = Mon, 7 = Sun
                      const isActive = activeDays.includes(dayVal);
                      return (
                        <button
                          key={dayVal}
                          type="button"
                          onClick={() => toggleDay(dayVal)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors ${
                            isActive
                              ? "bg-blue-600 text-white"
                              : "bg-[var(--ed-surface)] text-[var(--ed-text-muted)] border border-[var(--ed-border)]"
                          }`}
                        >
                          {dName}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Jitter Pacing Overrides (Section 4) */}
              <div className="p-3 rounded-xl bg-[var(--ed-bg)] border border-[var(--ed-border)] space-y-2">
                <div className="font-bold text-[var(--ed-text-primary)] text-xs flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Randomized Jitter Delay Range
                  </span>
                  <span className="text-[11px] text-emerald-400 font-data">
                    {jitterMin}s – {jitterMax}s
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                      Min Delay (Safe &ge; 15s): {jitterMin}s
                    </label>
                    <input
                      type="range"
                      min="15"
                      max="45"
                      value={jitterMin}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        setJitterMin(val);
                        if (val >= jitterMax) setJitterMax(val + 5);
                      }}
                      className="w-full"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[var(--ed-text-muted)] block mb-1">
                      Max Delay (&le; 90s): {jitterMax}s
                    </label>
                    <input
                      type="range"
                      min="20"
                      max="90"
                      value={jitterMax}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (val > jitterMin) setJitterMax(val);
                      }}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Stop Conditions & Safety (Section 4) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Auto-Pause After N Replies
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 20 (leave empty for none)"
                    value={stopReplies}
                    onChange={(e) =>
                      setStopReplies(e.target.value === "" ? "" : parseInt(e.target.value, 10))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Auto-Pause Below Response Rate %
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="100"
                    placeholder="e.g. 5.0 (leave empty for none)"
                    value={stopRate}
                    onChange={(e) =>
                      setStopRate(e.target.value === "" ? "" : parseFloat(e.target.value))
                    }
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  />
                </div>
              </div>

              {/* Opt-Out and Personalization Toggle (Section 4 & 5) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                    Opt-Out / Stop Handling
                  </label>
                  <select
                    value={optOutAction}
                    onChange={(e) => setOptOutAction(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                  >
                    <option value="stop">Stop campaign immediately for lead</option>
                    <option value="skip">Skip lead and continue campaign</option>
                    <option value="flag">Flag for operator review</option>
                  </select>
                </div>

                <div className="pt-4 flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="personalizationToggle"
                    checked={personalizationEnabled}
                    onChange={(e) => setPersonalizationEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-[var(--ed-bg)] border-[var(--ed-border)]"
                  />
                  <label
                    htmlFor="personalizationToggle"
                    className="text-xs text-[var(--ed-text-primary)] font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    EDITH Per-Lead Personalization
                  </label>
                </div>
              </div>

              {/* Outreach Template Textarea */}
              <div>
                <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] uppercase mb-1">
                  WhatsApp Message Template *
                </label>
                <div className="flex items-center gap-1.5 mb-1.5 text-[10px] text-[var(--ed-text-muted)]">
                  <span>Insert placeholders:</span>
                  <button
                    type="button"
                    onClick={() => setNewTemplate(newTemplate + " {name}")}
                    className="px-1.5 py-0.5 rounded bg-[var(--ed-bg)] border border-[var(--ed-border)] hover:text-white"
                  >
                    {"{name}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTemplate(newTemplate + " {company_name}")}
                    className="px-1.5 py-0.5 rounded bg-[var(--ed-bg)] border border-[var(--ed-border)] hover:text-white"
                  >
                    {"{company_name}"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTemplate(newTemplate + " {city}")}
                    className="px-1.5 py-0.5 rounded bg-[var(--ed-bg)] border border-[var(--ed-border)] hover:text-white"
                  >
                    {"{city}"}
                  </button>
                </div>
                <textarea
                  rows={3}
                  required
                  value={newTemplate}
                  onChange={(e) => setNewTemplate(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-bg)] text-[var(--ed-text-primary)] focus:outline-none"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex justify-end gap-2.5 pt-2 border-t border-[var(--ed-border)]">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating || isZeroLeads}
                  className={`px-5 py-2 rounded-xl text-white font-semibold shadow-md flex items-center gap-2 ${
                    isZeroLeads
                      ? "bg-gray-700 text-gray-400 cursor-not-allowed"
                      : "ed-btn-primary"
                  }`}
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Launching...
                    </>
                  ) : (
                    "Launch Drip Campaign"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
