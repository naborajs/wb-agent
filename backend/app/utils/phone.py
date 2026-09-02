"""
Phone number normalization, formatting, and validation utilities.

Standards:
- Canonical internal storage uses standard E.164 notation: +[country_code][national_number]
- Examples: '+918900653250', '+14155552671'
- Strips whitespace, dashes, parentheses, dots, and trailing noise.
- Provides PII-safe masking for audit logs and telemetry.
"""

import re
from typing import Optional, Tuple


def clean_phone_digits(raw: str) -> str:
    """
    Extracts only digits and leading plus sign from an unformatted phone string.
    
    Args:
        raw: Input string such as '+91 (89006) 53250' or '089006-53250'
        
    Returns:
        String containing only digits with optional leading '+'
    """
    if not raw or not isinstance(raw, str):
        return ""
    cleaned = raw.strip()
    has_plus = cleaned.startswith("+")
    digits_only = re.sub(r"[^\d]", "", cleaned)
    return f"+{digits_only}" if has_plus else digits_only


def normalize_phone_number(
    raw_phone: str,
    default_country_code: str = "+91"
) -> str:
    """
    Normalizes a phone string into canonical E.164 format.
    
    Rules:
    1. If already in E.164 format (starts with '+' and has 10 to 15 digits), validates and returns.
    2. If starts with '00', strips '00' and prepends '+'.
    3. If starts with '0' and has 11 digits (e.g. Indian STD prefix '08900653250'), strips '0'
       and prepends default_country_code.
    4. If has 10 digits (standard Indian mobile/landline without country code),
       prepends default_country_code.
    5. Strips any extraneous symbols, spaces, and formatting characters.
    
    Args:
        raw_phone: Input phone string from CSV, WhatsApp, or API.
        default_country_code: Country code to prepend if missing (defaults to '+91' for India).
        
    Returns:
        Canonical E.164 phone string (e.g., '+918900653250').
        
    Raises:
        ValueError: If phone cannot be parsed into a valid 10-15 digit phone number.
    """
    if not raw_phone or not isinstance(raw_phone, str):
        raise ValueError("Phone number must be a non-empty string.")

    cleaned = raw_phone.strip()
    # Normalize country code prefix
    norm_cc = default_country_code if default_country_code.startswith("+") else f"+{default_country_code}"
    norm_cc_digits = norm_cc.lstrip("+")

    # Case 1: International standard with '+'
    if cleaned.startswith("+"):
        digits = re.sub(r"[^\d]", "", cleaned)
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError(
                f"Invalid phone number length '{cleaned}'. E.164 requires 10 to 15 digits."
            )
        return f"+{digits}"

    # Case 2: International prefix '00' (e.g., 00918900653250)
    if cleaned.startswith("00"):
        digits = re.sub(r"[^\d]", "", cleaned[2:])
        if len(digits) < 10 or len(digits) > 15:
            raise ValueError(f"Invalid international prefix in '{cleaned}'.")
        return f"+{digits}"

    # Case 3: Digits only
    digits = re.sub(r"[^\d]", "", cleaned)
    if not digits:
        raise ValueError(f"No valid digits found in '{raw_phone}'.")

    # If it starts with leading 0 and has 11 digits (common in India: 09876543210)
    if len(digits) == 11 and digits.startswith("0"):
        digits = digits[1:]

    # 10 digits -> assume local national number, prepend default country code
    if len(digits) == 10:
        return f"+{norm_cc_digits}{digits}"

    # If it already includes the country code without plus (e.g. 918900653250 -> 12 digits for India)
    if digits.startswith(norm_cc_digits) and len(digits) == (len(norm_cc_digits) + 10):
        return f"+{digits}"

    # General fallback for 11-15 digits
    if 10 <= len(digits) <= 15:
        return f"+{digits}"

    raise ValueError(
        f"Cannot normalize '{raw_phone}' to E.164: invalid digit count ({len(digits)} digits)."
    )


def extract_country_code(phone: str) -> str:
    """
    Extracts the country code from an E.164 formatted number.
    Handles known major country codes (+91 for India, +1 for US/CA, +44 for UK, etc.).
    """
    if not phone.startswith("+"):
        phone = normalize_phone_number(phone)

    # Check known country code prefixes
    for prefix in ["+91", "+1", "+44", "+971", "+65", "+61", "+81", "+49"]:
        if phone.startswith(prefix):
            return prefix
            
    # Default heuristic: first 1-3 digits
    digits = phone[1:]
    if len(digits) >= 12:
        return f"+{digits[:2]}"
    elif len(digits) == 11:
        return f"+{digits[:1]}"
    return "+91"


def mask_phone_number(phone: str) -> str:
    """
    Masks a phone number for PII-safe logging and audit display.
    Example: '+918900653250' -> '+9189006*****'
    """
    try:
        norm = normalize_phone_number(phone)
        if len(norm) > 7:
            return norm[:-5] + "*****"
        return norm
    except Exception:
        # If normalization fails, mask the middle of the raw string
        if len(phone) > 4:
            return phone[:3] + "..." + phone[-2:]
        return "***"
