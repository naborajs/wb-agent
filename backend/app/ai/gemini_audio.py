"""
Scoped Gemini Audio Client for Capability D Fallback 1 (Directive §3.D & §5).
Invokes Gemini Live / multimodal audio transcription strictly when designated in voice fallback.
"""

import base64
import time
from typing import Optional
import httpx
from app.config import settings
from app.utils.logging import logger


class GeminiAudioClient:
    """
    Scoped client for Gemini audio multimodal comprehension.
    Permitted only as a first-class voice fallback (§3.D) or true last-resort emergency fallback (§5).
    """

    DEFAULT_MODEL = "gemini-3.1-flash-live-preview"
    FALLBACK_MODEL = "gemini-1.5-flash"

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or getattr(settings, "GEMINI_API_KEY", "")

    async def transcribe_audio(
        self,
        audio_bytes: bytes,
        mime_type: str = "audio/ogg",
        model: Optional[str] = None,
    ) -> str:
        """
        Transcribes audio bytes into text using Google Gemini Multimodal API.
        """
        if not self.api_key or not self.api_key.strip():
            logger.info("Gemini API key not configured; skipping Gemini audio fallback.")
            return ""

        target_model = model or self.DEFAULT_MODEL
        clean_mime = mime_type.lower().split(";")[0].strip()
        if clean_mime == "audio/opus":
            clean_mime = "audio/ogg"

        b64_audio = base64.b64encode(audio_bytes).decode("utf-8")
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{target_model}:generateContent?key={self.api_key}"

        prompt = (
            "You are an expert transcriber for wholesale B2B WhatsApp voice notes in India. "
            "Accurately transcribe the spoken words in the audio exactly as spoken. "
            "The customer may speak in English, Hindi, or conversational Hinglish "
            "(e.g., 'Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao'). "
            "Output ONLY the transcribed text with no explanations or preamble."
        )

        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt},
                        {
                            "inline_data": {
                                "mime_type": clean_mime,
                                "data": b64_audio,
                            }
                        },
                    ]
                }
            ],
            "generationConfig": {
                "temperature": 0.0,
                "maxOutputTokens": 512,
            },
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, json=payload)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            return parts[0].get("text", "").strip()
                elif resp.status_code == 404 and target_model != self.FALLBACK_MODEL:
                    # Model not found on preview endpoint -> try stable fallback model
                    logger.info(f"Model {target_model} 404'd, attempting fallback model {self.FALLBACK_MODEL}")
                    return await self.transcribe_audio(audio_bytes, mime_type=mime_type, model=self.FALLBACK_MODEL)
                else:
                    logger.warning(f"Gemini API returned status {resp.status_code}: {resp.text[:200]}")
        except Exception as e:
            logger.warning(f"Gemini audio transcription failed: {e}")

        return ""
