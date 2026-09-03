import React from "react";
import { Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import DashboardShell from "../components/DashboardShell";

const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  variable: "--font-instrument",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
  weight: ["400", "500"],
});

export const metadata = {
  title: "EDITH | North Bengal Tea Operations",
  description: "AI Sales Operating System for North Bengal Tea Co.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${instrumentSans.variable} ${jetbrainsMono.variable} font-sans overflow-hidden antialiased selection:bg-[var(--ed-accent)]/20 selection:text-[var(--ed-text-primary)]`}
      >
        <DashboardShell>{children}</DashboardShell>
      </body>
    </html>
  );
}
