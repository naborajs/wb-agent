"""
Unit tests for Voice Agent Agentic Workflows (Step 2 - 6).
Verifies:
1. Ephemeral token generation and constrained URL format.
2. Prompt update workflow via Nemotron delegation.
3. Promotional message generation via Nemotron.
4. Live backend settings updates.
"""

import pytest
from unittest.mock import AsyncMock, patch
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


def test_ephemeral_token_generation(client):
    """Verifies token generation returns model, ws_url, and doesn't leak raw key."""
    if not getattr(settings, "GEMINI_API_KEY", None):
        pytest.skip("GEMINI_API_KEY not configured.")

    res = client.post("/api/v1/voice/session-token")
    assert res.status_code == 200
    data = res.json()
    assert "token" in data
    assert "BidiGenerateContentConstrained" in data["ws_url"]
    assert settings.GEMINI_API_KEY not in res.text


def test_update_backend_setting_kill_switch(client):
    """Verifies voice backend setting update for emergency kill-switch."""
    res = client.post(
        "/api/v1/voice/update-backend-setting",
        json={"category": "kill_switch", "key": "ai_responding", "value": False},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "DISABLED" in data["message"]


def test_generate_promo_message_mock(client):
    """Verifies AI promotional message synthesis endpoint."""
    with patch("app.ai.router.ai_router.execute", new_callable=AsyncMock) as mock_exec:
        mock_resp = AsyncMock()
        mock_resp.content = "*North Bengal Tea Co.* Special: Fresh harvest Darjeeling First Flush with 10% volume discount!"
        mock_resp.model = "nvidia/nemotron-3-ultra-550b-a55b"
        mock_exec.return_value = mock_resp

        res = client.post(
            "/api/v1/voice/generate-promo-message",
            json={
                "target_phone": "+918900653250",
                "recipient_name": "Rahul Sharma",
                "instruction": "Offer 10% discount on fresh Darjeeling first flush",
                "dispatch_whatsapp": False,
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert "Darjeeling" in data["generated_message"]
        assert data["recipient"] == "+918900653250"


def test_update_prompt_via_nemotron_mock(client):
    """Verifies Nemotron prompt evolution endpoint."""
    from app.ai.types import PromptOptimizationResult, PromptRatingBreakdown

    with patch("app.ai.router.ai_router.optimize_system_prompt", new_callable=AsyncMock) as mock_opt:
        mock_opt.return_value = PromptOptimizationResult(
            section="core_identity",
            optimized_prompt="You are Rakesh, senior commercial consultant for North Bengal Tea Co.",
            rating_score=94,
            rating_grade="A",
            rating_breakdown=PromptRatingBreakdown(
                clarity=95, constraint_strength=92, b2b_effectiveness=95, safety_grounding=94
            ),
            summary_of_changes="Changed agent persona name from EDITH to Rakesh as instructed.",
            model_used="nvidia/nemotron-3-ultra-550b-a55b",
            latency_ms=120,
        )

        res = client.post(
            "/api/v1/voice/update-prompt-via-nemotron",
            json={
                "section": "core_identity",
                "instruction": "Change the agent persona name from EDITH to Rakesh",
            },
        )
        assert res.status_code == 200
        data = res.json()
        assert data["success"] is True
        assert data["section"] == "core_identity"
        assert "Rakesh" in data["summary_of_changes"]
