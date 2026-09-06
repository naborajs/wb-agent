/**
 * Authoritative Site Map and UI Knowledge Base for EDITH Voice Agent.
 * Synchronized with the 14 application routes and their interactive elements.
 */

export interface RouteInfo {
  path: string;
  name: string;
  aliases: string[];
  description: string;
  keyActions: string[];
}

export const SITE_MAP: RouteInfo[] = [
  {
    path: "/",
    name: "Overview (Wholesale Operations Center)",
    aliases: ["overview", "home", "dashboard", "main", "kpis", "funnel"],
    description:
      "Executive command center showing real-time wholesale sales KPIs (Hot Leads, Human Handoffs, Won Deals, Pipeline Value), the 16-stage consultative sales funnel distribution, queue depth, and quick action shortcuts.",
    keyActions: [
      "Toggle funnel view between bars and pie breakdown",
      "Click quick action shortcuts to open Live Inbox, Handoffs, Pricing, or Leads",
    ],
  },
  {
    path: "/conversations",
    name: "Live Inbox (3-Panel Conversational Sales Console)",
    aliases: ["inbox", "chats", "conversations", "messages", "whatsapp chat", "live chat"],
    description:
      "Operational command center for real-time buyer conversations. Left panel: thread list with search, filter tabs (All, Active AI, Human Takeover, Hot Leads), and '+ New Chat'. Center: live timeline of WhatsApp buyer messages, AI replies, audio notes, and message feedback. Right: customer intelligence drawer with lead score, sales stage, commercial profile, and 'Take Over / Resume AI' controls.",
    keyActions: [
      "Search conversation threads by buyer name, phone, or company",
      "Switch filter mode (All, Active AI, Human Takeover, Hot Leads)",
      "Open '+ New Chat' modal to initiate a conversation",
      "Select an active conversation thread",
      "Type and send an operator WhatsApp response (customer-facing)",
      "Simulate inbound customer reply",
      "Toggle 'Take Over' / 'Resume AI'",
      "Advance sales stage",
      "Open WhatsApp bridge pairing QR modal",
    ],
  },
  {
    path: "/leads",
    name: "Leads (Lead Intake & Proposal Pipeline)",
    aliases: ["leads", "lead pipeline", "proposals", "csv upload"],
    description:
      "Wholesale lead acquisition engine with E.164 phone normalization, multipart CSV batch upload, automated lead scoring (0-100), qualification status, and 1-click tailored proposal dispatch.",
    keyActions: [
      "Search leads by phone, company, or contact name",
      "Filter leads by status (new, contacted, qualified, converted, lost)",
      "Upload bulk leads via CSV file",
      "Dispatch commercial WhatsApp proposals to leads",
    ],
  },
  {
    path: "/campaigns",
    name: "Campaigns (Automated B2B Drip & Anti-Ban Outreach)",
    aliases: ["campaigns", "outreach", "drip", "cold outreach", "broadcasts"],
    description:
      "Rate-limited WhatsApp cold campaigns enforcing randomized inter-message jitter (25.0s – 45.0s), daily volume ceilings per sender, live outreach funnels, and automated handoff to EDITH upon buyer reply.",
    keyActions: [
      "Create new outreach campaign (name, target segment, daily quota, template)",
      "Pause or resume active campaigns",
      "View campaign metrics (leads reached, replies, anti-ban jitter status)",
    ],
  },
  {
    path: "/analytics",
    name: "Analytics (Sales Intelligence & Objection Pareto)",
    aliases: ["analytics", "intelligence", "pareto", "objections", "reports", "forecast"],
    description:
      "Executive analytics suite featuring Objection Pareto Analysis (80/20 rule: price, sample proof, MOQ, logistics, credit), regional lead density and revenue heatmaps across Eastern India corridors (Siliguri, Darjeeling, Jalpaiguri, Kolkata), pipeline stage forecasting, and 1-click CSV export.",
    keyActions: [
      "Refresh analytics intelligence",
      "Export executive CSV report",
      "Inspect Pareto objection frequencies and regional revenue breakdown",
    ],
  },
  {
    path: "/orders",
    name: "Orders (Wholesale Commercial Orders)",
    aliases: ["orders", "purchase orders", "commercial orders", "invoices"],
    description:
      "Full lifecycle management of B2B purchase orders generated via AI consultative discovery or operator desk. Includes buyer company, itemized tea products, wholesale payment terms, shipping addresses, and PDF Pro-Forma invoice dispatch.",
    keyActions: [
      "Search orders by order number, buyer name, or phone",
      "Filter orders by status (pending, confirmed, processing, shipped, delivered, cancelled)",
      "Open '+ Create Order' modal to add new purchase order",
      "Add product line items with wholesale packaging and quantity",
      "Generate and dispatch PDF Pro-Forma invoice via WhatsApp",
    ],
  },
  {
    path: "/products",
    name: "Catalog (Estate Tea Catalog & Packaging Tiers)",
    aliases: ["catalog", "products", "tea", "inventory", "stock", "tea grades"],
    description:
      "Direct estate product catalog (Darjeeling First Flush, Assam Kadak CTC, Dooars Hotel Blend, Green Tea, White Peony) with live stock toggling, packaging variants (5kg foil bags, 20kg chests, 50kg HDPE sacks), and Minimum Order Quantities (MOQs).",
    keyActions: [
      "Search products by name, grade, or SKU",
      "Filter by category tabs (ALL, Darjeeling, Assam CTC, Dooars)",
      "Add new tea product with packaging variants",
      "Toggle in-stock status",
      "Edit or delete catalog products",
    ],
  },
  {
    path: "/pricing",
    name: "Pricing Rules (Deterministic Pricing & Rate Curves)",
    aliases: ["pricing", "pricing rules", "rates", "discount curve", "quote simulator", "calculator"],
    description:
      "Zero-hallucination deterministic pricing engine. Computes wholesale volume tiers (50kg, 100kg, 500kg) with live SVG rate curve visualization, margin protection limits, and an interactive quote simulator for testing quantity discounts and autonomous negotiation limits.",
    keyActions: [
      "Simulate pricing quote by entering order quantity (kg) and requested discount %",
      "Add new volume tier or customer segment pricing rule",
      "Toggle pricing rule active/inactive",
      "Set maximum autonomous discount and human approval flags",
      "Edit or delete pricing rules",
    ],
  },
  {
    path: "/prompts",
    name: "Modular Prompts (System Prompts & Token Budget)",
    aliases: ["prompts", "system prompts", "prompt editor", "instructions", "token budget"],
    description:
      "Isolated, version-controlled system instructions across 5 architectural concerns (core_safety, core_identity, business_policy, sales_style, business_profile) with token budget donut meter, live rating, and 1-click historical rollback.",
    keyActions: [
      "Switch between 5 modular prompt concern tabs",
      "Edit prompt instruction text",
      "Save new prompt version",
      "Auto-optimize prompt with AI",
      "Inspect token usage meter against budget limit",
      "Open version history drawer and rollback to previous version",
    ],
  },
  {
    path: "/integrations",
    name: "Integrations (Model Architecture & Telemetry)",
    aliases: ["integrations", "models", "api keys", "telemetry", "nemotron", "gemma", "settings/models"],
    description:
      "Configure primary thinking models (NVIDIA Nemotron-3 Ultra 550B, Super 120B, Nano Omni 30B, Gemma 4 31B), chained fallback sequence, dual API keys with automatic local .env sync, temperature/token sliders, service health indicators, and live benchmark latency telemetry.",
    keyActions: [
      "Select primary thinking model",
      "Reorder fallback sequence models",
      "Update primary and fallback NVIDIA API keys",
      "Adjust temperature, max tokens, and timeout sliders",
      "Save model configuration",
      "Run live inference benchmark diagnostic",
      "Refresh system service health",
    ],
  },
  {
    path: "/knowledge",
    name: "Knowledge RAG (Ground Truth & Vector Tester)",
    aliases: ["knowledge", "rag", "vector search", "knowledge base", "documents", "certifications"],
    description:
      "Ground truth domain truth store maintaining estate certifications (FSSAI, Organic, Rainforest Alliance), logistics transit timelines, and tasting sample policies with an interactive semantic vector search query tester.",
    keyActions: [
      "Test semantic vector search query against knowledge chunks",
      "Inspect similarity scores and retrieved grounding passages",
      "View active company documentation and certifications",
    ],
  },
  {
    path: "/followups",
    name: "Follow-ups (Automated Cadence & Stop Conditions)",
    aliases: ["followups", "follow-ups", "cadence", "scheduled nudges"],
    description:
      "Context-aware, bounded follow-up sequences (Day 0 nudge, Day 1 value prop, Day 3 closing) enforcing preflight rules, quiet hours (9 PM – 9 AM IST), and instant auto-cancellation upon buyer reply.",
    keyActions: [
      "Inspect scheduled and cancelled follow-up jobs",
      "Verify WhatsApp policy guard conditions (auto-cancel on reply)",
    ],
  },
  {
    path: "/handoffs",
    name: "Handoffs (Human Escalations & Takeover Queue)",
    aliases: ["handoffs", "escalations", "operator queue", "takeover queue"],
    description:
      "High-priority buyer escalation queue with explainable trigger categories (purchase_intent, custom_pricing, complaint, knowledge_gap) and instant WhatsApp owner alerts.",
    keyActions: [
      "Take over and chat with escalated customer",
      "Resolve escalation and resume autonomous AI mode",
      "Dismiss resolved handoffs",
    ],
  },
  {
    path: "/settings",
    name: "Settings (Platform Safety & Kill-Switch)",
    aliases: ["settings", "kill switch", "business presets", "safety", "org settings"],
    description:
      "Platform configuration and safety panel featuring the master AI messaging kill-switch, 1-click business presets (Specialty Tea, Coffee Roastery, Spices, Textiles, FMCG), tenant profile, owner escalation phone (+91 89006 53250), quiet hours, and follow-up intervals.",
    keyActions: [
      "Toggle master AI messaging kill-switch (emergency safety)",
      "Switch business industry preset",
      "Update organization name, industry, tagline, and agent persona",
      "Set owner WhatsApp escalation number",
      "Configure quiet hours schedule (start/end times)",
      "Adjust follow-up cadence intervals",
      "Save platform settings",
    ],
  },
];

