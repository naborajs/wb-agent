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
    # Domain & Business Customization
    business_name: Optional[str] = None
    business_industry: Optional[str] = None
    business_tagline: Optional[str] = None
    business_description: Optional[str] = None
    agent_name: Optional[str] = None
    agent_role: Optional[str] = None
    currency_symbol: Optional[str] = None
    catalog_unit: Optional[str] = None


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
        # Domain & Business Profile
        "business_name": getattr(settings, "BUSINESS_NAME", "My Business"),
        "business_industry": getattr(settings, "BUSINESS_INDUSTRY", "General Business"),
        "business_tagline": getattr(settings, "BUSINESS_TAGLINE", "AI-Powered Business Operations"),
        "business_description": getattr(settings, "BUSINESS_DESCRIPTION", "AI-powered business operations platform for managing sales, customer interactions, and order processing."),
        "agent_name": getattr(settings, "AGENT_NAME", "EDITH"),
        "agent_role": getattr(settings, "AGENT_ROLE", "AI Sales & Support Agent"),
        "currency_symbol": getattr(settings, "CURRENCY_SYMBOL", "₹"),
        "catalog_unit": getattr(settings, "CATALOG_UNIT", "unit"),
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
    # Domain & Business Profile updates
    if req.business_name is not None:
        setattr(settings, "BUSINESS_NAME", req.business_name)
    if req.business_industry is not None:
        setattr(settings, "BUSINESS_INDUSTRY", req.business_industry)
    if req.business_tagline is not None:
        setattr(settings, "BUSINESS_TAGLINE", req.business_tagline)
    if req.business_description is not None:
        setattr(settings, "BUSINESS_DESCRIPTION", req.business_description)
    if req.agent_name is not None:
        setattr(settings, "AGENT_NAME", req.agent_name)
    if req.agent_role is not None:
        setattr(settings, "AGENT_ROLE", req.agent_role)
    if req.currency_symbol is not None:
        setattr(settings, "CURRENCY_SYMBOL", req.currency_symbol)
    if req.catalog_unit is not None:
        setattr(settings, "CATALOG_UNIT", req.catalog_unit)

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
    from app.ai.router import ai_router

    api_key = req.api_key or settings.nvidia_primary_key
    base_url = req.base_url or settings.NVIDIA_BASE_URL

    res = await ai_router.test_model_connection(
        model=req.model,
        api_key=api_key,
        base_url=base_url,
    )
    return res


