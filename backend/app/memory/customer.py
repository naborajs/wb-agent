"""
Structured Long-Term Customer Memory Management (Section 20 & 21).

Stores and verifies discrete customer facts, preferences, commercial constraints,
and objections across conversations with confidence scores and verification states:
- 'CUSTOMER_SAID': Directly stated by customer.
- 'SYSTEM_VERIFIED': Checked against database or CRM.
- 'AI_INFERRED': Inferred by agent reasoning (requires confirmation before asserting).
- 'HUMAN_CONFIRMED': Verified or edited by human sales operator.
"""

from typing import Any, Dict, List, Optional
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import CustomerMemory
from app.utils.logging import logger


class CustomerMemoryService:
    """
    Manages persistent, structured customer facts and constraints.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def get_memories(
        self,
        customer_id: str,
        category: Optional[str] = None,
    ) -> List[CustomerMemory]:
        """Fetches active customer memories, optionally filtered by category."""
        stmt = select(CustomerMemory).where(
            CustomerMemory.org_id == self.org_id,
            CustomerMemory.customer_id == customer_id,
        )
        if category:
            stmt = stmt.where(CustomerMemory.category == category)
        res = await self.session.execute(stmt)
        return list(res.scalars().all())

    async def save_fact(
        self,
        customer_id: str,
        category: str,
        key: str,
        value: Any,
        confidence: float = 1.0,
        verification_status: str = "CUSTOMER_SAID",
        source: str = "conversation",
    ) -> CustomerMemory:
        """
        Inserts or updates a customer memory fact.
        """
        stmt = select(CustomerMemory).where(
            CustomerMemory.org_id == self.org_id,
            CustomerMemory.customer_id == customer_id,
            CustomerMemory.category == category,
            CustomerMemory.key == key,
        )
        res = await self.session.execute(stmt)
        existing = res.scalar_one_or_none()

        if existing:
            existing.value = value
            existing.confidence = confidence
            existing.verification_status = verification_status
            existing.source = source
            await self.session.commit()
            return existing

        new_memory = CustomerMemory(
            org_id=self.org_id,
            customer_id=customer_id,
            category=category,
            key=key,
            value=value,
            confidence=confidence,
            verification_status=verification_status,
            source=source,
        )
        self.session.add(new_memory)
        await self.session.commit()
        return new_memory

    async def delete_memory(self, memory_id: str) -> bool:
        """Deletes a customer memory item."""
        stmt = delete(CustomerMemory).where(
            CustomerMemory.id == memory_id,
            CustomerMemory.org_id == self.org_id,
        )
        res = await self.session.execute(stmt)
        await self.session.commit()
        return res.rowcount > 0

    async def get_memory_dict(self, customer_id: str) -> Dict[str, Any]:
        """Returns structured dictionary of verified memories grouped by category."""
        memories = await self.get_memories(customer_id)
        grouped: Dict[str, Dict[str, Any]] = {}
        for m in memories:
            if m.category not in grouped:
                grouped[m.category] = {}
            grouped[m.category][m.key] = {
                "value": m.value,
                "confidence": m.confidence,
                "status": m.verification_status,
            }
        return grouped
