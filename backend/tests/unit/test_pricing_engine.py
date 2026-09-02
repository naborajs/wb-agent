"""
Unit tests for deterministic pricing engine, volume tiers, MOQ validation, and negotiation limits.
"""

from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, Product, ProductVariant, PricingRule
from app.products.service import ProductService
from app.pricing.calculator import PricingService


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_pricing_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Pricing Test Org", slug="pricing-test")
        session.add(org)

        # Darjeeling First Flush (MOQ: 10kg, Variant 5kg @ 1600/kg, Variant 20kg @ 1450/kg)
        prod1 = Product(
            id="prod_darj",
            org_id=org_id,
            sku="NBT-DARJ-FF",
            name="Darjeeling First Flush",
            category="Darjeeling",
            min_order_quantity_kg=Decimal("10.0"),
            in_stock=True,
            is_active=True
        )
        session.add(prod1)

        v1 = ProductVariant(
            id="var_darj_5k",
            product_id="prod_darj",
            sku="NBT-DARJ-FF-5KG",
            name="5kg Pack",
            packaging_type="foil_bag",
            weight_kg=Decimal("5.0"),
            base_price_per_kg=Decimal("1600.00")
        )
        v2 = ProductVariant(
            id="var_darj_20k",
            product_id="prod_darj",
            sku="NBT-DARJ-FF-20KG",
            name="20kg Chest",
            packaging_type="chest",
            weight_kg=Decimal("20.0"),
            base_price_per_kg=Decimal("1450.00")
        )
        session.add_all([v1, v2])

        # Pricing rules
        r1 = PricingRule(
            id="rule_50k",
            org_id=org_id,
            product_id="prod_darj",
            rule_name="50kg Volume Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("50.0"),
            max_quantity_kg=Decimal("99.99"),
            discount_percentage=Decimal("5.0"),
            max_autonomous_discount_percentage=Decimal("5.0"),
            requires_human_approval=False
        )
        r2 = PricingRule(
            id="rule_100k",
            org_id=org_id,
            product_id="prod_darj",
            rule_name="100kg Commercial Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("100.0"),
            max_quantity_kg=Decimal("499.99"),
            discount_percentage=Decimal("10.0"),
            max_autonomous_discount_percentage=Decimal("7.5"),
            requires_human_approval=False
        )
        r3 = PricingRule(
            id="rule_500k",
            org_id=org_id,
            product_id="prod_darj",
            rule_name="500kg Wholesale Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("500.0"),
            discount_percentage=Decimal("15.0"),
            max_autonomous_discount_percentage=Decimal("10.0"),
            requires_human_approval=True
        )
        session.add_all([r1, r2, r3])
        await session.commit()

    async with session_factory() as session:
        yield session, org_id

    await engine.dispose()


@pytest.mark.asyncio
async def test_product_search(db_session):
    session, org_id = db_session
    svc = ProductService(session, org_id)

    prods = await svc.search_products(category="Darjeeling")
    assert len(prods) == 1
    assert prods[0].sku == "NBT-DARJ-FF"


@pytest.mark.asyncio
async def test_moq_enforcement(db_session):
    session, org_id = db_session
    pricing = PricingService(session, org_id)

    # MOQ is 10kg; requesting 5kg must fail
    with pytest.raises(ValueError, match="below the Minimum Order Quantity"):
        await pricing.calculate_price(
            product_id="prod_darj",
            quantity_kg=Decimal("5.0")
        )


@pytest.mark.asyncio
async def test_exact_moq_base_pricing(db_session):
    session, org_id = db_session
    pricing = PricingService(session, org_id)

    # 10kg matches 5kg pack variant rate (1600/kg)
    resp = await pricing.calculate_price(
        product_id="prod_darj",
        quantity_kg=Decimal("10.0")
    )
    assert resp.quantity_kg == Decimal("10.0")
    assert resp.base_price_per_kg == Decimal("1600.00")
    assert resp.discount_percentage == Decimal("0.0")
    assert resp.subtotal == Decimal("16000.00")
    assert resp.total == Decimal("16000.00")
    assert not resp.requires_human_approval


@pytest.mark.asyncio
async def test_volume_tier_discounts(db_session):
    session, org_id = db_session
    pricing = PricingService(session, org_id)

    # 50kg -> matches 20kg pack rate (1450/kg) + 5% volume discount
    # Subtotal: 50 * 1450 = 72,500. Discount 5% = 3,625. Total = 68,875
    resp_50 = await pricing.calculate_price(
        product_id="prod_darj",
        quantity_kg=Decimal("50.0")
    )
    assert resp_50.discount_percentage == Decimal("5.0")
    assert resp_50.subtotal == Decimal("72500.00")
    assert resp_50.discount_amount == Decimal("3625.00")
    assert resp_50.total == Decimal("68875.00")
    assert not resp_50.requires_human_approval

    # 100kg -> 10% discount
    resp_100 = await pricing.calculate_price(
        product_id="prod_darj",
        quantity_kg=Decimal("100.0")
    )
    assert resp_100.discount_percentage == Decimal("10.0")
    assert not resp_100.requires_human_approval

    # 500kg -> wholesale tier requiring human approval
    resp_500 = await pricing.calculate_price(
        product_id="prod_darj",
        quantity_kg=Decimal("500.0")
    )
    assert resp_500.discount_percentage == Decimal("15.0")
    assert resp_500.requires_human_approval is True
    assert "requires human confirmation" in resp_500.approval_reason


@pytest.mark.asyncio
async def test_negotiation_authority_limits(db_session):
    session, org_id = db_session
    pricing = PricingService(session, org_id)

    # Customer asks for 20% discount on 20kg order (normal discount 0%, max autonomous 5%)
    # Must flag requires_human_approval=True
    resp = await pricing.calculate_price(
        product_id="prod_darj",
        quantity_kg=Decimal("20.0"),
        requested_discount=Decimal("20.0")
    )
    assert resp.requires_human_approval is True
    assert "exceeds autonomous authority limit" in resp.approval_reason
    # Capped at autonomous limit
    assert resp.discount_percentage == Decimal("5.0")
