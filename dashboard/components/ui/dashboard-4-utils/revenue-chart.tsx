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
  { date: "Feb 20", revenue: 3820, orders: 24 },
  { date: "Feb 22", revenue: 3790, orders: 23 },
  { date: "Feb 25", revenue: 4510, orders: 28 },
  { date: "Feb 27", revenue: 4420, orders: 27 },
  { date: "Mar 2", revenue: 4310, orders: 26 },
  { date: "Mar 5", revenue: 4680, orders: 29 },
  { date: "Mar 7", revenue: 5040, orders: 32 },
  { date: "Mar 10", revenue: 4890, orders: 31 },
  { date: "Mar 12", revenue: 5210, orders: 34 },
  { date: "Mar 15", revenue: 5350, orders: 35 },
  { date: "Mar 17", revenue: 5540, orders: 36 },
  { date: "Mar 20", revenue: 5410, orders: 34 },
  { date: "Mar 22", revenue: 5780, orders: 38 },
  { date: "Mar 25", revenue: 5690, orders: 37 },
  { date: "Mar 27", revenue: 6120, orders: 40 },
  { date: "Mar 30", revenue: 5980, orders: 39 },
  { date: "Apr 1", revenue: 6240, orders: 41 },
  { date: "Apr 4", revenue: 6110, orders: 39 },
  { date: "Apr 6", revenue: 6450, orders: 43 },
  { date: "Apr 9", revenue: 6380, orders: 42 },
  { date: "Apr 11", revenue: 6820, orders: 46 },
  { date: "Apr 14", revenue: 6710, orders: 45 },
  { date: "Apr 16", revenue: 7240, orders: 49 },
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
                        Revenue: <span className="font-mono font-bold text-foreground">${data.revenue.toLocaleString()}</span>
                      </div>
                      <div className="text-muted-foreground text-[10px]">
                        Orders: <span className="font-mono text-foreground">{data.orders}</span>
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
            42.9%
          </span>
          <span>vs first day in last 60 days.</span>
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
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Comprehensive Audit</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Revenue & Growth Report</h3>
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
                <span className="text-xs text-muted-foreground">Gross Revenue</span>
                <div className="text-2xl font-bold text-foreground mt-1">$292,340</div>
                <span className="text-[11px] text-emerald-500 font-medium">+12.4% MoM</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <span className="text-xs text-muted-foreground">Net Profit</span>
                <div className="text-2xl font-bold text-foreground mt-1">$94,180</div>
                <span className="text-[11px] text-emerald-500 font-medium">32.2% Margin</span>
              </div>
              <div className="p-3.5 rounded-xl border border-border/50 bg-background/50">
                <span className="text-xs text-muted-foreground">Returns Deducted</span>
                <div className="text-2xl font-bold text-foreground mt-1">-$7,420</div>
                <span className="text-[11px] text-muted-foreground">2.6% refund rate</span>
              </div>
            </div>

            <div className="space-y-3">
              <span className="text-xs font-semibold text-foreground">Recent Revenue Ledger</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {rawRevenueData.slice(-6).reverse().map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs py-2 px-3 rounded-lg bg-muted/40">
                    <span className="font-medium text-foreground">{item.date}</span>
                    <span className="text-muted-foreground">{item.orders} orders</span>
                    <span className="font-mono font-semibold text-foreground">${item.revenue.toLocaleString()}</span>
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
