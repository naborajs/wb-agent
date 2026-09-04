"""
WhatsApp Inbound Webhooks API (Section 38, 40, 58).
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends, Header, HTTPException, Query, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.conversations.service import ConversationService
from app.database.models import Customer
from app.database.session import get_db
from app.jobs.queue import JobQueue
from app.utils.logging import logger
from app.whatsapp.service import WhatsAppService

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


@router.get("/whatsapp")
async def verify_whatsapp_webhook(
    request: Request,
    hub_mode: str = Query(None, alias="hub.mode"),
    hub_verify_token: str = Query(None, alias="hub.verify_token"),
    hub_challenge: str = Query(None, alias="hub.challenge"),
):
    """
    Handles Meta WhatsApp GET verification request.
    """
    mode = hub_mode or request.query_params.get("hub.mode")
    token = hub_verify_token or request.query_params.get("hub.verify_token")
    challenge = hub_challenge or request.query_params.get("hub.challenge")

    wa = WhatsAppService.get_provider()
    verified = wa.verify_webhook(mode=mode, token=token, challenge=challenge)
    if verified:
        return Response(content=verified, media_type="text/plain")
    raise HTTPException(status_code=403, detail="Webhook verification failed.")


@router.post("/whatsapp")
async def receive_whatsapp_webhook(
    request: Request,
    x_hub_signature_256: str = Header(None, alias="X-Hub-Signature-256"),
    session: AsyncSession = Depends(get_db),
):
    """
    Receives inbound customer messages and delivery status updates from WhatsApp.
    Ensures idempotency and queues processing.
    """
    raw_body = await request.body()
    wa = WhatsAppService.get_provider()

    # If Meta Cloud provider, verify signature
    if hasattr(wa, "verify_signature") and settings.WHATSAPP_PROVIDER == "meta_cloud":
        if not wa.verify_signature(raw_body, x_hub_signature_256):
            logger.warning("Rejected webhook: invalid HMAC signature.")
            raise HTTPException(status_code=403, detail="Invalid signature.")

    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Malformed JSON payload.")

    events = wa.parse_webhook(payload)
    org_id = settings.DEFAULT_ORG_ID
    conv_svc = ConversationService(session, org_id)
    job_queue = JobQueue(session)

    for event in events:
        if event.event_type == "message" and event.content:
            from app.utils.phone import normalize_phone_number
            try:
                clean_sender = normalize_phone_number(event.sender_phone)
            except Exception:
                clean_sender = event.sender_phone

            bot_phone = "918918753100"
            digits_sender = clean_sender.replace("+", "").strip()
            if digits_sender.endswith(bot_phone) or bot_phone.endswith(digits_sender):
                logger.info(f"Ignoring self-message from bot phone {event.sender_phone}")
                continue

            # Check if message is from the authorized business owner (+91 89006 53250)
            from app.whatsapp.owner_commands import OwnerCommandHandler
            if OwnerCommandHandler.is_owner(clean_sender):
                cmd_reply = await OwnerCommandHandler.process_command(
                    sender_phone=clean_sender,
                    command_text=event.content,
                    session=session,
                    org_id=org_id,
                )
                if cmd_reply:
                    try:
                        await wa.send_message(to_phone=clean_sender, text=cmd_reply)
                    except Exception as e:
                        logger.error(f"Failed to dispatch owner command reply: {e}")
                    continue

            # 1. Find or create Customer by normalized or alternative phone format
            from sqlalchemy import select, or_
            cust_stmt = select(Customer).where(
                Customer.org_id == org_id,
                or_(
                    Customer.primary_phone == clean_sender,
                    Customer.primary_phone == event.sender_phone,
                    Customer.primary_phone == f"+{digits_sender}",
                    Customer.primary_phone == digits_sender,
                ),
            )
            cust = (await session.execute(cust_stmt)).scalar_one_or_none()
            if not cust:
                cust = Customer(
                    org_id=org_id,
                    primary_phone=clean_sender,
                    preferred_language="English",
                    opt_in_status=True,
                )
                session.add(cust)
                await session.commit()
            elif cust.primary_phone != clean_sender:
                cust.primary_phone = clean_sender
                await session.commit()

            # 2. Get or create active conversation
            conv = await conv_svc.get_or_create_conversation(
                customer_id=cust.id,
                channel="whatsapp",
                channel_id=clean_sender,
            )

            # 3. Enqueue transactional message processing job
            await job_queue.enqueue(
                org_id=org_id,
                job_type="process_message",
                payload={
                    "conversation_id": conv.id,
                    "content": event.content,
                    "sender_id": clean_sender,
                    "provider_message_id": event.message_id,
                },
                priority=10,  # Customer messages receive HIGH priority
            )

            # 4. Instant WebSocket broadcast to active dashboard operators (Directive: Zero polling latency)
            try:
                from app.realtime.connection_manager import ws_manager
                await ws_manager.broadcast_to_org(
                    org_id,
                    "new_message",
                    {
                        "conversation_id": conv.id,
                        "direction": "inbound",
                        "sender_type": "customer",
                        "content": event.content,
                        "sender_id": clean_sender,
                        "channel_id": clean_sender,
                        "timestamp": event.timestamp.isoformat() if hasattr(event, "timestamp") and event.timestamp else None,
                    },
                )
            except Exception as ws_err:
                logger.debug(f"Failed to broadcast inbound message to WebSocket: {ws_err}")

    return {"status": "received", "events_count": len(events)}
