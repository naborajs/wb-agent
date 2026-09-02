"""
Unit tests for database session lifecycle, transactions, and connectivity.
"""

import pytest
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base, TimestampMixin, OrgScopedMixin, generate_uuid
from app.database.session import check_database_health


@pytest.mark.asyncio
async def test_sqlite_in_memory_session_lifecycle():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        result = await session.execute(text("SELECT 1"))
        assert result.scalar() == 1

    await engine.dispose()


def test_uuid_generation():
    u1 = generate_uuid()
    u2 = generate_uuid()
    assert isinstance(u1, str)
    assert len(u1) == 36
    assert u1 != u2
