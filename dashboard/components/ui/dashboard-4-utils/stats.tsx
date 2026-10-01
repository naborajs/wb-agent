"use client";

import React, { useState, useEffect } from "react";
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

const defaultStatsData: StatItem[] = [
  {
    id: "revenue",
    title: "Total revenue",
    value: "₹2,07,800",
    change: "18.4%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Consolidated wholesale B2B trade volume from North Bengal tea auctions, direct garden lots, and automated WhatsApp orders.",
      metrics: [
        { label: "Darjeeling First Flush (TGFOP)", value: "₹1,12,700" },
        { label: "Assam Kadak CTC (BP/BP1)", value: "₹76,350" },
        { label: "Dooars Terai Master Blend", value: "₹18,750" },
      ],
    },
  },
  {
    id: "orders",
    title: "Orders",
    value: "6",
    change: "50.0%",
    trend: "up",
    period: "this month",
    details: {
      description: "Commercial purchase orders closed across Siliguri, Darjeeling, and Assam regional buyers.",
      metrics: [
        { label: "Autonomous Closed", value: "4 (66.7%)" },
        { label: "Assisted Handoffs", value: "2 (33.3%)" },
        { label: "Fulfillment Rate", value: "100% Invoiced/Dispatched" },
      ],
    },
  },
  {
    id: "aov",
    title: "Average order value",
    value: "₹34,633",
    change: "12.8%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Average wholesale consignment value (typically 50kg - 100kg master commercial sacks).",
      metrics: [
        { label: "Largest Order", value: "₹64,200 (BIJU)" },
        { label: "Median Order Size", value: "₹30,100" },
        { label: "Volume Discount Avg", value: "₹1,558 / order" },
      ],
    },
  },
  {
    id: "conversion",
    title: "Buyer conversion",
    value: "75.0%",
    change: "8.5%",
    trend: "up",
    period: "vs prior 30 days",
    details: {
      description: "Conversion rate from registered commercial buyers and tea cafe chains into confirmed wholesale purchase orders.",
      metrics: [
        { label: "Verified Buyer Leads", value: "8 Accounts" },
        { label: "Active Conversations", value: "3 WhatsApp Threads" },
        { label: "Confirmed Orders", value: "6 Orders" },
      ],
    },
  },
];

export function DashboardStats() {
  const [stats, setStats] = useState<StatItem[]>(defaultStatsData);
  const [selectedStat, setSelectedStat] = useState<StatItem | null>(null);

  useEffect(() => {
    async function loadLiveData() {
      try {
        const res = await fetch("/api/v1/orders");
        if (res.ok) {
          const data = await res.json();
          const orderList = data.orders || [];
          if (orderList.length > 0) {
            const totalRev = orderList.reduce(
              (sum: number, o: { total_amount?: number }) => sum + (o.total_amount || 0),
              0
            );
            const orderCount = orderList.length;
            const aov = Math.round(totalRev / orderCount);

            setStats((prev) =>
              prev.map((item) => {
                if (item.id === "revenue") {
                  return {
                    ...item,
                    value: `₹${totalRev.toLocaleString("en-IN")}`,
                  };
                }
                if (item.id === "orders") {
                  return {
                    ...item,
                    value: `${orderCount}`,
                  };
                }
                if (item.id === "aov") {
                  return {
                    ...item,
                    value: `₹${aov.toLocaleString("en-IN")}`,
                  };
                }
                return item;
              })
            );
          }
        }
      } catch (err) {
        // Fallback gracefully to default wholesale metrics
      }
    }
    loadLiveData();
  }, []);

  return (
    <>
      {stats.map((stat) => (
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
