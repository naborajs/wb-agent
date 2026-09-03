"""
Unit and integration tests for Milestone 1:
Requirement R1 - Automated PDF Pro-Forma Invoice & WhatsApp Dispatch.

Verifies:
1. ReportLab vector PDF generation matching catalog pricing, volume tiers,
   statutory compliance (GSTIN, FSSAI), packaging specs, 7-day rate lock terms, and bank details.
2. Volume tier discount calculations (50kg+: 5%, 100kg+: 10%, 500kg+: 15%).
3. Automatic compilation and WhatsApp document dispatch triggered at PURCHASE_INTENT and RECOMMENDATION.
4. WhatsAppProvider send_document delivery confirmation across simulator, bridge, and Meta Cloud.
5. Invoices API endpoints (generate, download, quote pdf, quote whatsapp dispatch).
"""

from decimal import Decimal
import os
from pathlib import Path
from unittest.mock import AsyncMock, patch
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agent.orchestrator import AgentOrchestrator
from app.config import settings
from app.database.base import Base
from app.database.models import Conversation, Customer, Organization, Product, ProductVariant, PricingRule, Quote, QuoteItem
from app.database.session import get_db
from app.main import app
from app.services.invoice_generator import InvoiceGenerator
from app.whatsapp.models import OutboundWhatsAppResult
from app.whatsapp.providers.bridge import BridgeWhatsAppProvider
from app.whatsapp.providers.meta_cloud import MetaCloudWhatsAppProvider
from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider
from app.whatsapp.service import WhatsAppService


@pytest.fixture
def temp_invoice_storage(tmp_path):
    """Overrides storage base path with temporary directory for isolated test generation."""
    old_base = settings.STORAGE_BASE_PATH
    settings.STORAGE_BASE_PATH = str(tmp_path / "storage")
    yield str(tmp_path / "storage")
    settings.STORAGE_BASE_PATH = old_base


