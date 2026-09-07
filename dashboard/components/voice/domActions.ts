/**
 * Client-Side DOM Actions, Screen Grounding Snapshot, and Visual Highlighting
 * for EDITH & Friday Voice Agent.
 * Gives Friday universal access to every button, input, tab, card, switch, and control.
 */

import { SITE_MAP, resolveSectionRoute } from "./siteMapData";

export interface ScreenSnapshot {
  current_path: string;
  page_title: string;
  visible_headings: string[];
  actionable_elements: Array<{
    id?: string;
    tag: string;
    type?: string;
    label: string;
    value?: string;
  }>;
}

/**
 * Highlights an element with a glowing pulsing ring to visibly reflect
 * voice agent actions in the UI as they happen.
 */
export function highlightElement(element: HTMLElement, color = "#0ea5e9", durationMs = 1500): void {
  try {
    element.scrollIntoView({ behavior: "smooth", block: "center" });

    const originalOutline = element.style.outline;
    const originalBoxShadow = element.style.boxShadow;
    const originalTransition = element.style.transition;

    element.style.transition = "all 0.25s ease-in-out";
    element.style.outline = `3px solid ${color}`;
    element.style.boxShadow = `0 0 24px ${color}, inset 0 0 10px ${color}33`;

    setTimeout(() => {
      element.style.outline = originalOutline;
      element.style.boxShadow = originalBoxShadow;
      element.style.transition = originalTransition;
    }, durationMs);
  } catch (e) {
    console.warn("Could not highlight element:", e);
  }
}

/**
 * Produces a comprehensive, structured JSON snapshot of the visible screen
 * for grounding the voice model in real-time.
 */
export function getScreenSnapshot(currentPath: string): ScreenSnapshot {
  if (typeof document === "undefined") {
    return {
      current_path: currentPath,
      page_title: "Dashboard",
      visible_headings: [],
      actionable_elements: [],
    };
  }

  const titleEl = document.querySelector("h1, h2");
  const pageTitle = titleEl?.textContent?.trim() || "EDITH Operations";

  // Visible headings
  const headings: string[] = [];
  document.querySelectorAll("h1, h2, h3").forEach((el) => {
    const text = el.textContent?.trim();
    if (text && text.length < 80 && !headings.includes(text)) {
      headings.push(text);
    }
  });

  // Actionable inputs & buttons
  const actionable: Array<{ id?: string; tag: string; type?: string; label: string; value?: string }> = [];

  // Buttons, Links, Tabs, Switches
  document.querySelectorAll("button, [role='button'], a, [role='tab'], [role='switch'], input[type='checkbox']").forEach((btn) => {
    const b = btn as HTMLElement;
    if (b.offsetParent === null) return; // Hidden
    const text = b.innerText?.trim() || b.getAttribute("aria-label") || b.getAttribute("title") || b.id;
    if (text && text.length > 0 && text.length < 60) {
      actionable.push({
        id: b.id || undefined,
        tag: b.tagName.toLowerCase(),
        label: text.replace(/\s+/g, " "),
      });
    }
  });

  // Inputs & Textareas
  document.querySelectorAll("input, textarea, select").forEach((input) => {
    const inp = input as HTMLInputElement;
    if (inp.offsetParent === null || inp.type === "hidden") return;

    let label = inp.getAttribute("aria-label") || inp.placeholder || inp.name || inp.id;
    if (!label && inp.id) {
      const l = document.querySelector(`label[for='${inp.id}']`);
      if (l) label = l.textContent?.trim() || "";
    }

    if (label) {
      actionable.push({
        id: inp.id || undefined,
        tag: inp.tagName.toLowerCase(),
        type: inp.type,
        label,
        value: inp.type === "password" ? "[MASKED]" : inp.value ? String(inp.value).slice(0, 40) : undefined,
      });
    }
  });

  return {
    current_path: currentPath,
    page_title: pageTitle,
    visible_headings: headings.slice(0, 8),
    actionable_elements: actionable.slice(0, 40), // Generous grounding budget
  };
}

/**
 * Returns a human-readable list of all clickable buttons, tabs, and controls currently visible.
 */
