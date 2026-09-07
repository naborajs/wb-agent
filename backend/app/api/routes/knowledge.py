"""
Knowledge Base, Vector RAG Hub, Pricing & Catalog unified endpoints.
Integrates Dual-Brain Update Chat, multi-category items CRUD, and real-time syncing.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.migrations.migrate_to_knowledge_items import run_knowledge_hub_migration
from app.database.models import (
    KnowledgeCategory,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeItem,
)
from app.database.session import get_db
from app.knowledge.ingestion import KnowledgeIngestionService
from app.knowledge.parser import parse_document_content, parse_tabular_or_document
from app.knowledge.retrieval import KnowledgeRetrievalService, RetrievalResult
from app.brain.inter_brain_bus import inter_brain_bus
from app.realtime.connection_manager import ws_manager
from app.utils.logging import logger

router = APIRouter(prefix="/knowledge", tags=["Knowledge"])


# -------------------------------------------------------------
# Request & Response Schemas
# -------------------------------------------------------------
class SearchRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 3


class RAGQueryRequest(BaseModel):
    query: str
    category: Optional[str] = None
    top_k: int = 4


class RAGQueryResponse(BaseModel):
    query: str
    answer: str
    model_used: str
    confidence_score: float
    sources: List[RetrievalResult]
    executed_at: str


class UpdateChatRequest(BaseModel):
    message: str
    category_hint: Optional[str] = None
    image_data: Optional[str] = None
    mime_type: Optional[str] = "image/png"


class CreateKnowledgeItemRequest(BaseModel):
    title: str
    content_text: str
    category: str = "business_info"
    source_type: str = "manual"
    sku: Optional[str] = None
    base_price: Optional[float] = None
    currency: Optional[str] = "INR"
    unit: Optional[str] = "unit"
    min_order_quantity: Optional[float] = None
    min_quantity: Optional[float] = None
    max_quantity: Optional[float] = None
    discount_percentage: Optional[float] = None
    max_autonomous_discount: Optional[float] = None
    customer_segment: Optional[str] = None
    priority: int = 0
    structured_data: Optional[Dict[str, Any]] = None


class UpdateKnowledgeItemRequest(BaseModel):
    title: Optional[str] = None
    content_text: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    base_price: Optional[float] = None
    currency: Optional[str] = None
    unit: Optional[str] = None
    min_order_quantity: Optional[float] = None
    min_quantity: Optional[float] = None
    max_quantity: Optional[float] = None
    discount_percentage: Optional[float] = None
    max_autonomous_discount: Optional[float] = None
    customer_segment: Optional[str] = None
    priority: Optional[int] = None
    is_active: Optional[bool] = None
    structured_data: Optional[Dict[str, Any]] = None


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


# -------------------------------------------------------------
# 1. Dual-Brain Agentic Update Chat
# -------------------------------------------------------------
@router.post("/update-request")
async def handle_agentic_update_request(
    req: UpdateChatRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Agentic Update Chat Endpoint:
    Processes natural-language knowledge, pricing, or catalog modifications through
    the Dual-Brain deliberation bus (Friday proposes -> EDITH validates & approves/refuses).
    """
    instruction = req.message.strip() if req.message else ""
    if req.image_data:
        try:
            from app.ai.router import ai_router
            vision_res = await ai_router.inspect_document(
                image_data=req.image_data,
                mime_type=req.mime_type or "image/png",
                prompt="Extract all business policies, pricing tiers, discounts, product specifications, or rules from this screenshot accurately.",
            )
            extracted = vision_res.content if hasattr(vision_res, "content") else str(vision_res)
            if extracted:
                instruction = f"{instruction}\n\n[Attached Screenshot / Image Content]:\n{extracted}".strip()
        except Exception as e:
            logger.warning(f"Failed to inspect image attachment: {e}")

    if not instruction:
        raise HTTPException(status_code=400, detail="Message or image attachment cannot be empty.")

    result = await inter_brain_bus.dispatch_knowledge_update(
        session=session,
        org_id=settings.DEFAULT_ORG_ID,
        operator_instruction=instruction,
        category_hint=req.category_hint,
    )
    return result


