"""
System Settings and Emergency Stop controls (Section 55 & 114).
"""

from typing import Any, Dict
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.session import get_db

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdateRequest(BaseModel):
    global_autonomous_enabled: bool
    dry_run_mode: bool
    sandbox_mode: bool
    owner_whatsapp_number: str


@router.get("")
async def get_system_settings():
    """Returns current operational settings and emergency stop status."""
    return {
        "global_autonomous_enabled": settings.GLOBAL_AUTONOMOUS_ENABLED,
        "dry_run_mode": settings.DRY_RUN_MODE,
        "sandbox_mode": settings.SANDBOX_MODE,
        "owner_whatsapp_number": settings.OWNER_WHATSAPP_NUMBER,
        "whatsapp_provider": settings.WHATSAPP_PROVIDER,
        "llm_provider": settings.LLM_PROVIDER,
        "worker_count": settings.WORKER_COUNT,
        "message_debounce_seconds": settings.MESSAGE_DEBOUNCE_WINDOW_SECONDS,
    }


@router.patch("")
async def update_system_settings(req: SettingsUpdateRequest):
    """Updates operational toggles."""
    settings.GLOBAL_AUTONOMOUS_ENABLED = req.global_autonomous_enabled
    settings.DRY_RUN_MODE = req.dry_run_mode
    settings.SANDBOX_MODE = req.sandbox_mode
    settings.OWNER_WHATSAPP_NUMBER = req.owner_whatsapp_number
    return {"success": True, "settings": await get_system_settings()}
