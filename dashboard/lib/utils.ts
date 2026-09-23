import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getWebSocketUrl(path: string = "/api/v1/ws"): string {
  if (typeof window === "undefined") return "";

  // 1. Explicit WebSocket URL override
  if (process.env.NEXT_PUBLIC_WS_URL) {
    const base = process.env.NEXT_PUBLIC_WS_URL.replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  // 2. Derive from NEXT_PUBLIC_API_URL (e.g. http://localhost:8000 -> ws://localhost:8000)
  if (process.env.NEXT_PUBLIC_API_URL) {
    const base = process.env.NEXT_PUBLIC_API_URL.replace(/^http(s)?:\/\//, (match) =>
      match.startsWith("https") ? "wss://" : "ws://"
    ).replace(/\/+$/, "");
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${base}${cleanPath}`;
  }

  // 3. Browser window context: fallback to backend port 8000 if frontend is running on 3000
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname || "localhost";
  const port = window.location.port === "3000" ? "8000" : (window.location.port ? window.location.port : "8000");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${proto}//${host}:${port}${cleanPath}`;
}
