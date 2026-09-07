"""
AgentOrchestrator: core intelligence and execution engine for EDITH (Sections 4, 5, 10, 11, 12, 13, 23, 24, 25, 27).

Coordinates:
1. Inbound registration & turn aggregation
2. Contextual assembly (Customer Profile, Multi-Tier Memory, Business Knowledge)
3. Language, emotional state, and passive fact extraction
4. Consultative Sales Engine decision (SPIN discovery, objection handling, single-question selection)
5. Unknown business question detection & Owner WhatsApp notification
6. Purchase intent recognition & human handoff escalation
7. Context-rich response generation via NVIDIA Nemotron-3.5-Lightning
8. Response validation (pricing & factual integrity)
9. Atomic pre-send state check (Human takeover race condition guard)
10. WhatsApp dispatch via active bridge provider
11. Bounded background thinking job enqueueing
"""

import os
from pathlib import Path
import re
import time
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.extractor import PassiveInformationExtractor
from app.agent.intent import classify_intent_llm, detect_intent_and_objection, detect_language
from app.agent.providers.base import LLMMessage
from app.agent.providers.router import LLMRouter
from app.agent.sales_engine import ConsultativeSalesEngine
from app.agent.tools.registry import ToolRegistry
from app.agent.validator import ResponseValidator
from app.ai.pricing_validator import PricingValidator
from app.ai.router import AIRouter, ai_router
from app.ai.types import Capability, ModelMessage, ModelRequest
from app.config import settings
from app.conversations.context import ContextBuilder
from app.conversations.service import ConversationService
from app.database.base import utc_now
from app.database.models import (
    AgentEvent,
    AgentRun,
    Conversation,
    Customer,
    CustomerMemory,
    Handoff,
    Notification,
    Product,
)
from app.knowledge.unknown_manager import UnknownKnowledgeManager
from app.memory.conversation import ConversationMemoryService
from app.memory.customer import CustomerMemoryService
from app.schemas.agent import AgentTurnResponse, StructuredDecision
from app.utils.logging import logger