@pytest.fixture
async def setup_invoice_db(temp_invoice_storage):
    """Sets up an in-memory SQLite database with sample customer and products."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_m1_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="North Bengal Tea Co.", slug="north-bengal-tea")
        session.add(org)

        customer = Customer(
            id="cust_m1_101",
            org_id=org_id,
            primary_phone="+919832012345",
            name="Vikram Chatterjee",
            company_name="Darjeeling Boutique Cafe",
            company_type="Cafe",
            city="Siliguri",
            state="West Bengal",
            preferred_language="English",
            opt_in_status=True,
            custom_attributes={"gstin": "19AABCV9999F1Z9"},
        )
        session.add(customer)

        conv = Conversation(
            id="conv_m1_101",
            org_id=org_id,
            customer_id=customer.id,
            channel="whatsapp",
            channel_id="+919832012345",
            mode="AI",
            sales_stage="DISCOVERY",
            lead_score=35,
        )
        session.add(conv)

        # Catalog product
        prod_assam = Product(
            id="prod_assam_ctc",
            org_id=org_id,
            sku="NBT-ASSAM-CTC",
            name="Assam Kadak CTC Granules",
            category="Assam CTC",
            tea_grade="BP",
            origin="Upper Assam",
            min_order_quantity_kg=Decimal("25.0"),
            in_stock=True,
        )
        session.add(prod_assam)

        var_assam_30 = ProductVariant(
            id="var_assam_30kg",
            product_id=prod_assam.id,
            sku="NBT-ASSAM-CTC-30KG",
            name="30kg Master Bag",
            packaging_type="sack",
            weight_kg=Decimal("30.0"),
            base_price_per_kg=Decimal("340.00"),
        )
        session.add(var_assam_30)

        rule_50 = PricingRule(
            org_id=org_id,
            rule_name="Tier 1: 50kg+ Volume Discount",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("50.0"),
            max_quantity_kg=Decimal("99.99"),
            discount_percentage=Decimal("5.0"),
            is_active=True,
        )
        rule_100 = PricingRule(
            org_id=org_id,
            rule_name="Tier 2: 100kg+ Commercial Volume Discount",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("100.0"),
            max_quantity_kg=Decimal("499.99"),
            discount_percentage=Decimal("10.0"),
            is_active=True,
        )
        rule_500 = PricingRule(
            org_id=org_id,
            rule_name="Tier 3: 500kg+ Wholesale Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("500.0"),
            max_quantity_kg=None,
            discount_percentage=Decimal("15.0"),
            is_active=True,
        )
        session.add_all([rule_50, rule_100, rule_500])
        await session.commit()

    async def get_test_db():
        async with session_factory() as s:
            yield s

    app.dependency_overrides[get_db] = get_test_db
    yield session_factory, org_id, "conv_m1_101", "cust_m1_101"
    app.dependency_overrides.clear()
    await engine.dispose()


def test_volume_tier_discount_rules():
    """Verifies statutory volume discount calculation logic."""
    assert InvoiceGenerator.calculate_volume_discount_pct(25.0) == 0.0
    assert InvoiceGenerator.calculate_volume_discount_pct(49.9) == 0.0
    assert InvoiceGenerator.calculate_volume_discount_pct(50.0) == 5.0
    assert InvoiceGenerator.calculate_volume_discount_pct(75.0) == 5.0
    assert InvoiceGenerator.calculate_volume_discount_pct(99.99) == 5.0
    assert InvoiceGenerator.calculate_volume_discount_pct(100.0) == 10.0
    assert InvoiceGenerator.calculate_volume_discount_pct(250.0) == 10.0
    assert InvoiceGenerator.calculate_volume_discount_pct(499.9) == 10.0
    assert InvoiceGenerator.calculate_volume_discount_pct(500.0) == 15.0
    assert InvoiceGenerator.calculate_volume_discount_pct(1000.0) == 15.0


def test_pdf_invoice_generation_content_and_branding(temp_invoice_storage):
    """
    Verifies that generated vector PDF has all statutory, branding,
    rate lock, buyer, seller, and banking details.
    """
    order_data = {
        "invoice_number": "PI-260904-TEST01",
        "buyer_name": "Vikram Chatterjee",
        "buyer_phone": "+91 98320 12345",
        "buyer_company": "Darjeeling Boutique Cafe",
        "delivery_city": "Siliguri",
        "delivery_state": "West Bengal",
        "buyer_gstin": "19AABCV9999F1Z9",
        "items": [
            {
                "product_name": "Assam Kadak CTC Granules",
                "tea_grade": "BP",
                "quantity_kg": 100.0,
                "unit_price": 340.0,
                "discount_pct": 10.0,
                "packaging_type": "50kg multi-wall paper sacks with food-grade liner",
            }
        ],
    }

    pdf_path = InvoiceGenerator.generate_proforma_pdf(order_data)
    assert os.path.exists(pdf_path)
    assert os.path.getsize(pdf_path) > 0

    with open(pdf_path, "rb") as f:
        pdf_bytes = f.read()

    # Valid non-corrupt PDF header
    assert pdf_bytes.startswith(b"%PDF-")

    # Statutory details
    assert b"North Bengal Tea Co." in pdf_bytes
    assert b"19AABCN1234F1Z5" in pdf_bytes  # Seller GSTIN
    assert b"12821019000123" in pdf_bytes   # Seller FSSAI
    assert b"Siliguri" in pdf_bytes
    assert b"West Bengal" in pdf_bytes

    # Buyer details
    assert b"Vikram Chatterjee" in pdf_bytes
    assert b"Darjeeling Boutique Cafe" in pdf_bytes
    assert b"19AABCV9999F1Z9" in pdf_bytes

    # Rate lock terms
    assert b"Rate locked for 7 days" in pdf_bytes
    assert b"Subject to North Bengal Tea Co. standard trading terms." in pdf_bytes

    # Payment Instructions
    assert b"State Bank of India" in pdf_bytes
    assert b"38472910543" in pdf_bytes
    assert b"SBIN0001234" in pdf_bytes

    # Packaging spec
    assert b"multi-wall paper sacks" in pdf_bytes
    assert b"food-grade liner" in pdf_bytes


@pytest.mark.asyncio
async def test_orchestrator_triggers_invoice_and_whatsapp_at_purchase_intent(setup_invoice_db):
    """
    Verifies that when a conversation reaches PURCHASE_INTENT,
    an invoice PDF is compiled and dispatched via WhatsApp.
    """
    session_factory, org_id, conv_id, cust_id = setup_invoice_db

    sim_wa = SimulatorWhatsAppProvider()
    sim_wa.outbox.clear()

    with patch("app.whatsapp.service.WhatsAppService.get_provider", return_value=sim_wa):
        async with session_factory() as session:
            orchestrator = AgentOrchestrator(session, org_id)
            response = await orchestrator.process_turn(
                conversation_id=conv_id,
                inbound_message="Yes, we are ready to proceed. Send invoice for 100kg Assam CTC to our Siliguri cafe.",
                sender_id=cust_id,
            )

            # Stage must transition to PURCHASE_INTENT
            assert response.sales_stage_after == "PURCHASE_INTENT"
            assert response.handoff_created is True

            # Invoice PDF must be compiled
            assert response.invoice_pdf_path is not None
            assert os.path.exists(response.invoice_pdf_path)

            # Document message must be dispatched via WhatsApp
            doc_messages = [msg for msg in sim_wa.outbox if msg.get("type") == "document"]
            assert len(doc_messages) == 1
            doc_msg = doc_messages[0]
            assert doc_msg["to"] == "+919832012345"
            assert doc_msg["filename"].endswith(".pdf")
            assert "PI-" in doc_msg["filename"] or "Proforma_Invoice" in doc_msg["filename"]
            assert "Rate locked for 7 days" in doc_msg["caption"]


@pytest.mark.asyncio
async def test_orchestrator_triggers_invoice_at_recommendation(setup_invoice_db):
    """
    Verifies that when a conversation enters RECOMMENDATION stage,
    a pro-forma invoice PDF quote is automatically compiled for the buyer.
    """
    session_factory, org_id, conv_id, cust_id = setup_invoice_db

    sim_wa = SimulatorWhatsAppProvider()
    sim_wa.outbox.clear()

    with patch("app.whatsapp.service.WhatsAppService.get_provider", return_value=sim_wa):
        async with session_factory() as session:
            # Pre-set stage to QUALIFIED so next step can recommend
            conv = await session.get(Conversation, conv_id)
            conv.sales_stage = "QUALIFIED"
            await session.commit()

            orchestrator = AgentOrchestrator(session, org_id)
            response = await orchestrator.process_turn(
                conversation_id=conv_id,
                inbound_message="Can you recommend a strong CTC tea for our milk tea service at our Siliguri hotel? We need 50kg.",
                sender_id=cust_id,
            )

            # Stage should transition to RECOMMENDATION
            assert response.sales_stage_after == "RECOMMENDATION"
            assert response.invoice_pdf_path is not None
            assert os.path.exists(response.invoice_pdf_path)

            # Check WhatsApp outbox had document dispatched
            doc_msgs = [m for m in sim_wa.outbox if m.get("type") == "document"]
            assert len(doc_msgs) == 1


@pytest.mark.asyncio
async def test_whatsapp_provider_send_document_implementations(tmp_path):
    """
    Verifies send_document across Simulator, Bridge, and Meta Cloud providers.
    """
    # 1. Simulator Provider
    sim = SimulatorWhatsAppProvider()
    dummy_pdf = tmp_path / "test.pdf"
    dummy_pdf.write_text("%PDF-1.4 dummy")

    res_sim = await sim.send_document(
        to_phone="+919800011111",
        file_path=str(dummy_pdf),
        caption="Commercial Quote",
        filename="test_quote.pdf",
    )
    assert res_sim.success is True
    assert res_sim.provider_message_id is not None
    assert len(sim.outbox) == 1
    assert sim.outbox[0]["filename"] == "test_quote.pdf"

    # Test simulator simulated failure
    sim.fail_next_send = True
    res_fail = await sim.send_document("+919800011111", str(dummy_pdf))
    assert res_fail.success is False
    assert "timeout" in res_fail.error_message.lower()

    # 2. Bridge Provider (mocked HTTP dispatch)
    bridge = BridgeWhatsAppProvider(bridge_url="http://localhost:3001")
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: {"success": True, "messageId": "baileys_doc_123"},
        )
        res_bridge = await bridge.send_document(
            to_phone="+919800011111",
            file_path=str(dummy_pdf),
            caption="Bridge Quote",
            filename="bridge_quote.pdf",
        )
        assert res_bridge.success is True
        assert res_bridge.provider_message_id == "baileys_doc_123"

    # 3. Meta Cloud Provider (mocked HTTP dispatch)
    meta = MetaCloudWhatsAppProvider(
        phone_number_id="123456",
        access_token="mock_token",
        verify_token="mock_verify",
    )
    with patch("httpx.AsyncClient.post") as mock_meta_post:
        mock_meta_post.return_value = AsyncMock(
            status_code=200,
            json=lambda: {"messages": [{"id": "wamid_meta_doc_456"}]},
        )
        res_meta = await meta.send_document(
            to_phone="+919800011111",
            file_path=str(dummy_pdf),
            caption="Meta Cloud Quote",
            filename="meta_quote.pdf",
        )
        assert res_meta.success is True
        assert res_meta.provider_message_id == "wamid_meta_doc_456"


@pytest.mark.asyncio
async def test_invoices_api_routes(setup_invoice_db):
    """
    Tests /api/v1/invoices endpoints: /generate, /download, /quotes/{id}/pdf, /quotes/{id}/send-whatsapp.
    """
    session_factory, org_id, conv_id, cust_id = setup_invoice_db

    # Create a Quote record in DB to test quote routes
    quote_id = "quote_test_m1"
    async with session_factory() as session:
        quote = Quote(
            id=quote_id,
            org_id=org_id,
            quote_number="QTE-260904-777",
            customer_id=cust_id,
            total_amount=Decimal("30600.00"),
            discount_amount=Decimal("3400.00"),
            status="draft",
        )
        session.add(quote)
        q_item = QuoteItem(
            quote_id=quote_id,
            product_id="prod_assam_ctc",
            product_name="Assam Kadak CTC Granules",
            quantity=Decimal("100.00"),
            unit_price=Decimal("340.00"),
            discount_pct=10.0,
            subtotal=Decimal("30600.00"),
        )
        session.add(q_item)
        await session.commit()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Generate endpoint
        gen_resp = await client.post(
            "/api/v1/invoices/generate",
            json={
                "customer_name": "Rajiv Cafe",
                "customer_phone": "+91 98000 12345",
                "delivery_city": "Kolkata",
                "items": [
                    {
                        "product_name": "Assam Kadak CTC Granules",
                        "quantity_kg": 50.0,
                        "unit_price": 340.0,
                    }
                ],
            },
        )
        assert gen_resp.status_code == 200
        gen_data = gen_resp.json()
        assert gen_data["success"] is True
        assert "download_url" in gen_data
        filename = gen_data["filename"]

        # 2. Download endpoint
        dl_resp = await client.get(f"/api/v1/invoices/download?file={filename}")
        assert dl_resp.status_code == 200
        assert dl_resp.headers["content-type"] == "application/pdf"
        assert dl_resp.content.startswith(b"%PDF-")

        # 3. Compile Quote PDF
        q_pdf_resp = await client.post(f"/api/v1/invoices/quotes/{quote_id}/pdf")
        assert q_pdf_resp.status_code == 200
        q_pdf_data = q_pdf_resp.json()
        assert q_pdf_data["quote_number"] == "QTE-260904-777"
        assert os.path.exists(q_pdf_data["file_path"])

        # 4. Dispatch Quote via WhatsApp
        sim_wa = SimulatorWhatsAppProvider()
        with patch("app.whatsapp.service.WhatsAppService.get_provider", return_value=sim_wa):
            q_wa_resp = await client.post(
                f"/api/v1/invoices/quotes/{quote_id}/send-whatsapp",
                params={"phone_number": "+919832012345"},
            )
            assert q_wa_resp.status_code == 200
            q_wa_data = q_wa_resp.json()
            assert q_wa_data["success"] is True
            assert len(sim_wa.outbox) == 1
            assert sim_wa.outbox[0]["type"] == "document"
