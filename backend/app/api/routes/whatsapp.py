"""
WhatsApp Bridge Management and Diagnostic Routes for EDITH (Section 38, 58).
Provides real-time bridge status, QR pairing, live test pings, and inbound simulation.
"""

from typing import Any, Dict, Optional
import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
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


class RequestPairingCodeRequest(BaseModel):
    phone: str = Field(..., description="Phone number with country code for pairing")


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
                    "bot_phone": data.get("botPhone", ""),
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
        "bot_phone": "",
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


@router.get("/qr-embed", response_class=HTMLResponse)
async def get_whatsapp_qr_embed() -> HTMLResponse:
    """
    Proxies the interactive HTML QR pairing page from the internal WhatsApp bridge.
    Allows remote and cloud-hosted dashboards to render the QR pairing iframe without exposing port 3001.
    """
    bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001").rstrip("/")
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(f"{bridge_url}/qr?embed=1")
            if resp.status_code == 200:
                return HTMLResponse(content=resp.text, status_code=200)
    except Exception as e:
        logger.warning(f"Failed to proxy QR embed from bridge at {bridge_url}: {e}")

    fallback_html = """<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="refresh" content="4" />
  <style>
    body { margin:0; font-family: system-ui, -apple-system, sans-serif; background:#090d16; color:#e2e8f0; display:flex; align-items:center; justify-content:center; height:100vh; text-align:center; padding:20px; box-sizing:border-box; }
    .card { border:1px solid rgba(255,255,255,0.1); border-radius:16px; padding:24px; background:rgba(15,23,42,0.8); max-width:300px; }
    .dot { width:10px; height:10px; border-radius:50%; background:#f59e0b; display:inline-block; margin-right:6px; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
    p { font-size:12px; color:#94a3b8; line-height:1.5; margin:8px 0 0; }
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:13px;font-weight:700;"><span class="dot"></span>WhatsApp Bridge Starting...</div>
    <p>Waiting for the Baileys bridge service to initialize. This frame refreshes automatically every 4 seconds.</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=fallback_html, status_code=200)


@router.post("/pair")
async def request_pairing_code(req: RequestPairingCodeRequest) -> Dict[str, Any]:
    """
    Requests an 8-character pairing code from the Baileys bridge for linking WhatsApp via phone number.
    """
    bridge_url = getattr(settings, "WHATSAPP_BRIDGE_URL", "http://localhost:3001").rstrip("/")
    clean_phone = "".join(c for c in req.phone if c.isdigit())
    if len(clean_phone) < 8:
        raise HTTPException(status_code=400, detail="A valid phone number with country code is required.")
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(f"{bridge_url}/pair", json={"phone": clean_phone})
            if resp.status_code == 200:
                return resp.json()
            else:
                return {"success": False, "error": resp.text}
    except Exception as e:
        logger.warning(f"Error requesting pairing code from bridge: {e}")
        return {"success": False, "error": str(e)}


@router.post("/send-ping")
async def send_whatsapp_ping(req: SendPingRequest) -> Dict[str, Any]:
    """
    Sends an immediate test ping message through WhatsApp to verify live outbound delivery.
    Defaults to sending to the configured business owner number.
    """
    target_phone = (req.to_phone or settings.OWNER_WHATSAPP_NUMBER or "").strip()
    if not target_phone:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No recipient phone number provided and OWNER_WHATSAPP_NUMBER is not configured yet.",
        )
    normalized_target = normalize_phone_number(target_phone)
    ping_text = req.message or (
        "🤖 *WB-Agent (EDITH) Diagnostic Ping*\n\n"
        "✅ WhatsApp integration is connected and healthy!\n"
        f"• Target line: {normalized_target}\n"
        f"• Company: {settings.COMPANY_NAME}\n"
        f"• AI Engine: {settings.LLM_MODEL}\n"
        "• Status: Ready to assist customers."
    )

    wa = WhatsAppService.get_provider()
    result = await wa.send_message(to_phone=normalized_target, text=ping_text)

    if result.success:
        return {
            "success": True,
            "target_phone": normalized_target,
            "message": f"Test WhatsApp ping successfully dispatched to {normalized_target}.",
            "provider_message_id": result.provider_message_id,
        }
    else:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send test ping to {normalized_target}: {result.error_message}",
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
            name=req.name or "Prospect (Simulation)",
            company_name=req.company or "Wholesale Buyer",
            company_type="simulation",
            preferred_language="English",
            opt_in_status=True,
        )
        session.add(cust)
        await session.commit()

    # 2. Get or create conversation on isolated 'simulation' channel
    conv = await conv_svc.get_or_create_conversation(
        customer_id=cust.id,
        channel="simulation",
        channel_id=norm_phone,
    )
    # Ensure simulation metadata tag is persisted
    meta = dict(conv.metadata_json or {})
    meta["is_simulation"] = True
    meta["source"] = "simulate-inbound"
    conv.metadata_json = meta
    await session.commit()

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
        "channel": "simulation",
        "is_simulation": True,
        "sales_stage": result.sales_stage_after,
        "lead_score": result.lead_score_after,
        "agent_reply": result.reply_text,
        "handoff_created": result.handoff_created,
        "is_suppressed": result.is_suppressed,
    }
