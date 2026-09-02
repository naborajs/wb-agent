"""
WhatsApp Provider Interface (ADR-005, Section 38).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from app.whatsapp.models import InboundWhatsAppEvent, OutboundWhatsAppResult


class WhatsAppProvider(ABC):
    """
    Abstract interface for WhatsApp messaging providers (Simulator, Development, Meta Cloud API).
    """

    @abstractmethod
    async def send_message(self, to_phone: str, text: str) -> OutboundWhatsAppResult:
        """Sends a standard text message."""
        pass

    @abstractmethod
    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> OutboundWhatsAppResult:
        """Sends an approved WhatsApp Business Template message."""
        pass

    @abstractmethod
    async def mark_read(self, message_id: str) -> bool:
        """Sends a read receipt back to WhatsApp."""
        pass

    @abstractmethod
    def parse_webhook(self, payload: Dict[str, Any]) -> List[InboundWhatsAppEvent]:
        """Parses an inbound provider webhook payload into normalized events."""
        pass

    @abstractmethod
    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """Handles WhatsApp webhook GET verification request."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Checks API reachability."""
        pass
