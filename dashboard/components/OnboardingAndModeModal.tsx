"use client";

import React, { useEffect, useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Smartphone,
  QrCode,
  ShieldCheck,
  Sparkles,
  Sliders,
  Building2,
  X,
  Send,
  LogOut,
  Layers,
  Check,
  ExternalLink,
  Wand2,
} from "lucide-react";

export interface WorkspaceConfigState {
  ui_mode: "simplified" | "advanced";
  onboarding_completed: boolean;
  industry_preset_id: string;
  business_name: string;
  business_industry: string;
  business_tagline: string;
  business_description?: string;
  catalog_unit: string;
  currency_symbol: string;
  owner_whatsapp_number: string;
  whatsapp_connection_mode?: "unofficial" | "official";
  meta_phone_number_id?: string;
  meta_waba_id?: string;
  meta_access_token?: string;
  meta_verify_token?: string;
  whatsapp_connected: boolean;
  unofficial_bridge_connected?: boolean;
  official_meta_configured?: boolean;
  bot_whatsapp_number: string;
  bridge_owner_phone?: string;
  qr_available: boolean;
  pairing_code?: string | null;
  feature_toggles: Record<string, boolean>;
  industry_presets?: Array<{
    id: string;
    name: string;
    icon: string;
    business_name: string;
    business_industry: string;
    business_tagline: string;
    catalog_unit: string;
    currency_symbol: string;
    is_custom?: boolean;
  }>;
}

interface VerificationCheck {
  id: string;
  title: string;
  status: "passed" | "warning" | "action_required" | "failed";
  detail: string;
}

interface OnboardingAndModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: WorkspaceConfigState;
  onConfigUpdated: (newConfig: WorkspaceConfigState) => void;
  initialTab?: "whatsapp_owner" | "industry_features" | "verification";
}

export const FEATURE_METADATA: Array<{
  key: string;
  label: string;
  description: string;
  category: "Core Business" | "Growth & Automation" | "Developer & AI Brains";
}> = [
  {
    key: "voice_copilot",
    label: "Friday Live Voice & Action Copilot",
    description: "Floating voice orb & chat bar to navigate pages, scroll, and execute multi-step tasks.",
    category: "Core Business",
  },
  {
    key: "conversations_inbox",
    label: "Live WhatsApp Customer Inbox",
    description: "Real-time WhatsApp & web conversation threads with manual override and media history.",
    category: "Core Business",
  },
  {
    key: "leads_crm",
    label: "Leads & Pipeline Scoring CRM",
    description: "Automatic lead qualification, intent scoring, and B2B/D2C pipeline stages.",
    category: "Core Business",
  },
  {
    key: "orders_invoices",
    label: "Orders, Deals & GST Invoices",
    description: "Automated order capture, PDF proforma/GST invoice generation, and payment tracking.",
    category: "Core Business",
  },
  {
    key: "analytics",
    label: "Revenue & Conversion Analytics",
    description: "Executive KPI cards, conversion funnels, and revenue velocity charts.",
    category: "Core Business",
  },
  {
    key: "dynamic_pricing",
    label: "Product Catalog & Dynamic Pricing",
    description: "Manage SKU inventory, volume discount tiers, and negotiation floor guardrails.",
    category: "Core Business",
  },
  {
    key: "campaigns",
    label: "WhatsApp Broadcast Campaigns",
    description: "Targeted outbound promotional blasts and re-engagement campaigns.",
    category: "Growth & Automation",
  },
  {
    key: "followups",
    label: "Autonomous Follow-Up Cadence",
    description: "20-minute, 8-hour, and 7-day automated nudge sequences for inactive prospects.",
    category: "Growth & Automation",
  },
  {
    key: "handoffs",
    label: "Human Escalation & Handoff Queue",
    description: "Priority alert queue when customers request human intervention or custom contracts.",
    category: "Growth & Automation",
  },
  {
    key: "dual_brain_console",
    label: "Dual-Brain Synaptic Console (/brain)",
    description: "Live neural deliberation bridge between Friday (Gemini) and EDITH (NVIDIA NIM).",
    category: "Developer & AI Brains",
  },
  {
    key: "ai_playground",
    label: "AI Negotiation Simulator (/playground)",
    description: "Sandbox testing environment for multi-model sales negotiation and latency benchmarks.",
    category: "Developer & AI Brains",
  },
  {
    key: "knowledge_rag",
    label: "Knowledge Base & Document RAG (/knowledge)",
    description: "Vectorized company policies, brochures, and FAQs for grounded AI responses.",
    category: "Developer & AI Brains",
  },
  {
    key: "modular_prompts",
    label: "Prompt Studio & Guardrails (/prompts)",
    description: "System prompt engineering, persona rules, and commercial margin guardrails.",
    category: "Developer & AI Brains",
  },
];

