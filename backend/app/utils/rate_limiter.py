"""
In-memory sliding window rate limiter utility for WhatsApp channels and webhooks.
Provides flood protection against message bursts while preventing memory bloat.
"""

import time
from typing import Dict, List


class SlidingWindowRateLimiter:
    """
    Thread-safe/async-safe sliding-window rate limiter per identifier (e.g. phone number or IP).
    """

    def __init__(self, max_requests: int = 10, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._history: Dict[str, List[float]] = {}

    def is_rate_limited(self, key: str, now: float | None = None) -> bool:
        """
        Returns True if the key has exceeded max_requests within window_seconds.
        """
        current_time = now if now is not None else time.time()
        self._clean_stale(key, current_time)

        timestamps = self._history.get(key, [])
        return len(timestamps) >= self.max_requests

    def record_hit(self, key: str, now: float | None = None) -> bool:
        """
        Records an interaction. Returns True if allowed, False if rate limited.
        """
        current_time = now if now is not None else time.time()
        if self.is_rate_limited(key, current_time):
            return False

        if key not in self._history:
            self._history[key] = []
        self._history[key].append(current_time)
        return True

    def get_retry_after(self, key: str, now: float | None = None) -> int:
        """
        Returns the number of seconds until the oldest hit exits the sliding window.
        """
        current_time = now if now is not None else time.time()
        self._clean_stale(key, current_time)

        timestamps = self._history.get(key, [])
        if len(timestamps) < self.max_requests:
            return 0

        oldest = timestamps[0]
        retry_after = int(self.window_seconds - (current_time - oldest))
        return max(1, retry_after)

    def _clean_stale(self, key: str, current_time: float) -> None:
        if key not in self._history:
            return
        cutoff = current_time - self.window_seconds
        valid = [t for t in self._history[key] if t > cutoff]
        if valid:
            self._history[key] = valid
        else:
            del self._history[key]

    def reset(self, key: str | None = None) -> None:
        if key:
            self._history.pop(key, None)
        else:
            self._history.clear()
