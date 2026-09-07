"""
Personalized B2B Proposal Crafting Engine for EDITH (Section 68, 81).
Takes imported CSV leads and creates custom, high-converting estate tea proposals
tailored specifically to business type, location, and beverage requirements.
"""

from datetime import timedelta
from typing import Any, Dict, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.base import utc_now
from app.database.models import Conversation, Customer, FollowupJob, Lead, Message
from app.utils.logging import logger
from app.whatsapp.service import WhatsAppService


class ProposalGenerator:
    """
    Generates personalized commercial B2B proposals and schedules 24-48h zero-cost check-ins.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    @staticmethod
    def craft_proposal(lead: Lead) -> Dict[str, str]:
        """
        Creates custom B2B proposal and 1-2 day zero-cost follow-up tailored to lead details.
        """
        name = lead.contact_name or lead.company_name or "Partner"
        company = lead.company_name or "your organization"
        company_type = (lead.company_type or "business").lower()
        city = lead.city or "your city"
        interest = (lead.product_interest or "").lower()

        sender = getattr(settings, "AGENT_NAME", "Rajiv")
        business = getattr(settings, "BUSINESS_NAME", "our business")

        # 1. Custom tailored proposal message
        if "hotel" in company_type or "resort" in company_type or "hospitality" in company_type:
            proposal_text = (
                f"Namaste {name}! {sender} here from {business}. ✨\n\n"
                f"We supply direct verified commercial solutions and premium wholesale packages to premier hospitality brands across India. "
                f"For {company} in {city}, we offer our Premium Commercial Package with dedicated priority fulfillment "
                f"and volume-tier commercial pricing with direct quality guarantees.\n\n"
                f"Would you like us to dispatch a complimentary specification and sample evaluation kit to your team in {city}?"
            )
        elif "wholesaler" in company_type or "distributor" in company_type:
            proposal_text = (
                f"Namaste {name}! {sender} here from {business}. ✨\n\n"
                f"We supply factory-direct bulk shipments and commercial packages straight from primary production hubs. "
                f"We eliminate middleman commissions for distributors in {city}, offering competitive volume discounts "
                f"with custom contract pricing on enterprise consignments.\n\n"
                f"Could I share our complete commercial grade catalog and dispatch schedule with you?"
            )
        else:  # General commercial, Retail, Cafe, Enterprise
            proposal_text = (
                f"Namaste {name}! {sender} here from {business}. ✨\n\n"
                f"We supply verified commercial products and business solutions directly to fast-growing organizations. "
                f"For {company} in {city}, our Standard Commercial Package is specially engineered for operational efficiency, "
                f"reliable delivery, and transparent volume discount tiers.\n\n"
                f"May we send you a complimentary specification package and product trial so your team can evaluate the quality?"
            )

        # 2. 1-2 Day polite follow-up (zero pressure, zero cost to ask)
        followup_text = (
            f"Hi {name}, {sender} here following up on our proposal for {company}! ✨\n\n"
            f"Just wanted to gently check in—there is absolutely zero cost or obligation to enquire or request evaluation samples. "
            f"If you have any questions on pricing, packaging, or specifications for {city}, I'd be genuinely glad to help whenever you have a moment!"
        )

        return {
            "proposal_text": proposal_text,
            "followup_text": followup_text,
        }

    async def send_proposal_to_lead(
        self,
        lead_id: str,
        custom_message: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Sends the custom proposal to the lead on WhatsApp and schedules the 24-48h zero-cost check-in.
        """
        lead = await self.session.get(Lead, lead_id)
        if not lead:
            raise ValueError(f"Lead '{lead_id}' not found.")

        # 1. Ensure Customer record exists
        from app.database.models import Customer
        cust_stmt = select(Customer).where(
            Customer.org_id == self.org_id,
            Customer.primary_phone == lead.phone,
        )
        cust = (await self.session.execute(cust_stmt)).scalar_one_or_none()
        if not cust:
            cust = Customer(
                org_id=self.org_id,
                primary_phone=lead.phone,
                name=lead.name,
                company_name=lead.company_name,
                company_type=lead.company_type,
                city=lead.city,
                state=lead.state,
                preferred_language=lead.preferred_language,
                opt_in_status=True,
            )
            self.session.add(cust)
            await self.session.commit()
            await self.session.refresh(cust)

        # 2. Ensure Conversation exists
        from app.conversations.service import ConversationService
        conv_svc = ConversationService(self.session, self.org_id)
        conv = await conv_svc.get_or_create_conversation(
            customer_id=cust.id,
            channel="whatsapp",
            channel_id=lead.phone,
        )

        # 3. Generate proposal & follow-up content
        proposal_bundle = self.craft_proposal(lead)
        outbound_text = custom_message or proposal_bundle["proposal_text"]

        # 4. Dispatch via WhatsApp
        provider_msg_id = None
        try:
            wa = WhatsAppService.get_provider()
            send_res = await wa.send_message(to_phone=lead.phone, text=outbound_text)
            if send_res and send_res.provider_message_id:
                provider_msg_id = send_res.provider_message_id
        except Exception as e:
            logger.error(f"Failed to dispatch proposal to {lead.phone}: {e}")

        # 5. Record outbound message
        msg = Message(
            org_id=self.org_id,
            conversation_id=conv.id,
            direction="outbound",
            sender_type="agent",
            content=outbound_text,
            delivery_status="sent",
            provider_message_id=provider_msg_id,
        )
        self.session.add(msg)

        # 6. Schedule the 36-hour polite check-in (1-2 days)
        scheduled_for = utc_now() + timedelta(hours=36)
        followup = FollowupJob(
            org_id=self.org_id,
            conversation_id=conv.id,
            customer_id=cust.id,
            campaign_id=lead.campaign_id,
            scheduled_for=scheduled_for,
            step=1,
            status="scheduled",
            template_id="proposal_zero_cost_checkin",
        )
        self.session.add(followup)

        # 7. Update Lead status to contacted
        lead.status = "contacted"
        conv.sales_stage = "CONTACTED"
        await self.session.commit()

        logger.info(f"Custom proposal dispatched to {lead.phone} for company {lead.company_name}")
        return {
            "lead_id": lead.id,
            "phone": lead.phone,
            "conversation_id": conv.id,
            "proposal_text": outbound_text,
            "followup_scheduled_for": scheduled_for.isoformat(),
        }
