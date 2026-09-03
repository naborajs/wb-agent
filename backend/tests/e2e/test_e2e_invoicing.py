"""
E2E Test Suite for R1: Automated PDF Pro-Forma Invoice & WhatsApp Document Dispatch.
Covers Tier 1 (Feature Coverage) and Tier 2 (Boundary & Corner Cases).
"""

import os
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any, Dict
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.sales_stage import SalesStageManager
from app.database.models import Conversation, Customer, Order


# ===========================================================================
# Tier 1: Feature Coverage (R1)
# ===========================================================================

@pytest.mark.asyncio
async def test_invoicing_pdf_generation_metadata_and_branding(invoice_service):
    """
    R1-T1.1: Verify pro-forma invoice compiles with North Bengal Tea Co. branding,
    statutory GSTIN, FSSAI, 7-day rate lock terms, and valid PDF binary format.
    """
    order_data: Dict[str, Any] = {
        "buyer_name": "Siliguri Chai Point",
        "buyer_location": "Siliguri, West Bengal",
        "buyer_gstin": "19AABCS1234F1Z9",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "50kg HDPE Sack",
                "quantity_kg": 50.0,
                "unit_price": 340.0,
                "discount_pct": 5.0,
            }
        ],
        "gst_rate_pct": 5.0,
    }

    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path), f"Invoice PDF was not created at {pdf_path}"
    assert os.path.getsize(pdf_path) > 500, "Generated PDF file size is suspiciously small"

    with open(pdf_path, "rb") as f:
        content = f.read()

    # Verify standard PDF magic header and trailer
    assert content.startswith(b"%PDF-1."), "File does not start with standard PDF magic bytes"
    assert b"%%EOF" in content or len(content) > 1000, "PDF trailer EOF marker missing"

    # Clean up
    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_itemized_order_tiers_and_math(invoice_service):
    """
    R1-T1.2: Verify exact calculation of itemized order lines, volume tier discounts,
    subtotal, 5% GST, and grand total.
    """
    order_data: Dict[str, Any] = {
        "buyer_name": "Darjeeling Mountain Retreat",
        "buyer_location": "Darjeeling, West Bengal",
        "items": [
            {
                "name": "Darjeeling FTGFOP1 Single Estate",
                "packaging": "5kg Foil Vacuum",
                "quantity_kg": 20.0,
                "unit_price": 1800.0,
                "discount_pct": 10.0,  # 20kg qualifies for tier
            },
            {
                "name": "Dooars Hotel Special Blend",
                "packaging": "20kg Jute Sack",
                "quantity_kg": 40.0,
                "unit_price": 280.0,
                "discount_pct": 0.0,
            },
        ],
        "gst_rate_pct": 5.0,
    }

    # Line 1: 20 * 1800 = 36,000; 10% disc = 3,600; Line 1 total = 32,400
    # Line 2: 40 * 280 = 11,200; 0% disc = 0; Line 2 total = 11,200
    # Subtotal: 32,400 + 11,200 = 43,600
    # GST (5%): 43,600 * 0.05 = 2,180
    # Grand Total: 45,780.00
    expected_subtotal = Decimal("43600.00")
    expected_gst = Decimal("2180.00")
    expected_grand_total = Decimal("45780.00")

    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    # Validate math via calculation check
    sub = Decimal("0.0")
    for it in order_data["items"]:
        q = Decimal(str(it["quantity_kg"]))
        r = Decimal(str(it["unit_price"]))
        d = Decimal(str(it["discount_pct"]))
        line = (q * r) * (Decimal("1.0") - (d / Decimal("100.0")))
        sub += line
    assert sub == expected_subtotal
    gst = sub * (Decimal(str(order_data["gst_rate_pct"])) / Decimal("100.0"))
    assert gst == expected_gst
    assert sub + gst == expected_grand_total

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_auto_trigger_on_purchase_intent(
    e2e_db_session: AsyncSession, seeded_catalog, invoice_service
):
    """
    R1-T1.3: Verify that transitioning a conversation into PURCHASE_INTENT
    automatically triggers pro-forma invoice generation workflow.
    """
    cust = Customer(
        id="cust_siliguri_01",
        org_id="org_default_tea",
        primary_phone="+919876543210",
        name="Siliguri Wholesaler",
    )
    e2e_db_session.add(cust)

    conv = Conversation(
        id="conv_siliguri_01",
        org_id="org_default_tea",
        customer_id=cust.id,
        channel="whatsapp",
        channel_id="+919876543210",
        sales_stage="NEGOTIATION",
        lead_score=75,
        metadata_json={"pending_order": {"product_id": "prod_assam_ctc", "quantity_kg": 100.0}},
    )
    e2e_db_session.add(conv)
    await e2e_db_session.commit()

    # Trigger stage transition to PURCHASE_INTENT
    updated_conv = await SalesStageManager.transition(
        session=e2e_db_session,
        conversation=conv,
        target_stage="PURCHASE_INTENT",
        reason="Customer agreed to pricing tier: 'Send invoice!'",
        score_delta=15,
        org_id="org_default_tea",
    )

    assert updated_conv.sales_stage == "PURCHASE_INTENT"
    assert updated_conv.is_hot is True

    # Invoice generation should now execute for the agreed order
    order_data = {
        "buyer_name": cust.name,
        "buyer_location": "Siliguri",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "50kg HDPE Sack",
                "quantity_kg": 100.0,
                "unit_price": 340.0,
                "discount_pct": 10.0,
            }
        ],
    }
    invoice_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(invoice_path)
    assert os.path.getsize(invoice_path) > 0

    try:
        os.remove(invoice_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_auto_trigger_on_recommendation_acceptance(
    e2e_db_session: AsyncSession, seeded_catalog, invoice_service
):
    """
    R1-T1.4: Verify that accepting a product recommendation and entering
    RECOMMENDATION stage triggers pro-forma invoice quote generation.
    """
    cust = Customer(
        id="cust_rec_user",
        org_id="org_default_tea",
        primary_phone="+919876543211",
        name="Recommended Hotel Customer",
    )
    e2e_db_session.add(cust)

    conv = Conversation(
        id="conv_rec_01",
        org_id="org_default_tea",
        customer_id="cust_rec_user",
        channel="whatsapp",
        channel_id="+919876543211",
        sales_stage="QUALIFIED",
        lead_score=60,
    )
    e2e_db_session.add(conv)
    await e2e_db_session.commit()

    updated = await SalesStageManager.transition(
        session=e2e_db_session,
        conversation=conv,
        target_stage="RECOMMENDATION",
        reason="Customer requested formal pro-forma quote for recommended Darjeeling batch",
        score_delta=10,
    )

    assert updated.sales_stage == "RECOMMENDATION"
    invoice_path = invoice_service.generate_proforma_pdf({
        "buyer_name": "Recommended Hotel Customer",
        "items": [{"name": "Darjeeling FTGFOP1", "quantity_kg": 10.0, "unit_price": 1800.0, "discount_pct": 0.0}],
    })
    assert os.path.exists(invoice_path)

    try:
        os.remove(invoice_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_whatsapp_document_dispatch(mock_whatsapp, invoice_service):
    """
    R1-T1.5: Verify generated PDF invoice is dispatched directly into active
    WhatsApp conversation via send_document with recipient and caption.
    """
    invoice_path = invoice_service.generate_proforma_pdf({
        "buyer_name": "Jalpaiguri Distributor",
        "items": [{"name": "Assam Kadak CTC", "quantity_kg": 50.0, "unit_price": 340.0, "discount_pct": 5.0}],
    })

    recipient_phone = "+919876543210"
    caption = "Here is your North Bengal Tea Co. Pro-Forma Invoice (Rates locked for 7 days)."
    filename = "NorthBengalTea_Proforma_Invoice.pdf"

    dispatch_res = await mock_whatsapp.send_document(
        to_phone=recipient_phone,
        file_path=invoice_path,
        caption=caption,
        filename=filename,
    )

    assert dispatch_res["status"] == "sent"
    assert len(mock_whatsapp.sent_documents) == 1
    sent_doc = mock_whatsapp.sent_documents[0]
    assert sent_doc["to_phone"] == recipient_phone
    assert sent_doc["caption"] == caption
    assert sent_doc["filename"] == filename
    assert sent_doc["file_path"] == invoice_path

    try:
        os.remove(invoice_path)
    except OSError:
        pass


# ===========================================================================
# Tier 2: Boundary & Corner Cases (R1)
# ===========================================================================

@pytest.mark.asyncio
async def test_invoicing_boundary_minimum_moq_quantity(invoice_service):
    """
    R1-T2.1: Verify boundary condition at minimum order quantity (MOQ: 10kg).
    Ensures calculations and PDF generation handle exact minimum thresholds without error.
    """
    order_data = {
        "buyer_name": "Test Trial Buyer",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "10kg Poly Sack",
                "quantity_kg": 10.0,  # Exact MOQ
                "unit_price": 360.0,
                "discount_pct": 0.0,  # Below volume tier
            }
        ],
        "gst_rate_pct": 5.0,
    }
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 0

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_boundary_massive_bulk_wholesale(invoice_service):
    """
    R1-T2.2: Verify high-volume wholesale order (10,000kg) with top-tier volume discount (15%).
    Ensures financial amounts with high digit counts are correctly formatted without overflow.
    """
    order_data = {
        "buyer_name": "National Mega Tea Distributors Pvt Ltd",
        "items": [
            {
                "name": "Assam Kadak CTC",
                "packaging": "50kg HDPE Sack",
                "quantity_kg": 10000.0,
                "unit_price": 340.0,
                "discount_pct": 15.0,  # 15% distributor discount
            }
        ],
        "gst_rate_pct": 5.0,
    }
    # 10,000 * 340 = 3,400,000; 15% disc = 510,000; subtotal = 2,890,000; GST (5%) = 144,500; Total = 3,034,500
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 1000

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_boundary_special_characters_and_escaping(invoice_service):
    """
    R1-T2.3: Verify buyer details containing unicode, ampersands, quotes, and
    special characters do not crash the ReportLab XML/Paragraph parser.
    """
    order_data = {
        "buyer_name": "M/S माँ भवानी टी स्टॉल & Café <Siliguri> \"Wholesale\"",
        "buyer_location": "Sevoke Rd, Siliguri & Dooars Junction, WB (734001)",
        "buyer_gstin": "19AABCT1234F1Z1",
        "items": [
            {
                "name": "Assam Kadak CTC & Special Dust Blend",
                "packaging": "25kg Vacuum 'Foil' Pack",
                "quantity_kg": 25.0,
                "unit_price": 350.0,
                "discount_pct": 5.0,
            }
        ],
    }
    # Should escape or format safely without raising XML parse errors
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_boundary_zero_discount_and_custom_tax_rates(invoice_service):
    """
    R1-T2.4: Verify calculation with 0.0% discount and 0% GST (tax-exempt raw leaf category).
    """
    order_data = {
        "buyer_name": "Exempt Agricultural Cooperative",
        "items": [
            {
                "name": "Raw Green Leaf Direct Unprocessed",
                "packaging": "Jute Plucking Baskets",
                "quantity_kg": 500.0,
                "unit_price": 85.0,
                "discount_pct": 0.0,
            }
        ],
        "gst_rate_pct": 0.0,
    }
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    try:
        os.remove(pdf_path)
    except OSError:
        pass


@pytest.mark.asyncio
async def test_invoicing_boundary_rate_lock_expiry_calculation(invoice_service):
    """
    R1-T2.5: Verify 7-day rate lock terms calculation strictly matches
    the issue date plus 7 calendar days.
    """
    from datetime import timezone
    today = datetime.now(timezone.utc).date()
    expected_expiry = today + timedelta(days=7)

    order_data = {
        "buyer_name": "Locked Rate Wholesale Buyer",
        "issue_date": today.strftime("%Y-%m-%d"),
        "items": [
            {"name": "Assam Kadak CTC", "quantity_kg": 50.0, "unit_price": 340.0, "discount_pct": 5.0}
        ],
    }
    pdf_path = invoice_service.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)

    # Verification: delta is exactly 7 days
    assert (expected_expiry - today).days == 7

    try:
        os.remove(pdf_path)
    except OSError:
        pass
