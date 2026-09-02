"""
Semantic vector retrieval service with cosine similarity and source attribution.
"""

import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.models import KnowledgeChunk, KnowledgeDocument
from app.knowledge.embeddings import EmbeddingProvider, LocalMockEmbeddingProvider


class RetrievalResult(BaseModel):
    chunk_id: str
    document_id: str
    document_title: str
    version: int
    section_heading: Optional[str]
    content: str
    similarity_score: float


def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    """Calculates cosine similarity between two float vectors."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot = sum(a * b for a, b in zip(v1, v2))
    norm_a = math.sqrt(sum(a * a for a in v1))
    norm_b = math.sqrt(sum(b * b for b in v2))
    if norm_a == 0.0 or norm_b == 0.0:
        return 0.0
    return dot / (norm_a * norm_b)


class KnowledgeRetrievalService:
    """
    Retrieves verified business knowledge chunks matching a customer query or objection.
    """

    def __init__(
        self,
        session: AsyncSession,
        org_id: str,
        embedding_provider: Optional[EmbeddingProvider] = None,
    ):
        self.session = session
        self.org_id = org_id
        self.embedding_provider = embedding_provider or LocalMockEmbeddingProvider()

    async def search(
        self,
        query: str,
        top_k: int = 3,
        min_score: float = 0.0,
    ) -> List[RetrievalResult]:
        """
        Executes semantic search against active knowledge documents in this organization.
        """
        if not query or not query.strip():
            return []

        # Generate query embedding
        query_embeddings = await self.embedding_provider.embed_texts([query])
        query_vec = query_embeddings[0]

        # Fetch active chunks joined with active documents
        stmt = (
            select(KnowledgeChunk, KnowledgeDocument)
            .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
            .where(
                KnowledgeChunk.org_id == self.org_id,
                KnowledgeDocument.is_active == True,
            )
        )
        res = await self.session.execute(stmt)
        rows = res.all()

        scored_results: List[RetrievalResult] = []

        for chunk, doc in rows:
            chunk_vec = chunk.embedding
            if not chunk_vec:
                continue

            # Compute similarity
            score = cosine_similarity(query_vec, list(chunk_vec))
            if score >= min_score:
                scored_results.append(
                    RetrievalResult(
                        chunk_id=chunk.id,
                        document_id=doc.id,
                        document_title=doc.title,
                        version=chunk.version,
                        section_heading=chunk.section_heading,
                        content=chunk.content,
                        similarity_score=round(score, 4),
                    )
                )

        # Sort by similarity descending
        scored_results.sort(key=lambda x: x.similarity_score, reverse=True)
        return scored_results[:top_k]
