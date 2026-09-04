"""
Watchdog diagnostic and system health routes (Section 125).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.session import get_db
from app.watchdog.service import WatchdogService

router = APIRouter(prefix="/watchdog", tags=["Watchdog"])


class ResolveAlertRequest(BaseModel):
    resolved_by: str = "operator"


@router.get("/alerts")
async def list_alerts(
    limit: int = Query(50, ge=1, le=200),
    org_id: str = "org_default",
    session: AsyncSession = Depends(get_db),
):
    """Returns active, unresolved watchdog diagnostic alerts."""
    service = WatchdogService(session, org_id)
    alerts = await service.get_active_alerts(limit=limit)
    return {
        "count": len(alerts),
        "alerts": [
            {
                "id": a.id,
                "severity": a.severity,
                "category": a.category,
                "title": a.title,
                "description": a.description,
                "conversation_id": a.conversation_id,
                "order_id": a.order_id,
                "suggested_action": a.suggested_action,
                "model_used": a.model_used,
                "metadata_payload": a.metadata_payload,
                "is_resolved": a.is_resolved,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in alerts
        ],
    }


@router.post("/alerts/{alert_id}/resolve")
async def resolve_alert(
    alert_id: str,
    payload: ResolveAlertRequest = ResolveAlertRequest(),
    org_id: str = "org_default",
    session: AsyncSession = Depends(get_db),
):
    """Resolves a watchdog alert."""
    service = WatchdogService(session, org_id)
    alert = await service.resolve_alert(alert_id, resolved_by=payload.resolved_by)
    if not alert:
        raise HTTPException(status_code=404, detail=f"Alert '{alert_id}' not found.")
    return {"status": "resolved", "alert_id": alert_id}


@router.post("/run-audit")
async def trigger_audit(
    org_id: str = "org_default",
    session: AsyncSession = Depends(get_db),
):
    """Triggers an on-demand full diagnostic audit using the Watchdog Supervisor model."""
    service = WatchdogService(session, org_id)
    report = await service.run_full_diagnostic_audit()
    return report.model_dump()


@router.get("/system-health")
async def system_health(
    org_id: str = "org_default",
    session: AsyncSession = Depends(get_db),
):
    """Returns quick system health metrics and unread watchdog count."""
    service = WatchdogService(session, org_id)
    alerts = await service.get_active_alerts(limit=100)
    critical_count = sum(1 for a in alerts if a.severity == "critical")
    warning_count = sum(1 for a in alerts if a.severity == "warning")
    return {
        "overall_status": "critical" if critical_count > 0 else ("warning" if warning_count > 0 else "healthy"),
        "total_active_alerts": len(alerts),
        "critical_count": critical_count,
        "warning_count": warning_count,
    }
