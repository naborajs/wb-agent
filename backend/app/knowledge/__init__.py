"""
Knowledge module: document parsing, chunking, embeddings, and vector RAG retrieval.
"""

from app.knowledge.chunker import chunk_markdown_document, TextChunk
from app.knowledge.embeddings import (
    EmbeddingProvider,
    LocalMockEmbeddingProvider,
    NvidiaEmbeddingProvider,
)
from app.knowledge.ingestion import KnowledgeIngestionService
from app.knowledge.parser import parse_document_content
from app.knowledge.retrieval import KnowledgeRetrievalService, RetrievalResult

__all__ = [
    "chunk_markdown_document",
    "TextChunk",
    "EmbeddingProvider",
    "LocalMockEmbeddingProvider",
    "NvidiaEmbeddingProvider",
    "KnowledgeIngestionService",
    "parse_document_content",
    "KnowledgeRetrievalService",
    "RetrievalResult",
]
