import React from "react";
import "./globals.css";
import DashboardShell from "../components/DashboardShell";

export const metadata = {
  title: "WB-Agent | Autonomous B2B AI Sales Platform",
  description: "AI Sales Operating System for North Bengal Tea Co.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="overflow-hidden antialiased selection:bg-amber-500/20 selection:text-amber-800 dark:selection:text-amber-200">
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