@router.get("/ai/metrics")
async def get_ai_metrics():
    """
    Returns real-time cost, latency, and reliability telemetry for the NVIDIA NIM layer (Directive §4.6).
    """
    from app.ai.router import ai_router
    from app.ai.circuit_breaker import circuit_breaker

    return {
        "metrics": ai_router.metrics,
        "circuit_breaker_active": len(circuit_breaker._state) > 0,
        "circuit_cooldown_seconds": circuit_breaker.cooldown_seconds,
    }


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
    # Google Gemini Suite
    {
        "id": "gemini-2.5-flash",
        "name": "Gemini 2.5 Flash (Recommended)",
        "params": "Frontier",
        "category": "Google Gemini",
        "latency_label": "~180ms",
        "description": "Ultra-fast multimodal reasoning with 1M context. Perfect for Friday web copilot and real-time operations.",
    },
    {
        "id": "gemini-2.5-pro",
        "name": "Gemini 2.5 Pro (Deep Reasoning)",
        "params": "Frontier Pro",
        "category": "Google Gemini",
        "latency_label": "~650ms",
        "description": "Deep 2M context reasoning for complex document analysis, catalog drafting, and contracts.",
    },
    {
        "id": "gemini-3.1-flash-live-preview",
        "name": "Gemini 3.1 Flash Live (Voice Streaming)",
        "params": "Live Preview",
        "category": "Google Gemini",
        "latency_label": "~120ms",
        "description": "Native bidirectional 16kHz PCM audio streaming for Friday hands-free voice control.",
    },
    {
        "id": "gemini-2.5-flash-lite",
        "name": "Gemini 2.5 Flash-Lite (Speed-Optimized)",
        "params": "Lite",
        "category": "Google Gemini",
        "latency_label": "~110ms",
        "description": "Ultra-low-latency lightweight turns for split-second conversational interactions.",
    },
    {
        "id": "gemini-3.5-flash",
        "name": "Gemini 3.5 Flash",
        "params": "Next-Gen",
        "category": "Google Gemini",
        "latency_label": "~190ms",
        "description": "High-throughput multimodal assistant for catalog inspection and customer replies.",
    },
    # NVIDIA NIM Suite (Included / Free under user key)
    {
        "id": "meta/llama-3.3-70b-instruct",
        "name": "Llama 3.3 70B Instruct (Commercial Closer)",
        "params": "70B",
        "category": "NVIDIA NIM",
        "latency_label": "~340ms",
        "description": "EDITH Primary Negotiator: Rigorous commercial objection handling, margin defense, and closing.",
    },
    {
        "id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "name": "Nemotron-3 Nano Omni 30B (Cadence Guard)",
        "params": "30B",
        "category": "NVIDIA NIM",
        "latency_label": "~220ms",
        "description": "High-speed customer message cadence checking, anti-spam validation, and instant price sanity checks.",
    },
    {
        "id": "nvidia/nemotron-3-super-120b-a12b",
        "name": "Nemotron-3 Super 120B (Frontier Reasoning)",
        "params": "120B",
        "category": "NVIDIA NIM",
        "latency_label": "~420ms",
        "description": "Frontier reasoning & agentic deliberation with 1M context. Balanced commercial evaluator.",
    },
    {
        "id": "nvidia/nemotron-4-340b-instruct",
        "name": "Nemotron-4 340B Instruct (Enterprise Negotiation)",
        "params": "340B",
        "category": "NVIDIA NIM",
        "latency_label": "~490ms",
        "description": "Deep enterprise commercial negotiations, multi-year supply contracts, and high-stakes arbitration.",
    },
    {
        "id": "nvidia/nemotron-3-ultra-550b-a55b",
        "name": "Nemotron-3 Ultra 550B (Governance Audit)",
        "params": "550B",
        "category": "NVIDIA NIM",
        "latency_label": "~650ms",
        "description": "Complex legal auditing, export compliance, non-compete clauses, and executive governance.",
    },
    {
        "id": "deepseek-ai/deepseek-r1",
        "name": "DeepSeek R1 (Open Reasoning Flagship)",
        "params": "671B MoE",
        "category": "NVIDIA NIM",
        "latency_label": "~580ms",
        "description": "Advanced mathematical reasoning and deep algorithmic negotiation logic.",
    },
    {
        "id": "qwen/qwen2.5-72b-instruct",
        "name": "Qwen 2.5 72B Instruct (Multilingual)",
        "params": "72B",
        "category": "NVIDIA NIM",
        "latency_label": "~360ms",
        "description": "High-accuracy multilingual instruction following across regional Indian and international trade dialects.",
    },
    {
        "id": "mistralai/mistral-large-2411",
        "name": "Mistral Large 2411",
        "params": "123B",
        "category": "NVIDIA NIM",
        "latency_label": "~390ms",
        "description": "High-precision commercial reasoning and contract clause interpretation.",
    },
    {
        "id": "google/gemma-4-31b-it",
        "name": "Gemma 4 31B IT",
        "params": "31B",
        "category": "NVIDIA NIM",
        "latency_label": "~260ms",
        "description": "Compact regional dialect understanding, Indic multilingual queries, and structured JSON parsing.",
    },
    {
        "id": "openai/gpt-oss-20b",
        "name": "OpenAI GPT-OSS 20B (Logic & Watchdog)",
        "params": "20B",
        "category": "NVIDIA NIM",
        "latency_label": "~240ms",
        "description": "General text, logic, and numeric sanity checks for pricing and watchdog audits.",
    },
]


def update_local_env_file(updates: Dict[str, str]):
    """Safely updates variables in all local .env files to persist dashboard changes."""
    candidates = {
        os.path.abspath(os.path.join(os.getcwd(), ".env")),
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")),
        os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), "backend", ".env")),
    }
    for target_path in candidates:
        if not os.path.exists(target_path):
            continue
        try:
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
        except Exception:
            pass


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


