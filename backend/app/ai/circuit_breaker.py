"""
Circuit Breaker and Cooldown Manager for NVIDIA NIM Multi-Model Layer.
Tracks failures per (model, key_alias) pair with a configurable cooldown period (default 60s)
to prevent hammering dead keys or malfunctioning models.
"""

import time
from typing import Dict, Optional, Tuple
from app.config import settings
from app.utils.logging import logger


class CircuitBreaker:
    """
    In-memory circuit breaker maintaining failure counts and cooldown timestamps
    for each (model, key_alias) pair.
    """

    def __init__(
        self,
        cooldown_seconds: Optional[int] = None,
        failure_threshold: Optional[int] = None,
    ):
        self.cooldown_seconds = (
            cooldown_seconds
            if cooldown_seconds is not None
            else getattr(settings, "AI_CIRCUIT_BREAKER_COOLDOWN_SECONDS", 60)
        )
        self.failure_threshold = (
            failure_threshold
            if failure_threshold is not None
            else getattr(settings, "AI_CIRCUIT_BREAKER_FAILURE_THRESHOLD", 3)
        )
        # Map: (model, key_alias) -> {"failures": int, "last_failure": float}
        self._state: Dict[Tuple[str, str], Dict[str, float]] = {}

    def _pair_key(self, model: str, key_alias: str) -> Tuple[str, str]:
        return (model.strip(), key_alias.strip().lower())

    def is_available(self, model: str, key_alias: str) -> bool:
        """
        Checks if the (model, key_alias) pair is eligible for request execution.
        Returns False if circuit is OPEN (failed >= threshold and still in cooldown).
        """
        pair = self._pair_key(model, key_alias)
        record = self._state.get(pair)
        if not record:
            return True

        failures = int(record.get("failures", 0))
        last_failure = record.get("last_failure", 0.0)

        if failures < self.failure_threshold:
            return True

        elapsed = time.time() - last_failure
        if elapsed < self.cooldown_seconds:
            logger.debug(
                f"Circuit breaker OPEN for ({model}, {key_alias}): "
                f"{failures} failures, {int(self.cooldown_seconds - elapsed)}s cooldown remaining."
            )
            return False

        # Cooldown elapsed -> half-open trial
        logger.info(f"Circuit breaker HALF-OPEN for ({model}, {key_alias}); allowing trial attempt.")
        return True

    def record_success(self, model: str, key_alias: str) -> None:
        """Resets the circuit breaker upon a successful execution."""
        pair = self._pair_key(model, key_alias)
        if pair in self._state:
            self._state.pop(pair, None)
            logger.debug(f"Circuit breaker reset for ({model}, {key_alias}) after success.")

    def record_failure(self, model: str, key_alias: str, status_code: Optional[int] = None) -> None:
        """
        Increments the consecutive failure count and updates the timestamp.
        Triggers on timeout, 429, or 5xx errors.
        """
        pair = self._pair_key(model, key_alias)
        now = time.time()
        record = self._state.setdefault(pair, {"failures": 0, "last_failure": now})
        record["failures"] = int(record["failures"]) + 1
        record["last_failure"] = now

        failures = record["failures"]
        if failures >= self.failure_threshold:
            logger.warning(
                f"Circuit breaker TRIPPED for ({model}, {key_alias}): "
                f"{failures} consecutive failures (status: {status_code}). Cooldown: {self.cooldown_seconds}s."
            )
        else:
            logger.warning(
                f"Recorded failure {failures}/{self.failure_threshold} for ({model}, {key_alias}) (status: {status_code})."
            )

    def reset_all(self) -> None:
        """Clears all circuit breaker states."""
        self._state.clear()


# Global singleton instance
circuit_breaker = CircuitBreaker()
