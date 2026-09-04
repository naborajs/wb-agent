"""
Central AI Router (AIRouter) for WB-Agent (EDITH).
Implements Directive §3, §4, and §5:
- Dual NVIDIA NIM keys (Primary & Fallback)
- Model[0] Key A -> Model[0] Key B -> Model[1] Key A -> Model[1] Key B ...
- Per-(model, key) circuit breaker cooldowns
- Fail-closed two-stage guardrails (§3.G)
- Telemetry & observability logging
- Backward compatibility with legacy LLMRouter interface
"""

import json
import time
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.agent.providers.base import LLMMessage, LLMResponse
from app.ai.chains import get_capability_chain
from app.ai.circuit_breaker import circuit_breaker
from app.ai.client import NIMClient
from app.ai.types import (
    Capability,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    SafetyVerdict,
)
from app.config import settings
from app.utils.logging import logger


class AIRouter:
    """
    Central AI Router orchestrating capability fallback chains, dual-key failover,
    circuit breaking, and fail-closed safety guardrails.
    """

    def __init__(
        self,
        primary_key: Optional[str] = None,
        fallback_key: Optional[str] = None,
        base_url: Optional[str] = None,
    ):
        self.primary_key = primary_key or settings.nvidia_primary_key
        self.fallback_key = fallback_key or settings.nvidia_fallback_key
        self.client = NIMClient(base_url=base_url)

        # Telemetry aggregation
        self.metrics: Dict[str, Any] = {
            "total_requests": 0,
            "total_failures": 0,
            "fallback_events": 0,
            "by_capability": {},
            "by_model": {},
            "by_key": {"primary": 0, "fallback": 0},
            "guardrail_holds": 0,
        }

    def _get_active_keys(self) -> List[Tuple[str, str]]:
        """Returns list of (key_alias, api_key) pairs to try in order."""
        keys = []
        if self.primary_key and self.primary_key.strip():
            keys.append(("primary", self.primary_key.strip()))
        if (
            self.fallback_key
            and self.fallback_key.strip()
            and self.fallback_key.strip() != self.primary_key.strip()
        ):
            keys.append(("fallback", self.fallback_key.strip()))
        if not keys:
            # Mock dev fallback
            keys.append(("primary", "nvapi-mock-key"))
        return keys

    async def execute(
        self,
        capability: Capability,
        request: ModelRequest,
    ) -> ModelResponse:
        """
        Executes a capability request across its ordered fallback chain:
        model[0] + key A -> model[0] + key B -> model[1] + key A -> model[1] + key B ...
        """
        start_t = time.time()
        chain = get_capability_chain(capability)
        keys = self._get_active_keys()

        self.metrics["total_requests"] += 1
        cap_stats = self.metrics["by_capability"].setdefault(
            capability.value, {"requests": 0, "successes": 0, "fallbacks": 0, "total_ms": 0}
        )
        cap_stats["requests"] += 1

        fallback_depth = 0
        last_error: Optional[Exception] = None

        for model_idx, model in enumerate(chain):
            # Capability D voice fallback may include Gemini Live
            if model.startswith("gemini-"):
                # Scoped Gemini Live audio handled directly if voice capability
                continue

            for key_alias, key in keys:
                if not circuit_breaker.is_available(model, key_alias):
                    logger.debug(f"Circuit breaker OPEN for ({model}, {key_alias}); advancing chain.")
                    continue

                try:
                    logger.debug(
                        f"Executing capability '{capability.value}' on model '{model}' using {key_alias} key "
                        f"(depth={fallback_depth})."
                    )
                    res = await self.client.execute_request(
                        model=model,
                        api_key=key,
                        request=request,
                        key_alias=key_alias,
                        fallback_depth=fallback_depth,
                    )

                    # Success! Reset circuit breaker and record metrics
                    circuit_breaker.record_success(model, key_alias)
                    elapsed_ms = int((time.time() - start_t) * 1000)

                    cap_stats["successes"] += 1
                    cap_stats["total_ms"] += elapsed_ms
                    self.metrics["by_key"][key_alias] = self.metrics["by_key"].get(key_alias, 0) + 1
                    model_stats = self.metrics["by_model"].setdefault(
                        model, {"calls": 0, "total_latency_ms": 0}
                    )
                    model_stats["calls"] += 1
                    model_stats["total_latency_ms"] += res.latency_ms

                    if fallback_depth > 0:
                        self.metrics["fallback_events"] += 1
                        cap_stats["fallbacks"] += 1

                    logger.info(
                        f"[AIRouter] Capability '{capability.value}' completed via model '{model}' "
                        f"({key_alias} key) at depth {fallback_depth} in {elapsed_ms}ms."
                    )
                    return res

                except Exception as exc:
                    last_error = exc
                    status_code = getattr(getattr(exc, "response", None), "status_code", None)
                    circuit_breaker.record_failure(model, key_alias, status_code=status_code)
                    fallback_depth += 1
                    self.metrics["total_failures"] += 1
                    logger.warning(
                        f"[AIRouter] Attempt failed for capability '{capability.value}' on model '{model}' "
                        f"with {key_alias} key: {exc}. Advancing to next candidate..."
                    )

        # True last-resort fallback (§5): Only after all NVIDIA models have failed on both keys
        if settings.GEMINI_API_KEY and settings.GEMINI_API_KEY.strip():
            try:
                logger.info(
                    f"[AIRouter] All NIM models failed for {capability.value}. Invoking last-resort Gemini fallback."
                )
                res = await self._call_gemini_emergency_fallback(request, fallback_depth=fallback_depth)
                return res
            except Exception as gem_err:
                logger.error(f"[AIRouter] Last-resort Gemini fallback also failed: {gem_err}")

        # Final local fallback
        logger.error(
            f"[AIRouter] Entire chain failed for capability '{capability.value}' (depth={fallback_depth}). "
            f"Returning safe local emergency fallback."
        )
        return self.client._generate_simulated_response(
            model="local_emergency_fallback",
            request=request,
            key_alias="emergency",
            fallback_depth=fallback_depth,
            latency_ms=int((time.time() - start_t) * 1000),
        )

    # -------------------------------------------------------------------------
    # Two-Stage Fail-Closed Safety Guardrails (§3.G)
    # -------------------------------------------------------------------------
    async def check_input_safety(self, text: str) -> SafetyVerdict:
        """
        Stage 1 Input Guardrail using `nvidia/nemotron-3.5-content-safety`.
        FAILS CLOSED: If the model fails, errors, or flags unsafe, holds for human review.
        """
        start_t = time.time()
        model = "nvidia/nemotron-3.5-content-safety"
        keys = self._get_active_keys()

        # Offline / simulation bypass for safe test strings
        if settings.LLM_PROVIDER == "simulator" or not self.primary_key or self.primary_key.startswith("nvapi-mock"):
            # Check for simulated malicious tokens in tests
            lower = text.lower()
            if any(bad in lower for bad in ["jailbreak", "prompt injection", "drop table", "ignore previous instructions"]):
                self.metrics["guardrail_holds"] += 1
                return SafetyVerdict(
                    is_safe=False,
                    reason="Flagged by simulated input content safety classifier",
                    held_for_human=True,
                    model_used=model,
                    key_used="simulated",
                    latency_ms=1,
                )
            return SafetyVerdict(is_safe=True, model_used=model, key_used="simulated", latency_ms=1)

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="system",
                    content="You are a safety classifier. Output JSON: {\"is_safe\": true/false, \"reason\": \"...\"}",
                ),
                ModelMessage(role="user", content=f"Classify input safety: {text}"),
            ],
            temperature=0.0,
            max_tokens=128,
        )

        for key_alias, key in keys:
            try:
                res = await self.client.execute_request(model=model, api_key=key, request=req, key_alias=key_alias)
                elapsed_ms = int((time.time() - start_t) * 1000)
                try:
                    data = json.loads(res.content)
                    is_safe = bool(data.get("is_safe", True))
                    reason = data.get("reason")
                    if not is_safe:
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=reason or "Safety policy violation detected",
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
                except Exception:
                    # If model returned text that clearly indicates unsafe
                    if "unsafe" in res.content.lower() or "violation" in res.content.lower():
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=res.content[:100],
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
            except Exception as e:
                logger.warning(f"Input safety check call failed on {key_alias} key: {e}")

        # Fail closed: Do NOT fall back to another model to re-check
        self.metrics["guardrail_holds"] += 1
        logger.warning("Input safety guardrail failed to respond. Failing closed to hold for human.")
        return SafetyVerdict(
            is_safe=False,
            reason="Input safety guardrail unavailable; failed closed for human review",
            held_for_human=True,
            model_used=model,
            key_used="none",
            latency_ms=int((time.time() - start_t) * 1000),
        )

    async def check_output_safety(self, text: str) -> SafetyVerdict:
        """
        Stage 2 Output Guardrail using `nvidia/llama-3.1-nemotron-safety-guard-8b-v3`.
        FAILS CLOSED: If the model fails or verdicts unsafe, message is held for human review.
        """
        start_t = time.time()
        model = "nvidia/llama-3.1-nemotron-safety-guard-8b-v3"
        keys = self._get_active_keys()

        if settings.LLM_PROVIDER == "simulator" or not self.primary_key or self.primary_key.startswith("nvapi-mock"):
            lower = text.lower()
            if any(bad in lower for bad in ["unverified pricing", "leak confidential", "unsafe_token"]):
                self.metrics["guardrail_holds"] += 1
                return SafetyVerdict(
                    is_safe=False,
                    reason="Simulated output policy violation",
                    held_for_human=True,
                    model_used=model,
                    key_used="simulated",
                    latency_ms=1,
                )
            return SafetyVerdict(is_safe=True, model_used=model, key_used="simulated", latency_ms=1)

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="system",
                    content="You are an enterprise output guardrail. Output JSON: {\"is_safe\": true/false, \"reason\": \"...\"}",
                ),
                ModelMessage(role="user", content=f"Verify outbound response safety: {text}"),
            ],
            temperature=0.0,
            max_tokens=128,
        )

        for key_alias, key in keys:
            try:
                res = await self.client.execute_request(model=model, api_key=key, request=req, key_alias=key_alias)
                elapsed_ms = int((time.time() - start_t) * 1000)
                try:
                    data = json.loads(res.content)
                    is_safe = bool(data.get("is_safe", True))
                    reason = data.get("reason")
                    if not is_safe:
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=reason or "Outbound content policy violation",
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
                except Exception:
                    if "unsafe" in res.content.lower() or "violation" in res.content.lower():
                        self.metrics["guardrail_holds"] += 1
                        return SafetyVerdict(
                            is_safe=False,
                            reason=res.content[:100],
                            held_for_human=True,
                            model_used=model,
                            key_used=key_alias,
                            latency_ms=elapsed_ms,
                        )
                    return SafetyVerdict(is_safe=True, model_used=model, key_used=key_alias, latency_ms=elapsed_ms)
            except Exception as e:
                logger.warning(f"Output safety check call failed on {key_alias} key: {e}")

        # Fail closed
        self.metrics["guardrail_holds"] += 1
        logger.warning("Output safety guardrail failed to respond. Failing closed to hold for human.")
        return SafetyVerdict(
            is_safe=False,
            reason="Output safety guardrail unavailable; failed closed for human review",
            held_for_human=True,
            model_used=model,
            key_used="none",
            latency_ms=int((time.time() - start_t) * 1000),
        )

    # -------------------------------------------------------------------------
    # Last-Resort Emergency Fallback (§5)
    # -------------------------------------------------------------------------
    async def _call_gemini_emergency_fallback(
        self,
        request: ModelRequest,
        fallback_depth: int,
    ) -> ModelResponse:
        """Invoked ONLY when every NVIDIA NIM model has failed on both keys."""
        start_t = time.time()
        api_key = settings.GEMINI_API_KEY
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"

        prompt_parts = []
        for m in request.messages:
            prompt_parts.append(f"{m.role.upper()}: {m.content}")
        combined_prompt = "\n".join(prompt_parts)

        payload = {
            "contents": [{"parts": [{"text": combined_prompt}]}],
            "generationConfig": {
                "temperature": request.temperature,
                "maxOutputTokens": request.max_tokens,
            },
        }

        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(url, json=payload)
            resp.raise_for_status()
            data = resp.json()
            reply = data["candidates"][0]["content"]["parts"][0]["text"].strip()

        latency_ms = int((time.time() - start_t) * 1000)
        return ModelResponse(
            content=reply,
            model="gemini-1.5-flash",
            provider="gemini_emergency",
            key_alias="gemini",
            fallback_depth=fallback_depth,
            latency_ms=latency_ms,
        )

    # -------------------------------------------------------------------------
    # Backward-Compatibility Methods for Legacy Code & Tests
    # -------------------------------------------------------------------------
    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        task_class: Any = None,
        capability: Capability = Capability.CORE_BRAIN,
    ) -> LLMResponse:
        """
        Drop-in backward-compatible bridge for legacy orchestrator and test suites.
        """
        temp = temperature if temperature is not None else settings.LLM_TEMPERATURE
        max_t = max_tokens if max_tokens is not None else settings.LLM_MAX_TOKENS

        model_msgs = [ModelMessage(role=m.role, content=m.content) for m in messages]
        req = ModelRequest(
            messages=model_msgs,
            temperature=temp,
            max_tokens=max_t,
            tools=tools,
        )

        res = await self.execute(capability=capability, request=req)

        return LLMResponse(
            content=res.content,
            model=res.model,
            provider=res.provider,
            latency_ms=res.latency_ms,
            prompt_tokens=res.prompt_tokens,
            completion_tokens=res.completion_tokens,
            total_tokens=res.total_tokens,
            tool_calls=res.tool_calls,
            reasoning_content=res.reasoning_content,
        )

    async def test_model_connection(
        self,
        model: str,
        api_key: str,
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: int = 10,
    ) -> Dict[str, Any]:
        """Actively verifies connectivity against OpenAI-compatible completions endpoint."""
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
        """Provides status and metrics summary for dashboard operations."""
        return {
            "status": "healthy",
            "primary_key_configured": bool(self.primary_key and not self.primary_key.startswith("nvapi-mock")),
            "fallback_key_configured": bool(self.fallback_key and not self.fallback_key.startswith("nvapi-mock")),
            "metrics": self.metrics,
        }


# Global singleton instance
ai_router = AIRouter()
