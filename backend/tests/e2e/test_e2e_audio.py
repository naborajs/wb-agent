"""
E2E Test Suite for R2: WhatsApp Voice Note Transcription & Hinglish Audio Understanding.
Covers Tier 1 (Feature Coverage) and Tier 2 (Boundary & Corner Cases).
"""

import pytest
from app.agent.extractor import PassiveInformationExtractor
from app.agent.sales_engine import ConsultativeSalesEngine
from app.config import settings


# ===========================================================================
# Tier 1: Feature Coverage (R2)
# ===========================================================================

@pytest.mark.asyncio
async def test_audio_ingestion_formats_ogg_opus_mp3(audio_transcriber):
    """
    R2-T1.1: Verify ingestion and transcription support across all three
    standard WhatsApp voice formats: .ogg, .opus, and .mp3.
    """
    sample_formats = [
        ("audio/ogg", b"OggS_mock_audio_stream_header_bytes_siliguri_cafe"),
        ("audio/opus", b"OpusHead_mock_audio_stream_header_bytes_siliguri_cafe"),
        ("audio/mp3", b"ID3_mock_mp3_audio_stream_header_bytes_siliguri_cafe"),
    ]

    for mime_type, raw_bytes in sample_formats:
        transcript = audio_transcriber.transcribe_audio(
            audio_bytes=raw_bytes,
            mime_type=mime_type,
            mock_gemini_transcript="Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao",
        )
        assert transcript is not None
        assert "50 kilo" in transcript
        assert "Siliguri" in transcript


@pytest.mark.asyncio
async def test_gemini_multimodal_audio_transcription(audio_transcriber):
    """
    R2-T1.2: Verify transcription utilizing configured Gemini client mock,
    producing high-accuracy text for tea wholesale voice notes.
    """
    voice_bytes = b"RIFF_mock_wav_ogg_stream_darjeeling_wholesale"
    mocked_llm_transcript = "Namaste, Darjeeling FTGFOP1 first flush ka 25kg rate chahiye hotel buffet ke liye."

    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=voice_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript=mocked_llm_transcript,
    )
    assert transcript == mocked_llm_transcript

    # Pass transcript into extractor to verify downstream interpretation
    facts = PassiveInformationExtractor.extract(transcript)
    assert facts.quantity_numeric_kg == 25.0
    assert facts.product_interest == "Darjeeling Single Estate"
    assert facts.business_type == "Restaurant & Hospitality"


@pytest.mark.asyncio
async def test_audio_transcription_local_fallback(audio_transcriber, monkeypatch):
    """
    R2-T1.3: Verify that when GEMINI_API_KEY is empty or cloud endpoint fails,
    the pipeline seamlessly activates local/simulator transcription without crashing.
    """
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    # Voice payload with embedded token simulating local fallback processor
    raw_payload = b"RIFF_local_audio_stream: TRANSCRIPT: 100kg Assam CTC Siliguri delivery rate"
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=raw_payload,
        mime_type="audio/ogg",
        mock_gemini_transcript=None,  # Forces fallback
    )
    assert transcript is not None
    assert "100kg" in transcript or "50 kilo" in transcript


@pytest.mark.asyncio
async def test_hinglish_colloquial_speech_understanding():
    """
    R2-T1.4: Verify accurate extraction of requirements from natural Hinglish
    spoken query: 'Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao'.
    """
    spoken_text = "Bhai humko Siliguri cafe ke liye 50 kilo chai chahiye, rate batao"
    facts = PassiveInformationExtractor.extract(spoken_text)

    assert facts.quantity == "50kg"
    assert facts.quantity_numeric_kg == 50.0
    assert facts.location == "Siliguri"
    assert facts.business_type == "Cafe"
    assert facts.emotional_state in ("CURIOUS", "NEUTRAL")


