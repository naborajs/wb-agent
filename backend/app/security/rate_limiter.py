"""
Sliding Window Rate Limiter for Inbound and Outbound WhatsApp Traffic (Section 78).

Guarantees:
- Protection against WhatsApp messaging flooding and spam.
- Strict per-phone and per-IP transaction rate caps.
"""

from datetime import datetime, timezone
import time
from typing import Dict, List, Tuple


class SlidingWindowRateLimiter:
    """
    In-memory / Redis-ready sliding window rate limiter.
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = {}

    def is_allowed(self, key: str) -> Tuple[bool, int]:
        """
        Checks if the request key is within permitted rate limits.

        Returns:
            (allowed: bool, remaining_requests: int)
        """
        now = time.time()
        window_start = now - self.window_seconds

        if key not in self._history:
            self._history[key] = []

        # Filter out timestamps older than current sliding window
        self._history[key] = [t for t in self._history[key] if t > window_start]

        current_count = len(self._history[key])
        if current_count >= self.max_requests:
            return False, 0

        self._history[key].append(now)
        remaining = self.max_requests - (current_count + 1)
        return True, remaining


# Pre-configured global rate limiters
inbound_message_limiter = SlidingWindowRateLimiter(max_requests=15, window_seconds=60)
outbound_message_limiter = SlidingWindowRateLimiter(max_requests=25, window_seconds=60)
api_key_limiter = SlidingWindowRateLimiter(max_requests=100, window_seconds=60)
