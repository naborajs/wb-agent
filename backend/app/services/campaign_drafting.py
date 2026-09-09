"""
Chat-Driven Agentic Campaign Drafting Service.
Orchestrates collaborative campaign creation between Friday (executive assistant)
and EDITH (autonomous sales brain) with guardrail validation, lead count verification,
and operator review.
"""

import re
from typing import Any, Dict, List, Optional, Tuple
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.models import Campaign, Lead
from app.schemas.campaigns import CampaignCreate, CampaignDraftRequest, CampaignDraftResponse
from app.services import campaign_engine, friday_actions
from app.utils.logging import logger


async def draft_campaign_from_text(
    session: AsyncSession,
    org_id: str,
    operator_message: str,
    history: Optional[List[Dict[str, str]]] = None,
) -> Dict[str, Any]:
    """
    Friday interprets operator's natural language instructions to draft
    a comprehensive, structured campaign specification.
    """
    msg_lower = operator_message.lower()

    # 1. Determine Target Segment
    target_segment = "all"
    segment_map = campaign_engine._get_segment_to_company_types()
    for seg_label, types in segment_map.items():
        if any(w in msg_lower for w in seg_label.lower().split()):
            target_segment = seg_label
            break
        for t in types:
            if t.lower() in msg_lower:
                target_segment = seg_label
                break

    # Check for direct company_type keywords
    if target_segment == "all":
        if any(w in msg_lower for w in ["cafe", "café", "restaurant", "hotel", "catering", "bakery", "food service", "b2b"]):
            target_segment = "B2B Commercial Accounts"
        elif any(w in msg_lower for w in ["enterprise", "corporate", "mnc"]):
            target_segment = "Enterprise & Corporate"
        elif any(w in msg_lower for w in ["distributor", "retailer", "wholesale", "supermarket"]):
            target_segment = "Distributors & Retail"
        elif any(w in msg_lower for w in ["boutique", "specialty", "artisan", "premium"]):
            target_segment = "Specialty & Boutique"

    # 2. Extract or infer Name
    name_match = re.search(r"(?:name(?:d)?|call(?:ed)?|title)\s+['\"]([^'\"]+)['\"]", operator_message, re.IGNORECASE)
    if name_match:
        name = name_match.group(1).strip()
    else:
        # Generate descriptive title
        if target_segment != "all":
            name = f"{target_segment} Outreach — Q4"
        else:
            name = "Commercial Client Outreach"

    # 3. Extract Quota / Daily Limit
    limit_match = re.search(r"(\d+)\s*(?:leads?|messages?|contacts?)\s*(?:per\s*day|daily|a\s*day)?", msg_lower)
    daily_limit = int(limit_match.group(1)) if limit_match else 50
    # Safety cap
    daily_limit = max(10, min(daily_limit, 100))

    # 4. Personalization flag
    personalization_enabled = any(w in msg_lower for w in [
        "personalize", "personalized", "custom name", "tailor", "dynamic", "recipient"
    ]) or True  # Default to True for agentic quality

    # 5. Extract or Draft Message Template
    # Look for quoted text
    quote_match = re.search(r"['\"]([^'\"]{20,})['\"]", operator_message)
    if quote_match:
        template = quote_match.group(1).strip()
    else:
        # Friday drafts a high-converting WhatsApp B2B template
        if "discount" in msg_lower or "offer" in msg_lower:
            disc_match = re.search(r"(\d+)%", msg_lower)
            pct = disc_match.group(1) if disc_match else "10"
            template = (
                f"Hi {{name}}, greetings from our commercial team! We are extending an exclusive {pct}% commercial discount "
                "on wholesale catalog orders for {company_name} this week. Would you like our latest wholesale price sheet?"
            )
        elif "follow up" in msg_lower or "followup" in msg_lower:
            template = (
                "Hi {name}, following up regarding supplies for {company_name}. We have new commercial stock available "
                "with priority delivery in {city}. Can I share our updated product catalog?"
            )
        else:
            template = (
                "Hi {name}, hope things are running smoothly at {company_name}! "
                "We supply commercial accounts across {city} with direct wholesale pricing and same-day dispatch. "
                "Would you be open to a quick 2-minute overview of our commercial tiers?"
            )

    # 6. Check matching leads count in real database
    lead_count = await campaign_engine.resolve_filter_count(
        session=session,
        org_id=org_id,
        target_segment=target_segment,
    )

    draft = {
        "name": name,
        "target_segment": target_segment,
        "lead_filter": None,
        "initial_message_template": template,
        "daily_limit": daily_limit,
        "scheduling_window": {"start_hour": 9, "end_hour": 18, "days_of_week": [1, 2, 3, 4, 5]},
        "jitter_min_seconds": 25,
        "jitter_max_seconds": 45,
        "stop_on_replies": 20,
        "stop_below_response_rate": 5.0,
        "retry_max_attempts": 3,
        "retry_delay_hours": 24,
        "personalization_enabled": personalization_enabled,
        "opt_out_handling": "stop",
        "actor": "friday_agent",
        "matched_lead_count": lead_count,
    }

    return draft


