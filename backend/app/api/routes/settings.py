"""
System Settings and Operational controls (Section 55 & 114).
Full customization support for autonomous toggles, owner notifications, and follow-up cadences.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from app.config import settings

router = APIRouter(prefix="/settings", tags=["Settings"])


class SettingsUpdateRequest(BaseModel):
    global_autonomous_enabled: Optional[bool] = None
    dry_run_mode: Optional[bool] = None
    sandbox_mode: Optional[bool] = None
    owner_whatsapp_number: Optional[str] = None
    owner_notification_enabled: Optional[bool] = None
    followup_inactivity_minutes: Optional[int] = None
    followup_midterm_hours: Optional[int] = None
    followup_final_days: Optional[int] = None
    quiet_hours_enabled: Optional[bool] = None


@router.get("")
async def get_system_settings():
    """Returns current operational settings and emergency stop status."""
    return {
        "global_autonomous_enabled": getattr(settings, "GLOBAL_AUTONOMOUS_ENABLED", True),
        "dry_run_mode": getattr(settings, "DRY_RUN_MODE", False),
        "sandbox_mode": getattr(settings, "SANDBOX_MODE", False),
        "owner_whatsapp_number": getattr(settings, "OWNER_WHATSAPP_NUMBER", "+918900653250"),
        "owner_notification_enabled": getattr(settings, "OWNER_NOTIFICATION_ENABLED", True),
        "followup_inactivity_minutes": getattr(settings, "FOLLOWUP_INACTIVITY_MINUTES", 20),
        "followup_midterm_hours": getattr(settings, "FOLLOWUP_MIDTERM_HOURS", 8),
        "followup_final_days": getattr(settings, "FOLLOWUP_FINAL_DAYS", 7),
        "quiet_hours_enabled": getattr(settings, "QUIET_HOURS_ENABLED", True),
        "whatsapp_provider": settings.WHATSAPP_PROVIDER,
        "llm_provider": settings.LLM_PROVIDER,
        "worker_count": settings.WORKER_COUNT,
        "message_debounce_seconds": settings.MESSAGE_DEBOUNCE_WINDOW_SECONDS,
    }


@router.patch("")
async def update_system_settings(req: SettingsUpdateRequest):
    """Updates operational toggles and parameters."""
    if req.global_autonomous_enabled is not None:
        settings.GLOBAL_AUTONOMOUS_ENABLED = req.global_autonomous_enabled
    if req.dry_run_mode is not None:
        settings.DRY_RUN_MODE = req.dry_run_mode
    if req.sandbox_mode is not None:
        settings.SANDBOX_MODE = req.sandbox_mode
    if req.owner_whatsapp_number is not None:
        settings.OWNER_WHATSAPP_NUMBER = req.owner_whatsapp_number
    if req.owner_notification_enabled is not None:
        settings.OWNER_NOTIFICATION_ENABLED = req.owner_notification_enabled
    if req.followup_inactivity_minutes is not None:
        setattr(settings, "FOLLOWUP_INACTIVITY_MINUTES", req.followup_inactivity_minutes)
    if req.followup_midterm_hours is not None:
        setattr(settings, "FOLLOWUP_MIDTERM_HOURS", req.followup_midterm_hours)
    if req.followup_final_days is not None:
        setattr(settings, "FOLLOWUP_FINAL_DAYS", req.followup_final_days)
    if req.quiet_hours_enabled is not None:
        setattr(settings, "QUIET_HOURS_ENABLED", req.quiet_hours_enabled)

    return {"success": True, "settings": await get_system_settings()}


class ModelTestRequest(BaseModel):
    model: str
    api_key: Optional[str] = None
    base_url: Optional[str] = None


@router.post("/models/test")
async def test_model_endpoint(req: ModelTestRequest):
    """
    Actively tests inference connectivity and latency for a specified model.
    """
    from app.agent.providers.router import LLMRouter

    api_key = req.api_key or settings.NVIDIA_API_KEY
    base_url = req.base_url or settings.NVIDIA_BASE_URL

    router_inst = LLMRouter()
    res = await router_inst.test_model_connection(
        model=req.model,
        api_key=api_key,
        base_url=base_url,
    )
    return res

