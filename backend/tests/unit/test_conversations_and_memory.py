"""
Unit tests for ConversationService, CustomerMemoryService, ConversationLock, and ContextBuilder.
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, Customer
from app.memory.customer import CustomerMemoryService
from app.memory.conversation import ConversationMemoryService
from app.conversations.service import ConversationService
from app.conversations.locking import ConversationLock
from app.conversations.context import ContextBuilder


@pytest.fixture
async def setup_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_conv_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Tea Conv Test", slug="tea-conv-test")
        session.add(org)

        customer = Customer(
            id="cust_conv_1",
            org_id=org_id,
            primary_phone="+918900653250",
            name="Vikram Seth",
            company_name="Seth Tea Emporium",
            company_type="Tea Shop",
            city="Siliguri",
            preferred_language="Hindi"
        )
        session.add(customer)
        await session.commit()

    async with session_factory() as session:
        yield session, org_id, "cust_conv_1"

    await engine.dispose()


@pytest.mark.asyncio
async def test_customer_memory_service(setup_db):
    session, org_id, customer_id = setup_db
    mem_svc = CustomerMemoryService(session, org_id)

    # 1. Save fact
    fact = await mem_svc.save_fact(
        customer_id=customer_id,
        category="requirements",
        key="monthly_volume_kg",
        value=150,
        confidence=0.9,
        verification_status="CUSTOMER_SAID"
    )
    assert fact.key == "monthly_volume_kg"
    assert fact.value == 150

    # 2. Update existing fact
    updated = await mem_svc.save_fact(
        customer_id=customer_id,
        category="requirements",
        key="monthly_volume_kg",
        value=200,
        confidence=1.0,
        verification_status="HUMAN_CONFIRMED"
    )
    assert updated.value == 200
    assert updated.verification_status == "HUMAN_CONFIRMED"

    # 3. Retrieve dictionary
    mem_dict = await mem_svc.get_memory_dict(customer_id)
    assert "requirements" in mem_dict
    assert mem_dict["requirements"]["monthly_volume_kg"]["value"] == 200


@pytest.mark.asyncio
async def test_conversation_service_and_locking(setup_db):
    session, org_id, customer_id = setup_db
    conv_svc = ConversationService(session, org_id)

    # 1. Get or create conversation
    conv = await conv_svc.get_or_create_conversation(
        customer_id=customer_id,
        channel="whatsapp",
        channel_id="+918900653250"
    )
    assert conv.mode == "AI"
    assert conv.sales_stage == "NEW"

    # 2. Add inbound message
    msg = await conv_svc.add_message(
        conversation_id=conv.id,
        direction="inbound",
        sender_type="customer",
        content="Hello, what are your bulk tea prices?",
        provider_message_id="meta_msg_1001"
    )
    assert msg.id is not None
    assert msg.provider_message_id == "meta_msg_1001"

    # 3. Add duplicate message (idempotency check)
    dup_msg = await conv_svc.add_message(
        conversation_id=conv.id,
        direction="inbound",
        sender_type="customer",
        content="Hello, what are your bulk tea prices?",
        provider_message_id="meta_msg_1001"
    )
    assert dup_msg.id == msg.id

    # 4. Acquire conversation lock
    lock1 = ConversationLock(session, conv.id, worker_id="worker_1", timeout_seconds=10)
    assert await lock1.acquire() is True

    # Lock attempt by worker_2 must fail while worker_1 holds it
    lock2 = ConversationLock(session, conv.id, worker_id="worker_2", timeout_seconds=10)
    assert await lock2.acquire() is False

    # Release worker_1
    await lock1.release()

    # Worker_2 can now acquire
    assert await lock2.acquire() is True
    await lock2.release()


@pytest.mark.asyncio
async def test_context_builder(setup_db):
    session, org_id, customer_id = setup_db
    conv_svc = ConversationService(session, org_id)
    mem_svc = CustomerMemoryService(session, org_id)
    conv_mem = ConversationMemoryService(session, org_id)
    builder = ContextBuilder(session, org_id)

    # Setup memory
    await mem_svc.save_fact(customer_id, "budget", "max_budget_inr", 50000)

    # Setup conversation and messages
    conv = await conv_svc.get_or_create_conversation(customer_id)
    await conv_svc.add_message(conv.id, "inbound", "customer", "We need strong CTC tea for restaurant.")
    await conv_svc.add_message(conv.id, "outbound", "agent", "We have our Assam Kadak CTC blend.")

    # Setup summary
    await conv_mem.update_summary(
        conv.id,
        summary_text="Customer operates restaurant inquiring about Assam Kadak CTC.",
        customer_goals="Looking for cost-effective heavy liquor tea"
    )

    # Build context
    ctx = await builder.build_context(conv.id, inbound_message="What is the price for 50kg?")
    assert ctx.customer_name == "Vikram Seth"
    assert ctx.company_name == "Seth Tea Emporium"
    assert ctx.summary is not None
    assert len(ctx.recent_messages) == 2
    assert "budget" in ctx.verified_memories
    assert ctx.latest_inbound_message == "What is the price for 50kg?"
