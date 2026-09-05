"""
Database session management, async connection pooling, and lifecycle helpers.
"""

from typing import AsyncGenerator
from contextlib import asynccontextmanager
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy import text
from app.config import settings
from app.utils.logging import logger

# Lazy-loaded async engine
_async_engine: AsyncEngine | None = None
_async_session_factory: async_sessionmaker[AsyncSession] | None = None


from pathlib import Path


def _resolve_db_url(url: str) -> str:
    """
    Ensures relative SQLite database paths resolve portably and consistently,
    regardless of whether python/uvicorn is started from repo root or ./backend.
    PostgreSQL or absolute paths are returned unchanged.
    """
    if not url.startswith("sqlite"):
        return url

    if ":///" in url:
        proto, path_part = url.split(":///", 1)
        if path_part.startswith("./") or not Path(path_part).is_absolute():
            clean_rel = path_part.lstrip("./")
            # Anchor relative to repository root (3 levels up from this file)
            repo_root = Path(__file__).resolve().parents[3]
            db_path = (repo_root / clean_rel).resolve()
            return f"{proto}:///{db_path.as_posix()}"
    return url


def get_engine() -> AsyncEngine:
    """
    Initializes and returns the global AsyncEngine singleton.
    Configures pool sizes, connection timeouts, and dialect specific flags.
    """
    global _async_engine
    if _async_engine is None:
        db_url = _resolve_db_url(settings.DATABASE_URL)
        
        # SQLite dialect requires check_same_thread=False
        connect_args = {}
        if "sqlite" in db_url:
            connect_args["check_same_thread"] = False
            _async_engine = create_async_engine(
                db_url,
                echo=False,
                connect_args=connect_args,
                future=True,
            )
        else:
            _async_engine = create_async_engine(
                db_url,
                echo=False,
                pool_size=settings.DB_POOL_SIZE,
                max_overflow=settings.DB_MAX_OVERFLOW,
                pool_timeout=settings.DB_POOL_TIMEOUT,
                pool_pre_ping=True,
                future=True,
            )
        logger.info(f"Database engine initialized for URL dialect: {_async_engine.dialect.name}")
    return _async_engine


def get_session_factory() -> async_sessionmaker[AsyncSession]:
    """
    Returns the sessionmaker factory for creating transactional AsyncSessions.
    """
    global _async_session_factory
    if _async_session_factory is None:
        engine = get_engine()
        _async_session_factory = async_sessionmaker(
            bind=engine,
            class_=AsyncSession,
            expire_on_commit=False,
            autoflush=False,
        )
    return _async_session_factory


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency that yields an isolated AsyncSession per request,
    rolling back uncommitted changes if an exception occurs.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@asynccontextmanager
async def get_db_context() -> AsyncGenerator[AsyncSession, None]:
    """
    Context manager for background workers and CLI scripts to safely acquire a database session.
    """
    factory = get_session_factory()
    async with factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def check_database_health() -> bool:
    """
    Executes a SELECT 1 query to verify active connectivity with the database engine.
    """
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            return result.scalar() == 1
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
