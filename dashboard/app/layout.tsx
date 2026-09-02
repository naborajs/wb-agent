import React from "react";
import "./globals.css";
import Link from "next/link";
import {
  Inbox,
  Users,
  Coffee,
  DollarSign,
  BookOpen,
  Calendar,
  AlertTriangle,
  BarChart3,
  Settings,
  ShieldCheck,
  Radio,
} from "lucide-react";

export const metadata = {
  title: "WB-Agent | Autonomous B2B AI Sales Platform",
  description: "AI Sales Operating System for North Bengal Tea Co.",
};

const navigation = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Live Inbox", href: "/conversations", icon: Inbox },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Catalog", href: "/products", icon: Coffee },
  { name: "Pricing Rules", href: "/pricing", icon: DollarSign },
  { name: "Knowledge RAG", href: "/knowledge", icon: BookOpen },
  { name: "Follow-ups", href: "/followups", icon: Calendar },
  { name: "Handoffs", href: "/handoffs", icon: AlertTriangle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex h-screen overflow-hidden bg-slate-50 text-slate-900">
        {/* Sidebar */}
        <aside className="w-64 border-r border-slate-200 bg-white flex flex-col justify-between shrink-0">
          <div>
            {/* Brand Header */}
            <div className="p-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700 flex items-center justify-center text-white font-bold shadow-md shadow-amber-700/20">
                ☕
              </div>
              <div>
                <h1 className="font-bold text-base leading-tight tracking-tight text-slate-900">
                  North Bengal Tea
                </h1>
                <span className="text-xs font-medium text-emerald-600 flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  AI Sales Active
                </span>
              </div>
            </div>

            {/* Navigation Links */}
            <nav className="p-3 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className="flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <Icon className="w-4 h-4 text-slate-400" />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Owner Notification Channel Footer */}
          <div className="p-4 border-t border-slate-100 bg-slate-50/50">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider mb-1">
              Escalation Target
            </div>
            <div className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-600" />
              +91 89006 53250
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              WhatsApp Cloud v20.0
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top Bar */}
          <header className="h-14 border-b border-slate-200 bg-white px-6 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>Deterministic Pricing & Policy Engine Enabled</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                Simulator Mode
              </span>
              <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">
                OP
              </div>
            </div>
          </header>

          {/* Page Viewport */}
          <main className="flex-1 overflow-y-auto p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
