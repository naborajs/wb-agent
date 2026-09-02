"""
Health and readiness probes (Section 113).
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import check_database_health, get_db
from app.whatsapp.service import WhatsAppService

router = APIRouter(tags=["Health"])


@router.get("/health")
async def get_health():
    """Basic service liveness check."""
    return {"status": "ok", "service": "wb-agent", "version": "0.1.0"}


@router.get("/readiness")
async def get_readiness(session: AsyncSession = Depends(get_db)):
    """Full readiness check probing database and communication channels."""
    db_ok = await check_database_health()
    wa_provider = WhatsAppService.get_provider()
    wa_ok = await wa_provider.health_check()

    is_ready = db_ok and wa_ok
    return {
        "status": "ready" if is_ready else "degraded",
        "components": {
            "database": "healthy" if db_ok else "unhealthy",
            "whatsapp": "healthy" if wa_ok else "unhealthy",
        }
    }
