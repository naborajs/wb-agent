"""
Prompt Versioning and Sectional Modularity Model (Sections 66, 67, 68).
Tracks independent version history for Core Safety, Core Identity, Business Policy, Sales Style, and Business Profile.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class PromptVersion(Base, OrgScopedMixin, TimestampMixin):
    """
    Independently editable and auditable system instruction section version.
    """
    __tablename__ = "prompt_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    section_name = Column(String(64), nullable=False, index=True)  # core_safety, core_identity, business_policy, sales_style, business_profile
    version = Column(Integer, default=1, nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    author = Column(String(128), default="system", nullable=False)
    change_summary = Column(String(255), nullable=True)
    test_results = Column(UniversalJSON, default=dict, nullable=False)

    __table_args__ = (
        Index("ix_prompt_versions_org_sec_act", "org_id", "section_name", "is_active"),
    )
