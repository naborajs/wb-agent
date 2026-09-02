"""
Unit tests for FollowupScheduler, HandoffService, and NotificationService.
"""

from datetime import timedelta
import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.database.base import Base, utc_now
from app.database.models import Organization, Customer, Conversation, FollowupJob, Notification, Handoff
from app.followups.scheduler import FollowupScheduler
from app.handoffs.service import HandoffService
from app.notifications.service import NotificationService


@pytest.fixture
async def setup_followup_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_followup_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Followup Org", slug="followup-org")
        session.add(org)

        customer = Customer(
            id="cust_f1",
            org_id=org_id,
            primary_phone="+918900653250",
            name="Rahul Sharma",
            company_name="Heritage Cafe",
            opt_in_status=True,
        )
        session.add(customer)

        conv = Conversation(
            id="conv_f1",
            org_id=org_id,
            customer_id=customer.id,
            channel="whatsapp",
            channel_id="+918900653250",
            mode="AI",
            sales_stage="DISCOVERY",
        )
        session.add(conv)
        await session.commit()

    async with session_factory() as session:
        yield session, org_id, "conv_f1", "cust_f1"

    await engine.dispose()


@pytest.mark.asyncio
async def test_followup_scheduling_and_cancellation(setup_followup_db):
    session, org_id, conv_id, cust_id = setup_followup_db
    scheduler = FollowupScheduler(session, org_id)

    # 1. Schedule 3-step sequence
    jobs = await scheduler.schedule_sequence(conv_id, cust_id)
    assert len(jobs) == 3
    assert jobs[0].step == 1
    assert jobs[1].step == 2
    assert jobs[2].step == 3
    assert all(j.status == "scheduled" for j in jobs)

    # 2. Customer replies -> cancel all pending
    cancelled_count = await scheduler.cancel_pending_followups(conv_id, reason="customer_replied")
    assert cancelled_count == 3

    # Verify status in database
    stmt = select(FollowupJob).where(FollowupJob.conversation_id == conv_id)
    res = await session.execute(stmt)
    db_jobs = res.scalars().all()
    assert all(j.status == "cancelled" for j in db_jobs)
    assert all(j.cancel_reason == "customer_replied" for j in db_jobs)


@pytest.mark.asyncio
async def test_followup_execution_with_preflight_guards(setup_followup_db):
    session, org_id, conv_id, cust_id = setup_followup_db
    scheduler = FollowupScheduler(session, org_id)

    # Create a job that is already due (scheduled_for in the past)
    past_time = utc_now() - timedelta(minutes=5)
    due_job = FollowupJob(
        org_id=org_id,
        conversation_id=conv_id,
        customer_id=cust_id,
        scheduled_for=past_time,
        step=1,
        status="scheduled",
    )
    session.add(due_job)
    await session.commit()

    # Run evaluation
    results = await scheduler.evaluate_and_execute_due()
    assert len(results) == 1
    assert results[0]["status"] == "sent"

    # Verify job status in DB is now 'sent'
    job_db = await session.get(FollowupJob, due_job.id)
    assert job_db.status == "sent"


@pytest.mark.asyncio
async def test_handoff_and_owner_notifications(setup_followup_db):
    session, org_id, conv_id, cust_id = setup_followup_db
    handoff_svc = HandoffService(session, org_id)
    notif_svc = NotificationService(session, org_id)

    # 1. Create handoff
    handoff = await handoff_svc.create_handoff(
        conversation_id=conv_id,
        reason="high_value_order",
        summary="Customer wants to purchase 1000kg custom blend.",
        customer_intent="Custom quotation required",
        notify_owner=True,
    )
    assert handoff.id is not None
    assert handoff.status == "pending"

    # Verify conversation mode changed to HUMAN
    conv = await session.get(Conversation, conv_id)
    assert conv.mode == "HUMAN"
    assert conv.sales_stage == "HUMAN_HANDOFF"

    # 2. Test owner hot lead notification format
    notif = await notif_svc.notify_hot_lead(
        customer_name="Rahul Sharma",
        phone="+918900653250",
        company="Heritage Cafe",
        location="Siliguri",
        product="Assam Kadak CTC",
        quantity="100kg/month",
        budget="₹35,000",
        score=92,
        stage="PURCHASE_INTENT",
        customer_quote="Ready to place order.",
        ai_summary="Buyer approved pricing.",
    )
    assert notif.recipient == "+918900653250"
    assert "🔥 HOT LEAD" in notif.content
    assert "Assam Kadak CTC" in notif.content

    # 3. Resolve handoff and restore AI mode
    resolved = await handoff_svc.resolve_handoff(handoff.id, resume_ai=True)
    assert resolved.status == "resolved"
    assert resolved.resolved_at is not None

    refreshed_conv = await session.get(Conversation, conv_id)
    assert refreshed_conv.mode == "AI"
