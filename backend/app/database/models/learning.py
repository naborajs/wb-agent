"""
Domain models for Sales Learning and Strategy Audit (Sections 80, 148).
Stores after-action insights evaluated from completed or idle sales conversations.
"""

from sqlalchemy import Column, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class SalesLearning(Base, OrgScopedMixin, TimestampMixin):
    """
    Empirical sales insight extracted from customer dialogue outcomes and human corrections.
    """
    __tablename__ = "sales_learnings"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    customer_type = Column(String(128), nullable=True)  # Cafe, Hotel, Restaurant, Wholesaler
    topic = Column(String(128), nullable=False, index=True)  # price_objection, sample_request, blend_preference
    tactic_used = Column(Text, nullable=False)
    outcome = Column(String(32), default="SUCCESS", nullable=False)  # SUCCESS, PARTIAL, FAILED
    insight = Column(Text, nullable=False)
    confidence = Column(Float, default=0.9, nullable=False)
    evidence_data = Column(UniversalJSON, default=dict, nullable=False)

    conversation = relationship("Conversation", backref="learnings")

    __table_args__ = (
        Index("ix_sales_learnings_org_topic", "org_id", "topic"),
    )
