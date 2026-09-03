"""
Unit tests for auditable commercial quotes and lifecycle state transitions (Sections 43 & 44).
"""

from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.database.base import Base
from app.database.models import Customer, Product, ProductVariant, PricingRule, Organization
from app.database.session import get_db
from app.main import app


@pytest.fixture
async def quote_test_client():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with test_session_factory() as session:
        org = Organization(id=settings.DEFAULT_ORG_ID, name="North Bengal Tea Co.", slug="north-bengal-tea")
        session.add(org)
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
async def test_quote_creation_calculation_and_status(quote_test_client):
    """
    Tests creating an auditable commercial quote, verifying deterministic line item calculations,
    and updating quote lifecycle state.
    """
    client, session_factory = quote_test_client
    org_id = settings.DEFAULT_ORG_ID

    # 1. Setup customer and product
    async with session_factory() as session:
        customer = Customer(
            org_id=org_id,
            name="Rohan Singhania",
            company_name="Grand Darjeeling Hotel",
            company_type="hotel",
            primary_phone="+919876500002",
        )
        product = Product(
            org_id=org_id,
            sku="TEA-ASSAM-TEST",
            name="Assam Super Kadak CTC",
            category="Assam CTC",
            min_order_quantity_kg=Decimal("20.0"),
            in_stock=True,
        )
        session.add_all([customer, product])
        await session.flush()

        variant = ProductVariant(
            product_id=product.id,
            sku="VAR-ASSAM-25KG",
            name="25kg Bulk Bag",
            packaging_type="sack",
            weight_kg=Decimal("25.0"),
            base_price_per_kg=Decimal("350.0"),
            in_stock=True,
        )
        rule = PricingRule(
            org_id=org_id,
            product_id=product.id,
            rule_name="Hotel 100kg+ Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("100.0"),
            discount_percentage=Decimal("10.0"),
            is_active=True,
        )
        session.add_all([variant, rule])
        await session.commit()
        cust_id = customer.id
        prod_id = product.id

    # 2. Create Quote via API
    payload = {
        "customer_id": cust_id,
        "valid_days": 14,
        "notes": "Estate direct dispatch to Grand Darjeeling Hotel",
        "items": [
            {
                "product_id": prod_id,
                "quantity_kg": 100.0,
                "discount_pct": 0.0,
            }
        ],
    }

    res = await client.post("/api/v1/quotes", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert "QTE-" in data["quote_number"]
    assert data["customer_name"] == "Rohan Singhania"
    # Base price is 350, 10% volume discount applied -> 315/kg * 100kg = 31,500
    assert float(data["total_amount"]) == 31500.0
    assert float(data["discount_amount"]) == 3500.0
    quote_id = data["id"]

    # 3. List Quotes
    list_res = await client.get(f"/api/v1/quotes?customer_id={cust_id}")
    assert list_res.status_code == 200
    items = list_res.json()["items"]
    assert len(items) >= 1
    assert items[0]["id"] == quote_id
    assert items[0]["items_count"] == 1

    # 4. Update Status to accepted
    patch_res = await client.patch(
        f"/api/v1/quotes/{quote_id}",
        json={"status": "accepted", "approved_by": "Sales Director"},
    )
    assert patch_res.status_code == 200
    assert patch_res.json()["status"] == "accepted"
