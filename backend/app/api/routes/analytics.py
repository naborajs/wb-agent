"""
Analytics and operational metrics API endpoints (Section 47 & 115).
"""

from decimal import Decimal
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.models import Conversation, Deal, Handoff, Job, Lead, Message
from app.database.session import get_db

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
async def get_analytics_overview(session: AsyncSession = Depends(get_db)):
    """Computes live sales operational metrics."""
    org_id = settings.DEFAULT_ORG_ID

    # Leads count
    total_leads = (await session.execute(
        select(func.count()).select_from(Lead).where(Lead.org_id == org_id)
    )).scalar() or 0

    # Conversations count
    total_convs = (await session.execute(
        select(func.count()).select_from(Conversation).where(Conversation.org_id == org_id)
    )).scalar() or 0

    # Hot leads
    hot_leads = (await session.execute(
        select(func.count()).select_from(Conversation).where(Conversation.org_id == org_id, Conversation.is_hot == True)
    )).scalar() or 0

    # Pending handoffs
    pending_handoffs = (await session.execute(
        select(func.count()).select_from(Handoff).where(Handoff.org_id == org_id, Handoff.status == "pending")
    )).scalar() or 0

    # Won deals & pipeline value
    won_deals = (await session.execute(
        select(func.count()).select_from(Deal).where(Deal.org_id == org_id, Deal.stage == "won")
    )).scalar() or 0

    pipeline_res = (await session.execute(
        select(func.sum(Deal.estimated_value)).where(Deal.org_id == org_id, Deal.stage != "lost")
    )).scalar() or Decimal("0.0")

    # Queue depth
    queue_depth = (await session.execute(
        select(func.count()).select_from(Job).where(Job.org_id == org_id, Job.status.in_(["pending", "running"]))
    )).scalar() or 0

    # Conversion rate
    conversion_rate = round((won_deals / total_leads * 100), 1) if total_leads > 0 else 0.0

    return {
        "leads_total": total_leads,
        "conversations_total": total_convs,
        "hot_leads": hot_leads,
        "pending_handoffs": pending_handoffs,
        "won_deals": won_deals,
        "pipeline_value_inr": float(pipeline_res),
        "queue_depth": queue_depth,
        "conversion_rate_pct": conversion_rate,
        "system_status": "operational",
    }


@router.get("/funnel")
async def get_sales_funnel(session: AsyncSession = Depends(get_db)):
    """Computes distribution of conversations across the sales funnel stages."""
    org_id = settings.DEFAULT_ORG_ID
    stmt = (
        select(Conversation.sales_stage, func.count(Conversation.id))
        .where(Conversation.org_id == org_id)
        .group_by(Conversation.sales_stage)
    )
    res = await session.execute(stmt)
    distribution = {stage: count for stage, count in res.all()}

    stages = [
        "NEW",
        "CONTACTED",
        "DISCOVERY",
        "QUALIFIED",
        "RECOMMENDATION",
        "OBJECTION",
        "NEGOTIATION",
        "PURCHASE_INTENT",
        "HUMAN_HANDOFF",
        "WON",
    ]
    return [{"stage": s, "count": distribution.get(s, 0)} for s in stages]
