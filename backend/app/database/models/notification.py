"""
Autonomous Agent Notification Model for Dual-Brain Operating System.
Enables Friday and EDITH to independently dispatch notifications, alerts,
commercial updates, and autonomous debriefs directly to dashboard operators.
"""

from sqlalchemy import Column, String, Boolean, DateTime, Text, JSON, Index
from app.database.base import Base, utc_now
import uuid


class AgentNotification(Base):
    """
    Stores independent notifications dispatched by EDITH or Friday directly to the operator.
    """
    __tablename__ = "agent_notifications"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    org_id = Column(String(64), nullable=False, index=True)
    sender_brain = Column(String(32), nullable=False, index=True)  # "FRIDAY" | "EDITH"
    title = Column(String(255), nullable=False)
    content = Column(Text, nullable=False)
    category = Column(String(64), nullable=False, default="GENERAL")  # "SALES_ALERT", "POLICY_REFUSAL", "DEBRIEF", "SYSTEM_HEALTH", "HOT_LEAD", "FEATURE_GAP", "SUGGESTION"
    severity = Column(String(32), nullable=False, default="info")     # "info", "warning", "critical", "success"
    is_read = Column(Boolean, nullable=False, default=False)
    action_url = Column(String(255), nullable=True)                  # e.g. "/conversations", "/pricing", "/brain"
    metadata_payload = Column(JSON, nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    __table_args__ = (
        Index("idx_agent_notifications_org_created", "org_id", "created_at"),
        Index("idx_agent_notifications_read", "org_id", "is_read"),
    )
