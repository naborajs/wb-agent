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

    try:
        events = wa.parse_webhook(payload)
    except Exception as parse_err:
        logger.warning(f"Error parsing WhatsApp webhook payload: {parse_err}")
        return {"status": "error", "detail": str(parse_err), "events_count": 0}

    org_id = settings.DEFAULT_ORG_ID
    conv_svc = ConversationService(session, org_id)
    job_queue = JobQueue(session)

    for event in events:
        try:
            # 0. Handle delivery and read status updates (delivered, read, failed)
            if event.event_type in ("status_update", "status"):
                from sqlalchemy import update
                from app.database.models import Message
                from app.realtime.connection_manager import ws_manager

                msg_status = event.status or "delivered"
                if event.message_id:
                    stmt = (
                        update(Message)
                        .where(Message.provider_message_id == event.message_id)
                        .values(delivery_status=msg_status)
                    )
                    await session.execute(stmt)
                    await session.commit()

                    try:
                        await ws_manager.broadcast_to_org(
                            org_id,
                            "message_status_update",
                            {
                                "provider_message_id": event.message_id,
                                "delivery_status": msg_status,
                                "recipient": event.sender_phone,
                            },
                        )
                    except Exception as ws_err:
                        logger.debug(f"Failed to broadcast status update over WebSocket: {ws_err}")
                continue

            # Determine content: fallback for media attachments without text captions
            effective_content = event.content
            if not effective_content and (event.media_url or event.media_type):
                media_type_label = (event.media_type or "Media").capitalize()
                effective_content = f"[{media_type_label} Attachment]"

            if event.event_type == "message" and effective_content:
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
                        command_text=effective_content,
                        session=session,
                        org_id=org_id,
                    )
                    if cmd_reply:
                        try:
                            await wa.send_message(to_phone=clean_sender, text=cmd_reply)
                        except Exception as e:
                            logger.error(f"Failed to dispatch owner command reply: {e}")
                        continue

                # 1. Check if inbound message is from a WhatsApp Group (@g.us)
                from app.utils.phone import is_whatsapp_group_jid
                is_group = bool(
                    getattr(event, "is_group", False)
                    or is_whatsapp_group_jid(clean_sender)
                    or is_whatsapp_group_jid(event.sender_phone)
                )

                if is_group:
                    logger.info(f"Received WhatsApp group message from {clean_sender}. Suppressing AI auto-reply and queuing operator notification.")
                    from sqlalchemy import select
                    from app.database.models import AgentNotification
                    from app.realtime.connection_manager import ws_manager

                    cust_stmt = select(Customer).where(
                        Customer.org_id == org_id,
                        Customer.primary_phone == clean_sender,
                    )
                    cust = (await session.execute(cust_stmt)).scalar_one_or_none()
                    group_title = event.group_name or f"WhatsApp Group ({clean_sender})"
                    if not cust:
                        cust = Customer(
                            org_id=org_id,
                            name=group_title,
                            company_name=group_title,
                            company_type="whatsapp_group",
                            primary_phone=clean_sender,
                            preferred_language="English",
                            opt_in_status=True,
                        )
                        session.add(cust)
                        await session.commit()
                    elif event.group_name and cust.name != event.group_name:
                        cust.name = event.group_name
                        cust.company_name = event.group_name
                        await session.commit()

                    # Get or create active conversation
                    conv = await conv_svc.get_or_create_conversation(
                        customer_id=cust.id,
                        channel="whatsapp",
                        channel_id=clean_sender,
                    )

                    # Force HUMAN mode on group chats so AI never replies autonomously
                    if conv.mode != "HUMAN":
                        conv.mode = "HUMAN"
                    meta = dict(conv.metadata_json or {})
                    meta["is_group"] = True
                    if event.group_name:
                        meta["group_name"] = event.group_name
                    conv.metadata_json = meta
                    await session.commit()

                    # Add message to conversation record
                    sender_participant = getattr(event, "participant", None) or clean_sender
                    await conv_svc.add_message(
                        conversation_id=conv.id,
                        direction="inbound",
                        sender_type="customer",
                        sender_id=sender_participant,
                        content=effective_content,
                        provider_message_id=event.message_id,
                        delivery_status="delivered",
                    )

                    # Dispatch Autonomous Agent Notification to Operator
                    participant_info = f" by {event.participant}" if getattr(event, "participant", None) else ""
                    snippet = effective_content[:80] + ("..." if len(effective_content) > 80 else "")
                    notif = AgentNotification(
                        org_id=org_id,
                        sender_brain="FRIDAY",
                        title=f"👥 Group Message: {group_title}",
                        content=f"New message from group '{group_title}'{participant_info}: \"{snippet}\". AI auto-reply is paused to prevent group spam. Awaiting operator response.",
                        category="GROUP_MESSAGE",
                        severity="warning",
                        action_url=f"/conversations?id={conv.id}",
                        metadata_payload={
                            "conversation_id": conv.id,
                            "group_id": clean_sender,
                            "group_name": event.group_name,
                            "participant": getattr(event, "participant", None),
                            "content": effective_content,
                        },
                    )
                    session.add(notif)
                    await session.commit()
                    await session.refresh(notif)

                    # Broadcast notification and live message to dashboard via WebSocket
                    try:
                        await ws_manager.broadcast_to_org(
                            org_id,
                            "agent_notification",
                            {
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
                            },
                        )
                    except Exception as ws_notif_err:
                        logger.debug(f"Failed to broadcast group agent_notification: {ws_notif_err}")

                    try:
                        await ws_manager.broadcast_to_org(
                            org_id,
                            "new_message",
                            {
                                "conversation_id": conv.id,
                                "direction": "inbound",
                                "sender_type": "customer",
                                "content": effective_content,
                                "sender_id": sender_participant,
                                "channel_id": clean_sender,
                                "is_group": True,
                                "group_name": event.group_name,
                                "participant": getattr(event, "participant", None),
                                "timestamp": event.timestamp.isoformat() if hasattr(event, "timestamp") and event.timestamp else None,
                            },
                        )
                    except Exception as ws_err:
                        logger.debug(f"Failed to broadcast inbound group message to WebSocket: {ws_err}")

                    # ZERO AI auto-reply: Skip job_queue.enqueue("process_message")
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
                        "content": effective_content,
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
                            "content": effective_content,
                            "sender_id": clean_sender,
                            "channel_id": clean_sender,
                            "timestamp": event.timestamp.isoformat() if hasattr(event, "timestamp") and event.timestamp else None,
                        },
                    )
                except Exception as ws_err:
                    logger.debug(f"Failed to broadcast inbound message to WebSocket: {ws_err}")

        except Exception as ev_err:
            logger.error(f"Error processing webhook event ({event.event_type}): {ev_err}", exc_info=True)
            continue

    return {"status": "received", "events_count": len(events)}
