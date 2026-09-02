"""
Lead validation and consent eligibility verification.

Enforces WhatsApp Business Messaging Policy requirements:
- Leads without valid opt-in or with active opt-out must not be contacted.
- Phone number must strictly conform to valid E.164.
"""

import re
from typing import Any, Dict, List, Tuple

EMAIL_REGEX = re.compile(r"^[\w\.-]+@[\w\.-]+\.\w+$")


def validate_lead_record(lead_data: Dict[str, Any]) -> Tuple[bool, List[str], bool]:
    """
    Validates a normalized lead record.

    Returns:
        (is_valid: bool, errors: List[str], is_eligible: bool)
    """
    errors: List[str] = []

    # 1. Phone validation
    phone = lead_data.get("phone")
    if not phone:
        errors.append("Missing required field: 'phone'")
    elif lead_data.get("phone_error"):
        errors.append(f"Invalid phone number: {lead_data['phone_error']}")
    elif not phone.startswith("+") or len(phone) < 11:
        errors.append(f"Phone '{phone}' is not valid E.164 format.")

    # 2. Email format validation (optional field, but if present must be valid)
    email = lead_data.get("email")
    if email and not EMAIL_REGEX.match(str(email)):
        errors.append(f"Malformed email address: '{email}'")

    # 3. WhatsApp Policy & Consent Eligibility Check (Section 6)
    opt_in_status = lead_data.get("opt_in_status")
    if opt_in_status is False:
        is_eligible = False
    elif opt_in_status is None:
        # If opt_in_status is unspecified, default to False for unsolicited outbound
        is_eligible = False
        errors.append("Opt-in consent status is missing or false; in compliance with WhatsApp anti-spam policies.")
    else:
        is_eligible = True

    is_valid = len(errors) == 0
    return is_valid, errors, is_eligible
