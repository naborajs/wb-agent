"""
Embedding Provider abstraction and implementations.

Supports:
- NVIDIA Nemotron embedding model (`nvidia/nv-embedqa-e5-v5` or similar) via OpenAI-compatible endpoints.
- Local deterministic embedding provider for offline unit tests and development environments.
"""

from abc import ABC, abstractmethod
import hashlib
import math
from typing import List
import httpx
from app.config import settings
from app.utils.logging import logger


class EmbeddingProvider(ABC):
    """Abstract interface for generating vector embeddings."""

    @abstractmethod
    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        """Generates normalized vector embeddings for a list of text strings."""
        pass

    async def embed_text(self, text: str) -> List[float]:
        """Convenience method to embed a single text string."""
        res = await self.embed_texts([text])
        return res[0]

    @property
    @abstractmethod
    def dimension(self) -> int:
        """Returns the vector dimensionality."""
        pass


class LocalMockEmbeddingProvider(EmbeddingProvider):
    """
    Deterministic pseudo-semantic vector generator for offline unit tests.
    Generates unit-normalized 1536-dimensional vectors based on word hashes.
    """

    def __init__(self, dimension: int = 1536):
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        results: List[List[float]] = []
        for text in texts:
            # Deterministic hash-based projection
            vec = [0.0] * self._dim
            words = text.lower().split()
            if not words:
                words = ["empty"]
            for word in words:
                h = int(hashlib.md5(word.encode("utf-8")).hexdigest(), 16)
                idx = h % self._dim
                vec[idx] += 1.0

            # L2 Normalize
            norm = math.sqrt(sum(x * x for x in vec))
            if norm > 0.0:
                vec = [x / norm for x in vec]
            results.append(vec)
        return results


class NvidiaEmbeddingProvider(EmbeddingProvider):
    """
    Production embedding provider using NVIDIA NeMo Retriever API.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "nvidia/nv-embedqa-e5-v5",
        base_url: str = "https://integrate.api.nvidia.com/v1",
        dimension: int = 1536,
    ):
        self.api_key = api_key
        self.model = model
        self.base_url = base_url
        self._dim = dimension

    @property
    def dimension(self) -> int:
        return self._dim

    async def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not self.api_key or self.api_key.startswith("nvapi-mock"):
            # Fallback to local mock if mock key is configured
            return await LocalMockEmbeddingProvider(dimension=self._dim).embed_texts(texts)

        url = f"{self.base_url}/embeddings"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }
        payload = {
            "input": texts,
            "model": self.model,
            "input_type": "passage",
            "encoding_format": "float",
        }

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                resp = await client.post(url, json=payload, headers=headers)
                resp.raise_for_status()
                data = resp.json()
                return [item["embedding"] for item in data["data"]]
        except Exception as e:
            logger.warning(f"NVIDIA Embedding API call failed ({e}). Falling back to LocalMockEmbeddingProvider.")
            return await LocalMockEmbeddingProvider(dimension=self._dim).embed_texts(texts)


def get_embedding_provider() -> EmbeddingProvider:
    """Factory creating configured embedding provider with mock fallback."""
    if settings.NVIDIA_API_KEY and not settings.NVIDIA_API_KEY.startswith("nvapi-mock"):
        return NvidiaEmbeddingProvider(
            api_key=settings.NVIDIA_API_KEY,
            base_url=settings.NVIDIA_BASE_URL,
            model=settings.NVIDIA_EMBEDDING_MODEL,
        )
    return LocalMockEmbeddingProvider()

