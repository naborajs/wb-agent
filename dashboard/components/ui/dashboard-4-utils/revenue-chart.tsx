"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowUp, ArrowRight, X, Download, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

const rawRevenueData = [
  { date: "Sep 4", revenue: 16150, orders: 1 },
  { date: "Sep 8", revenue: 22400, orders: 1 },
  { date: "Sep 12", revenue: 28900, orders: 1 },
  { date: "Sep 16", revenue: 34200, orders: 2 },
  { date: "Sep 20", revenue: 41800, orders: 2 },
  { date: "Sep 24", revenue: 44500, orders: 2 },
  { date: "Sep 27", revenue: 48500, orders: 1 },
  { date: "Sep 28", revenue: 32400, orders: 1 },
  { date: "Sep 29", revenue: 18750, orders: 1 },
  { date: "Sep 30", revenue: 64200, orders: 1 },
  { date: "Oct 1", revenue: 27800, orders: 1 },
];

export function RevenueChart() {
  const [timeRange, setTimeRange] = useState("60");
  const [reportModalOpen, setReportModalOpen] = useState(false);

  return (
    <Card className="col-span-1 md:col-span-2 lg:col-span-4 rounded-2xl border border-border/60 bg-card text-card-foreground p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between pb-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-foreground">Revenue</h2>
        </div>
        <div className="w-[140px]">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="h-9 rounded-lg border-border/70 bg-background/60 text-xs text-foreground focus:ring-0">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent className="bg-popover text-popover-foreground border-border">
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="60">Last 60 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="ytd">Year to date</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[260px] w-full pt-2">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={rawRevenueData}
            margin={{ top: 15, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={true}
              horizontal={false}
              stroke="currentColor"
              className="text-muted-foreground/15"
            />
            <XAxis
              dataKey="date"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 11, fill: "currentColor" }}
              className="text-muted-foreground"
              dy={10}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={["dataMin - 1000", "dataMax + 1000"]} />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-xl text-popover-foreground">
                      <div className="font-semibold">{data.date}</div>
                      <div className="text-muted-foreground mt-0.5">
                        Revenue: <span className="font-mono font-bold text-foreground">₹{data.revenue.toLocaleString("en-IN")}</span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        Dispatched Orders: <span className="font-mono text-foreground">{data.orders}</span>
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="currentColor"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
              activeDot={{
                r: 4,
                className: "fill-foreground stroke-background stroke-2",
              }}
              className="text-foreground/80 dark:text-zinc-200"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-6 text-xs">
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <span className="flex items-center gap-1 font-medium text-emerald-500">
            <ArrowUp className="h-3.5 w-3.5 stroke-[2.5]" />
            18.4%
          </span>
          <span>growth vs previous North Bengal tea auction cycle.</span>
        </div>

        <button
          onClick={() => setReportModalOpen(true)}
          className="inline-flex items-center gap-1 font-medium text-foreground hover:text-muted-foreground transition-colors group cursor-pointer text-xs"
        >
          <span>View report</span>
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {/* Detailed Revenue Report Modal */}
      {reportModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={() => setReportModalOpen(false)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-2xl text-card-foreground"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between pb-3 border-b border-border/60">
              <div>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Commercial B2B Audit</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Wholesale Revenue & Growth</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setReportModalOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 my-5">
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <span className="text-xs text-muted-foreground">Invoiced Revenue</span>
                <div className="text-2xl font-bold text-foreground mt-1">₹2,07,800</div>
                <span className="text-[11px] text-emerald-500 font-medium">+18.4% MoM</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <span className="text-xs text-muted-foreground">Net Trade Margin</span>
                <div className="text-2xl font-bold text-foreground mt-1">₹59,223</div>
                <span className="text-[11px] text-emerald-500 font-medium">28.5% Margin</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <span className="text-xs text-muted-foreground">Quality Claims</span>
                <div className="text-2xl font-bold text-foreground mt-1">₹0</div>
                <span className="text-[11px] text-emerald-500 font-medium">0.0% refund rate</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground">Verified Purchase Orders</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {rawRevenueData.slice(-6).reverse().map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-2 px-3 rounded-lg bg-muted/40">
                    <span className="font-medium text-foreground">{item.date}</span>
                    <span className="text-muted-foreground">{item.orders} consignment</span>
                    <span className="font-mono font-semibold text-foreground">₹{item.revenue.toLocaleString("en-IN")}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex justify-between items-center pt-3 border-t border-border/60">
              <span className="text-xs text-muted-foreground">Report generated automatically</span>
              <Button
                size="sm"
                variant="outline"
                className="rounded-lg text-xs"
                onClick={() => setReportModalOpen(false)}
              >
                Close Report
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default RevenueChart;
