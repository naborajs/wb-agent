"""
Unknown Information & Human Knowledge Request Manager for EDITH (Sections 19, 20, 21, 22).
Prevents hallucinations by detecting unverified business questions, creating HumanKnowledgeRequests,
routing WhatsApp alerts to the owner (+91 89006 53250), and capturing owner replies as candidate knowledge.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.base import utc_now
from app.database.models import Customer, Conversation
from app.database.models.knowledge_request import HumanKnowledgeRequest, KnowledgeCandidate
from app.utils.logging import logger
from app.whatsapp.service import WhatsAppService


class UnknownKnowledgeManager:
    """
    Manages unverified business information questions and owner authority routing.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def create_knowledge_request(
        self,
        customer_id: str,
        conversation_id: str,
        question: str,
        context_searched: str,
        urgency: str = "HIGH",
    ) -> HumanKnowledgeRequest:
        """
        Creates a HumanKnowledgeRequest record and notifies the owner/authority via WhatsApp.
        """
        # 1. Fetch customer and conversation details
        customer = await self.session.get(Customer, customer_id)
        conv = await self.session.get(Conversation, conversation_id)

        customer_name = customer.name if customer and customer.name else "Prospective Buyer"
        customer_phone = customer.primary_phone if customer else "Unknown"
        customer_company = customer.company_name if customer and customer.company_name else "Wholesale Inquiry"

        suggested_reply = (
            "I want to make sure I give you accurate, verified details on that. "
            "Let me confirm with our estate operations team and get back to you shortly."
        )

        owner_phone = settings.OWNER_WHATSAPP_NUMBER or "+918900653250"

        # 2. Persist request
        req = HumanKnowledgeRequest(
            org_id=self.org_id,
            customer_id=customer_id,
            conversation_id=conversation_id,
            question=question,
            context_searched=context_searched,
            urgency=urgency,
            status="PENDING",
            assigned_to_phone=owner_phone,
            suggested_reply=suggested_reply,
        )
        self.session.add(req)
        await self.session.commit()
        await self.session.refresh(req)

        # 3. Format and dispatch Owner WhatsApp alert (Section 21)
        alert_text = (
            f"⚠️ *EDITH NEEDS BUSINESS INFORMATION*\n\n"
            f"👤 *Customer:* {customer_name} ({customer_phone})\n"
            f"🏢 *Company:* {customer_company}\n"
            f"❓ *Question Asked:* \"{question}\"\n\n"
            f"🔍 *Knowledge Searched:* {context_searched}\n"
            f"📊 *Result:* No verified answer in product catalog or documentation.\n\n"
            f"💡 *Customer Held With:* \"{suggested_reply}\"\n\n"
            f"👉 *Action Required:* Please reply with the verified answer to update EDITH and resolve this inquiry."
        )

        try:
            wa = WhatsAppService.get_provider()
            await wa.send_message(to_phone=owner_phone, text=alert_text)
            logger.info(f"Dispatched unknown knowledge alert to owner {owner_phone} for request {req.id}")
        except Exception as e:
            logger.error(f"Failed to dispatch owner alert for knowledge request: {e}")

        return req

    async def record_human_reply(
        self,
        request_id: str,
        answer_text: str,
        source: str = "human_owner",
    ) -> KnowledgeCandidate:
        """
        Records the owner's answer as a KnowledgeCandidate for approval and knowledge enrichment.
        """
        req = await self.session.get(HumanKnowledgeRequest, request_id)
        if not req:
            raise ValueError(f"Knowledge request '{request_id}' not found.")

        candidate = KnowledgeCandidate(
            org_id=self.org_id,
            request_id=request_id,
            source=source,
            question=req.question,
            proposed_answer=answer_text,
            approval_status="PENDING",
            context_metadata={"customer_id": req.customer_id, "conversation_id": req.conversation_id},
        )
        self.session.add(candidate)

        # Mark request as answered
        req.status = "ANSWERED"
        req.resolved_at = utc_now()
        req.resolution_notes = answer_text

        await self.session.commit()
        await self.session.refresh(candidate)
        logger.info(f"Recorded human reply candidate {candidate.id} for request {request_id}")
        return candidate
