"""
Unit tests for SalesStageManager, LeadScoringEngine, JobQueue, and Worker execution.
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, Customer, Conversation, Job
from app.agent.sales_stage import SalesStageManager
from app.agent.scoring import LeadScoringEngine
from app.jobs.queue import JobQueue
from app.jobs.worker import Worker
from app.jobs.registry import register_handler


def test_sales_stage_manager_transitions():
    assert SalesStageManager.can_transition("NEW", "CONTACTED") is True
    assert SalesStageManager.can_transition("CONTACTED", "DISCOVERY") is True
    assert SalesStageManager.can_transition("DISCOVERY", "QUALIFIED") is True
    assert SalesStageManager.can_transition("DISCOVERY", "WON") is False  # Cannot jump directly to WON
    assert SalesStageManager.can_transition("OPTED_OUT", "QUALIFIED") is False  # Terminal state


def test_lead_scoring_engine():
    # Base score 10
    score, changes = LeadScoringEngine.evaluate_signals(
        10,
        ["reply_received", "volume_specified", "price_requested"]
    )
    # 10 + 10 (reply) + 15 (volume) + 10 (price) = 45
    assert score == 45
    assert len(changes) == 3

    # Clamping at 100
    score_max, _ = LeadScoringEngine.evaluate_signals(90, ["purchase_intent", "sample_requested"])
    assert score_max == 100

    # Opt out penalty
    score_opt, _ = LeadScoringEngine.evaluate_signals(50, ["opt_out"])
    assert score_opt == 0


@pytest.mark.asyncio
async def test_job_queue_and_worker_execution():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_jobs_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Jobs Org", slug="jobs-org")
        session.add(org)
        await session.commit()

    # 1. Enqueue job
    async with session_factory() as session:
        queue = JobQueue(session)
        job = await queue.enqueue(
            org_id=org_id,
            job_type="test_custom_job",
            payload={"msg": "hello job"},
            priority=10
        )
        assert job.id is not None
        assert job.status == "pending"

    # Register custom test handler
    executed_payload = {}
    async def sample_handler(session, org_id, payload, worker_id):
        executed_payload.update(payload)
        return {"status": "ok"}

    register_handler("test_custom_job", sample_handler)

    # 2. Worker executes one job
    worker = Worker("test_worker_1")
    async with session_factory() as session:
        processed = await worker.execute_one(session)
        assert processed is True
        assert executed_payload.get("msg") == "hello job"

        # Verify job is completed in database
        queue = JobQueue(session)
        next_job = await queue.claim_next_job("test_worker_1")
        assert next_job is None  # Queue should now be empty

    # 3. Test failure and dead letter
    async def failing_handler(session, org_id, payload, worker_id):
        raise RuntimeError("External network failure")

    register_handler("failing_job", failing_handler)

    async with session_factory() as session:
        queue = JobQueue(session)
        f_job = await queue.enqueue(
            org_id=org_id,
            job_type="failing_job",
            payload={"test": "fail"},
            max_attempts=1  # Immediate dead letter
        )

    async with session_factory() as session:
        processed = await worker.execute_one(session)
        assert processed is True

        # Verify job is marked dead_letter
        job_in_db = await session.get(Job, f_job.id)
        assert job_in_db.status == "dead_letter"
        assert "External network failure" in job_in_db.last_error

    await engine.dispose()
