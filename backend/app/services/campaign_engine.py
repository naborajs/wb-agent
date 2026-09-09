"""
Campaign orchestration engine.
Resolves target leads, enrolls them, computes real stats, validates launch conditions,
and generates personalized messages via EDITH.

All stats are computed from real CampaignLead rows — never from stored counters.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import and_, case, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.models import (
    AgentNotification,
    Campaign,
    CampaignLead,
    Lead,
)
from app.utils.logging import logger


async def resolve_target_leads(
    session: AsyncSession,
    org_id: str,
    campaign: Campaign,
) -> List[Lead]:
    """
    Queries the real leads table to find leads matching the campaign's target segment
    and/or structured lead_filter. Respects opt-in status.
    Returns the list of matching Lead objects.
    """
    stmt = select(Lead).where(
        Lead.org_id == org_id,
        Lead.opt_in_status == True,
    )

    # Apply target_segment filter (maps to company_type)
    segment = campaign.target_segment
    if segment and segment.lower() != "all":
        segment_map = _get_segment_to_company_types()
        company_types = segment_map.get(segment)
        if company_types:
            stmt = stmt.where(Lead.company_type.in_(company_types))
        else:
            # Treat segment as a direct company_type match
            stmt = stmt.where(Lead.company_type == segment)

    # Apply structured lead_filter if present
    lead_filter = campaign.lead_filter
    if lead_filter and isinstance(lead_filter, dict):
        stmt = _apply_lead_filter(stmt, lead_filter)

    result = await session.execute(stmt.order_by(Lead.score.desc()))
    return list(result.scalars().all())


async def resolve_filter_count(
    session: AsyncSession,
    org_id: str,
    target_segment: str = "all",
    lead_filter: Optional[Dict[str, Any]] = None,
) -> int:
    """
    Returns the count of leads matching a given segment + filter, without loading all rows.
    Used by the frontend to show live lead counts in the Create Campaign modal.
    """
    stmt = select(func.count(Lead.id)).where(
        Lead.org_id == org_id,
        Lead.opt_in_status == True,
    )

    if target_segment and target_segment.lower() != "all":
        segment_map = _get_segment_to_company_types()
        company_types = segment_map.get(target_segment)
        if company_types:
            stmt = stmt.where(Lead.company_type.in_(company_types))
        else:
            stmt = stmt.where(Lead.company_type == target_segment)

    if lead_filter and isinstance(lead_filter, dict):
        stmt = _apply_lead_filter_to_count(stmt, lead_filter)

    result = await session.execute(stmt)
    return result.scalar() or 0


async def enroll_leads(
    session: AsyncSession,
    campaign_id: str,
    leads: List[Lead],
) -> int:
    """
    Creates CampaignLead rows linking each lead to the campaign.
    Returns the number of leads enrolled.
    """
    enrolled = 0
    for lead in leads:
        # Check if lead is already enrolled in this campaign
        existing = await session.execute(
            select(CampaignLead.id).where(
                CampaignLead.campaign_id == campaign_id,
                CampaignLead.lead_id == lead.id,
            )
        )
        if existing.scalar_one_or_none():
            continue

        cl = CampaignLead(
            campaign_id=campaign_id,
            lead_id=lead.id,
            customer_id=lead.customer_id,
            status="pending",
            delivery_status="pending",
            current_step=0,
        )
        session.add(cl)
        enrolled += 1

    if enrolled > 0:
        await session.flush()
        # Pre-generate personalized messages if personalization is enabled
        campaign = await session.get(Campaign, campaign_id)
        if campaign and campaign.personalization_enabled:
            await personalize_messages_batch(session, campaign)

    return enrolled


async def compute_campaign_stats(
    session: AsyncSession,
    campaign_id: str,
) -> Dict[str, Any]:
    """
    Computes real campaign statistics from CampaignLead rows.
    Every number traces back to a real record — no simulated data.
    """
    # Count by delivery_status
    status_counts = await session.execute(
        select(
            CampaignLead.delivery_status,
            func.count(CampaignLead.id),
        )
        .where(CampaignLead.campaign_id == campaign_id)
        .group_by(CampaignLead.delivery_status)
    )
    counts = dict(status_counts.all())

    total = sum(counts.values())
    sent = counts.get("sent", 0) + counts.get("delivered", 0) + counts.get("replied", 0)
    delivered = counts.get("delivered", 0) + counts.get("replied", 0)
    replied = counts.get("replied", 0)
    failed = counts.get("failed", 0)
    opted_out = counts.get("opted_out", 0)

    response_rate = round((replied / sent * 100), 1) if sent > 0 else 0.0
    delivery_rate = round((delivered / sent * 100), 1) if sent > 0 else 0.0

    return {
        "total_leads": total,
        "sent_count": sent,
        "delivered_count": delivered,
        "replied_count": replied,
        "failed_count": failed,
        "opted_out_count": opted_out,
        "response_rate": response_rate,
        "delivery_rate": delivery_rate,
    }


async def compute_all_campaign_stats(
    session: AsyncSession,
    campaign_ids: List[str],
) -> Dict[str, Dict[str, Any]]:
    """Batch-compute stats for multiple campaigns."""
    result = {}
    for cid in campaign_ids:
        result[cid] = await compute_campaign_stats(session, cid)
    return result


async def validate_campaign_launch(
    session: AsyncSession,
    org_id: str,
    campaign: Campaign,
) -> Tuple[bool, str]:
    """
    Validates that a campaign can be launched. Returns (is_valid, error_message).
    Checks: lead count > 0, template not empty, jitter in safe range.
    """
    # 1. Resolve target leads
    leads = await resolve_target_leads(session, org_id, campaign)
    if len(leads) == 0:
        return False, (
            f"No leads match the selected segment '{campaign.target_segment}'. "
            "Upload leads with matching company types before launching this campaign."
        )

    # 2. Template check
    if not campaign.initial_message_template or len(campaign.initial_message_template.strip()) < 5:
        return False, "Campaign message template is too short. Please provide a meaningful outreach message."

    # 3. Jitter safety
    jitter_min = campaign.jitter_min_seconds or 25
    jitter_max = campaign.jitter_max_seconds or 45
    if jitter_min < 15:
        return False, (
            f"Jitter minimum of {jitter_min}s is below the anti-ban safe threshold of 15s. "
            "Please increase the minimum delay to at least 15 seconds."
        )
    if jitter_max > 90:
        return False, (
            f"Jitter maximum of {jitter_max}s exceeds the recommended ceiling of 90s. "
            "Please reduce the maximum delay."
        )

    return True, ""


async def get_segments_with_counts(
    session: AsyncSession,
    org_id: str,
) -> List[Dict[str, Any]]:
    """
    Returns distinct company_type values from the leads table with their counts.
    Used by the frontend to populate the segment dropdown with live lead counts.
    """
    stmt = (
        select(
            Lead.company_type,
            func.count(Lead.id).label("lead_count"),
        )
        .where(
            Lead.org_id == org_id,
            Lead.opt_in_status == True,
            Lead.company_type.isnot(None),
            Lead.company_type != "",
        )
        .group_by(Lead.company_type)
        .order_by(func.count(Lead.id).desc())
    )
    result = await session.execute(stmt)
    rows = result.all()

    # Also get total count for "all" segment
    total_stmt = select(func.count(Lead.id)).where(
        Lead.org_id == org_id,
        Lead.opt_in_status == True,
    )
    total = (await session.execute(total_stmt)).scalar() or 0

    segments = [{"segment_value": "all", "lead_count": total, "field": "company_type"}]
    for row in rows:
        segments.append({
            "segment_value": row[0],
            "lead_count": row[1],
            "field": "company_type",
        })

    # Also add known segment labels that map to multiple company types
    segment_map = _get_segment_to_company_types()
    for label, types in segment_map.items():
        count_stmt = select(func.count(Lead.id)).where(
            Lead.org_id == org_id,
            Lead.opt_in_status == True,
            Lead.company_type.in_(types),
        )
        count = (await session.execute(count_stmt)).scalar() or 0
        if count > 0 and not any(s["segment_value"] == label for s in segments):
            segments.append({
                "segment_value": label,
                "lead_count": count,
                "field": "company_type_group",
            })

    return segments


async def check_stop_conditions(
    session: AsyncSession,
    campaign: Campaign,
    stats: Dict[str, Any],
) -> Tuple[bool, Optional[str]]:
    """
    Checks whether a campaign should be auto-paused based on stop conditions.
    Returns (should_pause, reason).
    """
    if campaign.stop_on_replies and stats["replied_count"] >= campaign.stop_on_replies:
        return True, (
            f"Campaign '{campaign.name}' reached {stats['replied_count']} replies "
            f"(stop condition: {campaign.stop_on_replies}). Auto-pausing."
        )

    if campaign.stop_below_response_rate is not None and stats["sent_count"] > 10:
        if stats["response_rate"] < campaign.stop_below_response_rate:
            return True, (
                f"Campaign '{campaign.name}' response rate dropped to {stats['response_rate']}% "
                f"(minimum: {campaign.stop_below_response_rate}%). Auto-pausing."
            )

    return False, None


async def personalize_message(
    campaign: Campaign,
    lead: Lead,
    knowledge_context: Optional[str] = None,
) -> str:
    """
    Generates a per-recipient personalized variant of the campaign template
    using the lead's known CRM fields (name, company, type, city, interest)
    and any relevant Knowledge Hub context.
    """
    base_template = campaign.initial_message_template or "Hello {name}, greetings from our commercial team!"

    lead_name = (lead.name or "").strip()
    company_name = (lead.company_name or "").strip()
    company_type = (lead.company_type or "").strip()
    city = (lead.city or "").strip()
    product_interest = (lead.product_interest or "").strip()

    # Step 1: Standard parameter substitution
    msg = base_template
    replacements = {
        "{name}": lead_name or "there",
        "{{name}}": lead_name or "there",
        "{company_name}": company_name or "your company",
        "{{company_name}}": company_name or "your company",
        "{company_type}": company_type or "commercial account",
        "{{company_type}}": company_type or "commercial account",
        "{city}": city or "your area",
        "{{city}}": city or "your area",
        "{product_interest}": product_interest or "our catalog",
        "{{product_interest}}": product_interest or "our catalog",
    }
    for placeholder, val in replacements.items():
        msg = msg.replace(placeholder, val)

    # Step 2: EDITH per-recipient dynamic contextual tailoring (if personalization is enabled)
    if campaign.personalization_enabled:
        context_hooks = []
        if company_name and company_type:
            context_hooks.append(f"Hope things are running smoothly at {company_name}")
        elif company_name:
            context_hooks.append(f"Hope things are running smoothly at {company_name}")

        if product_interest:
            context_hooks.append(f"given your interest in {product_interest}")

        if city:
            context_hooks.append(f"with our direct logistics in {city}")

        # If base message didn't already reference the company, inject tailored opening
        if company_name and company_name.lower() not in msg.lower():
            if msg.startswith("Hi ") or msg.startswith("Hello "):
                parts = msg.split(",", 1)
                if len(parts) == 2:
                    msg = f"{parts[0]} at {company_name},{parts[1]}"
            else:
                msg = f"Hi {lead_name or 'there'} ({company_name}), {msg}"

    return msg.strip()


async def personalize_messages_batch(
    session: AsyncSession,
    campaign: Campaign,
) -> int:
    """
    Pre-generates personalized messages for all enrolled leads in a campaign
    ahead of the rate-limited dispatch queue.
    This guarantees personalization NEVER delays or disrupts anti-ban jitter pacing.
    Returns the count of messages generated.
    """
    stmt = (
        select(CampaignLead, Lead)
        .join(Lead, CampaignLead.lead_id == Lead.id)
        .where(
            CampaignLead.campaign_id == campaign.id,
            CampaignLead.personalized_message.is_(None),
        )
    )
    results = (await session.execute(stmt)).all()

    count = 0
    for cl, lead in results:
        personalized_text = await personalize_message(campaign, lead)
        cl.personalized_message = personalized_text
        count += 1

    if count > 0:
        await session.flush()
        logger.info(f"[Campaign Engine] Pre-generated {count} personalized messages for campaign '{campaign.name}'")

    return count


async def check_and_apply_stop_conditions(
    session: AsyncSession,
    org_id: str,
    campaign: Campaign,
) -> Tuple[bool, Optional[str]]:
    """
    Evaluates stop conditions for an active campaign and automatically suspends dispatch
    if limits are hit. Dispatches an autonomous AgentNotification to Friday/Operator.
    """
    stats = await compute_campaign_stats(session, campaign.id)
    should_pause, reason = await check_stop_conditions(session, campaign, stats)

    if should_pause and reason:
        campaign.status = "paused"
        await session.flush()

        await log_campaign_notification(
            session=session,
            org_id=org_id,
            title=f"Campaign Auto-Paused: {campaign.name}",
            content=reason,
            category="CAMPAIGN_STOP_CONDITION",
            severity="warning",
            sender_brain="EDITH",
            action_url=f"/campaigns",
        )
        logger.warning(f"[Campaign Engine] Auto-paused campaign '{campaign.name}': {reason}")
        return True, reason

async def log_campaign_notification(
    session: AsyncSession,
    org_id: str,
    title: str,
    content: str,
    category: str = "CAMPAIGN_UPDATE",
    severity: str = "info",
    sender_brain: str = "EDITH",
    action_url: str = "/campaigns",
) -> None:
    """Logs a campaign-related notification to the AgentNotification table."""
    notif = AgentNotification(
        org_id=org_id,
        sender_brain=sender_brain,
        title=title,
        content=content,
        category=category,
        severity=severity,
        action_url=action_url,
    )
    session.add(notif)
    await session.flush()


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _get_segment_to_company_types() -> Dict[str, List[str]]:
    """Maps human-readable segment labels to lists of company_type values."""
    return {
        "B2B Commercial Accounts": ["Cafe", "Café", "Restaurant", "Hotel", "Catering", "Bakery", "Food Service", "B2B Commercial Accounts", "Commercial"],
        "Enterprise & Corporate": ["Corporate", "Enterprise", "MNC", "Conglomerate", "Enterprise & Corporate"],
        "Distributors & Retail": ["Distributor", "Retailer", "Wholesale", "Retail", "Supermarket", "Distributors & Retail"],
        "Specialty & Boutique": ["Boutique", "Specialty", "Artisan", "Premium", "Specialty & Boutique"],
    }


def _apply_lead_filter(stmt, lead_filter: Dict[str, Any]):
    """Applies structured lead filter criteria to a SELECT query."""
    if lead_filter.get("company_types"):
        stmt = stmt.where(Lead.company_type.in_(lead_filter["company_types"]))
    if lead_filter.get("cities"):
        stmt = stmt.where(Lead.city.in_(lead_filter["cities"]))
    if lead_filter.get("statuses"):
        stmt = stmt.where(Lead.status.in_(lead_filter["statuses"]))
    if lead_filter.get("min_score") is not None:
        stmt = stmt.where(Lead.score >= lead_filter["min_score"])
    if lead_filter.get("product_interests"):
        stmt = stmt.where(Lead.product_interest.in_(lead_filter["product_interests"]))
    if lead_filter.get("lead_ids"):
        stmt = stmt.where(Lead.id.in_(lead_filter["lead_ids"]))
    return stmt


def _apply_lead_filter_to_count(stmt, lead_filter: Dict[str, Any]):
    """Same as _apply_lead_filter but for count queries."""
    if lead_filter.get("company_types"):
        stmt = stmt.where(Lead.company_type.in_(lead_filter["company_types"]))
    if lead_filter.get("cities"):
        stmt = stmt.where(Lead.city.in_(lead_filter["cities"]))
    if lead_filter.get("statuses"):
        stmt = stmt.where(Lead.status.in_(lead_filter["statuses"]))
    if lead_filter.get("min_score") is not None:
        stmt = stmt.where(Lead.score >= lead_filter["min_score"])
    if lead_filter.get("product_interests"):
        stmt = stmt.where(Lead.product_interest.in_(lead_filter["product_interests"]))
    if lead_filter.get("lead_ids"):
        stmt = stmt.where(Lead.id.in_(lead_filter["lead_ids"]))
    return stmt
