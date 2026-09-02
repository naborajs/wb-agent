"""
Unit tests for configuration loading, phone number normalization, and structured logging.
"""

import os
import pytest
from app.config import Settings
from app.utils.phone import (
    normalize_phone_number,
    extract_country_code,
    mask_phone_number,
    clean_phone_digits,
)
from app.utils.logging import (
    redact_sensitive_dict,
    request_id_ctx,
    conversation_id_ctx,
    setup_logger,
)


def test_phone_normalization_standard_indian():
    # 10 digits
    assert normalize_phone_number("8900653250") == "+918900653250"
    # With spaces and punctuation
    assert normalize_phone_number("+91 89006 53250") == "+918900653250"
    assert normalize_phone_number("+91-89006-53250") == "+918900653250"
    # Leading 0 (11 digits)
    assert normalize_phone_number("08900653250") == "+918900653250"
    # Leading 00 international
    assert normalize_phone_number("00918900653250") == "+918900653250"
    # Already without plus but with country code (12 digits)
    assert normalize_phone_number("918900653250") == "+918900653250"


def test_phone_normalization_international():
    # US number
    assert normalize_phone_number("+14155552671") == "+14155552671"
    assert normalize_phone_number("+1 (415) 555-2671") == "+14155552671"
    # UK number
    assert normalize_phone_number("+447911123456") == "+447911123456"


def test_phone_normalization_invalid():
    with pytest.raises(ValueError):
        normalize_phone_number("")
    with pytest.raises(ValueError):
        normalize_phone_number("123")  # Too short
    with pytest.raises(ValueError):
        normalize_phone_number("1234567890123456789")  # Too long
    with pytest.raises(ValueError):
        normalize_phone_number("invalid-letters-only")


def test_extract_country_code():
    assert extract_country_code("+918900653250") == "+91"
    assert extract_country_code("+14155552671") == "+1"
    assert extract_country_code("+447911123456") == "+44"


def test_mask_phone_number():
    masked = mask_phone_number("+918900653250")
    assert masked.startswith("+9189006")
    assert masked.endswith("*****")
    assert "53250" not in masked


def test_config_owner_number_validation():
    # Setting unformatted owner number should automatically normalize to E.164
    s = Settings(OWNER_WHATSAPP_NUMBER="+91 89006 53250")
    assert s.OWNER_WHATSAPP_NUMBER == "+918900653250"

    s2 = Settings(OWNER_WHATSAPP_NUMBER="8900653250")
    assert s2.OWNER_WHATSAPP_NUMBER == "+918900653250"


def test_config_cors_origins_parsing():
    s = Settings(CORS_ORIGINS='["http://localhost:3000", "https://app.example.com"]')
    assert len(s.CORS_ORIGINS) == 2
    assert "https://app.example.com" in s.CORS_ORIGINS

    s2 = Settings(CORS_ORIGINS="http://localhost:3000, https://myapp.com")
    assert len(s2.CORS_ORIGINS) == 2
    assert "https://myapp.com" in s2.CORS_ORIGINS


def test_logging_redaction():
    sensitive = {
        "user": "alice",
        "api_key": "secret_key_123",
        "nested": {
            "password": "super_secret_password",
            "safe_field": "visible",
            "token": "bearer_abc",
        },
        "list_data": [{"access_token": "secret_token"}, "normal_val"]
    }
    redacted = redact_sensitive_dict(sensitive)
    assert redacted["api_key"] == "[REDACTED]"
    assert redacted["nested"]["password"] == "[REDACTED]"
    assert redacted["nested"]["token"] == "[REDACTED]"
    assert redacted["nested"]["safe_field"] == "visible"
    assert redacted["list_data"][0]["access_token"] == "[REDACTED]"
    assert redacted["list_data"][1] == "normal_val"
