"""
Autonomous Follow-up Engine and Active Cancellation Guards (ADR-009, Section 35, 36, 37).

Enforces WhatsApp Business Messaging Policy:
- Day 0, Day 1, Day 3 sequence.
- Immediate cancellation upon customer reply, human takeover, or opt-out.
- Pre-dispatch guard evaluation before every message send.
"""

from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.base import utc_now
from app.database.models import Conversation, Customer, FollowupJob, Message
from app.utils.logging import logger


class FollowupScheduler:
    """
    Schedules and executes compliant follow-ups with automatic cancellation logic.
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
        Schedules the standard Day 0, Day 1, and Day 3 follow-up cadence.
        """
        now = base_time or utc_now()
        jobs: List[FollowupJob] = []

        # Step 1: Day 0 (e.g. +2 hours after initial outreach if no response)
        step1_time = now + timedelta(minutes=settings.FOLLOWUP_DAY_0_MINUTES)
        j1 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=step1_time,
            step=1,
            status="scheduled",
            template_id="followup_step_1_gentle_nudge",
        )
        jobs.append(j1)

        # Step 2: Day 1 (+24 hours)
        step2_time = now + timedelta(hours=settings.FOLLOWUP_DAY_1_HOURS)
        j2 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=step2_time,
            step=2,
            status="scheduled",
            template_id="followup_step_2_value_proposition",
        )
        jobs.append(j2)

        # Step 3: Day 3 (+72 hours, final follow-up)
        step3_time = now + timedelta(hours=settings.FOLLOWUP_DAY_3_HOURS)
        j3 = FollowupJob(
            org_id=self.org_id,
            conversation_id=conversation_id,
            customer_id=customer_id,
            campaign_id=campaign_id,
            scheduled_for=step3_time,
            step=3,
            status="scheduled",
            template_id="followup_step_3_breakaway",
        )
        jobs.append(j3)

        self.session.add_all(jobs)
        await self.session.commit()
        logger.info(f"Scheduled 3-step follow-up sequence for conversation '{conversation_id}'.")
        return jobs

    async def cancel_pending_followups(
        self,
        conversation_id: str,
        reason: str = "customer_replied",
    ) -> int:
        """
        Immediately transitions all scheduled follow-ups to 'cancelled' (Section 37).
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

    async def evaluate_and_execute_due(self) -> List[Dict[str, Any]]:
        """
        Polls due follow-ups, evaluates pre-flight policy guards, and dispatches.
        """
        now = utc_now()
        stmt = (
            select(FollowupJob)
            .where(
                FollowupJob.org_id == self.org_id,
                FollowupJob.status == "scheduled",
                FollowupJob.scheduled_for <= now,
            )
            .limit(20)
        )
        res = await self.session.execute(stmt)
        due_jobs = res.scalars().all()

        results: List[Dict[str, Any]] = []

        for job in due_jobs:
            conv = await self.session.get(Conversation, job.conversation_id)
            cust = await self.session.get(Customer, job.customer_id)

            # Pre-flight Guard 1: Has customer opted out?
            if cust and not cust.opt_in_status:
                job.status = "cancelled"
                job.cancel_reason = "customer_opted_out"
                results.append({"job_id": job.id, "status": "cancelled", "reason": "opted_out"})
                continue

            # Pre-flight Guard 2: Has human taken over or conversation closed?
            if conv and conv.mode in ("HUMAN", "PAUSED", "CLOSED"):
                job.status = "suppressed"
                job.cancel_reason = f"mode_{conv.mode.lower()}"
                results.append({"job_id": job.id, "status": "suppressed", "reason": f"mode_{conv.mode}"})
                continue

            # Pre-flight Guard 3: Has customer replied since scheduling?
            # Check latest inbound message
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

            # Execute follow-up send
            job.status = "sent"
            job.attempt_count += 1

            # Dispatch outbound follow-up message
            followup_content = (
                "Hi there! Following up from North Bengal Tea Co. regarding your wholesale tea requirements. "
                "Did you have any questions about our seasonal Darjeeling or Assam CTC tasting samples?"
            )
            followup_msg = Message(
                org_id=self.org_id,
                conversation_id=job.conversation_id,
                direction="outbound",
                sender_type="agent",
                content=followup_content,
                delivery_status="sent",
            )
            self.session.add(followup_msg)
            results.append({"job_id": job.id, "status": "sent"})

        await self.session.commit()
        return results
