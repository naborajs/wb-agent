"""
ContextBuilder: constructs the structured contextual payload for every agent turn (Section 22).
"""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Customer, Conversation
from app.memory.customer import CustomerMemoryService
from app.memory.conversation import ConversationMemoryService
from app.conversations.service import ConversationService


class ConversationContext(BaseModel):
    """
    Complete structured context fed into the Agent Orchestrator and Planner.
    Never dumps full transcripts, keeping token consumption bounded and deterministic.
    """
    conversation_id: str
    customer_id: str
    customer_name: Optional[str]
    company_name: Optional[str]
    company_type: Optional[str]
    preferred_language: str
    mode: str
    sales_stage: str
    lead_score: int
    is_hot: bool
    summary: Optional[str]
    customer_goals: Optional[str]
    recent_messages: List[Dict[str, str]]
    verified_memories: Dict[str, Any]
    active_objections: List[str]
    latest_inbound_message: str


class ContextBuilder:
    """
    Assembles customer profile, memory, dialogue history, and business parameters into ConversationContext.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self.conv_service = ConversationService(session, org_id)
        self.cust_memory = CustomerMemoryService(session, org_id)
        self.conv_memory = ConversationMemoryService(session, org_id)

    async def build_context(
        self,
        conversation_id: str,
        inbound_message: str,
    ) -> ConversationContext:
        """
        Builds the unified context for an active conversation.
        """
        conv = await self.conv_service.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        customer = conv.customer

        # 1. Fetch recent messages (up to 30 turns for rich conversational memory)
        recent_msgs = await self.conv_memory.get_recent_messages(conversation_id, limit=30)
        serialized_msgs = [
            {
                "direction": m.direction,
                "sender": m.sender_type,
                "content": m.content,
                "created_at": m.created_at.isoformat() if m.created_at else "",
            }
            for m in recent_msgs
        ]

        # 2. Fetch summary
        summary_record = await self.conv_memory.get_or_create_summary(conversation_id)
        summary_text = summary_record.summary if summary_record else None
        goals_text = summary_record.customer_goals if summary_record else None

        # 3. Fetch structured customer memories
        mem_dict = await self.cust_memory.get_memory_dict(customer.id)

        # 4. Extract active objections
        active_objections = list(conv.active_objections or [])
        if summary_record and summary_record.active_objections:
            active_objections.extend(summary_record.active_objections)

        return ConversationContext(
            conversation_id=conv.id,
            customer_id=customer.id,
            customer_name=customer.name,
            company_name=customer.company_name,
            company_type=customer.company_type,
            preferred_language=customer.preferred_language or "English",
            mode=conv.mode,
            sales_stage=conv.sales_stage,
            lead_score=conv.lead_score,
            is_hot=conv.is_hot,
            summary=summary_text,
            customer_goals=goals_text,
            recent_messages=serialized_msgs,
            verified_memories=mem_dict,
            active_objections=list(set(active_objections)),
            latest_inbound_message=inbound_message,
        )
