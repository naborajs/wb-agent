"""
Quotes API: auditable commercial pricing quotes with validity windows (Sections 43 & 44).
"""

from decimal import Decimal
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
from app.database.session import get_db
from app.pricing.calculator import PricingService

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
    session: AsyncSession = Depends(get_db),
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
    session: AsyncSession = Depends(get_db),
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
        pricing_calc = await pricing_svc.calculate_price(
            product_id=product.id,
            quantity_kg=Decimal(str(it.quantity_kg)),
            customer_segment=customer.company_type,
            requested_discount=Decimal(str(it.discount_pct or 0.0)),
        )

        gross = float(pricing_calc.subtotal)
        discount_amount = float(pricing_calc.discount_amount)
        net = float(pricing_calc.total)

        total_gross += gross
        total_net += net

        quote_item = QuoteItem(
            quote_id=quote.id,
            product_id=product.id,
            variant_id=it.variant_id,
            product_name=product.name,
            quantity=it.quantity_kg,
            unit_price=float(pricing_calc.base_price_per_kg),
            discount_pct=float(pricing_calc.discount_percentage),
            subtotal=net,
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


@router.get("/{quote_id}")
async def get_quote(
    quote_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Retrieves a single commercial quote by ID with line items and customer info."""
    stmt = (
        select(Quote)
        .options(selectinload(Quote.items), selectinload(Quote.customer))
        .where(Quote.id == quote_id)
    )
    res = await session.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    customer = quote.customer
    return {
        "id": quote.id,
        "quote_number": quote.quote_number,
        "customer_id": quote.customer_id,
        "customer_name": customer.name if customer else None,
        "customer_company": customer.company_name if customer else None,
        "customer_phone": customer.primary_phone if customer else None,
        "status": quote.status,
        "total_amount": float(quote.total_amount),
        "discount_amount": float(quote.discount_amount),
        "valid_until": quote.valid_until.isoformat() if quote.valid_until else None,
        "created_at": quote.created_at.isoformat() if quote.created_at else None,
        "notes": quote.notes,
        "items_count": len(quote.items),
        "items": [
            {
                "id": it.id,
                "product_id": it.product_id,
                "product_name": it.product_name,
                "quantity": float(it.quantity),
                "unit_price": float(it.unit_price),
                "discount_pct": float(it.discount_pct),
                "subtotal": float(it.subtotal),
            }
            for it in quote.items
        ],
    }


@router.patch("/{quote_id}")
async def update_quote_status(
    quote_id: str,
    req: QuoteStatusUpdateRequest,
    session: AsyncSession = Depends(get_db),
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


@router.post("/{quote_id}/convert")
async def convert_quote_to_order(
    quote_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Converts an active quote into a confirmed commercial order.
    Transfers line items and marks quote as accepted.
    """
    from app.database.models import Order, OrderItem
    stmt = (
        select(Quote)
        .options(selectinload(Quote.items))
        .where(Quote.id == quote_id)
    )
    res = await session.execute(stmt)
    quote = res.scalar_one_or_none()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    if quote.status in ("rejected", "expired"):
        raise HTTPException(status_code=400, detail=f"Cannot convert quote in '{quote.status}' status")

    now = datetime.now(timezone.utc)
    order = Order(
        org_id=quote.org_id,
        customer_id=quote.customer_id,
        conversation_id=quote.conversation_id,
        order_number=f"ORD-{now.strftime('%y%m%d')}-{random.randint(100, 999)}",
        status="pending",
        total_amount=quote.total_amount,
        shipping_address="Delivery location as per commercial quote",
    )
    session.add(order)
    await session.flush()

    for item in quote.items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item.product_id,
            variant_id=item.variant_id,
            product_name=item.product_name,
            quantity=item.quantity,
            unit_price=item.unit_price,
            discount_pct=item.discount_pct,
            subtotal=item.subtotal,
        )
        session.add(order_item)

    quote.status = "accepted"
    await session.commit()

    return {
        "success": True,
        "order_id": order.id,
        "order_number": order.order_number,
        "quote_id": quote.id,
        "status": "converted",
    }

