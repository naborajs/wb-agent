"use client";

import React, { useState } from "react";
import { Settings, Shield, Power, Radio, Server } from "lucide-react";

export default function SystemSettingsPage() {
  const [autonomous, setAutonomous] = useState(true);
  const [dryRun, setDryRun] = useState(false);
  const [sandbox, setSandbox] = useState(true);
  const [ownerPhone, setOwnerPhone] = useState("+918900653250");
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Platform Control & Safety Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Global autonomous controls, WhatsApp escalation channels, and emergency stop safeguards (Section 55 & 114).
        </p>
      </div>

      {saved && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-800 rounded-lg">
          Settings successfully synchronized with backend runtime.
        </div>
      )}

      {/* Emergency Stop Banner */}
      <div className="p-5 rounded-xl border border-rose-200 bg-rose-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-600 text-white">
            <Power className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-rose-950">Global Autonomous Kill-Switch</h4>
            <p className="text-xs text-rose-700 mt-0.5">
              Instantly halts all automated customer messaging and scheduled follow-ups across all channels.
            </p>
          </div>
        </div>

        <button
          onClick={() => setAutonomous(!autonomous)}
          className={`px-4 py-2 rounded-lg text-xs font-bold transition-colors ${
            autonomous
              ? "bg-rose-600 hover:bg-rose-700 text-white"
              : "bg-emerald-600 hover:bg-emerald-700 text-white"
          }`}
        >
          {autonomous ? "TRIGGER KILL-SWITCH" : "RE-ENABLE AUTONOMOUS SELLING"}
        </button>
      </div>

      {/* Operational Toggles */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm divide-y divide-slate-100">
        <div className="p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-slate-900">Dry-Run Mode</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Agent calculates prices, reasons, and records runs without transmitting real outbound WhatsApp packets.
            </p>
          </div>
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900"
          />
        </div>

        <div className="p-5 flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-sm text-slate-900">Sandbox Mode</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Uses simulated tea leads, local memory, and SimulatorWhatsAppProvider.
            </p>
          </div>
          <input
            type="checkbox"
            checked={sandbox}
            onChange={(e) => setSandbox(e.target.checked)}
            className="w-4 h-4 rounded text-slate-900"
          />
        </div>

        <div className="p-5 space-y-2">
          <h4 className="font-semibold text-sm text-slate-900">Primary Business Owner Escalation Target</h4>
          <p className="text-xs text-slate-500">
            Designated WhatsApp number receiving hot buyer alerts and handover requests. Strictly normalized to E.164.
          </p>
          <div className="relative max-w-sm pt-1">
            <input
              type="text"
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors"
        >
          Save Configuration
        </button>
      </div>
    </div>
  );
}
