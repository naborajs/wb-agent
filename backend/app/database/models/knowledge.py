"""
KnowledgeDocument and KnowledgeChunk models for vector RAG and company documentation.
"""

from sqlalchemy import Boolean, Column, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import relationship
from app.database.base import Base, OrgScopedMixin, TimestampMixin, UniversalJSON, generate_uuid

# Support pgvector with fallback to UniversalJSON for unit tests / non-pg environments
try:
    from pgvector.sqlalchemy import Vector
    VectorType = Vector(1536)  # Default standard embedding dimension
except Exception:
    VectorType = UniversalJSON


class KnowledgeDocument(Base, OrgScopedMixin, TimestampMixin):
    """
    Source knowledge file (PDF, FAQ markdown, catalog document, tea specifications)
    ingested into the system with full versioning (Section 17).
    """
    __tablename__ = "knowledge_documents"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    title = Column(String(255), nullable=False)
    source_type = Column(String(32), default="markdown", nullable=False)  # pdf, markdown, txt, csv, faq
    file_path = Column(String(512), nullable=True)
    file_hash = Column(String(128), nullable=False)
    version = Column(Integer, default=1, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    chunk_count = Column(Integer, default=0, nullable=False)
    doc_metadata = Column(UniversalJSON, default=dict, nullable=False)

    chunks = relationship("KnowledgeChunk", back_populates="document", cascade="all, delete-orphan")

    __table_args__ = (
        Index("ix_knowledge_docs_org_hash", "org_id", "file_hash"),
    )


class KnowledgeChunk(Base, OrgScopedMixin, TimestampMixin):
    """
    Chunked and embedded segment of a knowledge document for semantic retrieval.
    """
    __tablename__ = "knowledge_chunks"

    id = Column(String(64), primary_key=True, default=generate_uuid)
    document_id = Column(String(64), ForeignKey("knowledge_documents.id", ondelete="CASCADE"), nullable=False, index=True)
    version = Column(Integer, default=1, nullable=False)
    chunk_index = Column(Integer, nullable=False)
    section_heading = Column(String(255), nullable=True)
    content = Column(Text, nullable=False)
    chunk_metadata = Column(UniversalJSON, default=dict, nullable=False)
    
    embedding_model = Column(String(128), default="nvidia/nv-embedqa-e5-v5", nullable=False)
    embedding = Column(VectorType, nullable=True)

    document = relationship("KnowledgeDocument", back_populates="chunks")

    __table_args__ = (
        Index("ix_knowledge_chunks_org_doc", "org_id", "document_id", "chunk_index"),
    )
