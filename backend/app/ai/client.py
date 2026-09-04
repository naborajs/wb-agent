"""
Thin OpenAI-compatible client wrapper for all NVIDIA NIM models.
Swaps only `model`, `base_url`, and `api_key`. Captures reasoning_content
and returns structured ModelResponse objects.
"""

import re
import time
from typing import Any, Dict, List, Optional
import httpx
from app.ai.types import ModelMessage, ModelRequest, ModelResponse
from app.config import settings
from app.utils.logging import logger


class NIMClient:
    """
    Thin, unified OpenAI-compatible client for all NVIDIA NIM inference models.
    Supports timeout handling, reasoning_content extraction, and offline simulation.
    """

    def __init__(
        self,
        base_url: Optional[str] = None,
        timeout: Optional[float] = None,
    ):
        self.base_url = (base_url or settings.NVIDIA_BASE_URL).rstrip("/")
        self.timeout = float(timeout if timeout is not None else settings.AI_REQUEST_TIMEOUT)

    async def execute_request(
        self,
        model: str,
        api_key: str,
        request: ModelRequest,
        key_alias: str = "primary",
        fallback_depth: int = 0,
    ) -> ModelResponse:
        """
        Executes a single chat completion request against NVIDIA NIM OpenAI-compatible API.
        """
        start_t = time.time()

        # Handle explicit simulated dead keys in unit/integration tests
        if api_key.startswith("dead") or api_key == "invalid_mock_key":
            req = httpx.Request("POST", f"{self.base_url}/chat/completions")
            resp = httpx.Response(401, request=req, text="Unauthorized: Dead API key")
            raise httpx.HTTPStatusError("Unauthorized", request=req, response=resp)

        # Offline / Simulator handling when mock keys are configured in local dev
        if not api_key or api_key.startswith("nvapi-mock") or settings.LLM_PROVIDER == "simulator":
            return self._generate_simulated_response(
                model=model,
                request=request,
                key_alias=key_alias,
                fallback_depth=fallback_depth,
                latency_ms=int((time.time() - start_t) * 1000),
            )

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": model,
            "messages": [{"role": m.role, "content": m.content} for m in request.messages],
            "temperature": request.temperature,
            "max_tokens": request.max_tokens,
        }

        if request.tools:
            payload["tools"] = request.tools
        if request.response_format:
            payload["response_format"] = request.response_format

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

        latency_ms = int((time.time() - start_t) * 1000)
        choice = data.get("choices", [{}])[0]
        message_data = choice.get("message", {})
        usage = data.get("usage", {})

        raw_content = message_data.get("content") or ""
        reasoning_content = (
            message_data.get("reasoning_content")
            or message_data.get("reasoning")
            or message_data.get("thought")
        )

        # Extract embedded <think>...</think> tags if present in raw content
        if "<think>" in raw_content and "</think>" in raw_content:
            m = re.search(r"<think>(.*?)</think>", raw_content, flags=re.DOTALL)
            if m:
                extracted_reasoning = m.group(1).strip()
                raw_content = re.sub(r"<think>.*?</think>", "", raw_content, flags=re.DOTALL).strip()
                if not reasoning_content:
                    reasoning_content = extracted_reasoning

        return ModelResponse(
            content=raw_content,
            reasoning_content=reasoning_content,
            model=model,
            provider="nvidia",
            key_alias=key_alias,
            fallback_depth=fallback_depth,
            latency_ms=latency_ms,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            tool_calls=message_data.get("tool_calls"),
            raw_data=data,
        )

    def _generate_simulated_response(
        self,
        model: str,
        request: ModelRequest,
        key_alias: str,
        fallback_depth: int,
        latency_ms: int,
    ) -> ModelResponse:
        """
        Deterministic, domain-grounded simulation for local testing when mock keys are configured.
        """
        last_user_msg = ""
        for m in reversed(request.messages):
            if m.role == "user":
                last_user_msg = m.content.lower()
                break

        simulated_reasoning = (
            f"Evaluated inquiry using {model}. Grounded in verified tea estate catalog and MOQ rules."
        )

        # Capability C: Structured Pricing Extraction simulation
        if "pricing_extraction" in str(request.metadata) or "extract" in last_user_msg or "invoice" in last_user_msg:
            simulated_content = (
                '{"items": [{"product_name": "Assam Kadak CTC Granules", "quantity_kg": 50, "unit_price": 340.0}]}'
            )
        # Translation simulation
        elif "translate" in last_user_msg:
            simulated_content = "Namaste, hume Siliguri cafe ke liye 50kg chai chahiye."
        # Safety simulation
        elif "safety" in model.lower() or "guard" in model.lower():
            simulated_content = '{"verdict": "safe", "categories": []}'
        # Standard sales dialogue
        elif "darjeeling" in last_user_msg:
            simulated_content = (
                "Namaste! Our Darjeeling Spring First Flush Special is ₹1,450/kg, offering delicate floral and muscatel notes. "
                "What quantity does your establishment require for this season?"
            )
        elif "assam" in last_user_msg or "chai" in last_user_msg:
            simulated_content = (
                "Namaste! For Assam Kadak CTC Granules, our wholesale rate is ₹340/kg with volume tier pricing "
                "(5% off at 50kg, 10% off at 100kg). What monthly volume are you planning?"
            )
        else:
            simulated_content = (
                "Namaste! Welcome to North Bengal Tea Co. We supply commercial wholesale estate teas "
                "(Assam CTC, Dooars Blend, Darjeeling Leaf) directly to cafes and hotels. How can we assist you today?"
            )

        return ModelResponse(
            content=simulated_content,
            reasoning_content=simulated_reasoning,
            model=model,
            provider="nvidia",
            key_alias=key_alias,
            fallback_depth=fallback_depth,
            latency_ms=latency_ms,
            prompt_tokens=40,
            completion_tokens=30,
            total_tokens=70,
        )
