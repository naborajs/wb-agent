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
        "North Bengal Tea Co. Quality Standards & Certifications",
        """# Quality Standards and Origin Authenticity

North Bengal Tea Co. is directly affiliated with single estates across Darjeeling, Dooars, and Assam.
Every batch is tested for:
- Maximum moisture content under 6.5%
- Heavy metal and pesticide residues compliant with FSSAI standards
- 100% authentic GI (Geographical Indication) certified Darjeeling leaf
- Rainforest Alliance and Ethical Tea Partnership certified estates

We do not blend cheap auction sweepings into our orthodox whole-leaf offerings.
""",
    ),
    (
        "Commercial Sampling Policy for Hospitality Buyers",
        """# Commercial Sampling Policy

For genuine B2B buyers (cafes, hotels, restaurants, distributors):
- We dispatch a 3-blend tasting kit (100g each: Darjeeling First Flush, Assam Kadak CTC, Dooars Hotel Blend).
- Standard sample kit charge is ₹499 covering express air courier across India.
- 100% of the sample charge is refunded or credited against your first commercial order of 50kg+.
- Typical courier transit time is 3 to 4 business days.
""",
    ),
    (
        "Wholesale Logistics, Transit Timelines & Delivery Policy",
        """# Freight, Logistics & Delivery Timelines

North Bengal Tea Co. operates direct dispatch warehousing hubs out of Siliguri and Kolkata.
- Surface Logistics: Transit time to major metros (Delhi NCR, Mumbai, Bengaluru, Hyderabad, Kolkata) is 3 to 5 business days.
- Regional Tier-2 and Tier-3 transit timeline: 5 to 7 business days via vetted logistics carriers (Safechem, TCI Freight, V-Trans).
- Express Air Consignments: 24 to 48 hours door-to-door for urgent restaurant sample dispatches.
- Real-time GPS consignment tracking and electronic Lorry Receipt (LR) copy dispatched within 2 hours of loading.
- Standard packaging: Hermetically sealed multi-layer 5kg aluminium barrier pouches inside 20kg moisture-proof corrugated master cartons.
""",
    ),
    (
        "Wholesale Pricing Tiers, Packaging & Minimum Order Quantities (MOQs)",
        """# Wholesale Pricing Tiers and Minimum Order Quantities

Direct estate wholesale pricing for commercial accounts:
- Minimum Order Quantity (MOQ): Standard MOQ is 50kg per individual tea grade (e.g. 50kg Darjeeling FTGFOP1 or 50kg Assam BP CTC).
- Sample MOQ: 1 tasting kit (300g total).
- Volume Discount Tiers:
  * Tier 1 (50kg – 199kg): Standard wholesale baseline tariff (Darjeeling ₹950/kg, Assam CTC ₹290/kg, Dooars ₹240/kg).
  * Tier 2 (200kg – 499kg): 5% volume discount applied automatically.
  * Tier 3 (500kg+): 8% to 12% maximum autonomous volume discount with freight subsidies.
- Payment Terms: First order requires 100% advance or 50% advance + 50% against LR copy. Recurring verified buyers qualify for 15-day credit terms.
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
            "You are the EDITH Knowledge Engine for North Bengal Tea Co. (B2B wholesale tea producer).\n"
            "Your task: Answer the user's question clearly, concisely, and factually based STRICTLY on the provided knowledge context.\n"
            "Rules:\n"
            "1. Citing details: Include exact numbers, minimum order quantities (MOQs), transit days, and discount tiers if present.\n"
            "2. Tone: Crisp, professional, B2B wholesale.\n"
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
