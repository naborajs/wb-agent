"""
Meta Cloud WhatsApp API Provider (Graph API v20.0+, Section 40).

Official integration supporting:
- Inbound webhook parsing and HMAC-SHA256 signature verification.
- Outbound messages and template dispatches.
- Read receipts and delivery telemetry.
"""

import hashlib
import hmac
from typing import Any, Dict, List, Optional
import httpx
from app.database.base import utc_now
from app.utils.logging import logger
from app.utils.phone import normalize_phone_number
from app.whatsapp.base import WhatsAppProvider
from app.whatsapp.models import InboundWhatsAppEvent, OutboundWhatsAppResult


class MetaCloudWhatsAppProvider(WhatsAppProvider):
    """
    Production adapter communicating directly with Meta Graph API.
    """

    def __init__(
        self,
        phone_number_id: str,
        access_token: str,
        verify_token: str,
        app_secret: Optional[str] = None,
        api_version: str = "v20.0",
        timeout: int = 30,
    ):
        self.phone_number_id = phone_number_id
        self.access_token = access_token
        self.verify_token = verify_token
        self.app_secret = app_secret
        self.api_version = api_version
        self.timeout = timeout
        self.base_url = f"https://graph.facebook.com/{self.api_version}"

    def verify_signature(self, payload_bytes: bytes, signature_header: str) -> bool:
        """
        Validates the X-Hub-Signature-256 header sent by Meta using the App Secret.
        """
        if not self.app_secret:
            return True  # If secret not configured in dev, skip
        if not signature_header or not signature_header.startswith("sha256="):
            return False

        expected_sig = hmac.new(
            self.app_secret.encode("utf-8"),
            payload_bytes,
            hashlib.sha256,
        ).hexdigest()
        received_sig = signature_header.split("sha256=")[1]
        return hmac.compare_digest(expected_sig, received_sig)

    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        """Handles Meta GET webhook registration challenge."""
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        return None

    def parse_webhook(self, payload: Dict[str, Any]) -> List[InboundWhatsAppEvent]:
        """
        Parses incoming Meta Cloud API webhook into standardized InboundWhatsAppEvents.
        """
        events: List[InboundWhatsAppEvent] = []
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                val = change.get("value", {})
                
                # 1. Incoming customer messages
                for msg in val.get("messages", []):
                    sender = msg.get("from", "")
                    content = ""
                    if msg.get("type") == "text":
                        content = msg.get("text", {}).get("body", "")
                    elif msg.get("type") == "interactive":
                        # Button reply or list reply
                        interactive = msg.get("interactive", {})
                        if "button_reply" in interactive:
                            content = interactive["button_reply"].get("title", "")
                        elif "list_reply" in interactive:
                            content = interactive["list_reply"].get("title", "")

                    try:
                        norm_sender = normalize_phone_number(sender)
                    except Exception:
                        norm_sender = f"+{sender}"

                    events.append(
                        InboundWhatsAppEvent(
                            event_type="message",
                            sender_phone=norm_sender,
                            message_id=msg.get("id"),
                            timestamp=utc_now(),
                            content=content,
                            raw_payload=msg,
                        )
                    )

                # 2. Outbound status updates (delivered, read, failed)
                for status in val.get("statuses", []):
                    recipient = status.get("recipient_id", "")
                    try:
                        norm_recipient = normalize_phone_number(recipient)
                    except Exception:
                        norm_recipient = f"+{recipient}"

                    events.append(
                        InboundWhatsAppEvent(
                            event_type="status_update",
                            sender_phone=norm_recipient,
                            message_id=status.get("id"),
                            timestamp=utc_now(),
                            status=status.get("status"),
                            raw_payload=status,
                        )
                    )
        return events

    async def send_message(self, to_phone: str, text: str) -> OutboundWhatsAppResult:
        """Sends an outbound WhatsApp text message via Meta Cloud API."""
        norm_phone = normalize_phone_number(to_phone).lstrip("+")
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": norm_phone,
            "type": "text",
            "text": {"preview_url": False, "body": text},
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                return OutboundWhatsAppResult(
                    success=False,
                    error_message=resp.text,
                    raw_response=resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {},
                )
            data = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id")
            return OutboundWhatsAppResult(
                success=True,
                provider_message_id=msg_id,
                raw_response=data,
            )

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> OutboundWhatsAppResult:
        norm_phone = normalize_phone_number(to_phone).lstrip("+")
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json",
        }
        payload = {
            "messaging_product": "whatsapp",
            "to": norm_phone,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language_code},
                "components": components or [],
            },
        }

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            if resp.status_code >= 400:
                return OutboundWhatsAppResult(success=False, error_message=resp.text)
            data = resp.json()
            msg_id = data.get("messages", [{}])[0].get("id")
            return OutboundWhatsAppResult(success=True, provider_message_id=msg_id, raw_response=data)

    async def mark_read(self, message_id: str) -> bool:
        url = f"{self.base_url}/{self.phone_number_id}/messages"
        headers = {"Authorization": f"Bearer {self.access_token}", "Content-Type": "application/json"}
        payload = {"messaging_product": "whatsapp", "status": "read", "message_id": message_id}
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                return resp.status_code == 200
        except Exception:
            return False

    async def health_check(self) -> bool:
        if not self.access_token or self.access_token == "mock_access_token":
            return False
        try:
            url = f"{self.base_url}/{self.phone_number_id}"
            headers = {"Authorization": f"Bearer {self.access_token}"}
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.status_code == 200
        except Exception:
            return False
