"""
Conversation management service: lifecycle, message logging, and human takeover controls.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.base import utc_now
from app.database.models import Conversation, Message, SalesEvent
from app.utils.logging import logger


class ConversationService:
    """
    Manages conversational threads, message append operations, and takeover states.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """Fetches conversation by ID with loaded messages."""
        stmt = (
            select(Conversation)
            .options(
                selectinload(Conversation.messages),
                selectinload(Conversation.customer),
                selectinload(Conversation.summary),
            )
            .where(
                Conversation.id == conversation_id,
                Conversation.org_id == self.org_id,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_or_create_conversation(
        self,
        customer_id: str,
        channel: str = "whatsapp",
        channel_id: str = "",
    ) -> Conversation:
        """
        Retrieves active conversation for customer on this channel, or creates a new one.
        """
        stmt = (
            select(Conversation)
            .where(
                Conversation.org_id == self.org_id,
                Conversation.customer_id == customer_id,
                Conversation.channel == channel,
                Conversation.mode != "CLOSED",
            )
            .order_by(Conversation.created_at.desc())
        )
        res = await self.session.execute(stmt)
        existing = res.scalars().first()
        if existing:
            return existing

        # Create new conversation
        conv = Conversation(
            org_id=self.org_id,
            customer_id=customer_id,
            channel=channel,
            channel_id=channel_id or customer_id,
            mode="AI",
            sales_stage="NEW",
            lead_score=10,
            is_hot=False,
            unread_count=0,
            last_message_at=utc_now(),
        )
        self.session.add(conv)
        await self.session.commit()
        return conv

    async def add_message(
        self,
        conversation_id: str,
        direction: str,
        sender_type: str,
        content: str,
        sender_id: Optional[str] = None,
        provider_message_id: Optional[str] = None,
        media_url: Optional[str] = None,
        media_type: Optional[str] = None,
        delivery_status: str = "sent",
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> Message:
        """
        Appends an inbound or outbound message, updating the conversation's timestamp and unread count.
        """
        # Idempotency check on provider_message_id if present
        if provider_message_id:
            stmt = select(Message).where(
                Message.org_id == self.org_id,
                Message.provider_message_id == provider_message_id,
            )
            existing_msg = (await self.session.execute(stmt)).scalar_one_or_none()
            if existing_msg:
                logger.info(f"Duplicate message with provider_id '{provider_message_id}' ignored.")
                return existing_msg

        msg = Message(
            org_id=self.org_id,
            conversation_id=conversation_id,
            direction=direction,
            sender_type=sender_type,
            sender_id=sender_id,
            content=content,
            provider_message_id=provider_message_id,
            media_url=media_url,
            media_type=media_type,
            delivery_status=delivery_status,
            raw_payload=raw_payload or {},
        )
        self.session.add(msg)

        # Update parent conversation
        conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
        conv = (await self.session.execute(conv_stmt)).scalar_one_or_none()
        if conv:
            conv.last_message_at = utc_now()
            if direction == "inbound":
                conv.unread_count += 1

        await self.session.commit()
        return msg

    async def update_mode(
        self,
        conversation_id: str,
        new_mode: str,
        reason: Optional[str] = None,
    ) -> Conversation:
        """
        Atomically updates conversation mode ('AI', 'HUMAN', 'PAUSED', 'CLOSED').
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        old_mode = conv.mode
        conv.mode = new_mode
        if new_mode == "HUMAN":
            # Reset unread on operator takeover
            conv.unread_count = 0

        await self.session.commit()
        logger.info(f"Conversation '{conversation_id}' mode changed from {old_mode} -> {new_mode} (reason: {reason})")
        return conv

    async def update_stage_and_score(
        self,
        conversation_id: str,
        new_stage: str,
        score_delta: int = 0,
        trigger_reason: str = "Turn update",
    ) -> Conversation:
        """
        Updates sales stage and lead score with an auditable SalesEvent record.
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        old_stage = conv.sales_stage
        conv.sales_stage = new_stage
        conv.lead_score = max(0, min(100, conv.lead_score + score_delta))

        # Hot lead threshold check
        if conv.lead_score >= 80 or new_stage in ("PURCHASE_INTENT", "QUALIFIED"):
            conv.is_hot = True

        event = SalesEvent(
            org_id=self.org_id,
            conversation_id=conv.id,
            customer_id=conv.customer_id,
            from_stage=old_stage,
            to_stage=new_stage,
            trigger_reason=trigger_reason,
            score_delta=score_delta,
        )
        self.session.add(event)
        await self.session.commit()
        return conv
