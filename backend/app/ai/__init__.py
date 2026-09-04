"""
NVIDIA NIM Multi-Model Intelligence Layer for WB-Agent (EDITH).
Exposes central AIRouter, capability enums, data types, circuit breaker,
and pricing validator.
"""

from app.ai.chains import CAPABILITY_CHAINS, get_capability_chain
from app.ai.circuit_breaker import CircuitBreaker, circuit_breaker
from app.ai.client import NIMClient
from app.ai.pricing_validator import PricingValidator, PricingValidationError
from app.ai.router import AIRouter, ai_router
from app.ai.types import (
    Capability,
    DEV_TOOLING_MODEL,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    SafetyVerdict,
)

__all__ = [
    "AIRouter",
    "ai_router",
    "Capability",
    "CAPABILITY_CHAINS",
    "get_capability_chain",
    "CircuitBreaker",
    "circuit_breaker",
    "NIMClient",
    "PricingValidator",
    "PricingValidationError",
    "DEV_TOOLING_MODEL",
    "ModelMessage",
    "ModelRequest",
    "ModelResponse",
    "SafetyVerdict",
]
