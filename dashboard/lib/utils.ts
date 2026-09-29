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

  // 3. Browser window context:
  // - If running directly on Next.js port 3000 (localhost or VPS IP:3000), route WebSocket to backend port 8000
  // - If running behind a cloud domain / reverse proxy (port 80/443 or custom proxy port), use the same host
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  const host = window.location.hostname || "localhost";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;

  if (window.location.port === "3000") {
    return `${proto}//${host}:8000${cleanPath}`;
  }
  if ((host === "localhost" || host === "127.0.0.1") && !window.location.port) {
    return `${proto}//${host}:8000${cleanPath}`;
  }
  return `${proto}//${window.location.host}${cleanPath}`;
}