export function listAllClickableElements(): string[] {
  if (typeof document === "undefined") return [];
  const elements = Array.from(
    document.querySelectorAll<HTMLElement>("button, [role='button'], a, [role='tab'], [role='switch']")
  );

  const seen = new Set<string>();
  const labels: string[] = [];

  for (const el of elements) {
    if (el.offsetParent === null) continue;
    const text = el.innerText?.trim() || el.getAttribute("aria-label") || el.getAttribute("title");
    if (text && text.length > 1 && text.length < 50 && !seen.has(text.toLowerCase())) {
      seen.add(text.toLowerCase());
      labels.push(text.replace(/\s+/g, " "));
    }
  }

  return labels;
}

/**
 * Universal element finder: searches DOM for any button, control, link, switch, or clickable item.
 * Supports exact text, fuzzy text, aria-labels, IDs, Lucide icons, synonyms, ordinals, and CSS selectors.
 */
export function findMatchingElement(query: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const q = query.trim().toLowerCase();
  const digitsOnly = q.replace(/\D/g, "");

  // 1. CSS Selector query (if begins with #, ., [, or contains >)
  if (query.startsWith("#") || query.startsWith(".") || query.startsWith("[") || query.includes(" > ")) {
    try {
      const selected = document.querySelector<HTMLElement>(query);
      if (selected && selected.offsetParent !== null) return selected;
    } catch {}
  }

  // 2. Direct ID or data attributes
  const byId = document.getElementById(query.trim()) || document.getElementById(q);
  if (byId) return byId;

  const byVoiceAction = document.querySelector<HTMLElement>(
    `[data-voice-action="${q}"], [data-action="${q}"], [data-testid="${q}"]`
  );
  if (byVoiceAction) return byVoiceAction;

  // 3. Known UI Controls & Synonyms Map
  const synonymMap: Record<string, string[]> = {
    ping: ["diagnostic ping", "send diagnostic ping", "send test ping", "test ping", "ping"],
    simulator: ["execute simulated inquiry", "execute simulated turn", "simulate", "run simulator", "execute"],
    copy: ["copied!", "copy", "copy code", "copy pairing code"],
    get_code: ["get code", "generate code", "pairing code", "request code"],
    qr: ["refresh", "refresh qr", "reload qr"],
    inbox: ["open live inbox", "open inbox", "live inbox", "view chats"],
    donut: ["donut chart", "donut", "pie chart", "pie"],
    bars: ["funnel bars", "bars", "bar chart"],
    new_chat: ["new chat", "+ new chat", "start chat", "create chat"],
    takeover: ["take over", "human takeover", "operator takeover"],
    resume_ai: ["resume ai", "resume", "ai mode", "let edith handle"],
    order: ["create order", "+ create order", "new order", "add order"],
    csv: ["upload csv", "import leads", "upload leads", "bulk upload"],
    theme: ["toggle theme", "switch theme", "dark mode", "light mode"],
    save: ["save", "save changes", "save asset", "persist"],
    close: ["close", "dismiss", "cancel"],
  };

  for (const [key, aliases] of Object.entries(synonymMap)) {
    if (aliases.some((alias) => q.includes(alias) || alias.includes(q))) {
      // Find candidate buttons matching any alias
      const buttons = Array.from(document.querySelectorAll<HTMLElement>("button, [role='button'], a"));
      for (const btn of buttons) {
        if (btn.offsetParent === null) continue;
        const btnText = (btn.innerText || btn.getAttribute("aria-label") || "").toLowerCase();
        if (aliases.some((a) => btnText.includes(a))) {
          return btn;
        }
      }
    }
  }

  // 4. Lucide SVG Icon Class Resolver
  const iconClasses = [
    { key: "copy", selector: "svg.lucide-copy, svg[data-icon='copy']" },
    { key: "refresh", selector: "svg.lucide-refresh-cw, svg.lucide-rotate-cw" },
    { key: "send", selector: "svg.lucide-send" },
    { key: "ping", selector: "svg.lucide-send, svg.lucide-radio" },
    { key: "zap", selector: "svg.lucide-zap, svg.lucide-play" },
    { key: "plus", selector: "svg.lucide-plus, svg.lucide-plus-circle" },
    { key: "trash", selector: "svg.lucide-trash, svg.lucide-trash-2" },
    { key: "edit", selector: "svg.lucide-edit, svg.lucide-pencil" },
    { key: "search", selector: "svg.lucide-search" },
    { key: "close", selector: "svg.lucide-x" },
    { key: "theme", selector: "svg.lucide-sun, svg.lucide-moon" },
  ];

  for (const ic of iconClasses) {
    if (q.includes(ic.key)) {
      const svgs = document.querySelectorAll(ic.selector);
      for (const svg of Array.from(svgs)) {
        const btn = svg.closest("button, [role='button'], a") as HTMLElement;
        if (btn && btn.offsetParent !== null) return btn;
      }
    }
  }

  // 5. Search all visible buttons, links, tabs, and switches by text / aria-label
  const clickables = Array.from(
    document.querySelectorAll<HTMLElement>("button, [role='button'], a, [role='tab'], [role='switch'], summary")
  );

  // 5a. Exact match
  for (const el of clickables) {
    if (el.offsetParent === null) continue;
    const text = el.innerText?.trim().toLowerCase();
    const aria = el.getAttribute("aria-label")?.toLowerCase();
    const title = el.getAttribute("title")?.toLowerCase();
    if (text === q || aria === q || title === q) return el;
  }

  // 5b. Substring match
  for (const el of clickables) {
    if (el.offsetParent === null) continue;
    const text = el.innerText?.trim().toLowerCase();
    const aria = el.getAttribute("aria-label")?.toLowerCase();
    const title = el.getAttribute("title")?.toLowerCase();
    if (
      (text && (text.includes(q) || q.includes(text))) ||
      (aria && (aria.includes(q) || q.includes(aria))) ||
      (title && (title.includes(q) || q.includes(title)))
    ) {
      return el;
    }
  }

  // 6. Search inputs & textareas by label, placeholder, name, id
  const inputs = Array.from(document.querySelectorAll<HTMLElement>("input, textarea, select"));
  for (const el of inputs) {
    if (el.offsetParent === null) continue;
    const inp = el as HTMLInputElement;
    const name = inp.name?.toLowerCase();
    const placeholder = inp.placeholder?.toLowerCase();
    const aria = inp.getAttribute("aria-label")?.toLowerCase();
    const id = inp.id?.toLowerCase();
    if (
      name === q ||
      placeholder === q ||
      aria === q ||
      id === q ||
      (placeholder && placeholder.includes(q)) ||
      (name && name.includes(q))
    ) {
      return el;
    }
  }

  // 7. Search clickable rows, cards, or elements by phone number
  if (digitsOnly.length >= 6) {
    const allCards = Array.from(
      document.querySelectorAll<HTMLElement>(
        "div[class*='cursor-pointer'], tr, [role='row'], li, div:has(> span.truncate)"
      )
    );
    for (const el of allCards) {
      if (el.offsetParent === null) continue;
      const textDigits = (el.textContent || "").replace(/\D/g, "");
      if (textDigits.includes(digitsOnly)) return el;
    }
  }

  // 8. Ordinal Position ("first lead", "second button", "third row")
  const ordinalMap: Record<string, number> = {
    first: 0,
    "1st": 0,
    second: 1,
    "2nd": 1,
    third: 2,
    "3rd": 2,
    fourth: 3,
    "4th": 3,
    fifth: 4,
    "5th": 4,
    last: -1,
  };

  for (const [word, index] of Object.entries(ordinalMap)) {
    if (q.includes(word)) {
      if (q.includes("lead") || q.includes("chat") || q.includes("conversation")) {
        const rows = Array.from(
          document.querySelectorAll<HTMLElement>("div[class*='cursor-pointer'], [role='row'], a[href*='/conversations']")
        ).filter((el) => el.offsetParent !== null);
        if (rows.length > 0) {
          const targetIdx = index === -1 ? rows.length - 1 : Math.min(index, rows.length - 1);
          return rows[targetIdx];
        }
      }
      if (q.includes("button")) {
        const btns = Array.from(document.querySelectorAll<HTMLElement>("button")).filter(
          (el) => el.offsetParent !== null
        );
        if (btns.length > 0) {
          const targetIdx = index === -1 ? btns.length - 1 : Math.min(index, btns.length - 1);
          return btns[targetIdx];
        }
      }
    }
  }

  // 9. Generic clickable div, badge, or text match
  const allDivs = Array.from(
    document.querySelectorAll<HTMLElement>("div[class*='cursor-pointer'], span[class*='cursor-pointer'], td")
  );
  for (const el of allDivs) {
    if (el.offsetParent === null) continue;
    const t = el.innerText?.trim().toLowerCase() || "";
    if (t === q || (q.length >= 4 && t.includes(q))) return el;
  }

  return null;
}

