"""
Conversation memory and rolling semantic summarization.
"""

from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Conversation, ConversationSummary, Message


class ConversationMemoryService:
    """
    Manages short-term rolling conversational window and long-term conversation summaries.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_recent_messages(
        self,
        conversation_id: str,
        limit: int = 10,
    ) -> List[Message]:
        """Fetches the latest messages for a conversation ordered chronologically."""
        stmt = (
            select(Message)
            .where(
                Message.org_id == self.org_id,
                Message.conversation_id == conversation_id,
            )
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        # Reverse to chronological order (oldest -> newest)
        return list(reversed(res.scalars().all()))

    async def get_or_create_summary(
        self,
        conversation_id: str,
    ) -> Optional[ConversationSummary]:
        """Retrieves existing summary record if available."""
        stmt = select(ConversationSummary).where(
            ConversationSummary.conversation_id == conversation_id
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def update_summary(
        self,
        conversation_id: str,
        summary_text: str,
        key_points: Optional[List[str]] = None,
        active_objections: Optional[List[str]] = None,
        customer_goals: Optional[str] = None,
    ) -> ConversationSummary:
        """Updates or creates the rolling conversation summary."""
        existing = await self.get_or_create_summary(conversation_id)
        if existing:
            existing.summary = summary_text
            if key_points is not None:
                existing.key_points = key_points
            if active_objections is not None:
                existing.active_objections = active_objections
            if customer_goals is not None:
                existing.customer_goals = customer_goals
            await self.session.commit()
            return existing

        new_summary = ConversationSummary(
            conversation_id=conversation_id,
            summary=summary_text,
            key_points=key_points or [],
            active_objections=active_objections or [],
            customer_goals=customer_goals,
        )
        self.session.add(new_summary)
        await self.session.commit()
        return new_summary
