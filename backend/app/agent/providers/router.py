"""
LLMRouter: routes inference requests between primary provider and fallbacks (Section 68).
"""

from typing import Any, Dict, List, Optional
from app.agent.providers.base import LLMMessage, LLMProvider, LLMResponse
from app.agent.providers.nvidia import NvidiaProvider
from app.agent.providers.simulator import SimulatorProvider
from app.config import settings
from app.utils.logging import logger


class LLMRouter:
    """
    Manages primary and fallback LLM providers with automatic degradation and error tracking.
    """

    def __init__(self):
        self.primary: LLMProvider
        self.fallback: LLMProvider = SimulatorProvider()

        if settings.LLM_PROVIDER == "nvidia" and not settings.NVIDIA_API_KEY.startswith("nvapi-mock"):
            self.primary = NvidiaProvider(
                api_key=settings.NVIDIA_API_KEY,
                model=settings.NVIDIA_MODEL,
                base_url=settings.NVIDIA_BASE_URL,
                timeout=settings.LLM_REQUEST_TIMEOUT,
            )
        else:
            self.primary = SimulatorProvider()

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
        max_t = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS

        try:
            return await self.primary.generate(messages, temperature=temp, max_tokens=max_t, tools=tools)
        except Exception as e:
            logger.warning(f"Primary LLM provider failed ({e}). Routing to fallback provider.")
            return await self.fallback.generate(messages, temperature=temp, max_tokens=max_t, tools=tools)

    async def health_check(self) -> Dict[str, bool]:
        primary_ok = await self.primary.health_check()
        fallback_ok = await self.fallback.health_check()
        return {"primary": primary_ok, "fallback": fallback_ok}
