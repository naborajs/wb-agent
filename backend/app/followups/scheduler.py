"""
Autonomous Human-Like Follow-Up Engine and Smart Pre-Flight Reasoner for EDITH (Sections 36, 37, 38, 39, 81, 83).

Implements deliberate, respectful pacing for customer inactivity:
- Touch 1: ~15 to 20 minutes (gentle conversational check-in if user went silent mid-chat)
- Touch 2: ~7 to 8 hours (friendly assistance on catalog and wholesale samples)
- Touch 3: ~1 week (polite, zero-pressure closure)

Strict Pre-Flight Guards:
1. Active cancellation upon customer reply
2. Active suppression upon human operator takeover (HUMAN/PAUSED/CLOSED)
3. Strict opt-out compliance (only on explicit user request, never on silence)
4. Anti-spam throttle (never send consecutive automated messages within 15 minutes)
5. Quiet-hours compliance (optional guard: reschedules if between 9 PM and 9 AM IST)
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import utc_now
from app.database.models import Conversation, Customer, FollowupJob, Message
from app.utils.logging import logger
from app.whatsapp.service import WhatsAppService


# Standard Human-Like Follow-Up Templates
FOLLOWUP_TEMPLATES = {
    "followup_touch_1_inactivity_check": (
        "Hey, just checking in—take your time! If there's any specific requirement or question "
        "you had about our estate teas or pricing, please feel free to share and I'll be glad to help."
    ),
    "followup_touch_2_catalog_assistance": (
        "Hi there, hope you're having a good day. Just following up to see if you had any questions "
        "about our wholesale catalog or 200g tasting samples for your establishment. Happy to assist whenever convenient for you!"
    ),
    "followup_touch_3_gentle_closure": (
        "Hi there, I wanted to check in one last time in case you're still considering estate teas for your business. "
        "I won't trouble you with further messages, but whenever you're ready or if you'd ever like sample packs, "
        "feel free to drop a message anytime. Wish you the very best!"
    ),
}


class FollowupScheduler:
    """
    Schedules and executes respectful, human-paced follow-ups with comprehensive pre-flight guards.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def schedule_sequence(
        self,
        conversation_id: str,
        customer_id: str,
        campaign_id: Optional[str] = None,
        base_time: Optional[datetime] = None,
    ) -> List[FollowupJob]:
        """
        Schedules a human-like 3-touch follow-up sequence:
        - Touch 1: +15 minutes (inactivity check)
        - Touch 2: +8 hours (mid-term assistance)
        - Touch 3: +7 days (respectful 1-week closure)
        """
        now = base_time or utc_now()
        jobs: List[FollowupJob] = []

        # Touch 1: ~15 minutes after silence
        t1_time = now + timedelta(minutes=15)
        j1 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=t1_time,
            step=1,
            status="scheduled",
            template_id="followup_touch_1_inactivity_check",
        )
        jobs.append(j1)

        # Touch 2: ~8 hours later
        t2_time = now + timedelta(hours=8)
        j2 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=t2_time,
            step=2,
            status="scheduled",
            template_id="followup_touch_2_catalog_assistance",
        )
        jobs.append(j2)

        # Touch 3: ~7 days later (1 week polite closure)
        t3_time = now + timedelta(days=7)
        j3 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=t3_time,
            step=3,
            status="scheduled",
            template_id="followup_touch_3_gentle_closure",
        )
        jobs.append(j3)

        self.session.add_all(jobs)
        await self.session.commit()
        logger.info(f"Scheduled 3-step human follow-up cadence (+15m, +8h, +7d) for conv '{conversation_id}'.")
        return jobs

    async def cancel_pending_followups(
        self,
        conversation_id: str,
        reason: str = "customer_replied",
    ) -> int:
        """
        Immediately transitions scheduled follow-ups to 'cancelled' upon reply, takeover, or opt-out.
        """
        stmt = (
            update(FollowupJob)
            .where(
                FollowupJob.org_id == self.org_id,
                FollowupJob.conversation_id == conversation_id,
                FollowupJob.status == "scheduled",
            )
            .values(
                status="cancelled",
                cancel_reason=reason,
                updated_at=utc_now(),
            )
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        cancelled_count = res.rowcount
        if cancelled_count > 0:
            logger.info(f"Cancelled {cancelled_count} pending follow-up(s) for conv '{conversation_id}' ({reason}).")
        return cancelled_count

    async def evaluate_and_execute_due(self, enforce_quiet_hours: bool = False) -> List[Dict[str, Any]]:
        """
        Evaluates and dispatches due follow-up jobs through strict pre-flight checks.
        """
        now = utc_now()
        stmt = (
            select(FollowupJob)
            .where(
                FollowupJob.org_id == self.org_id,
                FollowupJob.status == "scheduled",
                FollowupJob.scheduled_for <= now,
            )
            .limit(15)
        )
        res = await self.session.execute(stmt)
        due_jobs = res.scalars().all()

        results: List[Dict[str, Any]] = []

        for job in due_jobs:
            conv = await self.session.get(Conversation, job.conversation_id)
            cust = await self.session.get(Customer, job.customer_id)

            # Pre-flight Guard 1: Opt-Out Check
            if cust and not cust.opt_in_status:
                job.status = "cancelled"
                job.cancel_reason = "customer_opted_out"
                results.append({"job_id": job.id, "status": "cancelled", "reason": "opted_out"})
                continue

            # Pre-flight Guard 2: Human Takeover or Closed
            if conv and conv.mode in ("HUMAN", "PAUSED", "CLOSED"):
                job.status = "suppressed"
                job.cancel_reason = f"mode_{conv.mode.lower()}"
                results.append({"job_id": job.id, "status": "suppressed", "reason": f"mode_{conv.mode}"})
                continue

            # Pre-flight Guard 3: Customer Replied Since Scheduling
            latest_msg_stmt = (
                select(Message)
                .where(
                    Message.conversation_id == job.conversation_id,
                    Message.direction == "inbound",
                    Message.created_at > job.created_at,
                )
            )
            latest_reply = (await self.session.execute(latest_msg_stmt)).scalar_one_or_none()
            if latest_reply:
                job.status = "cancelled"
                job.cancel_reason = "customer_replied"
                results.append({"job_id": job.id, "status": "cancelled", "reason": "customer_replied"})
                continue

            # Pre-flight Guard 4: Anti-Spam Throttle (15 min cooldown)
            recent_outbound_stmt = (
                select(Message)
                .where(
                    Message.conversation_id == job.conversation_id,
                    Message.direction == "outbound",
                    Message.created_at >= now - timedelta(minutes=15),
                )
            )
            recent_outbound = (await self.session.execute(recent_outbound_stmt)).scalar_one_or_none()
            if recent_outbound:
                job.scheduled_for = now + timedelta(minutes=15)
                results.append({"job_id": job.id, "status": "postponed", "reason": "recent_outbound_throttle"})
                continue

            # Pre-flight Guard 5: Optional Quiet Hours Check
            if enforce_quiet_hours:
                ist_hour = (now.hour + 5 + (1 if now.minute + 30 >= 60 else 0)) % 24
                if ist_hour >= 21 or ist_hour < 9:
                    job.scheduled_for = now + timedelta(hours=4)
                    results.append({"job_id": job.id, "status": "postponed", "reason": "quiet_hours_ist"})
                    continue

            # Template Content Retrieval
            followup_content = FOLLOWUP_TEMPLATES.get(
                job.template_id,
                FOLLOWUP_TEMPLATES["followup_touch_1_inactivity_check"],
            )

            # Send outbound message via WhatsApp Provider
            provider_msg_id = None
            try:
                wa = WhatsAppService.get_provider()
                if conv and conv.channel_id:
                    send_res = await wa.send_message(to_phone=conv.channel_id, text=followup_content)
                    if send_res and send_res.provider_message_id:
                        provider_msg_id = send_res.provider_message_id
            except Exception as e:
                logger.error(f"Failed to dispatch follow-up to {conv.channel_id if conv else 'unknown'}: {e}")

            # Record outbound message in database
            followup_msg = Message(
                org_id=self.org_id,
                conversation_id=job.conversation_id,
                direction="outbound",
                sender_type="agent",
                content=followup_content,
                delivery_status="sent",
                provider_message_id=provider_msg_id,
            )
            self.session.add(followup_msg)

            job.status = "sent"
            job.attempt_count += 1
            results.append({"job_id": job.id, "status": "sent"})

        await self.session.commit()
        return results
