"""
Unit tests for WB-Agent CLI management utility (Section 91).
"""

import os
import pytest
from app.cli import run_doctor, run_status, run_backup


@pytest.mark.asyncio
async def test_cli_doctor_runs(capsys):
    """Verifies that run_doctor executes without exceptions and prints system diagnostics."""
    await run_doctor()
    captured = capsys.readouterr()
    assert "WB-AGENT / EDITH -- SYSTEM DOCTOR DIAGNOSTICS" in captured.out
    assert "Python Version" in captured.out
    assert "Database Connectivity" in captured.out


@pytest.mark.asyncio
async def test_cli_status_runs(capsys, monkeypatch):
    """Verifies that run_status queries live tables and prints counts."""
    import contextlib
    from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
    from app.database.base import Base

    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    @contextlib.asynccontextmanager
    async def mock_get_db_context():
        async with test_factory() as session:
            yield session

    monkeypatch.setattr("app.database.session.get_engine", lambda: test_engine)
    monkeypatch.setattr("app.database.session.get_db_context", mock_get_db_context)

    await run_status()
    captured = capsys.readouterr()
    assert "WB-AGENT / EDITH -- LIVE SYSTEM STATUS" in captured.out
    assert "Total Ingested Leads" in captured.out
    assert "Active Conversations" in captured.out


def test_cli_backup_runs(capsys):
    """Verifies that run_backup creates a timestamped backup artifact."""
    run_backup()
    captured = capsys.readouterr()
    assert "Backup" in captured.out
    assert os.path.exists("backups")
