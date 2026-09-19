"""
Conversation management service: lifecycle, message logging, and human takeover controls.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.base import utc_now
from app.database.models import Conversation, Message, SalesEvent
from app.utils.logging import logger


class ConversationService:
    """
    Manages conversational threads, message append operations, and takeover states.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_by_id(self, conversation_id: str) -> Optional[Conversation]:
        """Fetches conversation by ID with loaded messages."""
        stmt = (
            select(Conversation)
            .options(
                selectinload(Conversation.messages),
                selectinload(Conversation.customer),
                selectinload(Conversation.summary),
            )
            .where(
                Conversation.id == conversation_id,
                Conversation.org_id == self.org_id,
            )
        )
        res = await self.session.execute(stmt)
        return res.scalar_one_or_none()

    async def get_or_create_conversation(
        self,
        customer_id: str,
        channel: str = "whatsapp",
        channel_id: str = "",
    ) -> Conversation:
        """
        Retrieves active conversation for customer on this channel, or creates a new one.
        """
        stmt = (
            select(Conversation)
            .where(
                Conversation.org_id == self.org_id,
                Conversation.customer_id == customer_id,
                Conversation.channel == channel,
                Conversation.mode != "CLOSED",
            )
            .order_by(Conversation.created_at.desc())
        )
        res = await self.session.execute(stmt)
        existing = res.scalars().first()
        if existing:
            if channel_id and existing.channel_id != channel_id:
                existing.channel_id = channel_id
                await self.session.commit()
            return existing

        # Create new conversation
        conv = Conversation(
            org_id=self.org_id,
            customer_id=customer_id,
            channel=channel,
            channel_id=channel_id or customer_id,
            mode="AI",
            sales_stage="NEW",
            lead_score=10,
            is_hot=False,
            unread_count=0,
            last_message_at=utc_now(),
        )
        self.session.add(conv)
        await self.session.commit()
        return conv

    async def add_message(
        self,
        conversation_id: str,
        direction: str,
        sender_type: str,
        content: str,
        sender_id: Optional[str] = None,
        provider_message_id: Optional[str] = None,
        media_url: Optional[str] = None,
        media_type: Optional[str] = None,
        delivery_status: str = "sent",
        raw_payload: Optional[Dict[str, Any]] = None,
    ) -> Message:
        """
        Appends an inbound or outbound message, updating the conversation's timestamp and unread count.
        """
        # Idempotency check on provider_message_id if present
        if provider_message_id:
            stmt = select(Message).where(
                Message.org_id == self.org_id,
                Message.provider_message_id == provider_message_id,
            )
            existing_msg = (await self.session.execute(stmt)).scalar_one_or_none()
            if existing_msg:
                logger.info(f"Duplicate message with provider_id '{provider_message_id}' ignored.")
                return existing_msg

        msg = Message(
            org_id=self.org_id,
            conversation_id=conversation_id,
            direction=direction,
            sender_type=sender_type,
            sender_id=sender_id,
            content=content,
            provider_message_id=provider_message_id,
            media_url=media_url,
            media_type=media_type,
            delivery_status=delivery_status,
            raw_payload=raw_payload or {},
        )
        self.session.add(msg)

        # Update parent conversation
        conv_stmt = select(Conversation).where(Conversation.id == conversation_id)
        conv = (await self.session.execute(conv_stmt)).scalar_one_or_none()
        if conv:
            conv.last_message_at = utc_now()
            if direction == "inbound":
                conv.unread_count += 1

        await self.session.commit()
        return msg

    async def update_mode(
        self,
        conversation_id: str,
        new_mode: str,
        reason: Optional[str] = None,
    ) -> Conversation:
        """
        Atomically updates conversation mode ('AI', 'HUMAN', 'PAUSED', 'CLOSED').
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        old_mode = conv.mode
        conv.mode = new_mode
        if new_mode == "HUMAN":
            # Reset unread on operator takeover
            conv.unread_count = 0

        await self.session.commit()
        logger.info(f"Conversation '{conversation_id}' mode changed from {old_mode} -> {new_mode} (reason: {reason})")
        return conv

    async def update_stage_and_score(
        self,
        conversation_id: str,
        new_stage: str,
        score_delta: int = 0,
        trigger_reason: str = "Turn update",
    ) -> Conversation:
        """
        Updates sales stage and lead score with an auditable SalesEvent record.
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        old_stage = conv.sales_stage
        conv.sales_stage = new_stage
        conv.lead_score = max(0, min(100, conv.lead_score + score_delta))

        # Hot lead threshold check
        if conv.lead_score >= 80 or new_stage in ("PURCHASE_INTENT", "QUALIFIED"):
            conv.is_hot = True

        event = SalesEvent(
            org_id=self.org_id,
            conversation_id=conv.id,
            customer_id=conv.customer_id,
            from_stage=old_stage,
            to_stage=new_stage,
            trigger_reason=trigger_reason,
            score_delta=score_delta,
        )
        self.session.add(event)
        await self.session.commit()
        return conv

    async def delete_conversation(self, conversation_id: str) -> bool:
        """
        Permanently deletes a conversation and all its cascade-related records
        (messages, sales events, handoffs, summaries).
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            return False

        # Explicitly delete sales events (not defined as a cascade relationship on Conversation)
        await self.session.execute(
            delete(SalesEvent).where(SalesEvent.conversation_id == conversation_id)
        )

        await self.session.delete(conv)
        await self.session.commit()
        logger.info(f"[ConversationService] Permanently deleted conversation '{conversation_id}' for org '{self.org_id}'.")
        return True

    async def clear_conversation_messages(self, conversation_id: str) -> int:
        """
        Clears all message history in a conversation while preserving customer and thread metadata.
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        del_res = await self.session.execute(
            delete(Message).where(Message.conversation_id == conversation_id)
        )
        deleted_count = del_res.rowcount if hasattr(del_res, "rowcount") else 0
        conv.unread_count = 0
        conv.last_message_at = utc_now()
        await self.session.commit()
        logger.info(f"[ConversationService] Cleared {deleted_count} messages from conversation '{conversation_id}'.")
        return deleted_count

    async def purge_simulations(self) -> Dict[str, int]:
        """
        Purges all simulated test conversations and their associated messages.
        """
        stmt = select(Conversation).where(
            Conversation.org_id == self.org_id,
            or_(
                Conversation.channel == "simulation",
                Conversation.channel_id.in_([
                    "+919876543210", "+919999988888", "+919999911111", "+919876543298", "+919876543299"
                ])
            )
        )
        res = await self.session.execute(stmt)
        sim_convs = res.scalars().all()
        conv_ids = [c.id for c in sim_convs]

        if not conv_ids:
            return {"deleted_conversations": 0, "deleted_messages": 0}

        # Delete messages first
        del_msgs = await self.session.execute(
            delete(Message).where(Message.conversation_id.in_(conv_ids))
        )
        msg_count = del_msgs.rowcount if hasattr(del_msgs, "rowcount") else 0

        for c in sim_convs:
            await self.session.delete(c)

        await self.session.commit()
        logger.info(f"[ConversationService] Purged {len(conv_ids)} simulated conversations and {msg_count} messages.")
        return {"deleted_conversations": len(conv_ids), "deleted_messages": msg_count}

    async def get_database_summary(self) -> Dict[str, Any]:
        """
        Returns structured database statistics and conversation breakdown.
        """
        total_convs = (await self.session.execute(
            select(func.count(Conversation.id)).where(Conversation.org_id == self.org_id)
        )).scalar() or 0

        total_msgs = (await self.session.execute(
            select(func.count(Message.id)).where(Message.org_id == self.org_id)
        )).scalar() or 0

        live_convs = (await self.session.execute(
            select(func.count(Conversation.id)).where(
                Conversation.org_id == self.org_id,
                Conversation.channel == "whatsapp"
            )
        )).scalar() or 0

        sim_convs = (await self.session.execute(
            select(func.count(Conversation.id)).where(
                Conversation.org_id == self.org_id,
                Conversation.channel == "simulation"
            )
        )).scalar() or 0

        return {
            "total_conversations": total_convs,
            "total_messages": total_msgs,
            "live_whatsapp_conversations": live_convs,
            "simulated_conversations": sim_convs,
        }

    async def suggest_reply(
        self,
        conversation_id: str,
        instructions: Optional[str] = None,
        tone: Optional[str] = None,
        sender_participant: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Generates a 1-Click AI draft suggestion for operator review, refinement, and dispatch.
        Works for WhatsApp group chats and 1-on-1 conversations. Never auto-sends.
        """
        conv = await self.get_by_id(conversation_id)
        if not conv:
            return {
                "success": False,
                "error": f"Conversation {conversation_id} not found.",
                "suggested_reply": "",
            }

        is_group = bool(
            (conv.metadata_json and conv.metadata_json.get("is_group"))
            or (conv.channel_id and (conv.channel_id.endswith("@g.us") or "@g.us" in conv.channel_id))
        )

        # Fetch recent messages (up to 12)
        msg_stmt = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .limit(12)
        )
        raw_msgs = list((await self.session.execute(msg_stmt)).scalars().all())
        raw_msgs.reverse()

        latest_inbound = next((m for m in reversed(raw_msgs) if m.direction == "inbound"), None)
        latest_query = latest_inbound.content if latest_inbound else "Hello, can you share information about your tea products and wholesale pricing?"
        participant = sender_participant or (latest_inbound.sender_id if latest_inbound else None)

        from app.database.models import Product
        prod_stmt = select(Product).where(Product.org_id == self.org_id, Product.in_stock == True).limit(5)
        products = list((await self.session.execute(prod_stmt)).scalars().all())
        catalog_summary = "; ".join([f"{p.name} (SKU: {p.sku}, MOQ: {p.min_order_quantity_kg or 20}kg)" for p in products]) or "Assam Kadak CTC (MOQ: 20kg, ₹340/kg), Darjeeling Single Estate (MOQ: 10kg, ₹1,200/kg)"

        channel_desc = f"WhatsApp Group Chat '{conv.metadata_json.get('group_name', conv.channel_id)}'" if is_group else "1-on-1 WhatsApp Chat"
        user_prompt = (
            f"Channel: {channel_desc}\n"
            f"Latest Inquiry from {participant or 'Customer'}: \"{latest_query}\"\n"
            f"Available Catalog: {catalog_summary}\n"
            f"Tone: {tone or 'professional and consultative'}\n"
        )
        if instructions:
            user_prompt += f"Operator Directive: {instructions}\n"

        system_prompt = (
            "You are Friday and EDITH, generating a high-converting, professional operator draft reply for WhatsApp.\n"
            "Rules:\n"
            "1. Address the specific customer inquiry directly and politely.\n"
            "2. If this is a group chat, keep it focused and concise (1-3 sentences) to avoid group spam.\n"
            "3. Never hallucinate fake pricing or unverified guarantees. Reference catalog items accurately.\n"
            "4. Output ONLY the exact text ready to be sent by the operator to the chat."
        )

        suggested_text = ""
        model_used = "Google Gemini / NVIDIA NIM"
        try:
            from app.ai.router import ai_router, Capability, ModelRequest, ModelMessage
            model_req = ModelRequest(
                messages=[
                    ModelMessage(role="system", content=system_prompt),
                    ModelMessage(role="user", content=user_prompt),
                ],
                temperature=0.3,
                max_tokens=250,
            )
            resp = await ai_router.execute(Capability.CORE_BRAIN, model_req)
            if resp and resp.content:
                suggested_text = resp.content.strip().strip('"')
                model_used = resp.model_name or "NVIDIA Nemotron / Google Gemini"
        except Exception as e:
            logger.warning(f"AI draft generation fallback: {e}")

        if not suggested_text:
            if is_group:
                suggested_text = f"Hello {participant or 'there'}! Thank you for inquiring. We supply wholesale Assam CTC and Darjeeling tea directly from partner estates with lab-tested quality certificates. Would you like our latest wholesale rate sheet and sample details?"
            else:
                suggested_text = "Hello! Thank you for reaching out to us. We have fresh Assam Kadak CTC and Darjeeling grades available in wholesale packaging. How many kilograms or bags are you looking to procure for your business?"

        return {
            "success": True,
            "conversation_id": conversation_id,
            "suggested_reply": suggested_text,
            "is_group": is_group,
            "model": model_used,
            "participant": participant,
            "instructions_applied": instructions,
        }