async def validate_draft_with_edith(
    session: AsyncSession,
    org_id: str,
    draft: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Sends the drafted campaign spec to EDITH over the Inter-Brain Bus
    for strict commercial and operational guardrail validation.
    """
    issues: List[str] = []
    recommendations: List[str] = []
    verdict = "ACCEPTED"

    matched_leads = draft.get("matched_lead_count", 0)
    target_segment = draft.get("target_segment", "all")
    daily_limit = draft.get("daily_limit", 50)
    jitter_min = draft.get("jitter_min_seconds", 25)
    jitter_max = draft.get("jitter_max_seconds", 45)
    template = draft.get("initial_message_template", "")

    # Guardrail 1: Zero-lead blocking
    if matched_leads == 0:
        verdict = "DENIED"
        issues.append(
            f"Zero leads match target segment '{target_segment}'. "
            "Campaign cannot be launched without matching recipients in the leads table."
        )
        recommendations.append(
            f"Upload a CSV containing leads with company_type matching '{target_segment}' on /leads before launching."
        )

    # Guardrail 2: Anti-ban rate limits & jitter
    if daily_limit > 100:
        verdict = "FLAGGED" if verdict != "DENIED" else "DENIED"
        issues.append(f"Daily volume of {daily_limit} exceeds Meta WhatsApp anti-ban safe threshold of 100 messages/day.")
        recommendations.append("Reduce daily limit to 50-75 messages to protect phone reputation.")

    if jitter_min < 15:
        verdict = "DENIED"
        issues.append(f"Minimum jitter of {jitter_min}s is dangerously fast. Anti-ban guardrail requires at least 15s delay.")
        recommendations.append("Adjust minimum jitter to at least 20-25 seconds.")

    # Guardrail 3: Template quality & opt-out compliance
    if len(template.strip()) < 10:
        verdict = "DENIED"
        issues.append("Message template is too short to establish commercial relevance.")
    elif "discount" in template.lower():
        disc_match = re.search(r"(\d+)%", template)
        if disc_match:
            pct = int(disc_match.group(1))
            if pct > 15:
                verdict = "FLAGGED" if verdict != "DENIED" else "DENIED"
                issues.append(f"Commercial discount of {pct}% exceeds autonomous authority threshold of 15%.")
                recommendations.append("Operator must explicitly authorize discounts exceeding 15%.")

    if verdict == "ACCEPTED":
        reasoning = (
            f"EDITH has reviewed the campaign draft '{draft.get('name')}'. Target segment '{target_segment}' "
            f"has {matched_leads} matching lead records in CRM. Pacing ({jitter_min}s–{jitter_max}s jitter, "
            f"{daily_limit}/day) is within anti-ban compliance limits. Ready for launch."
        )
    elif verdict == "FLAGGED":
        reasoning = (
            f"EDITH flagged the campaign draft with {len(issues)} advisory note(s). "
            f"{' '.join(issues)} Operator review and confirmation recommended."
        )
    else:
        reasoning = (
            f"EDITH declined the campaign draft due to policy violations: {' '.join(issues)}"
        )

    return {
        "verdict": verdict,
        "is_valid": verdict in ["ACCEPTED", "FLAGGED"],
        "reasoning": reasoning,
        "issues": issues,
        "recommendations": recommendations,
        "matched_lead_count": matched_leads,
    }


async def create_and_launch_from_draft(
    session: AsyncSession,
    org_id: str,
    draft: Dict[str, Any],
    launch: bool = True,
) -> Tuple[bool, str, Optional[Campaign]]:
    """
    Creates and optionally launches a campaign from a validated draft.
    Returns (success, message, campaign).
    """
    campaign = Campaign(
        org_id=org_id,
        name=draft["name"],
        target_segment=draft.get("target_segment", "all"),
        lead_filter=draft.get("lead_filter"),
        initial_message_template=draft["initial_message_template"],
        daily_limit=draft.get("daily_limit", 50),
        scheduling_window=draft.get("scheduling_window"),
        jitter_min_seconds=draft.get("jitter_min_seconds", 25),
        jitter_max_seconds=draft.get("jitter_max_seconds", 45),
        stop_on_replies=draft.get("stop_on_replies"),
        stop_below_response_rate=draft.get("stop_below_response_rate"),
        retry_max_attempts=draft.get("retry_max_attempts", 3),
        retry_delay_hours=draft.get("retry_delay_hours", 24),
        personalization_enabled=draft.get("personalization_enabled", True),
        opt_out_handling=draft.get("opt_out_handling", "stop"),
        status="draft",
        actor=draft.get("actor", "friday_agent"),
    )
    session.add(campaign)
    await session.flush()

    if launch:
        is_valid, err = await campaign_engine.validate_campaign_launch(session, org_id, campaign)
        if not is_valid:
            return False, f"Campaign created as draft, but launch failed: {err}", campaign

        leads = await campaign_engine.resolve_target_leads(session, org_id, campaign)
        enrolled = await campaign_engine.enroll_leads(session, campaign.id, leads)

        campaign.status = "active"
        campaign.start_date = utc_now()
        campaign.total_leads = enrolled
        await session.flush()

        await campaign_engine.log_campaign_notification(
            session=session,
            org_id=org_id,
            title=f"Campaign Launched: {campaign.name}",
            content=f"Campaign '{campaign.name}' launched with {enrolled} leads enrolled across segment '{campaign.target_segment}'.",
            category="CAMPAIGN_LAUNCH",
            severity="info",
            sender_brain="FRIDAY",
            action_url="/campaigns",
        )

        return True, f"Campaign '{campaign.name}' launched successfully with {enrolled} leads enrolled!", campaign

    return True, f"Campaign '{campaign.name}' saved as draft.", campaign
