"use client";

import React from "react";
import { Calendar, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";

export default function FollowupsPage() {
  const followups = [
    {
      id: "f_1",
      customer: "Rahul Sharma (Heritage Cafe)",
      phone: "+918900653250",
      step: "Step 1: Day 0 Nudge",
      scheduled_for: "Today at 4:30 PM",
      status: "scheduled",
      guard: "Will cancel if buyer replies",
    },
    {
      id: "f_2",
      customer: "Amit Roy (Roy Tea Corner)",
      phone: "+919832011111",
      step: "Step 2: Value Proposition",
      scheduled_for: "Tomorrow at 11:00 AM",
      status: "scheduled",
      guard: "Will cancel if buyer replies",
    },
    {
      id: "f_3",
      customer: "Siliguri Food Services",
      phone: "+919832099999",
      step: "Step 1: Day 0 Nudge",
      scheduled_for: "Yesterday at 3:00 PM",
      status: "cancelled",
      guard: "Reason: customer_replied",
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-[var(--ed-text-primary)]">Follow-up Sequence Engine</h2>
        <p className="text-sm text-[var(--ed-text-muted)] mt-1">
          Automated B2B outreach cadence (Day 0, Day 1, Day 3) with guaranteed cancellation upon customer response.
        </p>
      </div>

      <div className="ed-panel rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[var(--ed-text-muted)] min-w-[620px]">
          <thead
            className="font-semibold border-b border-[var(--ed-border)] uppercase tracking-wider text-[var(--ed-text-muted)]"
            style={{ background: "var(--ed-bg)" }}
          >
            <tr>
              <th className="px-5 py-3">Customer & Channel</th>
              <th className="px-5 py-3">Sequence Step</th>
              <th className="px-5 py-3">Scheduled For</th>
              <th className="px-5 py-3">WhatsApp Policy Guard</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--ed-border)]">
            {followups.map((f) => (
              <tr key={f.id} className="hover:bg-[var(--ed-bg)] transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-[var(--ed-text-primary)]">{f.customer}</div>
                  <div className="text-[11px] text-[var(--ed-text-muted)] font-data">{f.phone}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-[var(--ed-text-primary)]">{f.step}</td>
                <td className="px-5 py-3.5 text-[var(--ed-text-muted)]">{f.scheduled_for}</td>
                <td className="px-5 py-3.5 text-[var(--ed-text-muted)] font-mono text-[11px]">{f.guard}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                      f.status === "scheduled"
                        ? "text-[var(--ed-accent)] border border-[var(--ed-accent)]/20"
                        : "text-[var(--ed-text-muted)] border border-[var(--ed-border)]"
                    }`}
                    style={
                      f.status === "scheduled"
                        ? { background: "color-mix(in srgb, var(--ed-accent) 8%, transparent)" }
                        : { background: "var(--ed-bg)" }
                    }
                  >
                    {f.status === "scheduled" ? (
                      <>
                        <Clock className="w-3 h-3" /> Scheduled
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" /> Cancelled
                      </>
                    )}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
