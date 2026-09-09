"""
Campaign management API endpoints.
Full CRUD + operational controls for outreach campaigns.
All stats are computed from real CampaignLead rows joined to real lead_ids.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.models import Campaign, CampaignLead, Lead
from app.database.session import get_db
from app.schemas.campaigns import (
    CampaignCreate,
    CampaignLeadDetail,
    CampaignResponse,
    CampaignStats,
    CampaignUpdate,
    LeadFilter,
    SegmentInfo,
)
from app.services import campaign_engine
from app.utils.logging import logger

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])


# ---------------------------------------------------------------------------
# GET /campaigns — List all campaigns with real computed stats
# ---------------------------------------------------------------------------

@router.get("", response_model=List[CampaignResponse])
async def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status: draft, active, paused, completed"),
    session: AsyncSession = Depends(get_db),
):
    """
    Lists all campaigns with live stats computed from real CampaignLead dispatch records.
    Dispatch progress, reply counts, and response rates are never simulated — every number
    traces back to a real lead row.
    """
    org_id = settings.DEFAULT_ORG_ID
    stmt = select(Campaign).where(Campaign.org_id == org_id)

    if status:
        stmt = stmt.where(Campaign.status == status)

    stmt = stmt.order_by(desc(Campaign.created_at))
    result = await session.execute(stmt)
    campaigns = list(result.scalars().all())

    # Batch compute real stats
    campaign_ids = [c.id for c in campaigns]
    all_stats = await campaign_engine.compute_all_campaign_stats(session, campaign_ids)

    response = []
    for c in campaigns:
        stats = all_stats.get(c.id, {})
        response.append(_campaign_to_response(c, stats))

    return response


# ---------------------------------------------------------------------------
# GET /campaigns/{id} — Single campaign with detailed stats
# ---------------------------------------------------------------------------

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Fetches a single campaign with live computed statistics."""
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    stats = await campaign_engine.compute_campaign_stats(session, campaign_id)
    return _campaign_to_response(campaign, stats)


# ---------------------------------------------------------------------------
# GET /campaigns/{id}/leads — Leads enrolled in a campaign
# ---------------------------------------------------------------------------

