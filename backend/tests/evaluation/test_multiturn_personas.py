"""
Multi-turn Buyer Persona Simulation and Evaluation Suite (Section 86 & 87).
"""

from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, Customer, Conversation, Product, ProductVariant, PricingRule, Handoff
from app.agent.orchestrator import AgentOrchestrator


@pytest.fixture
async def simulation_env():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_sim_eval"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Sim Org", slug="sim-org")
        session.add(org)

        # Products
        darj = Product(
            id="p_darj",
            org_id=org_id,
            sku="NBT-DARJ-FF",
            name="Darjeeling Spring First Flush",
            category="Darjeeling",
            min_order_quantity_kg=Decimal("10.0"),
            in_stock=True,
        )
        ctc = Product(
            id="p_ctc",
            org_id=org_id,
            sku="NBT-ASSAM-CTC",
            name="Assam Kadak CTC",
            category="Assam CTC",
            min_order_quantity_kg=Decimal("25.0"),
            in_stock=True,
        )
        session.add_all([darj, ctc])

        v_darj = ProductVariant(
            id="v_d1",
            product_id="p_darj",
            sku="NBT-DARJ-FF-20KG",
            name="20kg Chest",
            packaging_type="chest",
            weight_kg=Decimal("20.0"),
            base_price_per_kg=Decimal("1450.00"),
        )
        v_ctc = ProductVariant(
            id="v_c1",
            product_id="p_ctc",
            sku="NBT-ASSAM-CTC-30KG",
            name="30kg Sack",
            packaging_type="sack",
            weight_kg=Decimal("30.0"),
            base_price_per_kg=Decimal("340.00"),
        )
        session.add_all([v_darj, v_ctc])

        # Pricing rules
        rule = PricingRule(
            id="r_vol_100",
            org_id=org_id,
            product_id="p_ctc",
            rule_name="100kg Commercial Volume Discount",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("100.0"),
            discount_percentage=Decimal("10.0"),
            max_autonomous_discount_percentage=Decimal("7.5"),
        )
        session.add(rule)
        await session.commit()

    async with session_factory() as session:
        yield session, org_id

    await engine.dispose()


@pytest.mark.asyncio
async def test_persona_boutique_cafe_owner(simulation_env):
    """
    Simulates boutique café buyer inquiring about Darjeeling First Flush,
    requesting sample tasting kits, and moving forward.
    """
    session, org_id = simulation_env

    # 1. Create customer & conversation
    cust = Customer(
        org_id=org_id,
        primary_phone="+919876543211",
        name="Sunita Rao",
        company_name="Aura Artisanal Cafe, Bangalore",
        company_type="Cafe",
        opt_in_status=True,
    )
    session.add(cust)
    await session.commit()

    conv = Conversation(
        org_id=org_id,
        customer_id=cust.id,
        channel="whatsapp",
        channel_id=cust.primary_phone,
        mode="AI",
        sales_stage="NEW",
        lead_score=10,
    )
    session.add(conv)
    await session.commit()

    orchestrator = AgentOrchestrator(session, org_id)

    # Turn 1: Opening discovery
    t1 = await orchestrator.process_turn(conv.id, "Hi, we operate a specialty cafe and want whole leaf Darjeeling tea.")
    assert t1.sales_stage_after == "DISCOVERY"
    assert t1.lead_score_after > 10

    # Turn 2: Sample request
    t2 = await orchestrator.process_turn(conv.id, "Can you provide sample packs before we commit to bulk orders?")
    assert "sample" in t2.reply_text.lower()
    assert t2.lead_score_after > t1.lead_score_after

    # Turn 3: Ready to order samples
    t3 = await orchestrator.process_turn(conv.id, "Yes please, let's place the order for the tasting kit.")
    assert t3.sales_stage_after == "PURCHASE_INTENT"
    assert t3.handoff_created is True


@pytest.mark.asyncio
async def test_persona_hotel_procurement_bulk_negotiation(simulation_env):
    """
    Simulates high-volume hotel chain procurement manager negotiating on 100kg+ Assam CTC.
    """
    session, org_id = simulation_env

    cust = Customer(
        org_id=org_id,
        primary_phone="+919876543222",
        name="Vikramaditya Hotels",
        company_name="Grand Regency Hotels",
        company_type="Hotel",
        opt_in_status=True,
    )
    session.add(cust)
    await session.commit()

    conv = Conversation(
        org_id=org_id,
        customer_id=cust.id,
        channel="whatsapp",
        channel_id=cust.primary_phone,
        mode="AI",
        sales_stage="NEW",
        lead_score=15,
    )
    session.add(conv)
    await session.commit()

    orchestrator = AgentOrchestrator(session, org_id)

    # Turn 1: Bulk volume inquiry
    t1 = await orchestrator.process_turn(conv.id, "What is your rate for 100kg monthly of strong Assam CTC?")
    assert t1.sales_stage_after in ("DISCOVERY", "QUALIFIED")

    # Turn 2: Price objection
    t2 = await orchestrator.process_turn(conv.id, "Your rate is slightly high compared to our current supplier.")
    assert t2.sales_stage_after == "OBJECTION"
    assert "cuppage" in t2.reply_text.lower() or "blend" in t2.reply_text.lower() or "rate" in t2.reply_text.lower()

    # Turn 3: Conversion to order
    t3 = await orchestrator.process_turn(conv.id, "Understood. Let us finalize the order for 100kg.")
    assert t3.sales_stage_after == "PURCHASE_INTENT"
    assert t3.handoff_created is True
