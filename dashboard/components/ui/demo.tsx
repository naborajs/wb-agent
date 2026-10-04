"use client";

import { Component } from "@/components/ui/ai-loader";
import Dashboard from "@/components/ui/dashboard-4";

export function DemoOne() {
  return <Component />;
}

export function DashboardDemo() {
  return (
    <div className="w-full min-h-screen bg-background p-4 text-foreground">
      <Dashboard />
    </div>
  );
}

export default DemoOne;
