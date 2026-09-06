"""
Voice Agent Live Session & Ephemeral Token Minting API Route (Step 2).
Mints short-lived, single-use authentication tokens scoped strictly to
gemini-3.1-flash-live-preview for the browser dashboard voice control layer.
"""

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel
from typing import Optional
from google import genai
from google.genai import types

from app.config import settings
from app.utils.logging import logger

router = APIRouter(prefix="/voice", tags=["Voice Agent"])


class VoiceSessionTokenResponse(BaseModel):
    token: str
    model: str
    ws_url: str
    expires_in_seconds: int


@router.post("/session-token", response_model=VoiceSessionTokenResponse)
async def mint_voice_session_token():
    """
    Mints a short-lived (5 min), single-use ephemeral token scoped to
    `models/gemini-3.1-flash-live-preview` via Google GenAI Auth Tokens API.
    Guarantees the raw server GEMINI_API_KEY is never exposed to the client.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key or not api_key.strip():
        logger.error("Voice session token requested, but GEMINI_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API Key is not configured on the server. Please set GEMINI_API_KEY in .env.",
        )

    target_model = "models/gemini-3.1-flash-live-preview"

    try:
        client = genai.Client(api_key=api_key.strip(), http_options={"api_version": "v1alpha"})
        auth_token = client.auth_tokens.create(
            config=types.CreateAuthTokenConfig(
                uses=1,
                live_connect_constraints=types.LiveConnectConstraints(
                    model=target_model,
                    config=types.LiveConnectConfig(
                        response_modalities=["AUDIO"],
                    ),
                ),
                lock_additional_fields=[],
            )
        )

        token_name = auth_token.name
        ws_url = (
            f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha."
            f"GenerativeService.BidiGenerateContentConstrained?access_token={token_name}"
        )

        logger.info("Minted ephemeral voice session token for model %s (single-use)", target_model)

        return VoiceSessionTokenResponse(
            token=token_name,
            model=target_model,
            ws_url=ws_url,
            expires_in_seconds=300,
        )
    except Exception as e:
        logger.error(f"Failed to mint ephemeral voice session token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Gemini Live ephemeral token: {str(e)}",
        )
