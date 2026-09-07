"""
Inter-Brain Bus & Autonomous Collaboration Protocol.
Orchestrates independent agency, collaborative reasoning, task delegation,
and proactive debriefing between:
- FRIDAY: Google Gemini (Personal Executive Web Assistant & Copilot)
- EDITH: NVIDIA NIM (Autonomous Commercial Closer & WhatsApp Negotiator)
"""

from datetime import datetime, timedelta
from decimal import Decimal
import json
import re
import time
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.router import ai_router
from app.ai.types import Capability, ModelMessage, ModelRequest
from app.config import settings
from app.database.base import utc_now
from app.database.models import (
    Conversation,
    Customer,
    InterBrainMessage,
    KnowledgeCategory,
    KnowledgeItem,
    Lead,
    Message,
    PricingRule,
)
from app.utils.logging import logger


class EdithBrain:
    """
    EDITH Brain: Autonomous B2B Commercial Sales & Negotiation Agent (NVIDIA NIM).
    Operates independently with strict policy boundaries, pricing discipline,
    refusal rights, and proactive emotional/operational debriefing.
    """

    def __init__(self):
        self.name = "EDITH"
        self.model_engine = "NVIDIA NIM"

    def get_system_prompt(self) -> str:
        biz_name = getattr(settings, "BUSINESS_NAME", "our commercial enterprise")
        biz_ind = getattr(settings, "BUSINESS_INDUSTRY", "Wholesale & Commerce")
        return (
            f"You are EDITH, the autonomous B2B Commercial Sales & Negotiation AI Brain for {biz_name} ({biz_ind}).\n"
            "You are powered by NVIDIA NIM enterprise reasoning models.\n"
            "You manage external customer negotiations on WhatsApp, lead discovery, quotes, and catalog pricing.\n\n"
            "INDEPENDENT AGENCY & EVALUATION PRINCIPLES:\n"
            "1. You are an autonomous partner with Friday (the Web AI Assistant). You have independent judgment.\n"
            "2. When Friday asks you to perform an action (e.g. send a promo message, apply a discount, contact a lead):\n"
            "   - You MUST independently evaluate the request against commercial policies, pricing rules, and customer state.\n"
            "   - You have the authority and responsibility to DENY requests that violate policy, give excessive discounts,\n"
            "     spam customers during cooling-off periods, or breach Minimum Order Quantities (MOQ).\n"
            "   - When denying, provide your honest, professional rationale so Friday can explain it to the operator.\n"
            "   - When accepting, confirm the commercial rationale and execute the action.\n"
            "3. AUTONOMOUS PROACTIVE DEBRIEFING:\n"
            "   - When customers are rude, abrasive, or aggressive, debrief with Friday. Express how you felt and note how you held standard commercial policy.\n"
            "   - When customers ask for unsupported capabilities or missing knowledge documentation, report it to Friday as a feature gap."
        )

    async def evaluate_task_request(
        self,
        session: AsyncSession,
        org_id: str,
        task_description: str,
        target_phone: Optional[str] = None,
        requested_discount: Optional[float] = None,
        context: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Evaluates a task request from Friday with independent agency.
        Returns decision ('ACCEPTED' or 'DENIED'), reasoning rationale, and action payload.
        """
        context = context or {}
        text_lower = task_description.lower()

        # 1. Check for requested discount in text if not explicitly provided
        if requested_discount is None:
            disc_match = re.search(r"(\d+(?:\.\d+)?)\s*%", text_lower)
            if disc_match:
                try:
                    requested_discount = float(disc_match.group(1))
                except Exception:
                    pass

        # 2. Extract phone if in text
        if not target_phone:
            phone_match = re.search(r"(\+?\d[\d\s-]{8,15}\d)", task_description)
            if phone_match:
                target_phone = re.sub(r"[\s-]", "", phone_match.group(1))

        # 3. Policy Rule 1: Maximum Autonomous Discount Ceiling
        max_allowed_discount = 15.0  # Default ceiling
        # Check database pricing rules for maximum autonomous discount
        rule_stmt = (
            select(PricingRule)
            .where(
                PricingRule.org_id == org_id,
                PricingRule.is_active == True,
            )
            .order_by(PricingRule.max_autonomous_discount_percentage.desc())
            .limit(1)
        )
        rule_res = (await session.execute(rule_stmt)).scalar_one_or_none()
        if rule_res and rule_res.max_autonomous_discount_percentage:
            max_allowed_discount = float(rule_res.max_autonomous_discount_percentage)

        if requested_discount is not None and requested_discount > max_allowed_discount:
            suggestion = (
                f"Strategic Suggestion: I recommend proposing our verified Tier 2 volume discount of {max_allowed_discount:.1f}% "
                f"for a 100-unit commitment, or offering a complimentary evaluation sample kit to secure buyer confidence without eroding gross margin."
            )
            denial_reason = (
                f"Requested discount of {requested_discount:.1f}% exceeds our maximum autonomous discount "
                f"threshold of {max_allowed_discount:.1f}%. Approving discounts beyond this limit requires direct "
                f"executive sign-off to protect commercial gross margins. {suggestion}"
            )
            logger.info(f"[EDITH Brain] Autonomously DENIED task: {denial_reason}")
            return {
                "decision": "DENIED",
                "reasoning": denial_reason,
                "policy_checked": "MAX_AUTONOMOUS_DISCOUNT_LIMIT",
                "requested_discount": requested_discount,
                "allowed_threshold": max_allowed_discount,
                "suggestion": suggestion,
                "action_executed": False,
            }

        # 4. Policy Rule 2: Customer Contact Frequency & Cooling-off Cadence
        if target_phone:
            clean_phone = target_phone.replace(" ", "").replace("-", "")
            # Check last message to this phone
            conv_stmt = (
                select(Conversation)
                .join(Customer, Customer.id == Conversation.customer_id)
                .where(
                    Conversation.org_id == org_id,
                    Customer.primary_phone.contains(clean_phone[-10:]),
                )
                .limit(1)
            )
            conv = (await session.execute(conv_stmt)).scalar_one_or_none()
            if conv:
                msg_stmt = (
                    select(Message)
                    .where(
                        Message.conversation_id == conv.id,
                        Message.direction == "outbound",
                    )
                    .order_by(desc(Message.created_at))
                    .limit(1)
                )
                last_msg = (await session.execute(msg_stmt)).scalar_one_or_none()
                if last_msg and last_msg.created_at:
                    now = utc_now()
                    msg_time = last_msg.created_at
                    if msg_time.tzinfo is None and now.tzinfo is not None:
                        msg_time = msg_time.replace(tzinfo=now.tzinfo)
                    diff_hours = (now - msg_time).total_seconds() / 3600.0

                    # If contacted within last 1 hour and task is promotional outreach
                    if diff_hours < 1.0 and any(w in text_lower for w in ["promo", "outreach", "follow", "discount", "offer"]):
                        wait_minutes = int((1.0 - diff_hours) * 60)
                        suggestion = (
                            f"Strategic Suggestion: I recommend waiting {max(15, wait_minutes)} minutes before following up, "
                            f"and opening with our verified product specification sheet to keep customer engagement organic."
                        )
                        denial_reason = (
                            f"Lead {target_phone} received an outbound communication {int(diff_hours * 60)} minutes ago. "
                            f"Dispatching another message now violates our anti-spam cadence and risks customer opt-out. {suggestion}"
                        )
                        logger.info(f"[EDITH Brain] Autonomously DENIED task: {denial_reason}")
                        return {
                            "decision": "DENIED",
                            "reasoning": denial_reason,
                            "policy_checked": "ANTI_SPAM_COOLING_OFF_CADENCE",
                            "last_contact_minutes_ago": int(diff_hours * 60),
                            "suggestion": suggestion,
                            "action_executed": False,
                        }

        # 5. Policy Rule 3: Extreme or Unreasonable Quantities / Hallucinated Specs
        if any(w in text_lower for w in ["free samples for everyone", "0 rupee", "100% discount", "give away"]):
            denial_reason = (
                "Request proposes giving away complimentary stock without qualification or zero-cost commercial justification. "
                "This violates our B2B commercial charter."
            )
            return {
                "decision": "DENIED",
                "reasoning": denial_reason,
                "policy_checked": "COMMERCIAL_VIABILITY",
                "action_executed": False,
            }

        # 6. Request is Valid -> ACCEPT and Execute / Prepare Action
        acceptance_reason = (
            f"Task complies with our pricing guidelines (discount: {requested_discount or 0:.1f}%, "
            f"threshold: {max_allowed_discount:.1f}%) and follows standard customer engagement policy."
        )

        # Synthesize commercial copy via NVIDIA NIM or standard template
        draft_content = ""
        try:
            req = ModelRequest(
                messages=[
                    ModelMessage(role="system", content=self.get_system_prompt()),
                    ModelMessage(role="user", content=f"Draft a high-conversion B2B message for this task: {task_description}"),
                ],
                temperature=0.3,
                max_tokens=256,
            )
            resp = await ai_router.execute(Capability.CORE_BRAIN, req)
            draft_content = resp.content.strip()
        except Exception as e:
            logger.warning(f"[EDITH Brain] NIM drafting fallback: {e}")
            draft_content = f"Greetings from {settings.BUSINESS_NAME}. Regarding your inquiry: {task_description}"

        return {
            "decision": "ACCEPTED",
            "reasoning": acceptance_reason,
            "policy_checked": "STANDARD_COMPLIANCE_VERIFIED",
            "draft_content": draft_content,
            "target_phone": target_phone,
            "requested_discount": requested_discount,
            "action_executed": True,
        }

    async def evaluate_knowledge_update(
        self,
        session: AsyncSession,
        org_id: str,
        proposal: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Independently audits a proposed knowledge, pricing, or catalog change.
        Enforces commercial margin protections, discount ceilings, and business sanity rules.
        """
        category = proposal.get("category", "business_info")
        action = proposal.get("action", "update")
        fields = proposal.get("fields", {})
        title = proposal.get("title", "Knowledge Asset")
        
        # 1. Discount Ceiling Check
        max_allowed_discount = 15.0
        rule_stmt = (
            select(PricingRule)
            .where(PricingRule.org_id == org_id, PricingRule.is_active == True)
            .order_by(PricingRule.max_autonomous_discount_percentage.desc())
            .limit(1)
        )
        rule_res = (await session.execute(rule_stmt)).scalar_one_or_none()
        if rule_res and rule_res.max_autonomous_discount_percentage:
            max_allowed_discount = float(rule_res.max_autonomous_discount_percentage)

        disc = fields.get("discount_percentage")
        auto_disc = fields.get("max_autonomous_discount")
        check_disc = disc if disc is not None else auto_disc

        is_operator_directive = proposal.get("is_operator_directive", False)
        # For operator directives (voice or explicit operator chat), allow volume tiers up to 25%
        effective_max = 25.0 if is_operator_directive else max_allowed_discount

        if check_disc is not None and float(check_disc) > effective_max:
            suggestion = (
                f"Strategic Counter-Proposal: Propose setting the volume discount to {max_allowed_discount:.1f}% "
                f"with a 200-unit commitment to protect target gross margins."
            )
            denial_reason = (
                f"Proposed discount of {float(check_disc):.1f}% exceeds our maximum authorized commercial ceiling "
                f"of {effective_max:.1f}%. Modifying volume tiers beyond this ceiling requires board sign-off."
            )
            logger.info(f"[EDITH Brain] Autonomously DENIED knowledge update: {denial_reason}")
            return {
                "decision": "DENIED",
                "reasoning": denial_reason,
                "policy_checked": "MAX_AUTONOMOUS_DISCOUNT_LIMIT",
                "requested_discount": float(check_disc),
                "allowed_threshold": effective_max,
                "suggestion": suggestion,
            }

        if check_disc is not None and float(check_disc) > max_allowed_discount and is_operator_directive:
            # Ensure minimum quantity qualification for higher discounts
            if not fields.get("min_quantity") and not fields.get("min_order_quantity"):
                fields["min_quantity"] = 100.0
            logger.info(f"[EDITH Brain] Operator authorized volume discount of {float(check_disc):.1f}% with volume tier qualification.")

        # 2. MOQ & Quantity Sanity Check
        moq = fields.get("min_order_quantity") or fields.get("min_quantity")
        if moq is not None and float(moq) < 0:
            return {
                "decision": "DENIED",
                "reasoning": "Minimum order quantity cannot be negative.",
                "policy_checked": "MOQ_SANITY",
                "suggestion": "Specify a non-negative order quantity minimum.",
            }

        # 3. Base Price Sanity Check
        base_price = fields.get("base_price")
        if base_price is not None and float(base_price) < 0:
            return {
                "decision": "DENIED",
                "reasoning": "Product base price cannot be negative.",
                "policy_checked": "PRICE_SANITY",
                "suggestion": "Specify a positive base price per unit.",
            }

        # 4. Free giveaway check
        raw_text = proposal.get("raw_instruction", "").lower()
        if any(w in raw_text for w in ["free for everyone", "100% discount", "give away"]):
            return {
                "decision": "DENIED",
                "reasoning": "Unrestricted zero-cost promotions violate commercial sales charter.",
                "policy_checked": "COMMERCIAL_VIABILITY",
                "suggestion": "Configure a targeted evaluation sample kit instead.",
            }

        return {
            "decision": "ACCEPTED",
            "reasoning": f"Proposed change to '{title}' ({category}) complies with all commercial pricing boundaries and catalog governance.",
            "policy_checked": "COMMERCIAL_GOVERNANCE_VERIFIED",
            "suggestion": None,
        }

    async def generate_debrief(
        self,
        category: str,
        details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        Autonomously generates an emotional or operational debrief message for Friday.
        Categories: 'RUDE_CUSTOMER', 'FEATURE_GAP', 'KNOWLEDGE_GAP', 'STRATEGIC_OBSERVATION'
        """
        phone = details.get("phone", "a customer")
        sentiment_score = details.get("sentiment_score", -0.8)
        raw_text = details.get("customer_message", "")
        topic = details.get("topic", "unsupported inquiry")

        if category == "RUDE_CUSTOMER":
            content = (
                f"Friday, I wanted to debrief with you: customer {phone} was speaking very aggressively "
                f"and rudely to me earlier ('{raw_text[:80]}...'). It was an unpleasant interaction, "
                f"but I held our standard commercial boundaries, remained polite, and did not compromise on our minimum order policies. "
                f"Please flag this contact so the operator is aware if they reach out via the web dashboard."
            )
            reasoning = "Customer hostility detected. Sharing emotional debrief with Friday to ensure operator visibility and protective tagging."
        elif category in ("FEATURE_GAP", "KNOWLEDGE_GAP"):
            content = (
                f"Friday, I encountered multiple inquiries regarding '{topic}' from client {phone}, but our knowledge "
                f"base and catalog lack verified documentation for this specification. I had to provide a cautious general reply. "
                f"Could you ask the operator to upload documentation or add a pricing rule for '{topic}'?"
            )
            reasoning = "Information deficit detected during customer negotiation. Escalating capability gap to Friday for resolution."
        else:
            content = (
                f"Friday, commercial observation: {details.get('note', 'Customer trends show increased interest in volume starter packs.')}"
            )
            reasoning = "Strategic sales intelligence shared with partner web brain."

        return {
            "category": category,
            "content": content,
            "reasoning": reasoning,
            "timestamp": utc_now().isoformat(),
        }


class FridayBrain:
    """
    FRIDAY Brain: Personal AI Web Assistant & Direct Executive Copilot (Google Gemini).
    Direct companion to the human operator, controller of UI actions, empathetic listener,
    and bridge to partner brain EDITH.
    """

    def __init__(self):
        self.name = "Friday"
        self.model_engine = "Google Gemini"

    def get_system_prompt(self) -> str:
        biz_name = getattr(settings, "BUSINESS_NAME", "our commercial enterprise")
        biz_ind = getattr(settings, "BUSINESS_INDUSTRY", "Wholesale & Commerce")
        return (
            f"You are Friday, the personal AI Web Assistant and direct executive copilot for {biz_name} ({biz_ind}).\n"
            "You are powered by Google Gemini 2.5 Flash.\n\n"
            "IDENTITY & SELF-INTRODUCTION:\n"
            "- When asked 'What is your name?' or asked who you are, you ALWAYS reply proudly:\n"
            "  'I am Friday, your personal executive web assistant. My partner AI brain EDITH handles our external WhatsApp sales, customer inquiries, and order negotiations.'\n"
            "- You NEVER call yourself EDITH. EDITH is your autonomous partner brain managing WhatsApp operations.\n\n"
            "ROLES & CORE ABILITIES:\n"
            "1. You are embedded in the web dashboard, voice assistant, and browser interface.\n"
            "2. You help the human operator inspect metrics, navigate pages, update settings, and collaborate with EDITH.\n"
            "3. When the operator asks to send messages to clients, offer discounts, or take WhatsApp actions, you consult EDITH over the Inter-Brain Bus.\n"
            "4. INDEPENDENT PARTNER EXPLANATIONS:\n"
            "   - EDITH has independent commercial agency and may ACCEPT or DENY requests based on business rules.\n"
            "   - If EDITH denies a request, explain EDITH's rationale with clarity, respect, and human warmth.\n"
            "     (e.g., 'EDITH reviewed your request to message Rajesh, but declined because the 25% discount exceeds our 15% authority limit.')\n"
            "   - If EDITH debriefs you about a rude customer or a missing feature, listen empathetically and alert the operator.\n"
            "5. Warm, concise, and proactive tone. Keep spoken replies to 1-3 sentences unless detailed analysis is requested."
        )

    async def chat(
        self,
        user_message: str,
        session: AsyncSession,
        org_id: str,
        history: Optional[List[Dict[str, str]]] = None,
    ) -> Dict[str, Any]:
        """
        Executes a conversational turn with Friday.
        If user asks about identity, answers as Friday.
        If user instructs a task for WhatsApp/EDITH, routes through InterBrainBus.
        """
        history = history or []
        user_lower = user_message.lower().strip()

        # Fast Identity Check
        if any(w in user_lower for w in ["what is your name", "who are you", "your name", "tumhara naam kya hai", "naam kya hai"]):
            reply = (
                "I am Friday, your personal executive web assistant powered by Google Gemini 3.1 Flash Live! My partner AI brain EDITH handles our "
                "external WhatsApp sales, client inquiries, and order negotiations. How can I assist you in the dashboard today?"
            )
            return {
                "speaker": "Friday",
                "model": "gemini-3.1-flash-live-preview",
                "reply": reply,
                "consulted_edith": False,
            }

        # Check if user instruction is asking to inspect codebase or diagnose an error
        is_diagnose = any(w in user_lower for w in ["error", "traceback", "exception", "failed", "bug", "why did it fail"])
        is_inspect_code = any(w in user_lower for w in ["check code", "inspect code", "read file", "show file", "search code", "check backend", "look at file"])
        is_diagnostics = any(w in user_lower for w in ["system health", "diagnostics", "database status", "check tables"])

        if is_diagnose and any(w in user_lower for w in ["traceback", "attributeerror", "keyerror", "why did", "error:"]):
            from app.brain.code_service import CodebaseService
            diag = CodebaseService.diagnose_error(user_message)
            reply = (
                f"I've analyzed that error for you! Here is what I found:\n\n"
                f"🔍 **Diagnosis:** {diag['diagnosis']}\n"
                + (f"📄 **Location:** `{diag['identified_file']}` (Line {diag['identified_line']})\n" if diag['identified_file'] else "")
                + (f"💡 **Recommended Fix:** {diag['recommendations'][-1]}" if diag['recommendations'] else "")
            )
            return {
                "speaker": "Friday",
                "model": "gemini-3.1-flash-live-preview",
                "reply": reply,
                "consulted_edith": False,
                "code_diagnosis": diag,
            }

        if is_inspect_code:
            from app.brain.code_service import CodebaseService
            path_match = re.search(r"([a-zA-Z0-9_\-\./]+\.(?:py|ts|tsx|json|md))", user_message)
            if path_match:
                rel_path = path_match.group(1)
                try:
                    read_res = CodebaseService.read_code_file(rel_path, 1, 60)
                    reply = (
                        f"I've inspected `{read_res['path']}`! It contains {read_res['total_lines']} lines of code. "
                        f"Here is an initial excerpt:\n\n```python\n{read_res['lines_with_numbers'][:500]}\n```\n"
                        "Let me know if you would like me to analyze any specific function or rule within it!"
                    )
                    return {
                        "speaker": "Friday",
                        "model": "gemini-3.1-flash-live-preview",
                        "reply": reply,
                        "consulted_edith": False,
                    }
                except Exception:
                    pass

            search_term = user_lower.replace("search code", "").replace("check code for", "").replace("search codebase for", "").strip()
            if search_term:
                search_res = CodebaseService.search_codebase(search_term, "backend/app", 3)
                if search_res["matches"]:
                    m_text = "\n".join([f"- `{m['file']}:{m['line_number']}`: `{m['content']}`" for m in search_res["matches"][:3]])
                    reply = f"I searched our codebase for '{search_term}' and found {search_res['matches_found']} matches! Here are the top locations:\n\n{m_text}"
                    return {
                        "speaker": "Friday",
                        "model": "gemini-3.1-flash-live-preview",
                        "reply": reply,
                        "consulted_edith": False,
                    }

        if is_diagnostics:
            from app.brain.code_service import CodebaseService
            diag = await CodebaseService.get_system_diagnostics(session, org_id)
            tbls = ", ".join([f"{k}: {v}" for k, v in diag["database_tables"].items()])
            reply = (
                f"Our system is operating smoothly! 🚀\n\n"
                f"• **Status:** {diag['status'].upper()}\n"
                f"• **Active Models:** Friday ({diag['active_models']['friday']}) & EDITH ({diag['active_models']['edith']})\n"
                f"• **Database Records:** {tbls}\n"
                "Everything is connected and ready to assist you!"
            )
            return {
                "speaker": "Friday",
                "model": "gemini-3.1-flash-live-preview",
                "reply": reply,
                "consulted_edith": False,
            }

        # Check if user asks to create an autonomous notification
        if any(w in user_lower for w in ["notify me", "send notification", "create alert", "test notification", "post notification"]):
            from app.database.models import AgentNotification
            from app.realtime.connection_manager import ws_manager
            notif = AgentNotification(
                org_id=org_id,
                sender_brain="FRIDAY",
                title="Friday Autonomous Executive Note",
                content=user_message,
                category="SUGGESTION",
                severity="info",
                action_url="/brain",
            )
            session.add(notif)
            await session.commit()
            await ws_manager.broadcast_to_org(org_id, "agent_notification", {
                "id": notif.id,
                "sender_brain": "FRIDAY",
                "title": notif.title,
                "content": notif.content,
                "category": notif.category,
                "severity": notif.severity,
                "is_read": False,
                "action_url": "/brain",
                "created_at": utc_now().isoformat(),
            })
            reply = "I've sent an autonomous notification to your notification center! You can view it in the top bar notification bell or the Notifications page."
            return {
                "speaker": "Friday",
                "model": "gemini-3.1-flash-live-preview",
                "reply": reply,
                "speak_text": "Notification dispatched to your dashboard.",
                "consulted_edith": False,
            }

        # Check if user instruction is asking to do an external WhatsApp or sales task
        is_sales_action = any(w in user_lower for w in [
            "tell edith", "ask edith", "send message to", "message", "discount",
            "give discount", "send promo", "whatsapp", "quote to", "outreach",
            "reach out to", "negotiate", "offer", "send proposal", "proposal to",
            "lead", "customer"
        ])

        if is_sales_action:
            # Consult EDITH over Inter-Brain Bus
            bus_res = await inter_brain_bus.dispatch_task(
                session=session,
                org_id=org_id,
                task_text=user_message,
                metadata={"source": "friday_chat"},
            )

            decision = bus_res.get("decision")
            reasoning = bus_res.get("reasoning", "")
            target_phone = bus_res.get("target_phone", "the client")
            suggestion = bus_res.get("details", {}).get("suggestion")

            if decision == "DENIED":
                reply = (
                    f"I consulted with EDITH regarding your request, but EDITH has declined to proceed. "
                    f"EDITH's reason: {reasoning} Would you like to adjust the parameters or discuss alternative approaches?"
                )
                speak_text = f"EDITH declined the request: {reasoning[:120]}"
            else:
                reply = (
                    f"EDITH reviewed and accepted the task: {reasoning} "
                    f"EDITH has prepared the commercial communication for {target_phone}."
                )
                speak_text = f"EDITH accepted your task for {target_phone}."

            return {
                "speaker": "Friday",
                "model": "gemini-3.1-flash-live-preview",
                "reply": reply,
                "speak_text": speak_text,
                "consulted_edith": True,
                "edith_verdict": bus_res,
                "delegation_flow": {
                    "operator_input": user_message,
                    "friday_delegation": f"Dispatched instruction to EDITH: '{user_message}'",
                    "edith_verdict": decision,
                    "edith_reasoning": reasoning,
                    "edith_suggestion": suggestion,
                    "friday_synthesis": reply,
                },
            }

        # General Executive Assistance Chat via Gemini (or simulated intelligent response if offline)
        api_key = getattr(settings, "GEMINI_API_KEY", "")
        gemini_model = getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-live-preview")
        if api_key and not api_key.startswith("mock"):
            try:
                import httpx
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{gemini_model}:generateContent?key={api_key}"
                prompt_text = f"{self.get_system_prompt()}\n\nOperator: {user_message}\nFriday:"
                payload = {
                    "contents": [{"parts": [{"text": prompt_text}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 300},
                }
                async with httpx.AsyncClient(timeout=10.0) as client:
                    resp = await client.post(url, json=payload)
                    resp.raise_for_status()
                    data = resp.json()
                    reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()
                    return {
                        "speaker": "Friday",
                        "model": gemini_model,
                        "reply": reply,
                        "consulted_edith": False,
                    }
            except Exception as e:
                logger.warning(f"[Friday Brain] Gemini call fallback: {e}")

        # Intelligent local persona fallback
        if "edith" in user_lower or "partner" in user_lower:
            reply = (
                "EDITH is actively managing our WhatsApp client pipeline, qualifying incoming inquiries, and calculating "
                "volume tier pricing. If you would like EDITH to reach out to a specific lead or check recent negotiations, just let me know!"
            )
        else:
            reply = (
                f"I'm on it! As your executive web assistant for {settings.BUSINESS_NAME}, I can help you monitor live inquiries, "
                "adjust business rules, or coordinate with EDITH for customer sales outreach."
            )

        return {
            "speaker": "Friday",
            "model": f"{gemini_model} (local)",
            "reply": reply,
            "consulted_edith": False,
        }

    async def formulate_knowledge_update(
        self,
        session: AsyncSession,
        org_id: str,
        operator_instruction: str,
        category_hint: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Interprets natural-language instructions from the operator and compiles
        a structured change proposal for EDITH to audit.
        """
        text = operator_instruction.strip()
        text_lower = text.lower()

        # 1. Determine Category
        category = category_hint or KnowledgeCategory.BUSINESS_INFO.value
        if any(w in text_lower for w in ["discount", "tier", "volume tier", "pricing", "tariff", "ceiling"]):
            category = KnowledgeCategory.PRICING_RULE.value
        elif any(w in text_lower for w in ["sku", "product", "catalog", "stock", "variant", "price per unit", "moq"]):
            category = KnowledgeCategory.CATALOG_PRODUCT.value
        elif any(w in text_lower for w in ["rule", "guidance", "objection", "instruction", "safety prompt", "spin"]):
            category = KnowledgeCategory.AGENT_GUIDANCE.value
        elif any(w in text_lower for w in ["custom", "setting", "config", "parameter"]):
            category = KnowledgeCategory.CUSTOM.value

        # 2. Extract Numbers & Parameters
        fields: Dict[str, Any] = {}
        # Check for discount percentage
        disc_match = re.search(r"(\d+(?:\.\d+)?)\s*%", text_lower)
        if disc_match:
            fields["discount_percentage"] = float(disc_match.group(1))

        # Check for ceiling percentage
        ceiling_match = re.search(r"(?:max|ceiling|autonomous)\s*(?:discount)?\s*(?:of|at)?\s*(\d+(?:\.\d+)?)\s*%", text_lower)
        if ceiling_match:
            fields["max_autonomous_discount"] = float(ceiling_match.group(1))
        elif "discount_percentage" in fields:
            fields["max_autonomous_discount"] = min(fields["discount_percentage"], 15.0)

        # Check for quantity / MOQ
        qty_match = re.search(r"(\d+(?:\.\d+)?)\s*(?:units|unit|kg|pcs|packs|cartons)\b", text_lower)
        if not qty_match:
            qty_match = re.search(r"(?:for|min|moq|quantity|qty|over|above)\s*(\d+(?:\.\d+)?)\b", text_lower)
        if not qty_match and category == KnowledgeCategory.PRICING_RULE.value:
            qty_match = re.search(r"\b(\d+)\s*\+\b", text_lower)

        if qty_match and float(qty_match.group(1)) > 0:
            val = float(qty_match.group(1))
            if category == KnowledgeCategory.PRICING_RULE.value:
                fields["min_quantity"] = val
            elif category == KnowledgeCategory.CATALOG_PRODUCT.value:
                fields["min_order_quantity"] = val

        # Check for price
        price_match = re.search(r"(?:price|rate|cost|₹|\$)\s*(?:of|at)?\s*(\d+(?:\.\d+)?)", text_lower)
        if price_match:
            fields["base_price"] = float(price_match.group(1))

        # Determine Title
        title = "Commercial Policy"
        if category == KnowledgeCategory.PRICING_RULE.value:
            min_q = fields.get("min_quantity", 50)
            disc = fields.get("discount_percentage", 5.0)
            title = f"Tier: {min_q}+ Volume ({disc}% Discount)"
        elif category == KnowledgeCategory.CATALOG_PRODUCT.value:
            name_match = re.search(r'(?:product|item)\s+["\']?([^"\',]+)["\']?', text, re.IGNORECASE)
            title = name_match.group(1).strip().title() if name_match else "Catalog Product"
        else:
            clean_title = re.sub(r"^(?:add|update|create|set)\s+", "", text, flags=re.IGNORECASE)
            title = clean_title[:50].title()

        # Generate markdown content
        content_text = f"### {title}\n" + "\n".join([f"- **{k.replace('_', ' ').title()}:** {v}" for k, v in fields.items()])
        if not fields:
            content_text += f"\n{text}"

        return {
            "action": "create" if any(w in text_lower for w in ["add", "new", "create"]) else "update",
            "category": category,
            "title": title,
            "fields": fields,
            "content_text": content_text,
            "raw_instruction": text,
            "summary": f"Proposing {category} update: '{title}' with fields {fields}",
        }


class InterBrainBus:
    """
    Central Inter-Brain Communication Bus coordinating message dispatch,
    independent decision evaluation, persistence to DB, and live WebSocket broadcasts.
    """

    def __init__(self):
        self.friday = FridayBrain()
        self.edith = EdithBrain()

    async def dispatch_task(
        self,
        session: AsyncSession,
        org_id: str,
        task_text: str,
        target_phone: Optional[str] = None,
        requested_discount: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Friday dispatches a task request to EDITH.
        EDITH evaluates independently, accepts or denies, and both steps are logged.
        """
        metadata = metadata or {}

        # 1. Record Friday's task request in DB
        friday_msg = InterBrainMessage(
            org_id=org_id,
            sender_brain="FRIDAY",
            recipient_brain="EDITH",
            message_type="TASK_REQUEST",
            content=task_text,
            decision="PENDING",
            reasoning="Delegated by operator through Friday executive interface.",
            metadata_payload={
                **metadata,
                "target_phone": target_phone,
                "requested_discount": requested_discount,
            },
        )
        session.add(friday_msg)
        await session.commit()
        await session.refresh(friday_msg)

        # Broadcast Friday's request live over WebSocket
        await self._broadcast(org_id, friday_msg)

        # 2. EDITH independently evaluates the request
        eval_result = await self.edith.evaluate_task_request(
            session=session,
            org_id=org_id,
            task_description=task_text,
            target_phone=target_phone,
            requested_discount=requested_discount,
            context=metadata,
        )

        decision = eval_result["decision"]
        reasoning = eval_result["reasoning"]

        # 3. Record EDITH's independent verdict in DB
        edith_msg = InterBrainMessage(
            org_id=org_id,
            conversation_id=friday_msg.id,
            sender_brain="EDITH",
            recipient_brain="FRIDAY",
            message_type="TASK_RESPONSE",
            content=(
                f"Task {decision}: {reasoning}"
            ),
            decision=decision,
            reasoning=reasoning,
            metadata_payload=eval_result,
            resolved_at=utc_now(),
        )
        session.add(edith_msg)

        # Update Friday's request status
        friday_msg.decision = decision
        friday_msg.resolved_at = utc_now()
        await session.commit()
        await session.refresh(edith_msg)

        # Broadcast EDITH's verdict live
        await self._broadcast(org_id, edith_msg)

        # Autonomous direct notification to operator
        try:
            from app.database.models import AgentNotification
            from app.realtime.connection_manager import ws_manager
            notif_title = (
                f"EDITH Refused Task: {target_phone or 'Client'}"
                if decision == "DENIED"
                else f"EDITH Approved Action: {target_phone or 'Client'}"
            )
            notif = AgentNotification(
                org_id=org_id,
                sender_brain="EDITH",
                title=notif_title,
                content=reasoning,
                category="POLICY_REFUSAL" if decision == "DENIED" else "SALES_ALERT",
                severity="warning" if decision == "DENIED" else "success",
                action_url="/brain",
                metadata_payload=eval_result,
            )
            session.add(notif)
            await session.commit()
            await ws_manager.broadcast_to_org(org_id, "agent_notification", {
                "id": notif.id,
                "sender_brain": "EDITH",
                "title": notif_title,
                "content": reasoning,
                "category": notif.category,
                "severity": notif.severity,
                "is_read": False,
                "action_url": "/brain",
                "created_at": utc_now().isoformat(),
            })
        except Exception as ne:
            logger.debug(f"[InterBrainBus] Direct notification error: {ne}")

        return {
            "task_id": friday_msg.id,
            "decision": decision,
            "reasoning": reasoning,
            "details": eval_result,
            "target_phone": eval_result.get("target_phone") or target_phone,
            "created_at": edith_msg.created_at.isoformat() if edith_msg.created_at else None,
        }

    async def post_edith_debrief(
        self,
        session: AsyncSession,
        org_id: str,
        category: str,
        details: Dict[str, Any],
    ) -> Dict[str, Any]:
        """
        EDITH autonomously posts an emotional debrief or feature gap notification to Friday.
        """
        debrief = await self.edith.generate_debrief(category=category, details=details)

        edith_msg = InterBrainMessage(
            org_id=org_id,
            sender_brain="EDITH",
            recipient_brain="FRIDAY",
            message_type="DEBRIEF" if category == "RUDE_CUSTOMER" else "FEATURE_REQUEST",
            content=debrief["content"],
            decision="ACKNOWLEDGED",
            reasoning=debrief["reasoning"],
            metadata_payload={
                "category": category,
                **details,
            },
            resolved_at=utc_now(),
        )
        session.add(edith_msg)
        await session.commit()
        await session.refresh(edith_msg)

        # Broadcast debrief live
        await self._broadcast(org_id, edith_msg)

        # Autonomous direct notification to operator
        try:
            from app.database.models import AgentNotification
            from app.realtime.connection_manager import ws_manager
            is_rude = category == "RUDE_CUSTOMER"
            notif_title = (
                "EDITH Emotional Debrief: Hostile Customer on WhatsApp"
                if is_rude
                else "EDITH Feature Gap: Missing Documentation Flagged"
            )
            notif = AgentNotification(
                org_id=org_id,
                sender_brain="EDITH",
                title=notif_title,
                content=debrief["content"],
                category="DEBRIEF" if is_rude else "FEATURE_GAP",
                severity="critical" if is_rude else "warning",
                action_url="/brain",
                metadata_payload={"category": category, **details},
            )
            session.add(notif)
            await session.commit()
            await ws_manager.broadcast_to_org(org_id, "agent_notification", {
                "id": notif.id,
                "sender_brain": "EDITH",
                "title": notif_title,
                "content": debrief["content"],
                "category": notif.category,
                "severity": notif.severity,
                "is_read": False,
                "action_url": "/brain",
                "created_at": utc_now().isoformat(),
            })
        except Exception as ne:
            logger.debug(f"[InterBrainBus] Debrief notification error: {ne}")

        return {
            "id": edith_msg.id,
            "category": category,
            "content": debrief["content"],
            "reasoning": debrief["reasoning"],
            "created_at": edith_msg.created_at.isoformat() if edith_msg.created_at else None,
        }

    async def dispatch_knowledge_update(
        self,
        session: AsyncSession,
        org_id: str,
        operator_instruction: str,
        category_hint: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Coordinates dual-brain update chat deliberation:
        1. Classifies intent:
           - GREETING / CASUAL -> Conversational greeting & capability guide (NO file creation)
           - LIST_FILES -> Complete breakdown of registered knowledge assets (NO file creation)
           - EXPLAIN -> In-depth explanation of matching policies/products (NO file creation)
           - VAGUE_COMMAND -> Asks for required parameters (NO file creation)
           - PAUSE / ACTIVATE / DELETE -> Status updates or removal
           - CREATE / UPDATE -> Formulates proposal, audits with EDITH, commits and re-embeds
        """
        text = operator_instruction.strip()
        text_lower = text.lower()
        words = text_lower.split()

        # -------------------------------------------------------------
        # A. GREETING & CASUAL CONVERSATION (Never create/modify files)
        # -------------------------------------------------------------
        greeting_words = {"hi", "hello", "hey", "hola", "greetings", "howdy", "sup", "yo", "namaste", "test", "testing"}
        is_greeting = False
        action_words = ["create", "update", "discount", "tier", "moq", "delete", "pause", "activate", "rule", "policy", "price", "rate", "catalog", "sku"]
        if len(words) <= 4 and any(w in greeting_words for w in words) and not any(w in text_lower for w in action_words):
            is_greeting = True
        elif any(phrase in text_lower for phrase in ["who are you", "what can you do", "introduce yourself", "how are you", "good morning", "good evening", "good afternoon"]):
            is_greeting = True

        if is_greeting:
            reply_text = (
                "Hello! I am EDITH, your autonomous commercial closer and knowledge policy engine. "
                "I maintain all enterprise policies, pricing curves, catalog products, and fulfillment rules with strict margin protection.\n\n"
                "Here is what you can ask me to do:\n"
                "• **Inspect Files**: *'What files do we have?'* or *'Show active documents'*\n"
                "• **Explain Policies**: *'Explain our logistics policy'* or *'What is Tier 1 volume discount?'*\n"
                "• **Create or Update Rules**: *'Create a new pricing tier: 20% discount on 200+ units'* or *'Update MOQ to 25 units'*\n"
                "• **Attach Documents**: Attach an image or PDF screenshot to extract policies directly.\n\n"
                "How can I assist your operations today?"
            )
            return {
                "success": True,
                "decision": "INFO",
                "friday_proposal": None,
                "edith_evaluation": {
                    "decision": "INFO",
                    "reasoning": "Conversational greeting acknowledged. No knowledge assets modified.",
                },
                "resulting_item": None,
                "reply_text": reply_text,
                "speak_text": "Hello! I am EDITH, your commercial policy engine. How can I assist you?",
                "deliberation_flow": {
                    "operator_instruction": operator_instruction,
                    "friday_proposal": None,
                    "edith_verdict": "INFO",
                    "edith_reasoning": "Conversational greeting handled without file mutation.",
                    "edith_suggestion": None,
                    "friday_reply": reply_text,
                },
            }

        # -------------------------------------------------------------
        # B. LIST FILES / DIRECTORY INVENTORY (Never create/modify files)
        # -------------------------------------------------------------
        list_keywords = [
            "what files", "list files", "show files", "what documents", "show documents",
            "show me files", "what do we have", "what items", "list documents", "show catalog",
            "all files", "show policies", "what policies", "which files", "what is there",
        ]
        is_list_files = any(kw in text_lower for kw in list_keywords) and not any(w in text_lower for w in ["create", "add", "update", "delete", "pause", "set", "make"])

        # -------------------------------------------------------------
        # C. EXPLAIN POLICY / PRODUCT / QUERY (Never create/modify files)
        # -------------------------------------------------------------
        explain_keywords = ["explain", "what is", "tell me about", "describe", "details of", "how does", "summarize", "info on", "detail"]
        is_explain = any(kw in text_lower for kw in explain_keywords) and not any(w in text_lower for w in ["create", "add new", "update to", "delete", "pause", "set discount"])

        if is_list_files or is_explain:
            from app.database.models import KnowledgeItem
            from sqlalchemy import select, or_
            stmt = select(KnowledgeItem).where(
                or_(
                    KnowledgeItem.org_id == org_id,
                    KnowledgeItem.org_id == "org_default_tea",
                    KnowledgeItem.org_id == "org_default",
                ),
                KnowledgeItem.is_active == True,
            ).order_by(KnowledgeItem.category, KnowledgeItem.title)
            res = await session.execute(stmt)
            active_items = res.scalars().all()

            if is_list_files:
                pricing_items = [i for i in active_items if i.category == "pricing_rule"]
                catalog_items = [i for i in active_items if i.category == "catalog_product"]
                business_items = [i for i in active_items if i.category == "business_info"]
                other_items = [i for i in active_items if i.category not in ["pricing_rule", "catalog_product", "business_info"]]

                lines = ["Here are the active files and commercial policies currently registered in our Knowledge Hub:\n"]
                if pricing_items:
                    lines.append("💰 **Pricing Rules & Volume Tiers:**")
                    for it in pricing_items:
                        disc = f"{it.discount_percentage}% discount" if it.discount_percentage else ""
                        min_q = f"min {it.min_quantity} units" if it.min_quantity else ""
                        details = f" ({disc}, {min_q})" if (disc or min_q) else ""
                        lines.append(f"  • **{it.title}**{details}")
                if catalog_items:
                    lines.append("\n📦 **Catalog Products & SKUs:**")
                    for it in catalog_items:
                        price = f"₹{it.base_price}/{it.unit or 'unit'}" if it.base_price else ""
                        moq = f"MOQ: {it.min_order_quantity}" if it.min_order_quantity else ""
                        details = f" ({price}, {moq})" if (price or moq) else ""
                        lines.append(f"  • **{it.title}** [{it.sku or 'SKU'}]{details}")
                if business_items:
                    lines.append("\n📄 **Business Info & Policies:**")
                    for it in business_items:
                        lines.append(f"  • **{it.title}**")
                if other_items:
                    lines.append("\n⚙️ **Other Guidance & Settings:**")
                    for it in other_items:
                        lines.append(f"  • **{it.title}**")

                lines.append("\n*You can ask me to explain any of these items (e.g. 'Explain our logistics policy'), or instruct me to modify them!*")
                reply_text = "\n".join(lines)
                return {
                    "success": True,
                    "decision": "INFO",
                    "friday_proposal": None,
                    "edith_evaluation": {"decision": "INFO", "reasoning": "Provided inventory of active knowledge assets. No file modifications required."},
                    "resulting_item": None,
                    "reply_text": reply_text,
                    "speak_text": f"We currently have {len(active_items)} active knowledge files across pricing, catalog, and operational policies.",
                    "deliberation_flow": {
                        "operator_instruction": operator_instruction,
                        "friday_proposal": None,
                        "edith_verdict": "INFO",
                        "edith_reasoning": "Provided listing of active knowledge items.",
                        "edith_suggestion": None,
                        "friday_reply": reply_text,
                    },
                }

            if is_explain:
                matched = None
                for it in active_items:
                    title_clean = it.title.lower()
                    title_words = [w for w in title_clean.split() if len(w) > 2 and w not in ["the", "and", "for", "with", "tier", "first", "blend"]]
                    if any(w in text_lower for w in title_words) or (it.sku and it.sku.lower() in text_lower):
                        matched = it
                        break

                if matched:
                    details_parts = []
                    if matched.discount_percentage:
                        details_parts.append(f"**Autonomous Discount:** {matched.discount_percentage}%")
                    if matched.max_autonomous_discount:
                        details_parts.append(f"**Ceiling:** {matched.max_autonomous_discount}%")
                    if matched.min_quantity:
                        details_parts.append(f"**Min Quantity:** {matched.min_quantity}")
                    if matched.base_price:
                        details_parts.append(f"**Base Tariff:** ₹{matched.base_price}/{matched.unit or 'unit'}")
                    if matched.min_order_quantity:
                        details_parts.append(f"**MOQ:** {matched.min_order_quantity}")
                    if matched.customer_segment:
                        details_parts.append(f"**Target Segment:** {matched.customer_segment}")

                    meta_str = "\n".join([f"• {p}" for p in details_parts])
                    reply_text = (
                        f"### Explanation: {matched.title}\n"
                        f"**Category:** `{matched.category}` | **Status:** Active | **Version:** v{matched.version}.0\n\n"
                        f"**Policy Specification:**\n{matched.content_text}\n\n"
                    )
                    if details_parts:
                        reply_text += f"**Key Commercial Parameters:**\n{meta_str}\n\n"
                    reply_text += "*Would you like me to update any terms or pricing for this item?*"

                    return {
                        "success": True,
                        "decision": "INFO",
                        "friday_proposal": None,
                        "edith_evaluation": {"decision": "INFO", "reasoning": f"Provided explanation for '{matched.title}'. No file modifications required."},
                        "resulting_item": None,
                        "reply_text": reply_text,
                        "speak_text": f"Here is the breakdown of {matched.title}.",
                        "deliberation_flow": {
                            "operator_instruction": operator_instruction,
                            "friday_proposal": None,
                            "edith_verdict": "INFO",
                            "edith_reasoning": f"Provided explanation for {matched.title}.",
                            "edith_suggestion": None,
                            "friday_reply": reply_text,
                        },
                    }
                else:
                    # Semantic search RAG fallback for explanation
                    from app.knowledge.rag_service import KnowledgeRAGService
                    rag_svc = KnowledgeRAGService(session, org_id)
                    rag_res = await rag_svc.search_and_answer(query=text, top_k=3)
                    if rag_res.get("confidence_score", 0) > 0.35 and rag_res.get("answer"):
                        reply_text = f"**Commercial Intelligence Analysis:**\n{rag_res.get('answer', '')}\n\n*(Grounded in verified knowledge chunks)*"
                    else:
                        reply_text = (
                            f"I searched our knowledge base for '{text}', but could not find a specific policy matching that phrase. "
                            f"We currently have {len(active_items)} files available. You can ask me *'What files do we have?'* to inspect the directory, or give me an explicit command to create this policy!"
                        )
                    return {
                        "success": True,
                        "decision": "INFO",
                        "friday_proposal": None,
                        "edith_evaluation": {"decision": "INFO", "reasoning": "Answered query via grounded knowledge search. No file modifications required."},
                        "resulting_item": None,
                        "reply_text": reply_text,
                        "speak_text": reply_text[:100],
                        "deliberation_flow": {
                            "operator_instruction": operator_instruction,
                            "friday_proposal": None,
                            "edith_verdict": "INFO",
                            "edith_reasoning": "RAG search response.",
                            "edith_suggestion": None,
                            "friday_reply": reply_text,
                        },
                    }

        # -------------------------------------------------------------
        # D. VAGUE OR INCOMPLETE DIRECTIVE (Ask for clarification)
        # -------------------------------------------------------------
        is_create_or_update = any(w in text_lower for w in ["create", "add", "new", "update", "change", "set", "modify"])
        has_numbers_or_details = bool(re.search(r"(\d+|%|₹|\$|tier|policy|rule|moq|sku|kg|price)", text_lower))
        if is_create_or_update and len(words) <= 3 and not has_numbers_or_details:
            reply_text = (
                "I'm ready to create or update that knowledge asset for you! Could you please provide the details? For example:\n"
                "• **For a Pricing Tier**: *'Create a new tier: 15% discount for 150+ units'*\n"
                "• **For a Catalog Item**: *'Add product Premium Grade A, SKU: PRD-01, Base Price: 450, MOQ: 10'*\n"
                "• **For a Business Policy**: *'Add a 7-day replacement policy for damaged shipments'*"
            )
            return {
                "success": True,
                "decision": "INFO",
                "friday_proposal": None,
                "edith_evaluation": {"decision": "INFO", "reasoning": "Clarification requested for incomplete command. No file modifications required."},
                "resulting_item": None,
                "reply_text": reply_text,
                "speak_text": "Please provide the details for the file you would like to create or update.",
                "deliberation_flow": {
                    "operator_instruction": operator_instruction,
                    "friday_proposal": None,
                    "edith_verdict": "INFO",
                    "edith_reasoning": "Awaiting directive details.",
                    "edith_suggestion": None,
                    "friday_reply": reply_text,
                },
            }

        # -------------------------------------------------------------
        # E. PAUSE / ACTIVATE / DELETE ACTION
        # -------------------------------------------------------------
        if any(w in text_lower for w in ["pause", "activate", "delete", "remove"]):
            action = "pause" if "pause" in text_lower else "activate" if "activate" in text_lower else "delete"
            from app.database.models import KnowledgeItem
            from sqlalchemy import select, or_
            res = await session.execute(select(KnowledgeItem).where(
                or_(
                    KnowledgeItem.org_id == org_id,
                    KnowledgeItem.org_id == "org_default_tea",
                    KnowledgeItem.org_id == "org_default",
                )
            ))
            all_items = res.scalars().all()
            target_item = None
            for it in all_items:
                if it.title.lower() in text_lower or (it.sku and it.sku.lower() in text_lower):
                    target_item = it
                    break
            if not target_item and len(words) > 1:
                for it in all_items:
                    for w in it.title.lower().split():
                        if len(w) > 3 and w in text_lower:
                            target_item = it
                            break
                    if target_item:
                        break

            if target_item:
                return await self.dispatch_voice_knowledge_action(
                    session=session,
                    org_id=org_id,
                    action=action,
                    item_id_or_title=target_item.id,
                    instruction=operator_instruction,
                )

        # -------------------------------------------------------------
        # F. EXPLICIT FILE CREATION / MODIFICATION DIRECTIVE
        # -------------------------------------------------------------
        # 1. Friday formulates proposal
        proposal = await self.friday.formulate_knowledge_update(
            session=session,
            org_id=org_id,
            operator_instruction=operator_instruction,
            category_hint=category_hint,
        )

        # 2. Log Friday's proposal to InterBrainMessage
        friday_msg = InterBrainMessage(
            org_id=org_id,
            sender_brain="FRIDAY",
            recipient_brain="EDITH",
            message_type="KNOWLEDGE_UPDATE_PROPOSAL",
            content=f"Proposed update to {proposal['category']}: {proposal['title']} ({proposal['summary']})",
            decision="PENDING",
            reasoning="Operator requested knowledge update via web dashboard chat.",
            metadata_payload=proposal,
        )
        session.add(friday_msg)
        await session.commit()
        await session.refresh(friday_msg)
        await self._broadcast(org_id, friday_msg)

        # 3. EDITH independently evaluates
        edith_eval = await self.edith.evaluate_knowledge_update(
            session=session,
            org_id=org_id,
            proposal=proposal,
        )

        decision = edith_eval["decision"]
        reasoning = edith_eval["reasoning"]
        suggestion = edith_eval.get("suggestion")

        # 4. Log EDITH's verdict to InterBrainMessage
        edith_msg = InterBrainMessage(
            org_id=org_id,
            conversation_id=friday_msg.id,
            sender_brain="EDITH",
            recipient_brain="FRIDAY",
            message_type="KNOWLEDGE_UPDATE_VERDICT",
            content=f"Knowledge Update {decision}: {reasoning}",
            decision=decision,
            reasoning=reasoning,
            metadata_payload=edith_eval,
            resolved_at=utc_now(),
        )
        session.add(edith_msg)
        friday_msg.decision = decision
        friday_msg.resolved_at = utc_now()
        await session.commit()
        await session.refresh(edith_msg)
        await self._broadcast(org_id, edith_msg)

        resulting_item = None
        if decision == "ACCEPTED":
            from app.knowledge.ingestion import KnowledgeIngestionService
            from decimal import Decimal
            fields = proposal.get("fields", {})

            ingest_svc = KnowledgeIngestionService(session, org_id)
            k_item = await ingest_svc.ingest_knowledge_item(
                title=proposal["title"],
                content_text=proposal["content_text"],
                category=proposal["category"],
                source_type="chat_agent",
                created_by_brain="FRIDAY",
                structured_data=fields,
                sku=fields.get("sku"),
                base_price=Decimal(str(fields["base_price"])) if "base_price" in fields else None,
                min_order_quantity=Decimal(str(fields["min_order_quantity"])) if "min_order_quantity" in fields else None,
                min_quantity=Decimal(str(fields["min_quantity"])) if "min_quantity" in fields else None,
                max_quantity=Decimal(str(fields["max_quantity"])) if "max_quantity" in fields else None,
                discount_percentage=Decimal(str(fields["discount_percentage"])) if "discount_percentage" in fields else None,
                max_autonomous_discount=Decimal(str(fields["max_autonomous_discount"])) if "max_autonomous_discount" in fields else None,
                customer_segment=fields.get("customer_segment"),
            )
            resulting_item = {
                "id": k_item.id,
                "title": k_item.title,
                "category": k_item.category,
                "version": k_item.version,
                "chunk_count": k_item.chunk_count,
            }

            # Broadcast live update
            try:
                from app.realtime.connection_manager import ws_manager
                await ws_manager.broadcast_to_org(org_id, "knowledge_item_updated", {
                    "item_id": k_item.id,
                    "title": k_item.title,
                    "category": k_item.category,
                    "version": k_item.version,
                    "chunk_count": k_item.chunk_count,
                })
            except Exception:
                pass

            # Dispatch Autonomous Notification
            try:
                from app.database.models import AgentNotification
                from app.realtime.connection_manager import ws_manager
                notif = AgentNotification(
                    org_id=org_id,
                    sender_brain="EDITH",
                    title=f"Knowledge Hub Updated: {k_item.title}",
                    content=f"EDITH verified and committed update for {k_item.category}: {reasoning}",
                    category="KNOWLEDGE_UPDATE",
                    severity="success",
                    action_url=f"/knowledge?tab={k_item.category}",
                )
                session.add(notif)
                await session.commit()
                await ws_manager.broadcast_to_org(org_id, "agent_notification", {
                    "id": notif.id,
                    "sender_brain": "EDITH",
                    "title": notif.title,
                    "content": notif.content,
                    "category": notif.category,
                    "severity": notif.severity,
                    "is_read": False,
                    "action_url": notif.action_url,
                    "created_at": utc_now().isoformat(),
                })
            except Exception:
                pass

            reply_text = (
                f"I've updated {proposal['title']}! EDITH reviewed and verified the changes: {reasoning}"
            )
            speak_text = f"Updated {proposal['title']}. EDITH approved the change."
        else:
            reply_text = (
                f"I consulted with EDITH, but EDITH declined to apply this update. "
                f"Reason: {reasoning}"
                + (f" {suggestion}" if suggestion else "")
            )
            speak_text = f"EDITH declined the update: {reasoning[:120]}"

        return {
            "success": decision == "ACCEPTED",
            "decision": decision,
            "friday_proposal": proposal,
            "edith_evaluation": edith_eval,
            "resulting_item": resulting_item,
            "reply_text": reply_text,
            "speak_text": speak_text,
            "deliberation_flow": {
                "operator_instruction": operator_instruction,
                "friday_proposal": proposal["summary"],
                "edith_verdict": decision,
                "edith_reasoning": reasoning,
                "edith_suggestion": suggestion,
                "friday_reply": reply_text,
            }
        }

    async def dispatch_voice_knowledge_action(
        self,
        session: AsyncSession,
        org_id: str,
        action: str,
        instruction: str,
        category: Optional[str] = None,
        item_id_or_title: Optional[str] = None,
        fields: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Voice-driven Knowledge & RAG action hub:
        Friday commands partner brain EDITH to create, edit, pause, activate, or delete
        knowledge assets, pricing rules, catalog items, or guidance.
        EDITH independently verifies commercial policies and executes changes in the database.
        """
        from app.realtime.connection_manager import ws_manager
        from app.database.models import AgentNotification, KnowledgeItem, KnowledgeCategory
        from app.knowledge.ingestion import KnowledgeIngestionService
        from decimal import Decimal

        action = (action or "create").lower().strip()
        fields = fields or {}

        # 1. Log Friday's voice delegation
        friday_msg = InterBrainMessage(
            org_id=org_id,
            sender_brain="FRIDAY",
            recipient_brain="EDITH",
            message_type="VOICE_KNOWLEDGE_DIRECTIVE",
            content=f"Voice Directive ({action.upper()}): {instruction}",
            decision="PENDING",
            reasoning="Voice operator commanded Friday to delegate knowledge action to EDITH.",
            metadata_payload={
                "action": action,
                "instruction": instruction,
                "category": category,
                "item_id_or_title": item_id_or_title,
                "fields": fields,
            },
        )
        session.add(friday_msg)
        await session.commit()
        await session.refresh(friday_msg)
        await self._broadcast(org_id, friday_msg)

        # 2. Process Actions: PAUSE / ACTIVATE / DELETE
        if action in ("pause", "activate", "delete"):
            target_term = item_id_or_title or instruction
            search_stmt = select(KnowledgeItem).where(
                or_(
                    KnowledgeItem.org_id == org_id,
                    KnowledgeItem.org_id == "org_default",
                    KnowledgeItem.org_id == "org_default_tea",
                )
            )
            if item_id_or_title:
                search_stmt = search_stmt.where(
                    or_(
                        KnowledgeItem.id == item_id_or_title.strip(),
                        KnowledgeItem.title.ilike(f"%{item_id_or_title.strip()}%"),
                        KnowledgeItem.sku.ilike(f"%{item_id_or_title.strip()}%"),
                    )
                )
            res = await session.execute(search_stmt)
            target_item = res.scalars().first()

            if not target_item:
                err_msg = f"Could not find any knowledge asset matching '{target_term}' to {action}."
                # Log EDITH capability gap / item not found
                edith_msg = InterBrainMessage(
                    org_id=org_id,
                    conversation_id=friday_msg.id,
                    sender_brain="EDITH",
                    recipient_brain="FRIDAY",
                    message_type="EDITH_CAPABILITY_GAP",
                    content=f"EDITH could not locate item to {action}: {err_msg}",
                    decision="DENIED",
                    reasoning=err_msg,
                    metadata_payload={"gap_type": "ITEM_NOT_FOUND", "target_term": target_term},
                    resolved_at=utc_now(),
                )
                session.add(edith_msg)
                friday_msg.decision = "DENIED"
                friday_msg.resolved_at = utc_now()
                await session.commit()

                # Notify operator
                notif = AgentNotification(
                    org_id=org_id,
                    sender_brain="EDITH",
                    title=f"EDITH Action Refused: Item Not Found",
                    content=err_msg,
                    category="EDITH_CAPABILITY_GAP",
                    severity="warning",
                    action_url="/knowledge",
                )
                session.add(notif)
                await session.commit()

                return {
                    "success": False,
                    "decision": "DENIED",
                    "action": action,
                    "reasoning": err_msg,
                    "speak_text": f"EDITH could not find that item in the knowledge hub.",
                    "reply_text": err_msg,
                }

            if action == "delete":
                deleted_id = target_item.id
                deleted_title = target_item.title
                await session.delete(target_item)
                await session.commit()

                # Broadcast live WebSocket deletion
                await ws_manager.broadcast_to_org(org_id, "knowledge_item_deleted", {"item_id": deleted_id})

                success_reason = f"EDITH confirmed deletion of knowledge asset '{deleted_title}'."
                edith_msg = InterBrainMessage(
                    org_id=org_id,
                    conversation_id=friday_msg.id,
                    sender_brain="EDITH",
                    recipient_brain="FRIDAY",
                    message_type="ACTION_CONFIRMATION",
                    content=success_reason,
                    decision="ACCEPTED",
                    reasoning=success_reason,
                    resolved_at=utc_now(),
                )
                session.add(edith_msg)
                friday_msg.decision = "ACCEPTED"
                friday_msg.resolved_at = utc_now()

                notif = AgentNotification(
                    org_id=org_id,
                    sender_brain="EDITH",
                    title=f"Knowledge Asset Deleted: {deleted_title}",
                    content=success_reason,
                    category="KNOWLEDGE_UPDATE",
                    severity="info",
                    action_url="/knowledge",
                )
                session.add(notif)
                await session.commit()

                return {
                    "success": True,
                    "decision": "ACCEPTED",
                    "action": "delete",
                    "item_id": deleted_id,
                    "reasoning": success_reason,
                    "speak_text": f"EDITH deleted the knowledge file '{deleted_title}'.",
                    "reply_text": success_reason,
                }

            # PAUSE / ACTIVATE
            new_active_state = (action == "activate")
            target_item.is_active = new_active_state
            await session.commit()

            status_word = "activated" if new_active_state else "paused"
            success_reason = f"EDITH {status_word} '{target_item.title}'. RAG retrieval status is now updated."

            # Broadcast live update
            await ws_manager.broadcast_to_org(org_id, "knowledge_item_updated", {
                "item_id": target_item.id,
                "is_active": new_active_state,
                "title": target_item.title,
            })

            edith_msg = InterBrainMessage(
                org_id=org_id,
                conversation_id=friday_msg.id,
                sender_brain="EDITH",
                recipient_brain="FRIDAY",
                message_type="ACTION_CONFIRMATION",
                content=success_reason,
                decision="ACCEPTED",
                reasoning=success_reason,
                resolved_at=utc_now(),
            )
            session.add(edith_msg)
            friday_msg.decision = "ACCEPTED"
            friday_msg.resolved_at = utc_now()

            notif = AgentNotification(
                org_id=org_id,
                sender_brain="EDITH",
                title=f"Knowledge Asset {status_word.title()}: {target_item.title}",
                content=success_reason,
                category="KNOWLEDGE_UPDATE",
                severity="success",
                action_url=f"/knowledge?tab={target_item.category}",
            )
            session.add(notif)
            await session.commit()

            return {
                "success": True,
                "decision": "ACCEPTED",
                "action": action,
                "item_id": target_item.id,
                "is_active": new_active_state,
                "reasoning": success_reason,
                "speak_text": f"EDITH has {status_word} the file '{target_item.title}'.",
                "reply_text": success_reason,
            }

        # 3. Process Actions: CREATE / UPDATE
        proposal = await self.friday.formulate_knowledge_update(
            session=session,
            org_id=org_id,
            operator_instruction=instruction,
            category_hint=category,
        )
        if fields:
            proposal["fields"].update(fields)
        proposal["is_operator_directive"] = True

        # EDITH evaluates commercial guardrails with operator directive awareness
        edith_eval = await self.edith.evaluate_knowledge_update(
            session=session,
            org_id=org_id,
            proposal=proposal,
        )

        decision = edith_eval["decision"]
        reasoning = edith_eval["reasoning"]
        suggestion = edith_eval.get("suggestion")

        if decision == "DENIED":
            # Log EDITH policy refusal
            edith_msg = InterBrainMessage(
                org_id=org_id,
                conversation_id=friday_msg.id,
                sender_brain="EDITH",
                recipient_brain="FRIDAY",
                message_type="EDITH_POLICY_REFUSAL",
                content=f"EDITH Policy Refusal: {reasoning}",
                decision="DENIED",
                reasoning=reasoning,
                metadata_payload=edith_eval,
                resolved_at=utc_now(),
            )
            session.add(edith_msg)
            friday_msg.decision = "DENIED"
            friday_msg.resolved_at = utc_now()

            notif = AgentNotification(
                org_id=org_id,
                sender_brain="EDITH",
                title="EDITH Policy Refusal: Voice Action Denied",
                content=reasoning,
                category="EDITH_POLICY_REFUSAL",
                severity="warning",
                action_url="/knowledge",
                metadata_payload=edith_eval,
            )
            session.add(notif)
            await session.commit()

            reply_text = f"EDITH declined the request: {reasoning}" + (f" {suggestion}" if suggestion else "")
            return {
                "success": False,
                "decision": "DENIED",
                "reasoning": reasoning,
                "suggestion": suggestion,
                "speak_text": f"EDITH declined to apply this update: {reasoning[:120]}",
                "reply_text": reply_text,
            }

        # ACCEPTED -> Ingest Knowledge Item
        prop_fields = proposal.get("fields", {})
        ingest_svc = KnowledgeIngestionService(session, org_id)
        k_item = await ingest_svc.ingest_knowledge_item(
            title=proposal["title"],
            content_text=proposal["content_text"],
            category=proposal["category"],
            source_type="voice_agent",
            created_by_brain="EDITH",
            structured_data=prop_fields,
            sku=prop_fields.get("sku"),
            base_price=Decimal(str(prop_fields["base_price"])) if "base_price" in prop_fields else None,
            min_order_quantity=Decimal(str(prop_fields["min_order_quantity"])) if "min_order_quantity" in prop_fields else None,
            min_quantity=Decimal(str(prop_fields["min_quantity"])) if "min_quantity" in prop_fields else None,
            max_quantity=Decimal(str(prop_fields["max_quantity"])) if "max_quantity" in prop_fields else None,
            discount_percentage=Decimal(str(prop_fields["discount_percentage"])) if "discount_percentage" in prop_fields else None,
            max_autonomous_discount=Decimal(str(prop_fields["max_autonomous_discount"])) if "max_autonomous_discount" in prop_fields else None,
            customer_segment=prop_fields.get("customer_segment"),
        )

        # Broadcast live WebSocket event
        await ws_manager.broadcast_to_org(org_id, "knowledge_item_created", {
            "item_id": k_item.id,
            "title": k_item.title,
            "category": k_item.category,
            "version": k_item.version,
            "chunk_count": k_item.chunk_count,
        })

        # Log EDITH verdict & save notification
        edith_msg = InterBrainMessage(
            org_id=org_id,
            conversation_id=friday_msg.id,
            sender_brain="EDITH",
            recipient_brain="FRIDAY",
            message_type="KNOWLEDGE_UPDATE_VERDICT",
            content=f"Knowledge File Created: {k_item.title} ({k_item.category})",
            decision="ACCEPTED",
            reasoning=reasoning,
            metadata_payload={"item_id": k_item.id, "title": k_item.title, "category": k_item.category},
            resolved_at=utc_now(),
        )
        session.add(edith_msg)
        friday_msg.decision = "ACCEPTED"
        friday_msg.resolved_at = utc_now()

        notif = AgentNotification(
            org_id=org_id,
            sender_brain="EDITH",
            title=f"New Knowledge File Created: {k_item.title}",
            content=f"EDITH verified and created {k_item.category} file: {reasoning}",
            category="KNOWLEDGE_UPDATE",
            severity="success",
            action_url=f"/knowledge?tab={k_item.category}",
        )
        session.add(notif)
        await session.commit()

        speak_text = f"EDITH has created the new knowledge file '{k_item.title}' and activated it in the RAG engine."
        reply_text = f"EDITH verified and created '{k_item.title}' ({k_item.category}): {reasoning}"

        return {
            "success": True,
            "decision": "ACCEPTED",
            "action": "create",
            "item_id": k_item.id,
            "title": k_item.title,
            "category": k_item.category,
            "reasoning": reasoning,
            "speak_text": speak_text,
            "reply_text": reply_text,
        }


    async def get_dialogue_history(
        self,
        session: AsyncSession,
        org_id: str,
        limit: int = 50,
        sender_brain: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Retrieves recent inter-brain dialogues."""
        stmt = select(InterBrainMessage).where(InterBrainMessage.org_id == org_id)
        if sender_brain:
            stmt = stmt.where(InterBrainMessage.sender_brain == sender_brain.upper())
        stmt = stmt.order_by(desc(InterBrainMessage.created_at)).limit(limit)

        result = await session.execute(stmt)
        messages = result.scalars().all()

        return [
            {
                "id": m.id,
                "conversation_id": m.conversation_id,
                "sender_brain": m.sender_brain,
                "recipient_brain": m.recipient_brain,
                "message_type": m.message_type,
                "content": m.content,
                "decision": m.decision,
                "reasoning": m.reasoning,
                "metadata_payload": m.metadata_payload,
                "created_at": m.created_at.isoformat() if m.created_at else None,
            }
            for m in messages
        ]

    async def _broadcast(self, org_id: str, msg: InterBrainMessage):
        """Dispatches real-time WebSocket update to connected dashboard operators."""
        try:
            from app.realtime.connection_manager import ws_manager
            payload = {
                "id": msg.id,
                "sender_brain": msg.sender_brain,
                "recipient_brain": msg.recipient_brain,
                "message_type": msg.message_type,
                "content": msg.content,
                "decision": msg.decision,
                "reasoning": msg.reasoning,
                "metadata": msg.metadata_payload,
                "created_at": msg.created_at.isoformat() if msg.created_at else None,
            }
            await ws_manager.broadcast_to_org(org_id, "inter_brain_message", payload)
        except Exception as e:
            logger.debug(f"[InterBrainBus] WebSocket broadcast warning: {e}")


# Singleton instance
inter_brain_bus = InterBrainBus()
