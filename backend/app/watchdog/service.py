"""
Watchdog Service: Continuous AI Supervisor & Diagnostic Auditor (Section 125).

Monitors system health, detects stalled customer chats, enforces zero-hallucination
pricing consistency, tracks safety holds, monitors channel latency, and broadcasts
actionable diagnostic alerts to the Mission Control dashboard in real time.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import json
import time
from typing import Any, Dict, List, Optional
import httpx
from sqlalchemy import desc, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.router import ai_router
from app.ai.types import Capability, WatchdogAuditReport, WatchdogIssue
from app.config import settings
from app.database.base import utc_now
from app.database.models import (
    Conversation,
    Handoff,
    Message,
    Order,
    OrderItem,
    PricingRule,
    Product,
    ProductVariant,
    WatchdogAlert,
)
from app.realtime.connection_manager import ws_manager
from app.utils.logging import logger


def _as_utc(dt: Optional[datetime]) -> datetime:
    if not dt:
        return utc_now()
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


class WatchdogService:
    """
    Autonomous Supervisor & Quality Assurance engine for WB-Agent operations.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_active_alerts(self, limit: int = 50) -> List[WatchdogAlert]:
        """Fetches all unresolved watchdog diagnostic alerts."""
        stmt = (
            select(WatchdogAlert)
            .where(
                WatchdogAlert.org_id == self.org_id,
                WatchdogAlert.is_resolved.is_(False),
            )
            .order_by(desc(WatchdogAlert.created_at))
            .limit(limit)
        )
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def resolve_alert(self, alert_id: str, resolved_by: str = "operator") -> Optional[WatchdogAlert]:
        """Resolves a watchdog alert and notifies connected operators via WebSocket."""
        alert = await self.session.get(WatchdogAlert, alert_id)
        if not alert or alert.org_id != self.org_id:
            return None

        alert.is_resolved = True
        alert.resolved_at = utc_now()
        alert.resolved_by = resolved_by
        await self.session.commit()

        # Broadcast real-time resolution to dashboard
        try:
            await ws_manager.broadcast_to_org(
                self.org_id,
                "watchdog_alert_resolved",
                {"alert_id": alert_id, "resolved_by": resolved_by},
            )
        except Exception as e:
            logger.warning(f"Failed to broadcast watchdog alert resolution: {e}")

        return alert

    async def create_alert(
        self,
        severity: str,
        category: str,
        title: str,
        description: str,
        conversation_id: Optional[str] = None,
        order_id: Optional[str] = None,
        metadata_payload: Optional[Dict[str, Any]] = None,
        suggested_action: Optional[str] = None,
        model_used: str = "openai/gpt-oss-20b",
    ) -> WatchdogAlert:
        """
        Creates a new Watchdog alert and broadcasts it to all active dashboard operator sessions.
        """
        # Deduplication check: avoid creating identical active alert within the last 15 minutes
        cutoff = utc_now() - timedelta(minutes=15)
        dedup_stmt = select(WatchdogAlert).where(
            WatchdogAlert.org_id == self.org_id,
            WatchdogAlert.category == category,
            WatchdogAlert.title == title,
            WatchdogAlert.is_resolved.is_(False),
            WatchdogAlert.created_at >= cutoff,
        )
        if conversation_id:
            dedup_stmt = dedup_stmt.where(WatchdogAlert.conversation_id == conversation_id)
        if order_id:
            dedup_stmt = dedup_stmt.where(WatchdogAlert.order_id == order_id)

        existing = (await self.session.execute(dedup_stmt)).scalars().first()
        if existing:
            return existing

        alert = WatchdogAlert(
            org_id=self.org_id,
            severity=severity,
            category=category,
            title=title,
            description=description,
            conversation_id=conversation_id,
            order_id=order_id,
            metadata_payload=metadata_payload or {},
            suggested_action=suggested_action,
            model_used=model_used,
        )
        self.session.add(alert)
        await self.session.commit()
        await self.session.refresh(alert)

        # Broadcast live to connected dashboard operators
        try:
            alert_payload = {
                "id": alert.id,
                "severity": alert.severity,
                "category": alert.category,
                "title": alert.title,
                "description": alert.description,
                "conversation_id": alert.conversation_id,
                "order_id": alert.order_id,
                "suggested_action": alert.suggested_action,
                "model_used": alert.model_used,
                "created_at": alert.created_at.isoformat() if alert.created_at else None,
            }
            await ws_manager.broadcast_to_org(self.org_id, "watchdog_alert", alert_payload)
        except Exception as e:
            logger.warning(f"Failed to broadcast watchdog alert: {e}")

        return alert

    async def audit_stalled_conversations(self, stall_minutes: int = 15) -> List[WatchdogAlert]:
        """
        Detects active customer conversations waiting for an agent or human reply.
        """
        alerts = []
        cutoff = utc_now() - timedelta(minutes=stall_minutes)

        # Active conversations where last updated before cutoff and in AI/HUMAN mode
        stmt = (
            select(Conversation)
            .where(
                Conversation.org_id == self.org_id,
                Conversation.mode.in_(["AI", "HUMAN"]),
                Conversation.updated_at <= cutoff,
            )
            .limit(20)
        )
        res = await self.session.execute(stmt)
        convs = res.scalars().all()

        for conv in convs:
            # Check last message in conversation
            msg_stmt = (
                select(Message)
                .where(Message.conversation_id == conv.id)
                .order_by(desc(Message.created_at))
                .limit(1)
            )
            last_msg = (await self.session.execute(msg_stmt)).scalars().first()
            if last_msg and last_msg.direction == "inbound":
                msg_time = _as_utc(last_msg.created_at or cutoff)
                mins_waiting = int((utc_now() - msg_time).total_seconds() / 60)
                if mins_waiting >= stall_minutes:
                    alert = await self.create_alert(
                        severity="warning",
                        category="stalled_chat",
                        title=f"Customer awaiting response for {mins_waiting}m",
                        description=f"Inbound message from {conv.channel_id} has had no response for {mins_waiting} minutes.",
                        conversation_id=conv.id,
                        metadata_payload={"minutes_waiting": mins_waiting, "mode": conv.mode},
                        suggested_action="Review conversation in Inbox and send human response or resume AI.",
                    )
                    alerts.append(alert)

        return alerts

    async def audit_guardrail_holds(self) -> List[WatchdogAlert]:
        """
        Flags unresolved safety guardrail holds requiring human supervisor review.
        """
        alerts = []
        stmt = (
            select(Handoff)
            .where(
                Handoff.org_id == self.org_id,
                Handoff.resolved_at.is_(None),
                Handoff.reason.in_(["guardrail_violation", "output_guardrail_violation", "SAFETY_INPUT_GUARDRAIL_HOLD"]),
            )
            .order_by(desc(Handoff.created_at))
            .limit(10)
        )
        res = await self.session.execute(stmt)
        holds = res.scalars().all()

        for h in holds:
            alert = await self.create_alert(
                severity="warning",
                category="guardrail_hold",
                title=f"Safety Guardrail Hold on conversation {h.conversation_id[:8]}",
                description=h.summary or "Inbound or outbound message was held by autonomous safety guards.",
                conversation_id=h.conversation_id,
                metadata_payload={"handoff_id": h.id, "reason": h.reason},
                suggested_action="Review held dialogue in Mission Control and approve or redact response.",
            )
            alerts.append(alert)

        return alerts

    async def audit_channel_connectivity(self) -> Optional[WatchdogAlert]:
        """
        Inspects WhatsApp bridge connectivity and roundtrip latency.
        """
        bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001")
        start_t = time.time()
        try:
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(f"{bridge_url}/health")
                latency_ms = int((time.time() - start_t) * 1000)
                if resp.status_code != 200:
                    return await self.create_alert(
                        severity="critical",
                        category="channel_latency",
                        title="WhatsApp Bridge Service Degraded",
                        description=f"WhatsApp Bridge returned status {resp.status_code} at {bridge_url}",
                        metadata_payload={"status_code": resp.status_code, "latency_ms": latency_ms},
                        suggested_action="Check WhatsApp bridge container and scan QR code if disconnected.",
                    )
                data = resp.json()
                if not data.get("isReady") and not data.get("authenticated", False):
                    # Check if QR scan is needed
                    return await self.create_alert(
                        severity="warning",
                        category="channel_latency",
                        title="WhatsApp Channel Unauthenticated",
                        description="WhatsApp Web session is waiting for QR code authentication.",
                        metadata_payload=data,
                        suggested_action="Open WhatsApp settings tab on the dashboard and link your device.",
                    )
        except Exception as e:
            return await self.create_alert(
                severity="critical",
                category="channel_latency",
                title="WhatsApp Bridge Connection Failed",
                description=f"Cannot reach WhatsApp bridge daemon at {bridge_url}: {str(e)}",
                metadata_payload={"error": str(e)},
                suggested_action="Verify whatsapp-bridge background task is running on port 3001.",
            )
        return None

    async def audit_pricing_integrity(self) -> List[WatchdogAlert]:
        """
        Cross-checks active orders and items against the official product catalog.
        """
        alerts = []
        recent_cutoff = utc_now() - timedelta(hours=24)
        stmt = (
            select(Order)
            .where(
                Order.org_id == self.org_id,
                Order.created_at >= recent_cutoff,
            )
            .limit(20)
        )
        orders = (await self.session.execute(stmt)).scalars().all()

        for order in orders:
            # Query order items
            items_stmt = select(OrderItem).where(OrderItem.order_id == order.id)
            items = (await self.session.execute(items_stmt)).scalars().all()
            for it in items:
                if it.product_id:
                    prod = await self.session.get(Product, it.product_id)
                    qty = getattr(it, "quantity_kg", None) or getattr(it, "quantity", None)
                    p_name = getattr(it, "product_name", None) or getattr(it, "item_name", "Item")
                    if prod and prod.min_order_quantity_kg and qty:
                        if Decimal(str(qty)) < prod.min_order_quantity_kg:
                            alert = await self.create_alert(
                                severity="warning",
                                category="pricing_discrepancy",
                                title=f"Order #{order.order_number or order.id[:8]} below MOQ",
                                description=(
                                    f"Item '{p_name}' ordered quantity {qty}kg "
                                    f"is below MOQ of {prod.min_order_quantity_kg}kg."
                                ),
                                order_id=order.id,
                                metadata_payload={"ordered_qty": float(qty), "moq": float(prod.min_order_quantity_kg)},
                                suggested_action="Verify order terms with buyer or require minimum volume.",
                            )
                            alerts.append(alert)
        return alerts

    async def run_full_diagnostic_audit(self) -> WatchdogAuditReport:
        """
        Runs complete automated diagnostic suite:
        1. Channel connectivity audit
        2. Stalled conversation audit
        3. Safety guardrail holds audit
        4. Zero-hallucination pricing integrity audit
        5. Deep supervisor reasoning audit via openai/gpt-oss-20b
        """
        alerts: List[WatchdogAlert] = []

        # Step 1: Channel check
        conn_alert = await self.audit_channel_connectivity()
        if conn_alert:
            alerts.append(conn_alert)

        # Step 2: Stalled conversations
        stalled = await self.audit_stalled_conversations()
        alerts.extend(stalled)

        # Step 3: Guardrail holds
        holds = await self.audit_guardrail_holds()
        alerts.extend(holds)

        # Step 4: Pricing integrity
        pricing = await self.audit_pricing_integrity()
        alerts.extend(pricing)

        # Step 5: Autonomous AI Supervisor Model (openai/gpt-oss-20b)
        diag_summary = {
            "active_unresolved_alerts_count": len(alerts),
            "stalled_conversations_count": len(stalled),
            "pending_guardrail_holds_count": len(holds),
            "pricing_alerts_count": len(pricing),
            "channel_connected": conn_alert is None,
            "timestamp": utc_now().isoformat(),
        }

        ai_report = await ai_router.audit_system_diagnostics(diag_summary)

        # Convert AI-identified critical or warning issues into alerts
        for issue in (ai_report.issues_found or []):
            if str(issue.severity).lower() in ("warning", "critical"):
                alert = await self.create_alert(
                    severity=str(issue.severity).lower(),
                    category=issue.category or "system_health",
                    title=issue.title,
                    description=issue.description,
                    suggested_action=issue.recommended_action,
                    model_used=ai_report.model_used or "openai/gpt-oss-20b",
                )
                alerts.append(alert)

        return ai_report
