"""
Semantic vector retrieval service with cosine similarity, category filtering,
and source attribution across the unified Knowledge Hub.
"""

import math
from typing import Any, Dict, List, Optional
from pydantic import BaseModel
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import KnowledgeChunk, KnowledgeDocument, KnowledgeItem
from app.knowledge.embeddings import EmbeddingProvider, LocalMockEmbeddingProvider


class RetrievalResult(BaseModel):
    chunk_id: str
    document_id: Optional[str] = None
    item_id: Optional[str] = None
    category: str = "business_info"
    document_title: str
    version: int
    section_heading: Optional[str] = None
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
    Retrieves verified business knowledge, pricing tiers, catalog products,
    and agent guidance matching customer queries or operator instructions.
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
        category: Optional[str] = None,
        top_k: int = 3,
        min_score: float = 0.0,
    ) -> List[RetrievalResult]:
        """
        Executes semantic search against active knowledge items in this organization.
        Optionally filters by specific category (business_info, pricing_rule, catalog_product, etc.).
        """
        if not query or not query.strip():
            return []

        # Generate query embedding
        query_embeddings = await self.embedding_provider.embed_texts([query])
        query_vec = query_embeddings[0]

        scored_results: List[RetrievalResult] = []

        # 1. Search active KnowledgeItem chunks
        item_stmt = (
            select(KnowledgeChunk, KnowledgeItem)
            .join(KnowledgeItem, KnowledgeChunk.item_id == KnowledgeItem.id)
            .where(
                KnowledgeChunk.org_id == self.org_id,
                KnowledgeItem.is_active == True,
            )
        )
        if category and category != "all":
            item_stmt = item_stmt.where(KnowledgeItem.category == category)

        item_res = await self.session.execute(item_stmt)
        item_rows = item_res.all()

        for chunk, item in item_rows:
            chunk_vec = chunk.embedding
            if not chunk_vec:
                continue

            score = cosine_similarity(query_vec, list(chunk_vec))
            if score >= min_score:
                scored_results.append(
                    RetrievalResult(
                        chunk_id=chunk.id,
                        item_id=item.id,
                        document_id=chunk.document_id or item.id,
                        category=item.category,
                        document_title=item.title,
                        version=chunk.version or item.version,
                        section_heading=chunk.section_heading,
                        content=chunk.content,
                        similarity_score=round(score, 4),
                    )
                )

        # 2. Search legacy KnowledgeDocument chunks if any remain unlinked
        if not category or category in ("all", "business_info"):
            doc_stmt = (
                select(KnowledgeChunk, KnowledgeDocument)
                .join(KnowledgeDocument, KnowledgeChunk.document_id == KnowledgeDocument.id)
                .where(
                    KnowledgeChunk.org_id == self.org_id,
                    KnowledgeChunk.item_id.is_(None),
                    KnowledgeDocument.is_active == True,
                )
            )
            doc_res = await self.session.execute(doc_stmt)
            for chunk, doc in doc_res.all():
                chunk_vec = chunk.embedding
                if not chunk_vec:
                    continue
                score = cosine_similarity(query_vec, list(chunk_vec))
                if score >= min_score:
                    scored_results.append(
                        RetrievalResult(
                            chunk_id=chunk.id,
                            document_id=doc.id,
                            item_id=None,
                            category="business_info",
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
