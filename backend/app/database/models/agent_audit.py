"""
AgentRun, AgentEvent, ToolCall, SalesEvent, Handoff, Notification, Integration, AgentSetting, and AuditLog models.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid, utc_now


class AgentRun(Base, OrgScopedMixin, TimestampMixin):
    """
    Auditable record of a single AI agent execution cycle (Section 110).
    Never stores hidden chain-of-thought, but records concise structured decisions.
    """
    __tablename__ = "agent_runs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    message_id = Column(String(64), ForeignKey("messages.id", ondelete="SET NULL"), nullable=True)
    model = Column(String(128), default="nvidia/nemotron-4-340b-instruct", nullable=False)
    provider = Column(String(64), default="nvidia", nullable=False)
    started_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    latency_ms = Column(Integer, default=0, nullable=False)

    # Auditable state transitions
    intent = Column(String(64), nullable=True)
    sales_stage_before = Column(String(32), nullable=True)
    sales_stage_after = Column(String(32), nullable=True)
    lead_score_before = Column(Integer, nullable=True)
    lead_score_after = Column(Integer, nullable=True)

    tools_used = Column(UniversalJSON, default=list, nullable=False)
    knowledge_sources = Column(UniversalJSON, default=list, nullable=False)
    decision_action = Column(String(64), nullable=True)  # question, recommend, handle_objection, handoff, close
    result_summary = Column(Text, nullable=True)
    error = Column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="agent_runs")
    events = relationship("AgentEvent", back_populates="agent_run", cascade="all, delete-orphan")
    tool_calls = relationship("ToolCall", back_populates="agent_run", cascade="all, delete-orphan")


class AgentEvent(Base, OrgScopedMixin, TimestampMixin):
    """
    Granular event emitted during an agent run.
    """
    __tablename__ = "agent_events"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    agent_run_id = Column(String(64), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    event_type = Column(String(64), nullable=False, index=True)
    payload = Column(UniversalJSON, default=dict, nullable=False)

    agent_run = relationship("AgentRun", back_populates="events")


class ToolCall(Base, OrgScopedMixin, TimestampMixin):
    """
    Log of every tool invocation by the agent, validating permissions and parameters.
    """
    __tablename__ = "tool_calls"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    agent_run_id = Column(String(64), ForeignKey("agent_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    tool_name = Column(String(128), nullable=False, index=True)
    arguments = Column(UniversalJSON, default=dict, nullable=False)
    result = Column(UniversalJSON, default=dict, nullable=False)
    is_error = Column(Boolean, default=False, nullable=False)
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Integer, default=0, nullable=False)

    agent_run = relationship("AgentRun", back_populates="tool_calls")


class SalesEvent(Base, OrgScopedMixin, TimestampMixin):
    """
    State-machine transitions and score shift events across the sales funnel.
    """
    __tablename__ = "sales_events"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    from_stage = Column(String(32), nullable=False)
    to_stage = Column(String(32), nullable=False)
    trigger_reason = Column(String(255), nullable=False)
    score_delta = Column(Integer, default=0, nullable=False)


class Handoff(Base, OrgScopedMixin, TimestampMixin):
    """
    Record of conversation transfer from AI to human sales operator (Section 43).
    """
    __tablename__ = "handoffs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(String(128), nullable=False)  # purchase_intent, custom_pricing, complaint, explicit_request
    status = Column(String(32), default="pending", nullable=False, index=True)  # pending, accepted, resolved
    assigned_user_id = Column(String(64), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    summary = Column(Text, nullable=False)
    customer_intent = Column(String(255), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    conversation = relationship("Conversation", back_populates="handoffs")


class Notification(Base, OrgScopedMixin, TimestampMixin):
    """
    Urgent notifications dispatched to the owner's WhatsApp number (+918900653250) or operator dashboard.
    """
    __tablename__ = "notifications"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    recipient = Column(String(64), nullable=False)  # e.g., '+918900653250'
    channel = Column(String(32), default="whatsapp", nullable=False)
    notification_type = Column(String(64), nullable=False, index=True)  # HOT_LEAD, PURCHASE_INTENT, HUMAN_HELP_REQUIRED
    content = Column(Text, nullable=False)
    status = Column(String(32), default="queued", nullable=False)  # queued, sent, failed
    error_message = Column(Text, nullable=True)


class Integration(Base, OrgScopedMixin, TimestampMixin):
    """
    Configuration and operational health of third-party integrations (WhatsApp Meta, Apify, NVIDIA, etc.).
    """
    __tablename__ = "integrations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    provider = Column(String(64), nullable=False, index=True)  # whatsapp_meta, apify, nvidia
    status = Column(String(32), default="active", nullable=False)  # active, error, inactive
    config = Column(UniversalJSON, default=dict, nullable=False)
    last_synced_at = Column(DateTime(timezone=True), nullable=True)
    error_message = Column(Text, nullable=True)

    __table_args__ = (
        Index("ix_integrations_org_provider", "org_id", "provider", unique=True),
    )


class AgentSetting(Base, OrgScopedMixin, TimestampMixin):
    """
    Fine-grained business rules and operational thresholds configurable from the dashboard.
    """
    __tablename__ = "agent_settings"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    setting_key = Column(String(128), nullable=False)
    setting_value = Column(UniversalJSON, nullable=False)
    description = Column(Text, nullable=True)
    updated_by = Column(String(64), nullable=True)

    __table_args__ = (
        Index("ix_agent_settings_org_key", "org_id", "setting_key", unique=True),
    )


class AuditLog(Base, OrgScopedMixin, TimestampMixin):
    """
    Immutable audit log for security, administrative actions, and compliance (Section 77).
    """
    __tablename__ = "audit_logs"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    user_id = Column(String(64), nullable=True, index=True)
    action = Column(String(128), nullable=False, index=True)  # login, takeover, price_update, memory_edit
    resource_type = Column(String(64), nullable=False)
    resource_id = Column(String(64), nullable=True)
    changes = Column(UniversalJSON, default=dict, nullable=False)
    ip_address = Column(String(64), nullable=True)
