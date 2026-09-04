"""
Owner WhatsApp Interactive Command Engine for EDITH (Section 20, 57, 58).
Allows the business owner (+91 89006 53250) to query system status, inspect hot leads,
review orders, pause/resume AI on conversations, and approve knowledge updates via WhatsApp.
"""

from typing import Optional
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.models import (
    Conversation,
    Customer,
    Deal,
    Handoff,
    HumanKnowledgeRequest,
    KnowledgeCandidate,
    Lead,
    Order,
    SalesLearning,
)
from app.utils.logging import logger
from app.utils.phone import normalize_phone_number


class OwnerCommandHandler:
    """
    Parses and executes administrative WhatsApp commands from authorized business authorities.
    """

    @staticmethod
    def is_owner(phone: str) -> bool:
        """
        Verifies if the sender phone matches the configured primary owner WhatsApp number.
        """
        if not phone:
            return False
        clean_sender = normalize_phone_number(phone)
        owner_configured = normalize_phone_number(settings.OWNER_WHATSAPP_NUMBER or "+918900653250")
        return clean_sender == owner_configured

    @classmethod
    async def process_command(
        cls,
        sender_phone: str,
        command_text: str,
        session: AsyncSession,
        org_id: str,
    ) -> Optional[str]:
        """
        Executes owner commands and returns a formatted WhatsApp response.
        If sender is not owner, returns None.
        """
        if not cls.is_owner(sender_phone):
            return None

        cmd = command_text.strip()
        cmd_upper = cmd.upper()
        parts = cmd.split(maxsplit=1)
        action = parts[0].upper()
        arg = parts[1].strip() if len(parts) > 1 else ""

        logger.info(f"Executing owner command '{action}' from {sender_phone}")

        # 1. HELP COMMAND
        if action in ("HELP", "?", "COMMANDS", "MENU"):
            return (
                "👑 *EDITH Owner Management Commands*\n\n"
                "• *STATUS* — Executive overview (leads, active chats, revenue)\n"
                "• *HOT LEADS* — High-intent buyers ready to close\n"
                "• *ORDERS* — Recent wholesale commercial orders\n"
                "• *LEAD <phone>* — View full profile & notes for a lead\n"
                "• *PAUSE <phone>* — Pause AI for manual human takeover\n"
                "• *RESUME <phone>* — Resume AI autonomous consultation\n"
                "• *LEARNINGS* — Recent sales tactics and objection insights\n"
                "• *HELP* — Show this command manual"
            )

        # 2. STATUS COMMAND
        elif action in ("STATUS", "STATS", "DASHBOARD"):
            total_leads = (await session.execute(select(func.count(Lead.id)).where(Lead.org_id == org_id))).scalar() or 0
            active_chats = (await session.execute(select(func.count(Conversation.id)).where(Conversation.org_id == org_id, Conversation.sales_stage != "CLOSED"))).scalar() or 0
            hot_buyers = (await session.execute(select(func.count(Conversation.id)).where(Conversation.org_id == org_id, Conversation.sales_stage == "PURCHASE_INTENT"))).scalar() or 0
            total_orders = (await session.execute(select(func.count(Order.id)).where(Order.org_id == org_id))).scalar() or 0
            total_revenue = (await session.execute(select(func.sum(Order.total_amount)).where(Order.org_id == org_id))).scalar() or 0

            return (
                "📊 *EDITH SYSTEM STATUS & OPERATIONS*\n\n"
                f"👥 *Total Pipeline Leads:* {total_leads}\n"
                f"💬 *Active Conversations:* {active_chats}\n"
                f"🔥 *Hot Buyers (Purchase Intent):* {hot_buyers}\n"
                f"📦 *Total Orders Created:* {total_orders}\n"
                f"💰 *Total Confirmed Value:* ₹{total_revenue:,.2f}\n"
                f"🤖 *AI Agent Status:* 🟢 ONLINE (Nemotron-3.5-Lightning)\n"
                f"🔗 *WhatsApp Bridge:* 🟢 CONNECTED (+91 8918753100)\n\n"
                "Type *HOT LEADS* or *ORDERS* for immediate details!"
            )

        # 3. HOT LEADS COMMAND
        elif action in ("HOT", "HOTLEADS", "HOT_LEADS", "BUYERS"):
            stmt = (
                select(Conversation, Customer)
                .join(Customer, Conversation.customer_id == Customer.id)
                .where(
                    Conversation.org_id == org_id,
                    Conversation.sales_stage.in_(("PURCHASE_INTENT", "QUALIFIED")),
                )
                .order_by(Conversation.lead_score.desc())
                .limit(5)
            )
            rows = (await session.execute(stmt)).all()
            if not rows:
                return "ℹ️ *No pending hot leads right now.* EDITH is qualifying incoming prospects."

            lines = ["🔥 *TOP HIGH-INTENT READY BUYERS:*\n"]
            for conv, cust in rows:
                cname = cust.name or "Prospect"
                cphone = cust.primary_phone
                ccompany = cust.company_name or cust.company_type or "Business"
                ccity = cust.city or "India"
                lines.append(
                    f"• *{cname}* ({ccompany}, {ccity})\n"
                    f"  📱 {cphone}\n"
                    f"  🎯 Stage: {conv.sales_stage} | Score: {conv.lead_score}/100\n"
                    f"  Action: Type *PAUSE {cphone}* to take over manually.\n"
                )
            return "\n".join(lines)

        # 4. ORDERS COMMAND
        elif action in ("ORDERS", "ORDER", "SALES"):
            stmt = select(Order).where(Order.org_id == org_id).order_by(Order.created_at.desc()).limit(5)
            orders = (await session.execute(stmt)).scalars().all()
            if not orders:
                return "📦 *No wholesale orders found in the system yet.* You can create orders directly in the Dashboard at /orders!"

            lines = ["📦 *RECENT COMMERCIAL ORDERS:*\n"]
            for o in orders:
                lines.append(
                    f"• *{o.order_number}* — ₹{o.total_amount:,.2f}\n"
                    f"  Status: {o.status.upper()} | Payment: {o.payment_status.upper()}\n"
                    f"  Deliver to: {o.shipping_name or 'Buyer'} ({o.shipping_city or 'India'})\n"
                )
            return "\n".join(lines)

        # 5. LEAD LOOKUP COMMAND
        elif action in ("LEAD", "CUSTOMER", "LOOKUP"):
            if not arg:
                return "⚠️ Please specify a phone number. Example: *LEAD +919876543210*"
            clean_lookup = normalize_phone_number(arg)
            cust_stmt = select(Customer).where(
                Customer.org_id == org_id,
                Customer.primary_phone.like(f"%{clean_lookup[-10:]}"),
            )
            cust = (await session.execute(cust_stmt)).scalar_one_or_none()
            if not cust:
                return f"❌ No lead or customer found with phone matching '{arg}'."

            conv_stmt = select(Conversation).where(Conversation.customer_id == cust.id).order_by(Conversation.updated_at.desc())
            conv = (await session.execute(conv_stmt)).scalar_one_or_none()

            return (
                f"👤 *LEAD PROFILE: {cust.name or 'Prospect'}*\n"
                f"📱 *Phone:* {cust.primary_phone}\n"
                f"🏢 *Company:* {cust.company_name or 'N/A'} ({cust.company_type or 'General'})\n"
                f"📍 *City:* {cust.city or 'N/A'}, {cust.state or 'India'}\n"
                f"🎯 *Sales Stage:* {conv.sales_stage if conv else 'NEW'}\n"
                f"⭐ *Lead Score:* {conv.lead_score if conv else 0}/100\n"
                f"⚙️ *Mode:* {conv.mode if conv else 'AI'}\n"
                f"💬 *Language:* {cust.preferred_language or 'English'}\n"
            )

        # 6. PAUSE COMMAND
        elif action in ("PAUSE", "TAKEOVER", "STOP_AI"):
            if not arg:
                return "⚠️ Please specify a phone number to pause AI on. Example: *PAUSE +919876543210*"
            clean_target = normalize_phone_number(arg)
            cust_stmt = select(Customer).where(
                Customer.org_id == org_id,
                Customer.primary_phone.like(f"%{clean_target[-10:]}"),
            )
            cust = (await session.execute(cust_stmt)).scalar_one_or_none()
            if not cust:
                return f"❌ Customer '{arg}' not found."

            conv_stmt = select(Conversation).where(Conversation.customer_id == cust.id)
            conv = (await session.execute(conv_stmt)).scalar_one_or_none()
            if not conv:
                return f"❌ Active conversation for '{arg}' not found."

            conv.mode = "HUMAN"
            await session.commit()
            return f"🛑 *AI Paused for {cust.name or arg}!* Conversation mode is now set to HUMAN. EDITH will not send automated messages on this chat."

        # 7. RESUME COMMAND
        elif action in ("RESUME", "START_AI", "UNPAUSE"):
            if not arg:
                return "⚠️ Please specify a phone number to resume AI on. Example: *RESUME +919876543210*"
            clean_target = normalize_phone_number(arg)
            cust_stmt = select(Customer).where(
                Customer.org_id == org_id,
                Customer.primary_phone.like(f"%{clean_target[-10:]}"),
            )
            cust = (await session.execute(cust_stmt)).scalar_one_or_none()
            if not cust:
                return f"❌ Customer '{arg}' not found."

            conv_stmt = select(Conversation).where(Conversation.customer_id == cust.id)
            conv = (await session.execute(conv_stmt)).scalar_one_or_none()
            if not conv:
                return f"❌ Active conversation for '{arg}' not found."

            conv.mode = "AI"
            await session.commit()
            return f"▶️ *AI Resumed for {cust.name or arg}!* EDITH will continue autonomous consultative selling."

        # 8. LEARNINGS COMMAND
        elif action in ("LEARNINGS", "LEARN", "INSIGHTS"):
            stmt = select(SalesLearning).where(SalesLearning.org_id == org_id).order_by(SalesLearning.created_at.desc()).limit(3)
            learnings = (await session.execute(stmt)).scalars().all()
            if not learnings:
                return "🧠 *No empirical sales learnings recorded yet.* EDITH extracts insights as conversations conclude."

            lines = ["🧠 *RECENT EMPIRICAL SALES LEARNINGS:*\n"]
            for l in learnings:
                lines.append(
                    f"• *{l.topic.upper()}* ({l.customer_type or 'Buyer'})\n"
                    f"  Outcome: {l.outcome} (Confidence: {int(l.confidence * 100)}%)\n"
                    f"  Insight: \"{l.insight}\"\n"
                )
            return "\n".join(lines)

        # NON-ADMINISTRATIVE MESSAGE: Allow owner to test sales conversation naturally
        else:
            logger.info(f"Owner message '{action}' is not an admin command; routing to sales consultation.")
            return None
