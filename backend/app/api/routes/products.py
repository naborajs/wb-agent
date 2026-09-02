"""
Products, Variants, and Deterministic Pricing API endpoints (Section 52 & 58).
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.config import settings
from app.database.models import PricingRule, Product
from app.database.session import get_db
from app.pricing.calculator import PricingService
from app.products.service import ProductService
from app.schemas.products import (
    PriceCalculationRequest,
    PriceCalculationResponse,
    PricingRuleResponse,
    ProductResponse,
)

router = APIRouter(tags=["Products & Pricing"])


@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = None,
    query: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Lists wholesale catalog products."""
    svc = ProductService(session, settings.DEFAULT_ORG_ID)
    products = await svc.search_products(query=query, category=category)
    return products


@router.get("/pricing/rules", response_model=List[PricingRuleResponse])
async def list_pricing_rules(session: AsyncSession = Depends(get_db)):
    """Lists deterministic pricing rules and volume tiers."""
    stmt = (
        select(PricingRule)
        .where(PricingRule.org_id == settings.DEFAULT_ORG_ID, PricingRule.is_active == True)
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("/pricing/calculate", response_model=PriceCalculationResponse)
async def calculate_quote(req: PriceCalculationRequest, session: AsyncSession = Depends(get_db)):
    """Calculates deterministic quote enforcing volume tiers and negotiation authority."""
    svc = PricingService(session, settings.DEFAULT_ORG_ID)
    try:
        quote = await svc.calculate_price(
            product_id=req.product_id,
            quantity_kg=req.quantity_kg,
            customer_segment=req.customer_segment,
            requested_discount=req.requested_discount_percentage,
        )
        return quote
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
