/**
 * Client-Side DOM Actions, Screen Grounding Snapshot, and Visual Highlighting
 * for EDITH Voice Agent.
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
    element.style.boxShadow = `0 0 20px ${color}, inset 0 0 10px ${color}33`;

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
 * Produces a compact, structured JSON snapshot of the visible screen
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

  // Buttons
  document.querySelectorAll("button, [role='button']").forEach((btn) => {
    const b = btn as HTMLElement;
    if (b.offsetParent === null) return; // Hidden
    const text = b.innerText?.trim() || b.getAttribute("aria-label") || b.id;
    if (text && text.length > 0 && text.length < 60) {
      actionable.push({
        id: b.id || undefined,
        tag: "button",
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
    visible_headings: headings.slice(0, 6),
    actionable_elements: actionable.slice(0, 25), // Compact budget
  };
}

/**
 * Searches the DOM for an element matching a voice label, query, or ID.
 */
export function findMatchingElement(query: string): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const q = query.trim().toLowerCase();

  // 1. Direct ID match
  const byId = document.getElementById(query.trim()) || document.getElementById(q);
  if (byId) return byId;

  // 2. data-voice-action match
  const byVoiceAction = document.querySelector(`[data-voice-action="${q}"]`) as HTMLElement;
  if (byVoiceAction) return byVoiceAction;

  // 3. Search visible buttons
  const buttons = Array.from(document.querySelectorAll("button, [role='button'], a"));
  const exactBtn = buttons.find((el) => {
    const text = el.textContent?.trim().toLowerCase();
    const aria = el.getAttribute("aria-label")?.toLowerCase();
    return text === q || aria === q;
  }) as HTMLElement;
  if (exactBtn) return exactBtn;

  const partialBtn = buttons.find((el) => {
    const text = el.textContent?.trim().toLowerCase();
    const aria = el.getAttribute("aria-label")?.toLowerCase();
    return (text && text.includes(q)) || (aria && aria.includes(q));
  }) as HTMLElement;
  if (partialBtn) return partialBtn;

  // 4. Search inputs by label, placeholder, name
  const inputs = Array.from(document.querySelectorAll("input, textarea, select"));
  const matchInput = inputs.find((el) => {
    const inp = el as HTMLInputElement;
    const name = inp.name?.toLowerCase();
    const placeholder = inp.placeholder?.toLowerCase();
    const aria = inp.getAttribute("aria-label")?.toLowerCase();
    const id = inp.id?.toLowerCase();
    return (
      name === q ||
      placeholder === q ||
      aria === q ||
      id === q ||
      (placeholder && placeholder.includes(q)) ||
      (name && name.includes(q))
    );
  }) as HTMLElement;
  if (matchInput) return matchInput;

  return null;
}

/**
 * Dispatches synthetic input & change events for React state compatibility.
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
}
