"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowUp, ArrowDown, Info, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface StatItem {
  id: string;
  title: string;
  value: string;
  change: string;
  trend: "up" | "down";
  period: string;
  details: {
    description: string;
    metrics: { label: string; value: string }[];
  };
}

const statsData: StatItem[] = [
  {
    id: "revenue",
    title: "Total revenue",
    value: "$284,920",
    change: "8.2%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Net revenue aggregated across all connected channels and WhatsApp AI automated checkouts.",
      metrics: [
        { label: "WhatsApp Direct Sales", value: "$198,450" },
        { label: "Campaign Inbound", value: "$62,380" },
        { label: "Recurring Re-orders", value: "$24,090" },
      ],
    },
  },
  {
    id: "orders",
    title: "Orders",
    value: "1,842",
    change: "4.1%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Successfully processed and verified customer orders through conversational sales flow.",
      metrics: [
        { label: "Autonomous Closed", value: "1,520 (82.5%)" },
        { label: "Assisted Handoffs", value: "322 (17.5%)" },
        { label: "Average Dispatch Time", value: "2.4 hours" },
      ],
    },
  },
  {
    id: "aov",
    title: "Average order value",
    value: "$154.60",
    change: "1.3%",
    trend: "down",
    period: "vs prior 30 days",
    details: {
      description: "Average customer spend per order after applying automated volume and promo discounts.",
      metrics: [
        { label: "Median Order Size", value: "$142.00" },
        { label: "Multi-item Orders", value: "64%" },
        { label: "Dynamic Upsell Lift", value: "+$18.40" },
      ],
    },
  },
  {
    id: "conversion",
    title: "Store conversion",
    value: "3.06%",
    change: "0.6%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Inbound visitor to completed WhatsApp checkout conversion rate across all campaigns.",
      metrics: [
        { label: "Inbound Leads", value: "60,196" },
        { label: "High Intent Chats", value: "18,420" },
        { label: "Completed Checkouts", value: "1,842" },
      ],
    },
  },
];

export function DashboardStats() {
  const [selectedStat, setSelectedStat] = useState<StatItem | null>(null);

  return (
    <>
      {statsData.map((stat) => (
        <Card
          key={stat.id}
          onClick={() => setSelectedStat(stat)}
          className="group relative cursor-pointer border border-border/60 bg-card text-card-foreground transition-all hover:border-border hover:shadow-md rounded-2xl p-6 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-normal text-muted-foreground">{stat.title}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-full opacity-0 transition-opacity group-hover:opacity-100 text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStat(stat);
              }}
              aria-label={`More info about ${stat.title}`}
            >
              <Info className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="my-3">
            <div className="text-3xl font-semibold tracking-tight text-foreground">
              {stat.value}
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            {stat.trend === "up" ? (
              <span className="flex items-center gap-1 font-medium text-emerald-500">
                <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
                {stat.change}
              </span>
            ) : (
              <span className="flex items-center gap-1 font-medium text-rose-500">
                <ArrowDown className="h-3.5 w-3.5 stroke-[2.5]" />
                {stat.change}
              </span>
            )}
            <span className="text-muted-foreground">{stat.period}</span>
          </div>
        </Card>
      ))}

      {/* More Info Modal Dialog */}
      {selectedStat && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedStat(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Metric Breakdown</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">{selectedStat.title}</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setSelectedStat(null)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="my-4 p-4 rounded-xl border border-border/50 bg-background/50">
              <div className="text-3xl font-bold tracking-tight text-foreground">{selectedStat.value}</div>
              <div className="flex items-center gap-1.5 text-xs mt-1">
                <span className={selectedStat.trend === "up" ? "text-emerald-500 font-semibold" : "text-rose-500 font-semibold"}>
                  {selectedStat.trend === "up" ? `+${selectedStat.change}` : `-${selectedStat.change}`}
                </span>
                <span className="text-muted-foreground">{selectedStat.period}</span>
              </div>
            </div>

            <p className="text-xs text-muted-foreground leading-relaxed mb-4">
              {selectedStat.details.description}
            </p>

            <div className="space-y-2 border-t border-border/60 pt-3">
              <span className="text-xs font-semibold text-foreground">Detailed Indicators</span>
              <div className="grid gap-2">
                {selectedStat.details.metrics.map((m, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 px-2 rounded-lg bg-muted/40">
                    <span className="text-muted-foreground">{m.label}</span>
                    <span className="font-mono font-medium text-foreground">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs"
                onClick={() => setSelectedStat(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DashboardStats;
