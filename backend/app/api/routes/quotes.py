"""
Quotes API: auditable commercial pricing quotes with validity windows (Sections 43 & 44).
"""

import random
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database.models import Customer, Product, Quote, QuoteItem
from app.database.session import get_db_session
from app.pricing.service import PricingService

router = APIRouter(prefix="/quotes", tags=["Quotes"])


class QuoteItemCreate(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    quantity_kg: float = Field(..., gt=0)
    discount_pct: Optional[float] = Field(default=0.0, ge=0.0, le=100.0)


class QuoteCreateRequest(BaseModel):
    customer_id: str
    conversation_id: Optional[str] = None
    items: List[QuoteItemCreate]
    valid_days: int = Field(default=7, ge=1, le=90)
    notes: Optional[str] = None


class QuoteStatusUpdateRequest(BaseModel):
    status: str = Field(..., pattern="^(draft|sent|accepted|expired|rejected)$")
    approved_by: Optional[str] = None


@router.get("")
async def list_quotes(
    customer_id: Optional[str] = None,
    status: Optional[str] = None,
    session: AsyncSession = Depends(get_db_session),
):
    """Lists commercial quotes with optional filters."""
    query = (
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.customer))
        .order_by(Quote.created_at.desc())
    )
    if customer_id:
        query = query.where(Quote.customer_id == customer_id)
    if status:
        query = query.where(Quote.status == status)

    res = await session.execute(query)
    quotes = res.scalars().all()

    return {
        "total": len(quotes),
        "items": [
            {
                "id": q.id,
                "quote_number": q.quote_number,
                "customer_id": q.customer_id,
                "customer_name": q.customer.name if q.customer else None,
                "customer_company": q.customer.company_name if q.customer else None,
                "status": q.status,
                "total_amount": float(q.total_amount),
                "discount_amount": float(q.discount_amount),
                "valid_until": q.valid_until.isoformat() if q.valid_until else None,
                "created_at": q.created_at.isoformat() if q.created_at else None,
                "items_count": len(q.items),
                "items": [
                    {
                        "product_name": it.product_name,
                        "quantity": float(it.quantity),
                        "unit_price": float(it.unit_price),
                        "discount_pct": float(it.discount_pct),
                        "subtotal": float(it.subtotal),
                    }
                    for it in q.items
                ],
            }
            for q in quotes
        ],
    }


@router.post("")
async def create_quote(
    req: QuoteCreateRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """
    Generates a deterministic commercial quote calculated against verified pricing rules.
    """
    # 1. Verify customer
    cust_res = await session.execute(select(Customer).where(Customer.id == req.customer_id))
    customer = cust_res.scalar_one_or_none()
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # 2. Calculate items using deterministic PricingService
    pricing_svc = PricingService(session, org_id=customer.org_id)
    quote_items = []
    total_gross = 0.0
    total_net = 0.0

    now = datetime.now(timezone.utc)
    quote_num = f"QTE-{now.strftime('%y%m%d')}-{random.randint(100, 999)}"

    quote = Quote(
        org_id=customer.org_id,
        quote_number=quote_num,
        customer_id=customer.id,
        conversation_id=req.conversation_id,
        status="draft",
        valid_until=now + timedelta(days=req.valid_days),
        notes=req.notes,
        currency="INR",
    )
    session.add(quote)
    await session.flush()

    for it in req.items:
        prod_res = await session.execute(select(Product).where(Product.id == it.product_id))
        product = prod_res.scalar_one_or_none()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {it.product_id} not found")

        # Deterministic pricing
        pricing_calc = await pricing_svc.calculate_quote(
            product_id=product.id,
            quantity_kg=it.quantity_kg,
            customer_segment=customer.company_type,
            autonomous_discount_requested=it.discount_pct,
        )

        subtotal = float(pricing_calc.final_price_per_kg) * it.quantity_kg
        gross = float(pricing_calc.base_price_per_kg) * it.quantity_kg
        discount_amount = gross - subtotal

        total_gross += gross
        total_net += subtotal

        quote_item = QuoteItem(
            quote_id=quote.id,
            product_id=product.id,
            variant_id=it.variant_id,
            product_name=product.name,
            quantity=it.quantity_kg,
            unit_price=float(pricing_calc.base_price_per_kg),
            discount_pct=float(pricing_calc.discount_percentage),
            subtotal=subtotal,
        )
        session.add(quote_item)
        quote_items.append(quote_item)

    quote.total_amount = total_net
    quote.discount_amount = total_gross - total_net
    await session.commit()
    await session.refresh(quote)

    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "customer_name": customer.name,
        "total_amount": float(quote.total_amount),
        "discount_amount": float(quote.discount_amount),
        "valid_until": quote.valid_until.isoformat() if quote.valid_until else None,
        "status": quote.status,
    }


@router.patch("/{quote_id}")
async def update_quote_status(
    quote_id: str,
    req: QuoteStatusUpdateRequest,
    session: AsyncSession = Depends(get_db_session),
):
    """Updates quote lifecycle state (e.g., sent, accepted, rejected)."""
    res = await session.execute(select(Quote).where(Quote.id == quote_id))
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    quote.status = req.status
    if req.approved_by:
        quote.approved_by = req.approved_by
    await session.commit()
    return {"id": quote.id, "status": quote.status}
