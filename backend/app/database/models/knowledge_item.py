"""
Unified KnowledgeItem model for WB-Agent Knowledge RAG, Pricing Rules, and Catalog Hub.
Integrates human-readable Markdown rendering for vector RAG embeddings with
structured columns and JSON attributes for deterministic business & pricing math.
"""

import enum
from sqlalchemy import Boolean, Column, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class KnowledgeCategory(str, enum.Enum):
    BUSINESS_INFO = "business_info"      # Company profile, policies, warranties, transit timelines, FAQs
    PRICING_RULE = "pricing_rule"        # Volume tiers, segment discounts, discount ceilings
    CATALOG_PRODUCT = "catalog_product"  # Products, SKUs, pack variants, MOQ, unit specifications
    AGENT_GUIDANCE = "agent_guidance"    # Conversational rules, objection handling, safety guardrails
    CUSTOM = "custom"                    # Industry-specific or custom tenant parameters


class KnowledgeItem(Base, OrgScopedMixin, TimestampMixin):
    """
    Unified master knowledge entity covering Business Information, Pricing Rules,
    Catalog Products, and Agent Guidance.
    """
    __tablename__ = "knowledge_items"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    category = Column(String(32), default=KnowledgeCategory.BUSINESS_INFO.value, nullable=False, index=True)
    title = Column(String(255), nullable=False, index=True)
    slug = Column(String(128), nullable=True, index=True)
    source_type = Column(String(64), default="manual", nullable=False)  # manual, file_upload, chat_update, spreadsheet, legacy_migration

    # 1. Human-readable markdown text representation (used for vector chunking & semantic RAG)
    content_text = Column(Text, nullable=False)

    # 2. Structured JSON payload for exact deterministic attributes
    structured_data = Column(UniversalJSON, default=dict, nullable=False)

    # 3. High-performance indexed typed columns for deterministic queries and pricing calculations
    sku = Column(String(64), nullable=True, index=True)
    base_price = Column(Numeric(12, 2), nullable=True)
    currency = Column(String(16), default="INR", nullable=True)
    unit = Column(String(32), default="unit", nullable=True)
    min_order_quantity = Column(Numeric(10, 2), nullable=True)
    min_quantity = Column(Numeric(10, 2), nullable=True)
    max_quantity = Column(Numeric(10, 2), nullable=True)
    discount_percentage = Column(Numeric(5, 2), nullable=True)
    max_autonomous_discount = Column(Numeric(5, 2), nullable=True)
    customer_segment = Column(String(64), nullable=True)
    priority = Column(Integer, default=0, nullable=False)

    # 4. File and chunk tracking
    file_path = Column(String(512), nullable=True)
    file_hash = Column(String(128), nullable=True)
    chunk_count = Column(Integer, default=0, nullable=False)

    # 5. Versioning & Lifecycle
    version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_by_brain = Column(String(32), default="OPERATOR", nullable=False)  # OPERATOR, FRIDAY, EDITH, SYSTEM
    audit_metadata = Column(UniversalJSON, default=dict, nullable=False)

    # Relationship to vector chunks (all categories can have vector chunks!)
    chunks = relationship(
        "KnowledgeChunk",
        back_populates="knowledge_item",
        cascade="all, delete-orphan",
        foreign_keys="KnowledgeChunk.item_id",
    )

    __table_args__ = (
        Index("ix_knowledge_items_org_cat", "org_id", "category"),
        Index("ix_knowledge_items_org_active", "org_id", "is_active"),
        Index("ix_knowledge_items_org_sku", "org_id", "sku"),
    )
