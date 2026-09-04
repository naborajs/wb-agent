"""
Audio & Voice Note Ingestion and Transcription API Routes (R2).
Provides endpoints to transcribe incoming WhatsApp audio files (.ogg, .opus, .mp3)
using multimodal Gemini and local fallback.
"""

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, status
from pydantic import BaseModel
from typing import Optional, Dict, Any

from app.audio.service import AudioTranscriptionService
from app.agent.extractor import PassiveInformationExtractor

router = APIRouter(prefix="/audio", tags=["Audio & Voice Notes"])


class AudioTranscribeRequest(BaseModel):
    audio_base64: str
    mime_type: str = "audio/ogg"
    mock_gemini_transcript: Optional[str] = None


class AudioTranscribeResponse(BaseModel):
    transcript: str
    extracted_facts: Dict[str, Any]
    mime_type: str


@router.post("/transcribe", response_model=AudioTranscribeResponse)
async def transcribe_audio_file(
    file: UploadFile = File(...),
):
    """
    Transcribe uploaded audio file (.ogg, .opus, .mp3, .wav)
    and passively extract buyer requirements.
    """
    content_type = file.content_type or "audio/ogg"
    try:
        audio_bytes = await file.read()
        transcript = await AudioTranscriptionService.transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=content_type,
        )
        extracted = PassiveInformationExtractor.extract(transcript)
        return AudioTranscribeResponse(
            transcript=transcript,
            extracted_facts=extracted.model_dump(),
            mime_type=content_type,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(e)}",
        )


@router.post("/transcribe-base64", response_model=AudioTranscribeResponse)
async def transcribe_audio_base64(
    request: AudioTranscribeRequest,
):
    """
    Transcribe base64-encoded audio payload from WhatsApp bridge webhook.
    """
    import base64
    try:
        audio_bytes = base64.b64decode(request.audio_base64)
        transcript = await AudioTranscriptionService.transcribe_audio(
            audio_bytes=audio_bytes,
            mime_type=request.mime_type,
            mock_gemini_transcript=request.mock_gemini_transcript,
        )
        extracted = PassiveInformationExtractor.extract(transcript)
        return AudioTranscribeResponse(
            transcript=transcript,
            extracted_facts=extracted.model_dump(),
            mime_type=request.mime_type,
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Audio transcription failed: {str(e)}",
        )
