"""
Friday Action Registry & Execution Layer.
Exposes every actionable UI operation as a callable action Friday can invoke
over the Inter-Brain Bus, with full audit logging.

Every action Friday takes is logged with actor='friday_agent' to AgentNotification + AuditLog.
"""

from datetime import datetime
from typing import Any, Callable, Dict, List, Optional

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.models import (
    AgentNotification,
    AuditLog,
    Campaign,
    CampaignLead,
    Lead,
)
from app.services import campaign_engine
from app.utils.logging import logger


# ---------------------------------------------------------------------------
# Action Registry
# ---------------------------------------------------------------------------

FRIDAY_ACTION_REGISTRY: Dict[str, Dict[str, Any]] = {
    "pause_campaign": {
        "description": "Pauses an active outreach campaign. Dispatch is suspended until resumed.",
        "params": {"campaign_id": "str — ID of the campaign to pause"},
        "effect": "Sets campaign status from 'active' to 'paused'. No more messages will be sent until resumed.",
    },
    "resume_campaign": {
        "description": "Resumes a paused outreach campaign. Dispatch continues from where it left off.",
        "params": {"campaign_id": "str — ID of the campaign to resume"},
        "effect": "Sets campaign status from 'paused' to 'active'. Message dispatch resumes.",
    },
    "create_campaign": {
        "description": "Creates a new outreach campaign targeting a lead segment with a message template.",
        "params": {
            "name": "str — Campaign name",
            "target_segment": "str — Target segment (e.g. 'B2B Commercial Accounts')",
            "initial_message_template": "str — WhatsApp outreach message",
            "daily_limit": "int — Max messages per day (default 50)",
        },
        "effect": "Creates a new campaign in 'draft' status. Must be launched separately.",
    },
    "launch_campaign": {
        "description": "Enrolls matching leads and activates a draft campaign for dispatch.",
        "params": {"campaign_id": "str — ID of the campaign to launch"},
        "effect": "Resolves target leads, creates CampaignLead rows, sets status to 'active'.",
    },
    "update_lead_status": {
        "description": "Changes a lead's status (e.g. from 'new' to 'qualified' or 'contacted').",
        "params": {
            "lead_id": "str — ID of the lead",
            "status": "str — New status: new, contacted, qualified, converted, disqualified, opted_out",
        },
        "effect": "Updates the lead's status field in the database.",
    },
    "update_lead_score": {
        "description": "Adjusts a lead's qualification score (0-100).",
        "params": {
            "lead_id": "str — ID of the lead",
            "score": "int — New score (0-100)",
        },
        "effect": "Updates the lead's score in the database.",
    },
    "toggle_safe_mode": {
        "description": "Enables or disables the autonomous AI safe mode guardrail.",
        "params": {"enabled": "bool — True to enable, False to disable"},
        "effect": "Toggles the inter-brain bus safe mode. When enabled, EDITH requires operator approval for all actions.",
    },
    "get_campaign_stats": {
        "description": "Retrieves real-time statistics for a specific campaign.",
        "params": {"campaign_id": "str — ID of the campaign"},
        "effect": "Read-only. Returns total leads, sent count, replies, response rate — all from real data.",
    },
    "get_edith_activity_summary": {
        "description": "Retrieves EDITH's activity summary: total messages sent, replies, response rates.",
        "params": {},
        "effect": "Read-only. Returns aggregate EDITH dispatch activity from real CampaignLead data.",
    },
}


# ---------------------------------------------------------------------------
# Action Execution
# ---------------------------------------------------------------------------

