"use client";

import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, X, Layers } from "lucide-react";

interface CategoryShare {
  name: string;
  share: number;
  revenue: string;
  items: number;
}

const categories: CategoryShare[] = [
  { name: "Darjeeling First Flush (TGFOP)", share: 54, revenue: "₹1,12,700", items: 110 },
  { name: "Assam Kadak CTC (BP/BP1)", share: 37, revenue: "₹76,350", items: 230 },
  { name: "Dooars Terai Master Blend", share: 9, revenue: "₹18,750", items: 75 },
];

export function CategoryRankChart() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1 rounded-2xl border border-border/60 bg-card text-card-foreground p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Tea Grade Share</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Current harvest cycle</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setModalOpen(true)}
            aria-label="More info about Tea Grade Share"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Minimal Stacked Progress Bar */}
        <div className="mt-6">
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted gap-0.5">
            <div className="h-full bg-foreground" style={{ width: "54%" }} title="Darjeeling (54%)" />
            <div className="h-full bg-foreground/75" style={{ width: "37%" }} title="Assam CTC (37%)" />
            <div className="h-full bg-foreground/45" style={{ width: "9%" }} title="Dooars Blend (9%)" />
          </div>

          <div className="mt-4 space-y-2.5">
            {categories.slice(0, 3).map((cat, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        idx === 0
                          ? "currentColor"
                          : idx === 1
                          ? "rgba(161, 161, 170, 0.7)"
                          : "rgba(161, 161, 170, 0.4)",
                    }}
                  />
                  {cat.name}
                </span>
                <span className="font-mono font-medium text-foreground">{cat.share}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border/40 mt-4">
        <button
          onClick={() => setModalOpen(true)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1 font-medium"
        >
          <span>More info</span>
          <span>&rarr;</span>
        </button>
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Product Performance</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Category Breakdown</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="my-4 space-y-2.5">
              {categories.map((c, idx) => (
                <div key={idx} className="p-3 rounded-xl border border-border/50 bg-background/50 flex justify-between items-center">
                  <div>
                    <div className="text-xs font-semibold text-foreground">{c.name}</div>
                    <div className="text-[11px] text-muted-foreground">{c.items} kg dispatched</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-foreground">{c.revenue}</div>
                    <div className="text-[11px] text-muted-foreground">{c.share}% of total</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs"
                onClick={() => setModalOpen(false)}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default CategoryRankChart;
