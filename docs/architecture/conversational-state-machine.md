---
title: Conversational 16-Stage Sales State Machine
tags: [architecture, state-machine, sales-funnel, crm, obsidian]
updated: 2026-09-02
aliases: [Sales State Machine, Funnel Stages, Stage Machine]
status: complete
---

# 🔄 Conversational 16-Stage Sales State Machine

> [!NOTE]
> WB-Agent does not treat sales conversations as open-ended chats. Every conversation is bounded by an explicit, auditable **16-Stage Finite State Machine** (`SalesStageManager`) that tracks pipeline progress, validates allowed transitions, and prevents illegal backward jumps.
>
> ⬅️ Back to: [[index|Knowledge Base Index]]

---

## 🗺️ State Transition Diagram

```mermaid
stateDiagram-v2
    [*] --> NEW: Prospect Imported / Inbound Inquiry
    NEW --> CONTACTED: Outbound Outreach Dispatched
    NEW --> DISCOVERY: Customer Replies First
    CONTACTED --> DISCOVERY: Customer Replies
    CONTACTED --> UNQUALIFIED: Not a B2B Buyer
    CONTACTED --> LOST: Unresponsive after Day 3

    DISCOVERY --> QUALIFIED: B2B Verified (Volume, Business Name)
    DISCOVERY --> UNQUALIFIED: Retail / B2C / Zero Volume
    
    QUALIFIED --> SAMPLE_REQUESTED: Asks for Tasting Kit
    QUALIFIED --> RECOMMENDATION: Matches Grade Preferences
    QUALIFIED --> OBJECTION: Price / Origin / Trust Hesitation

    SAMPLE_REQUESTED --> SAMPLE_SENT: Courier Tracking Added
    SAMPLE_SENT --> SAMPLE_FEEDBACK: Follow-up Check
    SAMPLE_FEEDBACK --> RECOMMENDATION: Liked Darjeeling / Assam
    SAMPLE_FEEDBACK --> OBJECTION: Did Not Like Blend

    RECOMMENDATION --> NEGOTIATION: Requests Volume Discount
    RECOMMENDATION --> PURCHASE_INTENT: Approves Catalog Quote
    RECOMMENDATION --> OBJECTION: Cost-per-cup concern

    OBJECTION --> NEGOTIATION: Commercial Agreement Needed
    OBJECTION --> DISCOVERY: Re-evaluating Requirements
    OBJECTION --> LOST: Dealbreaker Objection

    NEGOTIATION --> PURCHASE_INTENT: Quote Finalized (<= 5% Auto)
    NEGOTIATION --> HUMAN_HANDOFF: Custom Quotation (> 500kg)
    
    PURCHASE_INTENT --> HUMAN_HANDOFF: Escalated for GST Invoice
    PURCHASE_INTENT --> WON: Payment / Purchase Order Confirmed

    HUMAN_HANDOFF --> WON: Operator Rajiv Closes Deal
    HUMAN_HANDOFF --> LOST: Buyer Decided Against

    state "ANY STAGE" as ANY
    ANY --> OPTED_OUT: Customer Sends 'STOP' / 'Unsubscribe'
    ANY --> HUMAN_HANDOFF: Explicit Human Request
```

---

## 📊 Stage Definitions & Commercial Significance

| Stage | Name | Commercial Objective |
| :--- | :--- | :--- |
| 1 | `NEW` | Raw prospect ingested; zero contact made yet. |
| 2 | `CONTACTED` | First proactive campaign outreach sent to customer. |
| 3 | `ENGAGED` | Customer opened or acknowledged message. |
| 4 | `DISCOVERY` | Uncovering business type, daily cuppage, and preferred tea varieties. |
| 5 | `QUALIFIED` | Customer verified as genuine commercial buyer with requirements meeting MOQ. |
| 6 | `UNQUALIFIED` | B2C buyer, below MOQ, or personal consumer. |
| 7 | `SAMPLE_REQUESTED` | Tasting kit ordered (₹499 credited against first commercial order). |
| 8 | `SAMPLE_SENT` | Courier tracking number generated. |
| 9 | `SAMPLE_FEEDBACK` | Inquiring on leaf aroma, cuppage, and brew color. |
| 10 | `RECOMMENDATION` | Specific estate tea grades pitched with base rates. |
| 11 | `OBJECTION` | Reframing concerns regarding price, competitor blends, or transit time. |
| 12 | `NEGOTIATION` | Computing volume tier discounts within autonomous 5% ceiling. |
| 13 | `PURCHASE_INTENT` | Buyer confirmed intention to order; order parameters locked. |
| 14 | `HUMAN_HANDOFF` | Live operator Rajiv takes over for GST invoice and payment details. |
| 15 | `WON` | Commercial order confirmed, invoice paid, and tea dispatched. |
| 16 | `LOST` | Opportunity closed without conversion. |
| Ex | `OPTED_OUT` | Immediate anti-spam consent revocation; all outreach permanently halted. |

---

## 🛡️ Transition Validation & Audit Trails

In `backend/app/agent/sales_stage.py`:
- All state changes must pass `SalesStageManager.can_transition(from_stage, to_stage)`.
- Illegal transitions (e.g. attempting to jump from `NEW` directly to `WON`) raise a `ValueError` to prevent data corruption.
- Every valid transition logs an immutable record in `sales_events` recording `stage_from`, `stage_to`, `reason`, and the associated `AgentRun`.

---

## 🔀 Next Step
Explore how pricing is deterministically governed:
👉 Proceed to **[[deterministic-pricing-engine|Deterministic Pricing & Margin Safety]]**.