# -------------------------------------------------------------
# 2. Unified Knowledge Items CRUD
# -------------------------------------------------------------
@router.get("/items")
async def list_knowledge_items(
    category: Optional[str] = Query(None, description="Filter by category (business_info, pricing_rule, catalog_product, agent_guidance, custom)"),
    search: Optional[str] = Query(None, description="Search term in title, content, or SKU"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    session: AsyncSession = Depends(get_db),
):
    """Lists unified knowledge items with category filtering and search."""
    stmt = select(KnowledgeItem).where(
        or_(
            KnowledgeItem.org_id == settings.DEFAULT_ORG_ID,
            KnowledgeItem.org_id == "org_default_tea",
            KnowledgeItem.org_id == "org_default",
        )
    )

    if isinstance(category, str) and category != "all" and category.strip():
        stmt = stmt.where(KnowledgeItem.category == category.strip())
    if isinstance(is_active, bool):
        stmt = stmt.where(KnowledgeItem.is_active == is_active)
    if isinstance(search, str) and search.strip():
        term = f"%{search.strip()}%"
        stmt = stmt.where(
            or_(
                KnowledgeItem.title.ilike(term),
                KnowledgeItem.sku.ilike(term),
                KnowledgeItem.content_text.ilike(term),
            )
        )

    stmt = stmt.order_by(KnowledgeItem.updated_at.desc())
    res = await session.execute(stmt)
    items = res.scalars().all()

    if not items and not category and not search:
        # Self-heal on fresh / unmigrated database
        try:
            await run_knowledge_hub_migration(session, settings.DEFAULT_ORG_ID)
            await run_knowledge_hub_migration(session, "org_default")
            await run_knowledge_hub_migration(session, "org_default_tea")
            res = await session.execute(stmt)
            items = res.scalars().all()
        except Exception as e:
            logger.warning(f"Auto-migration in list_knowledge_items fallback: {e}")

    return [
        {
            "id": i.id,
            "category": i.category,
            "title": i.title,
            "sku": i.sku,
            "source_type": i.source_type,
            "content_text": i.content_text,
            "structured_data": i.structured_data or {},
            "base_price": float(i.base_price) if i.base_price is not None else None,
            "currency": i.currency,
            "unit": i.unit,
            "min_order_quantity": float(i.min_order_quantity) if i.min_order_quantity is not None else None,
            "min_quantity": float(i.min_quantity) if i.min_quantity is not None else None,
            "max_quantity": float(i.max_quantity) if i.max_quantity is not None else None,
            "discount_percentage": float(i.discount_percentage) if i.discount_percentage is not None else None,
            "max_autonomous_discount": float(i.max_autonomous_discount) if i.max_autonomous_discount is not None else None,
            "customer_segment": i.customer_segment,
            "version": i.version,
            "chunk_count": i.chunk_count,
            "is_active": i.is_active,
            "created_by_brain": i.created_by_brain,
            "created_at": i.created_at.isoformat() if i.created_at else None,
            "updated_at": i.updated_at.isoformat() if i.updated_at else None,
        }
        for i in items
    ]


@router.post("/items")
async def create_knowledge_item(
    payload: CreateKnowledgeItemRequest,
    session: AsyncSession = Depends(get_db),
):
    """Directly authors a new unified KnowledgeItem across any category."""
    svc = KnowledgeIngestionService(session, settings.DEFAULT_ORG_ID)
    item = await svc.ingest_knowledge_item(
        title=payload.title,
        content_text=payload.content_text,
        category=payload.category,
        source_type=payload.source_type,
        sku=payload.sku,
        base_price=Decimal(str(payload.base_price)) if payload.base_price is not None else None,
        currency=payload.currency,
        unit=payload.unit,
        min_order_quantity=Decimal(str(payload.min_order_quantity)) if payload.min_order_quantity is not None else None,
        min_quantity=Decimal(str(payload.min_quantity)) if payload.min_quantity is not None else None,
        max_quantity=Decimal(str(payload.max_quantity)) if payload.max_quantity is not None else None,
        discount_percentage=Decimal(str(payload.discount_percentage)) if payload.discount_percentage is not None else None,
        max_autonomous_discount=Decimal(str(payload.max_autonomous_discount)) if payload.max_autonomous_discount is not None else None,
        customer_segment=payload.customer_segment,
        priority=payload.priority,
        structured_data=payload.structured_data or {},
    )

    # Broadcast WebSocket event
    await ws_manager.broadcast_to_org(settings.DEFAULT_ORG_ID, "knowledge_item_created", {
        "item_id": item.id,
        "title": item.title,
        "category": item.category,
    })

    return {"success": True, "id": item.id, "title": item.title, "category": item.category}


@router.patch("/items/{item_id}")
async def update_knowledge_item(
    item_id: str,
    payload: UpdateKnowledgeItemRequest,
    session: AsyncSession = Depends(get_db),
):
    """Updates an existing KnowledgeItem and refreshes its chunks and relational sync."""
    stmt = select(KnowledgeItem).where(
        KnowledgeItem.id == item_id,
        or_(
            KnowledgeItem.org_id == settings.DEFAULT_ORG_ID,
            KnowledgeItem.org_id == "org_default",
            KnowledgeItem.org_id == "org_default_tea",
        ),
    )
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail=f"KnowledgeItem '{item_id}' not found.")

    new_title = payload.title or item.title
    new_content = payload.content_text or item.content_text
    new_category = payload.category or item.category
    new_sku = payload.sku or item.sku

    svc = KnowledgeIngestionService(session, item.org_id or settings.DEFAULT_ORG_ID)
    updated_item = await svc.ingest_knowledge_item(
        title=new_title,
        content_text=new_content,
        category=new_category,
        source_type=item.source_type,
        sku=new_sku,
        base_price=Decimal(str(payload.base_price)) if payload.base_price is not None else item.base_price,
        currency=payload.currency or item.currency,
        unit=payload.unit or item.unit,
        min_order_quantity=Decimal(str(payload.min_order_quantity)) if payload.min_order_quantity is not None else item.min_order_quantity,
        min_quantity=Decimal(str(payload.min_quantity)) if payload.min_quantity is not None else item.min_quantity,
        max_quantity=Decimal(str(payload.max_quantity)) if payload.max_quantity is not None else item.max_quantity,
        discount_percentage=Decimal(str(payload.discount_percentage)) if payload.discount_percentage is not None else item.discount_percentage,
        max_autonomous_discount=Decimal(str(payload.max_autonomous_discount)) if payload.max_autonomous_discount is not None else item.max_autonomous_discount,
        customer_segment=payload.customer_segment or item.customer_segment,
        priority=payload.priority if payload.priority is not None else item.priority,
        structured_data=payload.structured_data or item.structured_data,
        item_id=item.id,
    )

    await ws_manager.broadcast_to_org(settings.DEFAULT_ORG_ID, "knowledge_item_updated", {
        "item_id": updated_item.id,
        "title": updated_item.title,
        "category": updated_item.category,
    })

    return {
        "success": True,
        "id": updated_item.id,
        "title": updated_item.title,
        "version": updated_item.version,
        "item": {
            "id": updated_item.id,
            "category": updated_item.category,
            "title": updated_item.title,
            "sku": updated_item.sku,
            "source_type": updated_item.source_type,
            "content_text": updated_item.content_text,
            "structured_data": updated_item.structured_data or {},
            "base_price": float(updated_item.base_price) if updated_item.base_price is not None else None,
            "currency": updated_item.currency,
            "unit": updated_item.unit,
            "min_order_quantity": float(updated_item.min_order_quantity) if updated_item.min_order_quantity is not None else None,
            "min_quantity": float(updated_item.min_quantity) if updated_item.min_quantity is not None else None,
            "max_quantity": float(updated_item.max_quantity) if updated_item.max_quantity is not None else None,
            "discount_percentage": float(updated_item.discount_percentage) if updated_item.discount_percentage is not None else None,
            "max_autonomous_discount": float(updated_item.max_autonomous_discount) if updated_item.max_autonomous_discount is not None else None,
            "customer_segment": updated_item.customer_segment,
            "version": updated_item.version,
            "chunk_count": updated_item.chunk_count,
            "is_active": updated_item.is_active,
            "created_by_brain": updated_item.created_by_brain,
            "updated_at": updated_item.updated_at.isoformat() if updated_item.updated_at else None,
        },
    }


