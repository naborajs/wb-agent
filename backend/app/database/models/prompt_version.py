"""
Prompt Versioning and Sectional Modularity Model (Sections 66, 67, 68).
Tracks independent version history for Core Safety, Core Identity, Business Policy, Sales Style, and Business Profile.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid


class PromptVersion(Base, OrgScopedMixin, TimestampMixin):
    """
    Independently editable and auditable system instruction section version.
    """
    __tablename__ = "prompt_versions"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    section_id = Column(String(64), ForeignKey("prompt_sections.id", ondelete="CASCADE"), nullable=True, index=True)
    section_name = Column(String(64), nullable=False, index=True)  # slug key for backward compatibility
    version = Column(Integer, default=1, nullable=False)
    content = Column(Text, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)
    pinned = Column(Boolean, default=False, nullable=False, index=True)  # protects milestone versions from pruning
    token_count = Column(Integer, default=0, nullable=False)  # exact BPE tokenizer count
    author = Column(String(128), default="system", nullable=False)
    change_summary = Column(String(255), nullable=True)
    
    # Stored multidimensional quality metrics
    quality_score = Column(Integer, nullable=True)  # 0 - 100
    quality_grade = Column(String(16), nullable=True)  # A+, A, B+, B
    clarity_score = Column(Integer, nullable=True)
    constraint_score = Column(Integer, nullable=True)
    b2b_score = Column(Integer, nullable=True)
    safety_score = Column(Integer, nullable=True)
    
    test_results = Column(UniversalJSON, default=dict, nullable=False)

    # Relationships
    section = relationship("PromptSection", back_populates="versions", foreign_keys=[section_id])

    __table_args__ = (
        Index("ix_prompt_versions_org_sec_act", "org_id", "section_name", "is_active"),
        Index("ix_prompt_versions_sec_id_act", "section_id", "is_active"),
        Index("ix_prompt_versions_sec_id_ver", "section_id", "version"),
    )

