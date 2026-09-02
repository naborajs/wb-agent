"""
Human Handoffs API endpoints (Section 43 & 58).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.database.models import Handoff
from app.database.session import get_db
from app.handoffs.service import HandoffService

router = APIRouter(prefix="/handoffs", tags=["Handoffs"])


class ResolveHandoffRequest(BaseModel):
    resolution_notes: Optional[str] = None
    resume_ai: bool = False


@router.get("")
async def list_handoffs(
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Lists operator handoffs."""
    stmt = (
        select(Handoff)
        .options(selectinload(Handoff.conversation))
        .where(Handoff.org_id == settings.DEFAULT_ORG_ID)
    )
    if status:
        stmt = stmt.where(Handoff.status == status)

    stmt = stmt.order_by(Handoff.created_at.desc())
    res = await session.execute(stmt)
    items = res.scalars().all()

    return [
        {
            "id": h.id,
            "conversation_id": h.conversation_id,
            "customer_id": h.customer_id,
            "reason": h.reason,
            "status": h.status,
            "summary": h.summary,
            "customer_intent": h.customer_intent,
            "created_at": h.created_at,
            "resolved_at": h.resolved_at,
        }
        for h in items
    ]


@router.post("/{handoff_id}/resolve")
async def resolve_handoff(
    handoff_id: str,
    req: ResolveHandoffRequest,
    session: AsyncSession = Depends(get_db),
):
    """Resolves an open handoff and optionally resumes AI autonomous selling."""
    svc = HandoffService(session, settings.DEFAULT_ORG_ID)
    try:
        resolved = await svc.resolve_handoff(
            handoff_id=handoff_id,
            resolution_notes=req.resolution_notes,
            resume_ai=req.resume_ai,
        )
        return {"success": True, "status": resolved.status}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
