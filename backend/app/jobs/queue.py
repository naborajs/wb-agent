"""
Durable PostgreSQL-backed Transactional Job Queue (ADR-003, Section 60).

Uses SELECT ... FOR UPDATE SKIP LOCKED for high-concurrency worker consumption.
"""

from datetime import datetime, timedelta, timezone
import random
from typing import Any, Dict, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import utc_now
from app.database.models import Job
from app.utils.logging import logger


class JobQueue:
    """
    Durable queue supporting prioritised scheduling, retries, and dead-letter handling.
    """

    def __init__(self, session: AsyncSession):
        self.session = session

    async def enqueue(
        self,
        org_id: str,
        job_type: str,
        payload: Dict[str, Any],
        priority: int = 5,
        run_at: Optional[datetime] = None,
        max_attempts: int = 5,
    ) -> Job:
        """
        Enqueues a new background job within the current database transaction.
        """
        job = Job(
            org_id=org_id,
            type=job_type,
            payload=payload,
            priority=priority,
            status="pending",
            run_at=run_at or utc_now(),
            max_attempts=max_attempts,
            attempts=0,
        )
        self.session.add(job)
        await self.session.commit()
        return job

    async def claim_next_job(self, worker_id: str) -> Optional[Job]:
        """
        Safely claims the highest-priority pending job that is ready to run.
        Uses with_for_update(skip_locked=True) for lock-free parallel worker scale.
        """
        now = utc_now()
        stmt = (
            select(Job)
            .where(
                Job.status.in_(["pending", "retrying"]),
                Job.run_at <= now,
            )
            .order_by(Job.priority.desc(), Job.run_at.asc())
            .limit(1)
            .with_for_update(skip_locked=True)
        )

        res = await self.session.execute(stmt)
        job = res.scalar_one_or_none()

        if job:
            job.status = "running"
            job.locked_at = now
            job.locked_by = worker_id
            job.started_at = now
            job.attempts += 1
            await self.session.commit()

        return job

    async def complete_job(self, job_id: str):
        """Marks a job as successfully completed."""
        stmt = (
            update(Job)
            .where(Job.id == job_id)
            .values(
                status="completed",
                completed_at=utc_now(),
                locked_at=None,
                locked_by=None,
            )
        )
        await self.session.execute(stmt)
        await self.session.commit()

    async def fail_job(self, job_id: str, error_message: str):
        """
        Applies exponential backoff with jitter or moves to dead_letter if max attempts reached.
        """
        stmt = select(Job).where(Job.id == job_id)
        res = await self.session.execute(stmt)
        job = res.scalar_one_or_none()
        if not job:
            return

        job.last_error = error_message
        job.locked_at = None
        job.locked_by = None

        if job.attempts >= job.max_attempts:
            job.status = "dead_letter"
            logger.error(f"Job {job_id} ({job.type}) moved to dead_letter after {job.attempts} failed attempts.")
        else:
            job.status = "retrying"
            # Exponential backoff with jitter: 2^attempt * 2s + random jitter
            delay = (2 ** job.attempts) * 2 + random.uniform(0.5, 2.0)
            job.run_at = utc_now() + timedelta(seconds=delay)
            logger.warning(f"Job {job_id} ({job.type}) failed (attempt {job.attempts}). Retrying in {delay:.1f}s.")

        await self.session.commit()
