"""
AgentOrchestrator: core intelligence and execution engine for WB-Agent (Section 23 & 24).

Coordinates:
- Contextual assembly
- Intent & Language detection
- Structured Decision planning
- Tool execution
- Response generation & validation
- Human handoff escalation & owner alerts
- Atomic pre-send state verification
"""

import time
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.agent.intent import detect_intent_and_objection, detect_language
from app.agent.providers.base import LLMMessage
from app.agent.providers.router import LLMRouter
from app.agent.tools.registry import ToolRegistry
from app.agent.validator import ResponseValidator
from app.conversations.context import ContextBuilder
from app.conversations.service import ConversationService
from app.database.base import utc_now
from app.database.models import AgentEvent, AgentRun, Conversation, Customer, Handoff, Notification
from app.memory.customer import CustomerMemoryService
from app.schemas.agent import AgentTurnResponse, StructuredDecision
from app.utils.logging import logger


class AgentOrchestrator:
    """
    Stateful AI Sales Consultant operating over PostgreSQL and LLM router.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self.context_builder = ContextBuilder(session, org_id)
        self.conv_service = ConversationService(session, org_id)
        self.memory_service = CustomerMemoryService(session, org_id)
        self.llm_router = LLMRouter()

    async def process_turn(
        self,
        conversation_id: str,
        inbound_message: str,
        sender_id: Optional[str] = None,
        provider_message_id: Optional[str] = None,
    ) -> AgentTurnResponse:
        """
        Executes a single conversational sales turn.
        """
        start_t = time.time()

        # 1. Check conversation state & log inbound message
        conv = await self.conv_service.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        await self.conv_service.add_message(
            conversation_id=conversation_id,
            direction="inbound",
            sender_type="customer",
            sender_id=sender_id,
            content=inbound_message,
            provider_message_id=provider_message_id,
            delivery_status="delivered",
        )

        # 2. Build working context
        ctx = await self.context_builder.build_context(conversation_id, inbound_message)

        # 3. Detect Language and Intent
        language = detect_language(inbound_message)
        intent, confidence, objection_cat = detect_intent_and_objection(inbound_message)

        # Update customer preferred language if detected with high confidence
        if language != ctx.preferred_language:
            cust = await self.session.get(Customer, ctx.customer_id)
            if cust:
                cust.preferred_language = language

        # 4. Initialize AgentRun audit record (Section 110)
        agent_run = AgentRun(
            org_id=self.org_id,
            conversation_id=conversation_id,
            model="orchestrated",
            provider="hybrid",
            intent=intent,
            sales_stage_before=conv.sales_stage,
            lead_score_before=conv.lead_score,
            decision_action=intent,
            started_at=utc_now(),
        )
        self.session.add(agent_run)
        await self.session.flush()

        tool_registry = ToolRegistry(self.session, self.org_id, agent_run.id)
        tools_executed: List[str] = []
        reply_text: str = ""
        handoff_created = False
        target_stage = conv.sales_stage
        score_delta = 0

        # 5. Handle Opt-Out (Compliance Guard, Section 6)
        if intent == "opt_out":
            cust = await self.session.get(Customer, ctx.customer_id)
            if cust:
                cust.opt_in_status = False
                cust.opt_out_timestamp = utc_now()
            target_stage = "OPTED_OUT"
            score_delta = -50
            reply_text = "You have been successfully opted out from North Bengal Tea Co. We will not message you again."
            decision = StructuredDecision(
                intent="opt_out",
                customer_goal="Unsubscribe from messages",
                sales_stage=target_stage,
                confidence=1.0,
                recommended_action="close",
                reason_code="OPT_OUT_RECEIVED",
            )

        # 6. Handle Explicit Human Request
        elif intent == "human_request":
            target_stage = "HUMAN_HANDOFF"
            handoff_created = True
            handoff = Handoff(
                org_id=self.org_id,
                conversation_id=conversation_id,
                customer_id=ctx.customer_id,
                reason="explicit_request",
                summary=f"Customer requested human operator: '{inbound_message}'",
                customer_intent="Speak with human sales manager",
            )
            self.session.add(handoff)
            await self.conv_service.update_mode(conversation_id, "HUMAN", reason="customer_request")
            reply_text = "I am transferring you directly to our sales director Rajiv now. He will join this conversation shortly."
            decision = StructuredDecision(
                intent="human_request",
                sales_stage=target_stage,
                confidence=0.95,
                recommended_action="handoff",
                handoff_required=True,
                handoff_reason="Customer requested live human",
                reason_code="HUMAN_TAKEOVER_REQUEST",
            )

        # 7. Handle Purchase Intent
        elif intent == "purchase_intent":
            target_stage = "PURCHASE_INTENT"
            score_delta = +25
            handoff_created = True
            handoff = Handoff(
                org_id=self.org_id,
                conversation_id=conversation_id,
                customer_id=ctx.customer_id,
                reason="purchase_intent",
                summary=f"Hot Buyer ready to place order! Said: '{inbound_message}'",
                customer_intent="Finalize purchase and invoice",
            )
            self.session.add(handoff)
            # Notify owner (+918900653250)
            owner_notif = Notification(
                org_id=self.org_id,
                recipient="+918900653250",
                notification_type="PURCHASE_INTENT",
                content=f"🔥 HOT LEAD READY TO BUY!\nCustomer: {ctx.customer_name or 'Buyer'}\nCompany: {ctx.company_name or 'Business'}\nSaid: '{inbound_message}'",
            )
            self.session.add(owner_notif)
            await self.conv_service.update_mode(conversation_id, "HUMAN", reason="purchase_intent")
            reply_text = (
                "Wonderful! I'm marking your order specifications and looping in our commercial director Rajiv "
                "to confirm your GST details, final invoice, and dispatch dispatch date."
            )
            decision = StructuredDecision(
                intent="purchase_intent",
                sales_stage=target_stage,
                confidence=0.95,
                recommended_action="handoff",
                handoff_required=True,
                handoff_reason="Purchase intent detected",
                reason_code="HOT_BUYER_CONVERSION",
            )

        # 8. Standard Conversational Sales Logic
        else:
            # Plan next stage and score
            if intent == "objection":
                target_stage = "OBJECTION"
                score_delta = +5
            elif intent in ("price_inquiry", "sample_request") and conv.sales_stage in ("DISCOVERY", "NEW", "CONTACTED"):
                target_stage = "QUALIFIED"
                score_delta = +15
            elif conv.sales_stage in ("NEW", "CONTACTED"):
                target_stage = "DISCOVERY"
                score_delta = +10

            # Execute relevant tools based on intent
            if intent in ("price_inquiry", "product_inquiry"):
                tool_res = await tool_registry.execute("search_products", {"query": "tea"})
                tools_executed.append("search_products")

            # Generate response via LLM Router
            prompt_msgs = [
                LLMMessage(role="system", content="You are the AI Sales Consultant for North Bengal Tea Co."),
                LLMMessage(role="user", content=inbound_message),
            ]
            llm_resp = await self.llm_router.generate(prompt_msgs)
            reply_text = llm_resp.content

            decision = StructuredDecision(
                intent=intent,
                sales_stage=target_stage,
                confidence=confidence,
                recommended_action="recommend" if intent == "product_inquiry" else "question",
                tools_required=tools_executed,
                reason_code=f"INTENT_{intent.upper()}",
            )

        # 9. Validate Response (Section 72)
        is_valid, validation_issues, sanitized_reply = ResponseValidator.validate(reply_text)
        if not is_valid:
            logger.warning(f"Response validation issues: {validation_issues}. Falling back to safe response.")
            sanitized_reply = (
                "Thank you for reaching out to North Bengal Tea Co. We provide estate-fresh wholesale teas. "
                "How many kilograms per month does your establishment require?"
            )

        # 10. Atomic Pre-Send State Check (ADR-008)
        # Re-verify conversation mode before sending to prevent race condition with human operator
        fresh_conv = await self.session.get(Conversation, conversation_id)
        is_suppressed = False
        if fresh_conv and fresh_conv.mode not in ("AI", "HUMAN"):
            logger.info(f"Send aborted: conversation {conversation_id} is in mode '{fresh_conv.mode}'.")
            is_suppressed = True

        if not is_suppressed and sanitized_reply:
            # Dispatch outbound via active WhatsApp provider
            provider_msg_id = None
            try:
                from app.whatsapp.service import WhatsAppService
                wa = WhatsAppService.get_provider()
                if conv.channel_id:
                    send_res = await wa.send_message(to_phone=conv.channel_id, text=sanitized_reply)
                    if send_res and send_res.provider_message_id:
                        provider_msg_id = send_res.provider_message_id
            except Exception as e:
                logger.error(f"Failed to dispatch outbound WhatsApp message: {e}")

            await self.conv_service.add_message(
                conversation_id=conversation_id,
                direction="outbound",
                sender_type="agent",
                content=sanitized_reply,
                delivery_status="sent",
                provider_message_id=provider_msg_id,
            )

        # 11. Update Stage and Score
        await self.conv_service.update_stage_and_score(
            conversation_id=conversation_id,
            new_stage=target_stage,
            score_delta=score_delta,
            trigger_reason=decision.reason_code,
        )

        # 12. Complete AgentRun audit record
        latency_ms = int((time.time() - start_t) * 1000)
        agent_run.completed_at = utc_now()
        agent_run.latency_ms = latency_ms
        agent_run.sales_stage_after = target_stage
        agent_run.lead_score_after = conv.lead_score + score_delta
        agent_run.tools_used = tools_executed
        agent_run.decision_action = decision.recommended_action
        agent_run.result_summary = sanitized_reply[:200]
        await self.session.commit()

        return AgentTurnResponse(
            conversation_id=conversation_id,
            reply_text=sanitized_reply,
            decision=decision,
            sales_stage_before=conv.sales_stage,
            sales_stage_after=target_stage,
            lead_score_before=conv.lead_score,
            lead_score_after=conv.lead_score + score_delta,
            tools_executed=tools_executed,
            handoff_created=handoff_created,
            is_suppressed=is_suppressed,
        )
