"""
Unit tests for zero-hallucination PricingValidator (Directive §3.C & §8).
"""

from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.ai.pricing_validator import PricingValidator
from app.database.base import Base
from app.database.models import Organization, Product, ProductVariant


@pytest.fixture
async def db_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    async with session_factory() as session:
        yield session


@pytest.mark.asyncio
async def test_pricing_validator_accepts_valid_db_order(db_session: AsyncSession):
    """Verifies that an order matching catalog and pricing rules passes verification."""
    org = Organization(id="org_test_val", name="Test Organ", slug="test-organ")
    db_session.add(org)

    prod = Product(
        id="prod_tea_val_1",
        org_id=org.id,
        name="Assam Kadak CTC Granules",
        category="Assam CTC",
        sku="ASSAM-CTC-VAL",
        min_order_quantity_kg=Decimal("25.0"),
        is_active=True,
    )
    db_session.add(prod)
    var = ProductVariant(
        id="var_val_1",
        product_id=prod.id,
        sku="VAR-ASSAM-50",
        name="50kg Bulk Sack",
        weight_kg=Decimal("50.0"),
        base_price_per_kg=Decimal("340.00"),
    )
    db_session.add(var)
    await db_session.commit()

    order_payload = {
        "buyer_name": "Siliguri Cafe",
        "items": [
            {
                "product_name": "Assam Kadak CTC Granules",
                "quantity_kg": 50,
                "unit_price": 340.0,
            }
        ],
    }

    is_valid, verified_data, err = await PricingValidator.validate_extracted_order(
        session=db_session,
        org_id=org.id,
        extracted_data=order_payload,
    )

    assert is_valid is True
    assert err is None
    assert verified_data is not None
    assert verified_data["total_amount"] == 17000.0
    assert verified_data["items"][0]["unit_price"] == 340.0


@pytest.mark.asyncio
async def test_pricing_validator_rejects_hallucinated_price(db_session: AsyncSession):
    """
    Directive §3.C: Zero-hallucination rule.
    If the model invents a price (e.g. ₹120 instead of ₹340), it must be rejected!
    """
    org = Organization(id="org_test_val2", name="Test Organ 2", slug="test-organ-2")
    db_session.add(org)

    prod = Product(
        id="prod_tea_val_2",
        org_id=org.id,
        name="Assam Super Kadak CTC",
        category="Assam CTC",
        sku="ASSAM-SUP-VAL",
        min_order_quantity_kg=Decimal("25.0"),
        is_active=True,
    )
    db_session.add(prod)
    var = ProductVariant(
        id="var_val_2",
        product_id=prod.id,
        sku="VAR-ASSAM-SUP-50",
        name="50kg Bulk Sack",
        weight_kg=Decimal("50.0"),
        base_price_per_kg=Decimal("340.00"),
    )
    db_session.add(var)
    await db_session.commit()

    # Hallucinated cheap price ₹120.00/kg
    hallucinated_order = {
        "buyer_name": "Chai Corner",
        "items": [
            {
                "product_name": "Assam Super Kadak CTC",
                "quantity_kg": 50,
                "unit_price": 120.0,
            }
        ],
    }

    is_valid, verified_data, err = await PricingValidator.validate_extracted_order(
        session=db_session,
        org_id=org.id,
        extracted_data=hallucinated_order,
    )

    assert is_valid is False
    assert verified_data is None
    assert "Zero-Hallucination violation" in err


@pytest.mark.asyncio
async def test_pricing_validator_rejects_moq_violation(db_session: AsyncSession):
    """Verifies that an order below minimum order quantity is rejected."""
    org = Organization(id="org_test_val3", name="Test Organ 3", slug="test-organ-3")
    db_session.add(org)

    prod = Product(
        id="prod_tea_val_3",
        org_id=org.id,
        name="Darjeeling First Flush Whole Leaf",
        category="Darjeeling",
        sku="DARJ-FF-VAL",
        min_order_quantity_kg=Decimal("25.0"),
        is_active=True,
    )
    db_session.add(prod)
    await db_session.commit()

    # Requested only 5kg (below 25kg MOQ)
    moq_fail_order = {
        "buyer_name": "Tea Boutique",
        "items": [
            {
                "product_name": "Darjeeling First Flush Whole Leaf",
                "quantity_kg": 5,
            }
        ],
    }

    is_valid, verified_data, err = await PricingValidator.validate_extracted_order(
        session=db_session,
        org_id=org.id,
        extracted_data=moq_fail_order,
    )

    assert is_valid is False
    assert "below required MOQ" in err


@pytest.mark.asyncio
async def test_pricing_validator_demo_products_fallback(db_session: AsyncSession):
    """
    Verifies that when a product is not seeded in DB, it safely falls back to
    the DEMO_PRODUCTS catalog without UnboundLocalError or crash.
    """
    order_payload = {
        "buyer_name": "Siliguri Local Cafe",
        "items": [
            {
                "product_name": "Assam Kadak CTC",
                "quantity_kg": 50,
            }
        ],
    }

    is_valid, verified_data, err = await PricingValidator.validate_extracted_order(
        session=db_session,
        org_id="org_unseeded",
        extracted_data=order_payload,
    )

    assert is_valid is True
    assert err is None
    assert verified_data is not None
    assert verified_data["total_amount"] == 16150.0  # 50kg * 323.0
    assert verified_data["items"][0]["unit_price"] == 323.0


@pytest.mark.asyncio
async def test_pricing_validator_rejects_hallucinated_price_in_catalog_fallback(db_session: AsyncSession):
    """
    Verifies that zero-hallucination enforcement works on DEMO_PRODUCTS catalog fallback.
    """
    hallucinated_order = {
        "buyer_name": "Corner Stall",
        "items": [
            {
                "product_name": "Assam Kadak CTC",
                "quantity_kg": 50,
                "unit_price": 99.0,  # Invented price
            }
        ],
    }

    is_valid, verified_data, err = await PricingValidator.validate_extracted_order(
        session=db_session,
        org_id="org_unseeded",
        extracted_data=hallucinated_order,
    )

    assert is_valid is False
    assert verified_data is None
    assert "Zero-Hallucination violation" in err


@pytest.mark.asyncio
async def test_pricing_validator_rejects_invalid_quantity(db_session: AsyncSession):
    """Verifies that non-numeric and negative quantities are rejected."""
    bad_qty_order = {
        "items": [{"product_name": "Assam Kadak CTC", "quantity_kg": "not_a_number"}]
    }
    is_valid, _, err = await PricingValidator.validate_extracted_order(
        session=db_session, org_id="org_test", extracted_data=bad_qty_order
    )
    assert is_valid is False
    assert "invalid non-numeric quantity" in err

    neg_qty_order = {
        "items": [{"product_name": "Assam Kadak CTC", "quantity_kg": -10}]
    }
    is_valid, _, err = await PricingValidator.validate_extracted_order(
        session=db_session, org_id="org_test", extracted_data=neg_qty_order
    )
    assert is_valid is False
    assert "non-positive quantity" in err

