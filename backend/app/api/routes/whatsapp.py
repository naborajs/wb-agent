"""
WhatsApp Bridge Management and Diagnostic Routes for EDITH (Section 38, 58).
Provides real-time bridge status, QR pairing, live test pings, and inbound simulation.
"""

from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.orchestrator import AgentOrchestrator
from app.config import settings
from app.conversations.service import ConversationService
from app.database.models import Customer
from app.database.session import get_db
from app.utils.logging import logger
from app.utils.phone import normalize_phone_number
from app.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/whatsapp", tags=["WhatsApp Bridge"])


class SendPingRequest(BaseModel):
    to_phone: Optional[str] = Field(None, description="Recipient phone number (defaults to owner phone)")
    message: Optional[str] = Field(None, description="Custom message text (optional)")


class SimulateIncomingRequest(BaseModel):
    phone: str = Field(..., description="Simulated sender phone number")
    message: str = Field(..., description="Message text to process")
    name: Optional[str] = Field(None, description="Customer contact name")
    company: Optional[str] = Field(None, description="Customer business name")


@router.get("/status")
async def get_whatsapp_status() -> Dict[str, Any]:
    """
    Checks the real-time operational status of the WhatsApp Baileys bridge.
    Proxies internal status to avoid cross-origin and network barrier issues in the browser.
    """
    bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{bridge_url}/status")
            if resp.status_code == 200:
                data = resp.json()
                return {
                    "connected": data.get("connected", False),
                    "bot_phone": data.get("botPhone", "918918753100"),
                    "has_qr": data.get("hasQR", False),
                    "pairing_code": data.get("pairingCode"),
                    "provider": settings.WHATSAPP_PROVIDER,
                    "bridge_url": bridge_url,
                    "bridge_online": True,
                }
    except Exception as e:
        logger.warning(f"Could not reach WhatsApp bridge at {bridge_url}: {e}")

    return {
        "connected": False,
        "bot_phone": "918918753100",
        "has_qr": False,
        "pairing_code": None,
        "provider": settings.WHATSAPP_PROVIDER,
        "bridge_url": bridge_url,
        "bridge_online": False,
    }


@router.get("/qr")
async def get_whatsapp_qr() -> Dict[str, Any]:
    """
    Retrieves the current QR code Data URL from the Baileys bridge for rendering directly in dashboard modals.
    """
    bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(f"{bridge_url}/qr-data")
            if resp.status_code == 200:
                return resp.json()
    except Exception as e:
        logger.warning(f"Failed to query QR data from bridge: {e}")

    return {"connected": False, "qrDataUrl": None, "error": "Bridge offline"}


@router.post("/send-ping")
async def send_whatsapp_ping(req: SendPingRequest) -> Dict[str, Any]:
    """
    Sends an immediate test ping message through WhatsApp to verify live outbound delivery.
    Defaults to sending to the configured business owner (+91 89006 53250).
    """
    target_phone = req.to_phone or settings.OWNER_WHATSAPP_NUMBER or "+918900653250"
    normalized_target = normalize_phone_number(target_phone)
    ping_text = req.message or (
        "🤖 *WB-Agent (EDITH) Diagnostic Ping*\n\n"
        "✅ WhatsApp integration is connected and healthy!\n"
        "• Bot line: +91 89187 53100\n"
        "• AI Engine: NVIDIA Nemotron\n"
        "• Status: Ready to assist wholesale buyers."
    )

    wa = WhatsAppService.get_provider()
    result = await wa.send_message(to_phone=normalized_target, text=ping_text)

    if result.success:
        return {
            "success": True,
            "message": f"Test WhatsApp ping successfully dispatched to {normalized_target}.",
            "provider_message_id": result.provider_message_id,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send test ping: {result.error_message}",
        )


@router.post("/simulate-inbound")
async def simulate_inbound_message(
    req: SimulateIncomingRequest,
    session: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """
    Simulates an incoming WhatsApp customer message and executes the AI orchestrator synchronously.
    Returns the agent's response, stage shift, and reasoning trace for instant in-dashboard testing.
    """
    org_id = settings.DEFAULT_ORG_ID
    norm_phone = normalize_phone_number(req.phone)
    conv_svc = ConversationService(session, org_id)

    # 1. Customer resolution
    from sqlalchemy import select
    cust_stmt = select(Customer).where(Customer.org_id == org_id, Customer.primary_phone == norm_phone)
    cust = (await session.execute(cust_stmt)).scalar_one_or_none()
    if not cust:
        cust = Customer(
            org_id=org_id,
            primary_phone=norm_phone,
            name=req.name or "Prospect",
            company_name=req.company or "Wholesale Buyer",
            preferred_language="English",
            opt_in_status=True,
        )
        session.add(cust)
        await session.commit()

    # 2. Get or create conversation
    conv = await conv_svc.get_or_create_conversation(
        customer_id=cust.id,
        channel="whatsapp",
        channel_id=norm_phone,
    )

    # 3. Synchronous Orchestration Turn
    orchestrator = AgentOrchestrator(session, org_id)
    result = await orchestrator.process_turn(
        conversation_id=conv.id,
        inbound_message=req.message,
        sender_id=norm_phone,
        is_simulation=True,
    )

    return {
        "success": True,
        "conversation_id": conv.id,
        "sales_stage": result.sales_stage_after,
        "lead_score": result.lead_score_after,
        "agent_reply": result.reply_text,
        "handoff_created": result.handoff_created,
        "is_suppressed": result.is_suppressed,
    }
