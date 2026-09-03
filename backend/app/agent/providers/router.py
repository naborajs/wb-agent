"""
LLMRouter: routes inference requests between primary provider, task classes, and fallbacks (Sections 3, 4, 160).
"""

import time
from enum import Enum
from typing import Any, Dict, List, Optional
import httpx
from app.agent.providers.base import LLMMessage, LLMProvider, LLMResponse
from app.agent.providers.nvidia import NvidiaProvider
from app.agent.providers.simulator import SimulatorProvider
from app.config import settings
from app.utils.logging import logger


class ModelTaskClass(str, Enum):
    FAST = "FAST"                     # Simple extraction, language, sentiment
    NORMAL = "NORMAL"                 # Standard conversational discovery turn
    DEEP_REASONING = "DEEP_REASONING" # Complex objections, negotiation, proposal crafting
    CRITICAL = "CRITICAL"             # High-value closing (>500kg), dispute escalation


class LLMRouter:
    """
    Intelligent Model Router with task-class routing, multi-tiered fallbacks,
    and diagnostic connectivity verification.
    """

    def __init__(self):
        self.providers: Dict[str, LLMProvider] = {}
        self.task_model_map: Dict[ModelTaskClass, str] = {
            ModelTaskClass.FAST: "nvidia/nemotron-4-340b-instruct",
            ModelTaskClass.NORMAL: settings.NVIDIA_MODEL or "nvidia/nemotron-4-340b-instruct",
            ModelTaskClass.DEEP_REASONING: "nvidia/nemotron-4-340b-instruct",
            ModelTaskClass.CRITICAL: "nvidia/nemotron-4-340b-instruct",
        }

        # Initialize Primary Provider (Primary Thinking Model)
        if settings.LLM_PROVIDER == "nvidia" and not settings.NVIDIA_API_KEY.startswith("nvapi-mock"):
            self.primary = NvidiaProvider(
                api_key=settings.NVIDIA_API_KEY,
                fallback_api_key=getattr(settings, "NVIDIA_FALLBACK_API_KEY", None),
                model=settings.NVIDIA_MODEL,
                base_url=settings.NVIDIA_BASE_URL,
                timeout=settings.LLM_REQUEST_TIMEOUT,
            )
        else:
            self.primary = SimulatorProvider()

        # Fallback Model Providers Chain
        self.fallback_providers: List[NvidiaProvider] = []
        raw_fallbacks = getattr(settings, "NVIDIA_FALLBACK_MODELS", "")
        fallback_names = [m.strip() for m in raw_fallbacks.split(",") if m.strip()]
        if not fallback_names:
            fallback_names = [
                "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
                "nvidia/nemotron-3-super-120b-a12b",
                "google/gemma-4-31b-it",
            ]

        if settings.LLM_PROVIDER == "nvidia" and not settings.NVIDIA_API_KEY.startswith("nvapi-mock"):
            for fb_model in fallback_names:
                self.fallback_providers.append(
                    NvidiaProvider(
                        api_key=settings.NVIDIA_API_KEY,
                        fallback_api_key=getattr(settings, "NVIDIA_FALLBACK_API_KEY", None),
                        model=fb_model,
                        base_url=settings.NVIDIA_BASE_URL,
                        timeout=settings.LLM_REQUEST_TIMEOUT,
                    )
                )

        # Local Emergency Fallback is SimulatorProvider
        self.emergency_fallback: LLMProvider = SimulatorProvider()

        # Performance tracking
        self.metrics: Dict[str, Dict[str, Any]] = {
            "primary": {"requests": 0, "failures": 0, "total_latency_ms": 0},
            "fallback": {"requests": 0, "failures": 0, "total_latency_ms": 0},
        }

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        task_class: ModelTaskClass = ModelTaskClass.NORMAL,
    ) -> LLMResponse:
        """
        Executes generation routing through primary provider with fallback protection.
        """
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
        max_t = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS

        # 1. Attempt Primary Thinking Model
        start_t = time.time()
        self.metrics["primary"]["requests"] += 1
        try:
            res = await self.primary.generate(messages, temperature=temp, max_tokens=max_t, tools=tools)
            latency = int((time.time() - start_t) * 1000)
            self.metrics["primary"]["total_latency_ms"] += latency
            return res
        except Exception as e:
            self.metrics["primary"]["failures"] += 1
            logger.warning(f"Primary thinking model failed ({e}) for task {task_class}. Trying fallback models...")

        # 2. Attempt Fallback Models Chain
        for fb_provider in self.fallback_providers:
            try:
                logger.info(f"Attempting fallback model: {fb_provider.model}")
                fb_start = time.time()
                res = await fb_provider.generate(messages, temperature=temp, max_tokens=max_t, tools=tools)
                logger.info(f"Fallback model {fb_provider.model} succeeded in {int((time.time() - fb_start) * 1000)}ms")
                return res
            except Exception as fb_err:
                logger.warning(f"Fallback model {fb_provider.model} failed: {fb_err}")

        # 3. Final Fallback to SimulatorProvider
        self.metrics["fallback"]["requests"] += 1
        fb_start = time.time()
        try:
            res = await self.emergency_fallback.generate(messages, temperature=temp, max_tokens=max_t, tools=tools)
            self.metrics["fallback"]["total_latency_ms"] += int((time.time() - fb_start) * 1000)
            return res
        except Exception as fb_err:
            self.metrics["fallback"]["failures"] += 1
            logger.error(f"Fallback LLM failed ({fb_err}). Returning safe emergency response.")
            return LLMResponse(
                content="I want to make sure I give you accurate details. Let me verify that with our team and get back to you shortly.",
                model="emergency_fallback",
                provider="emergency",
                latency_ms=0,
                prompt_tokens=0,
                completion_tokens=0,
                total_tokens=0,
            )

    async def test_model_connection(
        self,
        model: str,
        api_key: str,
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: int = 10,
    ) -> Dict[str, Any]:
        """
        Actively tests a model's connectivity, latency, and response generation without guessing.
        """
        start_t = time.time()
        url = f"{base_url.rstrip('/')}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": "Respond with 'OK' only."}],
            "max_tokens": 10,
            "temperature": 0.1,
        }

        try:
            async with httpx.AsyncClient(timeout=float(timeout)) as client:
                resp = await client.post(url, json=payload, headers=headers)
                latency_ms = int((time.time() - start_t) * 1000)

                if resp.status_code == 200:
                    data = resp.json()
                    reply = data["choices"][0]["message"]["content"].strip()
                    return {
                        "status": "connected",
                        "model": model,
                        "latency_ms": latency_ms,
                        "sample_response": reply,
                        "tokens_used": data.get("usage", {}).get("total_tokens", 0),
                    }
                else:
                    return {
                        "status": "error",
                        "model": model,
                        "status_code": resp.status_code,
                        "error": resp.text[:200],
                        "latency_ms": latency_ms,
                    }
        except Exception as e:
            return {
                "status": "unreachable",
                "model": model,
                "error": str(e),
                "latency_ms": int((time.time() - start_t) * 1000),
            }

    async def health_check(self) -> Dict[str, Any]:
        primary_ok = await self.primary.health_check()
        fallback_ok = await self.fallback.health_check()
        return {
            "primary": primary_ok,
            "fallback": fallback_ok,
            "metrics": self.metrics,
        }
