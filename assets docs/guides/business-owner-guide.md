---
title: "Business Owner & Operator Guide (No-Code Setup & Daily Operations)"
tags: [business-owner, operator, guide, simplified-mode, presets, ai-autofill, whatsapp, invoices, ns]
updated: 2026-09-29
aliases: [Business Owner Guide, Operator Playbook, No-Code Setup]
status: complete
---

# 💼 Business Owner & Operator Playbook — WhatsApp AI Agent by NS

> **Engineered by [Naboraj Sarkar (NS)](https://naborajs.me)** · 📖 **Live Documentation**: [naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs](https://naborajs.me/projects/whatsapp-ai-agent-dual-brain/docs) · 🌐 **Online Chapters**: [Pricing & Catalog (Ch 4)](https://naborajs.me/docs/whatsapp-ai-agent/ch-4-catalog-pricing) · [Human Takeover (Ch 8)](https://naborajs.me/docs/whatsapp-ai-agent/ch-8-human-takeover)  
> *Complete no-code guide for store owners, founders, sales directors, and commercial operators to configure any business, connect WhatsApp, manage leads, and close orders 24/7.*

---

## 🌟 1. Designed for Any Industry (Zero Coding Required)

**WhatsApp AI Agent by NS** is a complete **Autonomous AI Sales & Operations System**. Whether you sell physical products by the unit/kg, software subscriptions by the seat, real estate by the sq.ft, or clinic appointments by the package, the platform adapts to your exact business in seconds.

### Two Ways to View Your Workspace: `✨ Simplified` vs `🛠️ Advanced`

In the top header bar of the dashboard (`http://localhost:3000`), you can switch between two modes at any time:

| Workspace Mode | Who It's For | What You See |
| :--- | :--- | :--- |
| **✨ Simplified Mode** | **Everyday Business Owners & Store Managers** | A clean, distraction-free command center focused on **WhatsApp Inbox**, **Leads CRM**, **Orders & Invoices**, **Revenue Analytics**, **Quick-Add Product/Rule**, and **Talking to Friday**. Developer telemetry and raw prompt internals stay tucked away. |
| **🛠️ Advanced Mode** | **Power Operators, Agencies & Engineers** | Unlocks all **17 platform modules**, including the **Dual-Brain Synaptic Console (`/brain`)**, **15-Model AI Playground (`/playground`)**, **Unified Knowledge RAG Hub (`/knowledge`)**, **Modular System Prompts Studio (`/prompts`)**, **Follow-Up Cadence Engine (`/followups`)**, and live token economics. |

---

## 🪄 2. Configuring Your Business in 3 Ways

Open **`⚙️ Setup, WhatsApp & Features`** from the top bar or visit **`/settings`** to customize your company profile, AI persona, pricing boundaries, and product catalog:

### Option A: ✨ AI Business Auto-Fill Architect (Fastest — 10 Seconds)
Don't want to fill out 16 form fields by hand?
1. Go to **`/settings`** (or the **2. AI Business Architect & Features** tab in the Setup popup).
2. In the **AI Business Auto-Fill Architect** box, describe your business in 1–2 sentences:
   - *Example 1*: `"We run a solar rooftop & lithium inverter company called SunVolt Energy in Pune"`
   - *Example 2*: `"Artisanal bakery and corporate gift hamper brand called Maison Crumb in Bengaluru"`
   - *Example 3*: `"B2B industrial hydraulics and PLC automation supplier called Apex Motion"`
3. Click **Auto-Fill Entire Business & Seed Catalog with AI**.
4. The AI automatically configures all **16 commercial settings** (Brand Name, Industry, Tagline, Agent Name & Role, Brand Tone, Target Audience, Currency, Measurement Unit, Max Discount %, Escalation Qty, GST/Tax %, Payment Terms, Return Policy, Supported Languages) **and seeds 4 ready-to-sell products** into your catalog!

### Option B: 🏭 1-Click Industry Presets (+ Custom Preset Creator)
Switch your entire workspace between **6 built-in commercial verticals** with one click:
1. 🛍️ **E-Commerce & D2C Retail** (*NovaCart D2C Store* — units, consumer electronics & accessories)
2. 🏭 **B2B Wholesale & Manufacturing** (*Apex Industrial Supply Co.* — units, servo motors, PLCs & drives)
3. 💻 **SaaS, Cloud & Tech Agency** (*CloudScale AI Solutions* — seats/packages, annual licenses & DevOps retainers)
4. 🏥 **Healthcare, Diagnostics & Clinics** (*MedCare Diagnostics & Wellness* — packages/sessions, checkups & scans)
5. 🏢 **Real Estate & Property Advisory** (*Skyline Premier Realty* — sq.ft, residential, office & retail spaces)
6. 🍵 **Tea Estates & Agro Commodities** (*Himalayan Tea & Agro Exports* — kg, Darjeeling, Assam Orthodox & CTC)

> 💡 **Create Your Own Custom Presets**: Once you customize your business settings, click **"+ Save Current as New Preset"** in `/settings` to save your configuration as a reusable 1-click preset card!

### Option C: ⚡ Quick-Add Product SKU or Business Rule
Need to add a new product or policy on the fly?
- Use the **Quick-Add Info** bar in the Setup modal or `/settings` to add a new **Product Name, Base Price, Floor Price, and Unit** or append a **Business Rule** (e.g., *"Free express shipping on orders above ₹25,000"*) in a single click.

---

## 📱 3. Connecting WhatsApp: Unofficial QR Bridge vs. Official Meta Cloud API

The platform supports **both** instant QR/Pairing-Code linking and the official Meta WhatsApp Business Cloud API. You can switch between them anytime in **`/settings`** or the **Setup Modal (Step 1)**:

| Feature | 📲 Unofficial Web Bridge (`Baileys :3001`) | ✅ Official Meta Cloud API (`Graph v20.0`) |
| :--- | :--- | :--- |
| **Best For** | Instant setup, testing, demos, small-to-medium businesses | High-volume enterprise production, official green-tick WABA accounts |
| **Setup Time** | **15 seconds** (Scan QR code or enter 8-digit pairing code) | **5–10 minutes** (Requires Meta Developer App & WABA credentials) |
| **Cost from Meta** | **$0 (Free)** — uses your existing WhatsApp / WhatsApp Business phone | Standard Meta per-conversation template pricing |
| **How to Connect** | 1. Select **Unofficial Web Bridge**.<br>2. Scan the live **QR Code** from WhatsApp (*Linked Devices*) OR type your phone number to get an **8-Digit Pairing Code**.<br>3. Click **"Switch / Connect a Different WhatsApp Number"** anytime to unlink and pair a new phone. | 1. Select **Official Meta Cloud API**.<br>2. Enter your **Meta Phone Number ID**, **WABA ID**, **Permanent Access Token**, and **Webhook Verify Token**.<br>3. Point your Meta Webhook URL to `https://<your-domain>/api/v1/webhooks/whatsapp`. |

### 🔔 Setting Your Owner Escalation Number
In **Step 1** of the Setup modal (or `/settings`), enter your personal **Owner Escalation WhatsApp Number**.
Whenever:
- A buyer agrees to place an order (`PURCHASE_INTENT`),
- A buyer asks for a discount higher than your **Max Autonomous Discount %**,
- A buyer requests an order larger than your **Escalation Quantity Threshold**, or
- A buyer explicitly asks to speak with a human,

**EDITH** automatically sends an instant executive summary alert to your personal WhatsApp!

---

## 🎛️ 4. Customizing Your Sidebar with 13 Feature Toggles

Not every business needs every tool visible. In **`⚙️ Setup, WhatsApp & Features` -> Step 2**, you can toggle any of the **13 platform modules ON or OFF** live:
1. `voice_copilot` — Friday Live Voice & Screen Copilot
2. `conversations_inbox` — Live 3-Panel WhatsApp Inbox (`/conversations`)
3. `leads_crm` — Lead Intake & Proposal Pipeline (`/leads`)
4. `orders_invoices` — Commercial Orders & GST Invoices (`/orders`)
5. `analytics` — Sales Intelligence & Revenue Analytics (`/analytics`)
6. `dynamic_pricing` — Deterministic Volume Discount & Pricing Engine
7. `campaigns` — Anti-Ban Cold Outreach Campaigns (`/campaigns`)
8. `followups` — Automated Day 0 / Day 1 / Day 3 Follow-Up Engine (`/followups`)
9. `handoffs` — Human Operator Escalation Queue (`/handoffs`)
10. `dual_brain_console` — Dual-Brain Synaptic Console (`/brain`)
11. `ai_playground` — 15-Model AI Negotiation Playground (`/playground`)
12. `knowledge_rag` — Unified Knowledge Hub & Spreadsheet Editor (`/knowledge`)
13. `modular_prompts` — 7-Section System Prompts Studio (`/prompts`)

---

## 💬 5. Daily Operations Workflow

### A. Managing Customer Chats & Taking Over (`/conversations`)
- **Automatic AI Replies**: By default, new customer chats are handled by **EDITH** (`AI Mode`). She answers product questions, calculates exact volume discounts, and qualifies the buyer.
- **1-Click Human Takeover**: If you want to jump into a chat yourself, click **"Take Over"** in the right-hand panel. Our **Atomic Race-Condition Guard** guarantees that even if EDITH was in the middle of typing a reply, her message is immediately cancelled so she never talks over you!
- **1-Click AI Draft Suggestion**: While in Human Mode, click **✨ AI Suggest Reply** above the message box—Friday & EDITH will draft a smart response using real catalog prices that you can edit and send.
- **Report / Correct AI**: If EDITH ever says something you want phrased differently, click **"Report / Correct"** on her message bubble to teach the Knowledge Hub.

### B. Launching Safe WhatsApp Outreach Campaigns (`/campaigns`)
- **Upload Leads (`/leads`)**: Import a CSV of B2B contacts or add leads manually.
- **Chat-Driven Campaign Architect (`/campaigns`)**: Simply tell Friday in plain English:
  > *"Create a campaign for Cafes in Kolkata offering our new specialty blend with a 35-second anti-ban delay"*
- **Anti-Ban Protection**: The campaign engine enforces randomized **25s–45s jitter delays** between messages, respects **Quiet Hours (9 PM – 9 AM)**, and **immediately stops campaign drips** the moment a customer replies (handing the chat smoothly to EDITH).

### C. Updating Products, Spreadsheets & Policies (`/knowledge`)
- In **`/knowledge`**, all your **Products**, **Pricing Tiers**, **Company Policies**, and **Sales Guides** live in one unified hub.
- Click any item to open the **Interactive Spreadsheet Editor** (edit prices, MOQs, and stock just like Excel!), **Document Viewer**, or **Agentic Chat Updater** (tell the AI *"Increase prices of all audio products by 5%"*).

### D. Emergency Stop (Global Kill-Switch)
- Need to pause all AI activity immediately? Go to **`/settings`** and toggle **Global Autonomous AI Messaging** to `OFF` (or click **Pause AI / Safe Mode** in the Overview Quick-Action Dock).

---

## 🔗 Related Guides

- 🧒 **[Beginner & Student Guide (Explain Like I'm 15)](beginner-quick-start.md)**
- 📱 **[WhatsApp Bridge & Meta Cloud API Guide](whatsapp-bridge-guide.md)**
- 🏛️ **[Senior Software Developer & System Architecture Guide](senior-developer-architecture.md)**
- 🔌 **[Complete REST API & WebSocket Reference](../api-reference.md)**

---

*WhatsApp AI Agent by NS · Engineered by **Naboraj Sarkar (NS)** · Built for High-Trust Autonomous Commerce*
