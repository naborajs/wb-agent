"""
Background Job Worker execution daemon (Section 61).

Polls durable job queue, claims pending tasks using SKIP LOCKED,
and dispatches execution to registered domain handlers.
"""

import asyncio
import os
import signal
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.session import get_db_context
from app.jobs.queue import JobQueue
from app.jobs.registry import get_handler
from app.utils.logging import logger


class Worker:
    """
    Concurrent asynchronous job worker.
    """

    def __init__(self, worker_id: Optional[str] = None):
        self.worker_id = worker_id or f"worker_{os.getpid()}_{uuid.uuid4().hex[:6]}"
        self._running = False

    async def execute_one(self, session: AsyncSession) -> bool:
        """
        Polls and executes a single pending job.
        Returns True if a job was found and processed, False if queue was empty.
        """
        queue = JobQueue(session)
        job = await queue.claim_next_job(self.worker_id)
        if not job:
            return False

        logger.info(f"Worker [{self.worker_id}] claimed job {job.id} ({job.type}, priority: {job.priority}).")
        try:
            handler = get_handler(job.type)
            result = await handler(session, job.org_id, job.payload, self.worker_id)
            await queue.complete_job(job.id)
            logger.info(f"Worker [{self.worker_id}] completed job {job.id}.")
            return True
        except Exception as e:
            logger.error(f"Worker [{self.worker_id}] failed executing job {job.id}: {e}")
            await queue.fail_job(job.id, str(e))
            return True

    async def start(self, poll_interval: float = 1.0):
        """Starts continuous polling loop."""
        self._running = True
        logger.info(f"Worker daemon [{self.worker_id}] started. Polling every {poll_interval}s.")

        while self._running:
            try:
                async with get_db_context() as session:
                    processed = await self.execute_one(session)
                    if not processed:
                        await asyncio.sleep(poll_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Worker daemon error: {e}")
                await asyncio.sleep(poll_interval)

        logger.info(f"Worker daemon [{self.worker_id}] stopped.")

    def stop(self):
        self._running = False


if __name__ == "__main__":
    worker = Worker()
    asyncio.run(worker.start())
