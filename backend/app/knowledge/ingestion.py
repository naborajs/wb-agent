"""
End-to-end Knowledge Ingestion Pipeline: versioning, chunking, and embedding generation.
"""

import hashlib
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import KnowledgeChunk, KnowledgeDocument
from app.knowledge.chunker import chunk_markdown_document
from app.knowledge.embeddings import EmbeddingProvider, LocalMockEmbeddingProvider
from app.utils.logging import logger


class KnowledgeIngestionService:
    """
    Ingests and indexes business documents into PostgreSQL and vector storage with strict versioning.
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

    async def ingest_document(
        self,
        title: str,
        text_content: str,
        source_type: str = "markdown",
        file_path: Optional[str] = None,
    ) -> KnowledgeDocument:
        """
        Ingests a document, generating versioned chunks and vector embeddings.
        """
        file_hash = hashlib.sha256(text_content.encode("utf-8")).hexdigest()

        # Check existing document by title within org
        stmt = select(KnowledgeDocument).where(
            KnowledgeDocument.org_id == self.org_id,
            KnowledgeDocument.title == title,
        )
        res = await self.session.execute(stmt)
        existing_doc = res.scalar_one_or_none()

        if existing_doc:
            if existing_doc.file_hash == file_hash and existing_doc.is_active:
                logger.info(f"Document '{title}' already ingested with identical hash. Skipping.")
                return existing_doc
            # Increment version
            new_version = existing_doc.version + 1
            existing_doc.is_active = False  # Deactivate previous version
            doc = KnowledgeDocument(
                org_id=self.org_id,
                title=title,
                source_type=source_type,
                file_path=file_path,
                file_hash=file_hash,
                version=new_version,
                is_active=True,
            )
        else:
            doc = KnowledgeDocument(
                org_id=self.org_id,
                title=title,
                source_type=source_type,
                file_path=file_path,
                file_hash=file_hash,
                version=1,
                is_active=True,
            )

        self.session.add(doc)
        await self.session.flush()

        # Chunk content
        chunks = chunk_markdown_document(text_content)
        if not chunks:
            doc.chunk_count = 0
            await self.session.commit()
            return doc

        # Generate embeddings in batch
        chunk_texts = [c.content for c in chunks]
        embeddings = await self.embedding_provider.embed_texts(chunk_texts)

        # Store KnowledgeChunk records
        for c, emb in zip(chunks, embeddings):
            k_chunk = KnowledgeChunk(
                org_id=self.org_id,
                document_id=doc.id,
                version=doc.version,
                chunk_index=c.chunk_index,
                section_heading=c.section_heading,
                content=c.content,
                chunk_metadata={"char_length": len(c.content)},
                embedding_model=getattr(self.embedding_provider, "model", "local_mock"),
                embedding=emb,
            )
            self.session.add(k_chunk)

        doc.chunk_count = len(chunks)
        await self.session.commit()
        logger.info(f"Ingested document '{title}' v{doc.version} with {len(chunks)} embedded chunks.")
        return doc
