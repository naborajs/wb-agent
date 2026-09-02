"""
Organization, User, and ApiKey domain models for multi-tenant isolation and security.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Index, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, TimestampMixin, UniversalJSON, generate_uuid


class Organization(Base, TimestampMixin):
    """
    Multi-tenant boundary for companies/businesses using the WB-Agent platform.
    """
    __tablename__ = "organizations"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    name = Column(String(255), nullable=False)
    slug = Column(String(128), unique=True, nullable=False, index=True)
    is_active = Column(Boolean, default=True, nullable=False)
    settings = Column(UniversalJSON, default=dict, nullable=False)

    # Relationships
    users = relationship("User", back_populates="organization", cascade="all, delete-orphan")
    api_keys = relationship("ApiKey", back_populates="organization", cascade="all, delete-orphan")


class User(Base, TimestampMixin):
    """
    Operator, sales agent, or admin account capable of managing the platform and dashboard.
    """
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    email = Column(String(255), nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(32), default="operator", nullable=False)  # 'admin', 'operator', 'viewer'
    is_active = Column(Boolean, default=True, nullable=False)

    organization = relationship("Organization", back_populates="users")

    __table_args__ = (
        Index("ix_users_org_email", "org_id", "email", unique=True),
    )


class ApiKey(Base, TimestampMixin):
    """
    Scoped API keys for programmatic access, external CRM integrations, and webhooks.
    """
    __tablename__ = "api_keys"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    org_id = Column(String(64), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False, index=True)
    key_hash = Column(String(255), nullable=False, index=True)
    prefix = Column(String(16), nullable=False)  # e.g., 'wb_live_abcd'
    name = Column(String(128), nullable=False)
    scopes = Column(UniversalJSON, default=list, nullable=False)  # e.g. ['lead:read', 'lead:write']
    last_used_at = Column(DateTime(timezone=True), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_revoked = Column(Boolean, default=False, nullable=False)

    organization = relationship("Organization", back_populates="api_keys")
