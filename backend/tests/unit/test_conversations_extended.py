"""
Unit tests for extended conversation endpoints: initiate chat by phone and operator response reporting (Sections 55, 63, 64, 65).
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.config import settings
from app.database.base import Base
from app.database.models import Customer, Conversation, Message, KnowledgeCandidate, SalesLearning, Organization
from app.database.session import get_db
from app.main import app


@pytest.fixture
async def conv_test_client():
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
async def test_initiate_conversation_by_phone(conv_test_client):
    client, session_factory = conv_test_client

    # 1. Initiate conversation with unformatted phone number
    payload = {
        "phone": "91 98765 43210",
        "name": "Kavita Rao",
        "company_name": "Kavita's Artisan Cafe",
        "company_type": "cafe",
        "initial_message": "Hello Kavita, reaching out regarding your bulk tea inquiry.",
    }

    res = await client.post("/api/v1/conversations/initiate", json=payload)
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["success"] is True
    assert data["phone"] == "+919876543210"
    assert data["channel"] == "simulation"
    assert data["is_simulation"] is True
    conv_id = data["conversation_id"]

    # 2. Verify conversation details via API
    detail_res = await client.get(f"/api/v1/conversations/{conv_id}")
    assert detail_res.status_code == 200
    conv_data = detail_res.json()
    assert conv_data["customer"]["name"] == "Kavita Rao"
    assert conv_data["conversation"]["is_simulation"] is True
    assert conv_data["conversation"]["channel"] == "simulation"
    assert len(conv_data["messages"]) == 1
    assert "bulk tea inquiry" in conv_data["messages"][0]["content"]
    assert conv_data["messages"][0]["is_simulation"] is True


@pytest.mark.asyncio
async def test_report_message_response(conv_test_client):
    client, session_factory = conv_test_client

    # 1. Seed conversation and an AI message
    async with session_factory() as session:
        cust = Customer(
            org_id=settings.DEFAULT_ORG_ID,
            primary_phone="+919999988888",
            name="Amit Verma",
            company_name="Verma Chai Stall",
            company_type="tea_stall",
        )
        session.add(cust)
        await session.flush()

        conv = Conversation(
            org_id=settings.DEFAULT_ORG_ID,
            customer_id=cust.id,
            channel="whatsapp",
            channel_id=cust.primary_phone,
            mode="AI",
            sales_stage="DISCOVERY",
        )
        session.add(conv)
        await session.flush()

        msg = Message(
            org_id=settings.DEFAULT_ORG_ID,
            conversation_id=conv.id,
            direction="outbound",
            sender_type="agent",
            content="Our Assam CTC is ₹200 per kg for any quantity.",
            delivery_status="delivered",
        )
        session.add(msg)
        await session.commit()
        conv_id = conv.id
        msg_id = msg.id

    # 2. Report the message as wrong_price with business knowledge flag
    report_payload = {
        "category": "wrong_price",
        "explanation": "Agent stated ₹200/kg without adhering to the 100kg MOQ volume tier rate (₹315/kg).",
        "corrected_text": "Our Assam CTC base price is ₹350/kg, but for orders over 100kg we offer ₹315/kg.",
        "is_business_knowledge": True,
    }

    report_res = await client.post(
        f"/api/v1/conversations/{conv_id}/messages/{msg_id}/report",
        json=report_payload,
    )
    assert report_res.status_code == 200, report_res.text
    rep_data = report_res.json()
    assert rep_data["success"] is True
    assert rep_data["learning_id"] is not None
    assert rep_data["knowledge_candidate_id"] is not None

    # 3. Verify conversation detail reflects reported flag
    detail_res = await client.get(f"/api/v1/conversations/{conv_id}")
    assert detail_res.status_code == 200
    msg_data = detail_res.json()["messages"][0]
    assert msg_data["reported"] is True
    assert msg_data["correction_category"] == "wrong_price"
    assert "₹350/kg" in msg_data["corrected_text"]


@pytest.mark.asyncio
async def test_database_stats_and_deletion(conv_test_client):
    client, session_factory = conv_test_client

    # 1. Check stats endpoint
    stats_res = await client.get("/api/v1/conversations/database/stats")
    assert stats_res.status_code == 200
    data = stats_res.json()
    assert "total_conversations" in data
    assert "total_messages" in data

    # 2. Create a conversation to delete
    async with session_factory() as session:
        cust = Customer(
            id="cust_del_test",
            org_id=settings.DEFAULT_ORG_ID,
            primary_phone="+919800011223",
            name="Delete Target",
        )
        session.add(cust)
        await session.flush()
        conv = Conversation(
            id="conv_del_test",
            org_id=settings.DEFAULT_ORG_ID,
            customer_id=cust.id,
            channel="whatsapp",
            channel_id="+919800011223",
            mode="AI",
        )
        session.add(conv)
        await session.flush()
        msg = Message(
            org_id=settings.DEFAULT_ORG_ID,
            conversation_id=conv.id,
            direction="inbound",
            sender_type="customer",
            content="Temporary message",
            delivery_status="received",
        )
        session.add(msg)
        await session.commit()

    # 3. Delete the conversation
    del_res = await client.delete("/api/v1/conversations/conv_del_test")
    assert del_res.status_code == 200
    del_data = del_res.json()
    assert del_data["success"] is True
    assert del_data["deleted_id"] == "conv_del_test"

    # 4. Verify conversation is gone
    get_res = await client.get("/api/v1/conversations/conv_del_test")
    assert get_res.status_code == 404


@pytest.mark.asyncio
async def test_purge_simulations_endpoint(conv_test_client):
    client, session_factory = conv_test_client

    # 1. Create a simulated conversation
    async with session_factory() as session:
        cust = Customer(
            id="cust_sim_purge",
            org_id=settings.DEFAULT_ORG_ID,
            primary_phone="+919876543210",
            name="Simulation Prospect",
        )
        session.add(cust)
        await session.flush()
        conv = Conversation(
            id="conv_sim_purge",
            org_id=settings.DEFAULT_ORG_ID,
            customer_id=cust.id,
            channel="simulation",
            channel_id="+919876543210",
            mode="AI",
        )
        session.add(conv)
        await session.flush()
        msg = Message(
            org_id=settings.DEFAULT_ORG_ID,
            conversation_id=conv.id,
            direction="inbound",
            sender_type="customer",
            content="Purge me",
            delivery_status="received",
        )
        session.add(msg)
        await session.commit()

    # 2. Call purge simulations
    purge_res = await client.post("/api/v1/conversations/simulations/purge")
    assert purge_res.status_code == 200
    p_data = purge_res.json()
    assert p_data["success"] is True
    assert p_data["deleted_conversations"] >= 1

    # 3. Verify simulated conversation is deleted
    get_res = await client.get("/api/v1/conversations/conv_sim_purge")
    assert get_res.status_code == 404

