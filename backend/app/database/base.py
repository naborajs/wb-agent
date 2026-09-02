"""
SQLAlchemy declarative base, common mixins, and dialect-agnostic column types.

Guarantees:
- Consistent UTC timezone-aware timestamps.
- Standard multi-tenant organization scoping (`org_id`).
- Dialect compatibility (native PostgreSQL JSONB/Vector vs SQLite JSON/Array fallback).
"""

import uuid
from datetime import datetime, timezone
from typing import Any
from sqlalchemy import Column, DateTime, ForeignKey, Index, String
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, declared_attr
from sqlalchemy.types import JSON, TypeDecorator


def utc_now() -> datetime:
    """Returns current UTC timestamp with timezone metadata."""
    return datetime.now(timezone.utc)


def generate_uuid() -> str:
    """Generates standard UUID4 string."""
    return str(uuid.uuid4())


class UniversalJSON(TypeDecorator):
    """
    Uses PostgreSQL JSONB when available, falls back to standard JSON for SQLite/testing.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB())
        return dialect.type_descriptor(JSON())


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy ORM models."""
    pass


class TimestampMixin:
    """
    Mixin providing timezone-aware created_at and updated_at UTC timestamps.
    """
    created_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
        index=True
    )
    updated_at = Column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False
    )


class OrgScopedMixin:
    """
    Mixin providing multi-tenant organization isolation for all business data.
    """
    @declared_attr
    def org_id(cls):
        return Column(
            String(64),
            ForeignKey("organizations.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
            default="org_default_tea"
        )
