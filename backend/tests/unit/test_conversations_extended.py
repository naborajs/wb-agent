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
    conv_id = data["conversation_id"]

    # 2. Verify conversation details via API
    detail_res = await client.get(f"/api/v1/conversations/{conv_id}")
    assert detail_res.status_code == 200
    conv_data = detail_res.json()
    assert conv_data["customer"]["name"] == "Kavita Rao"
    assert len(conv_data["messages"]) == 1
    assert "bulk tea inquiry" in conv_data["messages"][0]["content"]


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
