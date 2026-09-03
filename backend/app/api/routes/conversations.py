"""
Conversations and live inbox API endpoints (Section 48 & 58).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.conversations.service import ConversationService
from app.database.models import Conversation, Message, Customer, KnowledgeCandidate, SalesLearning
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
                "reported": bool((m.raw_payload or {}).get("reported", False)),
                "correction_category": (m.raw_payload or {}).get("correction_category"),
                "corrected_text": (m.raw_payload or {}).get("corrected_text"),
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


class InitiateConversationRequest(BaseModel):
    phone: str
    name: Optional[str] = None
    company_name: Optional[str] = None
    company_type: Optional[str] = None
    initial_message: Optional[str] = None


@router.post("/initiate")
async def initiate_conversation(
    req: InitiateConversationRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Initiates a new WhatsApp conversation to an arbitrary phone number (Section 55).
    Reuses existing customer records or provisions a new customer cleanly.
    """
    org_id = settings.DEFAULT_ORG_ID
    clean_phone = req.phone.strip().replace(" ", "").replace("-", "")
    if not clean_phone.startswith("+"):
        if clean_phone.startswith("91") and len(clean_phone) == 12:
            clean_phone = "+" + clean_phone
        else:
            clean_phone = "+91" + clean_phone.lstrip("0")

    # 1. Lookup or create customer
    stmt = select(Customer).where(Customer.org_id == org_id, Customer.primary_phone == clean_phone)
    res = await session.execute(stmt)
    customer = res.scalar_one_or_none()

    if not customer:
        customer = Customer(
            org_id=org_id,
            primary_phone=clean_phone,
            name=req.name or f"Contact {clean_phone[-4:]}",
            company_name=req.company_name,
            company_type=req.company_type or "buyer",
        )
        session.add(customer)
        await session.commit()
        await session.refresh(customer)

    # 2. Get or create active conversation
    svc = ConversationService(session, org_id)
    conv = await svc.get_or_create_conversation(
        customer_id=customer.id,
        channel="whatsapp",
        channel_id=clean_phone,
    )

    # 3. If initial message provided, dispatch it immediately
    initial_msg_id = None
    if req.initial_message:
        wa = WhatsAppService.get_provider()
        wa_res = await wa.send_message(to_phone=clean_phone, text=req.initial_message)
        msg = await svc.add_message(
            conversation_id=conv.id,
            direction="outbound",
            sender_type="human",
            content=req.initial_message,
            provider_message_id=wa_res.provider_message_id,
            delivery_status="sent" if wa_res.success else "failed",
        )
        initial_msg_id = msg.id

    return {
        "success": True,
        "conversation_id": conv.id,
        "customer_id": customer.id,
        "customer_name": customer.name,
        "phone": clean_phone,
        "initial_message_id": initial_msg_id,
    }


class ReportMessageRequest(BaseModel):
    category: str  # wrong_price, wrong_info, wrong_tone, missed_context, repeated_question, unauthorized_claim, other
    explanation: str
    corrected_text: Optional[str] = None
    is_business_knowledge: bool = False


@router.post("/{conversation_id}/messages/{message_id}/report")
async def report_message_response(
    conversation_id: str,
    message_id: str,
    req: ReportMessageRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Operator feedback loop: Reports an AI response and generates a learning event (Sections 63, 64, 65).
    Optionally promotes the correction into a pending KnowledgeCandidate.
    """
    org_id = settings.DEFAULT_ORG_ID

    # 1. Fetch message and conversation
    stmt = (
        select(Message)
        .where(Message.id == message_id, Message.conversation_id == conversation_id)
    )
    res = await session.execute(stmt)
    msg = res.scalar_one_or_none()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found in this conversation.")

    c_stmt = (
        select(Conversation)
        .options(selectinload(Conversation.customer))
        .where(Conversation.id == conversation_id)
    )
    conv = (await session.execute(c_stmt)).scalar_one_or_none()

    # 2. Record SalesLearning
    learning = SalesLearning(
        org_id=org_id,
        conversation_id=conversation_id,
        customer_id=conv.customer_id if conv else None,
        customer_type=conv.customer.company_type if conv and conv.customer else None,
        topic=req.category,
        tactic_used=req.explanation,
        outcome="CORRECTION",
        insight=req.corrected_text or req.explanation,
        confidence=1.0,
        evidence_data={
            "reported_message_id": message_id,
            "original_content": msg.content,
            "corrected_text": req.corrected_text,
            "category": req.category,
        },
    )
    session.add(learning)

    # 3. If business fact, create KnowledgeCandidate
    cand_id = None
    if req.is_business_knowledge and req.corrected_text:
        cand = KnowledgeCandidate(
            org_id=org_id,
            source="operator_correction",
            question=f"Feedback on message: {msg.content[:100]}...",
            proposed_answer=req.corrected_text,
            approval_status="PENDING",
            context_metadata={
                "conversation_id": conversation_id,
                "message_id": message_id,
                "explanation": req.explanation,
            },
        )
        session.add(cand)
        await session.flush()
        cand_id = cand.id

    # 4. Mark message metadata
    payload = dict(msg.raw_payload or {})
    payload["reported"] = True
    payload["correction_category"] = req.category
    payload["corrected_text"] = req.corrected_text
    payload["explanation"] = req.explanation
    msg.raw_payload = payload

    await session.commit()
    await session.refresh(learning)

    return {
        "success": True,
        "learning_id": learning.id,
        "knowledge_candidate_id": cand_id,
        "category": req.category,
    }

