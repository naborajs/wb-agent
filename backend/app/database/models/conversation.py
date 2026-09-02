"""
Conversation, Message, MessageStatus, ConversationSummary, and CustomerMemory models.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class Conversation(Base, OrgScopedMixin, TimestampMixin):
    """
    Stateful conversational thread between a customer and the WB-Agent system over WhatsApp.
    Supports atomic locking and mode transitions (AI vs HUMAN takeover).
    """
    __tablename__ = "conversations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    channel = Column(String(32), default="whatsapp", nullable=False)
    channel_id = Column(String(128), nullable=False)  # WhatsApp customer phone or conversation identifier
    
    # State & Control
    mode = Column(String(32), default="AI", nullable=False, index=True)  # 'AI', 'HUMAN', 'PAUSED', 'CLOSED'
    sales_stage = Column(String(32), default="NEW", nullable=False, index=True)
    lead_score = Column(Integer, default=10, nullable=False, index=True)
    is_hot = Column(Boolean, default=False, nullable=False, index=True)
    unread_count = Column(Integer, default=0, nullable=False)
    last_message_at = Column(DateTime(timezone=True), nullable=True, index=True)

    # Distributed Concurrency Locking (ADR-004)
    locked_at = Column(DateTime(timezone=True), nullable=True)
    locked_by = Column(String(128), nullable=True)

    # Context & metadata
    active_objections = Column(UniversalJSON, default=list, nullable=False)
    metadata_json = Column(UniversalJSON, default=dict, nullable=False)

    # Relationships
    customer = relationship("Customer", back_populates="conversations")
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan", order_by="Message.created_at")
    summary = relationship("ConversationSummary", back_populates="conversation", uselist=False, cascade="all, delete-orphan")
    handoffs = relationship("Handoff", back_populates="conversation", cascade="all, delete-orphan")
    agent_runs = relationship("AgentRun", back_populates="conversation", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_conversations_org_customer", "org_id", "customer_id"),
        Index("ix_conversations_org_mode_stage", "org_id", "mode", "sales_stage"),
    )


class Message(Base, OrgScopedMixin, TimestampMixin):
    """
    Individual chat message exchanged over WhatsApp.
    Ensures idempotency via provider_message_id and auditable delivery statuses.
    """
    __tablename__ = "messages"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True)
    direction = Column(String(16), nullable=False)  # 'inbound', 'outbound'
    sender_type = Column(String(16), nullable=False)  # 'customer', 'agent', 'human', 'system'
    sender_id = Column(String(128), nullable=True)
    content = Column(Text, nullable=False)
    media_url = Column(String(512), nullable=True)
    media_type = Column(String(32), nullable=True)
    
    # Meta / WhatsApp Tracking
    provider_message_id = Column(String(128), nullable=True, index=True)
    delivery_status = Column(String(32), default="sent", nullable=False, index=True)  # queued, sent, delivered, read, failed
    error_message = Column(Text, nullable=True)
    raw_payload = Column(UniversalJSON, default=dict, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    statuses = relationship("MessageStatus", back_populates="message", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_messages_org_created", "org_id", "created_at"),
        Index("ix_messages_provider_id", "provider_message_id"),
    )


class MessageStatus(Base, TimestampMixin):
    """
    State transitions for a message (sent -> delivered -> read).
    """
    __tablename__ = "message_statuses"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    message_id = Column(String(64), ForeignKey("messages.id", ondelete="CASCADE"), nullable=False, index=True)
    status = Column(String(32), nullable=False)  # sent, delivered, read, failed
    timestamp = Column(DateTime(timezone=True), nullable=False)
    details = Column(UniversalJSON, default=dict, nullable=False)

    message = relationship("Message", back_populates="statuses")


class ConversationSummary(Base, TimestampMixin):
    """
    Rolling semantic summary and extracted customer intent for a conversation thread.
    Prevents token bloat across extended sales dialogues.
    """
    __tablename__ = "conversation_summaries"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    conversation_id = Column(String(64), ForeignKey("conversations.id", ondelete="CASCADE"), unique=True, nullable=False)
    summary = Column(Text, nullable=False)
    key_points = Column(UniversalJSON, default=list, nullable=False)
    active_objections = Column(UniversalJSON, default=list, nullable=False)
    customer_goals = Column(Text, nullable=True)

    conversation = relationship("Conversation", back_populates="summary")


class CustomerMemory(Base, OrgScopedMixin, TimestampMixin):
    """
    Discrete facts and customer preferences extracted and verified across interactions.
    Supports confidence scores and verification states (Section 20 & 21).
    """
    __tablename__ = "customer_memory"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    category = Column(String(64), nullable=False, index=True)
    # Categories: preferences, requirements, budget, location, company, role,
    # product_interest, quantity, frequency, objections, buying_intent, communication_style, important_facts
    key = Column(String(128), nullable=False, index=True)
    value = Column(UniversalJSON, nullable=False)  # Flexible representation (string, number, or dict)
    confidence = Column(Float, default=1.0, nullable=False)
    verification_status = Column(String(32), default="CUSTOMER_SAID", nullable=False)
    # Verification: 'CUSTOMER_SAID', 'SYSTEM_VERIFIED', 'AI_INFERRED', 'HUMAN_CONFIRMED'
    source = Column(String(64), default="conversation", nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("Customer", back_populates="memories")

    __table_args__ = (
        Index("ix_memory_org_customer_cat", "org_id", "customer_id", "category"),
    )
