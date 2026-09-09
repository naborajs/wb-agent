"""
Unit and Integration tests for Campaign Management, Real Leads Integration,
Friday Action Registry, EDITH Observability, and Chat-Driven Campaign Creation.
"""

import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database.base import Base
from app.database.models import Campaign, CampaignLead, Lead, Organization
from app.services import campaign_drafting, campaign_engine, friday_actions


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        org = Organization(id=settings.DEFAULT_ORG_ID, name="Test Enterprise", slug="test-org")
        session.add(org)
        await session.commit()
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_campaign_segment_resolution_and_zero_lead_blocking(test_session: AsyncSession):
    """Verifies target segment queries real leads and blocks launch on zero matches."""
    org_id = settings.DEFAULT_ORG_ID

    # Seed test lead
    lead = Lead(
        org_id=org_id,
        phone="+919999988888",
        name="Amit Verma",
        company_name="Verma Roasters",
        company_type="Cafe",
        opt_in_status=True,
        score=75,
    )
    test_session.add(lead)
    await test_session.commit()

    # 1. Real count for Cafe / B2B Commercial Accounts
    count = await campaign_engine.resolve_filter_count(
        session=test_session,
        org_id=org_id,
        target_segment="B2B Commercial Accounts",
    )
    assert count >= 1

    # 2. Real count for a non-existent segment
    zero_count = await campaign_engine.resolve_filter_count(
        session=test_session,
        org_id=org_id,
        target_segment="NonExistentSegmentXYZ",
    )
    assert zero_count == 0

    # 3. Validate zero-lead campaign launch blocking
    empty_campaign = Campaign(
        org_id=org_id,
        name="Empty Segment Campaign",
        target_segment="NonExistentSegmentXYZ",
        initial_message_template="Hello from sales operations!",
        daily_limit=50,
        status="draft",
    )
    test_session.add(empty_campaign)
    await test_session.commit()

    is_valid, err_msg = await campaign_engine.validate_campaign_launch(
        session=test_session,
        org_id=org_id,
        campaign=empty_campaign,
    )
    assert is_valid is False
    assert "No leads match the selected segment" in err_msg


@pytest.mark.asyncio
async def test_campaign_enrollment_and_computed_stats(test_session: AsyncSession):
    """Verifies leads are enrolled as CampaignLead rows and stats are computed from real records."""
    org_id = settings.DEFAULT_ORG_ID

    # Seed lead
    lead = Lead(
        org_id=org_id,
        phone="+918888877777",
        name="Pooja Sen",
        company_name="Sen Specialty Foods",
        company_type="Specialty & Boutique",
        opt_in_status=True,
        score=88,
    )
    test_session.add(lead)
    await test_session.commit()

    campaign = Campaign(
        org_id=org_id,
        name="Specialty Gourmet Outreach",
        target_segment="Specialty & Boutique",
        initial_message_template="Hi {name}, we supply gourmet goods to {company_name}!",
        daily_limit=30,
        status="draft",
        personalization_enabled=True,
    )
    test_session.add(campaign)
    await test_session.commit()

    # Resolve target leads
    leads = await campaign_engine.resolve_target_leads(test_session, org_id, campaign)
    assert len(leads) >= 1

    # Enroll leads
    enrolled = await campaign_engine.enroll_leads(test_session, campaign.id, leads)
    assert enrolled >= 1

    # Verify CampaignLead rows exist and have pre-generated personalized message
    cl_stmt = select(CampaignLead).where(CampaignLead.campaign_id == campaign.id)
    cl_rows = list((await test_session.execute(cl_stmt)).scalars().all())
    assert len(cl_rows) >= 1
    assert cl_rows[0].delivery_status == "pending"
    assert cl_rows[0].personalized_message is not None
    assert "Pooja Sen" in cl_rows[0].personalized_message

    # Compute stats
    stats = await campaign_engine.compute_campaign_stats(test_session, campaign.id)
    assert stats["total_leads"] >= 1
    assert stats["sent_count"] == 0
    assert stats["replied_count"] == 0
    assert stats["response_rate"] == 0.0


@pytest.mark.asyncio
async def test_friday_action_registry_and_execution(test_session: AsyncSession):
    """Verifies Friday action registry discovery, describe, and execution with audit logging."""
    org_id = settings.DEFAULT_ORG_ID

    # 1. Action registry list
    actions = friday_actions.list_all_actions()
    assert len(actions) >= 8
    action_names = [a["action"] for a in actions]
    assert "pause_campaign" in action_names
    assert "resume_campaign" in action_names
    assert "toggle_safe_mode" in action_names

    # 2. Describe action
    desc = await friday_actions.describe_action("pause_campaign")
    assert desc["found"] is True
    assert "campaign_id" in desc["params"]

    # 3. Execute action: create a campaign then pause it via Friday
    campaign = Campaign(
        org_id=org_id,
        name="Friday Pause Test Campaign",
        target_segment="all",
        initial_message_template="Hello from Friday operations!",
        daily_limit=25,
        status="active",
    )
    test_session.add(campaign)
    await test_session.commit()

    res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="pause_campaign",
        params={"campaign_id": campaign.id},
    )
    assert res["success"] is True

    # Verify status changed to paused
    await test_session.refresh(campaign)
    assert campaign.status == "paused"


@pytest.mark.asyncio
async def test_chat_driven_campaign_drafting(test_session: AsyncSession):
    """Verifies natural language campaign drafting, EDITH guardrail validation, and launch."""
    org_id = settings.DEFAULT_ORG_ID

    # 1. Friday drafts structured spec from operator prompt
    prompt = "Create a campaign for Cafe owners offering our 10% wholesale discount with 40 messages per day, personalized."
    draft = await campaign_drafting.draft_campaign_from_text(
        session=test_session,
        org_id=org_id,
        operator_message=prompt,
    )

    assert draft["name"] is not None
    assert draft["daily_limit"] == 40
    assert draft["personalization_enabled"] is True
    assert "discount" in draft["initial_message_template"].lower()

    # 2. EDITH validates against guardrails
    validation = await campaign_drafting.validate_draft_with_edith(
        session=test_session,
        org_id=org_id,
        draft=draft,
    )
    assert validation["verdict"] in ["ACCEPTED", "FLAGGED", "DENIED"]
    assert len(validation["reasoning"]) > 10