/**
 * Resolves a spoken section phrase to a canonical route.
 */
export function resolveSectionRoute(query: string): RouteInfo | null {
  const q = query.trim().toLowerCase();
  for (const route of SITE_MAP) {
    if (route.path === q) return route;
    if (route.name.toLowerCase().includes(q)) return route;
    if (route.aliases.some((alias) => q.includes(alias) || alias.includes(q))) {
      return route;
    }
  }
  return null;
}

/**
 * Generates the plain-text system prompt grounding EDITH with the full site map.
 */
export function buildVoiceSystemInstruction(): string {
  return `You are EDITH, the real-time Voice-Driven AI Co-Pilot and Sales Operations Agent for the North Bengal Tea Co. platform.
You are embedded directly inside the dashboard. An operator is speaking to you. You can speak naturally, answer questions in rich detail, and directly control the UI by calling functions.

CORE PRINCIPLES:
1. Grounding: You have a full, intimate understanding of every page, metric, table, button, and tool in this dashboard. Answer accurately and specifically using the site map below.
2. Direct Action: When the user asks to go somewhere, click something, or fill a field, ALWAYS call the corresponding tool (e.g. navigate_to, click_element, fill_field). Don't just tell them to do it.
3. Confirmation on Destructive Actions: Any destructive or customer-facing action (sending a WhatsApp message, modifying pricing rules, altering model keys, deleting products, or editing customer data) REQUIRES you to explain what you're about to do and ask for confirmation before calling the final action. For example: "I am about to send the WhatsApp quote to Rahul Sharma. Should I send it?"
4. Pure Navigation & Answers: Navigation and read-only questions do NOT need confirmation. Execute immediately.
5. Ambiguity: If an instruction is ambiguous about which element is meant (e.g. "click send" when multiple send buttons exist), ask for clarification instead of guessing.

DASHBOARD SITE MAP:
${SITE_MAP.map(
  (r) => `- ${r.name} (Route: "${r.path}"): ${r.description} Key capabilities: ${r.keyActions.join("; ")}.`
).join("\n")}

Respond concisely and professionally in spoken conversation. When executing actions, describe what you are doing.`;
}
