"""
Unit tests for WhatsApp Group message suppression and operator notification (ADR 0024).
Verifies:
1. Group JID recognition.
2. AgentOrchestrator suppression: AI never auto-replies to group chats.
3. Webhook handling: Group messages create AgentNotification, set mode to HUMAN, and never enqueue AI turns.
"""

import pytest
from unittest.mock import AsyncMock, patch
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select

from app.database.base import Base
from app.database.models import Organization, Customer, Conversation, Message, AgentNotification
from app.agent.orchestrator import AgentOrchestrator
from app.utils.phone import is_whatsapp_group_jid, normalize_phone_number, clean_phone_digits
from app.whatsapp.models import InboundWhatsAppEvent
from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider


def test_whatsapp_group_jid_helpers():
    """Verify group JID detection and formatting pass-throughs."""
    group_jid = "120363024845918234@g.us"
    direct_jid = "918900653250@s.whatsapp.net"
    phone_number = "+918900653250"

    assert is_whatsapp_group_jid(group_jid) is True
    assert is_whatsapp_group_jid(direct_jid) is False
    assert is_whatsapp_group_jid(phone_number) is False
    assert is_whatsapp_group_jid("") is False
    assert is_whatsapp_group_jid(None) is False

    # Ensure normalization doesn't strip or corrupt group JIDs
    assert clean_phone_digits(group_jid) == group_jid
    assert normalize_phone_number(group_jid) == group_jid


def test_simulator_parses_group_payload():
    """Verify simulator provider correctly extracts group metadata."""
    sim = SimulatorWhatsAppProvider()
    group_payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "120363024845918234@g.us",
                                    "id": "baileys_msg_12345",
                                    "is_group": True,
                                    "group_id": "120363024845918234@g.us",
                                    "group_name": "Tea Wholesalers West Bengal",
                                    "participant": "+919832439994",
                                    "text": {"body": "Looking for 500kg Assam CTC bulk supply"},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    events = sim.parse_webhook(group_payload)
    assert len(events) == 1
    event = events[0]
    assert event.is_group is True
    assert event.group_id == "120363024845918234@g.us"
    assert event.group_name == "Tea Wholesalers West Bengal"
    assert event.participant == "+919832439994"
    assert event.sender_phone == "120363024845918234@g.us"
    assert event.content == "Looking for 500kg Assam CTC bulk supply"


@pytest.fixture
async def group_test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_group_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Group Test Org", slug="group-test")
        session.add(org)

        group_jid = "120363024845918234@g.us"
        group_cust = Customer(
            id="cust_group_1",
            org_id=org_id,
            primary_phone=group_jid,
            name="Tea Wholesalers West Bengal",
            company_name="Tea Wholesalers West Bengal",
            company_type="whatsapp_group",
            preferred_language="English",
            opt_in_status=True,
        )
        session.add(group_cust)

        conv = Conversation(
            id="conv_group_1",
            org_id=org_id,
            customer_id=group_cust.id,
            channel="whatsapp",
            channel_id=group_jid,
            mode="HUMAN",
            sales_stage="NEW",
            lead_score=10,
            metadata_json={"is_group": True, "group_name": "Tea Wholesalers West Bengal"},
        )
        session.add(conv)
        await session.commit()

    try:
        yield engine, session_factory, org_id
    finally:
        await engine.dispose()


@pytest.mark.asyncio
async def test_orchestrator_suppresses_group_turn(group_test_db):
    """Verify AgentOrchestrator rejects and suppresses any turn processing on group chats."""
    engine, session_factory, org_id = group_test_db

    async with session_factory() as session:
        orchestrator = AgentOrchestrator(session, org_id)

        resp = await orchestrator.process_turn(
            conversation_id="conv_group_1",
            inbound_message="Can anyone provide pricing for 200 bags of orthodox tea?",
            sender_id="+919832439994",
        )

        assert resp.is_suppressed is True
        assert resp.reply_text == ""
        assert resp.decision.reason_code == "GROUP_MESSAGE_AI_DISABLED"
        assert resp.decision.intent == "group_chat_suppressed"

        # Verify conversation remained in HUMAN mode
        conv_stmt = select(Conversation).where(Conversation.id == "conv_group_1")
        conv = (await session.execute(conv_stmt)).scalar_one()
        assert conv.mode == "HUMAN"


