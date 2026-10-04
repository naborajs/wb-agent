"use client";

import React, { useState, useEffect } from "react";
import {
  Shield,
  Power,
  Radio,
  Save,
  Clock,
  CheckCircle2,
  Building2,
  Briefcase,
  Sparkles,
  Cpu,
  Wand2,
  Plus,
  Smartphone,
  Globe,
  Sliders,
  RefreshCw,
  Check,
  QrCode,
  KeyRound,
  Percent,
  Package,
} from "lucide-react";
import { AiLoader } from "@/components/ui/ai-loader";

interface BusinessPreset {
  id: string;
  label: string;
  icon: string;
  name: string;
  industry: string;
  tagline: string;
  description: string;
  agentName: string;
  agentRole: string;
  unit: string;
  currency: string;
  isCustom?: boolean;
}

const DEFAULT_PRESETS: BusinessPreset[] = [
  {
    id: "ecommerce_retail",
    label: "D2C E-Commerce & Retail",
    icon: "🛍️",
    name: "NovaTrend Retail & Lifestyle",
    industry: "E-Commerce & Consumer Retail",
    tagline: "Instant Product Discovery, Cart Recovery & Order Tracking",
    description:
      "Omnichannel D2C brand delivering smart electronics, lifestyle essentials, and instant WhatsApp checkout with automated cart recovery.",
    agentName: "EDITH",
    agentRole: "Senior Retail & D2C Shopping Concierge",
    unit: "unit",
    currency: "₹",
  },
  {
    id: "b2b_wholesale",
    label: "B2B Wholesale & Manufacturing",
    icon: "🏭",
    name: "Apex Industrial & Bulk Supply",
    industry: "B2B Wholesale & Industrial Distribution",
    tagline: "Automated Tiered Quoting, MOQ Negotiation & Dispatch",
    description:
      "Factory-direct B2B distributor handling bulk RFQ quoting, MOQ floor-price guardrails, GST pro-forma invoicing, and container dispatch.",
    agentName: "EDITH",
    agentRole: "Principal B2B Commercial Account Director",
    unit: "box",
    currency: "₹",
  },
  {
    id: "saas_agency",
    label: "SaaS, Tech & AI Agency",
    icon: "💻",
    name: "Vertex Cloud & AI Solutions",
    industry: "Enterprise SaaS & Digital Transformation",
    tagline: "24/7 Lead Qualification, Demo Booking & Plan Advisory",
    description:
      "Enterprise software & AI automation partner qualifying inbound leads, scheduling architecture demos, and provisioning cloud subscriptions.",
    agentName: "EDITH",
    agentRole: "Enterprise Solutions Architect & Advisor",
    unit: "seat",
    currency: "$",
  },
  {
    id: "healthcare_clinic",
    label: "Healthcare, Diagnostics & Wellness",
    icon: "🏥",
    name: "AuraCare Diagnostics & Wellness",
    industry: "Healthcare, Clinics & Preventative Diagnostics",
    tagline: "Patient Triage, Lab Package Booking & Report Follow-ups",
    description:
      "Accredited diagnostic & wellness network offering full-body health checkups, home sample collection, and specialist consultation booking.",
    agentName: "EDITH",
    agentRole: "Patient Care & Diagnostic Coordinator",
    unit: "package",
    currency: "₹",
  },
  {
    id: "real_estate",
    label: "Real Estate & Property Advisory",
    icon: "🏢",
    name: "Skyline Premier Realty",
    industry: "Commercial & Luxury Real Estate",
    tagline: "Instant Inventory Matching, Site-Visit Scheduling & Price Sheets",
    description:
      "Premier real estate advisory matching buyers and corporate tenants with luxury residences, Grade-A office suites, and retail showrooms.",
    agentName: "EDITH",
    agentRole: "Senior Property Portfolio Advisor",
    unit: "sq.ft",
    currency: "₹",
  },
  {
    id: "tea_agro",
    label: "Tea Estates & Agro Commodities",
    icon: "🍵",
    name: "Himalayan Tea & Agro Exports",
    industry: "Tea Estates & Wholesale Commodities",
    tagline: "Direct Estate Wholesale Pricing, Lot Grading & Bulk Dispatch",
    description:
      "Direct estate producer of Darjeeling First Flush, Assam Orthodox Golden Tips, and export CTC blends for hotels, cafes, and global buyers.",
    agentName: "EDITH",
    agentRole: "Principal Tea & Commodity Trade Specialist",
    unit: "kg",
    currency: "₹",
  },
];

