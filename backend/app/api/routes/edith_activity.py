"""
EDITH Activity & Observability API routes.
Provides real-time visibility into EDITH's autonomous dispatch, personalization,
and reply handling. All data is computed from real CampaignLead rows and Lead records.
One single source of truth.
"""

from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.models import Campaign, CampaignLead, Lead
from app.database.session import get_db

router = APIRouter(prefix="/edith/activity", tags=["EDITH Activity"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class SegmentActivity(BaseModel):
    segment: str
    leads_enrolled: int
    sent_count: int
    replied_count: int
    response_rate: float


class ContactedLeadItem(BaseModel):
    lead_id: str
    lead_name: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    phone: Optional[str] = None
    campaign_id: str
    campaign_name: str
    delivery_status: str
    sent_at: Optional[datetime] = None
    replied_at: Optional[datetime] = None
    personalized_message: Optional[str] = None


class EdithActivitySummary(BaseModel):
    total_messages_sent: int = Field(..., description="All-time dispatched messages across all campaigns")
    total_leads_contacted: int = Field(..., description="Distinct leads contacted")
    total_replies: int = Field(..., description="Total inbound replies received")
    overall_response_rate: float = Field(..., description="Aggregate response percentage")
    sent_today: int = Field(..., description="Messages dispatched in the current UTC day")
    replied_today: int = Field(..., description="Replies received in the current UTC day")
    active_campaigns_count: int = Field(..., description="Number of currently active campaigns")
    total_campaigns_count: int = Field(..., description="Total campaigns created")
    segment_breakdown: List[SegmentActivity] = Field(default_factory=list)


class CampaignActivityDetail(BaseModel):
    campaign_id: str
    campaign_name: str
    target_segment: str
    status: str
    total_leads: int
    sent_count: int
    replied_count: int
    response_rate: float
    leads_contacted: List[ContactedLeadItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/summary", response_model=EdithActivitySummary, summary="Get EDITH's aggregate activity telemetry")
async def get_activity_summary(
    session: AsyncSession = Depends(get_db),
):
    """
    Returns real-time aggregate activity for EDITH:
    total messages sent, distinct leads contacted, replies, response rates,
    and breakdown across all target segments. Computed from real CampaignLead rows.
    """
    now = datetime.now(timezone.utc)
    start_of_today = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # 1. Sent count (sent, delivered, replied)
    sent_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status.in_(["sent", "delivered", "replied"])
    )
    total_sent = (await session.execute(sent_stmt)).scalar() or 0

    # 2. Distinct leads contacted
    distinct_leads_stmt = select(func.count(func.distinct(CampaignLead.lead_id))).where(
        CampaignLead.delivery_status.in_(["sent", "delivered", "replied"])
    )
    total_leads_contacted = (await session.execute(distinct_leads_stmt)).scalar() or 0

    # 3. Replied count
    replied_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status == "replied"
    )
    total_replied = (await session.execute(replied_stmt)).scalar() or 0

    # 4. Sent today
    sent_today_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status.in_(["sent", "delivered", "replied"]),
        CampaignLead.sent_at >= start_of_today,
    )
    sent_today = (await session.execute(sent_today_stmt)).scalar() or 0

    # 5. Replied today
    replied_today_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status == "replied",
        CampaignLead.replied_at >= start_of_today,
    )
    replied_today = (await session.execute(replied_today_stmt)).scalar() or 0

    # 6. Campaign counts
    active_camps = (await session.execute(
        select(func.count(Campaign.id)).where(
            Campaign.org_id == settings.DEFAULT_ORG_ID,
            Campaign.status == "active",
        )
    )).scalar() or 0

    total_camps = (await session.execute(
        select(func.count(Campaign.id)).where(
            Campaign.org_id == settings.DEFAULT_ORG_ID
        )
    )).scalar() or 0

    overall_response_rate = round((total_replied / total_sent * 100), 1) if total_sent > 0 else 0.0

    # 7. Segment Breakdown (by campaign target_segment)
    camp_stmt = select(Campaign).where(Campaign.org_id == settings.DEFAULT_ORG_ID)
    camps = (await session.execute(camp_stmt)).scalars().all()

    segment_map: Dict[str, Dict[str, int]] = {}
    for c in camps:
        seg = c.target_segment or "Unsegmented"
        if seg not in segment_map:
            segment_map[seg] = {"enrolled": 0, "sent": 0, "replied": 0}

        # get counts for this campaign
        c_leads = (await session.execute(
            select(
                func.count(CampaignLead.id),
                func.sum(func.case((CampaignLead.delivery_status.in_(["sent", "delivered", "replied"]), 1), else_=0)),
                func.sum(func.case((CampaignLead.delivery_status == "replied", 1), else_=0)),
            ).where(CampaignLead.campaign_id == c.id)
        )).first()

        enrolled = c_leads[0] or 0
        sent = c_leads[1] or 0
        replied = c_leads[2] or 0

        segment_map[seg]["enrolled"] += enrolled
        segment_map[seg]["sent"] += sent
        segment_map[seg]["replied"] += replied

    segment_breakdown = []
    for seg, data in segment_map.items():
        rate = round((data["replied"] / data["sent"] * 100), 1) if data["sent"] > 0 else 0.0
        segment_breakdown.append(SegmentActivity(
            segment=seg,
            leads_enrolled=data["enrolled"],
            sent_count=data["sent"],
            replied_count=data["replied"],
            response_rate=rate,
        ))

    return EdithActivitySummary(
        total_messages_sent=total_sent,
        total_leads_contacted=total_leads_contacted,
        total_replies=total_replied,
        overall_response_rate=overall_response_rate,
        sent_today=sent_today,
        replied_today=replied_today,
        active_campaigns_count=active_camps,
        total_campaigns_count=total_camps,
        segment_breakdown=segment_breakdown,
    )


