"""
Baileys Multi-Device WhatsApp Bridge Provider.
Connects the Python backend to the local Baileys Node.js bridge service.
"""

from typing import Any, Dict, List, Optional
import httpx
from app.utils.logging import logger
from app.utils.phone import normalize_phone_number
from app.whatsapp.base import WhatsAppProvider
from app.whatsapp.models import InboundWhatsAppEvent, OutboundWhatsAppResult


class BridgeWhatsAppProvider(WhatsAppProvider):
    """
    WhatsApp provider routing messages via the local Baileys Multi-Device bridge.
    """

    def __init__(self, bridge_url: str = "http://localhost:3001"):
        self.bridge_url = bridge_url.rstrip("/")

    async def send_message(self, to_phone: str, text: str) -> OutboundWhatsAppResult:
        norm_phone = normalize_phone_number(to_phone)
        url = f"{self.bridge_url}/send"
        payload = {"to": norm_phone, "text": text}

        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()
                if resp.status_code == 200 and data.get("success"):
                    return OutboundWhatsAppResult(
                        success=True,
                        provider_message_id=data.get("messageId"),
                        raw_response=data,
                    )
                return OutboundWhatsAppResult(
                    success=False,
                    error_message=data.get("error", f"HTTP {resp.status_code}"),
                    raw_response=data,
                )
        except Exception as e:
            logger.error(f"Failed to dispatch message via WhatsApp bridge ({e})")
            return OutboundWhatsAppResult(
                success=False,
                error_message=str(e),
            )

    async def send_template(
        self,
        to_phone: str,
        template_name: str,
        language_code: str = "en",
        components: Optional[List[Dict[str, Any]]] = None,
    ) -> OutboundWhatsAppResult:
        # For non-official multi-device connections, templates are rendered as standard text
        return await self.send_message(to_phone, f"[{template_name}] Notification")

    async def send_document(
        self,
        to_phone: str,
        file_path: str,
        caption: Optional[str] = None,
        filename: Optional[str] = None,
    ) -> OutboundWhatsAppResult:
        norm_phone = normalize_phone_number(to_phone)
        url = f"{self.bridge_url}/send-document"
        doc_name = filename or (file_path.split("/")[-1].split("\\")[-1] if file_path else "proforma_invoice.pdf")
        payload = {
            "to": norm_phone,
            "filePath": file_path,
            "fileName": doc_name,
            "caption": caption or "",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload)
                data = resp.json()
                if resp.status_code == 200 and data.get("success"):
                    return OutboundWhatsAppResult(
                        success=True,
                        provider_message_id=data.get("messageId"),
                        raw_response=data,
                    )
                return OutboundWhatsAppResult(
                    success=False,
                    error_message=data.get("error", f"HTTP {resp.status_code}"),
                    raw_response=data,
                )
        except Exception as e:
            logger.error(f"Failed to dispatch document via WhatsApp bridge ({e})")
            return OutboundWhatsAppResult(
                success=False,
                error_message=str(e),
            )

    async def mark_read(self, message_id: str) -> bool:
        return True

    def parse_webhook(self, payload: Dict[str, Any]) -> List[InboundWhatsAppEvent]:
        # Payload arrives formatted in standard Meta JSON structure from bridge
        from app.whatsapp.providers.simulator import SimulatorWhatsAppProvider
        return SimulatorWhatsAppProvider().parse_webhook(payload)

    def verify_webhook(self, mode: str, token: str, challenge: str) -> Optional[str]:
        return challenge

    async def health_check(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(f"{self.bridge_url}/status")
                return resp.status_code == 200
        except Exception:
            return False