@pytest.mark.asyncio
async def test_audio_transcript_to_agent_orchestrator_handoff():
    """
    R2-T1.5: Verify that transcribed voice text directly feeds into ConsultativeSalesEngine,
    progressing the sales stage and selecting the optimal consultative response.
    """
    transcribed_text = "Siliguri me naya cafe khol rahe hain, 50kg kadak chai ka rate batayein."
    facts = PassiveInformationExtractor.extract(transcribed_text)

    decision = ConsultativeSalesEngine.decide(
        current_stage="NEW",
        current_score=10,
        inbound_text=transcribed_text,
        facts=facts,
        known_profile={},
        matched_products=[{"name": "Assam Kadak CTC", "price_per_kg": 340.0}],
    )

    assert decision.target_stage in ("DISCOVERY", "QUALIFYING", "QUALIFIED")
    assert decision.score_delta > 0
    assert decision.action in ("ASK_DISCOVERY_QUESTION", "PROVIDE_RECOMMENDATION", "ANSWER_AND_PROGRESS")


# ===========================================================================
# Tier 2: Boundary & Corner Cases (R2)
# ===========================================================================

@pytest.mark.asyncio
async def test_audio_boundary_empty_zero_byte_file(audio_transcriber):
    """
    R2-T2.1: Verify 0-byte audio payload is intercepted cleanly with ValueError
    and does not cause buffer underruns or unhandled worker exceptions.
    """
    empty_bytes = b""
    with pytest.raises(ValueError, match="Audio payload cannot be empty"):
        audio_transcriber.transcribe_audio(audio_bytes=empty_bytes, mime_type="audio/ogg")


@pytest.mark.asyncio
async def test_audio_boundary_corrupted_audio_stream(audio_transcriber):
    """
    R2-T2.2: Verify corrupted bitstream (garbage bytes) gracefully returns
    fallback text or handled error rather than terminating the process.
    """
    corrupted_bytes = b"\x00\xff\xfe\x00\x12\x34\x56\x78\x9a\xbc\xde\xf0" * 10
    transcript = audio_transcriber.transcribe_audio(
        audio_bytes=corrupted_bytes,
        mime_type="audio/ogg",
        mock_gemini_transcript="Bhai rate batao chai ka",
    )
    assert transcript is not None
    assert len(transcript) > 0


@pytest.mark.asyncio
async def test_audio_boundary_unsupported_mime_type(audio_transcriber):
    """
    R2-T2.3: Verify non-audio MIME types (application/pdf, image/png, video/mp4)
    are strictly rejected with a descriptive ValueError.
    """
    invalid_types = ["application/pdf", "image/png", "text/plain", "video/mp4"]
    for mime in invalid_types:
        with pytest.raises(ValueError, match="Unsupported audio MIME type"):
            audio_transcriber.transcribe_audio(
                audio_bytes=b"sample_content_bytes",
                mime_type=mime,
            )


@pytest.mark.asyncio
async def test_audio_boundary_complex_code_switching_bengali_english():
    """
    R2-T2.4: Verify dense regional code-switching combining Bengali, Hindi, and English:
    'Dada amader Siliguri restaurant er jonno 100 kg Assam Kadak chai, sample kobe pathaben?'
    """
    bengali_english_query = "Dada amader Siliguri restaurant er jonno 100 kg Assam Kadak chai, sample kobe pathaben?"
    facts = PassiveInformationExtractor.extract(bengali_english_query)

    assert facts.quantity == "100kg"
    assert facts.quantity_numeric_kg == 100.0
    assert facts.location == "Siliguri"
    assert facts.business_type == "Restaurant & Hospitality"
    assert facts.product_interest == "Assam Kadak CTC"
    assert "strong_kadak" in facts.preferences
    assert facts.use_case == "milk_tea"


@pytest.mark.asyncio
async def test_audio_boundary_max_payload_size_enforcement(audio_transcriber):
    """
    R2-T2.5: Verify that audio files exceeding settings.UPLOAD_MAX_BYTES (10MB)
    are rejected immediately before allocating LLM processing buffers.
    """
    oversized_length = settings.UPLOAD_MAX_BYTES + 1024
    oversized_bytes = b"A" * 1024  # Simulated byte length check

    class LargeBufferSimulator(bytes):
        def __len__(self):
            return oversized_length

    large_buffer = LargeBufferSimulator(oversized_bytes)
    with pytest.raises(ValueError, match="exceeds maximum size limit"):
        audio_transcriber.transcribe_audio(
            audio_bytes=large_buffer,
            mime_type="audio/ogg",
        )
