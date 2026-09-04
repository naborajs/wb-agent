"""
Unit tests for Autonomous AI Watchdog Service, Alerts, and API Endpoints (Section 125).
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.database.base import Base, utc_now
from app.database.models import (
    Conversation,
    Customer,
    Handoff,
    Message,
    Order,
    OrderItem,
    Organization,
    Product,
    WatchdogAlert,
)
from app.database.session import get_db
from app.main import app
from app.watchdog.service import WatchdogService


@pytest.fixture
async def setup_watchdog_env():
    """Sets up an in-memory SQLite database for watchdog testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_watchdog_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Watchdog Test Org", slug="watchdog-test")
        session.add(org)

        cust = Customer(
            id="cust_wd_1",
            org_id=org_id,
            primary_phone="+919876599999",
            name="Anoop Roy",
            company_name="Roy Grand Tea",
            opt_in_status=True,
        )
        session.add(cust)

        conv = Conversation(
            id="conv_wd_1",
            org_id=org_id,
            customer_id=cust.id,
            channel="whatsapp",
            channel_id="+919876599999",
            mode="AI",
            sales_stage="DISCOVERY",
            lead_score=20,
            updated_at=utc_now() - timedelta(minutes=30),
        )
        session.add(conv)

        # Inbound message that has been sitting for 30 minutes
        msg = Message(
            conversation_id="conv_wd_1",
            direction="inbound",
            sender_type="customer",
            content="Can you send rate card?",
            created_at=utc_now() - timedelta(minutes=30),
        )
        session.add(msg)

        # Product with MOQ 50kg
        prod = Product(
            id="prod_wd_1",
            org_id=org_id,
            sku="NBT-WD-01",
            name="Assam Kadak CTC 50KG",
            category="Assam CTC",
            min_order_quantity_kg=Decimal("50.0"),
            in_stock=True,
        )
        session.add(prod)

        # Order below MOQ
        order = Order(
            id="order_wd_1",
            org_id=org_id,
            order_number="NBT-260904-999",
            customer_id=cust.id,
            total_amount=Decimal("3400.00"),
            status="confirmed",
            created_at=utc_now(),
        )
        session.add(order)

        order_item = OrderItem(
            order_id="order_wd_1",
            product_id="prod_wd_1",
            product_name="Assam Kadak CTC 50KG",
            quantity_kg=Decimal("10.0"),  # Below 50kg MOQ
            unit_price_per_kg=Decimal("340.00"),
            subtotal=Decimal("3400.00"),
        )
        session.add(order_item)

        # Guardrail hold handoff
        handoff = Handoff(
            id="ho_wd_1",
            org_id=org_id,
            conversation_id="conv_wd_1",
            customer_id=cust.id,
            reason="guardrail_violation",
            summary="Potential jailbreak detected by safety classifier",
        )
        session.add(handoff)

        await session.commit()

    async with session_factory() as session:
        yield session, org_id

    await engine.dispose()


@pytest.mark.asyncio
async def test_watchdog_stalled_conversations_audit(setup_watchdog_env):
    session, org_id = setup_watchdog_env
    service = WatchdogService(session, org_id)

    alerts = await service.audit_stalled_conversations(stall_minutes=15)
    assert len(alerts) >= 1
    stalled_alert = alerts[0]
    assert stalled_alert.category == "stalled_chat"
    assert stalled_alert.conversation_id == "conv_wd_1"
    assert "awaiting response" in stalled_alert.title


@pytest.mark.asyncio
async def test_watchdog_guardrail_holds_audit(setup_watchdog_env):
    session, org_id = setup_watchdog_env
    service = WatchdogService(session, org_id)

    alerts = await service.audit_guardrail_holds()
    assert len(alerts) >= 1
    hold_alert = alerts[0]
    assert hold_alert.category == "guardrail_hold"
    assert "conv_wd_" in hold_alert.title


@pytest.mark.asyncio
async def test_watchdog_pricing_integrity_audit(setup_watchdog_env):
    session, org_id = setup_watchdog_env
    service = WatchdogService(session, org_id)

    alerts = await service.audit_pricing_integrity()
    assert len(alerts) >= 1
    price_alert = alerts[0]
    assert price_alert.category == "pricing_discrepancy"
    assert "below MOQ" in price_alert.title


@pytest.mark.asyncio
async def test_watchdog_resolve_alert(setup_watchdog_env):
    session, org_id = setup_watchdog_env
    service = WatchdogService(session, org_id)

    alert = await service.create_alert(
        severity="warning",
        category="system_health",
        title="Test Alert to Resolve",
        description="Temporary test description",
    )
    assert alert.is_resolved is False

    resolved = await service.resolve_alert(alert.id, resolved_by="test_operator")
    assert resolved is not None
    assert resolved.is_resolved is True
    assert resolved.resolved_by == "test_operator"
    assert resolved.resolved_at is not None


@pytest.mark.asyncio
async def test_watchdog_full_audit_runs(setup_watchdog_env):
    session, org_id = setup_watchdog_env
    service = WatchdogService(session, org_id)

    report = await service.run_full_diagnostic_audit()
    assert report is not None
    assert str(report.overall_health).lower() in ("healthy", "degraded", "critical")
    assert isinstance(report.issues_found, list)
    assert report.system_verdict is not None


@pytest.mark.asyncio
async def test_watchdog_api_endpoints():
    """Tests /api/v1/watchdog/alerts and /api/v1/watchdog/system-health endpoints."""
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_default"
    async with test_factory() as session:
        org = Organization(id=org_id, name="Default Org", slug="default-org")
        session.add(org)
        alert = WatchdogAlert(
            id="alert_api_test_1",
            org_id=org_id,
            severity="warning",
            category="pricing_discrepancy",
            title="Price Mismatch Detected",
            description="Item price did not match catalog",
            model_used="openai/gpt-oss-20b",
        )
        session.add(alert)
        await session.commit()

    async def override_get_session():
        async with test_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_session

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. List alerts
        res = await client.get("/api/v1/watchdog/alerts")
        assert res.status_code == 200
        data = res.json()
        assert data["count"] >= 1
        assert data["alerts"][0]["id"] == "alert_api_test_1"

        # 2. System health summary
        h_res = await client.get("/api/v1/watchdog/system-health")
        assert h_res.status_code == 200
        h_data = h_res.json()
        assert h_data["total_active_alerts"] >= 1
        assert h_data["warning_count"] >= 1

        # 3. Resolve alert
        r_res = await client.post(
            "/api/v1/watchdog/alerts/alert_api_test_1/resolve",
            json={"resolved_by": "qa_supervisor"},
        )
        assert r_res.status_code == 200
        assert r_res.json()["status"] == "resolved"

    app.dependency_overrides.clear()
    await test_engine.dispose()
