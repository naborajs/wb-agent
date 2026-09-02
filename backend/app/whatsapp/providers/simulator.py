"""
Simulator WhatsApp Provider (Section 39).

Provides stateful, in-memory WhatsApp messaging for tests and development.
"""

from datetime import datetime, timezone
import uuid
from typing import Any, Dict, List, Optional
from app.database.base import utc_now
from app.utils.phone import normalize_phone_number
from app.whatsapp.base import WhatsAppProvider
from app.whatsapp.models import InboundWhatsAppEvent, OutboundWhatsAppResult


class SimulatorWhatsAppProvider(WhatsAppProvider):
    """
    High-fidelity local simulator emulating the Meta WhatsApp Cloud API.
    """

    def __init__(self, verify_token: str = "wb_agent_verify_token"):
        self.verify_token = verify_token
        self.outbox: List[Dict[str, Any]] = []
        self.message_statuses: Dict[str, str] = {}
        self.fail_next_send: bool = False

    async def send_message(self, to_phone: str, text: str) -> OutboundWhatsAppResult:
        if self.fail_next_send:
            self.fail_next_send = False
            return OutboundWhatsAppResult(
                success=False,
                error_message="Simulated carrier timeout failure (504 Gateway Timeout)",
            )

        norm_phone = normalize_phone_number(to_phone)
        msg_id = f"wamid_sim_{uuid.uuid4().hex[:12]}"

        record = {
            "id": msg_id,
            "to": norm_phone,
            "type": "text",
            "text": text,
            "timestamp": utc_now().isoformat(),
            "status": "sent",
        }
        self.outbox.append(record)
        self.message_statuses[msg_id] = "sent"

        return OutboundWhatsAppResult(
            success=True,
            provider_message_id=msg_id,
            raw_response=record,
        )

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> OutboundWhatsAppResult:
        norm_phone = normalize_phone_number(to_phone)
        msg_id = f"wamid_sim_tpl_{uuid.uuid4().hex[:12]}"
        record = {
            "id": msg_id,
            "to": norm_phone,
            "type": "template",
            "template_name": template_name,
            "language": language_code,
            "components": components or [],
            "timestamp": utc_now().isoformat(),
            "status": "sent",
        }
        self.outbox.append(record)
        self.message_statuses[msg_id] = "sent"

        return OutboundWhatsAppResult(
            success=True,
            provider_message_id=msg_id,
            raw_response=record,
        )

    async def mark_read(self, message_id: str) -> bool:
        if message_id in self.message_statuses:
            self.message_statuses[message_id] = "read"
            return True
        return False

    def parse_webhook(self, payload: Dict[str, Any]) -> List[InboundWhatsAppEvent]:
        """
        Parses simulated incoming webhook payload into normalized InboundWhatsAppEvents.
        """
        events: List[InboundWhatsAppEvent] = []
        if "entry" in payload:
            for entry in payload.get("entry", []):
                for change in entry.get("changes", []):
                    val = change.get("value", {})
                    # Inbound messages
                    for m in val.get("messages", []):
                        events.append(
                            InboundWhatsAppEvent(
                                event_type="message",
                                sender_phone=normalize_phone_number(m.get("from")),
                                message_id=m.get("id", f"sim_{uuid.uuid4().hex[:8]}"),
                                timestamp=utc_now(),
                                content=m.get("text", {}).get("body", ""),
                                raw_payload=m,
                            )
                        )
                    # Status receipts
                    for s in val.get("statuses", []):
                        events.append(
                            InboundWhatsAppEvent(
                                event_type="status_update",
                                sender_phone=normalize_phone_number(s.get("recipient_id")),
                                message_id=s.get("id"),
                                timestamp=utc_now(),
                                status=s.get("status"),
                                raw_payload=s,
                            )
                        )
        return events

    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        return None

    async def health_check(self) -> bool:
        return True
