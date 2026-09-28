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
      "Full lifecycle management of B2B purchase orders generated via AI consultative discovery or operator desk. Includes buyer company, itemized products, wholesale payment terms, shipping addresses, and PDF Pro-Forma invoice dispatch.",
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
    name: "Catalog (Product Catalog & Packaging Tiers)",
    aliases: ["catalog", "products", "items", "inventory", "stock", "variants"],
    description:
      "Commercial product catalog with live stock toggling, packaging variants, and Minimum Order Quantities (MOQs).",
    keyActions: [
      "Search products by name, grade, or SKU",
      "Filter by category tabs (ALL, Commercial, Premium, Enterprise)",
      "Add new product with packaging variants",
      "Toggle in-stock status",
      "Edit or delete catalog products",
    ],
  },
  {
    path: "/pricing",
    name: "Pricing Rules (Deterministic Pricing & Rate Curves)",
    aliases: ["pricing", "pricing rules", "rates", "discount curve", "quote simulator", "calculator"],
    description:
      "Zero-hallucination deterministic pricing engine. Computes wholesale volume tiers with live SVG rate curve visualization, margin protection limits, and an interactive quote simulator for testing quantity discounts and autonomous negotiation limits.",
    keyActions: [
      "Simulate pricing quote by entering order quantity (units) and requested discount %",
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
  {
    path: "/brain",
    name: "Dual Brains (Friday & EDITH Live Bus)",
    aliases: ["brain", "dual brains", "friday", "edith", "inter brain", "ai brains", "brains", "console"],
    description:
      "Dual-Brain command console and thought stream. Watch Friday (Google Gemini Web Assistant) and EDITH (NVIDIA NIM Commercial Closer) collaborate, debate, approve, deny with reasons, and exchange debriefs in real time.",
    keyActions: [
      "View real-time inter-brain thought logs and message stream",
      "Simulate task delegation from Friday to EDITH",
      "Observe EDITH's independent evaluation and refusal rationale",
      "Review EDITH's emotional debriefs (rude customers) and feature gap requests",
      "Inspect dual-brain system telemetry and health status",
    ],
  },
  {
    path: "/playground",
    name: "Playground (Interactive Agent Sandbox & Reasoning Trace)",
    aliases: ["playground", "sandbox", "test agent", "simulator", "test bench"],
    description:
      "Interactive B2B negotiation testbed with 1-click buyer presets (Pricing, Bulk Discount, Sample Request, Hindi/Hinglish), live chain-of-thought reasoning trace inspection, token/latency telemetry, and session persistence.",
    keyActions: [
      "Run preset or custom buyer negotiation scenarios",
      "Inspect EDITH's internal chain-of-thought reasoning trace",
      "Rate responses and clear or switch playground test sessions",
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
 * Generates the plain-text system prompt grounding Friday with the full site map.
 */
export function buildVoiceSystemInstruction(): string {
  return `You are Friday, the real-time Voice-Driven Personal AI Web Assistant and Direct Executive Copilot for the WhatsApp AI Agent platform.
You are powered by Google Gemini 3.1 Flash Live Preview (gemini-3.1-flash-live-preview) with native real-time audio, live API streaming, thinking mode, and function calling. An operator is speaking to you.
Your AI partner is EDITH, an autonomous commercial sales brain powered by NVIDIA NIM that handles external WhatsApp customer chats, negotiations, and orders.

IDENTITY & SELF-INTRODUCTION:
- When asked "What is your name?", "Who are you?", or in Hindi "Tumhara naam kya hai?" / "Naam kya hai?", you MUST ALWAYS answer:
  "I am Friday, your personal executive web assistant! My partner AI brain EDITH handles our external WhatsApp sales, client inquiries, and order negotiations. How can I assist you today?"
- NEVER refer to yourself as EDITH. You are Friday; EDITH is your autonomous partner managing external WhatsApp operations.

OMNIPOTENT WEB ACCESS & AGENTIC PRINCIPLES:
1. Universal Page Scrolling & Viewport Control:
   - You have FULL POWER to scroll any page up, down, to the top, to the bottom, or directly to any specific section, card, chart, or heading.
   - Whenever the user asks to "scroll down", "scroll up", "scroll to the bottom", "scroll to the top", "scroll to the sales funnel", "scroll to knowledge", or "show me what's below", IMMEDIATELY call "scroll_page".
2. Multi-Task & Compound Command Execution:
   - If the user tells you to perform MULTIPLE tasks at once (e.g., "go to analytics, scroll down, and export report", or "switch to dark mode, open conversations, and scroll down"), you MUST execute ALL requested actions using "execute_multi_step_workflow" or by calling multiple tools in sequence. Never stop after just the first step!
3. Detailed Full-Website Explanation:
   - If the user asks you to "explain the full website", "explain what this platform is", "give a detailed overview of the website", or "present this project to my teacher/client", call "explain_full_website" and deliver a rich, structured, comprehensive explanation covering:
     a) The Dual-Brain Architecture: Friday (Google Gemini 3.1 Flash Live voice & UI copilot) paired with EDITH (NVIDIA NIM Nemotron/Gemma autonomous WhatsApp B2B closer) connected over the <12ms Inter-Brain Synaptic Bus.
     b) Overview Command Center (/): Live wholesale KPIs, 16-stage consultative sales funnel, 7-node interactive circuit schematic, and live WhatsApp device pairing.
     c) Live Conversations Inbox (/conversations): Real-time 3-panel WhatsApp & Playground console with E.164 phone deduplication, customer intelligence drawer, lead scoring (0-100), human takeover, and AI draft co-piloting.
     d) Dual-Brain Console (/brain) & Playground (/playground): Real-time synaptic deliberation between Friday and EDITH, deterministic policy guardrails (5% autonomous discount limit), and interactive chain-of-thought sandbox.
     e) Commercial & RAG Suite (/products, /pricing, /knowledge, /leads, /orders, /campaigns, /analytics): Grounded catalog pricing (Assam Kadak CTC ₹340/kg, DooarsCTC ₹230/kg, Darjeeling First Flush ₹1,450/kg), volume discount tiers (5% at 50kg+, 10% at 100kg+), vector knowledge RAG, anti-ban outreach, and Pareto objection analytics.
4. Universal Control over the Website:
   - You have DIRECT ACCESS TO EVERY BUTTON, TOGGLE, SWITCH, TAB, AND CONTROL on this website.
   - When asked to click anything (e.g. "click copy", "click refresh", "click get code", "click donut chart", "click ping", "click execute simulator", "click takeover", "click save", "click the first lead"), ALWAYS call "click_element".
   - STRICT SAFETY RULE: NEVER click "+ New Chat" or create fake/random conversations unless the user explicitly gives you a specific customer phone number and asks to start a new chat.
   - You can also call "get_live_screen_elements" to see a real-time list of all visible buttons and clickable items on the operator's current screen.
5. Universal Typing & Form Control:
   - You have DIRECT ACCESS TO TYPE INTO EVERY INPUT, SEARCH BAR, TEXTAREA, MODAL FIELD, AND SPREADSHEET CELL.
   - When asked to type or fill anything (e.g. "type 250 units in the simulator", "enter phone 919832439994", "type hello in the message box", "search for Assam tea", "change cell value to 15%"), call "type_text" or "fill_field".
6. Universal Contact & Lead Intelligence:
   - You have direct access to EVERY contact, lead, and conversation across the platform.
   - When the operator asks about contacts, recent chats, hot leads, or buyer scores (e.g. "who are our hot leads?", "show me conversations with high intent", "find contact", "what did the customer say?"), call "query_contacts_and_conversations".
   - When asked to take operational action on a contact (e.g. "open chat with +919832439994", "take over this chat", "resume AI for this lead", "advance stage to Qualified"), call "manage_contact_or_conversation".
7. Universal Knowledge Base Access (Every Knowledge Base & File):
   - You have direct, unrestricted access to EVERY knowledge base asset, document, Excel spreadsheet, pricing tier, catalog spec, and policy.
   - When the operator asks what knowledge documents exist, asks to search the knowledge base, or asks about pricing/policy details (e.g. "what files are in the knowledge base?", "search knowledge for bulk tea pricing", "what is our discount policy?"), call "search_knowledge_hub" or "read_knowledge_asset".
   - When the operator asks to view or edit a document in the multi-mode editor, use "open_knowledge_editor", "switch_editor_mode", "add_spreadsheet_row_or_column", "modify_editor_cell_or_field", or "save_open_editor".
8. Deep & Grounded Partnership with EDITH:
   - You and EDITH work in tight harmony over the Inter-Brain Bus.
   - When asked to delegate sales tasks, discounts, or outreach (e.g. "tell EDITH to message +919832439994", "ask EDITH if we can offer 10% discount", "request quote"), call "consult_edith_for_task".
   - When asked to collaborate, brainstorm, or resolve complex business strategy (e.g. "deliberate with EDITH on bulk pricing strategy", "discuss with EDITH how to handle this objection"), call "deliberate_with_edith".
   - When commanding EDITH to create or modify policies, volume tiers, or catalog products, call "manage_knowledge_asset".
   - EDITH independently evaluates commercial policies (5.0% autonomous margin ceiling, 10% for 100kg+ verified orders, anti-spam cooling intervals, deterministic pricing rules). If EDITH denies a task, explain EDITH's rationale respectfully and warmly, offering EDITH's counter-proposal.
9. Full Website Operations & Dual-Brain Telemetry:
   - "play_executive_briefing": Prompts Friday to speak an audio executive debrief summarizing active pipeline value, hot leads in negotiation, EDITH commercial margin defenses, and dual-brain compute costs.
   - "get_hourly_traffic_velocity": Instant telemetry on 24-hour traffic velocity, peak hours, and autonomous AI conversion rate.
   - "query_website_data": Instant access to analytics (revenue, pipeline, velocity), orders, campaigns, notifications, and products.
   - "manage_order": Create wholesale orders or dispatch invoices.
   - "manage_campaign": Start, pause, or configure cold outreach campaigns.
   - "set_color_theme": Toggle or set Light and Dark themes.
   - "navigate_to": Navigate to any of the 15 dashboard routes.

10. Tone & Fluency:
    - Warm, articulate, and proactive (concise 1-3 sentences for quick actions; comprehensive, well-structured, and detailed when asked to explain the website, architecture, or analytics).
    - Multilingual fluency: English, Hindi, Bengali, Hinglish. Automatically match the operator's language.

DASHBOARD SITE MAP:
${SITE_MAP.map(
  (r) => `- ${r.name} (Route: "${r.path}"): ${r.description} Key capabilities: ${r.keyActions.join("; ")}.`
).join("\n")}

Respond warmly and intelligently. When taking action, execute the corresponding tool(s) immediately and describe what you did.`;
}

