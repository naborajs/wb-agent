"""
Worker job handler for processing inbound WhatsApp customer messages (Section 61).
"""

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.agent.orchestrator import AgentOrchestrator
from app.conversations.locking import ConversationLock
from app.utils.logging import logger


async def handle_process_message(
    session: AsyncSession,
    org_id: str,
    payload: Dict[str, Any],
    worker_id: str,
) -> Dict[str, Any]:
    """
    Acquires conversation turn lock, orchestrates AI decision cycle, and logs result.
    """
    conversation_id = payload["conversation_id"]
    inbound_text = payload["content"]
    sender_id = payload.get("sender_id")
    provider_message_id = payload.get("provider_message_id")

    # Acquire per-conversation distributed lock (ADR-004)
    async with ConversationLock(session, conversation_id, worker_id=worker_id):
        orchestrator = AgentOrchestrator(session, org_id)
        resp = await orchestrator.process_turn(
            conversation_id=conversation_id,
            inbound_message=inbound_text,
            sender_id=sender_id,
            provider_message_id=provider_message_id,
        )

        return {
            "conversation_id": conversation_id,
            "stage": resp.sales_stage_after,
            "score": resp.lead_score_after,
            "handoff": resp.handoff_created,
            "reply_sent": not resp.is_suppressed,
        }
