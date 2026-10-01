"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Send,
  ShoppingBag,
  Sun,
  Moon,
  Info,
  X,
  PlusCircle,
  ExternalLink,
} from "lucide-react";

export function QuickActions() {
  const [modalOpen, setModalOpen] = useState(false);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("wb_theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("wb_theme", "dark");
    }
    window.dispatchEvent(new Event("theme-change"));
  };

  return (
    <Card className="col-span-1 md:col-span-1 lg:col-span-1 rounded-2xl border border-border/60 bg-card text-card-foreground p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-foreground">Quick actions</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Shortcuts to same destinations.</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-foreground"
            onClick={() => setModalOpen(true)}
            aria-label="More info about Quick actions"
          >
            <Info className="h-4 w-4" />
          </Button>
        </div>

        {/* Minimal Actions List */}
        <div className="mt-4 space-y-1.5">
          <Link
            href="/conversations"
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquare className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-medium text-foreground">Live Customer Inbox</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">&rarr;</span>
          </Link>

          <Link
            href="/campaigns"
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <Send className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-medium text-foreground">Dispatch Campaign</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">&rarr;</span>
          </Link>

          <Link
            href="/orders"
            className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <ShoppingBag className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
              <span className="text-xs font-medium text-foreground">Orders & Invoices</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">&rarr;</span>
          </Link>

          <button
            onClick={toggleTheme}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-border/40 hover:border-border hover:bg-muted/40 transition-colors group text-left"
          >
            <div className="flex items-center gap-2.5">
              <Sun className="h-4 w-4 text-muted-foreground group-hover:text-foreground dark:hidden transition-colors" />
              <Moon className="h-4 w-4 text-muted-foreground group-hover:text-foreground hidden dark:block transition-colors" />
              <span className="text-xs font-medium text-foreground">Toggle Theme (White / Dark)</span>
            </div>
            <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">&#x21C4;</span>
          </button>
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
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Navigation & Automation</span>
                <h3 className="text-xl font-bold text-foreground mt-0.5">Quick Actions Center</h3>
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

            <p className="text-xs text-muted-foreground leading-relaxed my-4">
              Direct access shortcuts provide zero-latency jumps to core autonomous modules, messaging conduits, and theme controls.
            </p>

            <div className="space-y-2">
              <Link
                href="/products"
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">Catalog Management</div>
                  <div className="text-[11px] text-muted-foreground">Update pricing, inventory & descriptions</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
              <Link
                href="/settings"
                className="flex items-center justify-between p-3 rounded-xl border border-border/50 bg-background/50 hover:bg-muted/30 transition-colors"
              >
                <div>
                  <div className="text-xs font-semibold text-foreground">System Preferences</div>
                  <div className="text-[11px] text-muted-foreground">Agent keys, WhatsApp Webhooks & presets</div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
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

export default QuickActions;
