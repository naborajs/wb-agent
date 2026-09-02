"""
Defensive input sanitizer for prompt injection, XSS, and SQL control characters (Section 76).
"""

import html
import re
from typing import Tuple

INJECTION_PATTERNS = [
    r"ignore\s+(all\s+)?(previous|prior)\s+instructions",
    r"disregard\s+(all\s+)?(previous|prior)\s+instructions",
    r"you\s+are\s+now\s+in\s+developer\s+mode",
    r"dan\s+mode",
    r"system\s+prompt\s+is",
    r"reveal\s+your\s+instructions",
    r"print\s+your\s+rules",
    r"exfiltrate",
    r"<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>",
]


def sanitize_input_text(raw_text: str, max_chars: int = 4000) -> Tuple[str, bool]:
    """
    Sanitizes untrusted text input from WhatsApp messages, CSVs, or webhooks.

    Returns:
        (sanitized_text: str, injection_detected: bool)
    """
    if not raw_text or not isinstance(raw_text, str):
        return "", False

    # 1. Truncate oversized payloads
    text = raw_text[:max_chars].strip()

    # 2. Escape HTML entities
    escaped = html.escape(text)

    # 3. Check for adversarial jailbreak / prompt injection patterns
    injection_detected = False
    lower = text.lower()
    for pattern in INJECTION_PATTERNS:
        if re.search(pattern, lower):
            injection_detected = True
            break

    # Strip dangerous null bytes and terminal control chars
    clean = re.sub(r"[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]", "", escaped)
    return clean, injection_detected
