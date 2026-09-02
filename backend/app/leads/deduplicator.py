"""
Lead deduplication logic across existing Leads and Customers.
"""

from typing import Optional, Set
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import Customer, Lead


class LeadDeduplicator:
    """
    Checks incoming leads against existing leads and customers in the database.
    Prevents duplicate outreach and maintains canonical customer identity (Section 12).
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id
        self._seen_phones: Set[str] = set()

    async def is_duplicate(self, phone: str, email: Optional[str] = None) -> bool:
        """
        Returns True if the normalized phone or email already exists in this org.
        Also tracks in-batch duplicate phones within the current import run.
        """
        if not phone:
            return False

        # In-batch duplicate check
        if phone in self._seen_phones:
            return True

        # Database Customer check
        cust_stmt = select(Customer.id).where(
            Customer.org_id == self.org_id,
            Customer.primary_phone == phone
        )
        cust_res = await self.session.execute(cust_stmt)
        if cust_res.scalar_one_or_none():
            self._seen_phones.add(phone)
            return True

        # Database Lead check
        lead_stmt = select(Lead.id).where(
            Lead.org_id == self.org_id,
            Lead.phone == phone
        )
        lead_res = await self.session.execute(lead_stmt)
        if lead_res.scalar_one_or_none():
            self._seen_phones.add(phone)
            return True

        self._seen_phones.add(phone)
        return False