@router.get("/campaigns/{campaign_id}", response_model=CampaignActivityDetail, summary="Get EDITH activity for a specific campaign")
async def get_campaign_activity(
    campaign_id: str,
    limit: int = Query(50, ge=1, le=200),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns detailed activity for a single campaign:
    sent count, reply count, response rate, and list of specific leads contacted with timestamps.
    """
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail=f"Campaign '{campaign_id}' not found")

    # Aggregate stats
    stats_query = select(
        func.count(CampaignLead.id),
        func.sum(func.case((CampaignLead.delivery_status.in_(["sent", "delivered", "replied"]), 1), else_=0)),
        func.sum(func.case((CampaignLead.delivery_status == "replied", 1), else_=0)),
    ).where(CampaignLead.campaign_id == campaign_id)
    stats_res = (await session.execute(stats_query)).first()

    total_leads = stats_res[0] or 0
    sent_count = stats_res[1] or 0
    replied_count = stats_res[2] or 0
    response_rate = round((replied_count / sent_count * 100), 1) if sent_count > 0 else 0.0

    # Contacted leads joined with Lead model
    lead_query = (
        select(CampaignLead, Lead)
        .outerjoin(Lead, CampaignLead.lead_id == Lead.id)
        .where(CampaignLead.campaign_id == campaign_id)
        .order_by(desc(CampaignLead.sent_at), desc(CampaignLead.id))
        .limit(limit)
    )
    results = (await session.execute(lead_query)).all()

    contacted: List[ContactedLeadItem] = []
    for cl, lead in results:
        contacted.append(ContactedLeadItem(
            lead_id=cl.lead_id,
            lead_name=lead.name if lead else None,
            company_name=lead.company_name if lead else None,
            company_type=lead.company_type if lead else None,
            phone=lead.phone if lead else None,
            campaign_id=campaign_id,
            campaign_name=campaign.name,
            delivery_status=cl.delivery_status,
            sent_at=cl.sent_at,
            replied_at=cl.replied_at,
            personalized_message=cl.personalized_message,
        ))

    return CampaignActivityDetail(
        campaign_id=campaign.id,
        campaign_name=campaign.name,
        target_segment=campaign.target_segment or "all",
        status=campaign.status,
        total_leads=total_leads,
        sent_count=sent_count,
        replied_count=replied_count,
        response_rate=response_rate,
        leads_contacted=contacted,
    )


@router.get("/contacted-leads", response_model=List[ContactedLeadItem], summary="List all leads contacted by EDITH")
async def list_contacted_leads(
    status: Optional[str] = Query(None, description="Filter by delivery_status: sent, delivered, replied, failed"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns a paginated list of all leads contacted by EDITH across all campaigns,
    with exact dispatch and reply timestamps.
    """
    query = (
        select(CampaignLead, Lead, Campaign)
        .outerjoin(Lead, CampaignLead.lead_id == Lead.id)
        .outerjoin(Campaign, CampaignLead.campaign_id == Campaign.id)
        .where(CampaignLead.delivery_status.in_(["sent", "delivered", "replied"]))
        .order_by(desc(CampaignLead.sent_at), desc(CampaignLead.id))
        .offset(offset)
        .limit(limit)
    )

    if status:
        query = query.where(CampaignLead.delivery_status == status)

    results = (await session.execute(query)).all()

    items: List[ContactedLeadItem] = []
    for cl, lead, camp in results:
        items.append(ContactedLeadItem(
            lead_id=cl.lead_id,
            lead_name=lead.name if lead else None,
            company_name=lead.company_name if lead else None,
            company_type=lead.company_type if lead else None,
            phone=lead.phone if lead else None,
            campaign_id=cl.campaign_id,
            campaign_name=camp.name if camp else "Unknown Campaign",
            delivery_status=cl.delivery_status,
            sent_at=cl.sent_at,
            replied_at=cl.replied_at,
            personalized_message=cl.personalized_message,
        ))

    return items
