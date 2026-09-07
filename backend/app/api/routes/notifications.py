"""
Autonomous Notifications API for Dual-Brain Operating System.
Provides endpoints for Friday and EDITH to independently dispatch direct alerts,
commercial policy notifications, and debriefs to the operator with real-time WebSocket push.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, func, select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.session import get_db
from app.database.models import AgentNotification
from app.realtime.connection_manager import ws_manager
from app.utils.logging import logger

router = APIRouter(prefix="/notifications", tags=["Notifications"])


class NotificationCreateRequest(BaseModel):
    sender_brain: str = Field("EDITH", description="Sender brain: 'EDITH' or 'FRIDAY'")
    title: str = Field(..., min_length=2, max_length=255)
    content: str = Field(..., min_length=2)
    category: str = Field("GENERAL", description="Category e.g. SALES_ALERT, POLICY_REFUSAL, DEBRIEF, SYSTEM_HEALTH, HOT_LEAD, FEATURE_GAP")
    severity: str = Field("info", description="Severity: info, warning, critical, success")
    action_url: Optional[str] = Field(None, description="Navigation link in dashboard e.g. /conversations, /pricing, /brain")
    metadata_payload: Optional[Dict[str, Any]] = None


@router.get("")
async def list_notifications(
    limit: int = Query(50, ge=1, le=100),
    is_read: Optional[bool] = Query(None),
    sender_brain: Optional[str] = Query(None),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieves chronological list of autonomous agent notifications with unread count.
    """
    org_id = settings.DEFAULT_ORG_ID

    # Fetch unread count
    count_stmt = (
        select(func.count(AgentNotification.id))
        .where(
            AgentNotification.org_id == org_id,
            AgentNotification.is_read == False,
        )
    )
    unread_count = (await session.execute(count_stmt)).scalar_one()

    # Fetch items
    query = (
        select(AgentNotification)
        .where(AgentNotification.org_id == org_id)
        .order_by(desc(AgentNotification.created_at))
        .limit(limit)
    )
    if is_read is not None:
        query = query.where(AgentNotification.is_read == is_read)
    if sender_brain:
        query = query.where(AgentNotification.sender_brain == sender_brain.upper())

    records = (await session.execute(query)).scalars().all()

    items = [
        {
            "id": r.id,
            "sender_brain": r.sender_brain,
            "title": r.title,
            "content": r.content,
            "category": r.category,
            "severity": r.severity,
            "is_read": r.is_read,
            "action_url": r.action_url,
            "metadata_payload": r.metadata_payload,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in records
    ]

    return {
        "notifications": items,
        "unread_count": unread_count,
        "total": len(items),
    }


@router.post("", status_code=status.HTTP_201_CREATED)
async def create_notification(
    req: NotificationCreateRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Creates a new autonomous notification from EDITH or Friday and broadcasts live over WebSocket.
    """
    org_id = settings.DEFAULT_ORG_ID
    notif = AgentNotification(
        org_id=org_id,
        sender_brain=req.sender_brain.upper(),
        title=req.title,
        content=req.content,
        category=req.category.upper(),
        severity=req.severity.lower(),
        action_url=req.action_url,
        metadata_payload=req.metadata_payload,
    )
    session.add(notif)
    await session.commit()
    await session.refresh(notif)

    payload = {
        "id": notif.id,
        "sender_brain": notif.sender_brain,
        "title": notif.title,
        "content": notif.content,
        "category": notif.category,
        "severity": notif.severity,
        "is_read": notif.is_read,
        "action_url": notif.action_url,
        "metadata_payload": notif.metadata_payload,
        "created_at": notif.created_at.isoformat() if notif.created_at else None,
    }

    # Instant broadcast to all connected operators
    try:
        await ws_manager.broadcast_to_org(org_id, "agent_notification", payload)
    except Exception as e:
        logger.debug(f"[Notifications] WebSocket broadcast warning: {e}")

    return payload


@router.post("/{notification_id}/read")
async def mark_as_read(
    notification_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Marks a single notification as read."""
    stmt = (
        update(AgentNotification)
        .where(
            AgentNotification.id == notification_id,
            AgentNotification.org_id == settings.DEFAULT_ORG_ID,
        )
        .values(is_read=True)
    )
    await session.execute(stmt)
    await session.commit()
    return {"status": "success", "id": notification_id, "is_read": True}


@router.post("/mark-all-read")
async def mark_all_as_read(
    session: AsyncSession = Depends(get_db),
):
    """Marks all notifications for the organization as read."""
    stmt = (
        update(AgentNotification)
        .where(
            AgentNotification.org_id == settings.DEFAULT_ORG_ID,
            AgentNotification.is_read == False,
        )
        .values(is_read=True)
    )
    await session.execute(stmt)
    await session.commit()
    return {"status": "success", "message": "All notifications marked as read."}


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Deletes a notification record."""
    stmt = (
        delete(AgentNotification)
        .where(
            AgentNotification.id == notification_id,
            AgentNotification.org_id == settings.DEFAULT_ORG_ID,
        )
    )
    await session.execute(stmt)
    await session.commit()
    return {"status": "success", "deleted_id": notification_id}
