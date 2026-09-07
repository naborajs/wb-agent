"""
Inter-Brain Communication Protocol and Message Persistence Models.
Tracks asynchronous and synchronous dialogues, task requests, autonomous approvals,
refusals, emotional debriefs, and feature gap notifications between FRIDAY (Google Gemini)
and EDITH (NVIDIA NIM).
"""

from sqlalchemy import Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid, utc_now


class InterBrainMessage(Base, OrgScopedMixin, TimestampMixin):
    """
    Message record exchanged between Friday (Web Assistant) and EDITH (WhatsApp Commercial Closer).
    Supports independent agency, reasoning rationale, and status tracking.
    """
    __tablename__ = "inter_brain_messages"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), nullable=True, index=True)
    sender_brain = Column(String(32), nullable=False, index=True)  # "FRIDAY" or "EDITH"
    recipient_brain = Column(String(32), nullable=False, index=True)  # "EDITH" or "FRIDAY"
    message_type = Column(String(64), nullable=False, index=True)  # TASK_REQUEST, TASK_RESPONSE, DEBRIEF, FEATURE_REQUEST, STATUS_INQUIRY, COLLABORATIVE_CHAT
    content = Column(Text, nullable=False)
    decision = Column(String(32), nullable=True, index=True)  # ACCEPTED, DENIED, PENDING, ACKNOWLEDGED, INFO
    reasoning = Column(Text, nullable=True)  # Autonomous reasoning rationale or refusal justification
    metadata_payload = Column(UniversalJSON, default=dict, nullable=False)
    resolved_at = Column(DateTime, nullable=True)

    __table_args__ = (
        Index("ix_inter_brain_created", "created_at"),
        Index("ix_inter_brain_org_sender", "org_id", "sender_brain"),
    )
