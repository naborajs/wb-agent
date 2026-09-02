"""
Lead, Customer, Deal, and LeadEvent domain models.
"""

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class Lead(Base, OrgScopedMixin, TimestampMixin):
    """
    Prospective business contact ingested via CSV, Apify, or API before conversion to an active customer.
    Follows canonical lead schema (Section 13).
    """
    __tablename__ = "leads"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    phone = Column(String(32), nullable=False, index=True)
    country_code = Column(String(8), default="+91", nullable=False)
    name = Column(String(255), nullable=True)
    first_name = Column(String(128), nullable=True)
    last_name = Column(String(128), nullable=True)
    email = Column(String(255), nullable=True, index=True)
    city = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    country = Column(String(128), default="India", nullable=False)
    postal_code = Column(String(32), nullable=True)
    company_name = Column(String(255), nullable=True)
    company_type = Column(String(128), nullable=True)  # Café, Restaurant, Hotel, Retailer, Distributor
    job_title = Column(String(128), nullable=True)
    lead_source = Column(String(64), default="csv", nullable=False)  # csv, apify, whatsapp, manual
    lead_source_id = Column(String(128), nullable=True)
    campaign_id = Column(String(64), ForeignKey("campaigns.id", ondelete="SET NULL"), nullable=True, index=True)
    campaign_name = Column(String(255), nullable=True)
    product_interest = Column(String(255), nullable=True)
    category_interest = Column(String(128), nullable=True)
    estimated_quantity = Column(String(64), nullable=True)
    estimated_budget = Column(String(64), nullable=True)
    preferred_language = Column(String(32), default="English", nullable=False)
    timezone = Column(String(64), default="Asia/Kolkata", nullable=False)
    
    # Opt-in & WhatsApp Business Policy Compliance
    opt_in_status = Column(Boolean, default=True, nullable=False)
    opt_in_source = Column(String(128), default="inquiry", nullable=False)
    opt_in_timestamp = Column(DateTime(timezone=True), nullable=True)
    opt_out_timestamp = Column(DateTime(timezone=True), nullable=True)

    # Lead qualification & scoring
    status = Column(String(32), default="new", nullable=False, index=True)  # new, contacted, qualified, converted, disqualified, opted_out
    score = Column(Integer, default=10, nullable=False, index=True)  # 0 to 100
    notes = Column(Text, nullable=True)
    extra_metadata = Column(UniversalJSON, default=dict, nullable=False)

    # Relationships
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True, index=True)
    customer = relationship("Customer", back_populates="leads")
    events = relationship("LeadEvent", back_populates="lead", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_leads_org_phone", "org_id", "phone"),
        Index("ix_leads_org_status_score", "org_id", "status", "score"),
    )


class Customer(Base, OrgScopedMixin, TimestampMixin):
    """
    Verified business account identity. Normalizes customer relationship across multiple conversations.
    """
    __tablename__ = "customers"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    primary_phone = Column(String(32), nullable=False, index=True)
    country_code = Column(String(8), default="+91", nullable=False)
    email = Column(String(255), nullable=True, index=True)
    name = Column(String(255), nullable=True)
    company_name = Column(String(255), nullable=True)
    company_type = Column(String(128), nullable=True)
    city = Column(String(128), nullable=True)
    state = Column(String(128), nullable=True)
    country = Column(String(128), default="India", nullable=False)
    preferred_language = Column(String(32), default="English", nullable=False)

    # Contactability & consent state
    opt_in_status = Column(Boolean, default=True, nullable=False)
    opt_in_source = Column(String(128), default="initial_contact", nullable=False)
    opt_in_timestamp = Column(DateTime(timezone=True), nullable=True)
    opt_out_timestamp = Column(DateTime(timezone=True), nullable=True)

    status = Column(String(32), default="active", nullable=False)  # active, paused, opted_out, churned
    total_orders = Column(Integer, default=0, nullable=False)
    lifetime_value = Column(Numeric(12, 2), default=0.00, nullable=False)
    custom_attributes = Column(UniversalJSON, default=dict, nullable=False)

    # Relationships
    leads = relationship("Lead", back_populates="customer")
    conversations = relationship("Conversation", back_populates="customer", cascade="all, delete-orphan")
    memories = relationship("CustomerMemory", back_populates="customer", cascade="all, delete-orphan")
    deals = relationship("Deal", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_customers_org_phone", "org_id", "primary_phone", unique=True),
    )


class Deal(Base, OrgScopedMixin, TimestampMixin):
    """
    Sales opportunity tracked through the pipeline toward closure.
    """
    __tablename__ = "deals"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="CASCADE"), nullable=False, index=True)
    lead_id = Column(String(64), ForeignKey("leads.id", ondelete="SET NULL"), nullable=True, index=True)
    title = Column(String(255), nullable=False)
    stage = Column(String(64), default="discovery", nullable=False, index=True)  # discovery, proposal, negotiation, won, lost
    estimated_value = Column(Numeric(12, 2), default=0.00, nullable=False)
    currency = Column(String(8), default="INR", nullable=False)
    notes = Column(Text, nullable=True)
    closed_at = Column(DateTime(timezone=True), nullable=True)

    customer = relationship("Customer", back_populates="deals")


class LeadEvent(Base, OrgScopedMixin, TimestampMixin):
    """
    Audit log of state changes, imports, scoring shifts, and communication events for a lead.
    """
    __tablename__ = "lead_events"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    lead_id = Column(String(64), ForeignKey("leads.id", ondelete="CASCADE"), nullable=False, index=True)
    customer_id = Column(String(64), ForeignKey("customers.id", ondelete="SET NULL"), nullable=True)
    event_type = Column(String(64), nullable=False, index=True)  # e.g., 'lead.created', 'lead.scored', 'lead.opted_out'
    details = Column(UniversalJSON, default=dict, nullable=False)

    lead = relationship("Lead", back_populates="events")
