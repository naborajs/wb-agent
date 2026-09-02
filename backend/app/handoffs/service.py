"""
Human Handoff and Operator Takeover Service (Section 43 & 44).
"""

from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.base import utc_now
from app.database.models import Conversation, Customer, Handoff, Notification
from app.utils.logging import logger


class HandoffService:
    """
    Orchestrates smooth handover from AI sales automation to live human operators.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def create_handoff(
        self,
        conversation_id: str,
        reason: str,
        summary: str,
        customer_intent: Optional[str] = None,
        notify_owner: bool = True,
    ) -> Handoff:
        """
        Pauses AI automation, creates handoff entity, and emits owner notification.
        """
        conv = await self.session.get(Conversation, conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        customer = await self.session.get(Customer, conv.customer_id)

        # Atomic takeover state update (ADR-008)
        conv.mode = "HUMAN"
        conv.sales_stage = "HUMAN_HANDOFF"

        handoff = Handoff(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=conv.customer_id,
            reason=reason,
            status="pending",
            summary=summary,
            customer_intent=customer_intent,
        )
        self.session.add(handoff)

        if notify_owner:
            owner_alert = Notification(
                org_id=self.org_id,
                recipient="+918900653250",
                channel="whatsapp",
                notification_type="HUMAN_HELP_REQUIRED",
                content=(
                    f"⚠️ HUMAN TAKEOVER REQUIRED\n"
                    f"Customer: {customer.name if customer else 'Lead'}\n"
                    f"Reason: {reason.upper()}\n"
                    f"Summary: {summary}\n"
                    f"Action: Please open dashboard live inbox to reply."
                ),
                status="queued",
            )
            self.session.add(owner_alert)

        await self.session.commit()
        logger.info(f"Handoff created for conversation '{conversation_id}' (reason: {reason}).")
        return handoff

    async def resolve_handoff(
        self,
        handoff_id: str,
        resolution_notes: Optional[str] = None,
        resume_ai: bool = False,
    ) -> Handoff:
        """
        Resolves a handoff, optionally restoring AI automation mode.
        """
        stmt = select(Handoff).where(Handoff.id == handoff_id, Handoff.org_id == self.org_id)
        res = await self.session.execute(stmt)
        handoff = res.scalar_one_or_none()
        if not handoff:
            raise ValueError(f"Handoff '{handoff_id}' not found.")

        handoff.status = "resolved"
        handoff.resolved_at = utc_now()

        if resume_ai:
            conv = await self.session.get(Conversation, handoff.conversation_id)
            if conv:
                conv.mode = "AI"

        await self.session.commit()
        logger.info(f"Handoff '{handoff_id}' resolved (resume_ai: {resume_ai}).")
        return handoff

    async def list_pending(self) -> List[Handoff]:
        """Lists active unresolved handoffs."""
        stmt = (
            select(Handoff)
            .where(Handoff.org_id == self.org_id, Handoff.status == "pending")
            .order_by(Handoff.created_at.desc())
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())
