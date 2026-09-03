"""
Unit and integration test suite for EDITH v2 features:
- Wholesale Orders API & line-item calculation
- Custom B2B Proposals & 24-48h zero-cost check-ins
- Self-Reflective Critic & pre-send refinement
- Owner WhatsApp Interactive Commands (+91 89006 53250)
"""

from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.agent.critic import SelfReflectiveCritic
from app.config import settings
from app.database.base import Base
from app.database.models import Customer, Lead, Organization, Product, ProductVariant
from app.database.session import get_db
from app.leads.proposal_generator import ProposalGenerator
from app.main import app
from app.whatsapp.owner_commands import OwnerCommandHandler


@pytest.fixture
async def app_client():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed Organization and Products
    async with test_session_factory() as session:
        org = Organization(id=settings.DEFAULT_ORG_ID, name="North Bengal Tea Co.", slug="north-bengal-tea")
        session.add(org)

        p1 = Product(
            id="prod_assam_ctc",
            org_id=settings.DEFAULT_ORG_ID,
            sku="NBT-CTC-01",
            name="Assam Kadak CTC",
            category="Assam CTC",
            tea_grade="BP",
            min_order_quantity_kg=Decimal("20.0"),
            in_stock=True,
        )
        session.add(p1)

        p2 = Product(
            id="prod_dooars_blend",
            org_id=settings.DEFAULT_ORG_ID,
            sku="NBT-DOO-01",
            name="Dooars Hotel Blend",
            category="Dooars",
            tea_grade="BOP",
            min_order_quantity_kg=Decimal("20.0"),
            in_stock=True,
        )
        session.add(p2)
        await session.commit()

    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, test_session_factory

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_order_creation_and_calculation(app_client):
    """
    Tests creating a wholesale order with multiple line items, discount calculation, and status update.
    """
    client, session_factory = app_client

    # 1. Create Customer in DB
    async with session_factory() as session:
        customer = Customer(
            org_id=settings.DEFAULT_ORG_ID,
            name="Sunil Agarwal",
            company_name="Darjeeling Chai Lounge",
            company_type="Cafe",
            primary_phone="+919830012345",
            city="Siliguri",
            state="West Bengal",
            opt_in_status=True,
        )
        session.add(customer)
        await session.commit()
        await session.refresh(customer)
        customer_id = customer.id

    # 2. Submit Order via API
    order_payload = {
        "customer_id": customer_id,
        "shipping_name": "Sunil Agarwal",
        "shipping_phone": "+919830012345",
        "shipping_city": "Siliguri",
        "shipping_address": "Hill Cart Road, Siliguri",
        "payment_terms": "Standard Wholesale (100% on Dispatch)",
        "notes": "Urgent delivery required before weekend.",
        "items": [
            {
                "product_id": "prod_assam_ctc",
                "product_name": "Assam Kadak CTC",
                "tea_grade": "BP",
                "packaging_type": "Jute Bag (20kg)",
                "quantity_kg": 50.0,
                "unit_price_per_kg": 340.0,
                "discount_pct": 5.0,  # 5% volume discount
            },
            {
                "product_id": "prod_dooars_blend",
                "product_name": "Dooars Hotel Blend",
                "tea_grade": "BOP",
                "packaging_type": "Jute Bag (20kg)",
                "quantity_kg": 20.0,
                "unit_price_per_kg": 230.0,
                "discount_pct": 0.0,
            },
        ],
    }

    # Calculation expected:
    # Item 1: 50 * 340 = 17,000 - 5% (850) = 16,150
    # Item 2: 20 * 230 = 4,600
    # Total: 16,150 + 4,600 = 20,750
    res = await client.post("/api/v1/orders", json=order_payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["status"] == "created"
    assert data["total_amount"] == 20750.0

    order_id = data["order_id"]

    # 3. Retrieve Order list
    list_res = await client.get("/api/v1/orders")
    assert list_res.status_code == 200
    orders = list_res.json()["orders"]
    assert len(orders) >= 1
    found = next(o for o in orders if o["id"] == order_id)
    assert found["total_amount"] == 20750.0
    assert found["items_count"] == 2

    # 4. Patch Order Status to Invoiced
    patch_res = await client.patch(f"/api/v1/orders/{order_id}", json={"status": "invoiced"})
    assert patch_res.status_code == 200
    assert patch_res.json()["order_status"] == "invoiced"


@pytest.mark.asyncio
async def test_custom_proposal_generation():
    """
    Tests tailored proposal crafting for different business types and zero-cost check-ins.
    """
    cafe_lead = Lead(
        name="Bikash Roy",
        first_name="Bikash",
        company_name="Chai Junction",
        company_type="Cafe",
        city="Siliguri",
        phone="+919876543210",
        product_interest="Assam Kadak CTC",
    )
    bundle_cafe = ProposalGenerator.craft_proposal(cafe_lead)
    assert "Chai Junction" in bundle_cafe["proposal_text"]
    assert "Assam Kadak CTC" in bundle_cafe["proposal_text"]
    assert "200g commercial tasting kit" in bundle_cafe["proposal_text"]
    assert "zero cost" in bundle_cafe["followup_text"].lower()

    hotel_lead = Lead(
        name="Deepak Mittal",
        first_name="Deepak",
        company_name="Royal Heritage Resort",
        company_type="Hotel",
        city="Kolkata",
        phone="+919876543211",
        product_interest="Darjeeling First Flush",
    )
    bundle_hotel = ProposalGenerator.craft_proposal(hotel_lead)
    assert "Royal Heritage Resort" in bundle_hotel["proposal_text"]
    assert "Darjeeling whole leaf" in bundle_hotel["proposal_text"]


@pytest.mark.asyncio
async def test_self_reflective_critic():
    """
    Tests pre-send critique detection of aggressive claims and automatic refinement.
    """
    bad_draft = "We promise zero damage and 1-day delivery. Buy now or miss this rate!"
    passes, defects = SelfReflectiveCritic.evaluate(bad_draft)
    assert not passes
    assert "no_hallucinated_delivery" in defects

    refined = SelfReflectiveCritic.critique_and_refine(bad_draft)
    assert "zero damage" not in refined.lower()
    assert "moisture barriers" in refined.lower()

    good_draft = (
        "Thank you for contacting North Bengal Tea Co. Our Assam Kadak CTC is ₹306/kg for 100kg orders. "
        "Would you like us to dispatch a 200g tasting kit to test with your cafe milk blend?"
    )
    g_passes, g_defects = SelfReflectiveCritic.evaluate(good_draft)
    assert g_passes
    assert len(g_defects) == 0


@pytest.mark.asyncio
async def test_owner_commands(app_client):
    """
    Tests interactive WhatsApp owner commands: HELP, STATUS, HOT LEADS.
    """
    client, session_factory = app_client
    owner_phone = "+918900653250"
    org_id = settings.DEFAULT_ORG_ID

    async with session_factory() as session:
        # 1. HELP command
        help_reply = await OwnerCommandHandler.process_command(owner_phone, "HELP", session, org_id)
        assert "👑" in help_reply
        assert "STATUS" in help_reply
        assert "HOT LEADS" in help_reply

        # 2. STATUS command
        status_reply = await OwnerCommandHandler.process_command(owner_phone, "STATUS", session, org_id)
        assert "📊" in status_reply
        assert "Total Pipeline Leads" in status_reply

        # 3. Non-owner message returns None (passed through to normal chat)
        non_owner_res = await OwnerCommandHandler.process_command("+919999999999", "STATUS", session, org_id)
        assert non_owner_res is None
