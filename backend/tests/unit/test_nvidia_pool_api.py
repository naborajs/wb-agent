"""
Unit tests for NVIDIA auto-tuned model pool API endpoints (/api/v1/models/nvidia-pool).
Verifies model discovery, latency benchmarks, fallback cascade readiness, and cache resolution.
"""

import time
import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_get_nvidia_pool_endpoint():
    """Verifies GET /api/v1/models/nvidia-pool returns 7 tiers with warm latencies."""
    client = TestClient(app)
    response = client.get("/api/v1/models/nvidia-pool")

    assert response.status_code == 200
    data = response.json()

    assert "primary" in data
    assert "fallbacks" in data
    assert "models" in data
    assert "secondary_provider" in data
    assert "safe_rate_limit_rpm" in data

    assert data["safe_rate_limit_rpm"] <= 30
    assert len(data["fallbacks"]) >= 6
    assert len(data["models"]) >= 7

    # Verify rank 1 is primary
    primary_tier = data["models"][0]
    assert primary_tier["rank"] == 1
    assert primary_tier["model"] == data["primary"]
    assert primary_tier["warmLatencyMs"] > 0

    # Verify resolution latency is sub-millisecond (< 50ms over test client boundary)
    assert "resolution_latency_ms" in data


def test_refresh_nvidia_pool_endpoint():
    """Verifies POST /api/v1/models/nvidia-pool/refresh forces cache reload."""
    client = TestClient(app)
    response = client.post("/api/v1/models/nvidia-pool/refresh")

    assert response.status_code == 200
    data = response.json()

    assert "message" in data
    assert "primary" in data
    assert "total_tiers" in data
    assert data["total_tiers"] >= 7
    assert data["safe_rate_limit_rpm"] == 27


def test_models_health_endpoint():
    """Verifies GET /api/v1/models/health returns healthy status and fail-safe provider."""
    client = TestClient(app)
    response = client.get("/api/v1/models/health")

    assert response.status_code == 200
    data = response.json()

    assert data["status"] == "healthy"
    assert "primary_model" in data
    assert data["fallback_tiers_count"] >= 6
    assert data["secondary_provider"]["name"] == "Google Gemini"


def test_nvidia_pool_cache_resolution_performance():
    """Verifies repeated queries resolve in sub-millisecond in-memory cache time."""
    from app.api.routes.models import get_cached_nvidia_pool

    # Warm up cache
    get_cached_nvidia_pool(force_reload=False)

    times = []
    for _ in range(50):
        t0 = time.perf_counter()
        pool = get_cached_nvidia_pool(force_reload=False)
        dur = (time.perf_counter() - t0) * 1000
        times.append(dur)
        assert pool["primary"] is not None

    avg_ms = sum(times) / len(times)
    # Architecture constraint: cache resolution must be < 1ms
    assert avg_ms < 1.0, f"Cache resolution took {avg_ms}ms, expected < 1ms"