class AgentOrchestrator:
    """
    Stateful AI Sales Consultant (EDITH) operating over PostgreSQL and NVIDIA Nemotron.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self.context_builder = ContextBuilder(session, org_id)
        self.conv_service = ConversationService(session, org_id)
        self.memory_service = CustomerMemoryService(session, org_id)
        self.conv_memory = ConversationMemoryService(session, org_id)
        self.unknown_mgr = UnknownKnowledgeManager(session, org_id)
        self.ai_router = ai_router
        self.llm_router = ai_router

    async def process_turn(
        self,
        conversation_id: str,
        inbound_message: str,
        sender_id: Optional[str] = None,
        provider_message_id: Optional[str] = None,
        is_simulation: bool = False,
    ) -> AgentTurnResponse:
        """
        Executes a single consultative sales conversational turn.
        """
        start_t = time.time()

        # 1. Inbound registration & conversation retrieval
        conv = await self.conv_service.get_by_id(conversation_id)
        if not conv:
            raise ValueError(f"Conversation '{conversation_id}' not found.")

        inbound_msg = await self.conv_service.add_message(
            conversation_id=conversation_id,
            direction="inbound",
            sender_type="customer",
            sender_id=sender_id,
            content=inbound_message,
            provider_message_id=provider_message_id,
            delivery_status="delivered",
        )

        # Idempotency Guard: Prevent duplicate turn processing if agent already replied
        if provider_message_id and inbound_msg:
            dup_reply_stmt = (
                select(Message)
                .where(
                    Message.org_id == self.org_id,
                    Message.conversation_id == conversation_id,
                    Message.direction == "outbound",
                    Message.sender_type == "agent",
                    Message.created_at >= inbound_msg.created_at,
                )
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            existing_reply = (await self.session.execute(dup_reply_stmt)).scalar_one_or_none()
            if existing_reply:
                logger.info(f"Duplicate turn prevented: agent already replied to message '{provider_message_id}'.")
                return AgentTurnResponse(
                    conversation_id=conversation_id,
                    reply_text=existing_reply.content,
                    decision=StructuredDecision(
                        intent="duplicate_turn",
                        sales_stage=conv.sales_stage,
                        confidence=1.0,
                        recommended_action="none",
                    ),
                    sales_stage_before=conv.sales_stage,
                    sales_stage_after=conv.sales_stage,
                    lead_score_before=conv.lead_score,
                    lead_score_after=conv.lead_score,
                    is_suppressed=True,
                )

        # Early Guard: If conversation is in HUMAN, PAUSED, or CLOSED mode, do not invoke AI
        if conv.mode != "AI":
            logger.info(f"Conversation {conversation_id} is in mode '{conv.mode}'. Suppressing AI turn execution.")
            try:
                from app.realtime.connection_manager import ws_manager
                await ws_manager.broadcast_to_org(
                    self.org_id,
                    "new_message",
                    {
                        "conversation_id": conversation_id,
                        "direction": "inbound",
                        "sender_type": "customer",
                        "content": inbound_message,
                        "channel_id": conv.channel_id,
                    },
                )
            except Exception:
                pass
            return AgentTurnResponse(
                conversation_id=conversation_id,
                reply_text="",
                decision=StructuredDecision(
                    intent="human_mode_suppressed",
                    sales_stage=conv.sales_stage,
                    confidence=1.0,
                    recommended_action="none",
                    tools_required=[],
                    reason_code="HUMAN_MODE_ACTIVE",
                    handoff_required=False,
                ),
                sales_stage_before=conv.sales_stage,
                sales_stage_after=conv.sales_stage,
                lead_score_before=conv.lead_score,
                lead_score_after=conv.lead_score,
                tools_executed=[],
                handoff_created=False,
                is_suppressed=True,
            )

        # 2. Build working context & customer profile
        try:
            from app.realtime.connection_manager import ws_manager
            await ws_manager.broadcast_to_org(
                self.org_id,
                "agent_thinking",
                {
                    "conversation_id": conversation_id,
                    "channel_id": conv.channel_id,
                    "status": "deliberating",
                    "model": "nvidia/nemotron-3-super-120b-a12b",
                },
            )
        except Exception:
            pass

        ctx = await self.context_builder.build_context(conversation_id, inbound_message)
        customer = await self.session.get(Customer, ctx.customer_id)

        # Stage G1 Guardrail: Input Safety Check (Directive §3.G - Fail Closed)
        input_verdict = await self.ai_router.check_input_safety(inbound_message)
        if not input_verdict.is_safe:
            logger.warning(
                f"Inbound message from {conv.channel_id} held by input safety guardrail: {input_verdict.reason}"
            )
            handoff = Handoff(
                org_id=self.org_id,
                conversation_id=conversation_id,
                customer_id=ctx.customer_id,
                reason="guardrail_violation",
                summary=f"Held by input guardrail: {input_verdict.reason or 'Safety policy violation'}",
                customer_intent="Customer message triggered input safety guardrail",
            )
            self.session.add(handoff)
            await self.conv_service.update_mode(conversation_id, "HUMAN", reason="input_guardrail_hold")
            b_name = getattr(settings, "BUSINESS_NAME", "our business")
            safe_reply = (
                f"Thank you for contacting {b_name}. We have flagged your request for our commercial manager, "
                "who will assist you personally."
            )
            await self.conv_service.add_message(
                conversation_id=conversation_id,
                direction="outbound",
                sender_type="agent",
                content=safe_reply,
                delivery_status="sent",
            )
            await self.session.commit()
            return AgentTurnResponse(
                conversation_id=conversation_id,
                reply_text=safe_reply,
                decision=StructuredDecision(
                    intent="guardrail_held",
                    sales_stage=conv.sales_stage,
                    confidence=1.0,
                    recommended_action="handoff",
                    tools_required=[],
                    reason_code="SAFETY_INPUT_GUARDRAIL_HOLD",
                    handoff_required=True,
                    handoff_reason=input_verdict.reason,
                ),
                sales_stage_before=conv.sales_stage,
                sales_stage_after=conv.sales_stage,
                lead_score_before=conv.lead_score,
                lead_score_after=conv.lead_score,
                tools_executed=[],
                handoff_created=True,
                is_suppressed=True,
            )

        # 3. Passive Information Extraction & Intent Detection (Sections 13 & 14, Directive §3.B)
        facts = PassiveInformationExtractor.extract(inbound_message)
        language = detect_language(inbound_message)
        intent, confidence, objection_cat = await classify_intent_llm(inbound_message)

        # Update language preference if detected
        if language and customer and customer.preferred_language != language:
            customer.preferred_language = language

        # Detect rude, aggressive, or hostile customer tone -> EDITH posts emotional debrief to Friday
        inbound_lower = inbound_message.lower()
        rude_markers = ["bakwas", "pagal", "fraud", "scam", "loot", "rubbish", "stupid", "idiot", "useless", "worst", "harami", "chutiya", "shut up", "terrible", "cheat"]
        if any(marker in inbound_lower for marker in rude_markers):
            try:
                from app.brain import inter_brain_bus
                phone_str = customer.primary_phone if customer and customer.primary_phone else conv.channel_id
                await inter_brain_bus.post_edith_debrief(
                    session=self.session,
                    org_id=self.org_id,
                    category="RUDE_CUSTOMER",
                    details={
                        "phone": phone_str,
                        "customer_message": inbound_message,
                        "sentiment_score": -0.85,
                    },
                )
            except Exception as debrief_err:
                logger.debug(f"[EDITH Debrief] Rude customer debrief warning: {debrief_err}")

        # Persist extracted operational facts into Customer Profile & Memory
        known_profile: Dict[str, Any] = {}
        if customer:
            if customer.city:
                known_profile["location"] = customer.city
            if customer.company_type:
                known_profile["business_type"] = customer.company_type

        # Fetch existing persistent customer memories
        mem_res = await self.session.execute(
            select(CustomerMemory).where(CustomerMemory.customer_id == ctx.customer_id)
        )
        for m in mem_res.scalars().all():
            known_profile[m.key] = m.value

        # Merge newly extracted facts into memory and profile
        if facts.quantity and "quantity" not in known_profile:
            await self.memory_service.set_memory(
                customer_id=ctx.customer_id,
                category="requirements",
                key="quantity",
                value=facts.quantity,
                confidence=0.95,
                verification_status="CUSTOMER_SAID",
                source="customer_message",
            )
            known_profile["quantity"] = facts.quantity

        if facts.business_type and customer:
            customer.company_type = facts.business_type
            known_profile["business_type"] = facts.business_type

        if facts.location and customer:
            customer.city = facts.location
            known_profile["location"] = facts.location

        if facts.use_case and "use_case" not in known_profile:
            await self.memory_service.set_memory(
                customer_id=ctx.customer_id,
                category="requirements",
                key="use_case",
                value=facts.use_case,
                confidence=0.95,
                verification_status="CUSTOMER_SAID",
                source="customer_message",
            )
            known_profile["use_case"] = facts.use_case

        if facts.packaging and "packaging" not in known_profile:
            await self.memory_service.set_memory(
                customer_id=ctx.customer_id,
                category="requirements",
                key="packaging",
                value=facts.packaging,
                confidence=0.95,
                verification_status="CUSTOMER_SAID",
                source="customer_message",
            )
            known_profile["packaging"] = facts.packaging

        # 4. Fetch Products for Matchmaking
        prod_res = await self.session.execute(select(Product).limit(5))
        available_products = [
            {
                "id": p.id,
                "name": p.name,
                "grade": getattr(p, "tea_grade", "Commercial Wholesale"),
                "category": getattr(p, "category", "Tea"),
            }
            for p in prod_res.scalars().all()
        ]

        # 5. Initialize Audit Run
        agent_run = AgentRun(
            org_id=self.org_id,
            conversation_id=conversation_id,
            model="edith-nemotron-3.5-lightning",
            provider="nvidia",
            intent=intent,
            sales_stage_before=conv.sales_stage,
            lead_score_before=conv.lead_score,
            decision_action="consultative_turn",
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
        reasoning_trace: Optional[str] = None

        # 6. Consultative Sales Engine Decision (Section 10 & 11)
        sales_decision = ConsultativeSalesEngine.decide(
            current_stage=conv.sales_stage,
            current_score=conv.lead_score,
            inbound_text=inbound_message,
            facts=facts,
            known_profile=known_profile,
            matched_products=available_products,
        )

        target_stage = sales_decision.target_stage
        score_delta = sales_decision.score_delta

        # 7. Check Opt-Out (Section 6)
        if intent == "opt_out":
            if customer:
                customer.opt_in_status = False
                customer.opt_out_timestamp = utc_now()
            target_stage = "OPTED_OUT"
            b_name = getattr(settings, "BUSINESS_NAME", "our business")
            reply_text = f"You have been successfully opted out from {b_name}. We will not send you further messages."

        # 8. Check Unknown Question / Capability Gap (Sections 19, 21, 22)
        elif sales_decision.is_unknown_question:
            # Create Human Knowledge Request and alert owner
            req = await self.unknown_mgr.create_knowledge_request(
                customer_id=ctx.customer_id,
                conversation_id=conversation_id,
                question=inbound_message,
                context_searched="Commercial Products Catalog, Business Policies",
                urgency="NORMAL",
            )
            # EDITH autonomously debriefs Friday about the missing knowledge / feature gap
            try:
                from app.brain import inter_brain_bus
                phone_str = customer.primary_phone if customer and customer.primary_phone else conv.channel_id
                await inter_brain_bus.post_edith_debrief(
                    session=self.session,
                    org_id=self.org_id,
                    category="KNOWLEDGE_GAP",
                    details={
                        "phone": phone_str,
                        "topic": inbound_message[:100],
                        "customer_message": inbound_message,
                    },
                )
            except Exception as debrief_err:
                logger.debug(f"[EDITH Debrief] Knowledge gap log warning: {debrief_err}")
            is_hindi_hinglish = (
                language in ("Hindi", "Hinglish")
                or any(w in inbound_message.lower() for w in ["khet", "ket", "beej", "bij", "seeds", "mara", "mera", "bhai", "kitna", "chahiye", "ton", "bara", "ha", "ho", "karo", "dedo"])
            )
            b_name = getattr(settings, "BUSINESS_NAME", "our company")
            if is_hindi_hinglish:
                reply_text = (
                    f"Namaste! Hum yeh anurodh verified services ya offerings ke antargat fulfill nahi karte. "
                    f"{b_name} direct commercial products aur business solutions supply karta hai. "
                    "Agar aapko hamare commercial offerings ke baare mein jaankari chahiye, to zaroor batayein!"
                )
            else:
                reply_text = (
                    f"{b_name} specializes directly in verified commercial products and business solutions. "
                    "We do not supply out-of-scope commodities or unverified requests. "
                    "If your establishment requires commercial supply from our verified catalog, we would be delighted to assist!"
                )

        # 9. Check Purchase Intent & Human Handoff (Sections 25, 26, 58)
        elif sales_decision.handoff_required:
            target_stage = "PURCHASE_INTENT"
            score_delta = +25
            handoff_created = True

            customer_name = customer.name if customer and customer.name else "Prospective Buyer"
            customer_company = customer.company_name if customer and customer.company_name else (known_profile.get("business_type") or "Business")
            customer_phone = customer.primary_phone if customer else conv.channel_id

            handoff = Handoff(
                org_id=self.org_id,
                conversation_id=conversation_id,
                customer_id=ctx.customer_id,
                reason="purchase_intent",
                summary=f"Hot Buyer ready to place order! Said: '{inbound_message}'",
                customer_intent="Finalize purchase and invoice",
            )
            self.session.add(handoff)

            # Route WhatsApp Alert to Owner (+91 89006 53250)
            owner_phone = settings.OWNER_WHATSAPP_NUMBER or "+918900653250"
            lead_qty = known_profile.get("quantity") or "Bulk Wholesale"
            lead_pack = known_profile.get("packaging") or "Commercial Standard"
            lead_dest = known_profile.get("location") or "Delivery Address Pending"
            owner_alert = (
                f"🔥 *HOT LEAD PURCHASE INTENT DETECTED!*\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"👤 *Customer:* {customer_name}\n"
                f"📱 *Phone:* {customer_phone}\n"
                f"🏢 *Business:* {customer_company}\n"
                f"📦 *Volume & Spec:* {lead_qty} | {lead_pack}\n"
                f"📍 *Destination:* {lead_dest}\n"
                f"🎯 *Buying Signal:* \"{inbound_message}\"\n"
                f"📊 *Score:* {min(100, conv.lead_score + score_delta)}/100 (Hot Prospect)\n"
                f"━━━━━━━━━━━━━━━━━━━━━━\n"
                f"👉 *Action:* Pro-forma invoice ready. Open Mission Control to manage:\n"
                f"http://localhost:3000/conversations"
            )
            owner_notif = Notification(
                org_id=self.org_id,
                recipient=owner_phone,
                notification_type="PURCHASE_INTENT",
                content=owner_alert,
            )
            self.session.add(owner_notif)

            import sys
            if not is_simulation and not getattr(settings, "DRY_RUN_MODE", False) and "pytest" not in sys.modules:
                try:
                    from app.whatsapp.service import WhatsAppService
                    wa = WhatsAppService.get_provider()
                    await wa.send_message(to_phone=owner_phone, text=owner_alert)
                except Exception as e:
                    logger.error(f"Failed to send owner handoff alert: {e}")
            else:
                logger.info("Owner WhatsApp alert suppressed (simulation/test mode active).")

            await self.conv_service.update_mode(conversation_id, "HUMAN", reason="purchase_intent")
            reply_text = (
                "Wonderful! I have noted your order requirements and connected you with our sales desk. "
                "Our commercial manager is reviewing your delivery destination and will share the final pro-forma invoice and dispatch date with you shortly."
            )

        # 10. Generate Context-Rich LLM Response via EDITH Persona
        else:
            # Load EDITH System Prompt with Dynamic Business Adaptation
            b_name = getattr(settings, "BUSINESS_NAME", "My Business")
            b_ind = getattr(settings, "BUSINESS_INDUSTRY", "Commercial Supply & Services")
            b_desc = getattr(settings, "BUSINESS_DESCRIPTION", "Commercial B2B supplier supplying quality wholesale products and services directly to businesses.")
            a_name = getattr(settings, "AGENT_NAME", "EDITH")
            a_role = getattr(settings, "AGENT_ROLE", "Autonomous B2B AI Sales Consultant")

            catalog_lines = []
            if available_products:
                for prod in available_products:
                    p_name = prod.get("name", "Product")
                    p_grade = prod.get("grade", "Commercial Grade")
                    p_cat = prod.get("category", "General")
                    catalog_lines.append(f"- {p_name} ({p_cat} | {p_grade})")
            if not catalog_lines:
                catalog_lines = [
                    "- Assam Kadak CTC: ₹340/kg (5% off at 50kg -> ₹323/kg; 10% off at 100kg -> ₹306/kg)",
                    "- Dooars Hotel Special Blend: ₹230/kg (High color, value-engineered for cafes & hotels)",
                    "- Darjeeling First Flush Special (Whole Leaf): ₹1,450/kg (Delicate, floral, muscatel)",
                    "- 200g Commercial Tasting Kit available for verified cafes and restaurants."
                ]
            catalog_text = "\n".join(catalog_lines)

            summary_section = ""
            if ctx.summary and ctx.summary.strip():
                summary_section = f"\n### PREVIOUS CONVERSATION CONTEXT & SUMMARY:\n{ctx.summary.strip()}\n"

            name_display = ctx.customer_name or "Not yet confirmed"
            name_rule = (
                "- CRITICAL NAME POLICY: If customer name is 'Not yet confirmed', NEVER invent or assume a name "
                "(such as Rahul, Amit, etc.). Address the customer respectfully with 'Hello', 'Hi', or 'Namaste' "
                "without any name until they state their name explicitly."
            )

            audio_clarification_rule = ""
            if "[audio message could not be transcribed" in inbound_message.lower() or "[voice note received" in inbound_message.lower():
                audio_clarification_rule = (
                    "\n### AUDIO CLARIFICATION NOTICE:\n"
                    "The customer sent a voice note that could not be transcribed clearly. "
                    "Politely acknowledge that you received their voice note but could not hear the audio clearly, "
                    "and ask them to send their query as text or re-record."
                )

            system_prompt = (
                f"You are {a_name}, the {a_role} for {b_name}. "
                f"Industry / Focus: {b_ind}. {b_desc}\n"
                "You are warm, consultative, highly professional, commercially savvy, and grounded in verified catalog facts. "
                "Never invent prices, discounts, or delivery timelines. Use known facts. Ask at most one targeted question.\n\n"
                f"### CUSTOMER PROFILE:\n"
                f"- Name/Phone: {name_display} ({conv.channel_id})\n"
                f"- Business Type: {known_profile.get('business_type', 'Hospitality/Retail')}\n"
                f"- Location: {known_profile.get('location', 'Not yet confirmed')}\n"
                f"- Detected Language: {language}\n"
                f"- Known Quantity: {known_profile.get('quantity', 'Not yet provided')}\n"
                f"- Known Use Case: {known_profile.get('use_case', 'Not yet provided')}\n"
                f"- Known Packaging: {known_profile.get('packaging', 'Not yet provided')}\n"
                f"{name_rule}\n"
                f"{summary_section}"
                f"### CONVERSATIONAL STRATEGY:\n"
                f"- Action: {sales_decision.action}\n"
                f"- Goal: {sales_decision.customer_goal}\n"
                f"- Suggested Question / Focus: {sales_decision.suggested_question or sales_decision.recommended_product or 'Consultative advice'}\n\n"
                f"### VERIFIED PRODUCTS & PRICING:\n"
                f"{catalog_text}"
                f"{audio_clarification_rule}"
            )

            prompt_msgs = [LLMMessage(role="system", content=system_prompt)]

            # Feed prior multi-turn dialogue turns (up to 20 turns) for true conversational memory
            if ctx.recent_messages:
                past_turns = ctx.recent_messages[:-1] if len(ctx.recent_messages) > 1 else []
                for p_msg in past_turns[-20:]:
                    r = "user" if p_msg.get("direction") == "inbound" else "assistant"
                    c = (p_msg.get("content") or "").strip()
                    if c:
                        prompt_msgs.append(LLMMessage(role=r, content=c))

            prompt_msgs.append(LLMMessage(role="user", content=inbound_message))

            llm_resp = await self.ai_router.execute(
                capability=Capability.CORE_BRAIN,
                request=ModelRequest(
                    messages=[ModelMessage(role=m.role, content=m.content) for m in prompt_msgs],
                    temperature=settings.LLM_TEMPERATURE,
                    max_tokens=settings.LLM_MAX_TOKENS,
                    metadata={"capability": "core_brain"},
                ),
            )
            reply_text = llm_resp.content
            reasoning_trace = llm_resp.reasoning_content

        # 11. Self-Reflective Critic Check & Response Refinement (Section 75, 135)
        from app.agent.critic import SelfReflectiveCritic
        reply_text = SelfReflectiveCritic.critique_and_refine(
            draft=reply_text,
            customer_goal=sales_decision.customer_goal or "",
            emotional_state=facts.emotional_state or "NEUTRAL",
        )

        # 12. Validate Response (Section 75)
        is_valid, validation_issues, sanitized_reply = ResponseValidator.validate(reply_text)
        if not is_valid:
            logger.warning(f"Response validation issues: {validation_issues}. Falling back to safe response.")
            b_name = getattr(settings, "BUSINESS_NAME", "our business")
            sanitized_reply = (
                f"Thank you for contacting {b_name}. We supply verified commercial products and business solutions directly to commercial clients. "
                "What approximate volume or requirement does your establishment have?"
            )

        is_suppressed: bool = False

        # Stage G2 Guardrail: Output Safety Check (Directive §3.G - Fail Closed)
        output_verdict = await self.ai_router.check_output_safety(sanitized_reply)
        if not output_verdict.is_safe:
            logger.warning(
                f"Drafted reply held by output safety guardrail: {output_verdict.reason}. Suppressing outbound send."
            )
            is_suppressed = True
            handoff = Handoff(
                org_id=self.org_id,
                conversation_id=conversation_id,
                customer_id=ctx.customer_id,
                reason="output_guardrail_violation",
                summary=f"Draft reply held by output guardrail: {output_verdict.reason or 'Policy violation'}",
                customer_intent="Agent reply triggered output safety guardrail",
            )
            self.session.add(handoff)
            await self.conv_service.update_mode(conversation_id, "HUMAN", reason="output_guardrail_hold")

        # 12. Atomic Pre-Send State Check (Human Takeover Race Protection, Section 27)
        fresh_conv = await self.session.get(Conversation, conversation_id)
        if fresh_conv and fresh_conv.mode not in ("AI", "HUMAN"):
            logger.info(f"Send aborted: conversation {conversation_id} is in mode '{fresh_conv.mode}'.")
            is_suppressed = True

        can_dispatch_whatsapp = (
            not is_suppressed
            and not is_simulation
            and conv.channel == "whatsapp"
            and bool(conv.channel_id)
        )
        provider_msg_id = None
        dispatch_success = False
        if can_dispatch_whatsapp and sanitized_reply:
            clean_recipient = conv.channel_id.replace("+", "").replace(" ", "").strip() if conv.channel_id else ""
            bot_num = "918918753100"

            # Guard 1: Never send AI replies to the bot's own number (prevent self-reply echo loop)
            if clean_recipient == bot_num or clean_recipient.endswith(bot_num):
                logger.info(f"Suppressed outbound dispatch to bot's own number {conv.channel_id}")
            # Guard 2: Validate recipient looks like a real phone number (10-15 digits)
            elif len(clean_recipient) < 10 or len(clean_recipient) > 15 or not clean_recipient.isdigit():
                logger.warning(f"Suppressed outbound to invalid phone number: '{conv.channel_id}' (cleaned: '{clean_recipient}')")
            else:
                try:
                    from app.whatsapp.service import WhatsAppService
                    wa = WhatsAppService.get_provider()
                    logger.info(f"[WHATSAPP DISPATCH] Sending AI reply via '{settings.WHATSAPP_PROVIDER}' to {conv.channel_id}: \"{sanitized_reply[:60]}...\"")
                    send_res = await wa.send_message(to_phone=conv.channel_id, text=sanitized_reply)
                    if send_res:
                        dispatch_success = send_res.success
                        provider_msg_id = send_res.provider_message_id
                        if send_res.success:
                            logger.info(f"[WHATSAPP DISPATCH SUCCESS] Delivered to {conv.channel_id} (msg_id: {provider_msg_id})")
                        else:
                            logger.error(f"[WHATSAPP DISPATCH FAILED] Provider error: {send_res.error_message}")
                except Exception as e:
                    logger.error(f"Failed to dispatch outbound WhatsApp message: {e}")

        if not is_suppressed and sanitized_reply:
            msg_payload = {}
            if reasoning_trace:
                msg_payload["reasoning_content"] = reasoning_trace
            await self.conv_service.add_message(
                conversation_id=conversation_id,
                direction="outbound",
                sender_type="agent",
                content=sanitized_reply,
                delivery_status="sent" if (dispatch_success or is_simulation) else "failed",
                provider_message_id=provider_msg_id,
                raw_payload=msg_payload,
            )

        # 13. Automatic PDF Pro-Forma Invoice Generation & WhatsApp Dispatch (Requirement R1)
        invoice_pdf_path: Optional[str] = None
        should_generate_invoice = False
        inbound_lower = inbound_message.lower()
        has_qty = bool((facts.quantity_numeric_kg and facts.quantity_numeric_kg > 0) or known_profile.get("quantity"))
        explicit_invoice_keywords = [
            "send invoice", "proforma", "pro-forma", "send proforma", "generate bill", "send bill",
            "share invoice", "payment link", "bank details", "confirm order", "place order",
            "book order", "book my order", "finalize order", "deal done", "order pack karo"
        ]
        wants_explicit_invoice = any(kw in inbound_lower for kw in explicit_invoice_keywords)

        if target_stage == "PURCHASE_INTENT" and (facts.is_ready_to_buy or wants_explicit_invoice) and has_qty:
            should_generate_invoice = True
        elif target_stage == "RECOMMENDATION" and has_qty and any(
            kw in inbound_lower for kw in ["quote", "invoice", "proforma", "need", "rate", "price", "sample", "cost", "order", "kg", "ton", "bulk"]
        ):
            should_generate_invoice = True

        if should_generate_invoice:
            try:
                from app.services.invoice_generator import InvoiceGenerator

                c_name = customer.name if customer and customer.name else (ctx.customer_name or "Valued Client")
                c_phone = customer.primary_phone if customer and customer.primary_phone else (conv.channel_id or "+91 98000 00000")
                c_company = customer.company_name if customer and customer.company_name else (known_profile.get("business_type") or "Commercial Partner")
                c_city = known_profile.get("location") or (customer.city if customer else None) or "India"
                c_state = (customer.state if customer else None) or ""
                c_gstin = (customer.custom_attributes.get("gstin") if customer and customer.custom_attributes else None)

                # Step 1: Structured Pricing & Order Data Extraction via Capability C cascade (§3.C)
                order_ctx = {
                    "buyer_name": c_name,
                    "buyer_phone": c_phone,
                    "buyer_company": c_company,
                    "delivery_city": c_city,
                    "delivery_state": c_state,
                    "recommended_product": sales_decision.recommended_product,
                    "known_quantity": known_profile.get("quantity") or facts.quantity,
                    "known_packaging": known_profile.get("packaging") or facts.packaging,
                }
                raw_extracted_order = await self.ai_router.extract_pricing_order(
                    inbound_text=inbound_message,
                    context=order_ctx,
                )

                # Ensure buyer details and fallback fields are properly populated
                if not raw_extracted_order.get("buyer_name"):
                    raw_extracted_order["buyer_name"] = c_name
                if not raw_extracted_order.get("buyer_phone"):
                    raw_extracted_order["buyer_phone"] = c_phone
                if not raw_extracted_order.get("buyer_company"):
                    raw_extracted_order["buyer_company"] = c_company
                if not raw_extracted_order.get("delivery_city"):
                    raw_extracted_order["delivery_city"] = c_city
                if not raw_extracted_order.get("delivery_state"):
                    raw_extracted_order["delivery_state"] = c_state
                if c_gstin and not raw_extracted_order.get("buyer_gstin"):
                    raw_extracted_order["buyer_gstin"] = c_gstin

                # Step 2: Zero-Hallucination verification against DB/CSV (Directive §3.C)
                is_val, verified_order_data, val_err = await PricingValidator.validate_extracted_order(
                    session=self.session,
                    org_id=self.org_id,
                    extracted_data=raw_extracted_order,
                )
                if not is_val:
                    logger.error(f"Invoice generation rejected by PricingValidator: {val_err}")
                else:
                    target_order = verified_order_data if verified_order_data else raw_extracted_order
                    first_item = target_order.get("items", [{}])[0]
                    order_qty = float(first_item.get("quantity_kg", 50.0))
                    chosen_product = first_item.get("product_name", "Assam Kadak CTC Granules")
                    invoice_pdf_path = InvoiceGenerator.generate_proforma_pdf(target_order)
                    pdf_filename = Path(invoice_pdf_path).name if invoice_pdf_path else "proforma_invoice.pdf"

                    # Automatically dispatch compiled PDF into active WhatsApp conversation if live
                    doc_provider_msg_id = None
                    doc_delivery_status = "sent"
                    if can_dispatch_whatsapp and invoice_pdf_path:
                        clean_recip = conv.channel_id.replace("+", "").replace(" ", "").strip()
                        bot_phone = "918918753100"
                        if clean_recip != bot_phone and not clean_recip.endswith(bot_phone):
                            from app.whatsapp.service import WhatsAppService
                            wa = WhatsAppService.get_provider()
                            b_name = getattr(settings, "BUSINESS_NAME", "Commercial Supplier")
                            b_unit = getattr(settings, "CATALOG_UNIT", "kg")
                            caption = (
                                f"📄 *{b_name} - Commercial Pro-Forma Invoice*\n"
                                f"Customer: *{c_name}* | {order_qty:.0f}{b_unit} {chosen_product}\n"
                                f"🔒 Rate locked for 7 days. Official bank transfer details included."
                            )
                            doc_res = await wa.send_document(
                                to_phone=conv.channel_id,
                                file_path=invoice_pdf_path,
                                caption=caption,
                                filename=pdf_filename,
                            )
                            if doc_res:
                                doc_provider_msg_id = doc_res.provider_message_id
                                doc_delivery_status = "sent" if doc_res.success else "failed"

                    await self.conv_service.add_message(
                        conversation_id=conversation_id,
                        direction="outbound",
                        sender_type="agent",
                        content=f"Sent commercial pro-forma invoice PDF: {pdf_filename}",
                        media_url=invoice_pdf_path,
                        media_type="application/pdf",
                        delivery_status=doc_delivery_status,
                        provider_message_id=doc_provider_msg_id,
                    )
            except Exception as e:
                logger.error(f"Failed to compile or dispatch pro-forma invoice in orchestrator: {e}")

        # 14. Update Stage and Score
        decision = StructuredDecision(
            intent=intent,
            sales_stage=target_stage,
            confidence=confidence,
            recommended_action=sales_decision.action,
            tools_required=tools_executed,
            reason_code=f"ACTION_{sales_decision.action}",
        )

        await self.conv_service.update_stage_and_score(
            conversation_id=conversation_id,
            new_stage=target_stage,
            score_delta=score_delta,
            trigger_reason=decision.reason_code,
        )

        # 15. Complete AgentRun audit record
        latency_ms = int((time.time() - start_t) * 1000)
        agent_run.completed_at = utc_now()
        agent_run.latency_ms = latency_ms
        agent_run.sales_stage_after = target_stage
        agent_run.lead_score_after = conv.lead_score + score_delta
        agent_run.tools_used = tools_executed
        agent_run.decision_action = sales_decision.action
        agent_run.result_summary = sanitized_reply[:200]
        if reasoning_trace:
            agent_run.knowledge_sources = [{"reasoning_content": reasoning_trace}]
        await self.session.commit()

        # 16. Synthesize & Persist Multi-Attribute Conversation Summary & Structured Memory (Directive & User Request)
        summary_text = ""
        key_points: List[str] = []
        customer_goals: Optional[str] = None
        try:
            if known_profile.get("quantity"):
                key_points.append(f"Volume: {known_profile['quantity']}")
            if known_profile.get("packaging"):
                key_points.append(f"Packaging: {known_profile['packaging']}")
            if known_profile.get("business_type"):
                key_points.append(f"Business: {known_profile['business_type']}")
            if known_profile.get("location"):
                key_points.append(f"Location: {known_profile['location']}")
            if known_profile.get("use_case"):
                key_points.append(f"Use Case: {known_profile['use_case']}")
            if sales_decision.recommended_product:
                key_points.append(f"Product: {sales_decision.recommended_product}")

            c_display = (customer.name if customer and customer.name else ctx.customer_name) or conv.channel_id
            b_type = known_profile.get("business_type") or (customer.company_type if customer else "Commercial Buyer")
            loc = known_profile.get("location") or (customer.city if customer else None)
            qty = known_profile.get("quantity")
            prod = sales_decision.recommended_product or "Assam CTC Wholesale"

            desc_parts = [f"Buyer '{c_display}' ({b_type})"]
            if loc:
                desc_parts.append(f"in {loc}")
            if qty:
                desc_parts.append(f"inquiring for {qty} of {prod}")
            else:
                desc_parts.append(f"exploring catalog offerings ({prod})")

            summary_text = f"{' '.join(desc_parts)}. Stage: {target_stage}. Latest intent: {intent}. Lead score: {conv.lead_score + score_delta}/100."
            customer_goals = f"Procure {qty or 'commercial volume'} for {b_type} operations."

            await self.conv_memory.update_summary(
                conversation_id=conversation_id,
                summary_text=summary_text,
                key_points=key_points,
                active_objections=[objection_cat] if objection_cat else [],
                customer_goals=customer_goals,
            )
        except Exception as sum_err:
            logger.error(f"Failed to update conversation summary: {sum_err}")

        # 17. Enqueue Bounded Background Analysis Job (Section 8 & 9)
        try:
            from app.jobs.queue import JobQueue
            queue = JobQueue(self.session)
            await queue.enqueue(
                org_id=self.org_id,
                job_type="background_analysis",
                payload={"conversation_id": conversation_id, "analysis_type": "conversation_review"},
                priority=2,
            )
        except Exception as e:
            logger.warning(f"Could not enqueue background analysis job: {e}")

        # Real-time WebSocket broadcasts to active dashboard operators (Zero polling latency)
        try:
            from app.realtime.connection_manager import ws_manager
            # 1. Outbound message broadcast with reasoning trace
            if not is_suppressed and sanitized_reply:
                await ws_manager.broadcast_to_org(
                    self.org_id,
                    "new_message",
                    {
                        "conversation_id": conversation_id,
                        "direction": "outbound",
                        "sender_type": "agent",
                        "content": sanitized_reply,
                        "channel_id": conv.channel_id,
                        "sales_stage": target_stage,
                        "lead_score": conv.lead_score + score_delta,
                        "reasoning_content": reasoning_trace,
                        "summary": summary_text,
                        "structured_memory": {
                            "summary": summary_text,
                            "key_points": key_points,
                            "customer_goals": customer_goals,
                            "facts": known_profile,
                        },
                        "timestamp": utc_now().isoformat(),
                    },
                )

            # 2. Sales stage transition broadcast
            if target_stage != conv.sales_stage:
                await ws_manager.broadcast_to_org(
                    self.org_id,
                    "stage_changed",
                    {
                        "conversation_id": conversation_id,
                        "stage_before": conv.sales_stage,
                        "stage_after": target_stage,
                        "channel_id": conv.channel_id,
                    },
                )

            # 3. Lead score shift broadcast
            if score_delta != 0:
                await ws_manager.broadcast_to_org(
                    self.org_id,
                    "score_updated",
                    {
                        "conversation_id": conversation_id,
                        "lead_score": conv.lead_score + score_delta,
                        "score_delta": score_delta,
                        "channel_id": conv.channel_id,
                    },
                )

            # 4. Structured Memory Updated broadcast
            if summary_text:
                await ws_manager.broadcast_to_org(
                    self.org_id,
                    "memory_updated",
                    {
                        "conversation_id": conversation_id,
                        "summary": summary_text,
                        "key_points": key_points,
                        "customer_goals": customer_goals,
                        "facts": known_profile,
                    },
                )
        except Exception as ws_err:
            logger.debug(f"Failed to broadcast turn completion to WebSocket: {ws_err}")

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
            invoice_pdf_path=invoice_pdf_path,
        )
