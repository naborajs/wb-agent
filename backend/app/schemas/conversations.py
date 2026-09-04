"""
Pydantic schemas for Conversations, Messages, and Human Takeover actions.
"""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class MessageBase(BaseModel):
    """Core message attributes."""
    content: str
    media_url: Optional[str] = None
    media_type: Optional[str] = None


class MessageCreate(MessageBase):
    """Payload for operator or test message creation."""
    conversation_id: str
    direction: str = "outbound"
    sender_type: str = "human"


class MessageResponse(MessageBase):
    """Serialized message payload."""
    id: str
    conversation_id: str
    direction: str
    sender_type: str
    sender_id: Optional[str] = None
    provider_message_id: Optional[str] = None
    delivery_status: str
    error_message: Optional[str] = None
    reasoning_content: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    """Serialized conversation thread representation."""
    id: str
    customer_id: str
    channel: str
    channel_id: str
    mode: str  # 'AI', 'HUMAN', 'PAUSED', 'CLOSED'
    sales_stage: str
    lead_score: int
    is_hot: bool
    unread_count: int
    last_message_at: Optional[datetime] = None
    active_objections: List[Any] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class TakeoverRequest(BaseModel):
    """Payload for operator initiating or releasing conversation takeover."""
    mode: str = Field(..., description="Target mode: 'HUMAN', 'AI', 'PAUSED', 'CLOSED'")
    reason: Optional[str] = None
