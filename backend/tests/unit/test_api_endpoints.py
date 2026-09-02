"""
API Integration tests using FastAPI TestClient and AsyncClient.
"""

from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, Product, ProductVariant, PricingRule
from app.database.session import get_db
from app.main import app


@pytest.fixture
async def app_client():
    # Use isolated in-memory database for API test suite
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Seed initial test data
    async with test_session_factory() as session:
        org = Organization(id="org_default_tea", name="North Bengal Tea Co.", slug="north-bengal-tea")
        session.add(org)

        p = Product(
            id="prod_darj_api",
            org_id="org_default_tea",
            sku="NBT-DARJ-API",
            name="Darjeeling Api Blend",
            category="Darjeeling",
            min_order_quantity_kg=Decimal("10.0"),
            in_stock=True,
        )
        session.add(p)

        v = ProductVariant(
            id="var_darj_api_5",
            product_id="prod_darj_api",
            sku="NBT-DARJ-API-5KG",
            name="5kg Pack",
            packaging_type="foil_bag",
            weight_kg=Decimal("5.0"),
            base_price_per_kg=Decimal("1500.00"),
        )
        session.add(v)

        r = PricingRule(
            id="rule_api_50",
            org_id="org_default_tea",
            product_id="prod_darj_api",
            rule_name="50kg Tier",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("50.0"),
            discount_percentage=Decimal("5.0"),
            max_autonomous_discount_percentage=Decimal("5.0"),
        )
        session.add(r)
        await session.commit()

    # Override get_db dependency
    async def override_get_db():
        async with test_session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_health_and_root(app_client):
    res_root = await app_client.get("/")
    assert res_root.status_code == 200
    assert res_root.json()["status"] == "online"

    res_health = await app_client.get("/api/v1/health")
    assert res_health.status_code == 200
    assert res_health.json()["status"] == "ok"


@pytest.mark.asyncio
async def test_products_and_pricing_api(app_client):
    # 1. List products
    res = await app_client.get("/api/v1/products")
    assert res.status_code == 200
    products = res.json()
    assert len(products) == 1
    assert products[0]["sku"] == "NBT-DARJ-API"

    # 2. Calculate quote
    calc_req = {
        "product_id": "prod_darj_api",
        "quantity_kg": 50.0,
        "requested_discount_percentage": 0.0,
    }
    calc_res = await app_client.post("/api/v1/pricing/calculate", json=calc_req)
    assert calc_res.status_code == 200
    data = calc_res.json()
    assert float(data["quantity_kg"]) == 50.0
    assert float(data["discount_percentage"]) == 5.0
    assert float(data["total"]) == 71250.0  # 50 * 1500 = 75,000 - 5% (3750) = 71,250


@pytest.mark.asyncio
async def test_agent_simulate_api(app_client):
    sim_req = {
        "persona_name": "Test Cafe Owner",
        "business_name": "Mountain Cafe",
        "phone": "+919876500001",
        "turns": [
            "Hi, what tea blends do you recommend for a small cafe?",
            "What is the price for 50kg?",
            "Okay, let's place the order.",
        ]
    }
    res = await app_client.post("/api/v1/agent/simulate", json=sim_req)
    assert res.status_code == 200
    data = res.json()
    assert data["turns_completed"] == 3
    assert data["final_stage"] == "PURCHASE_INTENT"
    assert data["history"][-1]["handoff"] is True


@pytest.mark.asyncio
async def test_whatsapp_webhook_verification_and_reception(app_client):
    # 1. GET verification challenge
    res = await app_client.get(
        "/api/v1/webhooks/whatsapp",
        params={
            "hub.mode": "subscribe",
            "hub.verify_token": "wb_agent_verify_token",
            "hub.challenge": "challenge_123456",
        }
    )
    assert res.status_code == 200
    assert res.text == "challenge_123456"

    # 2. POST simulated inbound webhook
    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "918900653250",
                                    "id": "meta_inbound_test_1",
                                    "type": "text",
                                    "text": {"body": "Need 50kg CTC tea"},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }
    post_res = await app_client.post("/api/v1/webhooks/whatsapp", json=payload)
    assert post_res.status_code == 200
    assert post_res.json()["events_count"] == 1
