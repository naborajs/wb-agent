"""
System Diagnostics and Telemetry Endpoints.
Exposes platform information, runtime environment, and database table statistics.
"""

import sys
import platform
import time
from pathlib import Path
from fastapi import APIRouter, Depends
from sqlalchemy import select, func, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.session import get_db
from app.database.models import Lead, Customer, Order, Quote, Conversation

router = APIRouter(prefix="/system", tags=["System"])

_START_TIME = time.time()


@router.get("/info")
async def get_system_info():
    """
    Returns system runtime information, platform metadata, and uptime.
    """
    uptime_seconds = round(time.time() - _START_TIME, 2)
    return {
        "platform": {
            "os": platform.system(),
            "release": platform.release(),
            "architecture": platform.machine(),
            "python_version": sys.version.split()[0],
        },
        "service": {
            "name": settings.PROJECT_NAME,
            "version": "0.1.0",
            "environment": settings.APP_ENV,
            "uptime_seconds": uptime_seconds,
        },
        "configuration": {
            "agent_name": settings.AGENT_NAME,
            "currency_symbol": settings.CURRENCY_SYMBOL,
            "ai_model": settings.GEMINI_MODEL,
            "whatsapp_provider": settings.WHATSAPP_PROVIDER,
            "log_level": settings.LOG_LEVEL,
        },
    }


@router.get("/database-stats")
async def get_database_stats(session: AsyncSession = Depends(get_db)):
    """
    Returns record counts for primary business entities and database file metrics.
    """
    lead_count = (await session.execute(select(func.count(Lead.id)))).scalar_one()
    customer_count = (await session.execute(select(func.count(Customer.id)))).scalar_one()
    order_count = (await session.execute(select(func.count(Order.id)))).scalar_one()
    quote_count = (await session.execute(select(func.count(Quote.id)))).scalar_one()
    conv_count = (await session.execute(select(func.count(Conversation.id)))).scalar_one()

    # Determine sqlite file size if sqlite
    db_size_kb = None
    if "sqlite" in settings.DATABASE_URL.lower():
        db_path = Path("wb_agent.db")
        if db_path.exists():
            db_size_kb = round(db_path.stat().st_size / 1024, 2)

    return {
        "database_type": "sqlite" if "sqlite" in settings.DATABASE_URL.lower() else "postgresql",
        "size_kb": db_size_kb,
        "counts": {
            "leads": lead_count,
            "customers": customer_count,
            "orders": order_count,
            "quotes": quote_count,
            "conversations": conv_count,
        },
    }
