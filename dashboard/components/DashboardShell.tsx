"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  ShoppingBag,
  Sun,
  Moon,
  LogOut,
  User,
  Smartphone,
  Cpu,
  Menu,
  X,
} from "lucide-react";

const navigation = [
  { name: "Overview", href: "/", icon: BarChart3 },
  { name: "Live Inbox", href: "/conversations", icon: Inbox },
  { name: "Leads", href: "/leads", icon: Users },
  { name: "Orders", href: "/orders", icon: ShoppingBag },
  { name: "Catalog", href: "/products", icon: Coffee },
  { name: "Pricing Rules", href: "/pricing", icon: DollarSign },
  { name: "Modular Prompts", href: "/prompts", icon: BookOpen },
  { name: "Integrations", href: "/integrations", icon: Radio },
  { name: "Knowledge RAG", href: "/knowledge", icon: ShieldCheck },
  { name: "Follow-ups", href: "/followups", icon: Calendar },
  { name: "Handoffs", href: "/handoffs", icon: AlertTriangle },
  { name: "Settings", href: "/settings", icon: Settings },
];

export default function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [darkMode, setDarkMode] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("wb_theme");
    if (saved === "dark" || (!saved && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
      setDarkMode(true);
      document.documentElement.classList.add("dark");
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove("dark");
    }
  }, []);

  // Close profile panel on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    if (profileOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [profileOpen]);

  // Close mobile nav on route change
  useEffect(() => {
    setMobileNavOpen(false);
  }, [pathname]);

  const toggleTheme = () => {
    const next = !darkMode;
    setDarkMode(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("wb_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("wb_theme", "light");
    }
  };

  const sidebarContent = (
    <>
      <div>
        {/* Brand Header */}
        <div className="p-5 border-b border-[var(--ed-border)] flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--ed-accent)] to-[var(--ed-accent-hover)] flex items-center justify-center text-white font-bold shadow-lg">
            ☕
          </div>
          <div>
            <h1 className="font-bold text-base leading-tight tracking-tight text-[var(--ed-text-primary)]">
              North Bengal Tea
            </h1>
            <span className="text-xs font-medium text-[var(--ed-success)] flex items-center gap-1 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--ed-success)] animate-pulse"></span>
              EDITH AI Active
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="p-3 space-y-0.5">
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`ed-press ed-focus-ring flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? "bg-[var(--ed-accent-glow)] text-[var(--ed-accent)] font-semibold border-l-2 border-[var(--ed-accent)] ed-glow"
                    : "text-[var(--ed-text-muted)] hover:bg-[var(--ed-surface)] hover:text-[var(--ed-text-primary)] border-l-2 border-transparent"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-[var(--ed-accent)]" : "text-[var(--ed-text-muted)]"}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Owner Notification Channel Footer */}
      <div className="p-4 border-t border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
        <div className="text-[10px] text-[var(--ed-text-muted)] font-semibold mb-1">
          Owner Command Channel
        </div>
        <div className="text-xs font-semibold text-[var(--ed-text-primary)] flex items-center gap-1.5 font-data">
          <Radio className="w-3.5 h-3.5 text-[var(--ed-success)]" />
          +91 89006 53250
        </div>
        <div className="text-[11px] text-[var(--ed-text-muted)] mt-0.5">
          Baileys Bridge v20.0
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden text-[var(--ed-text-primary)] transition-colors duration-200" style={{ background: "var(--ed-bg)" }}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 border-r border-[var(--ed-border)] flex-col justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileNavOpen(false)} />
          <aside className="absolute left-0 top-0 bottom-0 w-72 flex flex-col justify-between shadow-2xl" style={{ background: "var(--ed-surface)" }}>
            <div className="flex items-center justify-end p-3">
              <button onClick={() => setMobileNavOpen(false)} className="ed-press p-2 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]">
                <X className="w-5 h-5" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 border-b border-[var(--ed-border)] px-4 md:px-6 flex items-center justify-between shrink-0 transition-colors duration-200" style={{ background: "var(--ed-surface)" }}>
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileNavOpen(true)}
              className="md:hidden ed-press p-2 rounded-lg text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)]"
              aria-label="Open navigation"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-[var(--ed-text-muted)]">
              <ShieldCheck className="w-4 h-4 text-[var(--ed-success)]" />
              <span>Deterministic Pricing & Policy Engine</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Dark Mode Toggle */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="ed-press ed-focus-ring p-2.5 rounded-lg border border-[var(--ed-border)] text-[var(--ed-text-muted)] hover:text-[var(--ed-text-primary)] transition-colors"
              style={{ background: "var(--ed-surface)" }}
            >
              {mounted && darkMode ? (
                <Sun className="w-4 h-4 text-[var(--ed-warning)]" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </button>

            <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-semibold text-[var(--ed-success)] border border-[var(--ed-success)]/20" style={{ background: "color-mix(in srgb, var(--ed-success) 8%, transparent)" }}>
              ● Live Baileys
            </span>

            {/* Profile Avatar */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="ed-press ed-focus-ring w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold border border-[var(--ed-border)] text-[var(--ed-text-primary)] transition-all"
                style={{ background: profileOpen ? "var(--ed-accent)" : "var(--ed-surface)" , color: profileOpen ? "#fff" : "var(--ed-text-primary)" }}
                aria-label="Open profile"
              >
                OP
              </button>

              {/* Profile Dropdown Panel */}
              {profileOpen && (
                <div className="absolute right-0 top-12 w-72 rounded-xl border border-[var(--ed-border)] shadow-ed-elevated z-50 overflow-hidden" style={{ background: "var(--ed-surface)" }}>
                  {/* Profile header */}
                  <div className="p-4 border-b border-[var(--ed-border)]" style={{ background: "var(--ed-bg)" }}>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white" style={{ background: "var(--ed-accent)" }}>
                        OP
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--ed-text-primary)]">Operations Manager</div>
                        <div className="text-[11px] text-[var(--ed-text-muted)]">Admin — Full Access</div>
                      </div>
                    </div>
                  </div>

                  {/* Profile details */}
                  <div className="p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2.5">
                      <Smartphone className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Bot WhatsApp</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">+91 89187 53100</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <User className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">Owner WhatsApp</div>
                        <div className="font-data font-semibold text-[var(--ed-text-primary)]">+91 89006 53250</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <Cpu className="w-3.5 h-3.5 text-[var(--ed-text-muted)]" />
                      <div>
                        <div className="text-[10px] text-[var(--ed-text-muted)]">System Version</div>
                        <div className="font-semibold text-[var(--ed-text-primary)]">EDITH v2.0.0 · Baileys v20.0</div>
                      </div>
                    </div>
                  </div>

                  {/* Sign out */}
                  <div className="p-3 border-t border-[var(--ed-border)]">
                    <button className="ed-press ed-focus-ring w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold text-[var(--ed-danger)] border border-[var(--ed-danger)]/20 hover:bg-[var(--ed-danger)]/5 transition-colors">
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 transition-colors duration-200" style={{ background: "var(--ed-bg)" }}>
          {children}
        </main>
      </div>
    </div>
  );
}
