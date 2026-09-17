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
