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
} from "lucide-react";

export default function SystemSettingsPage() {
  const [autonomous, setAutonomous] = useState(true);
  const [quietHours, setQuietHours] = useState(true);
  const [ownerNotification, setOwnerNotification] = useState(true);
  const [ownerPhone, setOwnerPhone] = useState("+918900653250");
  const [touch1Minutes, setTouch1Minutes] = useState(20);
  const [touch2Hours, setTouch2Hours] = useState(8);
  const [touch3Days, setTouch3Days] = useState(7);
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
        }
      })
      .catch(() => {});
  }, []);

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
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } catch (e) {
      console.error("Error saving settings", e);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">
          Platform Control & Safety Settings
        </h2>
        <p className="text-sm text-[var(--ed-text-muted)] mt-1">
          Global autonomous controls, follow-up cadences, quiet hours, and owner escalation parameters.
        </p>
      </div>

      {saved && (
        <div
          className="p-3 border border-[var(--ed-success)]/20 text-xs font-semibold text-[var(--ed-success)] rounded-lg flex items-center gap-2"
          style={{ background: "color-mix(in srgb, var(--ed-success) 10%, transparent)" }}
        >
          <CheckCircle2 className="w-4 h-4 text-[var(--ed-success)]" />
          Settings successfully synchronized with backend runtime and database.
        </div>
      )}

      {/* Emergency Stop Banner */}
      <div
        className="p-5 rounded-xl border border-[var(--ed-danger)]/20 flex items-center justify-between"
        style={{ background: "color-mix(in srgb, var(--ed-danger) 8%, transparent)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="p-2.5 rounded-lg text-white"
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
          className="ed-press ed-focus-ring px-4 py-2 rounded-lg text-xs font-bold text-white transition-colors hover:opacity-90 shadow-sm"
          style={{
            background: autonomous ? "var(--ed-danger)" : "var(--ed-success)",
          }}
        >
          {autonomous ? "HALT ALL AI MESSAGING" : "RESUME AI MESSAGING"}
        </button>
      </div>

      {/* Configuration Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Escalation & Owner WhatsApp */}
        <div className="p-5 ed-panel rounded-xl space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Radio className="w-4 h-4 text-[var(--ed-accent)]" />
            Owner Escalation Channel
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
                className="w-full p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
                style={{ background: "var(--ed-bg)" }}
              />
              <span className="text-[11px] text-[var(--ed-text-muted)] mt-1 block">
                Receives instant hot-lead alerts, wholesale order briefings, and WhatsApp command queries.
              </span>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={ownerNotification}
                onChange={(e) => setOwnerNotification(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)] ed-focus-ring"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Send Real-Time WhatsApp Alerts on Hot Lead Intent
              </span>
            </label>
          </div>
        </div>

        {/* Follow-up Intervals & Quiet Hours */}
        <div className="p-5 ed-panel rounded-xl space-y-4">
          <div className="flex items-center gap-2 font-bold text-sm text-[var(--ed-text-primary)] border-b border-[var(--ed-border)] pb-3">
            <Clock className="w-4 h-4 text-[var(--ed-accent)]" />
            Humanized Follow-Up Cadence
          </div>

          <div className="space-y-3 text-xs">
            <div className="grid grid-cols-3 gap-2">
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
                  className="w-full p-2 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
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
                  className="w-full p-2 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
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
                  className="w-full p-2 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-primary)] font-data font-bold focus:outline-none ed-focus-ring"
                  style={{ background: "var(--ed-bg)" }}
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={quietHours}
                onChange={(e) => setQuietHours(e.target.checked)}
                className="w-4 h-4 rounded accent-[var(--ed-accent)] ed-focus-ring"
              />
              <span className="font-semibold text-[var(--ed-text-primary)]">
                Enforce Quiet Hours (No follow-up messages between 9 PM and 9 AM IST)
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="ed-interactive ed-press ed-focus-ring inline-flex items-center gap-2 px-6 py-3 rounded-xl text-white font-semibold text-sm shadow-lg transition-all disabled:opacity-50 hover:opacity-90"
          style={{ background: "var(--ed-accent)", minHeight: "44px" }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? "Saving Settings..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
