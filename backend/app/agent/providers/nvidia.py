"""
NVIDIA Nemotron LLM Provider implementation (Section 68 & 69).
"""

import time
from typing import Any, Dict, List, Optional
import httpx
from app.agent.providers.base import LLMMessage, LLMProvider, LLMResponse
from app.utils.logging import logger


class NvidiaProvider(LLMProvider):
    """
    Inference client for NVIDIA Nemotron-4-340B-Instruct over OpenAI-compatible endpoints.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "nvidia/nemotron-3-ultra-550b-a55b",
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: int = 90,
        fallback_api_key: Optional[str] = None,
    ):
        self.api_key = api_key
        self.fallback_api_key = fallback_api_key
        self.model = model
        self.base_url = base_url.rstrip("/")
        self.timeout = timeout

    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 1024,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        start_t = time.time()
        url = f"{self.base_url}/chat/completions"

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = tools

        keys_to_try = [self.api_key]
        if self.fallback_api_key and self.fallback_api_key != self.api_key:
            keys_to_try.append(self.fallback_api_key)

        data = None
        last_err = None
        for k in keys_to_try:
            try:
                headers = {
                    "Authorization": f"Bearer {k}",
                    "Content-Type": "application/json",
                }
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    resp = await client.post(url, json=payload, headers=headers)
                    resp.raise_for_status()
                    data = resp.json()
                    break
            except Exception as e:
                last_err = e
                logger.warning(f"NvidiaProvider key {k[:12]}... failed for model {self.model}: {e}")

        if data is None:
            raise last_err or RuntimeError(f"All API keys failed for model {self.model}")

        latency_ms = int((time.time() - start_t) * 1000)
        choice = data["choices"][0]
        usage = data.get("usage", {})
        raw_content = choice["message"].get("content") or ""

        # Clean reasoning scratchpad if model prepended thinking process
        if "thinking process" in raw_content.lower():
            import re
            quotes = re.findall(r'"([^"\n]{25,})"', raw_content)
            if quotes:
                raw_content = quotes[-1].strip()
            else:
                lines = raw_content.split("\n")
                filtered = [
                    l for l in lines 
                    if not l.strip().startswith(("*", "1.", "2.", "3.", "4.", "5.", "#", "Draft", "User:", "Context:", "Role:", "Goal:"))
                    and "thinking" not in l.lower()
                    and "analyze" not in l.lower()
                ]
                cleaned = "\n".join(filtered).strip(' "\'\n')
                if len(cleaned) > 20:
                    raw_content = cleaned

        return LLMResponse(
            content=raw_content,
            model=self.model,
            provider="nvidia",
            latency_ms=latency_ms,
            prompt_tokens=usage.get("prompt_tokens", 0),
            completion_tokens=usage.get("completion_tokens", 0),
            total_tokens=usage.get("total_tokens", 0),
            tool_calls=choice["message"].get("tool_calls", []),
        )

    async def health_check(self) -> bool:
        if not self.api_key or self.api_key.startswith("nvapi-mock"):
            return False
        try:
            url = f"{self.base_url}/models"
            headers = {"Authorization": f"Bearer {self.api_key}"}
            async with httpx.AsyncClient(timeout=5.0) as client:
                resp = await client.get(url, headers=headers)
                return resp.status_code == 200
        except Exception:
            return False