/**
 * Clicks an element by query, highlights it with an animated ring, and scrolls it into view.
 */
export function clickElement(query: string): { success: boolean; message: string; clicked_label?: string } {
  const el = findMatchingElement(query);
  if (!el) {
    return {
      success: false,
      message: `Could not find any button, link, or clickable element matching "${query}" on the current screen.`,
    };
  }

  highlightElement(el, "#00D2FE", 1200);

  // Trigger real events
  try {
    el.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    el.dispatchEvent(new MouseEvent("mouseup", { bubbles: true, cancelable: true }));
    el.click();
  } catch {
    el.click();
  }

  const label = el.innerText?.trim() || el.getAttribute("aria-label") || el.getAttribute("title") || query;
  return {
    success: true,
    message: `Successfully clicked "${label}".`,
    clicked_label: label,
  };
}

/**
 * Dispatches synthetic input & change events for complete React and Next.js state compatibility.
 */
export function setNativeValue(element: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const valueSetter = Object.getOwnPropertyDescriptor(element, "value")?.set;
  const prototype = Object.getPrototypeOf(element);
  const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;

  if (prototypeValueSetter && valueSetter !== prototypeValueSetter) {
    prototypeValueSetter.call(element, value);
  } else if (valueSetter) {
    valueSetter.call(element, value);
  } else {
    element.value = value;
  }

  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true }));
  element.dispatchEvent(new KeyboardEvent("keyup", { bubbles: true }));
}

