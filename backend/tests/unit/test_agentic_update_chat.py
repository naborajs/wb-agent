"""
Unit Tests for Dual-Brain Agentic Update Chat:
Tests Friday proposal formulation, EDITH guardrail checking (acceptance and autonomous refusal),
and atomic commit to the unified Knowledge Hub.
"""

from decimal import Decimal
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.main import app
from app.config import settings
from app.database.base import Base
from app.database.session import get_db
from app.database.models import (
    InterBrainMessage,
    KnowledgeCategory,
    KnowledgeItem,
    Organization,
    PricingRule,
)
from app.brain.inter_brain_bus import FridayBrain, EdithBrain, inter_brain_bus


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
async def test_friday_formulate_knowledge_update(test_session: AsyncSession):
    """
    Verifies that Friday accurately extracts pricing intent, numbers, and category from plain English.
    """
    friday = FridayBrain()
    proposal = await friday.formulate_knowledge_update(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        operator_instruction="Increase Tier 2 volume discount to 12% for 200 units",
    )

    assert proposal["category"] == KnowledgeCategory.PRICING_RULE.value
    assert proposal["fields"]["discount_percentage"] == 12.0
    assert proposal["fields"]["min_quantity"] == 200.0
    assert "Tier" in proposal["title"]


@pytest.mark.asyncio
async def test_edith_guardrail_acceptance_and_denial(test_session: AsyncSession):
    """
    Verifies that EDITH approves discounts under the 15% ceiling and autonomously denies
    discounts that exceed it, supplying a strategic counter-suggestion.
    """
    edith = EdithBrain()

    # 1. Test Acceptable Discount (12%)
    valid_proposal = {
        "category": "pricing_rule",
        "action": "create",
        "title": "Tier 2: 200+ Units (12% Discount)",
        "fields": {"discount_percentage": 12.0, "min_quantity": 200.0},
        "raw_instruction": "Set 12% discount for 200 units",
    }
    accept_res = await edith.evaluate_knowledge_update(test_session, settings.DEFAULT_ORG_ID, valid_proposal)
    assert accept_res["decision"] == "ACCEPTED"
    assert "complies" in accept_res["reasoning"]

    # 2. Test Excessive Discount (25% > 15% threshold)
    excessive_proposal = {
        "category": "pricing_rule",
        "action": "create",
        "title": "Super Discount Tier",
        "fields": {"discount_percentage": 25.0, "min_quantity": 50.0},
        "raw_instruction": "Give 25% discount for 50 units",
    }
    deny_res = await edith.evaluate_knowledge_update(test_session, settings.DEFAULT_ORG_ID, excessive_proposal)
    assert deny_res["decision"] == "DENIED"
    assert "exceeds" in deny_res["reasoning"]
    assert deny_res["suggestion"] is not None
    assert "Strategic Counter-Proposal" in deny_res["suggestion"]


@pytest.mark.asyncio
async def test_dispatch_knowledge_update_e2e(test_session: AsyncSession):
    """
    Tests end-to-end deliberation through the InterBrainBus:
    Verifies that accepted updates are committed to KnowledgeItem, synchronized to PricingRule,
    and recorded in InterBrainMessage.
    """
    org_id = settings.DEFAULT_ORG_ID

    # 1. Dispatch acceptable update
    res = await inter_brain_bus.dispatch_knowledge_update(
        session=test_session,
        org_id=org_id,
        operator_instruction="Add a volume discount tier of 10% for 150 units",
    )

    assert res["success"] is True
    assert res["decision"] == "ACCEPTED"
    assert res["resulting_item"] is not None
    assert "EDITH" in res["reply_text"]

    # Verify KnowledgeItem in DB
    item_stmt = select(KnowledgeItem).where(KnowledgeItem.org_id == org_id, KnowledgeItem.category == "pricing_rule")
    item = (await test_session.execute(item_stmt)).scalar_one_or_none()
    assert item is not None
    assert item.discount_percentage == Decimal("10.0")
    assert item.chunk_count >= 1

    # Verify PricingRule synced
    pr_stmt = select(PricingRule).where(PricingRule.org_id == org_id)
    pr = (await test_session.execute(pr_stmt)).scalar_one_or_none()
    assert pr is not None
    assert pr.discount_percentage == Decimal("10.0")

    # Verify InterBrainMessage logged
    msg_stmt = select(InterBrainMessage).where(InterBrainMessage.org_id == org_id)
    msgs = (await test_session.execute(msg_stmt)).scalars().all()
    assert len(msgs) >= 2  # 1 proposal from Friday + 1 verdict from EDITH


@pytest.mark.asyncio
async def test_knowledge_update_api_endpoint(test_session: AsyncSession):
    """
    Tests HTTP POST /api/v1/knowledge/update-request endpoint.
    """
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as ac:
            # 1. Accept scenario
            resp = await ac.post(
                "/api/v1/knowledge/update-request",
                json={"message": "Set 8% volume discount for 80 units"},
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["decision"] == "ACCEPTED"
            assert data["success"] is True

            # 2. Refusal scenario (> 15% discount)
            resp_refusal = await ac.post(
                "/api/v1/knowledge/update-request",
                json={"message": "Give 30% discount for 50 units"},
            )
            assert resp_refusal.status_code == 200
            data_refusal = resp_refusal.json()
            assert data_refusal["decision"] == "DENIED"
            assert data_refusal["success"] is False
            assert "exceeds" in data_refusal["edith_evaluation"]["reasoning"]
    finally:
        app.dependency_overrides.pop(get_db, None)
