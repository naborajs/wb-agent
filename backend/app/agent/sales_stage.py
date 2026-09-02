"""
Sales Stage State Machine (Section 28).

Enforces valid forward and controlled backward transitions across the 16 stages:
NEW -> CONTACTED -> REPLIED -> DISCOVERY -> QUALIFYING -> QUALIFIED ->
RECOMMENDATION -> INTERESTED -> OBJECTION -> NEGOTIATION -> PURCHASE_INTENT ->
HUMAN_HANDOFF -> WON / LOST / OPTED_OUT / PAUSED.
"""

from typing import Dict, List, Optional, Set
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Conversation, SalesEvent
from app.utils.logging import logger

VALID_STAGES: Set[str] = {
    "NEW",
    "CONTACTED",
    "REPLIED",
    "DISCOVERY",
    "QUALIFYING",
    "QUALIFIED",
    "RECOMMENDATION",
    "INTERESTED",
    "OBJECTION",
    "NEGOTIATION",
    "PURCHASE_INTENT",
    "HUMAN_HANDOFF",
    "WON",
    "LOST",
    "OPTED_OUT",
    "PAUSED",
}

# Permitted state transitions (forward and controlled backward)
ALLOWED_TRANSITIONS: Dict[str, Set[str]] = {
    "NEW": {"CONTACTED", "REPLIED", "OPTED_OUT", "PAUSED"},
    "CONTACTED": {"REPLIED", "DISCOVERY", "OPTED_OUT", "PAUSED", "LOST"},
    "REPLIED": {"DISCOVERY", "QUALIFYING", "OPTED_OUT", "PAUSED", "HUMAN_HANDOFF"},
    "DISCOVERY": {"QUALIFYING", "QUALIFIED", "RECOMMENDATION", "OBJECTION", "HUMAN_HANDOFF", "OPTED_OUT", "PAUSED"},
    "QUALIFYING": {"QUALIFIED", "DISCOVERY", "RECOMMENDATION", "OBJECTION", "HUMAN_HANDOFF", "OPTED_OUT"},
    "QUALIFIED": {"RECOMMENDATION", "INTERESTED", "OBJECTION", "NEGOTIATION", "HUMAN_HANDOFF", "OPTED_OUT"},
    "RECOMMENDATION": {"INTERESTED", "OBJECTION", "NEGOTIATION", "PURCHASE_INTENT", "HUMAN_HANDOFF", "OPTED_OUT"},
    "INTERESTED": {"OBJECTION", "NEGOTIATION", "PURCHASE_INTENT", "HUMAN_HANDOFF", "OPTED_OUT"},
    "OBJECTION": {"DISCOVERY", "RECOMMENDATION", "NEGOTIATION", "PURCHASE_INTENT", "HUMAN_HANDOFF", "LOST", "OPTED_OUT"},
    "NEGOTIATION": {"PURCHASE_INTENT", "HUMAN_HANDOFF", "OBJECTION", "LOST", "OPTED_OUT"},
    "PURCHASE_INTENT": {"HUMAN_HANDOFF", "WON", "NEGOTIATION", "LOST", "OPTED_OUT"},
    "HUMAN_HANDOFF": {"DISCOVERY", "WON", "LOST", "PAUSED", "OPTED_OUT"},
    "WON": {"PAUSED", "DISCOVERY"},
    "LOST": {"NEW", "CONTACTED", "DISCOVERY"},
    "OPTED_OUT": set(),  # Terminal state unless explicit customer re-consent
    "PAUSED": {"DISCOVERY", "QUALIFIED", "HUMAN_HANDOFF", "OPTED_OUT"},
}


class SalesStageManager:
    """
    Manages stage machine progression and records auditable SalesEvents.
    """

    @classmethod
    def can_transition(cls, current_stage: str, target_stage: str) -> bool:
        """Checks if a transition between two sales stages is permissible."""
        if target_stage not in VALID_STAGES:
            return False
        if current_stage == target_stage:
            return True
        allowed = ALLOWED_TRANSITIONS.get(current_stage, set())
        return target_stage in allowed

    @classmethod
    async def transition(
        cls,
        session: AsyncSession,
        conversation: Conversation,
        target_stage: str,
        reason: str,
        score_delta: int = 0,
        org_id: str = "org_default_tea",
    ) -> Conversation:
        """
        Executes an authorized sales stage transition and records an immutable event.
        """
        current = conversation.sales_stage
        if not cls.can_transition(current, target_stage):
            logger.warning(
                f"Invalid stage transition rejected: {current} -> {target_stage} for conv {conversation.id}."
            )
            return conversation

        conversation.sales_stage = target_stage
        conversation.lead_score = max(0, min(100, conversation.lead_score + score_delta))

        # Hot lead evaluation
        if target_stage in ("PURCHASE_INTENT", "QUALIFIED") or conversation.lead_score >= 80:
            conversation.is_hot = True

        event = SalesEvent(
            org_id=org_id,
            conversation_id=conversation.id,
            customer_id=conversation.customer_id,
            from_stage=current,
            to_stage=target_stage,
            trigger_reason=reason,
            score_delta=score_delta,
        )
        session.add(event)
        await session.commit()

        logger.info(f"Sales stage transitioned: {current} -> {target_stage} (score: {conversation.lead_score})")
        return conversation
