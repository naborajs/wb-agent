"""
WhatsApp Webhook Security & Signature Verification.
Validates HMAC-SHA256 payloads from Meta Cloud API using constant-time comparison
to guard against timing attacks.
"""

import hmac
import hashlib
from typing import Optional


def verify_meta_signature(payload_bytes: bytes, signature_header: Optional[str], app_secret: str) -> bool:
    """
    Verifies that the incoming payload matches the X-Hub-Signature-256 header.
    Format of signature_header: 'sha256=<hex_digest>'
    """
    if not signature_header or not app_secret:
        return False

    if not signature_header.startswith("sha256="):
        return False

    expected_sig = signature_header.split("sha256=", 1)[1].strip()
    if not expected_sig:
        return False

    computed_sig = hmac.new(
        key=app_secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()

    return hmac.compare_digest(computed_sig, expected_sig)


def generate_meta_signature(payload_bytes: bytes, app_secret: str) -> str:
    """
    Helper for generating X-Hub-Signature-256 header values for testing or webhook mockers.
    """
    computed_sig = hmac.new(
        key=app_secret.encode("utf-8"),
        msg=payload_bytes,
        digestmod=hashlib.sha256,
    ).hexdigest()
    return f"sha256={computed_sig}"


def validate_whatsapp_template(
    template_name: str,
    language_code: str,
    components: Optional[list] = None,
) -> tuple[bool, Optional[str]]:
    """
    Validates WhatsApp Cloud API message template structure before dispatch.
    Returns (is_valid, error_message).
    """
    import re
    if not template_name or not re.match(r"^[a-z0-9_]{1,512}$", template_name):
        return False, "Template name must contain only lowercase alphanumeric characters and underscores (max 512 chars)."

    if not language_code or not re.match(r"^[a-z]{2}(_[A-Z]{2})?$", language_code):
        return False, "Language code must be a valid ISO format (e.g., 'en', 'en_US', 'hi')."

    if components is not None:
        if not isinstance(components, list):
            return False, "Components must be a list."
        for comp in components:
            if not isinstance(comp, dict) or "type" not in comp:
                return False, "Each component must be a dictionary with a 'type' field."
            if comp["type"].upper() not in ("HEADER", "BODY", "FOOTER", "BUTTON"):
                return False, f"Invalid component type '{comp['type']}'."

    return True, None

