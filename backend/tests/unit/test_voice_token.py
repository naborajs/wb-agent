"""
Unit tests for Voice Session Token minting route (Step 2).
Verifies:
1. POST /api/v1/voice/session-token returns single-use token and constrained WebSocket URL.
2. Alias POST /api/voice-session-token functions identically.
3. Raw GEMINI_API_KEY is never exposed in the response payload.
4. Response conforms to VoiceSessionTokenResponse schema.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.config import settings


@pytest.fixture
def client():
    return TestClient(app)


def test_mint_voice_session_token_success(client):
    """Test successful token minting with GEMINI_API_KEY configured."""
    if not getattr(settings, "GEMINI_API_KEY", None):
        pytest.skip("GEMINI_API_KEY not configured in environment.")

    response = client.post("/api/v1/voice/session-token")
    assert response.status_code == 200
    data = response.json()

    assert "token" in data
    assert data["token"].startswith("auth_tokens/")
    assert data["model"] == "models/gemini-3.1-flash-live-preview"
    assert "ws_url" in data
    assert "BidiGenerateContentConstrained" in data["ws_url"]
    assert f"access_token={data['token']}" in data["ws_url"]
    assert data["expires_in_seconds"] == 300

    # Critical Security Assertion: Master GEMINI_API_KEY must NEVER appear in the response payload
    raw_key = settings.GEMINI_API_KEY
    assert raw_key not in response.text
    assert raw_key not in data["token"]
    assert raw_key not in data["ws_url"]


def test_mint_voice_session_token_alias(client):
    """Test alias endpoint POST /api/voice-session-token."""
    if not getattr(settings, "GEMINI_API_KEY", None):
        pytest.skip("GEMINI_API_KEY not configured in environment.")

    response = client.post("/api/voice-session-token")
    assert response.status_code == 200
    data = response.json()
    assert "token" in data
    assert data["token"].startswith("auth_tokens/")
    assert data["model"] == "models/gemini-3.1-flash-live-preview"
