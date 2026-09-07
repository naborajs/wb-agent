"""
Knowledge Base and Vector RAG endpoints (Section 51 & 58).
"""

from datetime import datetime
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
from app.utils.logging import logger

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


class SearchRequest(BaseModel):
    query: str
    top_k: int = 3


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 4


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    model_used: str
    confidence_score: float
    sources: List[RetrievalResult]
    executed_at: str


DEFAULT_KNOWLEDGE_DOCUMENTS = [
    (
        "Enterprise Quality Standards & Certifications",
        """# Enterprise Quality Standards & Origin Authenticity

Our business adheres to strict commercial quality controls, source verification, and batch inspection standards.
Every consignment is verified for:
- 100% compliance with applicable industry safety, purity, and manufacturing standards
- Batch consistency, moisture/tolerance thresholds, and contamination-free storage
- Certified production facilities with ISO, FSSAI, and international origin traceability
- Authentic single-origin or engineered enterprise grades with certificate of analysis (COA)

We do not compromise on grading integrity, ensuring predictable quality for repeat commercial clients.
""",
    ),
    (
        "Commercial Sampling Policy & Evaluation Protocol",
        """# Commercial Sampling Policy

For verified commercial buyers, hospitality groups, retailers, and distributors:
- We dispatch curated sample kits for professional sensory, technical, and commercial evaluation.
- Standard sample kit charge is ₹499 (or equivalent in local currency) covering priority express courier delivery.
- 100% of the sample evaluation fee is credited back against your first commercial order meeting the baseline MOQ.
- Typical sample transit time is 2 to 4 business days with tracking details provided immediately.
""",
    ),
    (
        "Wholesale Freight, Logistics & Fulfillment Policy",
        """# Freight, Logistics & Fulfillment Policies

We operate centralized dispatch hubs with nationwide and regional logistics coverage:
- Surface Commercial Freight: Standard transit time to major commercial centers is 3 to 5 business days.
- Regional transit timeline: 5 to 7 business days via contracted, insured tier-1 freight carriers.
- Express Air Consignments: 24 to 48 hours door-to-door for urgent or time-critical stock requirements.
- Real-time electronic dispatch tracking and digital consignment receipts dispatched within 2 hours of loading.
- Commercial packaging: Heavy-duty, hermetically sealed, moisture-proof barrier packaging inside master cartons or containers.
""",
    ),
    (
        "Commercial Pricing Rules, Packaging & Minimum Order Quantities",
        """# Commercial Pricing Rules and Minimum Order Quantities

Standard commercial wholesale pricing tiers:
- Minimum Order Quantity (MOQ): Standard MOQ applies per individual product SKU or grade.
- Tier 1 (Baseline Order): Standard wholesale tariff with no minimum surcharge.
- Tier 2 (Volume Order): 5% volume discount applied automatically on qualifying quantities.
- Tier 3 (Distributor / Bulk Tier): 8% to 15% maximum autonomous volume discount with freight subsidies.
- Payment Terms: Initial orders require 100% advance or 50% advance with balance against dispatch confirmation. Approved recurring buyers qualify for commercial net-15 or net-30 terms.
""",
    ),
]


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


