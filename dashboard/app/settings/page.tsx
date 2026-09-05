"use client";

import React, { useState, useEffect } from "react";
import {
  Settings,
  Shield,
  Power,
  Radio,
  Server,
  Save,
  Clock,
  CheckCircle2,
  Moon,
  Building2,
  Briefcase,
  Bot,
  Sparkles,
  Globe,
  Cpu,
  Layers,
  ArrowRight,
} from "lucide-react";

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
}

const BUSINESS_PRESETS: BusinessPreset[] = [
  {
    id: "tea",
    label: "Specialty Tea & Agro Estate",
    icon: "🍵",
    name: "North Bengal Tea Co.",
    industry: "Wholesale Tea & Agro Produce",
    tagline: "Direct Commercial Estate Wholesale",
    description: "Direct commercial wholesale estate tea producer supplying single-estate Darjeeling, Dooars hotel blends, Assam Kadak CTC, and specialty Himalayan teas directly to cafes, restaurants, luxury hotels, and distributors across India.",
    agentName: "EDITH",
    agentRole: "Principal Commercial Sales Consultant",
    unit: "kg",
    currency: "₹",
  },
  {
    id: "coffee",
    label: "Artisan Coffee Roastery & Beans",
    icon: "☕",
    name: "EstateCraft Coffee Roasters",
    industry: "Specialty Green & Roasted Coffee Wholesale",
    tagline: "Farm-Direct Arabica & Robusta B2B Supply",
    description: "Commercial supplier of high-altitude shade-grown Arabica and washed Robusta beans, single-origin micro-lots, and custom espresso blends engineered for cafes, hotels, and retail coffee chains.",
    agentName: "EDITH",
    agentRole: "Specialty Coffee Wholesale Consultant",
    unit: "kg",
    currency: "₹",
  },
  {
    id: "spices",
    label: "Spices, Herbs & Agro Produce",
    icon: "🌶️",
    name: "Himalayan Harvest Spices",
    industry: "Wholesale Spices & Bulk Agricultural Commodities",
    tagline: "Origin-Certified Whole & Ground Commercial Spices",
    description: "Export-grade wholesale supplier of black pepper, green cardamom, organic turmeric, cumin, and whole spices for food processors, restaurants, and FMCG packaging brands.",
    agentName: "EDITH",
    agentRole: "Agro Commodity Trade Advisor",
    unit: "kg",
    currency: "₹",
  },
  {
    id: "textiles",
    label: "Textiles, Fabrics & Apparel",
    icon: "👕",
    name: "Apex Weaves & Textiles",
    industry: "B2B Fabric & Garment Manufacturing",
    tagline: "Mill-Direct Sustainable Cotton, Linen & Knits",
    description: "High-volume fabric supplier providing organic cotton, linen blends, premium rayon, and custom finished textiles to garment exporters, fashion labels, and uniform manufacturers.",
    agentName: "EDITH",
    agentRole: "Textile Commercial Specialist",
    unit: "meters",
    currency: "₹",
  },
  {
    id: "fmcg",
    label: "FMCG, Beverages & Packaged Goods",
    icon: "🥤",
    name: "Zenith Food & Beverage Wholesale",
    industry: "Commercial Beverage & Gourmet Grocery Distribution",
    tagline: "Volume Wholesale for QSRs, Cloud Kitchens & Retailers",
    description: "Authorized B2B distributor of specialty syrups, beverage bases, gourmet sauces, and commercial ingredients for cafes, quick-service chains, and supermarket networks.",
    agentName: "EDITH",
    agentRole: "B2B Account Director",
    unit: "cases",
    currency: "₹",
  },
  {
    id: "hardware",
    label: "Industrial, Hardware & Electronics",
    icon: "⚙️",
    name: "NexGen Industrial Supplies",
    industry: "Commercial Electronics & Precision Fasteners",
    tagline: "OEM Components, Sensors & Industrial Fasteners",
    description: "Factory-direct supplier of precision hardware, IoT sensors, cabling harnesses, and industrial tooling for electronics manufacturers and infrastructure contractors.",
    agentName: "EDITH",
    agentRole: "Technical Sales Specialist",
    unit: "units",
    currency: "₹",
  },
];

