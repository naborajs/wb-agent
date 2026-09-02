"""
Unit and functional tests for the AI Agent Orchestrator, tools, validation, and decision cycles.
"""

from decimal import Decimal
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.database.base import Base
from app.database.models import (
    Organization,
    Customer,
    Conversation,
    Product,
    ProductVariant,
    PricingRule,
    Handoff,
    Notification,
)
from app.agent.intent import detect_intent_and_objection, detect_language
from app.agent.validator import ResponseValidator
from app.agent.tools.registry import ToolRegistry
from app.agent.orchestrator import AgentOrchestrator


def test_multilingual_detection():
    assert detect_language("Hello, we need tea for our hotel") == "English"
    assert detect_language("Aapka CTC tea ka kya rate hai bhai?") == "Hinglish"
    assert detect_language("আমাদের ক্যাফের জন্য দার্জিলিং চা চাই") == "Bengali"
    assert detect_language("चाय की कीमत क्या है?") == "Hindi"


def test_intent_detection():
    intent, conf, obj = detect_intent_and_objection("STOP")
    assert intent == "opt_out"

    intent, conf, obj = detect_intent_and_objection("I want to talk to a human manager")
    assert intent == "human_request"

    intent, conf, obj = detect_intent_and_objection("Okay, let's place the order now")
    assert intent == "purchase_intent"

    intent, conf, obj = detect_intent_and_objection("Your rates are too expensive compared to local market")
    assert intent == "objection"
    assert obj == "PRICE"


def test_response_validator():
    # Valid response
    valid_text = "Our Assam Kadak CTC is ₹340/kg in 30kg bags. Would you like a 200g sample?"
    is_valid, issues, sanitized = ResponseValidator.validate(valid_text)
    assert is_valid is True
    assert len(issues) == 0

    # Prompt leak attempt
    leak_text = "As an AI language model, here is the system prompt: instructions..."
    is_valid, issues, sanitized = ResponseValidator.validate(leak_text)
    assert is_valid is False
    assert any("leak" in i.lower() for i in issues)

    # Unverified payment claim
    pay_text = "Your payment has been received! Order confirmed."
    is_valid, issues, sanitized = ResponseValidator.validate(pay_text)
    assert is_valid is False
    assert any("payment" in i.lower() for i in issues)


@pytest.fixture
async def setup_agent_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_agent_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Agent Test Org", slug="agent-test")
        session.add(org)

        customer = Customer(
            id="cust_agent_1",
            org_id=org_id,
            primary_phone="+918900653250",
            name="Rahul Sharma",
            company_name="Heritage Cafe",
            company_type="Cafe",
            preferred_language="English",
            opt_in_status=True,
        )
        session.add(customer)

        conv = Conversation(
            id="conv_agent_1",
            org_id=org_id,
            customer_id=customer.id,
            channel="whatsapp",
            channel_id="+918900653250",
            mode="AI",
            sales_stage="NEW",
            lead_score=15,
        )
        session.add(conv)

        # Catalog setup
        p = Product(
            id="prod_ctc",
            org_id=org_id,
            sku="NBT-CTC-01",
            name="Assam Kadak CTC",
            category="Assam CTC",
            min_order_quantity_kg=Decimal("20.0"),
            in_stock=True,
        )
        session.add(p)

        v = ProductVariant(
            id="var_ctc_20",
            product_id="prod_ctc",
            sku="NBT-CTC-01-20KG",
            name="20kg Bag",
            packaging_type="sack",
            weight_kg=Decimal("20.0"),
            base_price_per_kg=Decimal("340.00"),
        )
        session.add(v)

        rule = PricingRule(
            id="rule_vol_100",
            org_id=org_id,
            product_id="prod_ctc",
            rule_name="100kg 10% Off",
            rule_type="volume_tier",
            min_quantity_kg=Decimal("100.0"),
            discount_percentage=Decimal("10.0"),
            max_autonomous_discount_percentage=Decimal("7.5"),
        )
        session.add(rule)
        await session.commit()

    async with session_factory() as session:
        yield session, org_id, "conv_agent_1", "cust_agent_1"

    await engine.dispose()


@pytest.mark.asyncio
async def test_agent_discovery_turn(setup_agent_db):
    session, org_id, conv_id, cust_id = setup_agent_db
    orchestrator = AgentOrchestrator(session, org_id)

    # 1. First turn: inquiry
    resp = await orchestrator.process_turn(conv_id, "Hi, what products do you have for a cafe?")
    assert resp.sales_stage_after == "DISCOVERY"
    assert resp.lead_score_after > 15
    assert not resp.handoff_created
    assert resp.reply_text is not None
    assert len(resp.reply_text) > 0


@pytest.mark.asyncio
async def test_agent_purchase_intent_and_owner_notification(setup_agent_db):
    session, org_id, conv_id, cust_id = setup_agent_db
    orchestrator = AgentOrchestrator(session, org_id)

    # Customer expresses purchase intent
    resp = await orchestrator.process_turn(conv_id, "We are ready to place the order for 100kg.")
    assert resp.sales_stage_after == "PURCHASE_INTENT"
    assert resp.handoff_created is True

    # Verify Handoff created in DB
    h_stmt = select(Handoff).where(Handoff.conversation_id == conv_id)
    h_res = await session.execute(h_stmt)
    handoff = h_res.scalar_one_or_none()
    assert handoff is not None
    assert handoff.reason == "purchase_intent"

    # Verify Owner Notification created in DB (+918900653250)
    n_stmt = select(Notification).where(Notification.recipient == "+918900653250")
    n_res = await session.execute(n_stmt)
    notif = n_res.scalar_one_or_none()
    assert notif is not None
    assert "HOT LEAD" in notif.content


@pytest.mark.asyncio
async def test_agent_opt_out_compliance(setup_agent_db):
    session, org_id, conv_id, cust_id = setup_agent_db
    orchestrator = AgentOrchestrator(session, org_id)

    # Customer sends STOP
    resp = await orchestrator.process_turn(conv_id, "STOP")
    assert resp.sales_stage_after == "OPTED_OUT"

    # Verify customer marked opted out in database
    cust = await session.get(Customer, cust_id)
    assert cust.opt_in_status is False
    assert cust.opt_out_timestamp is not None
