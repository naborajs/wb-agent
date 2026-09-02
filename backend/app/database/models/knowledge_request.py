"""
Domain models for Human Knowledge Requests, Knowledge Candidates, Customer Profile Audits, and Conversation Analysis.
Supports EDITH's unknown information handling, owner escalation, and bounded background analysis (Sections 19, 21, 22, 78).
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class HumanKnowledgeRequest(Base, OrgScopedMixin, TimestampMixin):
    """
    Tracks questions EDITH cannot answer with high factual confidence from verified documentation.
    Escalated to business authorities (owner/specialists) for authoritative answers.
    """
    __tablename__ = "human_knowledge_requests"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    question = Column(Text, nullable=False)
    context_searched = Column(Text, nullable=True)
    urgency = Column(String(32), default="NORMAL", nullable=False)  # LOW, NORMAL, HIGH, CRITICAL
    status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, ANSWERED, REJECTED, EXPIRED
    assigned_to_phone = Column(String(32), nullable=False)  # Owner or specialist phone
    suggested_reply = Column(Text, nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    resolution_notes = Column(Text, nullable=True)

    candidates = relationship("KnowledgeCandidate", back_populates="request", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_hkr_org_status", "org_id", "status"),
    )


class KnowledgeCandidate(Base, OrgScopedMixin, TimestampMixin):
    """
    Provisional knowledge items captured from owner/human replies.
    Requires review before being promoted to permanent verified business documentation.
    """
    __tablename__ = "knowledge_candidates"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    request_id = Column(String(64), ForeignKey("human_knowledge_requests.id", ondelete="SET NULL"), nullable=True, index=True)
    source = Column(String(64), default="human_owner", nullable=False)
    question = Column(Text, nullable=False)
    proposed_answer = Column(Text, nullable=False)
    approval_status = Column(String(32), default="PENDING", nullable=False, index=True)  # PENDING, APPROVED, REJECTED
    approved_by = Column(String(128), nullable=True)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    context_metadata = Column(UniversalJSON, default=dict, nullable=False)

    request = relationship("HumanKnowledgeRequest", back_populates="candidates")

    __table_args__ = (
        Index("ix_kc_org_status", "org_id", "approval_status"),
    )


class CustomerProfileVersion(Base, OrgScopedMixin, TimestampMixin):
    """
    Historical audit trail of changes made to structured customer profiles.
    Preserves provenance (e.g. source: customer_message vs lead_csv).
    """
    __tablename__ = "customer_profile_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    field_name = Column(String(64), nullable=False)
    old_value = Column(UniversalJSON, nullable=True)
    new_value = Column(UniversalJSON, nullable=False)
    source = Column(String(64), default="customer_message", nullable=False)  # customer_message, lead_csv, owner_update, system
    confidence = Column(Float, default=1.0, nullable=False)

    __table_args__ = (
        Index("ix_cpv_org_customer_field", "org_id", "customer_id", "field_name"),
    )


class ConversationAnalysis(Base, OrgScopedMixin, TimestampMixin):
    """
    Finite, bounded background thinking jobs performed when a customer conversation is idle.
    Logs summaries, extracted memory, stage reviews, and follow-up plans without unbounded loops.
    """
    __tablename__ = "conversation_analysis"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    analysis_type = Column(String(64), nullable=False)  # summary, memory_extraction, objection_review, followup_plan
    summary = Column(Text, nullable=True)
    unresolved_issues = Column(UniversalJSON, default=list, nullable=False)
    followup_plan = Column(UniversalJSON, default=dict, nullable=False)
    lead_score_delta = Column(Integer, default=0, nullable=False)
    sales_stage_proposal = Column(String(32), nullable=True)
    status = Column(String(32), default="COMPLETED", nullable=False)

    __table_args__ = (
        Index("ix_ca_org_conv_type", "org_id", "conversation_id", "analysis_type"),
    )