async def execute_action(
    session: AsyncSession,
    org_id: str,
    action_name: str,
    params: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Executes a registered Friday action with full audit logging.
    Returns a result dict with 'success', 'message', and any action-specific data.
    """
    if action_name not in FRIDAY_ACTION_REGISTRY:
        return {
            "success": False,
            "message": f"Unknown action '{action_name}'. Available actions: {', '.join(FRIDAY_ACTION_REGISTRY.keys())}",
        }

    try:
        result = await _dispatch_action(session, org_id, action_name, params)

        # Log to AuditLog
        audit = AuditLog(
            org_id=org_id,
            user_id="friday_agent",
            action=f"friday_action:{action_name}",
            resource_type="campaign" if "campaign" in action_name else "lead" if "lead" in action_name else "system",
            resource_id=params.get("campaign_id") or params.get("lead_id"),
            changes={"params": params, "result": result.get("message", "")},
        )
        session.add(audit)

        # Log to AgentNotification
        notif = AgentNotification(
            org_id=org_id,
            sender_brain="FRIDAY",
            title=f"Friday Action: {action_name.replace('_', ' ').title()}",
            content=result.get("message", f"Action '{action_name}' executed."),
            category="FRIDAY_ACTION",
            severity="info" if result.get("success") else "warning",
            action_url="/campaigns" if "campaign" in action_name else "/leads" if "lead" in action_name else "/brain",
            metadata_payload={"action": action_name, "params": params, "actor": "friday_agent"},
        )
        session.add(notif)
        await session.commit()

        return result

    except Exception as e:
        logger.error(f"[Friday Action] Error executing '{action_name}': {e}")
        return {
            "success": False,
            "message": f"Action '{action_name}' failed: {str(e)}",
        }


async def describe_action(action_name: str) -> Dict[str, Any]:
    """Returns a description of what an action does and what parameters it takes."""
    if action_name not in FRIDAY_ACTION_REGISTRY:
        return {
            "found": False,
            "message": f"Unknown action '{action_name}'.",
            "available_actions": list(FRIDAY_ACTION_REGISTRY.keys()),
        }

    entry = FRIDAY_ACTION_REGISTRY[action_name]
    return {
        "found": True,
        "action": action_name,
        "description": entry["description"],
        "params": entry["params"],
        "effect": entry["effect"],
    }


def list_all_actions() -> List[Dict[str, Any]]:
    """Returns the full action registry with descriptions."""
    result = []
    for name, entry in FRIDAY_ACTION_REGISTRY.items():
        result.append({
            "action": name,
            "description": entry["description"],
            "params": entry["params"],
            "effect": entry["effect"],
        })
    return result


# ---------------------------------------------------------------------------
# Internal dispatch
# ---------------------------------------------------------------------------

async def _dispatch_action(
    session: AsyncSession,
    org_id: str,
    action_name: str,
    params: Dict[str, Any],
) -> Dict[str, Any]:
    """Routes action to the correct handler."""

    if action_name == "pause_campaign":
        return await _action_pause_campaign(session, org_id, params)
    elif action_name == "resume_campaign":
        return await _action_resume_campaign(session, org_id, params)
    elif action_name == "create_campaign":
        return await _action_create_campaign(session, org_id, params)
    elif action_name == "launch_campaign":
        return await _action_launch_campaign(session, org_id, params)
    elif action_name == "update_lead_status":
        return await _action_update_lead_status(session, org_id, params)
    elif action_name == "update_lead_score":
        return await _action_update_lead_score(session, org_id, params)
    elif action_name == "toggle_safe_mode":
        return await _action_toggle_safe_mode(params)
    elif action_name == "get_campaign_stats":
        return await _action_get_campaign_stats(session, params)
    elif action_name == "get_edith_activity_summary":
        return await _action_get_edith_activity(session, org_id)
    else:
        return {"success": False, "message": f"Action '{action_name}' not implemented."}


async def _action_pause_campaign(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("campaign_id")
    if not cid:
        return {"success": False, "message": "Missing required parameter: campaign_id"}
    campaign = await session.get(Campaign, cid)
    if not campaign:
        return {"success": False, "message": f"Campaign '{cid}' not found."}
    if campaign.status != "active":
        return {"success": False, "message": f"Campaign is '{campaign.status}', not active. Cannot pause."}
    campaign.status = "paused"
    await session.flush()
    return {"success": True, "message": f"Campaign '{campaign.name}' paused by Friday."}


async def _action_resume_campaign(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("campaign_id")
    if not cid:
        return {"success": False, "message": "Missing required parameter: campaign_id"}
    campaign = await session.get(Campaign, cid)
    if not campaign:
        return {"success": False, "message": f"Campaign '{cid}' not found."}
    if campaign.status != "paused":
        return {"success": False, "message": f"Campaign is '{campaign.status}', not paused. Cannot resume."}
    campaign.status = "active"
    await session.flush()
    return {"success": True, "message": f"Campaign '{campaign.name}' resumed by Friday."}


async def _action_create_campaign(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    name = params.get("name")
    if not name:
        return {"success": False, "message": "Missing required parameter: name"}
    template = params.get("initial_message_template", "")
    if not template:
        return {"success": False, "message": "Missing required parameter: initial_message_template"}

    campaign = Campaign(
        org_id=org_id,
        name=name,
        target_segment=params.get("target_segment", "all"),
        initial_message_template=template,
        daily_limit=params.get("daily_limit", 50),
        status="draft",
        actor="friday_agent",
    )
    session.add(campaign)
    await session.flush()
    return {
        "success": True,
        "message": f"Campaign '{name}' created in draft status by Friday.",
        "campaign_id": campaign.id,
    }


async def _action_launch_campaign(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("campaign_id")
    if not cid:
        return {"success": False, "message": "Missing required parameter: campaign_id"}
    campaign = await session.get(Campaign, cid)
    if not campaign:
        return {"success": False, "message": f"Campaign '{cid}' not found."}

    is_valid, error_msg = await campaign_engine.validate_campaign_launch(session, org_id, campaign)
    if not is_valid:
        return {"success": False, "message": error_msg}

    leads = await campaign_engine.resolve_target_leads(session, org_id, campaign)
    enrolled = await campaign_engine.enroll_leads(session, cid, leads)
    campaign.status = "active"
    campaign.start_date = utc_now()
    campaign.total_leads = enrolled
    await session.flush()
    return {
        "success": True,
        "message": f"Campaign '{campaign.name}' launched by Friday with {enrolled} leads enrolled.",
        "enrolled_count": enrolled,
    }


async def _action_update_lead_status(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    lid = params.get("lead_id")
    new_status = params.get("status")
    if not lid or not new_status:
        return {"success": False, "message": "Missing required parameters: lead_id, status"}
    valid_statuses = {"new", "contacted", "qualified", "converted", "disqualified", "opted_out"}
    if new_status not in valid_statuses:
        return {"success": False, "message": f"Invalid status '{new_status}'. Valid: {', '.join(sorted(valid_statuses))}"}
    lead = await session.get(Lead, lid)
    if not lead:
        return {"success": False, "message": f"Lead '{lid}' not found."}
    old_status = lead.status
    lead.status = new_status
    await session.flush()
    return {"success": True, "message": f"Lead '{lead.name or lid}' status changed from '{old_status}' to '{new_status}' by Friday."}


async def _action_update_lead_score(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    lid = params.get("lead_id")
    score = params.get("score")
    if not lid or score is None:
        return {"success": False, "message": "Missing required parameters: lead_id, score"}
    if not (0 <= int(score) <= 100):
        return {"success": False, "message": "Score must be between 0 and 100."}
    lead = await session.get(Lead, lid)
    if not lead:
        return {"success": False, "message": f"Lead '{lid}' not found."}
    old_score = lead.score
    lead.score = int(score)
    await session.flush()
    return {"success": True, "message": f"Lead '{lead.name or lid}' score changed from {old_score} to {score} by Friday."}


async def _action_toggle_safe_mode(params: Dict) -> Dict:
    from app.brain import inter_brain_bus
    enabled = params.get("enabled")
    if enabled is None:
        return {"success": False, "message": "Missing required parameter: enabled (bool)"}
    status = inter_brain_bus.toggle_safe_mode(bool(enabled))
    return {"success": True, "message": f"Safe mode {'enabled' if status else 'disabled'} by Friday.", "safe_mode_enabled": status}


async def _action_get_campaign_stats(session: AsyncSession, params: Dict) -> Dict:
    cid = params.get("campaign_id")
    if not cid:
        return {"success": False, "message": "Missing required parameter: campaign_id"}
    campaign = await session.get(Campaign, cid)
    if not campaign:
        return {"success": False, "message": f"Campaign '{cid}' not found."}
    stats = await campaign_engine.compute_campaign_stats(session, cid)
    return {"success": True, "message": f"Stats for '{campaign.name}'", "stats": stats, "campaign_name": campaign.name}


async def _action_get_edith_activity(session: AsyncSession, org_id: str) -> Dict:
    """Aggregates EDITH dispatch activity across all campaigns."""
    from sqlalchemy import func
    # Total sent
    sent_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status.in_(["sent", "delivered", "replied"])
    )
    total_sent = (await session.execute(sent_stmt)).scalar() or 0

    # Total replied
    replied_stmt = select(func.count(CampaignLead.id)).where(
        CampaignLead.delivery_status == "replied"
    )
    total_replied = (await session.execute(replied_stmt)).scalar() or 0

    # Total campaigns
    camp_stmt = select(func.count(Campaign.id)).where(Campaign.org_id == org_id)
    total_campaigns = (await session.execute(camp_stmt)).scalar() or 0

    response_rate = round((total_replied / total_sent * 100), 1) if total_sent > 0 else 0.0

    return {
        "success": True,
        "message": f"EDITH has sent {total_sent} messages across {total_campaigns} campaigns with a {response_rate}% response rate.",
        "total_sent": total_sent,
        "total_replied": total_replied,
        "total_campaigns": total_campaigns,
        "response_rate": response_rate,
    }
