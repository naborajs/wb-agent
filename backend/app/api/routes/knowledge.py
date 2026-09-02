"""
Knowledge Base and Vector RAG endpoints (Section 51 & 58).
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.models import KnowledgeDocument
from app.database.session import get_db
from app.knowledge.ingestion import KnowledgeIngestionService
from app.knowledge.parser import parse_document_content
from app.knowledge.retrieval import KnowledgeRetrievalService, RetrievalResult

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


@router.get("/documents")
async def list_documents(session: AsyncSession = Depends(get_db)):
    """Lists ingested knowledge documents and version metadata."""
    stmt = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.org_id == settings.DEFAULT_ORG_ID, KnowledgeDocument.is_active == True)
        .order_by(KnowledgeDocument.updated_at.desc())
    )
    res = await session.execute(stmt)
    docs = res.scalars().all()
    return [
        {
            "id": d.id,
            "title": d.title,
            "source_type": d.source_type,
            "version": d.version,
            "chunk_count": d.chunk_count,
            "created_at": d.created_at,
            "updated_at": d.updated_at,
        }
        for d in docs
    ]


@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    session: AsyncSession = Depends(get_db),
):
    """Uploads, validates, parses, chunks, and indexes a knowledge file."""
    content_bytes = await file.read()
    try:
        title, doc_type, text = parse_document_content(content_bytes, file.filename)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    svc = KnowledgeIngestionService(session, settings.DEFAULT_ORG_ID)
    doc = await svc.ingest_document(title=title, text_content=text, source_type=doc_type)
    return {
        "id": doc.id,
        "title": doc.title,
        "version": doc.version,
        "chunk_count": doc.chunk_count,
    }


@router.post("/search", response_model=List[RetrievalResult])
async def search_knowledge(req: SearchRequest, session: AsyncSession = Depends(get_db)):
    """Tests semantic vector RAG search against active knowledge chunks."""
    svc = KnowledgeRetrievalService(session, settings.DEFAULT_ORG_ID)
    results = await svc.search(query=req.query, top_k=req.top_k)
    return results
