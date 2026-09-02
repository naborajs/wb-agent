"""
Abstract base class and protocol for external lead sources.
"""

from abc import ABC, abstractmethod
from typing import Any, AsyncGenerator, Dict, Optional


class LeadSource(ABC):
    """
    Abstract interface for lead acquisition sources (CSV, Apify, CRM, Webhook).
    """

    @abstractmethod
    async def fetch_leads(self) -> AsyncGenerator[Dict[str, Any], None]:
        """
        Asynchronously streams raw lead dictionaries from the external source.
        """
        pass