/**
 * Selects a conversation thread on /conversations by customer phone number or name.
 */
export function selectConversationItem(phoneOrName: string): { success: boolean; message: string; target?: string } {
  if (typeof document === "undefined") return { success: false, message: "Document not available" };
  const q = phoneOrName.trim().toLowerCase();
  const digitsOnly = q.replace(/\D/g, "");

  const cards = Array.from(
    document.querySelectorAll<HTMLElement>(
      "div[class*='cursor-pointer'], div[class*='p-3.5'], [role='row'], div:has(> span.truncate)"
    )
  );

  for (const card of cards) {
    if (card.offsetParent === null) continue;
    const text = card.textContent?.toLowerCase() || "";
    const textDigits = text.replace(/\D/g, "");

    const matchesDigits = digitsOnly.length >= 6 && textDigits.includes(digitsOnly);
    const matchesName = q.length >= 3 && text.includes(q);

    if (matchesDigits || matchesName) {
      highlightElement(card, "#10b981", 1600);
      card.click();
      return {
        success: true,
        message: `Selected conversation for "${phoneOrName}". Active chat timeline opened.`,
        target: card.innerText?.split("\n")[0] || phoneOrName,
      };
    }
  }

  return {
    success: false,
    message: `Could not find a conversation matching "${phoneOrName}" on the screen. Try searching for it first.`,
  };
}

/**
 * Changes the dashboard theme live (dark, light, or toggle).
 */
