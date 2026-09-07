"""
Unit Tests for Dual-Brain Operating System (Friday & EDITH)
and Live Codebase Self-Inspection / Meta-Cognitive APIs.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.config import settings
from app.database.base import Base
from app.database.models import Organization, Product, PricingRule, InterBrainMessage
from app.brain.inter_brain_bus import FridayBrain, EdithBrain, inter_brain_bus
from app.brain.code_service import CodebaseService


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
async def test_friday_self_identity(test_session: AsyncSession):
    """
    Verifies that Friday accurately identifies herself, references Gemini 3.1 Flash Live Preview,
    and explains that EDITH manages external WhatsApp sales.
    """
    friday = FridayBrain()
    res = await friday.chat(
        user_message="What is your name?",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert res["speaker"] == "Friday"
    assert "Friday" in res["reply"]
    assert "EDITH" in res["reply"]
    assert "gemini-3.1-flash-live-preview" in res["model"]
    assert res["consulted_edith"] is False


@pytest.mark.asyncio
async def test_edith_autonomous_refusal_with_suggestion(test_session: AsyncSession):
    """
    Verifies that EDITH autonomously evaluates a 35% discount request from Friday,
    DENIES it because it breaches the 15% threshold, and supplies a strategic counter-suggestion.
    """
    edith = EdithBrain()
    res = await edith.evaluate_task_request(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        task_description="Please send a special promo with 35% discount to this client.",
        target_phone="+91 98001 23456",
        requested_discount=35.0,
    )
    assert res["decision"] == "DENIED"
    assert res["policy_checked"] == "MAX_AUTONOMOUS_DISCOUNT_LIMIT"
    assert "35.0%" in res["reasoning"]
    assert "Strategic Suggestion" in res.get("suggestion", "")


@pytest.mark.asyncio
async def test_edith_autonomous_approval(test_session: AsyncSession):
    """
    Verifies that EDITH autonomously evaluates a compliant 10% volume discount request,
    and ACCEPTS the task.
    """
    edith = EdithBrain()
    res = await edith.evaluate_task_request(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        task_description="Please quote 10% volume discount for standard commercial package.",
        target_phone="+91 98001 99999",
        requested_discount=10.0,
    )
    assert res["decision"] == "ACCEPTED"
    assert "10.0%" in res["reasoning"]
    assert res["action_executed"] is True


@pytest.mark.asyncio
async def test_edith_emotional_debrief(test_session: AsyncSession):
    """
    Verifies that EDITH can post a customer tone debrief or knowledge gap to Friday over the bus.
    """
    debrief_res = await inter_brain_bus.post_edith_debrief(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        category="RUDE_CUSTOMER",
        details={
            "phone": "+91 98765 43210",
            "customer_message": "Your prices are ridiculous!",
            "sentiment_score": -0.85,
        },
    )
    assert debrief_res["id"] is not None
    assert debrief_res["category"] == "RUDE_CUSTOMER"
    assert "Friday" in debrief_res["content"] or "commercial policy" in debrief_res["content"].lower() or "hostile" in debrief_res["reasoning"].lower()


@pytest.mark.asyncio
async def test_codebase_service_inspection():
    """
    Verifies that Friday/EDITH code self-inspection can read files and prevent path traversal.
    """
    # 1. Valid file read
    read_res = CodebaseService.read_code_file("backend/app/config.py", 1, 30)
    assert read_res["total_lines"] > 20
    assert "Settings" in read_res["raw_content"]

    # 2. Path traversal security protection
    with pytest.raises(ValueError, match="Access denied"):
        CodebaseService.read_code_file("../../etc/passwd")


@pytest.mark.asyncio
async def test_codebase_service_search():
    """
    Verifies that AI brains can search their own codebase for symbols.
    """
    search_res = CodebaseService.search_codebase("GEMINI_MODEL", "backend/app", 10)
    assert search_res["matches_found"] > 0
    assert any("config.py" in m["file"] for m in search_res["matches"])


@pytest.mark.asyncio
async def test_codebase_service_diagnose_error():
    """
    Verifies that Friday/EDITH can analyze an exception traceback and formulate root cause diagnosis.
    """
    sample_error = (
        'AttributeError: \'Order\' object has no attribute \'total_cents\' in '
        'File "backend/app/api/routes/orders.py", line 167'
    )
    diag = CodebaseService.diagnose_error(sample_error)
    assert "Missing Attribute" in diag["diagnosis"]
    assert "total_cents" in diag["diagnosis"]
    assert diag["identified_file"] == "backend/app/api/routes/orders.py"
    assert diag["identified_line"] == 167


@pytest.mark.asyncio
async def test_system_diagnostics_endpoint(test_session: AsyncSession):
    """
    Verifies system diagnostics gathering table counts and active models.
    """
    diag = await CodebaseService.get_system_diagnostics(test_session, settings.DEFAULT_ORG_ID)
    assert diag["status"] == "healthy"
    assert "Google Gemini 3.1 Flash Live Preview" in diag["active_models"]["friday"]
    assert "leads" in diag["database_tables"]
    assert "inter_brain_messages" in diag["database_tables"]
