"""
Normalized WhatsApp domain payloads and webhook events (Section 38).
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class InboundWhatsAppEvent(BaseModel):
    """Normalized inbound event parsed from any WhatsApp provider."""
    event_type: str  # 'message', 'status_update'
    sender_phone: str
    message_id: str
    timestamp: datetime
    content: Optional[str] = None
    media_url: Optional[str] = None
    media_type: Optional[str] = None
    status: Optional[str] = None  # 'delivered', 'read', 'failed'
    raw_payload: Dict[str, Any] = Field(default_factory=dict)


class OutboundWhatsAppResult(BaseModel):
    """Result of an outbound WhatsApp dispatch."""
    success: bool
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    raw_response: Dict[str, Any] = Field(default_factory=dict)
