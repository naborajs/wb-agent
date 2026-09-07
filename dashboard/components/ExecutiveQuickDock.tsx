"use client";

import React, { useState, useEffect } from "react";
import {
  Zap,
  Radio,
  BookOpen,
  ShieldAlert,
  ShieldCheck,
  Send,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Play,
} from "lucide-react";

interface ExecutiveQuickDockProps {
  onTestDiscountPolicy: (prompt: string) => void;
  onSendWhatsAppPing: () => Promise<boolean | void>;
  isSendingPing?: boolean;
}

export default function ExecutiveQuickDock({
  onTestDiscountPolicy,
  onSendWhatsAppPing,
  isSendingPing = false,
}: ExecutiveQuickDockProps) {
  const [safeMode, setSafeMode] = useState(false);
  const [isTogglingSafeMode, setIsTogglingSafeMode] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  // Temporary Rule Modal
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [ruleTitle, setRuleTitle] = useState("Festival Wholesale Promotion");
  const [ruleDiscount, setRuleDiscount] = useState("10.0");
  const [ruleMoq, setRuleMoq] = useState("100");
  const [isAddingRule, setIsAddingRule] = useState(false);

  // Load safe mode status
  useEffect(() => {
    fetch("/api/v1/brain/safe-mode")
      .then((r) => r.ok && r.json())
      .then((data) => {
        if (data?.safe_mode_enabled !== undefined) {
          setSafeMode(data.safe_mode_enabled);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleSafeMode = async () => {
    setIsTogglingSafeMode(true);
    try {
      const nextState = !safeMode;
      const res = await fetch("/api/v1/brain/toggle-safe-mode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: nextState }),
      });
      if (res.ok) {
        const data = await res.json();
        setSafeMode(data.safe_mode_enabled);
        setActionFeedback(
          data.safe_mode_enabled
            ? "🛑 Autonomous Safe Mode Enabled (AI is read-only)"
            : "🟢 Autonomous Mode Active (Full AI closing enabled)"
        );
        setTimeout(() => setActionFeedback(null), 3000);
      }
    } catch {
      setActionFeedback("Failed to toggle safe mode");
      setTimeout(() => setActionFeedback(null), 2500);
    } finally {
      setIsTogglingSafeMode(false);
    }
  };

  const handleCreateTempRule = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingRule(true);
    try {
      const instruction = `Add pricing rule '${ruleTitle}': ${ruleDiscount}% discount for ${ruleMoq}+ units MOQ`;
      const res = await fetch("/api/v1/brain/voice-knowledge-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          instruction,
          category: "pricing_rule",
          fields: {
            discount_percentage: parseFloat(ruleDiscount) || 10.0,
            min_quantity: parseFloat(ruleMoq) || 100,
          },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setActionFeedback(`✅ EDITH approved & activated: "${ruleTitle}"`);
        setShowRuleModal(false);
      } else {
        setActionFeedback(`⚠️ EDITH Refusal: ${data.reasoning || "Policy limit exceeded"}`);
      }
      setTimeout(() => setActionFeedback(null), 4000);
    } catch {
      setActionFeedback("Error communicating with EDITH");
      setTimeout(() => setActionFeedback(null), 3000);
    } finally {
      setIsAddingRule(false);
    }
  };

  return (
    <div className="w-full">
      {/* Dock Bar */}
      <div className="p-3 sm:p-3.5 rounded-2xl bg-white/95 dark:bg-[#0B0F19] border border-slate-200/90 dark:border-[#1E293B] shadow-sm flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-mono transition-colors">
        {/* Left Dock Brand / Label */}
        <div className="flex items-center gap-2.5 text-slate-700 dark:text-slate-300 shrink-0">
          <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-sky-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
            <Zap className="w-3.5 h-3.5" />
          </div>
          <div>
            <span className="font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
              Executive Quick-Action Dock
            </span>
            <span className="text-[10px] text-slate-400 dark:text-slate-500">
              1-Click Operations & Commercial Safety
            </span>
          </div>
        </div>

        {/* Action Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          {/* Action 1: Test 25% Discount Policy */}
          <button
            onClick={() => {
              onTestDiscountPolicy(
                "We need 500 units for next shipment. Can you offer a 25% wholesale discount?"
              );
              setActionFeedback("⚡ Loaded 25% discount inquiry into simulator!");
              setTimeout(() => setActionFeedback(null), 3000);
            }}
            className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/30 dark:hover:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/80 dark:border-amber-800/40 flex items-center gap-1.5 transition-all shadow-xs"
            title="Pre-loads simulator with a 25% discount inquiry to test EDITH's margin defense"
          >
            <Zap className="w-3.5 h-3.5 text-amber-500" />
            <span>Test 25% Discount Policy</span>
          </button>

          {/* Action 2: Send Live WhatsApp Test Ping */}
          <button
            onClick={async () => {
              await onSendWhatsAppPing();
              setActionFeedback("📡 WhatsApp diagnostic ping transmitted!");
              setTimeout(() => setActionFeedback(null), 3000);
            }}
            disabled={isSendingPing}
            className="px-3 py-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/30 dark:hover:bg-sky-950/50 text-sky-800 dark:text-sky-300 border border-sky-300/80 dark:border-sky-800/40 flex items-center gap-1.5 transition-all shadow-xs disabled:opacity-50"
            title="Sends an instant diagnostic ping to the WhatsApp bridge"
          >
            {isSendingPing ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-500" />
            ) : (
              <Radio className="w-3.5 h-3.5 text-sky-500" />
            )}
            <span>Send WhatsApp Ping</span>
          </button>

          {/* Action 3: Add Temporary Knowledge Rule */}
          <button
            onClick={() => setShowRuleModal(true)}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/30 dark:hover:bg-purple-950/50 text-purple-800 dark:text-purple-300 border border-purple-300/80 dark:border-purple-800/40 flex items-center gap-1.5 transition-all shadow-xs"
            title="Opens modal to add an emergency policy or pricing rule audited by EDITH"
          >
            <BookOpen className="w-3.5 h-3.5 text-purple-500" />
            <span>Add Temp Rule</span>
          </button>

          {/* Action 4: Toggle Autonomous Safe Mode / Pause AI */}
          <button
            onClick={handleToggleSafeMode}
            disabled={isTogglingSafeMode}
            className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all shadow-xs ${
              safeMode
                ? "bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800/60"
                : "bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 border-emerald-300/80 dark:border-emerald-800/40"
            }`}
            title="Toggle autonomous safe mode (pauses autonomous negotiation)"
          >
            {safeMode ? (
              <>
                <ShieldAlert className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                <span className="font-bold">Safe Mode: PAUSED</span>
              </>
            ) : (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Autonomous: ACTIVE</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Action Feedback Pill */}
      {actionFeedback && (
        <div className="mt-2 text-center animate-in fade-in">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-900 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-bold shadow-md">
            {actionFeedback}
          </span>
        </div>
      )}

      {/* Temporary Knowledge Rule Modal */}
      {showRuleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0B0F19] border border-purple-300 dark:border-[#8B5CF6]/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative text-slate-900 dark:text-white space-y-4">
            <button
              onClick={() => setShowRuleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 font-mono text-xs text-purple-600 dark:text-[#A855F7] font-bold">
              <BookOpen className="w-4 h-4" />
              <span>Add Temporary Commercial Policy</span>
            </div>

            <h3 className="font-mono font-bold text-base text-slate-900 dark:text-white">
              Create Emergency Knowledge Rule
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              EDITH will immediately evaluate this policy against our commercial margin ceiling before ingestion.
            </p>

            <form onSubmit={handleCreateTempRule} className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-slate-600 dark:text-slate-400 mb-1">Rule / Tier Title:</label>
                <input
                  type="text"
                  value={ruleTitle}
                  onChange={(e) => setRuleTitle(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">Discount (%):</label>
                  <input
                    type="number"
                    step="0.5"
                    max="25"
                    value={ruleDiscount}
                    onChange={(e) => setRuleDiscount(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Max authorized: 15%</span>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1">MOQ Units:</label>
                  <input
                    type="number"
                    value={ruleMoq}
                    onChange={(e) => setRuleMoq(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-[#0E1322] border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:border-purple-500"
                    required
                  />
                  <span className="text-[10px] text-slate-400">Minimum threshold</span>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRuleModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingRule}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5 shadow-md disabled:opacity-50"
                >
                  {isAddingRule ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Submit to EDITH
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