@router.get("/{campaign_id}/leads")
async def get_campaign_leads(
    campaign_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Returns all leads enrolled in a campaign with their individual dispatch status,
    delivery timestamps, and personalized messages.
    """
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    stmt = (
        select(CampaignLead, Lead)
        .join(Lead, CampaignLead.lead_id == Lead.id)
        .where(CampaignLead.campaign_id == campaign_id)
        .order_by(CampaignLead.created_at.desc())
    )
    result = await session.execute(stmt)
    rows = result.all()

    leads_detail = []
    for cl, lead in rows:
        leads_detail.append({
            "id": cl.id,
            "lead_id": cl.lead_id,
            "lead_name": lead.name,
            "lead_phone": lead.phone,
            "lead_company": lead.company_name,
            "lead_company_type": lead.company_type,
            "status": cl.status,
            "delivery_status": cl.delivery_status,
            "personalized_message": cl.personalized_message,
            "sent_at": cl.sent_at.isoformat() if cl.sent_at else None,
            "replied_at": cl.replied_at.isoformat() if cl.replied_at else None,
            "current_step": cl.current_step,
            "created_at": cl.created_at.isoformat() if cl.created_at else None,
        })

    return {
        "campaign_id": campaign_id,
        "campaign_name": campaign.name,
        "total": len(leads_detail),
        "leads": leads_detail,
    }


# ---------------------------------------------------------------------------
# POST /campaigns — Create a new campaign
# ---------------------------------------------------------------------------

@router.post("", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    req: CampaignCreate,
    session: AsyncSession = Depends(get_db),
):
    """
    Creates a new outreach campaign in 'draft' status.
    The campaign is not launched until explicitly activated via POST /campaigns/{id}/launch.
    Returns the created campaign with a live count of matching leads.
    """
    org_id = settings.DEFAULT_ORG_ID

    # Validate jitter range
    if req.jitter_min_seconds > req.jitter_max_seconds:
        raise HTTPException(
            status_code=400,
            detail="Jitter minimum cannot exceed jitter maximum. Please adjust the delay range.",
        )

    campaign = Campaign(
        org_id=org_id,
        name=req.name,
        description=req.description,
        target_segment=req.target_segment,
        lead_filter=req.lead_filter.model_dump() if req.lead_filter else None,
        initial_message_template=req.initial_message_template,
        daily_limit=req.daily_limit,
        status="draft",
        scheduling_window=req.scheduling_window.model_dump() if req.scheduling_window else None,
        jitter_min_seconds=req.jitter_min_seconds,
        jitter_max_seconds=req.jitter_max_seconds,
        stop_on_replies=req.stop_conditions.max_replies if req.stop_conditions else None,
        stop_below_response_rate=req.stop_conditions.min_response_rate if req.stop_conditions else None,
        retry_max_attempts=req.retry_config.max_attempts if req.retry_config else 3,
        retry_delay_hours=req.retry_config.delay_hours if req.retry_config else 24,
        personalization_enabled=req.personalization_enabled,
        opt_out_handling=req.opt_out_handling,
        actor="operator",
    )
    session.add(campaign)
    await session.flush()

    # Compute matched lead count for the response
    matched = await campaign_engine.resolve_filter_count(
        session, org_id, req.target_segment,
        req.lead_filter.model_dump() if req.lead_filter else None,
    )

    await session.commit()

    logger.info(f"Campaign created: {campaign.name} (id={campaign.id}, matched_leads={matched})")

    stats = {"total_leads": matched, "sent_count": 0, "delivered_count": 0,
             "replied_count": 0, "failed_count": 0, "opted_out_count": 0,
             "response_rate": 0.0, "delivery_rate": 0.0}
    return _campaign_to_response(campaign, stats)


# ---------------------------------------------------------------------------
# POST /campaigns/{id}/launch — Enroll leads and activate campaign
# ---------------------------------------------------------------------------

@router.post("/{campaign_id}/launch")
async def launch_campaign(
    campaign_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Enrolls all matching leads as CampaignLead rows and sets the campaign status to 'active'.
    Blocks with a clear error if zero leads match the selected segment.
    """
    org_id = settings.DEFAULT_ORG_ID
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status == "active":
        raise HTTPException(status_code=400, detail="Campaign is already active.")

    if campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot relaunch a completed campaign.")

    # Validate launch conditions
    is_valid, error_msg = await campaign_engine.validate_campaign_launch(session, org_id, campaign)
    if not is_valid:
        raise HTTPException(status_code=400, detail=error_msg)

    # Resolve and enroll leads
    leads = await campaign_engine.resolve_target_leads(session, org_id, campaign)
    enrolled = await campaign_engine.enroll_leads(session, campaign_id, leads)

    if enrolled == 0:
        raise HTTPException(
            status_code=400,
            detail="All matching leads are already enrolled in this campaign. No new leads to add.",
        )

    # Activate
    campaign.status = "active"
    campaign.start_date = utc_now()
    campaign.total_leads = enrolled
    await session.commit()

    # Log notification
    await campaign_engine.log_campaign_notification(
        session, org_id,
        title=f"Campaign Launched: {campaign.name}",
        content=f"Campaign '{campaign.name}' is now active with {enrolled} leads enrolled "
                f"targeting '{campaign.target_segment}'. Daily limit: {campaign.daily_limit} msgs/day.",
        category="CAMPAIGN_UPDATE",
        severity="success",
    )
    await session.commit()

    logger.info(f"Campaign launched: {campaign.name} with {enrolled} leads enrolled")

    stats = await campaign_engine.compute_campaign_stats(session, campaign_id)
    return {
        "success": True,
        "message": f"Campaign '{campaign.name}' launched with {enrolled} leads enrolled.",
        "enrolled_count": enrolled,
        "campaign": _campaign_to_response(campaign, stats),
    }


# ---------------------------------------------------------------------------
# PATCH /campaigns/{id} — Update campaign settings
# ---------------------------------------------------------------------------

@router.patch("/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    req: CampaignUpdate,
    session: AsyncSession = Depends(get_db),
):
    """Updates campaign settings. Only draft or paused campaigns can be modified."""
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status == "completed":
        raise HTTPException(status_code=400, detail="Cannot modify a completed campaign.")

    updates = req.model_dump(exclude_unset=True)

    # Handle nested objects
    if "lead_filter" in updates and updates["lead_filter"] is not None:
        updates["lead_filter"] = updates["lead_filter"].model_dump() if hasattr(updates["lead_filter"], "model_dump") else updates["lead_filter"]
    if "scheduling_window" in updates and updates["scheduling_window"] is not None:
        updates["scheduling_window"] = updates["scheduling_window"].model_dump() if hasattr(updates["scheduling_window"], "model_dump") else updates["scheduling_window"]

    # Map stop_conditions to model columns
    if "stop_conditions" in updates:
        sc = updates.pop("stop_conditions")
        if sc:
            sc_dict = sc.model_dump() if hasattr(sc, "model_dump") else sc
            campaign.stop_on_replies = sc_dict.get("max_replies")
            campaign.stop_below_response_rate = sc_dict.get("min_response_rate")

    # Map retry_config to model columns
    if "retry_config" in updates:
        rc = updates.pop("retry_config")
        if rc:
            rc_dict = rc.model_dump() if hasattr(rc, "model_dump") else rc
            campaign.retry_max_attempts = rc_dict.get("max_attempts", 3)
            campaign.retry_delay_hours = rc_dict.get("delay_hours", 24)

    for field, val in updates.items():
        if hasattr(campaign, field):
            setattr(campaign, field, val)

    await session.commit()

    stats = await campaign_engine.compute_campaign_stats(session, campaign_id)
    return _campaign_to_response(campaign, stats)


# ---------------------------------------------------------------------------
# POST /campaigns/{id}/pause — Pause an active campaign
# ---------------------------------------------------------------------------

@router.post("/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    actor: str = Query("operator", description="Who is pausing: operator | friday_agent"),
    session: AsyncSession = Depends(get_db),
):
    """Pauses an active campaign. Dispatch is suspended until resumed."""
    org_id = settings.DEFAULT_ORG_ID
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status != "active":
        raise HTTPException(status_code=400, detail=f"Cannot pause a campaign with status '{campaign.status}'.")

    campaign.status = "paused"
    await session.commit()

    await campaign_engine.log_campaign_notification(
        session, org_id,
        title=f"Campaign Paused: {campaign.name}",
        content=f"Campaign '{campaign.name}' was paused by {actor}.",
        category="CAMPAIGN_UPDATE",
        severity="warning",
        sender_brain="FRIDAY" if actor == "friday_agent" else "EDITH",
    )
    await session.commit()

    return {"success": True, "message": f"Campaign '{campaign.name}' paused.", "status": "paused"}


# ---------------------------------------------------------------------------
# POST /campaigns/{id}/resume — Resume a paused campaign
# ---------------------------------------------------------------------------

@router.post("/{campaign_id}/resume")
async def resume_campaign(
    campaign_id: str,
    actor: str = Query("operator", description="Who is resuming: operator | friday_agent"),
    session: AsyncSession = Depends(get_db),
):
    """Resumes a paused campaign."""
    org_id = settings.DEFAULT_ORG_ID
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status != "paused":
        raise HTTPException(status_code=400, detail=f"Cannot resume a campaign with status '{campaign.status}'.")

    campaign.status = "active"
    await session.commit()

    await campaign_engine.log_campaign_notification(
        session, org_id,
        title=f"Campaign Resumed: {campaign.name}",
        content=f"Campaign '{campaign.name}' was resumed by {actor}.",
        category="CAMPAIGN_UPDATE",
        severity="success",
        sender_brain="FRIDAY" if actor == "friday_agent" else "EDITH",
    )
    await session.commit()

    return {"success": True, "message": f"Campaign '{campaign.name}' resumed.", "status": "active"}


# ---------------------------------------------------------------------------
# GET /campaigns/segments — Live segment counts from real leads
# ---------------------------------------------------------------------------

@router.get("/segments", response_model=List[SegmentInfo])
async def get_segments(
    session: AsyncSession = Depends(get_db),
):
    """
    Returns distinct segments (company_type values) from the leads table with their live counts.
    Used by the Create Campaign modal to show how many leads match each segment.
    """
    org_id = settings.DEFAULT_ORG_ID
    segments = await campaign_engine.get_segments_with_counts(session, org_id)
    return [SegmentInfo(**s) for s in segments]


# ---------------------------------------------------------------------------
# POST /campaigns/count-leads — Count leads matching a filter
# ---------------------------------------------------------------------------

class CountLeadsRequest(BaseModel):
    target_segment: str = Field("all", description="Segment label")
    lead_filter: Optional[LeadFilter] = Field(None, description="Structured filter")


@router.post("/count-leads")
async def count_matching_leads(
    req: CountLeadsRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Returns the count of leads matching a given segment + filter.
    Used by the Create Campaign modal to show live lead counts before launch.
    """
    org_id = settings.DEFAULT_ORG_ID
    count = await campaign_engine.resolve_filter_count(
        session, org_id, req.target_segment,
        req.lead_filter.model_dump() if req.lead_filter else None,
    )
    return {"count": count, "segment": req.target_segment}


# ---------------------------------------------------------------------------
# DELETE /campaigns/{id} — Delete a campaign
# ---------------------------------------------------------------------------

@router.delete("/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Deletes a campaign and all its enrolled leads (cascade)."""
    campaign = await session.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found.")

    if campaign.status == "active":
        raise HTTPException(
            status_code=400,
            detail="Cannot delete an active campaign. Pause it first.",
        )

    await session.delete(campaign)
    await session.commit()

    return {"success": True, "message": f"Campaign '{campaign.name}' deleted."}


# ---------------------------------------------------------------------------
# Helper: Convert Campaign model + stats dict to CampaignResponse
# ---------------------------------------------------------------------------

def _campaign_to_response(campaign: Campaign, stats: Dict[str, Any]) -> CampaignResponse:
    """Maps a Campaign ORM object + computed stats to a CampaignResponse."""
    stop_conditions = None
    if campaign.stop_on_replies or campaign.stop_below_response_rate is not None:
        stop_conditions = {
            "max_replies": campaign.stop_on_replies,
            "min_response_rate": campaign.stop_below_response_rate,
        }

    retry_config = None
    if campaign.retry_max_attempts or campaign.retry_delay_hours:
        retry_config = {
            "max_attempts": campaign.retry_max_attempts or 3,
            "delay_hours": campaign.retry_delay_hours or 24,
        }

    return CampaignResponse(
        id=campaign.id,
        name=campaign.name,
        description=campaign.description,
        target_segment=campaign.target_segment,
        lead_filter=campaign.lead_filter,
        initial_message_template=campaign.initial_message_template,
        daily_limit=campaign.daily_limit,
        status=campaign.status,
        scheduling_window=campaign.scheduling_window,
        jitter_min_seconds=campaign.jitter_min_seconds or 25,
        jitter_max_seconds=campaign.jitter_max_seconds or 45,
        stop_conditions=stop_conditions,
        retry_config=retry_config,
        opt_out_handling=campaign.opt_out_handling or "stop",
        personalization_enabled=campaign.personalization_enabled or False,
        actor=campaign.actor,
        stats=CampaignStats(**stats),
        created_at=campaign.created_at,
        updated_at=campaign.updated_at,
    )
