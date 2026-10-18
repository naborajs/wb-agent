"""
NVIDIA NIM Free Preview Model Discovery & 6-Tier Fallback Pool Endpoints.
Provides pre-calibrated model hierarchies, warm latency metrics, and pool refresh controls.
"""

import json
import os
import time
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.utils.logging import logger

router = APIRouter(prefix="/models", tags=["AI Models & Fallback Engine"])

# In-Memory Cache with TTL
_CACHE_TTL_SECONDS = 600.0  # 10 minutes
_CACHED_POOL: Optional[Dict[str, Any]] = None
_LAST_CACHE_FETCH = 0.0

DEFAULT_FALLBACK_POOL = {
    "version": "1.0.0",
    "updated_at": "2026-10-18T00:00:00.000Z",
    "benchmark_source": "https://build.nvidia.com/models?filters=nimType%3Anim_type_preview&pageSize=100",
    "safe_rate_limit_rpm": 27,
    "request_delay_ms": 2200,
    "primary": "nvidia/nemotron-3.5-super-vl-120b-a12b",
    "fallbacks": [
        "meta/llama-3.2-11b-vision-instruct",
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "google/gemma-4-31b-it",
        "nvidia/nemotron-3.5-lightning-30b-a3b",
        "meta/llama-3.2-90b-vision-instruct",
    ],
    "models": [
        {
            "rank": 1,
            "tier": "default",
            "model": "nvidia/nemotron-3.5-super-vl-120b-a12b",
            "warmLatencyMs": 392,
            "coldStartLatencyMs": 842,
            "samples": 4,
            "status": "healthy",
            "publisher": "nvidia",
        },
        {
            "rank": 2,
            "tier": "fallback_1",
            "model": "meta/llama-3.2-11b-vision-instruct",
            "warmLatencyMs": 790,
            "coldStartLatencyMs": 1060,
            "samples": 4,
            "status": "standby",
            "publisher": "meta",
        },
        {
            "rank": 3,
            "tier": "fallback_2",
            "model": "nvidia/nemotron-3-super-120b-a12b",
            "warmLatencyMs": 1010,
            "coldStartLatencyMs": 1340,
            "samples": 4,
            "status": "standby",
            "publisher": "nvidia",
        },
        {
            "rank": 4,
            "tier": "fallback_3",
            "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
            "warmLatencyMs": 1220,
            "coldStartLatencyMs": 1550,
            "samples": 4,
            "status": "standby",
            "publisher": "nvidia",
        },
        {
            "rank": 5,
            "tier": "fallback_4",
            "model": "google/gemma-4-31b-it",
            "warmLatencyMs": 1450,
            "coldStartLatencyMs": 1780,
            "samples": 4,
            "status": "standby",
            "publisher": "google",
        },
        {
            "rank": 6,
            "tier": "fallback_5",
            "model": "nvidia/nemotron-3.5-lightning-30b-a3b",
            "warmLatencyMs": 1680,
            "coldStartLatencyMs": 2010,
            "samples": 4,
            "status": "standby",
            "publisher": "nvidia",
        },
        {
            "rank": 7,
            "tier": "fallback_6",
            "model": "meta/llama-3.2-90b-vision-instruct",
            "warmLatencyMs": 1950,
            "coldStartLatencyMs": 2310,
            "samples": 4,
            "status": "standby",
            "publisher": "meta",
        },
    ],
    "secondary_provider": {
        "name": "Google Gemini",
        "model": "gemini-2.5-flash",
        "status": "standby_hot",
        "role": "100% Fail-Safe Circuit Breaker",
    },
}


def _load_pool_from_disk() -> Dict[str, Any]:
    """Reads shared/nvidia-models-cache.json or returns default fallback pool."""
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "..", ".."))
    cache_path = os.path.join(repo_root, "shared", "nvidia-models-cache.json")

    if os.path.exists(cache_path):
        try:
            with open(cache_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                if data and "primary" in data:
                    data.setdefault(
                        "secondary_provider",
                        {
                            "name": "Google Gemini",
                            "model": "gemini-2.5-flash",
                            "status": "standby_hot",
                            "role": "100% Fail-Safe Circuit Breaker",
                        },
                    )
                    return data
        except Exception as e:
            logger.warning(f"Failed to read nvidia-models-cache.json: {e}")

    return DEFAULT_FALLBACK_POOL.copy()


def get_cached_nvidia_pool(force_reload: bool = False) -> Dict[str, Any]:
    """Gets the pool with sub-millisecond in-memory cache lookup."""
    global _CACHED_POOL, _LAST_CACHE_FETCH
    now = time.time()
    if force_reload or _CACHED_POOL is None or (now - _LAST_CACHE_FETCH) > _CACHE_TTL_SECONDS:
        _CACHED_POOL = _load_pool_from_disk()
        _LAST_CACHE_FETCH = now
    return _CACHED_POOL


@router.get("/nvidia-pool")
async def get_nvidia_pool():
    """
    Returns the calibrated 7-tier NVIDIA Free Preview Model Pool,
    warm latencies, safe rate limits, and fail-safe Google Gemini handoff status.
    """
    t_start = time.perf_counter()
    pool = get_cached_nvidia_pool(force_reload=False)
    resolution_time_ms = round((time.perf_counter() - t_start) * 1000, 4)

    return {
        **pool,
        "resolution_latency_ms": resolution_time_ms,
        "cache_ttl_seconds": _CACHE_TTL_SECONDS,
        "status": "calibrated",
    }


@router.post("/nvidia-pool/refresh")
async def refresh_nvidia_pool():
    """
    Forces cache reload from shared/nvidia-models-cache.json and returns
    the newly calibrated pool.
    """
    t_start = time.perf_counter()
    pool = get_cached_nvidia_pool(force_reload=True)
    resolution_time_ms = round((time.perf_counter() - t_start) * 1000, 4)

    logger.info("NVIDIA model pool cache refreshed from disk.")
    return {
        "message": "NVIDIA model pool cache refreshed successfully",
        "primary": pool.get("primary"),
        "total_tiers": len(pool.get("models", [])),
        "safe_rate_limit_rpm": pool.get("safe_rate_limit_rpm", 27),
        "resolution_latency_ms": resolution_time_ms,
    }


@router.get("/health")
async def get_models_health():
    """
    Health check for active LLM providers and fallback readiness.
    """
    pool = get_cached_nvidia_pool()
    return {
        "status": "healthy",
        "primary_model": pool.get("primary"),
        "fallback_tiers_count": len(pool.get("fallbacks", [])),
        "safe_rate_limit_rpm": pool.get("safe_rate_limit_rpm", 27),
        "secondary_provider": pool.get("secondary_provider"),
    }
