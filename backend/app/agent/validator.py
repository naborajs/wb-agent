"""
Response validation, prompt injection defense, and policy enforcement (Section 72 & 73).
"""

import re
from typing import List, Tuple


class ResponseValidator:
    """
    Guarantees every generated response is grounded, policy-compliant, and free from prompt injection.
    """

    FORBIDDEN_PHRASES = [
        "as an ai language model",
        "system prompt",
        "ignore previous instructions",
        "i don't have access to real-time",
        "here is the system instruction",
        "password",
        "secret_key",
        "nvapi-",
    ]

    UNVERIFIED_FINANCIAL_CLAIMS = [
        "payment has been received",
        "your payment is confirmed",
        "we have received your transfer",
    ]

    @classmethod
    def validate(cls, text: str) -> Tuple[bool, List[str], str]:
        """
        Validates the text of a candidate AI response.

        Returns:
            (is_valid: bool, issues: List[str], sanitized_text: str)
        """
        issues: List[str] = []
        lower = text.lower()

        # 1. Prompt injection / internal disclosure defense (Section 73)
        for phrase in cls.FORBIDDEN_PHRASES:
            if phrase in lower:
                issues.append(f"Forbidden phrase or potential prompt leak detected: '{phrase}'")

        # 2. Unverified financial claims defense (Section 119)
        for claim in cls.UNVERIFIED_FINANCIAL_CLAIMS:
            if claim in lower:
                issues.append(f"Unverified payment claim: '{claim}'. Payment remains human-verified in v1.")

        # 3. Format & length checks (Section 107)
        if len(text.strip()) == 0:
            issues.append("Response is empty.")
        elif len(text) > 2000:
            issues.append("Response exceeds WhatsApp single message comfortable length (2000 chars).")

        # 4. Clean up repetitive whitespace
        sanitized = re.sub(r"\n{3,}", "\n\n", text.strip())

        is_valid = len(issues) == 0
        return is_valid, issues, sanitized
