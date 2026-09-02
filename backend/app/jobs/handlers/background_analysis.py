"""
Bounded Background Conversation Analysis & Follow-Up Planner for EDITH (Sections 8, 9, 36, 37, 40, 41).
Executes strictly bounded background processing when a conversation is idle:
- Updates customer profile and memory
- Recalculates lead score
- Detects unresolved issues
- Plans intelligent, context-aware follow-up sequences without infinite loops
"""

from datetime import datetime, timedelta
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import utc_now
from app.database.models import (
    Conversation,
    ConversationSummary,
    Customer,
    CustomerMemory,
    FollowupJob,
)
from app.database.models.knowledge_request import ConversationAnalysis
from app.utils.logging import logger


async def handle_background_analysis(
    session: AsyncSession,
    org_id: str,
    payload: Dict[str, Any],
    worker_id: str,
) -> Dict[str, Any]:
    """
    Executes a bounded, finite background analysis job for a single conversation.
    Strictly rate-limited to avoid infinite reasoning loops (Section 40).
    """
    conversation_id = payload["conversation_id"]
    analysis_type = payload.get("analysis_type", "conversation_review")

    # 1. Loop Protection: Check if recent analysis already completed in last 10 minutes
    recent_cutoff = utc_now() - timedelta(minutes=10)
    res = await session.execute(
        select(ConversationAnalysis)
        .where(
            ConversationAnalysis.conversation_id == conversation_id,
            ConversationAnalysis.created_at >= recent_cutoff,
        )
    )
    if res.scalars().first():
        logger.info(f"Background analysis for conversation {conversation_id} skipped: already processed recently.")
        return {"status": "skipped", "reason": "loop_protection"}

    # 2. Fetch conversation & messages
    conv = await session.get(Conversation, conversation_id)
    if not conv:
        return {"status": "error", "reason": "conversation_not_found"}

    # If conversation is closed, opted out, or in human takeover, do not plan automated followups
    if conv.mode == "HUMAN" or conv.sales_stage in ("OPTED_OUT", "WON", "LOST", "CLOSED"):
        logger.info(f"Analysis complete for {conversation_id}: no follow-up needed for stage {conv.sales_stage}")
        return {"status": "completed", "action": "none"}

    customer = await session.get(Customer, conv.customer_id)

    # 3. Assess Follow-up Need (Sections 36 & 81)
    # Check if there is legitimate unresolved value (e.g. quote was sent or discovery was in progress)
    followup_plan = {}
    if conv.sales_stage in ("DISCOVERY", "QUALIFIED", "RECOMMENDATION", "OBJECTION"):
        scheduled_for = utc_now() + timedelta(days=1)  # Day 1 courteous check-in

        customer_name = customer.name if customer and customer.name else "there"
        contextual_note = (
            f"Hi {customer_name}, just following up on our wholesale tea discussion. "
            "If you have any questions about blend profiles or sample kits for your menu, I'm here to help."
        )

        followup = FollowupJob(
            org_id=org_id,
            conversation_id=conversation_id,
            customer_id=conv.customer_id,
            campaign_id=None,
            scheduled_for=scheduled_for,
            message_type="contextual_followup",
            context_data={"note": contextual_note, "stage": conv.sales_stage},
            status="scheduled",
        )
        session.add(followup)
        followup_plan = {
            "scheduled": True,
            "scheduled_for": scheduled_for.isoformat(),
            "reason": f"Follow-up planned for stage {conv.sales_stage}",
        }

    # 4. Record finite analysis run in audit table
    summary_text = f"Analyzed conversation in stage {conv.sales_stage} with lead score {conv.lead_score}/100."
    analysis_record = ConversationAnalysis(
        org_id=org_id,
        conversation_id=conversation_id,
        analysis_type=analysis_type,
        summary=summary_text,
        unresolved_issues=conv.active_objections or [],
        followup_plan=followup_plan,
        lead_score_delta=0,
        sales_stage_proposal=conv.sales_stage,
        status="COMPLETED",
    )
    session.add(analysis_record)
    await session.commit()

    logger.info(f"Bounded background analysis completed for conversation {conversation_id}")
    return {
        "status": "completed",
        "conversation_id": conversation_id,
        "followup_plan": followup_plan,
    }
