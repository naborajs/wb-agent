"""
Invoice Generator Service for North Bengal Tea Co.
Compiles professional, deterministic, vector PDF Commercial Pro-Forma Invoices
using ReportLab with statutory compliance (GSTIN, FSSAI), volume discount tiers,
packaging specifications, 7-day rate lock terms, and NEFT/RTGS bank details.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal, ROUND_HALF_UP
import os
from pathlib import Path
import random
from typing import Any, Dict, List, Optional

import reportlab.rl_config

reportlab.rl_config.pageCompression = 0

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import (
    HRFlowable,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.config import settings
from app.products.catalog import DEMO_PRODUCTS
from app.utils.logging import logger


class InvoiceGenerator:
    """
    Autonomous commercial quote and pro-forma invoice PDF generator.
    """

    # Statutory details for North Bengal Tea Co.
    SELLER_NAME: str = "North Bengal Tea Co."
    SELLER_TAGLINE: str = "Premium Estate Teas & Commercial Wholesale Blends"
    SELLER_GSTIN: str = "19AABCN1234F1Z5"
    SELLER_FSSAI: str = "12821019000123"
    SELLER_ADDRESS: str = "Siliguri Commercial Hub, Sevoke Road, Siliguri, West Bengal - 734001"
    SELLER_PHONE: str = "+91 89006 53250"
    SELLER_EMAIL: str = "sales@northbengaltea.com"

    # Banking payment instructions
    BANK_NAME: str = "State Bank of India"
    ACCOUNT_NAME: str = "North Bengal Tea Co."
    ACCOUNT_NUMBER: str = "38472910543"
    IFSC_CODE: str = "SBIN0001234"
    BANK_BRANCH: str = "Siliguri Commercial Branch"

    # Standard Rate Lock Term
    RATE_LOCK_TERM: str = "Rate locked for 7 days from issue date. Subject to North Bengal Tea Co. standard trading terms."

    @staticmethod
    def calculate_volume_discount_pct(quantity_kg: float) -> float:
        """
        Determines catalog volume tier discount percentage:
        - 500kg+: 15.0%
        - 100kg+: 10.0%
        - 50kg+:   5.0%
        - Below 50kg: 0.0%
        """
        qty = float(quantity_kg)
        if qty >= 500.0:
            return 15.0
        if qty >= 100.0:
            return 10.0
        if qty >= 50.0:
            return 5.0
        return 0.0

    @classmethod
    def get_catalog_product_defaults(cls, product_name_or_sku: str) -> Dict[str, Any]:
        """
        Matches product against catalog to derive base price, grade, and packaging defaults.
        """
        search_key = product_name_or_sku.lower().strip()
        for prod in DEMO_PRODUCTS:
            if (
                search_key in prod["name"].lower()
                or search_key in prod["sku"].lower()
                or search_key in prod.get("category", "").lower()
            ):
                variants = prod.get("variants", [])
                base_price = float(variants[0]["base_price_per_kg"]) if variants else 350.0
                grade = prod.get("tea_grade", "Commercial Blend")
                # Pick largest packaging
                pkg = "25kg multi-wall paper sack with food-grade liner"
                if variants:
                    pkg = f"{variants[-1]['name']} with food-grade liner"
                return {
                    "matched_name": prod["name"],
                    "tea_grade": grade,
                    "base_price_per_kg": base_price,
                    "default_packaging": pkg,
                    "origin": prod.get("origin", "Siliguri, West Bengal"),
                }

        # Fallback default
        return {
            "matched_name": product_name_or_sku or "Assam Kadak CTC Granules",
            "tea_grade": "BP",
            "base_price_per_kg": 340.0,
            "default_packaging": "25kg multi-wall paper sack with food-grade liner",
            "origin": "Siliguri, West Bengal",
        }

    @classmethod
    def generate_proforma_pdf(
        cls,
        order_data: Dict[str, Any],
        output_path: Optional[str] = None,
    ) -> str:
        """
        Compiles a deterministic, valid, non-corrupt ReportLab vector PDF pro-forma invoice.
        Returns the canonical file path of the generated PDF.
        """
        now = datetime.now(timezone.utc)
        inv_num = (
            order_data.get("invoice_number")
            or order_data.get("quote_number")
            or f"PI-{now.strftime('%y%m%d')}-{random.randint(100, 999)}"
        )

        issue_date_str = order_data.get("issue_date") or now.strftime("%d-%b-%Y")
        valid_until_str = order_data.get("valid_until")
        if not valid_until_str:
            valid_until_date = now + timedelta(days=7)
            valid_until_str = valid_until_date.strftime("%d-%b-%Y")

        # Determine output file path
        if not output_path:
            target_dir = Path(settings.STORAGE_BASE_PATH) / "exports" / "invoices"
            target_dir.mkdir(parents=True, exist_ok=True)
            output_path = str(target_dir / f"{inv_num}.pdf")
        else:
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)

        # Buyer Details
        buyer_name = (
            order_data.get("buyer_name")
            or order_data.get("customer_name")
            or "Prospective Commercial Buyer"
        )
        buyer_phone = (
            order_data.get("buyer_phone")
            or order_data.get("customer_phone")
            or order_data.get("channel_id")
            or "+91 98000 00000"
        )
        buyer_company = (
            order_data.get("buyer_company")
            or order_data.get("company_name")
            or order_data.get("business_type")
            or "Commercial Enterprise"
        )
        buyer_city = (
            order_data.get("delivery_city")
            or order_data.get("shipping_city")
            or order_data.get("city")
            or "Siliguri"
        )
        buyer_state = (
            order_data.get("delivery_state")
            or order_data.get("shipping_state")
            or order_data.get("state")
            or "West Bengal"
        )
        buyer_gstin = (
            order_data.get("buyer_gstin")
            or order_data.get("gstin")
            or "URP (Unregistered Dealer)"
        )
        buyer_address = (
            order_data.get("delivery_address")
            or order_data.get("shipping_address")
            or f"Commercial Delivery Hub, {buyer_city}, {buyer_state}"
        )

        # Build Document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=36,
            bottomMargin=36,
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "InvoiceTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=16,
            leading=20,
            textColor=colors.HexColor("#064e3b"),  # Emerald dark
        )
        subtitle_style = ParagraphStyle(
            "InvoiceSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#334155"),
        )
        banner_title = ParagraphStyle(
            "BannerTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=11,
            leading=14,
            alignment=2,  # Right align
            textColor=colors.HexColor("#065f46"),
        )
        banner_sub = ParagraphStyle(
            "BannerSub",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8.5,
            leading=12,
            alignment=2,
            textColor=colors.HexColor("#475569"),
        )
        section_hdr = ParagraphStyle(
            "SectionHdr",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=9.5,
            leading=13,
            textColor=colors.HexColor("#0f172a"),
        )
        cell_text = ParagraphStyle(
            "CellText",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#1e293b"),
        )
        cell_text_bold = ParagraphStyle(
            "CellTextBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            textColor=colors.HexColor("#0f172a"),
        )
        cell_num = ParagraphStyle(
            "CellNum",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=8,
            leading=11,
            alignment=2,
            textColor=colors.HexColor("#1e293b"),
        )
        cell_num_bold = ParagraphStyle(
            "CellNumBold",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=11,
            alignment=2,
            textColor=colors.HexColor("#0f172a"),
        )
        terms_style = ParagraphStyle(
            "TermsStyle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=7.5,
            leading=10,
            textColor=colors.HexColor("#475569"),
        )

        elements: List[Any] = []

        seller_name = getattr(settings, "BUSINESS_NAME", cls.SELLER_NAME) or cls.SELLER_NAME
        seller_tagline = getattr(settings, "BUSINESS_TAGLINE", cls.SELLER_TAGLINE) or cls.SELLER_TAGLINE

        # 1. Header Grid: Brand on Left, Pro-Forma Details on Right
        logo_path = Path(__file__).parent.parent / "assets" / "logo-icon.png"
        if logo_path.exists():
            from reportlab.platypus import Image as RLImage
            logo_img = RLImage(str(logo_path), width=42, height=42)
            header_data = [
                [
                    logo_img,
                    Paragraph(f"<b>{seller_name}</b>", title_style),
                    Paragraph("<b>PRO-FORMA INVOICE & COMMERCIAL QUOTE</b>", banner_title),
                ],
                [
                    "",
                    Paragraph(
                        f"{seller_tagline}<br/>"
                        f"{cls.SELLER_ADDRESS}<br/>"
                        f"GSTIN: <b>{cls.SELLER_GSTIN}</b> | FSSAI: <b>{cls.SELLER_FSSAI}</b><br/>"
                        f"Phone: {cls.SELLER_PHONE} | Email: {cls.SELLER_EMAIL}",
                        subtitle_style,
                    ),
                    Paragraph(
                        f"<b>Invoice No:</b> {inv_num}<br/>"
                        f"<b>Issue Date:</b> {issue_date_str}<br/>"
                        f"<b>Valid Until:</b> {valid_until_str} (7-Day Rate Lock)<br/>"
                        f"<b>Payment Terms:</b> 100% on Dispatch / RTGS",
                        banner_sub,
                    ),
                ],
            ]
            header_table = Table(header_data, colWidths=[48, 262, 213])
            header_table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("SPAN", (0, 0), (0, 1)),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                        ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ]
                )
            )
        else:
            header_data = [
                [
                    Paragraph(f"<b>{seller_name}</b>", title_style),
                    Paragraph("<b>PRO-FORMA INVOICE & COMMERCIAL QUOTE</b>", banner_title),
                ],
                [
                    Paragraph(
                        f"{seller_tagline}<br/>"
                        f"{cls.SELLER_ADDRESS}<br/>"
                        f"GSTIN: <b>{cls.SELLER_GSTIN}</b> | FSSAI: <b>{cls.SELLER_FSSAI}</b><br/>"
                        f"Phone: {cls.SELLER_PHONE} | Email: {cls.SELLER_EMAIL}",
                        subtitle_style,
                    ),
                    Paragraph(
                        f"<b>Invoice No:</b> {inv_num}<br/>"
                        f"<b>Issue Date:</b> {issue_date_str}<br/>"
                        f"<b>Valid Until:</b> {valid_until_str} (7-Day Rate Lock)<br/>"
                        f"<b>Payment Terms:</b> 100% on Dispatch / RTGS",
                        banner_sub,
                    ),
                ],
            ]
            header_table = Table(header_data, colWidths=[310, 213])
            header_table.setStyle(
                TableStyle(
                    [
                        ("VALIGN", (0, 0), (-1, -1), "TOP"),
                        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                        ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ]
                )
            )
        elements.append(header_table)
        elements.append(Spacer(1, 8))
        elements.append(
            HRFlowable(
                width="100%",
                thickness=1.5,
                color=colors.HexColor("#065f46"),
                spaceAfter=8,
            )
        )

        # 2. Buyer & Dispatch Info Grid
        buyer_table_data = [
            [
                Paragraph("<b>BILL TO / BUYER DETAILS</b>", section_hdr),
                Paragraph("<b>DISPATCH & DESTINATION DETAILS</b>", section_hdr),
            ],
            [
                Paragraph(
                    f"<b>{buyer_company}</b><br/>"
                    f"Attn: {buyer_name}<br/>"
                    f"Phone: {buyer_phone}<br/>"
                    f"GSTIN: <b>{buyer_gstin}</b>",
                    cell_text,
                ),
                Paragraph(
                    f"<b>Delivery Address:</b> {buyer_address}<br/>"
                    f"<b>Destination:</b> {buyer_city}, {buyer_state}<br/>"
                    f"<b>Logistics Mode:</b> Insured Road Surface Express<br/>"
                    f"<b>Dispatch Warehouse:</b> Siliguri Central Commercial Yard",
                    cell_text,
                ),
            ],
        ]
        buyer_table = Table(buyer_table_data, colWidths=[261, 262])
        buyer_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 5),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
                    ("LEFTPADDING", (0, 0), (-1, -1), 8),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ]
            )
        )
        elements.append(buyer_table)
        elements.append(Spacer(1, 10))

        # 3. Process Line Items
        raw_items = order_data.get("items") or []
        if not raw_items:
            # Create a representative line item from top-level order data
            prod_name = (
                order_data.get("product_name")
                or order_data.get("item_name")
                or "Assam Kadak CTC Granules"
            )
            qty = float(order_data.get("quantity_kg") or order_data.get("quantity") or 50.0)
            raw_items = [{"product_name": prod_name, "quantity_kg": qty}]

        items_table_data = [
            [
                Paragraph("<b>#</b>", cell_text_bold),
                Paragraph("<b>Product Description</b>", cell_text_bold),
                Paragraph("<b>Grade</b>", cell_text_bold),
                Paragraph("<b>Packaging Specification</b>", cell_text_bold),
                Paragraph("<b>Qty (kg)</b>", cell_num_bold),
                Paragraph("<b>Rate (₹/kg)</b>", cell_num_bold),
                Paragraph("<b>Disc %</b>", cell_num_bold),
                Paragraph("<b>Amount (₹)</b>", cell_num_bold),
            ]
        ]

        total_gross = Decimal("0.00")
        total_discount = Decimal("0.00")
        total_taxable = Decimal("0.00")

        for idx, itm in enumerate(raw_items, 1):
            p_name = itm.get("product_name") or itm.get("item_name") or "Assam Kadak CTC Granules"
            defaults = cls.get_catalog_product_defaults(p_name)
            final_p_name = defaults["matched_name"]
            tea_grade = itm.get("tea_grade") or defaults["tea_grade"]

            qty_kg = float(itm.get("quantity_kg") or itm.get("quantity") or 25.0)

            # Packaging spec: default to 25kg/50kg multi-wall paper sack with food-grade liner
            pkg_spec = (
                itm.get("packaging_type")
                or itm.get("packaging")
                or order_data.get("packaging")
            )
            if not pkg_spec:
                if qty_kg >= 50.0:
                    pkg_spec = "50kg multi-wall paper sacks with food-grade liner"
                else:
                    pkg_spec = "25kg multi-wall paper sacks with food-grade liner"

            base_rate = float(
                itm.get("unit_price")
                or itm.get("unit_price_per_kg")
                or itm.get("base_price_per_kg")
                or defaults["base_price_per_kg"]
            )

            # Calculate volume discount if not explicitly provided
            explicit_disc = itm.get("discount_pct")
            if explicit_disc is not None:
                disc_pct = float(explicit_disc)
            else:
                disc_pct = cls.calculate_volume_discount_pct(qty_kg)

            item_gross = Decimal(str(base_rate)) * Decimal(str(qty_kg))
            item_disc_amt = (
                item_gross * Decimal(str(disc_pct)) / Decimal("100.0")
            ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
            item_net = (item_gross - item_disc_amt).quantize(
                Decimal("0.01"), rounding=ROUND_HALF_UP
            )

            total_gross += item_gross
            total_discount += item_disc_amt
            total_taxable += item_net

            items_table_data.append(
                [
                    Paragraph(str(idx), cell_text),
                    Paragraph(f"<b>{final_p_name}</b>", cell_text),
                    Paragraph(tea_grade, cell_text),
                    Paragraph(pkg_spec, cell_text),
                    Paragraph(f"{qty_kg:.1f}", cell_num),
                    Paragraph(f"₹{base_rate:,.2f}", cell_num),
                    Paragraph(f"{disc_pct:.1f}%", cell_num),
                    Paragraph(f"₹{float(item_net):,.2f}", cell_num_bold),
                ]
            )

        # Widths: 25 + 140 + 55 + 110 + 45 + 48 + 40 + 60 = 523 points (perfect match for A4)
        col_widths = [25, 140, 55, 110, 45, 48, 40, 60]
        items_table = Table(items_table_data, colWidths=col_widths)
        items_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#065f46")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#065f46")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 4),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 4),
                ]
            )
        )
        # Fix text colors for header row
        for col_idx in range(len(col_widths)):
            items_table_data[0][col_idx].style.textColor = colors.white

        elements.append(items_table)
        elements.append(Spacer(1, 8))

        # 4. Calculation of GST (5% for wholesale tea under HSN 0902)
        # If buyer state is West Bengal, CGST 2.5% + SGST 2.5%, otherwise IGST 5%
        is_wb = "west bengal" in buyer_state.lower()
        gst_rate = Decimal("0.05")
        gst_amount = (total_taxable * gst_rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        grand_total = (total_taxable + gst_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        # Financial Summary Table & Payment Details side-by-side
        bank_details_p = Paragraph(
            f"<b>NEFT / RTGS PAYMENT INSTRUCTIONS:</b><br/>"
            f"<b>Bank:</b> {cls.BANK_NAME}<br/>"
            f"<b>Beneficiary:</b> {cls.ACCOUNT_NAME}<br/>"
            f"<b>A/C No:</b> {cls.ACCOUNT_NUMBER}<br/>"
            f"<b>IFSC:</b> {cls.IFSC_CODE}<br/>"
            f"<b>Branch:</b> {cls.BANK_BRANCH}<br/>"
            f"<i>Please share UTR / payment proof on WhatsApp after transfer.</i>",
            cell_text,
        )

        tax_breakup = (
            f"CGST (2.5%): ₹{float(gst_amount/2):,.2f}<br/>SGST (2.5%): ₹{float(gst_amount/2):,.2f}"
            if is_wb
            else f"IGST (5.0%): ₹{float(gst_amount):,.2f}"
        )

        totals_data = [
            [Paragraph("Gross Order Subtotal:", cell_num), Paragraph(f"₹{float(total_gross):,.2f}", cell_num)],
            [Paragraph("Volume Tier Discount:", cell_num), Paragraph(f"- ₹{float(total_discount):,.2f}", cell_num)],
            [Paragraph("<b>Net Taxable Value:</b>", cell_num_bold), Paragraph(f"<b>₹{float(total_taxable):,.2f}</b>", cell_num_bold)],
            [Paragraph(f"GST (HSN 0902 @ 5%):<br/><font size=6.5 color='#64748b'>{tax_breakup}</font>", cell_num), Paragraph(f"₹{float(gst_amount):,.2f}", cell_num)],
            [Paragraph("<b>TOTAL PAYABLE (INR):</b>", cell_num_bold), Paragraph(f"<b>₹{float(grand_total):,.2f}</b>", cell_num_bold)],
        ]
        totals_table = Table(totals_data, colWidths=[150, 93])
        totals_table.setStyle(
            TableStyle(
                [
                    ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                    ("BACKGROUND", (0, 4), (-1, 4), colors.HexColor("#ecfdf5")),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#f1f5f9")),
                    ("TOPPADDING", (0, 0), (-1, -1), 4),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                    ("LEFTPADDING", (0, 0), (-1, -1), 6),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ]
            )
        )

        summary_data = [
            [bank_details_p, totals_table]
        ]
        summary_table = Table(summary_data, colWidths=[280, 243])
        summary_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("BOX", (0, 0), (0, 0), 0.5, colors.HexColor("#cbd5e1")),
                    ("BACKGROUND", (0, 0), (0, 0), colors.HexColor("#f8fafc")),
                    ("TOPPADDING", (0, 0), (0, 0), 6),
                    ("BOTTOMPADDING", (0, 0), (0, 0), 6),
                    ("LEFTPADDING", (0, 0), (0, 0), 8),
                    ("RIGHTPADDING", (0, 0), (0, 0), 8),
                ]
            )
        )
        elements.append(summary_table)
        elements.append(Spacer(1, 10))

        # 5. Rate Lock Terms Banner (Highlight requirement)
        rate_lock_data = [
            [
                Paragraph(
                    f"🔒 <b>COMMERCIAL 7-DAY RATE LOCK GUARANTEE:</b><br/>"
                    f"{cls.RATE_LOCK_TERM} "
                    f"Prices and allotted inventory are confirmed until <b>{valid_until_str}</b>.",
                    ParagraphStyle(
                        "RateLockBanner",
                        parent=styles["Normal"],
                        fontName="Helvetica-Bold",
                        fontSize=8.5,
                        leading=12,
                        textColor=colors.HexColor("#065f46"),
                    ),
                )
            ]
        ]
        rate_lock_table = Table(rate_lock_data, colWidths=[523])
        rate_lock_table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f0fdf4")),
                    ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#10b981")),
                    ("TOPPADDING", (0, 0), (-1, -1), 6),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                    ("LEFTPADDING", (0, 0), (-1, -1), 10),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ]
            )
        )
        elements.append(rate_lock_table)
        elements.append(Spacer(1, 10))

        # 6. Terms & Statutory Declaration
        terms_data = [
            [
                Paragraph(
                    "<b>TERMS & CONDITIONS OF SALE:</b><br/>"
                    "1. Payment: 100% advance against pro-forma invoice via NEFT/RTGS prior to dispatch.<br/>"
                    "2. Packaging: Food-grade multi-wall paper sacks with inner moisture-barrier liner.<br/>"
                    "3. Dispatch: Goods dispatched within 24-48 business hours upon payment confirmation.<br/>"
                    "4. Jurisdictional: All disputes subject to Siliguri / Darjeeling jurisdiction only.",
                    terms_style,
                ),
                Paragraph(
                    f"For <b>{cls.SELLER_NAME}</b><br/><br/><br/>"
                    "<b>Authorized Signatory</b><br/>"
                    "Commercial Operations Desk",
                    ParagraphStyle(
                        "Signatory",
                        parent=terms_style,
                        alignment=2,
                    ),
                ),
            ]
        ]
        terms_table = Table(terms_data, colWidths=[350, 173])
        terms_table.setStyle(
            TableStyle(
                [
                    ("VALIGN", (0, 0), (-1, -1), "TOP"),
                    ("TOPPADDING", (0, 0), (-1, -1), 2),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
                ]
            )
        )
        elements.append(KeepTogether(terms_table))

        # Build document
        doc.build(elements)
        logger.info(f"Successfully generated pro-forma invoice PDF at: {output_path}")

        return os.path.abspath(output_path)
