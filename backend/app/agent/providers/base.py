"""
Abstract LLM Provider interface (Section 68).
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class LLMMessage(BaseModel):
    role: str  # 'system', 'user', 'assistant', 'tool'
    content: str
    name: Optional[str] = None
    tool_call_id: Optional[str] = None


class LLMResponse(BaseModel):
    content: str
    model: str
    provider: str
    latency_ms: int
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    tool_calls: List[Dict[str, Any]] = []


class LLMProvider(ABC):
    """Abstract interface for large language model inference."""

    @abstractmethod
    async def generate(
        self,
        messages: List[LLMMessage],
        temperature: float = 0.2,
        max_tokens: int = 1024,
        tools: Optional[List[Dict[str, Any]]] = None,
    ) -> LLMResponse:
        """Executes completion/chat inference."""
        pass

    @abstractmethod
    async def health_check(self) -> bool:
        """Verifies API reachability and authentication."""
        pass