export default function SystemSettingsPage() {
  const [autonomous, setAutonomous] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [ownerNotification, setOwnerNotification] = useState(true);
  const [ownerPhone, setOwnerPhone] = useState("");
  const [touch1Minutes, setTouch1Minutes] = useState(20);
  const [touch2Hours, setTouch2Hours] = useState(8);
  const [touch3Days, setTouch3Days] = useState(7);

  // Business Profile State
  const [businessName, setBusinessName] = useState("Enterprise AI Operations");
  const [businessIndustry, setBusinessIndustry] = useState("Multi-Industry B2B & Retail Commerce");
  const [businessTagline, setBusinessTagline] = useState("Autonomous Dual-Brain Sales, Support & Operations");
  const [businessDescription, setBusinessDescription] = useState(
    "AI-powered business operations platform for managing sales, customer interactions, and order processing."
  );
  const [agentName, setAgentName] = useState("EDITH");
  const [agentRole, setAgentRole] = useState("Autonomous Commercial & Operations Director");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [catalogUnit, setCatalogUnit] = useState("unit");
  const [activePreset, setActivePreset] = useState("ecommerce_retail");
  const [presets, setPresets] = useState<BusinessPreset[]>(DEFAULT_PRESETS);

  // Extended Commercial, Negotiation & Policy State
  const [brandTone, setBrandTone] = useState("Executive, Consultative & High-Trust");
  const [targetAudience, setTargetAudience] = useState("B2B Buyers, Enterprise Teams & Direct Retail Customers");
  const [maxDiscountPct, setMaxDiscountPct] = useState(12);
  const [escalationQty, setEscalationQty] = useState(100);
  const [taxRatePct, setTaxRatePct] = useState(18);
  const [paymentTerms, setPaymentTerms] = useState("Instant UPI / Bank NEFT / 50% Advance on Bulk Orders");
  const [returnPolicy, setReturnPolicy] = useState("7-Day Quality Assurance & Instant Replacement");
  const [supportedLanguages, setSupportedLanguages] = useState("English, Hindi, Hinglish & Auto-Detected Regional");

  // WhatsApp Connection Mode (Unofficial Baileys vs Official Meta Cloud API)
  const [waMode, setWaMode] = useState<"unofficial" | "official">("unofficial");
  const [unofficialConnected, setUnofficialConnected] = useState(false);
  const [botPhone, setBotPhone] = useState("");
  const [metaPhoneId, setMetaPhoneId] = useState("");
  const [metaWabaId, setMetaWabaId] = useState("");
  const [metaAccessToken, setMetaAccessToken] = useState("");
  const [metaVerifyToken, setMetaVerifyToken] = useState("wb_agent_verify_token");

  // Backend Engine & Concurrency
  const [workerCount, setWorkerCount] = useState(3);
  const [debounceSeconds, setDebounceSeconds] = useState(3);

  // AI Auto-Fill Architect State
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiResultBanner, setAiResultBanner] = useState<string | null>(null);
  const [aiSeededProducts, setAiSeededProducts] = useState<any[]>([]);

  // Custom Preset Creator Modal
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [customPresetLabel, setCustomPresetLabel] = useState("");
  const [customPresetIcon, setCustomPresetIcon] = useState("🚀");

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const loadAllSettings = async () => {
    try {
      const [sysRes, wsRes] = await Promise.all([
        fetch("/api/v1/settings"),
        fetch("/api/v1/settings/workspace-config"),
      ]);
      if (sysRes.ok) {
        const data = await sysRes.json();
        setAutonomous(data.global_autonomous_enabled ?? true);
        setQuietHours(data.quiet_hours_enabled ?? true);
        setOwnerNotification(data.owner_notification_enabled ?? true);
        setOwnerPhone(data.owner_whatsapp_number || "");
        setTouch1Minutes(data.followup_inactivity_minutes ?? 20);
        setTouch2Hours(data.followup_midterm_hours ?? 8);
        setTouch3Days(data.followup_final_days ?? 7);

        if (data.business_name) setBusinessName(data.business_name);
        if (data.business_industry) setBusinessIndustry(data.business_industry);
        if (data.business_tagline) setBusinessTagline(data.business_tagline);
        if (data.business_description) setBusinessDescription(data.business_description);
        if (data.agent_name) setAgentName(data.agent_name);
        if (data.agent_role) setAgentRole(data.agent_role);
        if (data.currency_symbol) setCurrencySymbol(data.currency_symbol);
        if (data.catalog_unit) setCatalogUnit(data.catalog_unit);

        if (data.brand_tone) setBrandTone(data.brand_tone);
        if (data.target_audience) setTargetAudience(data.target_audience);
        if (data.max_discount_pct !== undefined) setMaxDiscountPct(Number(data.max_discount_pct));
        if (data.escalation_qty !== undefined) setEscalationQty(Number(data.escalation_qty));
        if (data.tax_rate_pct !== undefined) setTaxRatePct(Number(data.tax_rate_pct));
        if (data.payment_terms) setPaymentTerms(data.payment_terms);
        if (data.return_policy) setReturnPolicy(data.return_policy);
        if (data.supported_languages) setSupportedLanguages(data.supported_languages);

        if (data.whatsapp_connection_mode === "official" || data.whatsapp_connection_mode === "unofficial") {
          setWaMode(data.whatsapp_connection_mode);
        }
        if (data.meta_phone_number_id !== undefined) setMetaPhoneId(data.meta_phone_number_id);
        if (data.meta_waba_id !== undefined) setMetaWabaId(data.meta_waba_id);
        if (data.meta_access_token !== undefined) setMetaAccessToken(data.meta_access_token);
        if (data.meta_verify_token !== undefined) setMetaVerifyToken(data.meta_verify_token);
        if (data.worker_count !== undefined) setWorkerCount(Number(data.worker_count));
        if (data.message_debounce_seconds !== undefined) setDebounceSeconds(Number(data.message_debounce_seconds));
      }

      if (wsRes.ok) {
        const ws = await wsRes.json();
        if (ws.industry_preset_id) setActivePreset(ws.industry_preset_id);
        setUnofficialConnected(Boolean(ws.unofficial_bridge_connected ?? ws.whatsapp_connected));
        setBotPhone(ws.bot_whatsapp_number || "");
        if (Array.isArray(ws.custom_presets) && ws.custom_presets.length > 0) {
          const mappedCustom: BusinessPreset[] = ws.custom_presets.map((cp: any) => ({
            id: cp.id,
            label: cp.name || cp.business_name,
            icon: cp.icon || "✨",
            name: cp.business_name,
            industry: cp.business_industry,
            tagline: cp.business_tagline,
            description: cp.business_description || "",
            agentName: "EDITH",
            agentRole: `Commercial Specialist — ${cp.business_name}`,
            unit: cp.catalog_unit || "unit",
            currency: cp.currency_symbol || "₹",
            isCustom: true,
          }));
          setPresets([...DEFAULT_PRESETS, ...mappedCustom]);
        }
      }
    } catch {
      // ignore offline error
    }
  };

  useEffect(() => {
    loadAllSettings();
  }, []);

  const handleApplyPreset = async (preset: BusinessPreset) => {
    setActivePreset(preset.id);
    setBusinessName(preset.name);
    setBusinessIndustry(preset.industry);
    setBusinessTagline(preset.tagline);
    if (preset.description) setBusinessDescription(preset.description);
    setAgentName(preset.agentName);
    setAgentRole(preset.agentRole);
    setCatalogUnit(preset.unit);
    setCurrencySymbol(preset.currency);

    try {
      const res = await fetch("/api/v1/settings/industry-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preset_id: preset.id, seed_sample_catalog: true }),
      });
      if (res.ok) {
        const d = await res.json();
        window.dispatchEvent(new CustomEvent("wb-workspace-config-updated", { detail: d.config }));
        setAiResultBanner(
          `Switched to "${preset.label}" and seeded ${d.seeded_products ?? 4} catalog products into SQLite!`
        );
        setTimeout(() => setAiResultBanner(null), 5000);
      }
    } catch {
      // ignore
    }
  };

  const handleAiAutoFill = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiGenerating(true);
    setAiResultBanner(null);
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
        const syn = data.synthesized;
        if (syn) {
          setBusinessName(syn.business_name);
          setBusinessIndustry(syn.business_industry);
          setBusinessTagline(syn.business_tagline);
          setBusinessDescription(syn.business_description);
          setAgentName(syn.agent_name || "EDITH");
          setAgentRole(syn.agent_role);
          setBrandTone(syn.brand_tone);
          setTargetAudience(syn.target_audience);
          setCurrencySymbol(syn.currency_symbol);
          setCatalogUnit(syn.catalog_unit);
          setMaxDiscountPct(Number(syn.max_discount_pct ?? 12));
          setEscalationQty(Number(syn.escalation_qty ?? 50));
          setTaxRatePct(Number(syn.tax_rate_pct ?? 18));
          setPaymentTerms(syn.payment_terms);
          setReturnPolicy(syn.return_policy);
          setSupportedLanguages(syn.supported_languages);
          setAiSeededProducts(syn.sample_products || []);
        }
        if (data.config) {
          window.dispatchEvent(new CustomEvent("wb-workspace-config-updated", { detail: data.config }));
        }
        await loadAllSettings();
        setAiResultBanner(
          `✨ AI Architect configured "${syn?.business_name}" (${syn?.business_industry}) + seeded ${data.seeded_products || 4} tailored catalog products!`
        );
      }
    } catch (e) {
      console.error("AI autofill error", e);
    } finally {
      setIsAiGenerating(false);
    }
  };

  const handleSaveCustomPreset = async () => {
    if (!customPresetLabel.trim()) return;
    try {
      const res = await fetch("/api/v1/settings/custom-preset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: customPresetLabel.trim(),
          icon: customPresetIcon || "🏢",
          business_name: businessName,
          business_industry: businessIndustry,
          business_tagline: businessTagline,
          business_description: businessDescription,
          catalog_unit: catalogUnit,
          currency_symbol: currencySymbol,
          apply_immediately: true,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        setShowCustomModal(false);
        setCustomPresetLabel("");
        await loadAllSettings();
        if (d.config) {
          window.dispatchEvent(new CustomEvent("wb-workspace-config-updated", { detail: d.config }));
        }
        setAiResultBanner(`Saved "${customPresetLabel}" as a permanent Custom Industry Preset!`);
        setTimeout(() => setAiResultBanner(null), 4500);
      }
    } catch {
      // ignore
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const res = await fetch("/api/v1/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          global_autonomous_enabled: autonomous,
          quiet_hours_enabled: quietHours,
          owner_notification_enabled: ownerNotification,
          owner_whatsapp_number: ownerPhone,
          followup_inactivity_minutes: touch1Minutes,
          followup_midterm_hours: touch2Hours,
          followup_final_days: touch3Days,
          business_name: businessName,
          business_industry: businessIndustry,
          business_tagline: businessTagline,
          business_description: businessDescription,
          agent_name: agentName,
          agent_role: agentRole,
          currency_symbol: currencySymbol,
          catalog_unit: catalogUnit,
          brand_tone: brandTone,
          target_audience: targetAudience,
          max_discount_pct: maxDiscountPct,
          escalation_qty: escalationQty,
          tax_rate_pct: taxRatePct,
          payment_terms: paymentTerms,
          return_policy: returnPolicy,
          supported_languages: supportedLanguages,
          whatsapp_connection_mode: waMode,
          meta_phone_number_id: metaPhoneId,
          meta_waba_id: metaWabaId,
          meta_access_token: metaAccessToken,
          meta_verify_token: metaVerifyToken,
          worker_count: workerCount,
          message_debounce_seconds: debounceSeconds,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4500);
        const wsRes = await fetch("/api/v1/settings/workspace-config");
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          window.dispatchEvent(new CustomEvent("wb-workspace-config-updated", { detail: wsData }));
        }
      }
    } catch (e) {
      console.error("Error saving settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-7 max-w-6xl mx-auto pb-14">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div
            className="p-3 rounded-2xl text-white shadow-sm"
            style={{ background: "var(--ed-accent)" }}
          >
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
              Business Architect, WhatsApp Gateway & System Settings
            </h2>
            <p className="text-xs sm:text-sm text-[var(--ed-text-muted)] mt-0.5">
              Adapt FRIDAY + EDITH for any industry in seconds — auto-fill via AI, configure Official or Unofficial WhatsApp, and fine-tune negotiation rules.
            </p>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ed-interactive ed-press ed-focus-ring inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-md transition-all disabled:opacity-50 shrink-0"
          style={{ background: "var(--ed-accent)" }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Synchronizing..." : "Save All Changes"}
        </button>
      </div>

      {/* Save / AI Notification Toast */}
      {(saved || aiResultBanner) && (
        <div
          className="p-4 border border-emerald-500/30 text-sm font-semibold text-emerald-600 dark:text-emerald-300 rounded-2xl flex items-center gap-3 shadow-sm"
          style={{ background: "color-mix(in srgb, var(--ed-success) 12%, var(--ed-surface))" }}
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
          <div>
            <div>{aiResultBanner || "Settings, WhatsApp Gateway & Business Profile synchronized!"}</div>
            <div className="text-xs font-normal text-[var(--ed-text-muted)] mt-0.5">
              All changes are live across FRIDAY (Gemini Web Copilot), EDITH (NVIDIA NIM Sales Brain), and the SQLite product catalog.
            </div>
          </div>
        </div>
      )}

      {/* ✨ HERO FEATURE: Tell AI What Your Business Does -> Auto-Fill Everything */}
      <div
        className="p-5 sm:p-6 rounded-2xl border border-[var(--ed-accent)]/35 shadow-sm space-y-4"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ed-accent) 9%, var(--ed-surface)), var(--ed-surface))",
        }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[var(--ed-accent)]/15 text-[var(--ed-accent)]">
              <Wand2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-[var(--ed-text-primary)] flex items-center gap-2">
                <span>AI Business Architect — Auto-Configure Any Business in 1 Click</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--ed-accent)] text-white font-bold uppercase tracking-wider">
                  Instant Setup
                </span>
              </h3>
              <p className="text-xs text-[var(--ed-text-muted)]">
                Describe any business in plain English. AI automatically populates all 16 company, pricing & policy fields AND seeds 4 matching products into your catalog.
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAiAutoFill();
            }}
            placeholder='e.g. "We run a solar rooftop & lithium battery company in Pune called SunVolt" or "Luxury artisanal bakery & corporate gifting in Mumbai"'
            className="flex-1 px-4 py-3 rounded-xl border border-[var(--ed-border)] text-xs sm:text-sm text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
            style={{ background: "var(--ed-bg)" }}
          />
          <button
            type="button"
            onClick={handleAiAutoFill}
            disabled={isAiGenerating || !aiPrompt.trim()}
            className="px-5 py-3 rounded-xl font-bold text-xs sm:text-sm text-white flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50 shrink-0"
            style={{ background: "var(--ed-accent)" }}
          >
            {isAiGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Building Profile & Catalog...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Auto-Fill Everything with AI
              </>
            )}
          </button>
        </div>

        {/* Quick Example Chips */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className="text-[11px] font-semibold text-[var(--ed-text-muted)]">Try an example:</span>
          {[
            "Solar rooftop & lithium battery EPC company called SunVolt Renewables",
            "Gourmet artisanal bakery & corporate gift hamper studio called Le Sucre",
            "Luxury bridal couture & fine diamond jewelry house called Maison Aura",
            "EV charging infrastructure & commercial fleet telemetry provider",
          ].map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => setAiPrompt(sample)}
              className="text-[11px] px-2.5 py-1 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-secondary)] hover:border-[var(--ed-accent)] hover:text-[var(--ed-text-primary)] transition-colors"
              style={{ background: "var(--ed-bg)" }}
            >
              {sample.slice(0, 46)}...
            </button>
          ))}
        </div>

        {/* AI Generating Indicator */}
        {isAiGenerating && (
          <div className="py-8 flex flex-col items-center justify-center space-y-3 border border-sky-500/20 rounded-2xl bg-slate-900/40">
            <AiLoader fullScreen={false} size={140} text="Synthesizing" />
            <p className="text-xs font-mono text-[var(--ed-text-muted)] animate-pulse">
              Synthesizing enterprise catalog, business persona, and margin defense policies...
            </p>
          </div>
        )}

        {/* Show newly seeded AI products if generated */}
        {aiSeededProducts.length > 0 && (
          <div className="pt-2 border-t border-[var(--ed-border)]">
            <div className="text-[11px] font-bold text-[var(--ed-text-muted)] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-emerald-500" />
              AI-Generated Products Seeded into SQLite Catalog:
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {aiSeededProducts.map((prod, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl border border-[var(--ed-border)] text-xs"
                  style={{ background: "var(--ed-bg)" }}
                >
                  <div className="font-mono text-[10px] text-[var(--ed-accent)] font-bold">{prod.sku}</div>
                  <div className="font-bold text-[var(--ed-text-primary)] truncate mt-0.5">{prod.name}</div>
                  <div className="text-[11px] text-[var(--ed-text-muted)] mt-1">
                    {currencySymbol}
                    {Number(prod.base_price).toLocaleString()} / {prod.unit} (Floor: {currencySymbol}
                    {Number(prod.floor_price).toLocaleString()})
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 1. Multi-Business Domain Presets + Create Custom Preset */}
      <div className="p-5 sm:p-6 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div>
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)]">
              <Sparkles className="w-4 h-4 text-[var(--ed-accent)]" />
              Industry & Domain Presets ({presets.length} Available)
            </div>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Click any preset to switch the platform identity and seed sample catalog products, or save your own custom preset.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowCustomModal(!showCustomModal)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--ed-accent)]/40 text-xs font-bold text-[var(--ed-accent)] hover:bg-[var(--ed-accent)]/10 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            Save Current as New Preset
          </button>
        </div>

        {showCustomModal && (
          <div
            className="p-4 rounded-xl border border-[var(--ed-accent)]/40 space-y-3"
            style={{ background: "var(--ed-bg)" }}
          >
            <div className="text-xs font-bold text-[var(--ed-text-primary)]">
              Save Current Business Profile ({businessName}) as Reusable Industry Preset
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-[var(--ed-text-muted)] mb-1">Icon (Emoji)</label>
                <input
                  type="text"
                  value={customPresetIcon}
                  onChange={(e) => setCustomPresetIcon(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-center text-base"
                  style={{ background: "var(--ed-surface)" }}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-[var(--ed-text-muted)] mb-1">Preset Label</label>
                <input
                  type="text"
                  value={customPresetLabel}
                  onChange={(e) => setCustomPresetLabel(e.target.value)}
                  placeholder="e.g. Solar & CleanTech EPC"
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-xs font-semibold text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-surface)" }}
                />
              </div>
              <div className="flex items-end gap-2">
                <button
                  type="button"
                  onClick={handleSaveCustomPreset}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white"
                  style={{ background: "var(--ed-accent)" }}
                >
                  Save Preset
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {presets.map((p) => {
            const isSelected = activePreset === p.id || businessName === p.name;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-3.5 rounded-xl border text-left transition-all relative ${
                  isSelected
                    ? "border-[var(--ed-accent)] shadow-sm ring-1 ring-[var(--ed-accent)]/40"
                    : "border-[var(--ed-border)] hover:border-[var(--ed-accent)]/40"
                }`}
                style={{
                  background: isSelected
                    ? "color-mix(in srgb, var(--ed-accent) 10%, var(--ed-surface))"
                    : "var(--ed-bg)",
                }}
              >
                {p.isCustom && (
                  <span className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 rounded bg-[var(--ed-accent)]/15 text-[var(--ed-accent)] font-bold">
                    Custom
                  </span>
                )}
                <div className="text-2xl mb-1.5">{p.icon}</div>
                <div className="font-bold text-xs text-[var(--ed-text-primary)] line-clamp-1">
                  {p.label}
                </div>
                <div className="text-[10px] text-[var(--ed-text-muted)] line-clamp-1 mt-0.5">
                  {p.name}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Official vs Unofficial WhatsApp Gateway Connection */}
      <div className="p-5 sm:p-6 ed-panel rounded-2xl space-y-5 border border-[var(--ed-border)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-emerald-500" />
            <div>
              <h3 className="font-bold text-sm text-[var(--ed-text-primary)]">
                WhatsApp Gateway Connection — Unofficial Bridge & Official Meta Cloud API
              </h3>
              <p className="text-xs text-[var(--ed-text-muted)]">
                Connect via either the Unofficial Multi-Device Baileys Bridge (QR / 8-Digit Pairing Code) or Official Meta WhatsApp Business Cloud API v20.0.
              </p>
            </div>
          </div>

          <div className="inline-flex rounded-xl p-1 border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <button
              type="button"
              onClick={() => setWaMode("unofficial")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                waMode === "unofficial"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              }`}
            >
              ⚡ Unofficial (QR / Pairing Code)
            </button>
            <button
              type="button"
              onClick={() => setWaMode("official")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                waMode === "official"
                  ? "bg-[var(--ed-accent)] text-white shadow-sm"
                  : "text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              }`}
            >
              🛡️ Official (Meta Cloud API)
            </button>
          </div>
        </div>

        {waMode === "unofficial" ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
            <div className="md:col-span-2 p-4 rounded-xl border border-[var(--ed-border)] space-y-2" style={{ background: "var(--ed-bg)" }}>
              <div className="flex items-center gap-2">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    unofficialConnected ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
                  }`}
                />
                <span className="font-bold text-xs text-[var(--ed-text-primary)]">
                  Baileys Multi-Device Node Bridge (Port :3001) —{" "}
                  {unofficialConnected
                    ? `Connected (${botPhone ? `+${botPhone}` : "Active Session"})`
                    : "Awaiting QR Scan or 8-Digit Pairing Code"}
                </span>
              </div>
              <p className="text-xs text-[var(--ed-text-muted)] leading-relaxed">
                Zero Meta approval wait time. Link any personal or WhatsApp Business number directly from your phone using{" "}
                <strong>WhatsApp → Linked Devices</strong> via live QR code or an 8-digit phone pairing code.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => window.dispatchEvent(new CustomEvent("wb-open-onboarding-modal", { detail: { step: 1 } }))}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <QrCode className="w-4 h-4" />
                Open Live QR & Pairing Scanner
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl border border-[var(--ed-accent)]/30 text-xs text-[var(--ed-text-secondary)] flex items-center justify-between gap-3" style={{ background: "var(--ed-bg)" }}>
              <div>
                <span className="font-bold text-[var(--ed-text-primary)]">Official Meta Graph API v20.0 Webhook Endpoint: </span>
                <code className="font-mono text-[11px] text-[var(--ed-accent)] ml-1">/api/v1/webhooks/whatsapp</code>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[var(--ed-accent)]/15 text-[var(--ed-accent)]">
                HMAC-SHA256 Verified
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Meta Phone Number ID (WHATSAPP_PHONE_NUMBER_ID)
                </label>
                <input
                  type="text"
                  value={metaPhoneId}
                  onChange={(e) => setMetaPhoneId(e.target.value)}
                  placeholder="e.g. 104928194829104"
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  WhatsApp Business Account ID (WABA ID)
                </label>
                <input
                  type="text"
                  value={metaWabaId}
                  onChange={(e) => setMetaWabaId(e.target.value)}
                  placeholder="e.g. 109482918491029"
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Permanent System User Access Token (EAA...)
                </label>
                <input
                  type="password"
                  value={metaAccessToken}
                  onChange={(e) => setMetaAccessToken(e.target.value)}
                  placeholder="EAAGm0PX4ZCpsBA..."
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Webhook Verify Token (WHATSAPP_VERIFY_TOKEN)
                </label>
                <input
                  type="text"
                  value={metaVerifyToken}
                  onChange={(e) => setMetaVerifyToken(e.target.value)}
                  placeholder="wb_agent_verify_token"
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] font-mono text-[var(--ed-text-primary)]"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 3. Detailed Business Identity, Negotiation Guardrails & Commercial Policies */}
      <div className="p-5 sm:p-6 ed-panel rounded-2xl space-y-5 border border-[var(--ed-border)]">
        <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-4">
          <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)]">
            <Briefcase className="w-4 h-4 text-[var(--ed-accent)]" />
            Complete Business Identity, Pricing Guardrails & Commercial Policies
          </div>
          <span className="text-[11px] text-[var(--ed-text-muted)]">
            Injected live into FRIDAY & EDITH system prompts
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Business / Brand Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-semibold text-sm"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Industry / Vertical Domain
            </label>
            <input
              type="text"
              value={businessIndustry}
              onChange={(e) => setBusinessIndustry(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-semibold text-sm"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Business Tagline / Value Header
            </label>
            <input
              type="text"
              value={businessTagline}
              onChange={(e) => setBusinessTagline(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Autonomous Agent Persona Role
            </label>
            <input
              type="text"
              value={agentRole}
              onChange={(e) => setAgentRole(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Brand Tone & Conversational Style
            </label>
            <input
              type="text"
              value={brandTone}
              onChange={(e) => setBrandTone(e.target.value)}
              placeholder="e.g. Executive, Consultative & High-Trust"
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Agent Name</label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-bold text-center"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Unit</label>
              <input
                type="text"
                value={catalogUnit}
                onChange={(e) => setCatalogUnit(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono text-center"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Currency</label>
              <input
                type="text"
                value={currencySymbol}
                onChange={(e) => setCurrencySymbol(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono text-center"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
          </div>

          {/* Commercial & Negotiation Guardrails */}
          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Max Autonomous Discount % (Floor Guardrail)
            </label>
            <input
              type="number"
              min="0"
              max="50"
              step="0.5"
              value={maxDiscountPct}
              onChange={(e) => setMaxDiscountPct(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Owner Escalation Order Qty Threshold
            </label>
            <input
              type="number"
              min="1"
              value={escalationQty}
              onChange={(e) => setEscalationQty(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Tax / GST Rate (%)
            </label>
            <input
              type="number"
              min="0"
              max="40"
              step="0.5"
              value={taxRatePct}
              onChange={(e) => setTaxRatePct(Number(e.target.value))}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Payment & Settlement Terms
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Return / Quality Guarantee Policy
            </label>
            <input
              type="text"
              value={returnPolicy}
              onChange={(e) => setReturnPolicy(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Supported Customer Languages
            </label>
            <input
              type="text"
              value={supportedLanguages}
              onChange={(e) => setSupportedLanguages(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)]"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div className="md:col-span-3">
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
              Detailed Business Scope, Knowledge Base & Value Proposition
            </label>
            <textarea
              rows={3}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] text-xs leading-relaxed"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>
        </div>
      </div>

      {/* 4. Owner Escalation, Follow-up Cadence & Backend Engine Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Owner Escalation */}
        <div className="p-5 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Radio className="w-4 h-4 text-[var(--ed-accent)]" />
            Owner Escalation Phone
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                Owner WhatsApp Number (E.164)
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                placeholder="e.g. 919876543210"
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold"
                style={{ background: "var(--ed-bg)" }}
              />
              <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
                Receives instant order confirmations, high-value lead alerts & human handoffs.
              </span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={ownerNotification}
                onChange={(e) => setOwnerNotification(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)]"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Send Live WhatsApp Alerts on Hot Leads
              </span>
            </label>
          </div>
        </div>

        {/* Follow-up Cadence */}
        <div className="p-5 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Clock className="w-4 h-4 text-[var(--ed-accent)]" />
            Follow-Up Cadence
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Touch 1 (m)</label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={touch1Minutes}
                  onChange={(e) => setTouch1Minutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Touch 2 (h)</label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={touch2Hours}
                  onChange={(e) => setTouch2Hours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Touch 3 (d)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={touch3Days}
                  onChange={(e) => setTouch3Days(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)]"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Quiet Hours (9 PM – 9 AM IST)
              </span>
            </label>
          </div>
        </div>

        {/* Backend Bus & Autonomous Switch */}
        <div className="p-5 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
          <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)]">
              <Sliders className="w-4 h-4 text-[var(--ed-accent)]" />
              Backend Bus & Kill-Switch
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5 text-xs">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Async Workers</label>
              <input
                type="number"
                min="1"
                max="16"
                value={workerCount}
                onChange={(e) => setWorkerCount(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1">Debounce (sec)</label>
              <input
                type="number"
                min="0"
                max="15"
                value={debounceSeconds}
                onChange={(e) => setDebounceSeconds(Number(e.target.value))}
                className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => setAutonomous(!autonomous)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
            style={{ background: autonomous ? "var(--ed-danger)" : "var(--ed-success)" }}
          >
            {autonomous ? "HALT AUTONOMOUS MESSAGING" : "RESUME AUTONOMOUS MESSAGING"}
          </button>
        </div>
      </div>

      {/* Bottom Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ed-interactive ed-press ed-focus-ring w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-bold text-sm shadow-lg transition-all disabled:opacity-50"
          style={{ background: "var(--ed-accent)" }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving & Synchronizing..." : "Save & Synchronize Platform"}
        </button>
      </div>
    </div>
  );
}
