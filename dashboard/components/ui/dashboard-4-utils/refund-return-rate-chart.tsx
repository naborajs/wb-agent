"use client";

import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, X, ShieldAlert, ArrowDown } from "lucide-react";

export function RefundReturnRateChart() {
  const [modalOpen, setModalOpen] = useState(false);

  const returnReasons = [
    { reason: "Moisture Content Standard", percentage: "0%", count: 0 },
    { reason: "Leaf Grade Specification Mismatch", percentage: "0%", count: 0 },
    { reason: "Transit Moisture or Sack Tear", percentage: "0%", count: 0 },
    { reason: "Delayed Dispatch Beyond SLA", percentage: "0%", count: 0 },
  ];

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1 rounded-2xl border border-border/60 bg-card text-card-foreground p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Return rate</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Commercial consignments</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setModalOpen(true)}
            aria-label="More info about Return rate"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-6 flex items-baseline justify-between">
          <div className="text-3xl font-semibold tracking-tight text-foreground">0.0%</div>
          <span className="text-xs text-muted-foreground text-right">0 claims filed</span>
        </div>

        {/* Minimal Bar Visualization */}
        <div className="mt-4 space-y-1.5">
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
          </div>
          <div className="flex justify-between text-[11px] text-muted-foreground">
            <span>Benchmark: &lt; 2.5%</span>
            <span className="text-emerald-500 font-medium">100% Quality Acceptance</span>
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
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Quality Assurance</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Consignment QA Audit</h3>
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

            <div className="my-4 p-4 rounded-xl border border-border/50 bg-background/50 flex justify-between items-center">
              <div>
                <div className="text-2xl font-bold text-foreground">0.0%</div>
                <div className="text-xs text-muted-foreground">0 disputes out of 6 commercial orders</div>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-500 px-2 py-1 rounded-md bg-emerald-500/10">
                <ArrowDown className="h-3.5 w-3.5" /> 100% Clean
              </span>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground">Inspection Parameters</span>
              <div className="space-y-2">
                {returnReasons.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs p-2 rounded-lg bg-muted/40">
                    <span className="text-muted-foreground">{item.reason}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-muted-foreground">{item.count} disputes</span>
                      <span className="font-semibold text-emerald-500">Verified</span>
                    </div>
                  </div>
                ))}
              </div>
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

export default RefundReturnRateChart;
