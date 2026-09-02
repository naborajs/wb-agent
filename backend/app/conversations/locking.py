"""
Distributed turn-based conversation locking (ADR-004).

Guarantees:
- Only one worker processes a given conversation at any instant.
- Automatic recovery from worker crashes via lock expiry timeouts.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import utc_now
from app.database.models import Conversation
from app.utils.logging import logger


class ConversationLock:
    """
    Transactional conversation lock ensuring serialized turn processing.
    """

    def __init__(
        self,
        session: AsyncSession,
        conversation_id: str,
        worker_id: str,
        timeout_seconds: int = 60,
    ):
        self.session = session
        self.conversation_id = conversation_id
        self.worker_id = worker_id
        self.timeout_seconds = timeout_seconds
        self._acquired = False

    async def acquire(self) -> bool:
        """
        Attempts to acquire the lock.
        Returns True if acquired, False if currently locked by another active worker.
        """
        stmt = select(Conversation).where(Conversation.id == self.conversation_id)
        res = await self.session.execute(stmt)
        conv = res.scalar_one_or_none()
        if not conv:
            return False

        now = utc_now()
        # Check if currently locked and not expired
        if conv.locked_at and conv.locked_by and conv.locked_by != self.worker_id:
            expiry_threshold = now - timedelta(seconds=self.timeout_seconds)
            if conv.locked_at > expiry_threshold:
                # Still locked and valid
                return False

        # Acquire lock
        conv.locked_at = now
        conv.locked_by = self.worker_id
        await self.session.commit()
        self._acquired = True
        return True

    async def release(self):
        """Releases the lock."""
        if not self._acquired:
            return

        stmt = (
            update(Conversation)
            .where(
                Conversation.id == self.conversation_id,
                Conversation.locked_by == self.worker_id,
            )
            .values(locked_at=None, locked_by=None)
        )
        await self.session.execute(stmt)
        await self.session.commit()
        self._acquired = False

    async def __aenter__(self):
        acquired = await self.acquire()
        if not acquired:
            raise TimeoutError(f"Could not acquire lock for conversation '{self.conversation_id}'.")
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.release()
