"""
Owner WhatsApp Notifications formatting and dispatching service (Section 41 & 42).
"""

from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.models import Notification
from app.utils.logging import logger
from app.utils.phone import normalize_phone_number


class NotificationService:
    """
    Formats and dispatches high-priority operational alerts to the business owner.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self.owner_phone = normalize_phone_number(settings.OWNER_WHATSAPP_NUMBER, default_country_code="+91")

    async def notify_hot_lead(
        self,
        customer_name: str,
        phone: str,
        company: str,
        location: str,
        product: str,
        quantity: str,
        budget: str,
        score: int,
        stage: str,
        customer_quote: str,
        ai_summary: str,
        recommended_action: str = "Take over conversation.",
    ) -> Notification:
        """
        Dispatches standard 🔥 HOT LEAD notification format (Section 41).
        """
        content = (
            f"🔥 HOT LEAD ALERT\n\n"
            f"Name: {customer_name}\n"
            f"Phone: {phone}\n"
            f"Location: {location}\n"
            f"Business: {company}\n"
            f"Interested in: {product}\n"
            f"Requirement: {quantity}\n"
            f"Budget: {budget}\n"
            f"Lead score: {score}/100\n"
            f"Stage: {stage}\n\n"
            f'Customer said: "{customer_quote}"\n\n'
            f"AI summary: {ai_summary}\n\n"
            f"Recommended action: {recommended_action}"
        )

        notif = Notification(
            org_id=self.org_id,
            recipient=self.owner_phone,
            channel="whatsapp",
            notification_type="HOT_LEAD",
            content=content,
            status="queued",
        )
        self.session.add(notif)
        await self.session.commit()
        logger.info(f"Owner notification queued for hot lead: {customer_name} ({phone}).")
        return notif

    async def notify_system_event(
        self,
        event_type: str,
        summary: str,
        error_details: Optional[str] = None,
    ) -> Notification:
        """
        Dispatches operational or integration failure alerts.
        """
        content = f"⚠️ WB-AGENT ALERT [{event_type}]\n\n{summary}"
        if error_details:
            content += f"\n\nError: {error_details}"

        notif = Notification(
            org_id=self.org_id,
            recipient=self.owner_phone,
            channel="whatsapp",
            notification_type=event_type,
            content=content,
            status="queued",
        )
        self.session.add(notif)
        await self.session.commit()
        return notif
