"""
Lead normalization: cleans phone numbers to E.164, splits full names, formats strings.
"""

from typing import Any, Dict, Optional, Tuple
from app.utils.phone import normalize_phone_number, extract_country_code


def split_full_name(full_name: Optional[str]) -> Tuple[Optional[str], Optional[str]]:
    """
    Splits a full name into first and last name components.
    """
    if not full_name or not isinstance(full_name, str):
        return None, None
    parts = full_name.strip().split()
    if len(parts) == 0:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def normalize_lead_data(raw_data: Dict[str, Any], default_country_code: str = "+91") -> Dict[str, Any]:
    """
    Normalizes a dictionary of lead values into canonical lead fields.
    """
    normalized = dict(raw_data)

    # 1. Phone normalization
    raw_phone = str(normalized.get("phone", "")).strip()
    if raw_phone:
        try:
            norm_phone = normalize_phone_number(raw_phone, default_country_code=default_country_code)
            normalized["phone"] = norm_phone
            normalized["country_code"] = extract_country_code(norm_phone)
        except Exception as e:
            # Keep raw phone so validator can flag specific error
            normalized["phone_error"] = str(e)

    # 2. Name normalization
    name = normalized.get("name")
    first_name = normalized.get("first_name")
    last_name = normalized.get("last_name")

    if name and not (first_name and last_name):
        f, l = split_full_name(str(name))
        normalized["first_name"] = first_name or f
        normalized["last_name"] = last_name or l
    elif (first_name or last_name) and not name:
        normalized["name"] = f"{first_name or ''} {last_name or ''}".strip() or None

    # 3. Email normalization
    email = normalized.get("email")
    if email and isinstance(email, str):
        normalized["email"] = email.strip().lower()

    # 4. Defaults
    if not normalized.get("country"):
        normalized["country"] = "India"
    if not normalized.get("preferred_language"):
        normalized["preferred_language"] = "English"
    if not normalized.get("timezone"):
        normalized["timezone"] = "Asia/Kolkata"

    return normalized
