# ADR 0019: Automated Invoicing, GST Compliance, and Quote Lifecycle State Machine

## Status
Accepted

## Date
2026-09-18

## Context
Commercial B2B transactions negotiated over WhatsApp require deterministic financial representations:
1. **Statutory Tax Compliance**: Tax calculations must correctly differentiate intrastate sales (50% CGST + 50% SGST) from interstate sales (100% IGST).
2. **Deterministic Lifecycle Progression**: Quotes must follow an auditable state machine: `draft` -> `sent` -> `accepted` (or `expired`/`rejected`), with one-click conversion into a confirmed `Order`.
3. **Filesystem Defense**: Generated vector PDF invoices and downloadable exports must be protected against directory traversal and invalid cross-platform characters.

## Decisions

### 1. Dual-Mode GST Breakdown Calculation
Implemented `InvoiceGenerator.calculate_gst_breakdown` which accepts the order subtotal, an `is_interstate` boolean flag, and configurable GST percentage (defaults to standard 5.0% for agricultural wholesale goods). It automatically derives CGST, SGST, IGST, and gross total with 2-decimal point precision.

### 2. Quote-to-Order Automated Conversion State Machine
Added `POST /api/v1/quotes/{quote_id}/convert`. When invoked:
- Validates the quote is in an active, non-expired state.
- Instantiates a new commercial `Order` carrying buyer, conversation, and organization metadata.
- Duplicates quote line items into `OrderItem` records with unit price, discounts, and subtotals.
- Sets the quote's status to `accepted` in an atomic database transaction.

### 3. Cross-Platform Filename Sanitization
Implemented `InvoiceGenerator.sanitize_invoice_filename` which strips illegal filesystem characters (`/`, `\`, `:`, `*`, `?`, `"`, `<`, `>`, `|`) and normalizes whitespace, preventing path traversal vulnerabilities when downloading invoices.

## Consequences
- End-to-end commercial flow from conversational purchase intent to signed pro-forma invoice and confirmed order.
- Statutory accuracy for Indian and international B2B commerce.
- Clean separation between preliminary quotes and binding orders.
