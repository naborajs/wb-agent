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
  description: "More Conversations. Real Opportunities. Autonomous B2B AI Sales Operating System.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/logo-icon.png", sizes: "32x32", type: "image/png" },
      { url: "/logo.png", sizes: "512x512", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/logo-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
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
