"""
Dynamic Prompt Section Model.
Represents an independent, customizable system instruction module.
Allows dynamic creation, ordering, toggling, and archival while protecting core system sections.
"""

from sqlalchemy import Boolean, Column, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, generate_uuid


class PromptSection(Base, OrgScopedMixin, TimestampMixin):
    """
    Dynamic system prompt section/module.
    """
    __tablename__ = "prompt_sections"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    key = Column(String(64), nullable=False, index=True)  # unique slug like 'core_safety', 'return_policy'
    display_name = Column(String(128), nullable=False)
    icon = Column(String(64), default="Sparkles", nullable=False)
    description = Column(Text, nullable=True)
    order_index = Column(Integer, default=0, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)  # system sections cannot be deleted/archived
    is_archived = Column(Boolean, default=False, nullable=False)  # soft-delete for custom sections
    default_content = Column(Text, nullable=True)  # factory seed instructions for 1-click reset
    preferred_model_tier = Column(String(64), default="ultra-550b", nullable=False)
    created_by = Column(String(128), default="system", nullable=False)

    # Relationship to historical versions
    versions = relationship(
        "PromptVersion",
        back_populates="section",
        foreign_keys="PromptVersion.section_id",
        cascade="all, delete-orphan",
        order_by="desc(PromptVersion.version)",
    )

    __table_args__ = (
        Index("ix_prompt_sections_org_key", "org_id", "key", unique=True),
        Index("ix_prompt_sections_org_order", "org_id", "is_archived", "is_active", "order_index"),
    )
