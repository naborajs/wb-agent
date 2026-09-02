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
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">Follow-up Sequence Engine</h2>
        <p className="text-sm text-slate-500 mt-1">
          Automated B2B outreach cadence (Day 0, Day 1, Day 3) with guaranteed cancellation upon customer response.
        </p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-400 font-semibold border-b border-slate-200 uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3">Customer & Channel</th>
              <th className="px-5 py-3">Sequence Step</th>
              <th className="px-5 py-3">Scheduled For</th>
              <th className="px-5 py-3">WhatsApp Policy Guard</th>
              <th className="px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {followups.map((f) => (
              <tr key={f.id} className="hover:bg-slate-50">
                <td className="px-5 py-3.5">
                  <div className="font-semibold text-slate-900">{f.customer}</div>
                  <div className="text-[11px] text-slate-400">{f.phone}</div>
                </td>
                <td className="px-5 py-3.5 font-medium text-slate-800">{f.step}</td>
                <td className="px-5 py-3.5 text-slate-600">{f.scheduled_for}</td>
                <td className="px-5 py-3.5 text-slate-500 font-mono text-[11px]">{f.guard}</td>
                <td className="px-5 py-3.5">
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      f.status === "scheduled"
                        ? "bg-amber-50 text-amber-700 border border-amber-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
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
  );
}
