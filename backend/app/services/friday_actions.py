"""
Friday Action Registry & Execution Layer.
Exposes every actionable UI operation as a callable action Friday can invoke
over the Inter-Brain Bus, with full audit logging.

Every action Friday takes is logged with actor='friday_agent' to AgentNotification + AuditLog.
"""

import time
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
    "suggest_conversation_reply": {
        "description": "Generates a 1-Click AI draft suggestion for WhatsApp group or 1-on-1 chat, and broadcasts it live to operator composer.",
        "params": {
            "conversation_id": "str — ID of the conversation",
            "instructions": "str (optional) — Operator refinement directive (e.g. 'shorter', 'offer 5% discount')",
            "tone": "str (optional) — Tone of reply (e.g. 'formal', 'friendly')",
            "sender_participant": "str (optional) — Specific group participant to address",
        },
        "effect": "Produces contextual draft reply and transmits via WebSocket directly into the operator composer. Never auto-sends.",
    },
    "send_conversation_message": {
        "description": "Sends a message in a conversation on behalf of operator or AI.",
        "params": {
            "conversation_id": "str — ID of the conversation",
            "message": "str — Text content to send",
        },
        "effect": "Dispatches message via WhatsApp (or sandbox simulation if test) and logs to conversation history.",
    },
    "takeover_conversation": {
        "description": "Switches conversation mode between AI autonomous mode and HUMAN manual takeover mode.",
        "params": {
            "conversation_id": "str — ID of the conversation",
            "mode": "str — 'AI' or 'HUMAN'",
            "reason": "str (optional) — Reason for mode switch",
        },
        "effect": "Updates conversation mode in database and broadcasts status change to dashboard.",
    },
    "dispatch_ui_action": {
        "description": "Dispatches a live browser UI action (clicking, typing, navigating, theme changing) to all connected operator dashboard sessions.",
        "params": {
            "action_type": "str — 'click', 'type', 'navigate', 'theme', 'select_chat', or 'draft_reply'",
            "target": "str — Element name, selector, URL route, or target input",
            "value": "str (optional) — Text to type, theme name ('dark'/'light'), or draft content",
            "submit": "bool (optional) — Whether to press Enter after typing",
        },
        "effect": "Transmits 'friday_ui_action' WebSocket event. Connected dashboards execute the action natively in the browser DOM with visual highlighting.",
    },
    "click_ui_element": {
        "description": "Clicks any button, link, tab, switch, or clickable element across the entire website just like a human being.",
        "params": {"element_query": "str — Label, text, ID, or selector of the element to click (e.g. 'Suggest Reply', 'Take Over', 'Dark Mode')"},
        "effect": "Broadcasts click event to browser DOM with glowing cyan animated highlight ring.",
    },
    "fill_ui_input": {
        "description": "Types text into any input, search bar, composer, or textarea on the website just like a human being.",
        "params": {
            "target_query": "str — Name, placeholder, or selector of the input field",
            "text": "str — Text content to type",
            "submit": "bool (optional) — Whether to submit immediately",
        },
        "effect": "Broadcasts type event to browser DOM with synthetic React/Next.js input events.",
    },
    "navigate_page": {
        "description": "Navigates the website to any page or section (e.g. /conversations, /orders, /leads, /campaigns, /brain).",
        "params": {"path": "str — Target route path or section name"},
        "effect": "Broadcasts router navigation event to browser.",
    },
    "set_ui_theme": {
        "description": "Changes dashboard theme mode (dark, light, or toggle).",
        "params": {"theme": "str — 'dark', 'light', or 'toggle'"},
        "effect": "Broadcasts theme change event to browser.",
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
            resource_type="campaign" if "campaign" in action_name else "lead" if "lead" in action_name else "conversation" if "conversation" in action_name else "ui" if ("ui" in action_name or "theme" in action_name or "page" in action_name) else "system",
            resource_id=params.get("campaign_id") or params.get("lead_id") or params.get("conversation_id") or params.get("target") or params.get("element_query"),
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
            action_url="/conversations" if "conversation" in action_name else "/campaigns" if "campaign" in action_name else "/leads" if "lead" in action_name else "/brain",
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
    elif action_name == "suggest_conversation_reply":
        return await _action_suggest_conversation_reply(session, org_id, params)
    elif action_name == "send_conversation_message":
        return await _action_send_conversation_message(session, org_id, params)
    elif action_name == "takeover_conversation":
        return await _action_takeover_conversation(session, org_id, params)
    elif action_name == "dispatch_ui_action":
        return await _action_dispatch_ui_action(session, org_id, params)
    elif action_name == "click_ui_element":
        return await _action_click_ui_element(session, org_id, params)
    elif action_name == "fill_ui_input":
        return await _action_fill_ui_input(session, org_id, params)
    elif action_name == "navigate_page":
        return await _action_navigate_page(session, org_id, params)
    elif action_name == "set_ui_theme":
        return await _action_set_ui_theme(session, org_id, params)
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


async def _action_suggest_conversation_reply(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("conversation_id")
    if not cid:
        return {"success": False, "message": "Missing required parameter: conversation_id"}
    from app.conversations.service import ConversationService
    from app.realtime.connection_manager import ws_manager
    svc = ConversationService(session, org_id)
    res = await svc.suggest_reply(
        conversation_id=cid,
        instructions=params.get("instructions"),
        tone=params.get("tone"),
        sender_participant=params.get("sender_participant"),
    )
    if not res.get("success"):
        return {"success": False, "message": res.get("error", "Failed to generate reply suggestion.")}

    # Broadcast draft to active operator dashboard
    try:
        await ws_manager.broadcast_to_org(
            org_id,
            "friday_draft_reply",
            {
                "conversation_id": cid,
                "suggested_reply": res["suggested_reply"],
                "instructions": params.get("instructions"),
                "is_group": res.get("is_group", False),
            },
        )
        await ws_manager.broadcast_to_org(
            org_id,
            "friday_ui_action",
            {
                "action": "draft_reply",
                "conversation_id": cid,
                "text": res["suggested_reply"],
                "instructions": params.get("instructions"),
            },
        )
    except Exception as e:
        logger.warning(f"Could not broadcast draft reply via WS: {e}")

    return {
        "success": True,
        "message": f"Generated 1-Click AI suggestion for conversation {cid}.",
        "suggested_reply": res["suggested_reply"],
        "conversation_id": cid,
        "is_group": res.get("is_group", False),
    }


async def _action_send_conversation_message(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("conversation_id")
    content = params.get("message") or params.get("content")
    if not cid or not content:
        return {"success": False, "message": "Missing required parameters: conversation_id, message"}
    from app.conversations.service import ConversationService
    from app.whatsapp.service import WhatsAppService
    from app.realtime.connection_manager import ws_manager
    from app.utils.phone import is_sandbox_test_phone

    svc = ConversationService(session, org_id)
    conv = await svc.get_by_id(cid)
    if not conv:
        return {"success": False, "message": f"Conversation '{cid}' not found."}

    is_sim = (
        conv.channel != "whatsapp"
        or bool((conv.metadata_json or {}).get("is_simulation"))
        or is_sandbox_test_phone(conv.channel_id)
    )

    if is_sim:
        provider_msg_id = f"sim_friday_{int(time.time() * 1000)}"
        delivery_status = "delivered"
    else:
        wa = WhatsAppService.get_provider()
        wa_res = await wa.send_message(to_phone=conv.channel_id, text=content)
        provider_msg_id = wa_res.provider_message_id
        delivery_status = "sent" if wa_res.success else "failed"

    msg = await svc.add_message(
        conversation_id=cid,
        direction="outbound",
        sender_type="agent",
        content=content,
        provider_message_id=provider_msg_id,
        delivery_status=delivery_status,
        raw_payload={"is_simulation": is_sim, "sent_by": "friday_agent"},
    )

    try:
        await ws_manager.broadcast_to_org(
            org_id,
            "new_message",
            {
                "conversation_id": cid,
                "message_id": msg.id,
                "direction": "outbound",
                "sender_type": "agent",
                "content": msg.content,
                "channel_id": conv.channel_id,
                "status": msg.delivery_status,
                "is_simulation": is_sim,
                "created_at": str(msg.created_at),
            },
        )
    except Exception as e:
        logger.warning(f"Could not broadcast sent message via WS: {e}")

    return {
        "success": True,
        "message": f"Message sent to {conv.channel_id} by Friday.",
        "message_id": msg.id,
    }


async def _action_takeover_conversation(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    cid = params.get("conversation_id")
    mode = (params.get("mode") or "HUMAN").upper()
    if not cid:
        return {"success": False, "message": "Missing required parameter: conversation_id"}
    if mode not in ("AI", "HUMAN"):
        return {"success": False, "message": f"Invalid mode '{mode}'. Allowed: AI, HUMAN"}

    from app.conversations.service import ConversationService
    from app.realtime.connection_manager import ws_manager
    svc = ConversationService(session, org_id)
    conv = await svc.update_mode(cid, mode, reason=params.get("reason", "friday_action"))
    if not conv:
        return {"success": False, "message": f"Conversation '{cid}' not found."}

    try:
        await ws_manager.broadcast_to_org(
            org_id,
            "mode_changed",
            {"conversation_id": cid, "mode": mode, "actor": "friday_agent"},
        )
    except Exception as e:
        logger.warning(f"Could not broadcast mode change via WS: {e}")

    return {"success": True, "message": f"Conversation '{cid}' switched to mode {mode} by Friday.", "mode": mode}


async def _action_dispatch_ui_action(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    action_type = params.get("action_type") or params.get("action")
    target = params.get("target") or params.get("query") or params.get("path")
    if not action_type or not target:
        return {"success": False, "message": "Missing required parameters: action_type, target"}

    from app.realtime.connection_manager import ws_manager
    payload = {
        "action": action_type,
        "target": target,
        "query": target,
        "text": params.get("value") or params.get("text") or "",
        "path": target if action_type == "navigate" else params.get("path"),
        "theme": params.get("value") or params.get("theme") if action_type == "theme" else None,
        "submit": bool(params.get("submit", False)),
        "actor": "friday_agent",
        "timestamp": utc_now().isoformat(),
    }
    try:
        await ws_manager.broadcast_to_org(org_id, "friday_ui_action", payload)
    except Exception as e:
        logger.warning(f"Could not broadcast UI action via WS: {e}")

    return {
        "success": True,
        "message": f"Dispatched UI action '{action_type}' for target '{target}' across connected dashboards.",
        "payload": payload,
    }


async def _action_click_ui_element(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    query = params.get("element_query") or params.get("query") or params.get("target")
    if not query:
        return {"success": False, "message": "Missing required parameter: element_query"}
    return await _action_dispatch_ui_action(
        session, org_id, {"action_type": "click", "target": query}
    )


async def _action_fill_ui_input(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    query = params.get("target_query") or params.get("target")
    text = params.get("text") or params.get("value", "")
    submit = bool(params.get("submit", False))
    if not query:
        return {"success": False, "message": "Missing required parameter: target_query"}
    return await _action_dispatch_ui_action(
        session, org_id, {"action_type": "type", "target": query, "text": text, "submit": submit}
    )


async def _action_navigate_page(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    path = params.get("path") or params.get("target")
    if not path:
        return {"success": False, "message": "Missing required parameter: path"}
    return await _action_dispatch_ui_action(
        session, org_id, {"action_type": "navigate", "target": path, "path": path}
    )


async def _action_set_ui_theme(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    theme = params.get("theme") or params.get("value") or "toggle"
    return await _action_dispatch_ui_action(
        session, org_id, {"action_type": "theme", "target": "theme", "value": theme, "theme": theme}
    )