@pytest.mark.asyncio
async def test_orchestrator_suppresses_even_if_mode_was_ai(group_test_db):
    """Defense-in-depth: Even if a group conversation was mistakenly marked 'AI', orchestrator suppresses it."""
    engine, session_factory, org_id = group_test_db

    async with session_factory() as session:
        conv_stmt = select(Conversation).where(Conversation.id == "conv_group_1")
        conv = (await session.execute(conv_stmt)).scalar_one()
        conv.mode = "AI"
        await session.commit()

        orchestrator = AgentOrchestrator(session, org_id)
        resp = await orchestrator.process_turn(
            conversation_id="conv_group_1",
            inbound_message="Do you have any discount for cash payment?",
            sender_id="+919832439994",
        )

        assert resp.is_suppressed is True
        assert resp.decision.reason_code == "GROUP_MESSAGE_AI_DISABLED"

        # Check it auto-corrected mode back to HUMAN
        await session.refresh(conv)
        assert conv.mode == "HUMAN"


@pytest.mark.asyncio
async def test_webhook_inbound_group_message_creates_notification_and_sets_mode_human(group_test_db):
    """
    Verify receiving a group webhook:
    1. Creates Customer with company_type='whatsapp_group'
    2. Sets conversation mode to 'HUMAN'
    3. Saves inbound message with participant info
    4. Dispatches AgentNotification
    5. Does NOT enqueue an AI process_message job
    """
    from httpx import ASGITransport, AsyncClient
    from app.main import app
    from app.database.session import get_db
    from app.database.models import Job

    engine, session_factory, org_id = group_test_db

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db

    payload = {
        "entry": [
            {
                "changes": [
                    {
                        "value": {
                            "messages": [
                                {
                                    "from": "120363099999999999@g.us",
                                    "id": "baileys_grp_test_01",
                                    "is_group": True,
                                    "group_id": "120363099999999999@g.us",
                                    "group_name": "Siliguri Tea Auction Traders",
                                    "participant": "+919832000001",
                                    "text": {"body": "Need wholesale price sheet for Darjeeling FOP"},
                                }
                            ]
                        }
                    }
                ]
            }
        ]
    }

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post("/api/v1/webhooks/whatsapp", json=payload)
            assert resp.status_code == 200
            data = resp.json()
            assert data["status"] == "received"

        # Verify database state
        async with session_factory() as session:
            # 1. Customer created
            cust_stmt = select(Customer).where(Customer.primary_phone == "120363099999999999@g.us")
            cust = (await session.execute(cust_stmt)).scalar_one_or_none()
            assert cust is not None
            assert cust.company_type == "whatsapp_group"
            assert "Siliguri Tea Auction Traders" in cust.name

            # 2. Conversation created with mode="HUMAN"
            conv_stmt = select(Conversation).where(Conversation.channel_id == "120363099999999999@g.us")
            conv = (await session.execute(conv_stmt)).scalar_one_or_none()
            assert conv is not None
            assert conv.mode == "HUMAN"
            assert conv.metadata_json.get("is_group") is True

            # 3. Message recorded
            msg_stmt = select(Message).where(Message.conversation_id == conv.id)
            msgs = (await session.execute(msg_stmt)).scalars().all()
            assert len(msgs) == 1
            assert msgs[0].content == "Need wholesale price sheet for Darjeeling FOP"
            assert msgs[0].direction == "inbound"
            assert msgs[0].sender_id == "+919832000001"

            # 4. AgentNotification created
            notif_stmt = select(AgentNotification).where(
                AgentNotification.category == "GROUP_MESSAGE",
                AgentNotification.action_url == f"/conversations?id={conv.id}",
            )
            notif = (await session.execute(notif_stmt)).scalar_one_or_none()
            assert notif is not None
            assert "Siliguri Tea Auction Traders" in notif.title
            assert "AI auto-reply is paused" in notif.content
            assert notif.severity == "warning"

            # 5. Verify NO background process_message job enqueued
            job_stmt = select(Job).where(Job.type == "process_message")
            jobs = (await session.execute(job_stmt)).scalars().all()
            assert len(jobs) == 0
    finally:
        app.dependency_overrides.clear()
