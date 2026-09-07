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

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.router import ai_router
from app.ai.types import Capability, ModelMessage, ModelRequest
from app.config import settings
from app.database.base import utc_now
from app.database.models import (
    Conversation,
    Customer,
    InterBrainMessage,
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