@router.patch("/items/{item_id}/toggle-active")
async def toggle_item_active(
    item_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Toggles active status of a KnowledgeItem."""
    stmt = select(KnowledgeItem).where(
        KnowledgeItem.id == item_id,
        or_(
            KnowledgeItem.org_id == settings.DEFAULT_ORG_ID,
            KnowledgeItem.org_id == "org_default",
            KnowledgeItem.org_id == "org_default_tea",
        ),
    )
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    item.is_active = not item.is_active
    await session.commit()

    await ws_manager.broadcast_to_org(settings.DEFAULT_ORG_ID, "knowledge_item_updated", {
        "item_id": item.id,
        "is_active": item.is_active,
    })
    return {"success": True, "id": item.id, "is_active": item.is_active}


@router.delete("/items/{item_id}")
async def delete_knowledge_item(
    item_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Cascading deletion of a KnowledgeItem and all associated chunks."""
    stmt = select(KnowledgeItem).where(
        KnowledgeItem.id == item_id,
        or_(
            KnowledgeItem.org_id == settings.DEFAULT_ORG_ID,
            KnowledgeItem.org_id == "org_default",
            KnowledgeItem.org_id == "org_default_tea",
        ),
    )
    item = (await session.execute(stmt)).scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found.")

    await session.delete(item)
    await session.commit()


    await ws_manager.broadcast_to_org(settings.DEFAULT_ORG_ID, "knowledge_item_deleted", {
        "item_id": item_id,
    })
    return {"success": True, "deleted_id": item_id}


@router.get("/stats")
async def get_knowledge_stats(session: AsyncSession = Depends(get_db)):
    """Returns asset counts and category breakdown across the unified hub."""
    stmt = select(KnowledgeItem.category, func.count(KnowledgeItem.id)).where(
        or_(
            KnowledgeItem.org_id == settings.DEFAULT_ORG_ID,
            KnowledgeItem.org_id == "org_default_tea",
            KnowledgeItem.org_id == "org_default",
        ),
        KnowledgeItem.is_active == True,
    ).group_by(KnowledgeItem.category)
    res = await session.execute(stmt)
    counts = dict(res.all())
    total = sum(counts.values())

    # Self-heal / auto-migrate on first load if empty
    if total == 0:
        try:
            await run_knowledge_hub_migration(session, settings.DEFAULT_ORG_ID)
            await run_knowledge_hub_migration(session, "org_default_tea")
            res = await session.execute(stmt)
            counts = dict(res.all())
            total = sum(counts.values())
        except Exception as e:
            logger.warning(f"Auto-migration in get_knowledge_stats skipped: {e}")

    return {
        "total": total,
        "business_info": counts.get("business_info", 0),
        "pricing_rule": counts.get("pricing_rule", 0),
        "catalog_product": counts.get("catalog_product", 0),
        "agent_guidance": counts.get("agent_guidance", 0),
        "custom": counts.get("custom", 0),
    }


@router.post("/migrate")
async def trigger_migration(session: AsyncSession = Depends(get_db)):
    """Executes zero-data-loss migration into KnowledgeItem table."""
    summary = await run_knowledge_hub_migration(session, settings.DEFAULT_ORG_ID)
    return {"success": True, "summary": summary}


# -------------------------------------------------------------
# 3. Multi-Format Tabular & Document Upload
# -------------------------------------------------------------
@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    category: str = Form("business_info"),
    session: AsyncSession = Depends(get_db),
):
    """Uploads, validates, parses, chunks, and indexes files (PDF, DOCX, XLSX, CSV, JSON, MD)."""
    content_bytes = await file.read()
    try:
        parsed = parse_tabular_or_document(
            raw_content=content_bytes,
            filename=file.filename,
            category=category,
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    svc = KnowledgeIngestionService(session, settings.DEFAULT_ORG_ID)
    structured_rows = parsed.get("structured_rows", [])

    # If tabular file contains structured pricing rules or products, ingest individual rows
    ingested_sub_items = 0
    if category == KnowledgeCategory.PRICING_RULE.value and structured_rows:
        for r in structured_rows:
            await svc.ingest_knowledge_item(
                title=r.get("rule_name", "Volume Tier"),
                content_text=f"### Pricing Rule: {r.get('rule_name')}\n- Min: {r.get('min_quantity')}\n- Max: {r.get('max_quantity')}\n- Discount: {r.get('discount_percentage')}%",
                category=KnowledgeCategory.PRICING_RULE.value,
                source_type=parsed["source_type"],
                min_quantity=Decimal(str(r["min_quantity"])) if r.get("min_quantity") is not None else None,
                max_quantity=Decimal(str(r["max_quantity"])) if r.get("max_quantity") is not None else None,
                discount_percentage=Decimal(str(r["discount_percentage"])) if r.get("discount_percentage") is not None else None,
                max_autonomous_discount=Decimal(str(r["max_autonomous_discount_percentage"])) if r.get("max_autonomous_discount_percentage") is not None else None,
                customer_segment=r.get("customer_segment"),
                structured_data=r,
            )
            ingested_sub_items += 1

    elif category == KnowledgeCategory.CATALOG_PRODUCT.value and structured_rows:
        for p in structured_rows:
            await svc.ingest_knowledge_item(
                title=p.get("name", "Product"),
                content_text=f"### Product: {p.get('name')} ({p.get('sku')})\n- Price: ₹{p.get('base_price')}\n- MOQ: {p.get('min_order_quantity')}",
                category=KnowledgeCategory.CATALOG_PRODUCT.value,
                source_type=parsed["source_type"],
                sku=p.get("sku"),
                base_price=Decimal(str(p["base_price"])) if p.get("base_price") is not None else None,
                unit=p.get("unit", "unit"),
                min_order_quantity=Decimal(str(p["min_order_quantity"])) if p.get("min_order_quantity") is not None else None,
                structured_data=p,
            )
            ingested_sub_items += 1

    # Ingest master document summary item
    master_item = await svc.ingest_knowledge_item(
        title=parsed["title"],
        content_text=parsed["text"],
        category=category,
        source_type=parsed["source_type"],
        file_path=file.filename,
        structured_data={"total_rows": len(structured_rows), "filename": file.filename},
    )

    await ws_manager.broadcast_to_org(settings.DEFAULT_ORG_ID, "knowledge_item_created", {
        "item_id": master_item.id,
        "title": master_item.title,
        "category": master_item.category,
    })

    return {
        "id": master_item.id,
        "title": master_item.title,
        "category": master_item.category,
        "version": master_item.version,
        "chunk_count": master_item.chunk_count,
        "sub_items_created": ingested_sub_items,
    }


# -------------------------------------------------------------
# 4. Search & RAG Semantic Query
# -------------------------------------------------------------
@router.post("/search", response_model=List[RetrievalResult])
async def search_knowledge(req: SearchRequest, session: AsyncSession = Depends(get_db)):
    """Tests semantic vector RAG search against active knowledge chunks."""
    svc = KnowledgeRetrievalService(session, settings.DEFAULT_ORG_ID)
    results = await svc.search(query=req.query, category=req.category, top_k=req.top_k)
    return results


@router.post("/query", response_model=RAGQueryResponse)
async def query_knowledge_with_ai(req: RAGQueryRequest, session: AsyncSession = Depends(get_db)):
    """
    RAG Query & AI Answer Generation:
    Retrieves the most relevant grounded knowledge chunks across all categories
    and synthesizes an accurate, cited answer using NVIDIA Nemotron or deterministic RAG.
    """
    svc = KnowledgeRetrievalService(session, settings.DEFAULT_ORG_ID)
    results = await svc.search(query=req.query, category=req.category, top_k=req.top_k)

    if not results:
        return RAGQueryResponse(
            query=req.query,
            answer="No matching knowledge assets were found in the database. You can upload relevant policy or catalog documentation using the Upload tool.",
            model_used="Ground Truth RAG",
            confidence_score=0.0,
            sources=[],
            executed_at=datetime.utcnow().isoformat(),
        )

    context_blocks = []
    for idx, r in enumerate(results[:3], start=1):
        heading = f" ({r.section_heading})" if r.section_heading else ""
        context_blocks.append(f"[{idx}] {r.document_title}{heading} [{r.category}]:\n{r.content}")
    context_str = "\n\n".join(context_blocks)

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


# -------------------------------------------------------------
# 5. Legacy Document Compatibility Endpoints
# -------------------------------------------------------------
@router.get("/documents")
async def list_documents(session: AsyncSession = Depends(get_db)):
    """Lists ingested knowledge documents and version metadata (backwards compatibility)."""
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


@router.post("/refresh-index")
async def refresh_knowledge_index(session: AsyncSession = Depends(get_db)):
    """Refreshes knowledge index with default documents."""
    svc = KnowledgeIngestionService(session, settings.DEFAULT_ORG_ID)
    ingested = []
    for title, content in DEFAULT_KNOWLEDGE_DOCUMENTS:
        doc = await svc.ingest_document(title=title, text_content=content, source_type="markdown")
        ingested.append({"id": doc.id, "title": doc.title, "version": doc.version, "chunks": doc.chunk_count})

    return {
        "success": True,
        "message": f"Knowledge base index successfully refreshed with {len(ingested)} active documents.",
        "documents": ingested,
        "refreshed_at": datetime.utcnow().isoformat(),
    }
