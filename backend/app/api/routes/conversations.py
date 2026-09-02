"""
Conversations and live inbox API endpoints (Section 48 & 58).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.conversations.service import ConversationService
from app.database.models import Conversation, Message
from app.database.session import get_db
from app.schemas.common import PaginatedResponse
from app.schemas.conversations import (
    ConversationResponse,
    MessageCreate,
    MessageResponse,
    TakeoverRequest,
)
from app.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/conversations", tags=["Conversations"])


@router.get("", response_model=PaginatedResponse[ConversationResponse])
async def list_conversations(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    mode: Optional[str] = None,
    stage: Optional[str] = None,
    is_hot: Optional[bool] = None,
    session: AsyncSession = Depends(get_db),
):
    """Lists conversations for the live inbox."""
    org_id = settings.DEFAULT_ORG_ID
    stmt = select(Conversation).where(Conversation.org_id == org_id)

    if mode:
        stmt = stmt.where(Conversation.mode == mode)
    if stage:
        stmt = stmt.where(Conversation.sales_stage == stage)
    if is_hot is not None:
        stmt = stmt.where(Conversation.is_hot == is_hot)

    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    stmt = stmt.order_by(Conversation.last_message_at.desc().nullslast()).offset((page - 1) * page_size).limit(page_size)
    res = await session.execute(stmt)
    items = list(res.scalars().all())

    pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{conversation_id}")
async def get_conversation_detail(conversation_id: str, session: AsyncSession = Depends(get_db)):
    """Fetches complete conversation thread, timeline, customer profile, and memory."""
    svc = ConversationService(session, settings.DEFAULT_ORG_ID)
    conv = await svc.get_by_id(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    return {
        "conversation": {
            "id": conv.id,
            "channel": conv.channel,
            "channel_id": conv.channel_id,
            "mode": conv.mode,
            "sales_stage": conv.sales_stage,
            "lead_score": conv.lead_score,
            "is_hot": conv.is_hot,
            "unread_count": conv.unread_count,
            "last_message_at": conv.last_message_at,
            "created_at": conv.created_at,
        },
        "customer": {
            "id": conv.customer.id if conv.customer else None,
            "name": conv.customer.name if conv.customer else None,
            "phone": conv.customer.primary_phone if conv.customer else None,
            "company_name": conv.customer.company_name if conv.customer else None,
            "company_type": conv.customer.company_type if conv.customer else None,
            "preferred_language": conv.customer.preferred_language if conv.customer else "English",
        },
        "summary": conv.summary.summary if conv.summary else None,
        "messages": [
            {
                "id": m.id,
                "direction": m.direction,
                "sender_type": m.sender_type,
                "content": m.content,
                "delivery_status": m.delivery_status,
                "created_at": m.created_at,
            }
            for m in conv.messages
        ],
    }


@router.post("/{conversation_id}/takeover")
async def takeover_conversation(
    conversation_id: str,
    req: TakeoverRequest,
    session: AsyncSession = Depends(get_db),
):
    """Changes conversation mode (HUMAN, AI, PAUSED, CLOSED)."""
    svc = ConversationService(session, settings.DEFAULT_ORG_ID)
    conv = await svc.update_mode(conversation_id, req.mode, reason=req.reason)
    return {"success": True, "mode": conv.mode}


@router.post("/{conversation_id}/messages", response_model=MessageResponse)
async def send_manual_operator_message(
    conversation_id: str,
    msg_in: MessageCreate,
    session: AsyncSession = Depends(get_db),
):
    """Dispatches a manual operator message through WhatsApp and records it."""
    svc = ConversationService(session, settings.DEFAULT_ORG_ID)
    conv = await svc.get_by_id(conversation_id)
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found.")

    # Dispatch via active WhatsApp provider
    wa = WhatsAppService.get_provider()
    wa_res = await wa.send_message(to_phone=conv.channel_id, text=msg_in.content)

    msg = await svc.add_message(
        conversation_id=conversation_id,
        direction="outbound",
        sender_type="human",
        content=msg_in.content,
        provider_message_id=wa_res.provider_message_id,
        delivery_status="sent" if wa_res.success else "failed",
    )
    return msg
