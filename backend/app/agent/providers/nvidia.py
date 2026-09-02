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
        model: str = "nvidia/nemotron-4-340b-instruct",
        base_url: str = "https://integrate.api.nvidia.com/v1",
        timeout: int = 30,
    ):
        self.api_key = api_key
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
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

        payload: Dict[str, Any] = {
            "model": self.model,
            "messages": [{"role": m.role, "content": m.content} for m in messages],
            "temperature": temperature,
            "max_tokens": max_tokens,
        }

        if tools:
            payload["tools"] = tools

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()

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
