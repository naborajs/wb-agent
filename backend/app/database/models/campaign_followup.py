"""
Campaign, CampaignLead, FollowupJob, and durable Job queue models.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid, utc_now


class Campaign(Base, OrgScopedMixin, TimestampMixin):
    """
    Outreach campaign orchestrating automated messaging and compliant follow-up sequences.
    """
    __tablename__ = "campaigns"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    target_segment = Column(String(64), default="all", nullable=False)
    lead_source_filter = Column(String(64), nullable=True)
    lead_filter = Column(UniversalJSON, nullable=True)  # Structured filter: {company_types, cities, ...}
    initial_message_template = Column(Text, nullable=False)  # Full template text, not limited to 128 chars
    follow_up_sequence = Column(UniversalJSON, default=list, nullable=False)
    daily_limit = Column(Integer, default=50, nullable=False)
    status = Column(String(32), default="draft", nullable=False, index=True)  # draft, active, paused, completed

    # Scheduling & pacing
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    scheduling_window = Column(UniversalJSON, nullable=True)  # {start_hour, end_hour, days_of_week}
    jitter_min_seconds = Column(Integer, default=25, nullable=False)
    jitter_max_seconds = Column(Integer, default=45, nullable=False)

    # Stop conditions
    stop_on_replies = Column(Integer, nullable=True)  # Auto-pause after N replies
    stop_below_response_rate = Column(Float, nullable=True)  # Auto-pause below X%

    # Retry / fallback
    retry_max_attempts = Column(Integer, default=3, nullable=False)
    retry_delay_hours = Column(Integer, default=24, nullable=False)

    # Personalization
    personalization_enabled = Column(Boolean, default=False, nullable=False)

    # Opt-out handling: stop | skip | flag
    opt_out_handling = Column(String(32), default="stop", nullable=False)

    # Actor tracking (who created the campaign)
    actor = Column(String(64), nullable=True)  # "operator", "friday_agent"

    # Legacy aggregated metrics (kept for backward compat, real stats computed from CampaignLead)
    total_leads = Column(Integer, default=0, nullable=False)
    replied_count = Column(Integer, default=0, nullable=False)
    qualified_count = Column(Integer, default=0, nullable=False)
    hot_count = Column(Integer, default=0, nullable=False)
    converted_count = Column(Integer, default=0, nullable=False)
    opted_out_count = Column(Integer, default=0, nullable=False)

    campaign_leads = relationship("CampaignLead", back_populates="campaign", cascade="all, delete-orphan")


class CampaignLead(Base, TimestampMixin):
    """
    Tracks a lead's individual progress through an outreach campaign.
    """
    __tablename__ = "campaign_leads"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    campaign_id = Column(String(64), ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(String(64), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    status = Column(String(32), default="pending", nullable=False)  # pending, contacted, replied, opted_out, failed
    delivery_status = Column(String(32), default="pending", nullable=False)  # pending, sent, delivered, failed, replied, opted_out
    current_step = Column(Integer, default=0, nullable=False)
    next_run_at = Column(DateTime(timezone=True), nullable=True)

    # Per-lead personalization & delivery tracking
    personalized_message = Column(Text, nullable=True)  # EDITH-generated personalized variant
    sent_at = Column(DateTime(timezone=True), nullable=True)
    replied_at = Column(DateTime(timezone=True), nullable=True)

    campaign = relationship("Campaign", back_populates="campaign_leads")

    __table_args__ = (
        Index("ix_campaign_leads_delivery", "campaign_id", "delivery_status"),
    )


class FollowupJob(Base, OrgScopedMixin, TimestampMixin):
    """
    Scheduled follow-up reminder for a conversation. Subject to strict pre-dispatch guards (ADR-009).
    """
    __tablename__ = "followup_jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    campaign_id = Column(String(64), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True)
    scheduled_for = Column(DateTime(timezone=True), nullable=False, index=True)
    step = Column(Integer, default=1, nullable=False)
    status = Column(String(32), default="scheduled", nullable=False, index=True)  # scheduled, sent, cancelled, suppressed, failed
    cancel_reason = Column(String(64), nullable=True)  # customer_replied, customer_opted_out, human_takeover, closed
    template_id = Column(String(128), nullable=True)
    attempt_count = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=3, nullable=False)

    __table_args__ = (
        Index("ix_followup_status_scheduled", "status", "scheduled_for"),
    )


class Job(Base, OrgScopedMixin, TimestampMixin):
    """
    Durable database-backed asynchronous task queue (ADR-003).
    Supports concurrent consumption via SELECT ... FOR UPDATE SKIP LOCKED.
    """
    __tablename__ = "jobs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    type = Column(String(64), nullable=False, index=True)  # e.g., 'process_message', 'execute_followup', 'ingest_knowledge'
    payload = Column(UniversalJSON, default=dict, nullable=False)
    priority = Column(Integer, default=5, nullable=False, index=True)  # 1=low, 5=normal, 10=high, 20=critical
    status = Column(String(32), default="pending", nullable=False, index=True)  # pending, running, completed, retrying, failed, dead_letter, cancelled
    run_at = Column(DateTime(timezone=True), default=utc_now, nullable=False, index=True)
    attempts = Column(Integer, default=0, nullable=False)
    max_attempts = Column(Integer, default=5, nullable=False)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String(128), nullable=True)
    last_error = Column(Text, nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_jobs_fetch", "status", "run_at", "priority"),
    )
