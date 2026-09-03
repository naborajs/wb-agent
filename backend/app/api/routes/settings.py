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


import os
from typing import List


class ModelSettingsUpdateRequest(BaseModel):
    primary_model: Optional[str] = None
    fallback_models: Optional[List[str]] = None
    primary_api_key: Optional[str] = None
    fallback_api_key: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None


AVAILABLE_MODELS = [
    {
        "id": "nvidia/nemotron-3-ultra-550b-a55b",
        "name": "Nemotron-3 Ultra 550B (Flagship Thinking)",
        "params": "550B",
        "category": "Flagship Thinking",
        "latency_label": "~20s",
        "description": "NVIDIA flagship 550B parameter model for deep consultative sales reasoning and custom proposals.",
    },
    {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "name": "Nemotron-3 Nano Omni 30B (Ultra-Fast Reasoning)",
        "params": "30B",
        "category": "Fast Reasoning",
        "latency_label": "~1.4s",
        "description": "High-throughput 30B reasoning model for rapid turn-by-turn dialogue and negotiation.",
    },
    {
        "id": "nvidia/nemotron-3-super-120b-a12b",
        "name": "Nemotron-3 Super 120B (High Performance)",
        "params": "120B",
        "category": "Balanced",
        "latency_label": "~790ms",
        "description": "Sub-second 120B model ideal for objection handling and multi-product comparisons.",
    },
    {
        "id": "google/gemma-4-31b-it",
        "name": "Google Gemma 4 31B IT",
        "params": "31B",
        "category": "Multimodal / Instruction",
        "latency_label": "Variable",
        "description": "Google 31B instruction-tuned model for structured policy adherence.",
    },
    {
        "id": "nvidia/nemotron-3.5-lightning-30b-a3b",
        "name": "Nemotron-3.5 Lightning 30B",
        "params": "30B",
        "category": "Speed-Optimized",
        "latency_label": "~650ms",
        "description": "NVIDIA lightning inference model tuned for fast message classification and greeting turns.",
    },
]


def update_local_env_file(updates: Dict[str, str]):
    """Safely updates variables in the local .env file to persist dashboard changes."""
    candidates = [
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env"),
    ]
    target_path = None
    for p in candidates:
        if os.path.exists(p):
            target_path = p
            break

    if not target_path:
        target_path = candidates[0]
        with open(target_path, "w", encoding="utf-8") as f:
            f.write("# WB-Agent Environment Configuration\n")

    with open(target_path, "r", encoding="utf-8") as f:
        lines = f.readlines()

    keys_found = set()
    new_lines = []
    for line in lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            k, _ = stripped.split("=", 1)
            k = k.strip()
            if k in updates:
                new_lines.append(f"{k}={updates[k]}\n")
                keys_found.add(k)
                continue
        new_lines.append(line)

    for k, v in updates.items():
        if k not in keys_found:
            new_lines.append(f"{k}={v}\n")

    with open(target_path, "w", encoding="utf-8") as f:
        f.writelines(new_lines)


@router.get("/models")
async def get_model_settings():
    """Returns configured primary thinking model, fallback model sequence, and parameters."""
    primary_key = settings.NVIDIA_API_KEY or ""
    fallback_key = getattr(settings, "NVIDIA_FALLBACK_API_KEY", "") or ""

    raw_fallbacks = getattr(settings, "NVIDIA_FALLBACK_MODELS", "")
    fallback_list = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
    if not fallback_list:
        fallback_list = [
            "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
            "nvidia/nemotron-3-super-120b-a12b",
            "google/gemma-4-31b-it",
        ]

    return {
        "primary_model": settings.NVIDIA_MODEL,
        "fallback_models": fallback_list,
        "primary_api_key_masked": f"{primary_key[:8]}...{primary_key[-4:]}" if len(primary_key) > 12 else "Not configured",
        "fallback_api_key_masked": f"{fallback_key[:8]}...{fallback_key[-4:]}" if len(fallback_key) > 12 else "Not configured",
        "primary_api_key_configured": bool(primary_key and not primary_key.startswith("nvapi-mock")),
        "fallback_api_key_configured": bool(fallback_key),
        "temperature": settings.LLM_TEMPERATURE,
        "max_tokens": settings.LLM_MAX_TOKENS,
        "timeout": settings.LLM_REQUEST_TIMEOUT,
        "available_models": AVAILABLE_MODELS,
    }


@router.post("/models")
async def update_model_settings(req: ModelSettingsUpdateRequest):
    """
    Updates model hierarchy, fallback sequence, API keys, and parameters.
    Persists updates locally into the .env file and updates runtime settings immediately.
    """
    env_updates: Dict[str, str] = {}

    if req.primary_model:
        settings.NVIDIA_MODEL = req.primary_model
        env_updates["NVIDIA_MODEL"] = req.primary_model

    if req.fallback_models is not None:
        joined_fallbacks = ",".join([m.strip() for m in req.fallback_models if m.strip()])
        setattr(settings, "NVIDIA_FALLBACK_MODELS", joined_fallbacks)
        env_updates["NVIDIA_FALLBACK_MODELS"] = joined_fallbacks

    if req.primary_api_key and req.primary_api_key.strip():
        clean_key = req.primary_api_key.strip()
        settings.NVIDIA_API_KEY = clean_key
        env_updates["NVIDIA_API_KEY"] = clean_key

    if req.fallback_api_key and req.fallback_api_key.strip():
        clean_fb_key = req.fallback_api_key.strip()
        setattr(settings, "NVIDIA_FALLBACK_API_KEY", clean_fb_key)
        env_updates["NVIDIA_FALLBACK_API_KEY"] = clean_fb_key

    if req.temperature is not None:
        settings.LLM_TEMPERATURE = req.temperature
        env_updates["LLM_TEMPERATURE"] = str(req.temperature)

    if req.max_tokens is not None:
        settings.LLM_MAX_TOKENS = req.max_tokens
        env_updates["LLM_MAX_TOKENS"] = str(req.max_tokens)

    if req.timeout is not None:
        settings.LLM_REQUEST_TIMEOUT = req.timeout
        env_updates["LLM_REQUEST_TIMEOUT"] = str(req.timeout)

    # Persist locally in .env
    if env_updates:
        update_local_env_file(env_updates)

    return {
        "success": True,
        "message": f"Updated {len(env_updates)} parameters locally in .env and runtime.",
        "settings": await get_model_settings(),
    }