@router.post("/query", response_model=RAGQueryResponse)
async def query_knowledge_with_ai(req: RAGQueryRequest, session: AsyncSession = Depends(get_db)):
    """
    RAG Query & AI Answer Generation:
    Retrieves the most relevant grounded knowledge chunks and synthesizes an accurate,
    cited answer using NVIDIA Nemotron or deterministic domain extraction.
    """
    svc = KnowledgeRetrievalService(session, settings.DEFAULT_ORG_ID)
    results = await svc.search(query=req.query, top_k=req.top_k)

    if not results:
        return RAGQueryResponse(
            query=req.query,
            answer="No matching knowledge documents were found in the database. You can upload relevant policy or catalog documentation using the Upload tool.",
            model_used="Ground Truth RAG",
            confidence_score=0.0,
            sources=[],
            executed_at=datetime.utcnow().isoformat(),
        )

    # 1. Format context from top retrieved chunks
    context_blocks = []
    for idx, r in enumerate(results[:3], start=1):
        heading = f" ({r.section_heading})" if r.section_heading else ""
        context_blocks.append(f"[{idx}] {r.document_title}{heading}:\n{r.content}")
    context_str = "\n\n".join(context_blocks)

    # 2. Try LLM synthesis with NVIDIA Nemotron via ai_router
    answer_text = None
    model_name = "Nemotron-3-550B (Grounded RAG)"
    try:
        from app.ai.router import ai_router
        from app.ai.types import Capability, ModelMessage, ModelRequest

        sys_prompt = (
            f"You are the {settings.AGENT_NAME} Knowledge Engine for {settings.BUSINESS_NAME} ({settings.BUSINESS_INDUSTRY}).\n"
            "Your task: Answer the user's question clearly, concisely, and factually based STRICTLY on the provided knowledge context.\n"
            "Rules:\n"
            "1. Citing details: Include exact numbers, minimum order quantities (MOQs), transit days, and discount tiers if present.\n"
            "2. Tone: Crisp, professional, consultative B2B.\n"
            "3. Length: 2 to 4 sentences maximum. Do not hallucinate external facts."
        )
        user_msg = f"Knowledge Context:\n{context_str}\n\nQuestion: {req.query}"

        model_req = ModelRequest(
            messages=[
                ModelMessage(role="system", content=sys_prompt),
                ModelMessage(role="user", content=user_msg),
            ],
            temperature=0.2,
            max_tokens=250,
        )
        ai_resp = await ai_router.execute_with_retry(model_req, preferred_capability=Capability.CHAT)
        if ai_resp and ai_resp.content and ai_resp.content.strip():
            answer_text = ai_resp.content.strip()
            if hasattr(ai_resp, "model_name") and ai_resp.model_name:
                model_name = f"{ai_resp.model_name} (RAG)"
    except Exception as e:
        logger.warning(f"AI Router RAG synthesis notice (falling back to deterministic answer): {e}")

    # 3. Deterministic high-quality fallback if model unavailable
    if not answer_text:
        top = results[0]
        model_name = "Deterministic Vector RAG"
        doc_ref = f"{top.document_title}" + (f" - {top.section_heading}" if top.section_heading else "")
        clean_content = top.content.strip().replace("\n\n", " ").replace("\n", " ")
        answer_text = f"According to {doc_ref}: {clean_content}"

    conf = results[0].similarity_score if results else 0.0

    return RAGQueryResponse(
        query=req.query,
        answer=answer_text,
        model_used=model_name,
        confidence_score=conf,
        sources=results,
        executed_at=datetime.utcnow().isoformat(),
    )


@router.post("/refresh-index")
async def refresh_knowledge_index(session: AsyncSession = Depends(get_db)):
    """
    Refreshes the knowledge base index with verified default enterprise documents,
    ensuring all domains (quality, sampling, delivery timelines, pricing & MOQs)
    are indexed and up-to-date.
    """
    svc = KnowledgeIngestionService(session, settings.DEFAULT_ORG_ID)
    ingested = []
    for title, content in DEFAULT_KNOWLEDGE_DOCUMENTS:
        doc = await svc.ingest_document(title=title, text_content=content, source_type="markdown")
        ingested.append({"id": doc.id, "title": doc.title, "version": doc.version, "chunks": doc.chunk_count})

    # Retrieve all active documents
    stmt = (
        select(KnowledgeDocument)
        .where(KnowledgeDocument.org_id == settings.DEFAULT_ORG_ID, KnowledgeDocument.is_active == True)
        .order_by(KnowledgeDocument.updated_at.desc())
    )
    res = await session.execute(stmt)
    docs = res.scalars().all()

    return {
        "success": True,
        "message": f"Knowledge base index successfully refreshed with {len(ingested)} active documents.",
        "documents": [
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
        ],
        "refreshed_at": datetime.utcnow().isoformat(),
    }