export default function SystemSettingsPage() {
  const [autonomous, setAutonomous] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [ownerNotification, setOwnerNotification] = useState(true);
  const [ownerPhone, setOwnerPhone] = useState("+918900653250");
  const [touch1Minutes, setTouch1Minutes] = useState(20);
  const [touch2Hours, setTouch2Hours] = useState(8);
  const [touch3Days, setTouch3Days] = useState(7);
  
  // Business Profile State
  const [businessName, setBusinessName] = useState("North Bengal Tea Co.");
  const [businessIndustry, setBusinessIndustry] = useState("Wholesale Tea & Agro Produce");
  const [businessTagline, setBusinessTagline] = useState("Direct Commercial Estate Wholesale");
  const [businessDescription, setBusinessDescription] = useState("Commercial B2B supplier supplying fresh wholesale products directly to cafes, restaurants, hotels, and businesses.");
  const [agentName, setAgentName] = useState("EDITH");
  const [agentRole, setAgentRole] = useState("Principal Commercial Sales Consultant");
  const [currencySymbol, setCurrencySymbol] = useState("₹");
  const [catalogUnit, setCatalogUnit] = useState("kg");
  const [activePreset, setActivePreset] = useState("tea");

  const [saved, setSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/v1/settings")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data) {
          setAutonomous(data.global_autonomous_enabled ?? true);
          setQuietHours(data.quiet_hours_enabled ?? true);
          setOwnerNotification(data.owner_notification_enabled ?? true);
          setOwnerPhone(data.owner_whatsapp_number || "+918900653250");
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
        }
      })
      .catch(() => {});
  }, []);

  const handleApplyPreset = (preset: BusinessPreset) => {
    setActivePreset(preset.id);
    setBusinessName(preset.name);
    setBusinessIndustry(preset.industry);
    setBusinessTagline(preset.tagline);
    setBusinessDescription(preset.description);
    setAgentName(preset.agentName);
    setAgentRole(preset.agentRole);
    setCatalogUnit(preset.unit);
    setCurrencySymbol(preset.currency);
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
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 4000);
      }
    } catch (e) {
      console.error("Error saving settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl text-white" style={{ background: "var(--ed-accent)" }}>
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
              Business Configuration & Multi-Domain Adaptation
            </h2>
            <p className="text-sm text-[var(--ed-text-muted)] mt-0.5">
              Transform WB-Agent for any B2B enterprise — customize business identity, industry persona, autonomous parameters, and model intelligence.
            </p>
          </div>
        </div>
      </div>

      {saved && (
        <div
          className="p-4 border border-[var(--ed-success)]/30 text-sm font-semibold text-[var(--ed-success)] rounded-xl flex items-center gap-3 shadow-md animate-in fade-in duration-200"
          style={{ background: "color-mix(in srgb, var(--ed-success) 12%, transparent)" }}
        >
          <CheckCircle2 className="w-5 h-5 text-[var(--ed-success)] shrink-0" />
          <div>
            <div>Settings & Business Profile successfully synchronized!</div>
            <div className="text-xs font-normal opacity-85 mt-0.5">
              EDITH autonomous sales persona, pro-forma invoice generator, and model routing parameters are now actively configured for {businessName}.
            </div>
          </div>
        </div>
      )}

      {/* Emergency Stop Banner */}
      <div
        className="p-5 rounded-2xl border border-[var(--ed-danger)]/25 flex items-center justify-between shadow-sm"
        style={{ background: "color-mix(in srgb, var(--ed-danger) 8%, transparent)" }}
      >
        <div className="flex items-center gap-3.5">
          <div
            className="p-2.5 rounded-xl text-white shadow-sm"
            style={{ background: "var(--ed-danger)" }}
          >
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[var(--ed-text-primary)]">
              Global Autonomous Kill-Switch
            </h4>
            <p className="text-xs text-[var(--ed-text-muted)] mt-0.5">
              Instantly halts all automated customer messaging and scheduled follow-ups across all channels.
            </p>
          </div>
        </div>

        <button
          onClick={() => setAutonomous(!autonomous)}
          className="ed-press ed-focus-ring px-5 py-2.5 rounded-xl text-xs font-bold text-white transition-all hover:opacity-90 shadow-sm"
          style={{
            background: autonomous ? "var(--ed-danger)" : "var(--ed-success)",
          }}
        >
          {autonomous ? "HALT ALL AI MESSAGING" : "RESUME AI MESSAGING"}
        </button>
      </div>

      {/* 1. Multi-Business Domain Presets */}
      <div className="p-6 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
        <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-4">
          <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)]">
            <Sparkles className="w-4 h-4 text-[var(--ed-accent)]" />
            Quick Industry & Domain Presets
          </div>
          <span className="text-xs text-[var(--ed-text-muted)]">
            Click any preset to adapt the AI persona and business profile instantly
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {BUSINESS_PRESETS.map((p) => {
            const isSelected = activePreset === p.id || businessName === p.name;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleApplyPreset(p)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? "border-[var(--ed-accent)] shadow-sm ring-1 ring-[var(--ed-accent)]/50"
                    : "border-[var(--ed-border)] hover:border-[var(--ed-accent)]/40"
                }`}
                style={{
                  background: isSelected
                    ? "color-mix(in srgb, var(--ed-accent) 10%, transparent)"
                    : "var(--ed-bg)",
                }}
              >
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

      {/* 2. Business Profile & Persona Customization */}
      <div className="p-6 ed-panel rounded-2xl space-y-5 border border-[var(--ed-border)]">
        <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-4">
          <Briefcase className="w-4 h-4 text-[var(--ed-accent)]" />
          Business Identity & Sales Persona Details
        </div>

        {/* Brand Logo & Visual Assets Showcase */}
        <div className="p-5 rounded-2xl border border-[var(--ed-border)] bg-[var(--ed-bg)] space-y-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-[var(--ed-border)] pb-3">
            <div className="space-y-0.5 text-center sm:text-left">
              <div className="font-bold text-xs text-[var(--ed-text-primary)] flex items-center justify-center sm:justify-start gap-2">
                <span>Official EDITH Brand Assets & Typography</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 font-semibold">
                  Active Systemwide
                </span>
              </div>
              <p className="text-[11px] text-[var(--ed-text-muted)]">
                More Conversations. Real Opportunities. Optimized for White and Black themes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            {/* 1. Transparent Emblem */}
            <div className="p-3.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl ed-brand-avatar flex items-center justify-center p-1.5 shrink-0">
                <img
                  src="/logo-icon.png"
                  alt="Transparent Emblem"
                  className="w-full h-full object-contain drop-shadow-[0_2px_8px_rgba(56,189,248,0.4)]"
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-[var(--ed-text-primary)] truncate">
                  Transparent Emblem
                </div>
                <div className="text-[10px] text-[var(--ed-text-muted)] mt-0.5">
                  512×512 RGBA PNG
                </div>
                <div className="font-mono text-[9px] text-sky-600 dark:text-sky-400 mt-1 truncate">
                  /logo-icon.png
                </div>
              </div>
            </div>

            {/* 2. Master Artwork */}
            <div className="p-3.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl overflow-hidden border border-sky-500/30 bg-slate-950 flex items-center justify-center p-0.5 shrink-0 shadow-sm">
                <img
                  src="/logo.png"
                  alt="Master Artwork"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-[var(--ed-text-primary)] truncate">
                  Master Brand Art
                </div>
                <div className="text-[10px] text-[var(--ed-text-muted)] mt-0.5">
                  1254×1254 High-Res
                </div>
                <div className="font-mono text-[9px] text-sky-600 dark:text-sky-400 mt-1 truncate">
                  /edith-master.png
                </div>
              </div>
            </div>

            {/* 3. Multi-Res Favicon & PWA */}
            <div className="p-3.5 rounded-xl border border-[var(--ed-border)] bg-[var(--ed-surface)] flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl ed-brand-avatar flex items-center justify-center p-2 shrink-0">
                <img
                  src="/favicon.ico"
                  alt="Favicon"
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="font-bold text-xs text-[var(--ed-text-primary)] truncate">
                  Favicon & App Icon
                </div>
                <div className="text-[10px] text-[var(--ed-text-muted)] mt-0.5">
                  16-256px Multi-Layer ICO
                </div>
                <div className="font-mono text-[9px] text-sky-600 dark:text-sky-400 mt-1 truncate">
                  /favicon.ico
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
              Business / Company Name
            </label>
            <input
              type="text"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. North Bengal Tea Co., Artisan Coffee Roasters"
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-semibold text-sm focus:outline-none ed-focus-ring"
              style={{ background: "var(--ed-bg)" }}
            />
            <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
              Appears on WhatsApp headers, opt-out notices, and pro-forma invoice branding.
            </span>
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
              Industry / Commercial Domain
            </label>
            <input
              type="text"
              value={businessIndustry}
              onChange={(e) => setBusinessIndustry(e.target.value)}
              placeholder="e.g. Wholesale Tea, Specialty Coffee, Textile Exports"
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-semibold text-sm focus:outline-none ed-focus-ring"
              style={{ background: "var(--ed-bg)" }}
            />
            <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
              Informs EDITH's conversational domain knowledge and vocabulary.
            </span>
          </div>

          <div>
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
              Business Tagline / Sub-Heading
            </label>
            <input
              type="text"
              value={businessTagline}
              onChange={(e) => setBusinessTagline(e.target.value)}
              placeholder="e.g. Direct Commercial Estate Wholesale"
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] focus:outline-none ed-focus-ring"
              style={{ background: "var(--ed-bg)" }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
                AI Agent Name
              </label>
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="e.g. EDITH"
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-semibold focus:outline-none ed-focus-ring"
                style={{ background: "var(--ed-bg)" }}
              />
            </div>
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
                Catalog Unit / Currency
              </label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={catalogUnit}
                  onChange={(e) => setCatalogUnit(e.target.value)}
                  placeholder="Unit (kg/units)"
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono text-center focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
                <input
                  type="text"
                  value={currencySymbol}
                  onChange={(e) => setCurrencySymbol(e.target.value)}
                  placeholder="Currency (₹/$)"
                  className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono text-center focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
              Commercial Sales Value Proposition & Operational Scope
            </label>
            <textarea
              rows={3}
              value={businessDescription}
              onChange={(e) => setBusinessDescription(e.target.value)}
              placeholder="Describe your wholesale products, target customers (cafes, hotels, distributors), and pricing approach."
              className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] text-xs focus:outline-none ed-focus-ring leading-relaxed"
              style={{ background: "var(--ed-bg)" }}
            />
            <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
              Injected directly into NVIDIA Nemotron system prompts for grounded, domain-specific consultative selling.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Communication & Safety Controls */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Escalation & Owner WhatsApp */}
        <div className="p-6 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
          <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Radio className="w-4 h-4 text-[var(--ed-accent)]" />
            Owner Escalation Channel
          </div>

          <div className="space-y-3.5 text-xs">
            <div>
              <label className="block text-[var(--ed-text-muted)] font-medium mb-1.5">
                Owner WhatsApp Number (E.164 format)
              </label>
              <input
                type="text"
                value={ownerPhone}
                onChange={(e) => setOwnerPhone(e.target.value)}
                className="w-full p-3 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold focus:outline-none ed-focus-ring"
                style={{ background: "var(--ed-bg)" }}
              />
              <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
                Receives instant hot-lead alerts, wholesale order pro-formas, and owner WhatsApp command queries.
              </span>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={ownerNotification}
                onChange={(e) => setOwnerNotification(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)] ed-focus-ring"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Send Real-Time WhatsApp Alerts on Hot Lead Purchase Intent
              </span>
            </label>
          </div>
        </div>

        {/* Follow-up Intervals & Quiet Hours */}
        <div className="p-6 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
          <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Clock className="w-4 h-4 text-[var(--ed-accent)]" />
            Humanized Follow-Up Cadence
          </div>

          <div className="space-y-3.5 text-xs">
            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Touch 1 (Min)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={touch1Minutes}
                  onChange={(e) => setTouch1Minutes(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Touch 2 (Hours)
                </label>
                <input
                  type="number"
                  min="1"
                  max="48"
                  value={touch2Hours}
                  onChange={(e) => setTouch2Hours(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
              <div>
                <label className="block text-[var(--ed-text-muted)] font-medium mb-1">
                  Touch 3 (Days)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={touch3Days}
                  onChange={(e) => setTouch3Days(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-mono font-bold text-center focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2.5 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)] ed-focus-ring"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Enforce Quiet Hours (No automated messages between 9 PM and 9 AM IST)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* 4. NVIDIA NIM Intelligence Layer Rollup */}
      <div className="p-6 ed-panel rounded-2xl space-y-4 border border-[var(--ed-border)]">
        <div className="flex items-center justify-between border-b border-[var(--ed-border)] pb-3">
          <div className="flex items-center gap-2.5 font-bold text-sm text-[var(--ed-text-primary)]">
            <Cpu className="w-4 h-4 text-[var(--ed-accent)]" />
            NVIDIA NIM Multi-Model Intelligence Layer
          </div>
          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20">
            7 Active Capability Chains
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-xl border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <div className="font-bold text-[var(--ed-text-primary)]">A. Core Sales Brain</div>
            <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">nemotron-3-super-120b</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-mono">Reasoning Extraction Active</div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <div className="font-bold text-[var(--ed-text-primary)]">B. Intent & Lead Scoring</div>
            <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">nemotron-3.5-lightning-30b</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-mono">Low-Latency Parallel</div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <div className="font-bold text-[var(--ed-text-primary)]">C. Structured Pricing</div>
            <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">nemotron-3.5 + DB Cross-Check</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-mono">Zero-Hallucination DB Rule</div>
          </div>

          <div className="p-3 rounded-xl border border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
            <div className="font-bold text-[var(--ed-text-primary)]">G. Safety Guardrails</div>
            <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">nemotron-3.5 & llama-3.1-guard</div>
            <div className="text-[10px] text-emerald-400 mt-1 font-mono">Fail-Closed Human Hold</div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-2">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ed-interactive ed-press ed-focus-ring inline-flex items-center gap-2.5 px-8 py-3.5 rounded-xl text-white font-bold text-sm shadow-xl transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: "var(--ed-accent)", minHeight: "48px" }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving & Synchronizing..." : "Save & Synchronize Platform"}
        </button>
      </div>
    </div>
  );
}
