"""
Unit Tests for Friday Autonomous Problem & Issue Reporting System.
Verifies explicit user reporting, capability gap detection, internal error trapping,
report querying, report resolution, and REST API endpoints.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.config import settings
from app.database.base import Base
from app.database.models import Organization, FridayProblemReport, AgentNotification
from app.brain.inter_brain_bus import FridayBrain
from app.services.friday_report_service import FridayReportService
from app.services import friday_actions


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        org = Organization(id=settings.DEFAULT_ORG_ID, name="Commercial Enterprise", slug="commercial-enterprise")
        session.add(org)
        await session.commit()
        yield session
    await engine.dispose()


@pytest.mark.asyncio
async def test_friday_report_service_lifecycle(test_session: AsyncSession):
    """
    Verifies full lifecycle of FridayReportService:
    record -> list -> resolve.
    """
    # 1. Record
    rep = await FridayReportService.record_problem(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        category="INTERNAL_ERROR",
        title="Test Database Connection Dropped",
        description="Pool exhausted during benchmark test run.",
        user_instruction="run full benchmark",
        suggested_fix="Increase connection pool size to 20.",
        severity="high",
    )

    assert rep["report_code"].startswith("REP-")
    assert rep["category"] == "INTERNAL_ERROR"
    assert rep["status"] == "open"
    assert rep["title"] == "Test Database Connection Dropped"

    # Verify AgentNotification was also generated
    notif_stmt = select(AgentNotification).where(AgentNotification.category == "SYSTEM_ALERT")
    notif = (await test_session.execute(notif_stmt)).scalar_one_or_none()
    assert notif is not None
    assert rep["report_code"] in notif.title

    # 2. List
    reports = await FridayReportService.list_reports(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        category="INTERNAL_ERROR",
    )
    assert len(reports) == 1
    assert reports[0]["report_code"] == rep["report_code"]

    # 3. Resolve
    resolved = await FridayReportService.resolve_report(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        report_id_or_code=rep["report_code"],
        resolved_by="lead_developer",
        resolution_notes="Increased SQLite pool ceiling in config.",
    )
    assert resolved is not None
    assert resolved["status"] == "resolved"
    assert resolved["resolved_by"] == "lead_developer"


@pytest.mark.asyncio
async def test_friday_chat_explicit_user_report(test_session: AsyncSession):
    """
    Verifies that when a user says 'report this problem: ...',
    Friday captures the report, saves it, and responds with the report code.
    """
    friday = FridayBrain()
    res = await friday.chat(
        user_message="Friday, report this problem: The playground could not load the Nemotron 550B model weights.",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )

    assert res["speaker"] == "Friday"
    assert "REP-" in res["reply"]
    assert "Problem Report Filed Successfully" in res["reply"]
    assert "problem_report" in res
    assert res["problem_report"]["category"] == "USER_REPORTED"
    assert "Nemotron 550B" in res["problem_report"]["description"]


@pytest.mark.asyncio
async def test_friday_chat_report_inquiry_and_resolution(test_session: AsyncSession):
    """
    Verifies that Friday can summarize open reports and resolve a report when commanded.
    """
    # Seed an open report
    rep = await FridayReportService.record_problem(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        category="CAPABILITY_GAP",
        title="Voice Interruption Latency Spike",
        description="High turn latency on local websocket audio loop.",
        severity="medium",
    )

    friday = FridayBrain()

    # Query reports
    inquiry_res = await friday.chat(
        user_message="What problems are reported?",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert inquiry_res["speaker"] == "Friday"
    assert rep["report_code"] in inquiry_res["reply"]
    assert "Voice Interruption Latency Spike" in inquiry_res["reply"]

    # Resolve report via chat
    resolve_res = await friday.chat(
        user_message=f"Resolve report {rep['report_code']}",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert resolve_res["speaker"] == "Friday"
    assert "Resolved!" in resolve_res["reply"]
    assert rep["report_code"] in resolve_res["reply"]


@pytest.mark.asyncio
async def test_friday_chat_capability_gap_auto_logging(test_session: AsyncSession):
    """
    Verifies that when the user asks Friday to perform an unsupported action,
    Friday automatically registers a CAPABILITY_GAP report.
    """
    friday = FridayBrain()
    res = await friday.chat(
        user_message="Please export the database to Google Drive automatically every night",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )

    assert res["speaker"] == "Friday"
    assert "Capability Gap" in res["reply"]
    assert "problem_report" in res
    assert res["problem_report"]["category"] == "CAPABILITY_GAP"
    assert res["problem_report"]["report_code"].startswith("REP-")


@pytest.mark.asyncio
async def test_friday_action_failure_auto_reporting(test_session: AsyncSession):
    """
    Verifies that calling an unregistered action or failed action automatically
    logs a problem report with full telemetry.
    """
    res = await friday_actions.execute_action(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        action_name="unregistered_quantum_sync",
        params={"speed": "light"},
    )

    assert res["success"] is False
    assert "report_code" in res
    assert res["report_code"].startswith("REP-")

    # Verify it exists in database
    stmt = select(FridayProblemReport).where(FridayProblemReport.report_code == res["report_code"])
    entry = (await test_session.execute(stmt)).scalar_one_or_none()
    assert entry is not None
    assert entry.category == "CAPABILITY_GAP"
    assert "unregistered_quantum_sync" in entry.title


@pytest.mark.asyncio
async def test_brain_reports_rest_api(test_session: AsyncSession):
    """
    Verifies REST API endpoints: POST, GET, and PATCH /api/v1/brain/reports.
    """
    async def override_get_db():
        yield test_session

    from app.database.session import get_db
    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. POST
        create_resp = await client.post(
            "/api/v1/brain/reports",
            json={
                "title": "API Test Error Report",
                "description": "Triggered during integration test run.",
                "category": "USER_REPORTED",
                "severity": "medium",
                "user_instruction": "test instruction",
            },
        )
        assert create_resp.status_code == 200
        data = create_resp.json()
        assert data["success"] is True
        report_code = data["report"]["report_code"]
        assert report_code.startswith("REP-")

        # 2. GET
        list_resp = await client.get("/api/v1/brain/reports?category=USER_REPORTED")
        assert list_resp.status_code == 200
        list_data = list_resp.json()
        assert list_data["success"] is True
        assert any(r["report_code"] == report_code for r in list_data["reports"])

        # 3. PATCH resolve
        patch_resp = await client.patch(
            f"/api/v1/brain/reports/{report_code}/resolve",
            json={
                "resolved_by": "qa_tester",
                "resolution_notes": "Verified resolved in automated suite.",
            },
        )
        assert patch_resp.status_code == 200
        patch_data = patch_resp.json()
        assert patch_data["success"] is True
        assert patch_data["report"]["status"] == "resolved"

    app.dependency_overrides.clear()