export default function OnboardingAndModeModal({
  isOpen,
  onClose,
  config,
  onConfigUpdated,
  initialTab = "whatsapp_owner",
}: OnboardingAndModeModalProps) {
  const [activeTab, setActiveTab] = useState<"whatsapp_owner" | "industry_features" | "verification">(initialTab);
  const [waMode, setWaMode] = useState<"unofficial" | "official">(config.whatsapp_connection_mode || "unofficial");
  const [metaPhoneId, setMetaPhoneId] = useState(config.meta_phone_number_id || "");
  const [metaWabaId, setMetaWabaId] = useState(config.meta_waba_id || "");
  const [metaAccessToken, setMetaAccessToken] = useState(config.meta_access_token || "");
  const [metaVerifyToken, setMetaVerifyToken] = useState(config.meta_verify_token || "wb_agent_verify_token");

  const [ownerPhoneInput, setOwnerPhoneInput] = useState(config.owner_whatsapp_number || "");
  const [pairPhoneInput, setPairPhoneInput] = useState("");
  const [pairingCodeResult, setPairingCodeResult] = useState<string | null>(config.pairing_code || null);
  const [businessNameInput, setBusinessNameInput] = useState(config.business_name || "");
  const [businessIndustryInput, setBusinessIndustryInput] = useState(config.business_industry || "");
  const [businessTaglineInput, setBusinessTaglineInput] = useState(config.business_tagline || "");
  const [catalogUnitInput, setCatalogUnitInput] = useState(config.catalog_unit || "unit");

  // AI Auto-fill inside modal
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiFilling, setIsAiFilling] = useState(false);

  const [saving, setSaving] = useState(false);
  const [resettingWa, setResettingWa] = useState(false);
  const [requestingPair, setRequestingPair] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [qrRefreshKey, setQrRefreshKey] = useState<number>(Date.now());

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);

  useEffect(() => {
    setOwnerPhoneInput(config.owner_whatsapp_number || "");
    setBusinessNameInput(config.business_name || "");
    setBusinessIndustryInput(config.business_industry || "");
    setBusinessTaglineInput(config.business_tagline || "");
    setCatalogUnitInput(config.catalog_unit || "unit");
    if (config.whatsapp_connection_mode) setWaMode(config.whatsapp_connection_mode);
    if (config.meta_phone_number_id !== undefined) setMetaPhoneId(config.meta_phone_number_id || "");
    if (config.meta_waba_id !== undefined) setMetaWabaId(config.meta_waba_id || "");
    if (config.meta_access_token !== undefined) setMetaAccessToken(config.meta_access_token || "");
    if (config.meta_verify_token !== undefined) setMetaVerifyToken(config.meta_verify_token || "wb_agent_verify_token");
    if (config.pairing_code) {
      setPairingCodeResult(config.pairing_code);
    }
  }, [
    config.owner_whatsapp_number,
    config.business_name,
    config.business_industry,
    config.business_tagline,
    config.catalog_unit,
    config.whatsapp_connection_mode,
    config.meta_phone_number_id,
    config.meta_waba_id,
    config.meta_access_token,
    config.meta_verify_token,
    config.pairing_code,
  ]);

  useEffect(() => {
    if (isOpen && activeTab === "verification") {
      runVerification(false);
    }
  }, [isOpen, activeTab]);

  if (!isOpen) return null;

  const showToast = (msg: string) => {
    setStatusToast(msg);
    setTimeout(() => setStatusToast(null), 4000);
  };

  const saveWorkspacePatch = async (patch: Partial<WorkspaceConfigState>, toastMsg?: string) => {
    setSaving(true);
    try {
      const resp = await fetch("/api/v1/settings/workspace-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.config) {
          onConfigUpdated(data.config);
        }
        if (toastMsg) showToast(toastMsg);
      }
    } catch {
      showToast("Failed to save workspace configuration.");
    } finally {
      setSaving(false);
    }
  };

  const handleAiAutoFill = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiFilling(true);
    try {
      const res = await fetch("/api/v1/settings/ai-autofill-business", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: aiPrompt.trim(),
          seed_catalog: true,
          save_as_preset: true,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.config) {
          onConfigUpdated(data.config);
        }
        showToast(
          `✨ AI configured "${data.synthesized?.business_name}" & seeded ${data.seeded_products || 4} catalog products!`
        );
        setAiPrompt("");
      }
    } catch {
      showToast("Could not run AI auto-fill.");
    } finally {
      setIsAiFilling(false);
    }
  };

  const handleResetWhatsAppSession = async () => {
    setResettingWa(true);
    setPairingCodeResult(null);
    try {
      const resp = await fetch("/api/v1/settings/whatsapp-reset", { method: "POST" });
      if (resp.ok) {
        showToast("WhatsApp session cleared! Generating fresh QR code for new number...");
        setTimeout(() => {
          setQrRefreshKey(Date.now());
          saveWorkspacePatch({});
        }, 2200);
      }
    } catch {
      showToast("Could not reach WhatsApp bridge on port 3001.");
    } finally {
      setResettingWa(false);
    }
  };

  const handleRequestPairingCode = async () => {
    const clean = pairPhoneInput.replace(/[^0-9]/g, "");
    if (clean.length < 10) {
      showToast("Enter a valid phone number with country code (e.g. 919876543210).");
      return;
    }
    setRequestingPair(true);
    try {
      const resp = await fetch("/api/v1/settings/whatsapp-pair", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: clean }),
      });
      const data = await resp.json();
      if (data.code) {
        setPairingCodeResult(data.code);
        showToast(`Pairing code generated: ${data.code}`);
      } else {
        showToast(data.error || "Could not generate pairing code. Try Reset Session first.");
      }
    } catch {
      showToast("Error requesting pairing code from bridge.");
    } finally {
      setRequestingPair(false);
    }
  };

  const handleApplyPreset = async (presetId: string) => {
    setApplyingPreset(presetId);
    try {
      const resp = await fetch("/api/v1/settings/industry-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: presetId, seed_sample_catalog: true }),
      });
      if (resp.ok) {
        const data = await resp.json();
        if (data.config) {
          onConfigUpdated(data.config);
          showToast(`Switched to ${data.config.business_industry} (${data.seeded_products || 4} catalog items ready)!`);
        }
      }
    } catch {
      showToast("Failed to apply industry preset.");
    } finally {
      setApplyingPreset(null);
    }
  };

  const handleToggleFeature = async (featureKey: string) => {
    const currentVal = config.feature_toggles?.[featureKey] !== false;
    const nextToggles = {
      ...(config.feature_toggles || {}),
      [featureKey]: !currentVal,
    };
    await saveWorkspacePatch(
      { feature_toggles: nextToggles },
      `${featureKey.replace(/_/g, " ")} ${!currentVal ? "enabled" : "disabled"}`
    );
  };

  const runVerification = async (sendPing: boolean) => {
    setVerifying(true);
    try {
      const resp = await fetch("/api/v1/settings/verify-end-to-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ send_test_ping: sendPing }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setChecks(data.checks || []);
        if (sendPing) {
          showToast("Verification complete & live test ping dispatched to Owner WhatsApp!");
        }
      }
    } catch {
      showToast("Verification check failed to reach backend.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    await saveWorkspacePatch(
      {
        onboarding_completed: true,
        whatsapp_connection_mode: waMode,
        meta_phone_number_id: metaPhoneId.trim(),
        meta_waba_id: metaWabaId.trim(),
        meta_access_token: metaAccessToken.trim(),
        meta_verify_token: metaVerifyToken.trim(),
        owner_whatsapp_number: ownerPhoneInput.trim(),
        business_name: businessNameInput.trim() || config.business_name,
        business_industry: businessIndustryInput.trim() || config.business_industry,
        business_tagline: businessTaglineInput.trim() || config.business_tagline,
        catalog_unit: catalogUnitInput.trim() || config.catalog_unit,
      },
      "Workspace setup verified & saved!"
    );
    try {
      localStorage.setItem("wb_onboarding_completed", "true");
    } catch {}
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[99999] bg-black/75 backdrop-blur-md flex items-center justify-center p-3 sm:p-5">
      <div
        className="w-full max-w-[1000px] max-h-[92vh] rounded-2xl border border-[var(--ed-border)] shadow-2xl flex flex-col overflow-hidden text-[var(--ed-text-primary)]"
        style={{ background: "var(--ed-surface)" }}
      >
        {/* Top Header */}
        <div
          className="px-5 py-4 border-b border-[var(--ed-border)] flex items-center justify-between gap-4"
          style={{
            background: "linear-gradient(90deg, color-mix(in srgb, var(--ed-accent) 12%, var(--ed-surface)), var(--ed-surface))",
          }}
        >
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center text-white shadow-md shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-base sm:text-lg font-extrabold tracking-tight text-[var(--ed-text-primary)]">
                  Workspace Setup, WhatsApp Gateway & Feature Control
                </h2>
                <span
                  className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                    config.ui_mode === "simplified"
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/40"
                      : "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/40"
                  }`}
                >
                  {config.ui_mode === "simplified" ? "✨ SIMPLIFIED MODE" : "🛠️ ADVANCED MODE"}
                </span>
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
                Connect via Unofficial QR/Pairing or Official Meta Cloud API, auto-configure any business with AI, and verify end-to-end readiness.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl border border-[var(--ed-border)] flex items-center justify-center text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
            style={{ background: "var(--ed-bg)" }}
            title="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Step Tabs */}
        <div
          className="grid grid-cols-1 sm:grid-cols-3 border-b border-[var(--ed-border)]"
          style={{ background: "var(--ed-bg)" }}
        >
          {[
            {
              id: "whatsapp_owner",
              label: "1. WhatsApp Gateway & Owner Phone",
              sub:
                waMode === "official"
                  ? "Official Meta Cloud API v20.0"
                  : config.whatsapp_connected
                  ? `Connected (+${config.bot_whatsapp_number || "Linked"})`
                  : "Unofficial QR or 8-Digit Pairing",
              icon: <Smartphone className="w-4 h-4" />,
            },
            {
              id: "industry_features",
              label: "2. AI Business Architect & Features",
              sub: `${config.business_industry || "Any Industry"} • ${config.ui_mode === "simplified" ? "Simplified" : "Advanced"}`,
              icon: <Sliders className="w-4 h-4" />,
            },
            {
              id: "verification",
              label: "3. End-to-End Health Verification",
              sub: "Check DB, Friday, EDITH & WhatsApp",
              icon: <CheckCircle2 className="w-4 h-4" />,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-4 py-3 text-left flex items-center gap-3 border-b-2 transition-all ${
                  active
                    ? "border-emerald-500 bg-emerald-500/10 text-[var(--ed-text-primary)]"
                    : "border-transparent text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                }`}
              >
                <div className={active ? "text-emerald-500" : "text-[var(--ed-text-muted)]"}>{tab.icon}</div>
                <div className="min-w-0">
                  <div className="text-xs font-bold truncate">{tab.label}</div>
                  <div className="text-[11px] opacity-75 truncate">{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Toast Banner */}
        {statusToast && (
          <div className="bg-emerald-500/15 border-b border-emerald-500/35 text-emerald-600 dark:text-emerald-300 px-6 py-2.5 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{statusToast}</span>
          </div>
        )}

        {/* Body Content */}
        <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-5">
          {/* TAB 1: WHATSAPP & OWNER NUMBER */}
          {activeTab === "whatsapp_owner" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Left Column (7 cols): Unofficial vs Official WhatsApp Gateway */}
              <div
                className="lg:col-span-7 p-5 rounded-2xl border border-[var(--ed-border)] space-y-4"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                      Step 1A: Connect Your WhatsApp Gateway
                    </h3>
                  </div>

                  {/* Mode Switcher: Unofficial vs Official */}
                  <div
                    className="inline-flex rounded-xl p-1 border border-[var(--ed-border)]"
                    style={{ background: "var(--ed-surface)" }}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setWaMode("unofficial");
                        saveWorkspacePatch(
                          { whatsapp_connection_mode: "unofficial" },
                          "Switched to Unofficial Baileys Bridge Mode (QR / 8-Digit Code)"
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        waMode === "unofficial"
                          ? "bg-emerald-600 text-white"
                          : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                      }`}
                    >
                      ⚡ Unofficial (QR / Code)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setWaMode("official");
                        saveWorkspacePatch(
                          { whatsapp_connection_mode: "official" },
                          "Switched to Official Meta WhatsApp Cloud API Mode"
                        );
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                        waMode === "official"
                          ? "bg-[var(--ed-accent)] text-white"
                          : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
                      }`}
                    >
                      🛡️ Official (Meta API)
                    </button>
                  </div>
                </div>

                {waMode === "unofficial" ? (
                  <>
                    <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
                      <strong>Unofficial Multi-Device Bridge (:3001):</strong> Link any WhatsApp number immediately by scanning the QR code or entering an 8-digit pairing code on your phone.
                    </p>

                    {config.unofficial_bridge_connected || config.whatsapp_connected ? (
                      <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 space-y-3">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-[var(--ed-text-primary)]">
                              Active WhatsApp Bot Connected
                            </div>
                            <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                              {config.bot_whatsapp_number
                                ? `Linked Number: +${config.bot_whatsapp_number}`
                                : "Linked via Baileys Multi-Device Session"}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={handleResetWhatsAppSession}
                          disabled={resettingWa}
                          className="px-3.5 py-2 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-600 dark:text-rose-400 text-xs font-bold inline-flex items-center gap-2"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                          {resettingWa ? "Resetting Session..." : "Switch / Connect a Different WhatsApp Number"}
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="bg-white rounded-xl p-2.5 h-[235px] flex flex-col items-center justify-center overflow-hidden border border-[var(--ed-border)]">
                          <iframe
                            key={qrRefreshKey}
                            src={`/api/v1/whatsapp/qr-embed?t=${qrRefreshKey}`}
                            className="w-full h-full border-0 rounded-lg"
                            title="WhatsApp QR Scanner"
                          />
                        </div>

                        <div className="flex gap-2.5">
                          <button
                            onClick={() => {
                              setQrRefreshKey(Date.now());
                              saveWorkspacePatch({});
                            }}
                            className="flex-1 py-2 px-3 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)] flex items-center justify-center gap-1.5"
                            style={{ background: "var(--ed-surface)" }}
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Refresh QR
                          </button>
                          <a
                            href="/api/v1/whatsapp/qr-embed"
                            target="_blank"
                            rel="noreferrer"
                            className="py-2 px-3.5 rounded-xl bg-blue-500/15 border border-blue-500/35 text-blue-600 dark:text-blue-400 text-xs font-bold flex items-center gap-1.5"
                          >
                            Full QR Page <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    )}

                    {/* 8-Digit Pairing Code */}
                    <div className="pt-3 border-t border-[var(--ed-border)] space-y-2">
                      <div className="text-xs font-bold text-[var(--ed-text-primary)]">
                        Or Link via 8-Digit Phone Pairing Code:
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pairPhoneInput}
                          onChange={(e) => setPairPhoneInput(e.target.value)}
                          placeholder="Bot WhatsApp Phone (e.g. 919876543210)"
                          className="flex-1 px-3 py-2 rounded-xl border border-[var(--ed-border)] text-xs text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-surface)" }}
                        />
                        <button
                          onClick={handleRequestPairingCode}
                          disabled={requestingPair}
                          className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shrink-0"
                        >
                          {requestingPair ? "Generating..." : "Get 8-Digit Code"}
                        </button>
                      </div>
                      {pairingCodeResult && (
                        <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-between">
                          <span className="text-xs text-[var(--ed-text-primary)]">
                            Enter in WhatsApp → Linked Devices:
                          </span>
                          <span className="text-base font-black tracking-widest text-emerald-600 dark:text-emerald-400 font-mono">
                            {pairingCodeResult}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 text-xs">
                    <p className="text-[var(--ed-text-muted)] leading-relaxed">
                      <strong>Official Meta WhatsApp Business Cloud API (Graph v20.0):</strong> Connect your verified Meta WABA credentials. Webhook URL: <code className="text-[var(--ed-accent)] font-mono">/api/v1/webhooks/whatsapp</code>
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] mb-1">
                          PHONE NUMBER ID
                        </label>
                        <input
                          type="text"
                          value={metaPhoneId}
                          onChange={(e) => setMetaPhoneId(e.target.value)}
                          placeholder="e.g. 104928194829104"
                          className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-surface)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] mb-1">
                          WABA ACCOUNT ID
                        </label>
                        <input
                          type="text"
                          value={metaWabaId}
                          onChange={(e) => setMetaWabaId(e.target.value)}
                          placeholder="e.g. 109482918491029"
                          className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-surface)" }}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] mb-1">
                          PERMANENT META ACCESS TOKEN (EAA...)
                        </label>
                        <input
                          type="password"
                          value={metaAccessToken}
                          onChange={(e) => setMetaAccessToken(e.target.value)}
                          placeholder="EAAGm0PX4ZCpsBA..."
                          className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-surface)" }}
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-[var(--ed-text-muted)] mb-1">
                          WEBHOOK VERIFY TOKEN
                        </label>
                        <input
                          type="text"
                          value={metaVerifyToken}
                          onChange={(e) => setMetaVerifyToken(e.target.value)}
                          className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                          style={{ background: "var(--ed-surface)" }}
                        />
                      </div>
                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            saveWorkspacePatch(
                              {
                                whatsapp_connection_mode: "official",
                                meta_phone_number_id: metaPhoneId.trim(),
                                meta_waba_id: metaWabaId.trim(),
                                meta_access_token: metaAccessToken.trim(),
                                meta_verify_token: metaVerifyToken.trim(),
                              },
                              "Official Meta Cloud API credentials saved!"
                            )
                          }
                          className="w-full py-2.5 px-4 rounded-xl bg-[var(--ed-accent)] text-white font-bold text-xs"
                        >
                          Save Official API
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (5 cols): Owner Escalation Number & UI Mode Switch */}
              <div className="lg:col-span-5 flex flex-col gap-4">
                <div
                  className="p-5 rounded-2xl border border-[var(--ed-border)] space-y-3"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                      Step 1B: Owner Escalation WhatsApp
                    </h3>
                  </div>
                  <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
                    Enter the business owner&apos;s WhatsApp number where EDITH &amp; Friday send{" "}
                    <strong>Order Confirmations, Hot Lead Summaries &amp; Human Handoff Alerts</strong>.
                  </p>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={ownerPhoneInput}
                      onChange={(e) => setOwnerPhoneInput(e.target.value)}
                      placeholder="e.g. +919876543210"
                      className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs font-mono font-bold text-[var(--ed-text-primary)]"
                      style={{ background: "var(--ed-surface)" }}
                    />
                    <button
                      onClick={() =>
                        saveWorkspacePatch(
                          { owner_whatsapp_number: ownerPhoneInput.trim() },
                          `Owner escalation number saved: ${ownerPhoneInput.trim()}`
                        )
                      }
                      disabled={saving}
                      className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-xs font-bold shrink-0"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </div>
                </div>

                {/* Experience Mode Selector */}
                <div
                  className="p-5 rounded-2xl border border-[var(--ed-border)] space-y-3"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-sky-500" />
                    <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                      Experience Mode: Simplified vs. Advanced
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() =>
                        saveWorkspacePatch({ ui_mode: "simplified" }, "Switched to Simplified Business Mode!")
                      }
                      className={`p-3 rounded-xl text-left border transition-all ${
                        config.ui_mode === "simplified"
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-[var(--ed-border)]"
                      }`}
                      style={{ background: config.ui_mode === "simplified" ? undefined : "var(--ed-surface)" }}
                    >
                      <div className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400 mb-1">
                        ✨ Simplified Mode
                      </div>
                      <div className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
                        Direct view: Overview, Add Info/Products, Live Messages &amp; Notifications.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        saveWorkspacePatch({ ui_mode: "advanced" }, "Switched to Advanced Developer Mode!")
                      }
                      className={`p-3 rounded-xl text-left border transition-all ${
                        config.ui_mode === "advanced"
                          ? "border-blue-500 bg-blue-500/10"
                          : "border-[var(--ed-border)]"
                      }`}
                      style={{ background: config.ui_mode === "advanced" ? undefined : "var(--ed-surface)" }}
                    >
                      <div className="text-xs font-extrabold text-blue-600 dark:text-blue-400 mb-1">
                        🛠️ Advanced Mode
                      </div>
                      <div className="text-[11px] text-[var(--ed-text-muted)] leading-snug">
                        Full Architecture Showcase, Dual-Brain Bus, Simulator &amp; Telemetry.
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI BUSINESS ARCHITECT, VERTICAL PRESETS & FEATURE TOGGLES */}
          {activeTab === "industry_features" && (
            <div className="space-y-5">
              {/* ✨ AI Business Architect Box inside Modal */}
              <div
                className="p-4 rounded-2xl border border-[var(--ed-accent)]/40 space-y-3"
                style={{
                  background: "color-mix(in srgb, var(--ed-accent) 8%, var(--ed-bg))",
                }}
              >
                <div className="flex items-center gap-2 text-xs font-bold text-[var(--ed-text-primary)]">
                  <Wand2 className="w-4 h-4 text-[var(--ed-accent)]" />
                  <span>✨ Tell AI What Your Business Does — Auto-Fill All Settings &amp; Catalog Products</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAiAutoFill();
                    }}
                    placeholder='e.g. "We sell solar inverters & lithium batteries in Pune" or "Artisanal bakery & corporate gifting"'
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-[var(--ed-border)] text-xs text-[var(--ed-text-primary)]"
                    style={{ background: "var(--ed-surface)" }}
                  />
                  <button
                    type="button"
                    onClick={handleAiAutoFill}
                    disabled={isAiFilling || !aiPrompt.trim()}
                    className="px-4 py-2.5 rounded-xl bg-[var(--ed-accent)] text-white text-xs font-bold flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    {isAiFilling ? "Configuring..." : "Auto-Fill with AI"}
                  </button>
                </div>
              </div>

              {/* Industry Vertical Presets */}
              <div
                className="p-4 sm:p-5 rounded-2xl border border-[var(--ed-border)] space-y-3"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-emerald-500" />
                    <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                      Or Pick a Multi-Industry Preset
                    </h3>
                  </div>
                  <span className="text-[11px] text-[var(--ed-text-muted)]">
                    Seeds 4 matching products into SQLite
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {(config.industry_presets || []).map((preset) => {
                    const isSelected =
                      config.industry_preset_id === preset.id ||
                      config.business_industry === preset.business_industry;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.id)}
                        disabled={applyingPreset === preset.id}
                        className={`p-3 rounded-xl text-left border flex items-start gap-2.5 transition-all ${
                          isSelected
                            ? "border-emerald-500 bg-emerald-500/10"
                            : "border-[var(--ed-border)] hover:border-emerald-500/40"
                        }`}
                        style={{ background: isSelected ? undefined : "var(--ed-surface)" }}
                      >
                        <span className="text-xl">{preset.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-bold text-[var(--ed-text-primary)] flex items-center justify-between gap-1">
                            <span className="truncate">{preset.name}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-[var(--ed-text-muted)] truncate mt-0.5">
                            {preset.business_name} • /{preset.catalog_unit}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Granular Feature Toggles */}
              <div
                className="p-4 sm:p-5 rounded-2xl border border-[var(--ed-border)] space-y-3"
                style={{ background: "var(--ed-bg)" }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-500" />
                    <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                      Modular Feature Toggles (Turn Any Capability ON or OFF)
                    </h3>
                  </div>
                  <button
                    onClick={() => {
                      const allOn: Record<string, boolean> = {};
                      FEATURE_METADATA.forEach((f) => (allOn[f.key] = true));
                      saveWorkspacePatch({ feature_toggles: allOn }, "All platform features enabled!");
                    }}
                    className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold"
                  >
                    Enable All
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {FEATURE_METADATA.map((feat) => {
                    const enabled = config.feature_toggles?.[feat.key] !== false;
                    return (
                      <div
                        key={feat.key}
                        onClick={() => handleToggleFeature(feat.key)}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all ${
                          enabled ? "border-emerald-500/35 bg-emerald-500/5" : "border-[var(--ed-border)] opacity-75"
                        }`}
                        style={{ background: enabled ? undefined : "var(--ed-surface)" }}
                      >
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-[var(--ed-text-primary)] truncate">{feat.label}</div>
                          <div className="text-[10px] text-[var(--ed-text-muted)] line-clamp-1 mt-0.5">
                            {feat.description}
                          </div>
                        </div>
                        <div
                          className={`w-10 h-5 rounded-full p-0.5 flex items-center shrink-0 transition-all ${
                            enabled ? "bg-emerald-500 justify-end" : "bg-slate-400/40 justify-start"
                          }`}
                        >
                          <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: END-TO-END VERIFICATION */}
          {activeTab === "verification" && (
            <div
              className="p-5 rounded-2xl border border-[var(--ed-border)] space-y-4"
              style={{ background: "var(--ed-bg)" }}
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-[var(--ed-text-primary)]">
                    End-to-End Platform Verification Checklist
                  </h3>
                  <p className="text-xs text-[var(--ed-text-muted)]">
                    Verifies FastAPI, SQLite Catalog, Friday (Gemini), EDITH (NVIDIA NIM), WhatsApp Gateway, and Owner Escalation.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => runVerification(false)}
                    disabled={verifying}
                    className="px-3.5 py-2 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)] flex items-center gap-1.5"
                    style={{ background: "var(--ed-surface)" }}
                  >
                    <RefreshCw className="w-3.5 h-3.5" /> {verifying ? "Checking..." : "Re-Run Check"}
                  </button>
                  <button
                    onClick={() => runVerification(true)}
                    disabled={verifying}
                    className="px-3.5 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <Send className="w-3.5 h-3.5" /> Verify &amp; Ping Owner WhatsApp
                  </button>
                </div>
              </div>

              <div className="space-y-2.5">
                {checks.map((c) => {
                  const isPassed = c.status === "passed";
                  const isAction = c.status === "action_required";
                  return (
                    <div
                      key={c.id}
                      className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 ${
                        isPassed
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : isAction
                          ? "border-amber-500/30 bg-amber-500/10"
                          : "border-rose-500/30 bg-rose-500/10"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {isPassed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                        ) : (
                          <AlertTriangle
                            className={`w-5 h-5 shrink-0 ${isAction ? "text-amber-500" : "text-rose-500"}`}
                          />
                        )}
                        <div>
                          <div className="text-xs font-bold text-[var(--ed-text-primary)]">{c.title}</div>
                          <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">{c.detail}</div>
                        </div>
                      </div>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase ${
                          isPassed
                            ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-300"
                            : "bg-amber-500/20 text-amber-600 dark:text-amber-300"
                        }`}
                      >
                        {c.status.replace("_", " ")}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="px-5 py-3.5 border-t border-[var(--ed-border)] flex flex-wrap items-center justify-between gap-3"
          style={{ background: "var(--ed-bg)" }}
        >
          <div className="text-xs text-[var(--ed-text-muted)]">
            Active Business: <strong className="text-[var(--ed-text-primary)]">{config.business_name}</strong> (
            {config.business_industry}) • Gateway:{" "}
            <strong className="text-[var(--ed-text-primary)] uppercase">{waMode}</strong>
          </div>

          <div className="flex gap-2.5">
            {activeTab !== "verification" && (
              <button
                onClick={() =>
                  setActiveTab(activeTab === "whatsapp_owner" ? "industry_features" : "verification")
                }
                className="px-4 py-2 rounded-xl border border-[var(--ed-border)] text-xs font-bold text-[var(--ed-text-primary)]"
                style={{ background: "var(--ed-surface)" }}
              >
                Next Step →
              </button>
            )}
            <button
              onClick={handleCompleteOnboarding}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow-md"
            >
              ✅ Save &amp; Launch Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
