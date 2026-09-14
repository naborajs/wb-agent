"""
Unit tests for phone number parsing, normalization, masking, and validation utilities.
"""

import pytest
from app.utils.phone import (
    clean_phone_digits,
    normalize_phone_number,
    is_valid_phone_number,
    mask_phone_number,
    extract_country_code,
)


def test_clean_phone_digits():
    assert clean_phone_digits("+91 (89006) 53250") == "+918900653250"
    assert clean_phone_digits("089006-53250") == "08900653250"
    assert clean_phone_digits("") == ""
    assert clean_phone_digits(None) == ""


def test_normalize_phone_number_e164():
    # Standard 10-digit Indian numbers -> prepends +91
    assert normalize_phone_number("8900653250") == "+918900653250"
    # Standard Indian number with leading 0
    assert normalize_phone_number("08900653250") == "+918900653250"
    # Already E.164
    assert normalize_phone_number("+918900653250") == "+918900653250"
    # With dashes and spaces
    assert normalize_phone_number("+91 89006-53250") == "+918900653250"
    # International 00 prefix
    assert normalize_phone_number("00918900653250") == "+918900653250"


def test_normalize_phone_number_invalid():
    with pytest.raises(ValueError):
        normalize_phone_number("")
    with pytest.raises(ValueError):
        normalize_phone_number("123")


def test_is_valid_phone_number():
    assert is_valid_phone_number("+918900653250") is True
    assert is_valid_phone_number("8900653250") is True
    assert is_valid_phone_number("invalid-phone") is False
    assert is_valid_phone_number("") is False
    assert is_valid_phone_number(None) is False


def test_mask_phone_number():
    masked = mask_phone_number("+918900653250")
    assert masked.startswith("+9189006")
    assert masked.endswith("*****")
    assert len(masked) == len("+918900653250")


def test_extract_country_code():
    assert extract_country_code("+918900653250") == "+91"
    assert extract_country_code("+14155552671") == "+1"
    assert extract_country_code("+447911123456") == "+44"
