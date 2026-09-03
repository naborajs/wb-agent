"""
Lead management API endpoints (Section 49 & 58).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings
from app.database.models import Lead
from app.database.session import get_db
from app.leads.importer import LeadImportPipeline
from app.leads.sources.csv import CsvLeadSource
from app.schemas.common import PaginatedResponse
from app.schemas.leads import LeadImportSummary, LeadResponse, LeadUpdate

router = APIRouter(prefix="/leads", tags=["Leads"])


@router.get("", response_model=PaginatedResponse[LeadResponse])
async def list_leads(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    query: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Lists leads with search, status filtering, and pagination."""
    org_id = settings.DEFAULT_ORG_ID
    stmt = select(Lead).where(Lead.org_id == org_id)

    if status:
        stmt = stmt.where(Lead.status == status)

    if query:
        clean_q = f"%{query.strip()}%"
        stmt = stmt.where(
            (Lead.name.ilike(clean_q))
            | (Lead.phone.ilike(clean_q))
            | (Lead.company_name.ilike(clean_q))
        )

    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = (await session.execute(count_stmt)).scalar() or 0

    # Paginate
    stmt = stmt.order_by(Lead.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    res = await session.execute(stmt)
    items = list(res.scalars().all())

    pages = (total + page_size - 1) // page_size if total > 0 else 1
    return PaginatedResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        pages=pages,
    )


@router.get("/{lead_id}", response_model=LeadResponse)
async def get_lead(lead_id: str, session: AsyncSession = Depends(get_db)):
    """Fetches single lead details."""
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")
    return lead


@router.patch("/{lead_id}", response_model=LeadResponse)
async def update_lead(lead_id: str, updates: LeadUpdate, session: AsyncSession = Depends(get_db)):
    """Updates lead attributes."""
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found.")

    for field, val in updates.model_dump(exclude_unset=True).items():
        setattr(lead, field, val)

    await session.commit()
    return lead


@router.post("/import", response_model=LeadImportSummary)
async def import_leads_csv(
    file: UploadFile = File(...),
    campaign_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Uploads and ingests a batch CSV file of leads."""
    content_bytes = await file.read()
    try:
        csv_text = content_bytes.decode("utf-8-sig")
    except UnicodeDecodeError:
        csv_text = content_bytes.decode("latin-1")

    source = CsvLeadSource(csv_text)
    pipeline = LeadImportPipeline(session, settings.DEFAULT_ORG_ID)
    summary = await pipeline.run(source, campaign_id=campaign_id)
    return summary


@router.post("/upload", response_model=LeadImportSummary)
async def upload_leads_csv(
    file: UploadFile = File(...),
    campaign_id: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Uploads and ingests a batch CSV file of leads (alias for /import)."""
    return await import_leads_csv(file=file, campaign_id=campaign_id, session=session)