export function setColorTheme(theme: string): { success: boolean; theme: string; message: string } {
  if (typeof document === "undefined") return { success: false, theme: "light", message: "Window not available" };
  const t = theme.trim().toLowerCase();
  const shouldBeDark =
    t === "dark" ||
    (t.includes("dark") && !t.includes("light")) ||
    (t.includes("toggle") && !document.documentElement.classList.contains("dark"));

  if (shouldBeDark) {
    document.documentElement.classList.add("dark");
    localStorage.setItem("wb_theme", "dark");
  } else {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("wb_theme", "light");
  }

  window.dispatchEvent(
    new CustomEvent("theme_change", {
      detail: { theme: shouldBeDark ? "dark" : "light" },
    })
  );

  return {
    success: true,
    theme: shouldBeDark ? "dark" : "light",
    message: `Switched dashboard color theme to ${shouldBeDark ? "Dark ('Royal Pitch Black')" : "Light ('Estate White')"} mode.`,
  };
}

/**
 * Types text into any specified input, textarea, search bar, composer, or spreadsheet cell.
 */
export function typeText(targetQuery: string, text: string, submit = false): { success: boolean; message: string } {
  if (typeof document === "undefined") return { success: false, message: "Document not available" };
  const q = targetQuery.trim().toLowerCase();

  let targetInput: HTMLInputElement | HTMLTextAreaElement | null = null;

  // 1. Simulator input (e.g. on Overview page)
  if (q.includes("simulat") || q.includes("inquiry") || q.includes("test")) {
    targetInput = document.querySelector<HTMLInputElement>(
      "input[placeholder*='inquiry'], input[placeholder*='customer'], input[placeholder*='Type customer']"
    );
  }

  // 2. WhatsApp Pairing Phone input
  if (!targetInput && (q.includes("phone") || q.includes("pairing") || q.includes("wa") || q.includes("country code"))) {
    targetInput = document.querySelector<HTMLInputElement>(
      "input[placeholder*='91'], input[placeholder*='Phone'], input[type='tel']"
    );
  }

  // 3. Chat composer / message textarea
  if (!targetInput && (q.includes("composer") || q.includes("chat") || q.includes("message") || q.includes("reply") || q.includes("whatsapp"))) {
    targetInput = document.querySelector<HTMLTextAreaElement | HTMLInputElement>(
      "textarea[placeholder*='message'], textarea, input[placeholder*='message']"
    );
  }

  // 4. Search / filter inputs
  if (!targetInput && (q.includes("search") || q.includes("find") || q.includes("filter"))) {
    targetInput = document.querySelector<HTMLInputElement>(
      "input[type='search'], input[placeholder*='Search'], input[placeholder*='search'], input[placeholder*='filter']"
    );
  }

  // 5. Fallback to generic findMatchingElement
  if (!targetInput) {
    const el = findMatchingElement(targetQuery);
    if (el && (el.tagName === "INPUT" || el.tagName === "TEXTAREA")) {
      targetInput = el as HTMLInputElement | HTMLTextAreaElement;
    }
  }

  // 6. Fallback to active focused element
  if (!targetInput && document.activeElement && (document.activeElement.tagName === "INPUT" || document.activeElement.tagName === "TEXTAREA")) {
    targetInput = document.activeElement as HTMLInputElement | HTMLTextAreaElement;
  }

  // 7. Fallback to primary visible input on screen
  if (!targetInput) {
    const visibleInputs = Array.from(document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>("input, textarea")).filter(
      (inp) => inp.offsetParent !== null && inp.type !== "hidden"
    );
    if (visibleInputs.length > 0) {
      targetInput = visibleInputs[0];
    }
  }

  if (!targetInput) {
    return {
      success: false,
      message: `Could not find an input or textarea matching "${targetQuery}" on current screen.`,
    };
  }

  highlightElement(targetInput, "#0ea5e9", 1200);
  setNativeValue(targetInput, text);

  // If submit requested
  if (submit) {
    const container = targetInput.closest("form") || targetInput.parentElement;
    const sendBtn = container?.querySelector<HTMLButtonElement>(
      "button[type='submit'], button:has(svg.lucide-send), button:has(svg.lucide-zap)"
    );
    if (sendBtn) {
      setTimeout(() => sendBtn.click(), 150);
    } else {
      targetInput.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", code: "Enter", keyCode: 13, bubbles: true }));
    }
  }

  return {
    success: true,
    message: `Successfully typed "${text}" into ${targetQuery}.`,
  };
}
