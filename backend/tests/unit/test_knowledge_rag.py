"""
Unit tests for knowledge ingestion, chunking, versioning, and vector RAG retrieval.
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization, KnowledgeDocument, KnowledgeChunk
from app.knowledge.chunker import chunk_markdown_document
from app.knowledge.embeddings import LocalMockEmbeddingProvider
from app.knowledge.parser import parse_document_content
from app.knowledge.ingestion import KnowledgeIngestionService
from app.knowledge.retrieval import KnowledgeRetrievalService


def test_parse_document_content():
    # Markdown
    md_bytes = b"# Company Policies\n\nWe provide free shipping on orders above 100kg."
    title, doc_type, text = parse_document_content(md_bytes, "company_policies.md")
    assert title == "Company Policies"
    assert doc_type == "md"
    assert "free shipping" in text

    # JSON FAQ
    faq_bytes = b'[{"question": "Do you provide tea samples?", "answer": "Yes, we provide 250g sample packs for verified B2B buyers."}]'
    title, doc_type, text = parse_document_content(faq_bytes, "faq.json")
    assert title == "Faq"
    assert doc_type == "json"
    assert "sample packs" in text


def test_chunk_markdown_document():
    doc = """# Shipping Policy
We deliver across all tier-1 and tier-2 Indian cities via surface logistics.
Transit time to Kolkata, Delhi, and Mumbai is 3-5 business days.

## Payment Terms
First-time buyers must pay 100% advance or 50% advance + 50% against BL/LR copy.
Recurring café accounts enjoy 15-day credit terms upon GST verification.
"""
    chunks = chunk_markdown_document(doc, max_chunk_chars=300)
    assert len(chunks) == 2
    assert chunks[0].section_heading == "Shipping Policy"
    assert "Transit time" in chunks[0].content
    assert chunks[1].section_heading == "Payment Terms"
    assert "15-day credit" in chunks[1].content


@pytest.mark.asyncio
async def test_knowledge_ingestion_versioning_and_retrieval():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_rag_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="RAG Test Org", slug="rag-test")
        session.add(org)
        await session.commit()

    emb_provider = LocalMockEmbeddingProvider(dimension=128)

    # Ingest v1
    v1_content = """# Tea Quality Standards
North Bengal Tea Co. maintains strict FSSAI and ISO 22000 certifications.
All Darjeeling batches are vacuum packed at estate factories to preserve aroma and volatile terpenes.

## Sampling Policy
We send complimentary 200g tea sample kits to registered restaurants, cafes, and distributors.
"""
    async with session_factory() as session:
        ingest_svc = KnowledgeIngestionService(session, org_id, embedding_provider=emb_provider)
        doc_v1 = await ingest_svc.ingest_document(
            title="Quality and Sampling Policy",
            text_content=v1_content,
            source_type="markdown"
        )
        assert doc_v1.version == 1
        assert doc_v1.chunk_count == 2
        assert doc_v1.is_active is True

    # Search for sampling information
    async with session_factory() as session:
        retrieval_svc = KnowledgeRetrievalService(session, org_id, embedding_provider=emb_provider)
        results = await retrieval_svc.search("How can a café get tea sample kits?", top_k=2)

        assert len(results) > 0
        # The top result should be the sampling policy chunk
        top_result = results[0]
        assert top_result.document_title == "Quality and Sampling Policy"
        assert top_result.version == 1
        assert "sample" in top_result.content.lower()
        assert top_result.similarity_score > 0.0

    # Ingest v2 (updated content)
    v2_content = v1_content + "\n\n## Delivery Terms\nExpress door delivery is available within West Bengal in 48 hours."
    async with session_factory() as session:
        ingest_svc = KnowledgeIngestionService(session, org_id, embedding_provider=emb_provider)
        doc_v2 = await ingest_svc.ingest_document(
            title="Quality and Sampling Policy",
            text_content=v2_content,
            source_type="markdown"
        )
        assert doc_v2.version == 2
        assert doc_v2.chunk_count == 3
        assert doc_v2.is_active is True

    await engine.dispose()
