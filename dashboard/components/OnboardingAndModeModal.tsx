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
  Wrench,
  Check,
  ExternalLink,
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
  whatsapp_connected: boolean;
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
  const [ownerPhoneInput, setOwnerPhoneInput] = useState(config.owner_whatsapp_number || "");
  const [pairPhoneInput, setPairPhoneInput] = useState("");
  const [pairingCodeResult, setPairingCodeResult] = useState<string | null>(config.pairing_code || null);
  const [businessNameInput, setBusinessNameInput] = useState(config.business_name || "");
  const [businessIndustryInput, setBusinessIndustryInput] = useState(config.business_industry || "");
  const [businessTaglineInput, setBusinessTaglineInput] = useState(config.business_tagline || "");
  const [catalogUnitInput, setCatalogUnitInput] = useState(config.catalog_unit || "unit");
  const [saving, setSaving] = useState(false);
  const [resettingWa, setResettingWa] = useState(false);
  const [requestingPair, setRequestingPair] = useState(false);
  const [applyingPreset, setApplyingPreset] = useState<string | null>(null);
  const [statusToast, setStatusToast] = useState<string | null>(null);
  const [qrRefreshKey, setQrRefreshKey] = useState<number>(Date.now());

  // Verification state
  const [verifying, setVerifying] = useState(false);
  const [checks, setChecks] = useState<VerificationCheck[]>([]);
  const [allPassed, setAllPassed] = useState(false);

  useEffect(() => {
    setOwnerPhoneInput(config.owner_whatsapp_number || "");
    setBusinessNameInput(config.business_name || "");
    setBusinessIndustryInput(config.business_industry || "");
    setBusinessTaglineInput(config.business_tagline || "");
    setCatalogUnitInput(config.catalog_unit || "unit");
    if (config.pairing_code) {
      setPairingCodeResult(config.pairing_code);
    }
  }, [
    config.owner_whatsapp_number,
    config.business_name,
    config.business_industry,
    config.business_tagline,
    config.catalog_unit,
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
    } catch (e) {
      showToast("Failed to save workspace configuration.");
    } finally {
      setSaving(false);
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
    } catch (e) {
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
    } catch (e) {
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
    } catch (e) {
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
        setAllPassed(Boolean(data.all_passed));
        if (sendPing) {
          showToast("Verification complete & live test ping dispatched to Owner WhatsApp!");
        }
      }
    } catch (e) {
      showToast("Verification check failed to reach backend.");
    } finally {
      setVerifying(false);
    }
  };

  const handleCompleteOnboarding = async () => {
    await saveWorkspacePatch(
      {
        onboarding_completed: true,
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
    } catch (e) {}
    onClose();
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(6, 9, 15, 0.82)",
        backdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "980px",
          maxHeight: "90vh",
          background: "var(--bg-secondary, #0f1522)",
          border: "1px solid var(--border-color, rgba(255,255,255,0.12))",
          borderRadius: "20px",
          boxShadow: "0 28px 90px rgba(0, 0, 0, 0.65)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          color: "var(--text-primary, #f8fafc)",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "20px 26px",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "linear-gradient(90deg, rgba(16,185,129,0.12), rgba(59,130,246,0.08), transparent)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                width: "44px",
                height: "44px",
                borderRadius: "12px",
                background: "linear-gradient(135deg, #10b981, #2563eb)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#fff",
                boxShadow: "0 8px 20px rgba(16,185,129,0.3)",
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 800 }}>
                  Workspace Setup, WhatsApp Connection & Feature Control
                </h2>
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 700,
                    padding: "3px 10px",
                    borderRadius: "999px",
                    background: config.ui_mode === "simplified" ? "rgba(16,185,129,0.18)" : "rgba(59,130,246,0.18)",
                    color: config.ui_mode === "simplified" ? "#10b981" : "#60a5fa",
                    border: "1px solid currentColor",
                  }}
                >
                  {config.ui_mode === "simplified" ? "✨ SIMPLIFIED MODE" : "🛠️ ADVANCED MODE"}
                </span>
              </div>
              <p style={{ margin: "4px 0 0", fontSize: "12.5px", color: "var(--text-secondary, #94a3b8)" }}>
                Connect any WhatsApp number, set your Owner escalation number, choose any business industry, toggle features, and verify end-to-end readiness.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "var(--text-secondary, #94a3b8)",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation Step Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            borderBottom: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.18)",
          }}
        >
          {[
            {
              id: "whatsapp_owner",
              label: "1. Connect WhatsApp & Owner Number",
              sub: config.whatsapp_connected
                ? `Connected (+${config.bot_whatsapp_number || "Linked"})`
                : "Scan QR or 8-Digit Pairing Code",
              icon: <Smartphone size={16} />,
            },
            {
              id: "industry_features",
              label: "2. Business Vertical, Mode & Features",
              sub: `${config.business_industry || "Any Industry"} • ${config.ui_mode === "simplified" ? "Simplified" : "Advanced"}`,
              icon: <Sliders size={16} />,
            },
            {
              id: "verification",
              label: "3. End-to-End Health Verification",
              sub: "Check DB, Friday, EDITH & WhatsApp",
              icon: <CheckCircle2 size={16} />,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "14px 18px",
                  background: active ? "rgba(16,185,129,0.1)" : "transparent",
                  border: "none",
                  borderBottom: active ? "3px solid #10b981" : "3px solid transparent",
                  color: active ? "var(--text-primary, #fff)" : "var(--text-secondary, #94a3b8)",
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.15s ease",
                }}
              >
                <div
                  style={{
                    color: active ? "#10b981" : "var(--text-secondary, #94a3b8)",
                  }}
                >
                  {tab.icon}
                </div>
                <div>
                  <div style={{ fontSize: "13px", fontWeight: 700 }}>{tab.label}</div>
                  <div style={{ fontSize: "11px", opacity: 0.75, marginTop: "2px" }}>{tab.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Toast Banner */}
        {statusToast && (
          <div
            style={{
              background: "rgba(16,185,129,0.16)",
              borderBottom: "1px solid rgba(16,185,129,0.35)",
              color: "#34d399",
              padding: "9px 24px",
              fontSize: "12.5px",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <CheckCircle2 size={15} />
            {statusToast}
          </div>
        )}

        {/* Body Content */}
        <div style={{ padding: "24px 26px", overflowY: "auto", flex: 1 }}>
          {/* TAB 1: WHATSAPP & OWNER NUMBER */}
          {activeTab === "whatsapp_owner" && (
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "22px" }}>
              {/* Left Column: Bot WhatsApp Connection */}
              <div
                style={{
                  padding: "20px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <QrCode size={18} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Step 1A: Connect Your WhatsApp Bot Number
                    </h3>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      padding: "3px 9px",
                      borderRadius: "999px",
                      background: config.whatsapp_connected ? "rgba(16,185,129,0.18)" : "rgba(245,158,11,0.18)",
                      color: config.whatsapp_connected ? "#10b981" : "#fbbf24",
                    }}
                  >
                    {config.whatsapp_connected ? "ONLINE & LINKED" : "PAIRING REQUIRED"}
                  </span>
                </div>

                <p style={{ fontSize: "12.5px", color: "var(--text-secondary, #94a3b8)", marginTop: 0, lineHeight: 1.5 }}>
                  No personal WhatsApp number is hardcoded. Anyone cloning from GitHub can scan the QR code or enter their own phone number below to link their WhatsApp account.
                </p>

                {config.whatsapp_connected ? (
                  <div
                    style={{
                      padding: "16px",
                      borderRadius: "12px",
                      background: "rgba(16,185,129,0.08)",
                      border: "1px solid rgba(16,185,129,0.28)",
                      marginBottom: "16px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
                      <CheckCircle2 size={20} color="#10b981" />
                      <div>
                        <div style={{ fontSize: "13.5px", fontWeight: 700 }}>
                          Active WhatsApp Bot Connected
                        </div>
                        <div style={{ fontSize: "12px", color: "#34d399", fontFamily: "monospace" }}>
                          {config.bot_whatsapp_number
                            ? `Linked Number: +${config.bot_whatsapp_number}`
                            : "Linked via Baileys Multi-Device Session"}
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary, #94a3b8)", margin: "8px 0 12px" }}>
                      Testing on a new machine or want to connect a different WhatsApp number? Click below to log out the current session and generate a fresh QR code.
                    </p>
                    <button
                      onClick={handleResetWhatsAppSession}
                      disabled={resettingWa}
                      style={{
                        padding: "9px 14px",
                        borderRadius: "10px",
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.4)",
                        color: "#f87171",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <LogOut size={14} />
                      {resettingWa ? "Resetting Session..." : "Switch / Connect a Different WhatsApp Number"}
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* QR Code Frame */}
                    <div
                      style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        padding: "10px",
                        height: "250px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: "14px",
                        position: "relative",
                        overflow: "hidden",
                      }}
                    >
                      <iframe
                        key={qrRefreshKey}
                        src={`http://localhost:3001/qr?embed=1&t=${qrRefreshKey}`}
                        style={{
                          width: "100%",
                          height: "100%",
                          border: "none",
                          borderRadius: "10px",
                        }}
                        title="WhatsApp QR Scanner"
                      />
                    </div>

                    <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                      <button
                        onClick={() => {
                          setQrRefreshKey(Date.now());
                          saveWorkspacePatch({});
                        }}
                        style={{
                          flex: 1,
                          padding: "9px 12px",
                          borderRadius: "10px",
                          background: "rgba(255,255,255,0.07)",
                          border: "1px solid rgba(255,255,255,0.14)",
                          color: "var(--text-primary, #fff)",
                          fontSize: "12px",
                          fontWeight: 600,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: "6px",
                        }}
                      >
                        <RefreshCw size={14} /> Refresh QR Status
                      </button>
                      <a
                        href="http://localhost:3001/qr"
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: "9px 14px",
                          borderRadius: "10px",
                          background: "rgba(59,130,246,0.15)",
                          border: "1px solid rgba(59,130,246,0.35)",
                          color: "#60a5fa",
                          fontSize: "12px",
                          fontWeight: 600,
                          textDecoration: "none",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        Open Full QR Page <ExternalLink size={13} />
                      </a>
                    </div>
                  </div>
                )}

                {/* 8-Digit Pairing Code Alternative */}
                <div
                  style={{
                    paddingTop: "14px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div style={{ fontSize: "12.5px", fontWeight: 700, marginBottom: "6px" }}>
                    Or Link via 8-Digit Phone Pairing Code (No QR Camera Needed):
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={pairPhoneInput}
                      onChange={(e) => setPairPhoneInput(e.target.value)}
                      placeholder="Bot WhatsApp Phone (e.g. 919876543210)"
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "12.5px",
                      }}
                    />
                    <button
                      onClick={handleRequestPairingCode}
                      disabled={requestingPair}
                      style={{
                        padding: "9px 14px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {requestingPair ? "Generating..." : "Get 8-Digit Code"}
                    </button>
                  </div>
                  {pairingCodeResult && (
                    <div
                      style={{
                        marginTop: "10px",
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(16,185,129,0.14)",
                        border: "1px solid rgba(16,185,129,0.4)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: "12px", color: "#a7f3d0" }}>
                        Enter this code in WhatsApp → Linked Devices → Link with phone number:
                      </span>
                      <span
                        style={{
                          fontSize: "18px",
                          fontWeight: 900,
                          letterSpacing: "3px",
                          color: "#10b981",
                          fontFamily: "monospace",
                        }}
                      >
                        {pairingCodeResult}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Owner Escalation Number & Quick Mode Switch */}
              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <Smartphone size={18} color="#3b82f6" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Step 1B: Owner Escalation WhatsApp Number
                    </h3>
                  </div>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary, #94a3b8)", marginTop: 0, lineHeight: 1.5 }}>
                    Enter the business owner&apos;s WhatsApp number where EDITH &amp; Friday should send{" "}
                    <strong>Instant Order Confirmations, Hot Lead Summaries, and Human Handoff Alerts</strong>.
                  </p>

                  <label style={{ display: "block", fontSize: "11.5px", fontWeight: 700, marginBottom: "6px", color: "#94a3b8" }}>
                    OWNER WHATSAPP NUMBER (WITH COUNTRY CODE)
                  </label>
                  <div style={{ display: "flex", gap: "8px", marginBottom: "12px" }}>
                    <input
                      type="text"
                      value={ownerPhoneInput}
                      onChange={(e) => setOwnerPhoneInput(e.target.value)}
                      placeholder="e.g. +919876543210"
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.16)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "13.5px",
                        fontFamily: "monospace",
                      }}
                    />
                    <button
                      onClick={() =>
                        saveWorkspacePatch(
                          { owner_whatsapp_number: ownerPhoneInput.trim() },
                          `Owner escalation number saved: ${ownerPhoneInput.trim()}`
                        )
                      }
                      disabled={saving}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #10b981, #059669)",
                        border: "none",
                        color: "#fff",
                        fontSize: "12.5px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {saving ? "Saving..." : "Save Number"}
                    </button>
                  </div>

                  <div
                    style={{
                      padding: "10px 12px",
                      borderRadius: "10px",
                      background: "rgba(59,130,246,0.08)",
                      border: "1px solid rgba(59,130,246,0.22)",
                      fontSize: "11.5px",
                      color: "var(--text-secondary, #94a3b8)",
                      lineHeight: 1.45,
                    }}
                  >
                    💡 <strong>Zero Hardcoded Lock-In:</strong> Whenever a customer closes a deal on WhatsApp or asks for a manager, EDITH automatically routes the summary to this exact number.
                  </div>
                </div>

                {/* Main Workspace Experience Mode Selector */}
                <div
                  style={{
                    padding: "20px",
                    borderRadius: "16px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px" }}>
                    <Sparkles size={18} color="#a855f7" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Experience Mode: Simplified vs. Advanced
                    </h3>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      onClick={() =>
                        saveWorkspacePatch({ ui_mode: "simplified" }, "Switched to Simplified Business Mode!")
                      }
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        background:
                          config.ui_mode === "simplified"
                            ? "linear-gradient(135deg, rgba(16,185,129,0.22), rgba(16,185,129,0.08))"
                            : "rgba(0,0,0,0.25)",
                        border:
                          config.ui_mode === "simplified"
                            ? "2px solid #10b981"
                            : "1px solid rgba(255,255,255,0.1)",
                        color: "var(--text-primary, #fff)",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#10b981", marginBottom: "4px" }}>
                        ✨ Simplified Mode
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary, #94a3b8)", lineHeight: 1.4 }}>
                        Clean business view: Talk to Friday, check Analytics, view Orders, and reply in the Live Inbox.
                      </div>
                    </button>

                    <button
                      onClick={() =>
                        saveWorkspacePatch({ ui_mode: "advanced" }, "Switched to Advanced Developer Mode!")
                      }
                      style={{
                        padding: "12px",
                        borderRadius: "12px",
                        textAlign: "left",
                        cursor: "pointer",
                        background:
                          config.ui_mode === "advanced"
                            ? "linear-gradient(135deg, rgba(59,130,246,0.22), rgba(59,130,246,0.08))"
                            : "rgba(0,0,0,0.25)",
                        border:
                          config.ui_mode === "advanced"
                            ? "2px solid #3b82f6"
                            : "1px solid rgba(255,255,255,0.1)",
                        color: "var(--text-primary, #fff)",
                      }}
                    >
                      <div style={{ fontSize: "13px", fontWeight: 800, color: "#60a5fa", marginBottom: "4px" }}>
                        🛠️ Advanced Mode
                      </div>
                      <div style={{ fontSize: "11.5px", color: "var(--text-secondary, #94a3b8)", lineHeight: 1.4 }}>
                        Full developer &amp; AI suite: Dual-Brain Console, AI Playground, RAG Knowledge, Prompts &amp; Telemetry.
                      </div>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUSINESS VERTICAL & FEATURE TOGGLES */}
          {activeTab === "industry_features" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
              {/* Industry Vertical Presets */}
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={18} color="#10b981" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Multi-Industry Business Presets (Works for Any Business)
                    </h3>
                  </div>
                  <span style={{ fontSize: "11.5px", color: "var(--text-secondary, #94a3b8)" }}>
                    1-Click switches catalog units, terminology &amp; sample products
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(275px, 1fr))",
                    gap: "10px",
                    marginBottom: "16px",
                  }}
                >
                  {(config.industry_presets || []).map((preset) => {
                    const isSelected =
                      config.industry_preset_id === preset.id ||
                      config.business_industry === preset.business_industry;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => handleApplyPreset(preset.id)}
                        disabled={applyingPreset === preset.id}
                        style={{
                          padding: "12px 14px",
                          borderRadius: "12px",
                          textAlign: "left",
                          cursor: "pointer",
                          background: isSelected
                            ? "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(59,130,246,0.1))"
                            : "rgba(0,0,0,0.25)",
                          border: isSelected
                            ? "2px solid #10b981"
                            : "1px solid rgba(255,255,255,0.09)",
                          color: "var(--text-primary, #fff)",
                          display: "flex",
                          alignItems: "flex-start",
                          gap: "10px",
                        }}
                      >
                        <span style={{ fontSize: "22px" }}>{preset.icon}</span>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: "13px", fontWeight: 700, display: "flex", justifyContent: "space-between" }}>
                            <span>{preset.name}</span>
                            {isSelected && <Check size={14} color="#10b981" />}
                          </div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)", marginTop: "2px" }}>
                            {preset.business_name} • Unit: <code>/{preset.catalog_unit}</code>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Business Identity Inputs */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1.2fr 0.7fr auto",
                    gap: "10px",
                    alignItems: "end",
                    paddingTop: "12px",
                    borderTop: "1px solid rgba(255,255,255,0.08)",
                  }}
                >
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                      CUSTOM BUSINESS NAME
                    </label>
                    <input
                      type="text"
                      value={businessNameInput}
                      onChange={(e) => setBusinessNameInput(e.target.value)}
                      placeholder="Your Company Name"
                      style={{
                        width: "100%",
                        padding: "8px 11px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "12.5px",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                      INDUSTRY / VERTICAL
                    </label>
                    <input
                      type="text"
                      value={businessIndustryInput}
                      onChange={(e) => setBusinessIndustryInput(e.target.value)}
                      placeholder="e.g. Electronics, Logistics, Hospitality"
                      style={{
                        width: "100%",
                        padding: "8px 11px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "12.5px",
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: "#94a3b8", marginBottom: "4px" }}>
                      PRICING UNIT
                    </label>
                    <input
                      type="text"
                      value={catalogUnitInput}
                      onChange={(e) => setCatalogUnitInput(e.target.value)}
                      placeholder="unit / kg / seat"
                      style={{
                        width: "100%",
                        padding: "8px 11px",
                        borderRadius: "8px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.14)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "12.5px",
                      }}
                    />
                  </div>
                  <button
                    onClick={() =>
                      saveWorkspacePatch(
                        {
                          business_name: businessNameInput.trim(),
                          business_industry: businessIndustryInput.trim(),
                          catalog_unit: catalogUnitInput.trim(),
                        },
                        "Custom business profile updated!"
                      )
                    }
                    style={{
                      padding: "9px 15px",
                      borderRadius: "8px",
                      background: "#10b981",
                      border: "none",
                      color: "#fff",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Save Profile
                  </button>
                </div>
              </div>

              {/* Granular Feature Toggles */}
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Layers size={18} color="#60a5fa" />
                    <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700 }}>
                      Modular Feature Toggles (Turn Any Capability ON or OFF)
                    </h3>
                  </div>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        const allOn: Record<string, boolean> = {};
                        FEATURE_METADATA.forEach((f) => (allOn[f.key] = true));
                        saveWorkspacePatch({ feature_toggles: allOn }, "All platform features enabled!");
                      }}
                      style={{
                        padding: "5px 10px",
                        borderRadius: "8px",
                        background: "rgba(16,185,129,0.15)",
                        border: "1px solid rgba(16,185,129,0.35)",
                        color: "#34d399",
                        fontSize: "11px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Enable All
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                    gap: "10px",
                  }}
                >
                  {FEATURE_METADATA.map((feat) => {
                    const enabled = config.feature_toggles?.[feat.key] !== false;
                    return (
                      <div
                        key={feat.key}
                        onClick={() => handleToggleFeature(feat.key)}
                        style={{
                          padding: "11px 14px",
                          borderRadius: "12px",
                          background: enabled ? "rgba(16,185,129,0.07)" : "rgba(0,0,0,0.25)",
                          border: enabled
                            ? "1px solid rgba(16,185,129,0.3)"
                            : "1px solid rgba(255,255,255,0.07)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "12px",
                          cursor: "pointer",
                        }}
                      >
                        <div>
                          <div style={{ fontSize: "12.5px", fontWeight: 700 }}>{feat.label}</div>
                          <div style={{ fontSize: "11px", color: "var(--text-secondary, #94a3b8)", marginTop: "2px" }}>
                            {feat.description}
                          </div>
                        </div>
                        <div
                          style={{
                            width: "42px",
                            height: "24px",
                            borderRadius: "999px",
                            background: enabled ? "#10b981" : "rgba(255,255,255,0.18)",
                            padding: "3px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: enabled ? "flex-end" : "flex-start",
                            flexShrink: 0,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <div
                            style={{
                              width: "18px",
                              height: "18px",
                              borderRadius: "50%",
                              background: "#fff",
                            }}
                          />
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
            <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
              <div
                style={{
                  padding: "18px 20px",
                  borderRadius: "16px",
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid var(--border-color, rgba(255,255,255,0.09))",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "15.5px", fontWeight: 800 }}>
                      End-to-End Platform Verification Checklist
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--text-secondary, #94a3b8)" }}>
                      Verify that FastAPI, SQLite Catalog, Friday (Gemini), EDITH (NVIDIA NIM), WhatsApp Bridge, and Owner Escalation are working properly.
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => runVerification(false)}
                      disabled={verifying}
                      style={{
                        padding: "9px 14px",
                        borderRadius: "10px",
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "var(--text-primary, #fff)",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <RefreshCw size={14} /> {verifying ? "Checking..." : "Re-Run Health Check"}
                    </button>
                    <button
                      onClick={() => runVerification(true)}
                      disabled={verifying}
                      style={{
                        padding: "9px 15px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
                        border: "none",
                        color: "#fff",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                      }}
                    >
                      <Send size={14} /> Verify &amp; Send Test Ping to Owner WhatsApp
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {checks.map((c) => {
                    const isPassed = c.status === "passed";
                    const isAction = c.status === "action_required";
                    return (
                      <div
                        key={c.id}
                        style={{
                          padding: "13px 16px",
                          borderRadius: "12px",
                          background: isPassed
                            ? "rgba(16,185,129,0.08)"
                            : isAction
                            ? "rgba(245,158,11,0.09)"
                            : "rgba(239,68,68,0.09)",
                          border: isPassed
                            ? "1px solid rgba(16,185,129,0.28)"
                            : isAction
                            ? "1px solid rgba(245,158,11,0.3)"
                            : "1px solid rgba(239,68,68,0.3)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: "14px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          {isPassed ? (
                            <CheckCircle2 size={20} color="#10b981" />
                          ) : (
                            <AlertTriangle size={20} color={isAction ? "#fbbf24" : "#f87171"} />
                          )}
                          <div>
                            <div style={{ fontSize: "13.5px", fontWeight: 700 }}>{c.title}</div>
                            <div style={{ fontSize: "12px", color: "var(--text-secondary, #94a3b8)", marginTop: "2px" }}>
                              {c.detail}
                            </div>
                          </div>
                        </div>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 800,
                            padding: "4px 10px",
                            borderRadius: "999px",
                            background: isPassed ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)",
                            color: isPassed ? "#34d399" : "#fbbf24",
                            textTransform: "uppercase",
                          }}
                        >
                          {c.status.replace("_", " ")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          style={{
            padding: "16px 26px",
            borderTop: "1px solid var(--border-color, rgba(255,255,255,0.08))",
            background: "rgba(0,0,0,0.24)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-secondary, #94a3b8)" }}>
            Active Business: <strong>{config.business_name}</strong> ({config.business_industry}) • Owner Escalation:{" "}
            <strong>{ownerPhoneInput || "Not set yet"}</strong>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            {activeTab !== "verification" && (
              <button
                onClick={() =>
                  setActiveTab(activeTab === "whatsapp_owner" ? "industry_features" : "verification")
                }
                style={{
                  padding: "10px 16px",
                  borderRadius: "10px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.14)",
                  color: "var(--text-primary, #fff)",
                  fontSize: "12.5px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Next Step →
              </button>
            )}
            <button
              onClick={handleCompleteOnboarding}
              style={{
                padding: "10px 20px",
                borderRadius: "10px",
                background: "linear-gradient(135deg, #10b981, #059669)",
                border: "none",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(16,185,129,0.35)",
              }}
            >
              ✅ Save &amp; Launch Workspace
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
