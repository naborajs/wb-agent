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
    "set_model_role": {
        "description": "Assigns a specific AI model to an operational role (Friday Web Copilot, EDITH Sales Closer, Voice Agent, Policy Auditor, Watchdog).",
        "params": {
            "role": "str — Target role: 'friday_web_model', 'edith_sales_model', 'friday_voice_model', 'edith_policy_model', or 'system_watchdog_model'",
            "model_id": "str — AI model identifier (e.g. 'gemini-2.5-pro', 'meta/llama-3.3-70b-instruct')",
        },
        "effect": "Updates active system runtime memory and persists the assignment to the .env file.",
    },
    "update_model_settings": {
        "description": "Calibrates LLM hyperparameters (temperature, max_tokens, timeout, primary model).",
        "params": {
            "temperature": "float (optional) — Inference temperature (0.0 to 1.0)",
            "max_tokens": "int (optional) — Token ceiling (256 to 4096)",
            "timeout": "int (optional) — Timeout in seconds (15 to 120)",
            "primary_model": "str (optional) — Primary model identifier",
        },
        "effect": "Updates runtime settings and persists variables in the .env file.",
    },
    "open_playground": {
        "description": "Opens the unified AI Model Playground studio on connected operator dashboards, optionally pre-selecting a model.",
        "params": {
            "model_id": "str (optional) — AI model ID to activate in the playground",
        },
        "effect": "Navigates dashboard to /playground and broadcasts activation event.",
    },
    "configure_playground": {
        "description": "Adjusts live playground parameters (model, temperature, max_tokens, system prompt) on connected operator dashboards.",
        "params": {
            "model_id": "str (optional) — AI model ID",
            "temperature": "float (optional) — Temperature (0.0 to 1.0)",
            "max_tokens": "int (optional) — Token ceiling",
            "system_prompt": "str (optional) — System prompt text",
        },
        "effect": "Broadcasts live playground configuration event to all open playground views.",
    },
    "report_problem": {
        "description": "Records an issue, capability gap, or bug report into Friday's persistent issue tracking system with full telemetry and developer diagnostics.",
        "params": {
            "title": "str — Short summary of the problem or missing capability",
            "description": "str — Detailed description of what failed or was requested",
            "category": "str (optional) — 'CAPABILITY_GAP', 'INTERNAL_ERROR', 'TOOL_FAILURE', or 'USER_REPORTED'",
            "severity": "str (optional) — 'low', 'medium', 'high', or 'critical'",
            "user_instruction": "str (optional) — Original user prompt",
            "suggested_fix": "str (optional) — Developer guidance or suggestion",
        },
        "effect": "Creates a persistent FridayProblemReport in SQLite & JSONL audit trail, and broadcasts an alert to the operator dashboard.",
    },
    "create_prompt_section": {
        "description": "Creates a new dynamic system prompt section with name, description, and initial instructions.",
        "params": {
            "name": "str — Section display name",
            "description": "str (optional) — Summary of the section's rule domain",
            "starter_instructions": "str (optional) — Initial instructions",
        },
        "effect": "Adds a new section to the prompt architecture and emits a real-time event.",
    },
    "toggle_prompt_section": {
        "description": "Enables or disables a system prompt section without deleting its history.",
        "params": {
            "section": "str — Section slug key or name (e.g. 'returns_policy', 'sales_style')",
            "is_active": "bool — True to enable, False to disable",
        },
        "effect": "Toggles section active state; disabled sections are omitted from live prompt assembly.",
    },
    "archive_prompt_section": {
        "description": "Archives (soft-deletes) a custom prompt section. System sections are protected from deletion.",
        "params": {
            "section": "str — Section slug key or name to archive",
            "confirmed": "bool (optional) — Confirmation flag for destructive action",
        },
        "effect": "Soft-deletes the section; requires verbal confirmation loop.",
    },
    "rollback_prompt_section": {
        "description": "Rolls back a prompt section to a specified prior version with an audit trail.",
        "params": {
            "section": "str — Section slug key or name",
            "version": "int — Target version number to restore",
            "confirmed": "bool (optional) — Confirmation flag for rollback",
            "reason": "str (optional) — Reason for rollback",
        },
        "effect": "Activates the historical version; requires verbal confirmation loop.",
    },
    "compare_prompt_versions": {
        "description": "Computes a line-level diff between two prompt versions and returns a verbal summary.",
        "params": {
            "section": "str — Section slug key or name",
            "from_version": "int — Base version number",
            "to_version": "int — Comparison version number",
        },
        "effect": "Returns addition, deletion, and unchanged line counts for spoken briefing.",
    },
    "reset_prompt_section_default": {
        "description": "Resets a system prompt section to its original factory-shipped seed instructions.",
        "params": {
            "section": "str — Section slug key or name",
            "confirmed": "bool (optional) — Confirmation flag",
        },
        "effect": "Restores factory default instructions; requires verbal confirmation loop.",
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
        from app.services.friday_report_service import FridayReportService
        rep = await FridayReportService.record_problem(
            session=session,
            org_id=org_id,
            category="CAPABILITY_GAP",
            title=f"Unregistered Action: {action_name}",
            description=f"Friday or user attempted to invoke action '{action_name}' which is not in the action registry.",
            user_instruction=params.get("user_instruction"),
            context_data={"action_name": action_name, "params": params},
            suggested_fix=f"Register '{action_name}' in FRIDAY_ACTION_REGISTRY or create corresponding handler.",
            severity="medium",
        )
        return {
            "success": False,
            "message": f"Unknown action '{action_name}'. Logged to Friday issue registry as `{rep['report_code']}`.",
            "report_code": rep["report_code"],
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
        import traceback
        tb = traceback.format_exc()
        logger.error(f"[Friday Action] Error executing '{action_name}': {e}")
        from app.services.friday_report_service import FridayReportService
        rep = await FridayReportService.record_problem(
            session=session,
            org_id=org_id,
            category="TOOL_FAILURE",
            title=f"Action Failure: {action_name}",
            description=f"Action '{action_name}' encountered an unhandled exception: {str(e)}",
            user_instruction=params.get("user_instruction"),
            error_trace=tb,
            context_data={"action_name": action_name, "params": params},
            suggested_fix=f"Inspect execution handler for '{action_name}' in backend/app/services/friday_actions.py",
            severity="high",
        )
        return {
            "success": False,
            "message": f"Action '{action_name}' failed: {str(e)} (Issue recorded as `{rep['report_code']}`)",
            "report_code": rep["report_code"],
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
    elif action_name == "set_model_role":
        return await _action_set_model_role(session, org_id, params)
    elif action_name == "update_model_settings":
        return await _action_update_model_settings(session, org_id, params)
    elif action_name == "open_playground":
        return await _action_open_playground(session, org_id, params)
    elif action_name == "configure_playground":
        return await _action_configure_playground(session, org_id, params)
    elif action_name == "report_problem":
        return await _action_report_problem(session, org_id, params)
    elif action_name == "create_prompt_section":
        return await _action_create_prompt_section(session, org_id, params)
    elif action_name == "toggle_prompt_section":
        return await _action_toggle_prompt_section(session, org_id, params)
    elif action_name == "archive_prompt_section":
        return await _action_archive_prompt_section(session, org_id, params)
    elif action_name == "rollback_prompt_section":
        return await _action_rollback_prompt_section(session, org_id, params)
    elif action_name == "compare_prompt_versions":
        return await _action_compare_prompt_versions(session, org_id, params)
    elif action_name == "reset_prompt_section_default":
        return await _action_reset_prompt_section_default(session, org_id, params)
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


async def _action_set_model_role(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    raw_role = str(params.get("role") or "").strip().lower()
    raw_model = str(params.get("model_id") or params.get("model") or "").strip()
    if not raw_role or not raw_model:
        return {"success": False, "message": "Missing required parameters: role, model_id"}

    role_map = {
        "friday": "friday_web_model",
        "friday_web": "friday_web_model",
        "friday_web_model": "friday_web_model",
        "copilot": "friday_web_model",
        "web_copilot": "friday_web_model",
        "edith": "edith_sales_model",
        "edith_sales": "edith_sales_model",
        "edith_sales_model": "edith_sales_model",
        "sales": "edith_sales_model",
        "closer": "edith_sales_model",
        "whatsapp_sales": "edith_sales_model",
        "voice": "friday_voice_model",
        "friday_voice": "friday_voice_model",
        "friday_voice_model": "friday_voice_model",
        "voice_agent": "friday_voice_model",
        "policy": "edith_policy_model",
        "edith_policy": "edith_policy_model",
        "edith_policy_model": "edith_policy_model",
        "margin": "edith_policy_model",
        "margin_auditor": "edith_policy_model",
        "watchdog": "system_watchdog_model",
        "system_watchdog": "system_watchdog_model",
        "system_watchdog_model": "system_watchdog_model",
        "supervisor": "system_watchdog_model",
    }
    canonical_role = role_map.get(raw_role.replace("-", "_").replace(" ", "_"), raw_role)

    # Normalize model ID against known catalog
    known_catalog = [
        "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-flash-live-preview",
        "gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest",
        "meta/llama-3.3-70b-instruct", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "nvidia/nemotron-3-super-120b-a12b", "nvidia/nemotron-4-340b-instruct",
        "nvidia/nemotron-3-ultra-550b-a55b", "deepseek-ai/deepseek-r1",
        "qwen/qwen2.5-72b-instruct", "mistralai/mistral-large-2411",
        "google/gemma-4-31b-it", "google/diffusiongemma-26b-a4b-it", "openai/gpt-oss-20b"
    ]
    canonical_model = raw_model
    for known in known_catalog:
        if raw_model.lower() == known.lower() or raw_model.lower() in known.lower():
            canonical_model = known
            break

    from app.api.routes.settings import update_local_env_file

    env_key = canonical_role.upper()
    setattr(settings, env_key, canonical_model)
    update_local_env_file({env_key: canonical_model})

    friendly_roles = {
        "friday_web_model": "Friday Web Copilot",
        "edith_sales_model": "EDITH WhatsApp Sales Closer",
        "friday_voice_model": "Friday Voice Agent",
        "edith_policy_model": "EDITH Margin & Policy Auditor",
        "system_watchdog_model": "System Watchdog Supervisor",
    }
    role_label = friendly_roles.get(canonical_role, canonical_role)

    return {
        "success": True,
        "message": f"Assigned model **{canonical_model}** to **{role_label}** and persisted to .env.",
        "role": canonical_role,
        "model_id": canonical_model,
    }


async def _action_update_model_settings(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.api.routes.settings import update_local_env_file
    env_updates: Dict[str, str] = {}
    updated_items = []

    if "primary_model" in params and params["primary_model"]:
        m = str(params["primary_model"]).strip()
        settings.NVIDIA_MODEL = m
        env_updates["NVIDIA_MODEL"] = m
        updated_items.append(f"Primary Model: {m}")

    if "temperature" in params and params["temperature"] is not None:
        try:
            t = float(params["temperature"])
            t = max(0.0, min(1.0, round(t, 2)))
            settings.LLM_TEMPERATURE = t
            env_updates["LLM_TEMPERATURE"] = str(t)
            updated_items.append(f"Temperature: {t}")
        except ValueError:
            pass

    if "max_tokens" in params and params["max_tokens"] is not None:
        try:
            mt = int(params["max_tokens"])
            mt = max(128, min(8192, mt))
            settings.LLM_MAX_TOKENS = mt
            env_updates["LLM_MAX_TOKENS"] = str(mt)
            updated_items.append(f"Max Tokens: {mt}")
        except ValueError:
            pass

    if "timeout" in params and params["timeout"] is not None:
        try:
            to = int(params["timeout"])
            to = max(10, min(300, to))
            settings.LLM_REQUEST_TIMEOUT = to
            env_updates["LLM_REQUEST_TIMEOUT"] = str(to)
            updated_items.append(f"Timeout: {to}s")
        except ValueError:
            pass

    if env_updates:
        update_local_env_file(env_updates)

    msg = f"Updated system LLM parameters: {', '.join(updated_items)}." if updated_items else "No parameters modified."
    return {
        "success": bool(updated_items),
        "message": msg,
        "updates": env_updates,
    }


async def _action_open_playground(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    raw_model = str(params.get("model_id") or params.get("model") or "").strip()
    # Normalize model ID if provided
    canonical_model = raw_model
    if raw_model:
        known_catalog = [
            "gemini-2.5-flash", "gemini-2.5-pro", "gemini-3.1-flash-live-preview",
            "gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest",
            "meta/llama-3.3-70b-instruct", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
            "nvidia/nemotron-3-super-120b-a12b", "nvidia/nemotron-4-340b-instruct",
            "nvidia/nemotron-3-ultra-550b-a55b", "deepseek-ai/deepseek-r1",
            "qwen/qwen2.5-72b-instruct", "mistralai/mistral-large-2411",
            "google/gemma-4-31b-it", "google/diffusiongemma-26b-a4b-it", "openai/gpt-oss-20b"
        ]
        for known in known_catalog:
            if raw_model.lower() == known.lower() or raw_model.lower() in known.lower():
                canonical_model = known
                break

    path = f"/playground?model={canonical_model}" if canonical_model else "/playground"
    await _action_dispatch_ui_action(
        session, org_id, {"action_type": "navigate", "target": path, "path": path}
    )

    if canonical_model:
        from app.realtime.connection_manager import ws_manager
        try:
            await ws_manager.broadcast_to_org(
                org_id,
                "friday_ui_action",
                {
                    "action": "playground_configure",
                    "model_id": canonical_model,
                    "actor": "friday_agent",
                    "timestamp": utc_now().isoformat(),
                },
            )
        except Exception as e:
            logger.warning(f"Could not broadcast playground model update: {e}")

    return {
        "success": True,
        "message": f"Opened AI Model Playground{' with model ' + canonical_model if canonical_model else ''} on operator screen.",
        "path": path,
        "model_id": canonical_model,
    }


async def _action_configure_playground(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.realtime.connection_manager import ws_manager
    payload = {
        "action": "playground_configure",
        "model_id": params.get("model_id"),
        "temperature": params.get("temperature"),
        "max_tokens": params.get("max_tokens"),
        "system_prompt": params.get("system_prompt"),
        "actor": "friday_agent",
        "timestamp": utc_now().isoformat(),
    }
    try:
        await ws_manager.broadcast_to_org(org_id, "friday_ui_action", payload)
    except Exception as e:
        logger.warning(f"Could not broadcast playground configure: {e}")

    return {
        "success": True,
        "message": "Playground studio parameters updated live on screen.",
        "payload": payload,
    }


async def _action_report_problem(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.services.friday_report_service import FridayReportService
    title = params.get("title") or "Reported Problem"
    description = params.get("description") or title
    category = params.get("category") or "USER_REPORTED"
    severity = params.get("severity") or "medium"
    user_instruction = params.get("user_instruction")
    suggested_fix = params.get("suggested_fix")

    rep = await FridayReportService.record_problem(
        session=session,
        org_id=org_id,
        category=category,
        title=title,
        description=description,
        user_instruction=user_instruction,
        suggested_fix=suggested_fix,
        severity=severity,
    )
    return {
        "success": True,
        "message": f"Problem report '{rep['report_code']}' filed successfully: {title}",
        "report": rep,
        "report_code": rep["report_code"],
    }


# -------------------------------------------------------------
# Modular Prompt Section Actions
# -------------------------------------------------------------
async def _action_create_prompt_section(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService
    from app.realtime.connection_manager import ws_manager
    name = params.get("name") or params.get("title") or "New Section"
    key = params.get("key") or name.lower().replace(" ", "_").replace("-", "_")
    desc = params.get("description") or f"System instructions for {name}"
    instructions = params.get("starter_instructions") or params.get("instructions") or ""

    svc = PromptService(session, org_id)
    sec = await svc.create_section(
        key=key,
        display_name=name,
        description=desc,
        starter_instructions=instructions,
        created_by="friday-voice",
    )
    try:
        await ws_manager.broadcast_to_org(org_id, "section_created", {"id": sec.id, "key": sec.key, "display_name": sec.display_name})
    except Exception:
        pass
    return {"success": True, "message": f"Created new prompt section '{sec.display_name}'.", "section_id": sec.id, "key": sec.key}


async def _action_toggle_prompt_section(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService
    from app.realtime.connection_manager import ws_manager
    target = params.get("section") or params.get("key") or ""
    is_active = params.get("is_active", True)
    svc = PromptService(session, org_id)
    sec = await svc.get_section(target)
    if not sec:
        return {"success": False, "message": f"Section '{target}' not found."}
    updated = await svc.update_section(sec.id, is_active=is_active)
    try:
        await ws_manager.broadcast_to_org(org_id, "section_toggled", {"id": updated.id, "key": updated.key, "is_active": updated.is_active})
    except Exception:
        pass
    status_str = "enabled" if is_active else "disabled"
    return {"success": True, "message": f"Prompt section '{updated.display_name}' is now {status_str}.", "is_active": is_active}


async def _action_archive_prompt_section(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService
    from app.realtime.connection_manager import ws_manager
    target = params.get("section") or params.get("key") or ""
    confirmed = params.get("confirmed", False)
    svc = PromptService(session, org_id)
    sec = await svc.get_section(target)
    if not sec:
        return {"success": False, "message": f"Section '{target}' not found."}
    if sec.is_system:
        return {"success": False, "message": f"System section '{sec.display_name}' cannot be archived or deleted."}

    if not confirmed:
        return {
            "success": False,
            "requires_confirmation": True,
            "confirmation_prompt": f"You want me to archive section '{sec.display_name}' — confirm?",
            "action": "archive_prompt_section",
            "pending_params": params,
        }

    success, msg = await svc.archive_section(sec.id)
    if success:
        try:
            await ws_manager.broadcast_to_org(org_id, "section_archived", {"id": sec.id, "key": sec.key, "display_name": sec.display_name})
        except Exception:
            pass
    return {"success": success, "message": msg}


async def _action_rollback_prompt_section(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService
    from app.realtime.connection_manager import ws_manager
    target = params.get("section") or params.get("key") or ""
    version = int(params.get("version") or 1)
    confirmed = params.get("confirmed", False)
    reason = params.get("reason") or "Voice command rollback"

    svc = PromptService(session, org_id)
    sec = await svc.get_section(target)
    target_name = sec.display_name if sec else target

    if not confirmed:
        return {
            "success": False,
            "requires_confirmation": True,
            "confirmation_prompt": f"You want me to roll {target_name} back to version {version} — confirm?",
            "action": "rollback_prompt_section",
            "pending_params": params,
        }

    ver = await svc.activate_version(target, version, author="friday-voice", reason=reason)
    if not ver:
        return {"success": False, "message": f"Version {version} not found for '{target_name}'."}

    try:
        await ws_manager.broadcast_to_org(org_id, "version_rolled_back", {"section": ver.section_name, "version": ver.version, "author": "friday-voice", "change_summary": ver.change_summary})
    except Exception:
        pass
    return {"success": True, "message": f"Rolled {target_name} back to Version {ver.version}.", "version": ver.version}


async def _action_compare_prompt_versions(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService, compute_line_diff
    from sqlalchemy import select
    from app.database.models import PromptVersion
    target = params.get("section") or params.get("key") or ""
    from_v = int(params.get("from_version") or 1)
    to_v = int(params.get("to_version") or 2)

    svc = PromptService(session, org_id)
    sec = await svc.get_section(target)
    sec_id = sec.id if sec else None
    slug_key = sec.key if sec else target

    v1_stmt = select(PromptVersion).where(PromptVersion.org_id == org_id, (PromptVersion.section_id == sec_id) if sec_id else (PromptVersion.section_name == slug_key), PromptVersion.version == from_v)
    v1 = (await session.execute(v1_stmt)).scalar_one_or_none()
    v2_stmt = select(PromptVersion).where(PromptVersion.org_id == org_id, (PromptVersion.section_id == sec_id) if sec_id else (PromptVersion.section_name == slug_key), PromptVersion.version == to_v)
    v2 = (await session.execute(v2_stmt)).scalar_one_or_none()

    if not v1 or not v2:
        return {"success": False, "message": f"Could not find versions v{from_v} and v{to_v} to compare."}

    diff_data = compute_line_diff(v1.content, v2.content)
    spoken_summary = (
        f"Comparing {sec.display_name if sec else slug_key} version {from_v} to version {to_v}: "
        f"{diff_data['added_count']} lines added, {diff_data['removed_count']} lines removed, "
        f"and {diff_data['unchanged_count']} lines unchanged."
    )
    return {
        "success": True,
        "message": spoken_summary,
        "summary": spoken_summary,
        "added_count": diff_data["added_count"],
        "removed_count": diff_data["removed_count"],
    }


async def _action_reset_prompt_section_default(session: AsyncSession, org_id: str, params: Dict) -> Dict:
    from app.agent.prompts import PromptService
    from app.realtime.connection_manager import ws_manager
    target = params.get("section") or params.get("key") or ""
    confirmed = params.get("confirmed", False)

    svc = PromptService(session, org_id)
    sec = await svc.get_section(target)
    target_name = sec.display_name if sec else target

    if not confirmed:
        return {
            "success": False,
            "requires_confirmation": True,
            "confirmation_prompt": f"You want me to reset {target_name} to factory default — confirm?",
            "action": "reset_prompt_section_default",
            "pending_params": params,
        }

    success, msg, new_ver = await svc.reset_to_default(target, author="friday-voice")
    if not success:
        return {"success": False, "message": msg}

    try:
        await ws_manager.broadcast_to_org(org_id, "prompt_updated", {"section": new_ver.section_name, "version": new_ver.version, "author": "friday-voice", "change_summary": new_ver.change_summary})
    except Exception:
        pass
    return {"success": True, "message": f"Reset {target_name} to factory default.", "version": new_ver.version}

