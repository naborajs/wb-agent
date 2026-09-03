"""
Products, Variants, and Deterministic Pricing API endpoints (Section 52, 58, 85).
Full CRUD support for in-dashboard catalog editing, stock toggling, and pricing tier customization.
"""

from decimal import Decimal
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.config import settings
from app.database.models import PricingRule, Product, ProductVariant
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


# ==============================================================================
# SCHEMAS FOR CATALOG & PRICING CUSTOMIZATION
# ==============================================================================

class VariantInput(BaseModel):
    name: str
    packaging_type: str = "sack"
    weight_kg: float = Field(..., gt=0)
    base_price_per_kg: float = Field(..., gt=0)
    sku: Optional[str] = None


class ProductCreateInput(BaseModel):
    name: str
    category: str
    sku: Optional[str] = None
    tea_grade: Optional[str] = "BP"
    origin: str = "North Bengal, India"
    description: Optional[str] = None
    min_order_quantity_kg: float = 10.0
    base_price_per_kg: float = Field(..., gt=0)
    in_stock: bool = True
    packaging_type: str = "sack"
    weight_kg: float = 20.0


class ProductUpdateInput(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    tea_grade: Optional[str] = None
    origin: Optional[str] = None
    description: Optional[str] = None
    min_order_quantity_kg: Optional[float] = None
    in_stock: Optional[bool] = None
    base_price_per_kg: Optional[float] = None


class PricingRuleCreateInput(BaseModel):
    product_id: Optional[str] = None
    rule_name: str
    rule_type: str = "volume_tier"  # volume_tier, customer_segment, promotional
    min_quantity_kg: float = 0.0
    max_quantity_kg: Optional[float] = None
    discount_percentage: float = Field(..., ge=0, le=100)
    max_autonomous_discount_percentage: float = 5.0
    customer_segment: Optional[str] = None
    requires_human_approval: bool = False


class PricingRuleUpdateInput(BaseModel):
    rule_name: Optional[str] = None
    min_quantity_kg: Optional[float] = None
    max_quantity_kg: Optional[float] = None
    discount_percentage: Optional[float] = None
    max_autonomous_discount_percentage: Optional[float] = None
    requires_human_approval: Optional[bool] = None
    is_active: Optional[bool] = None


# ==============================================================================
# CATALOG ENDPOINTS
# ==============================================================================

@router.get("/products", response_model=List[ProductResponse])
async def list_products(
    category: Optional[str] = None,
    query: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """Lists wholesale catalog products with variants."""
    svc = ProductService(session, settings.DEFAULT_ORG_ID)
    products = await svc.search_products(query=query, category=category)
    return products


@router.post("/products", response_model=ProductResponse)
async def create_product(
    payload: ProductCreateInput,
    session: AsyncSession = Depends(get_db),
):
    """Creates a new product with an initial packaging variant."""
    import random
    clean_sku = payload.sku or f"NBT-{payload.category[:4].upper()}-{random.randint(100, 999)}"

    prod = Product(
        org_id=settings.DEFAULT_ORG_ID,
        sku=clean_sku,
        name=payload.name,
        category=payload.category,
        tea_grade=payload.tea_grade,
        origin=payload.origin,
        description=payload.description or f"Direct estate wholesale {payload.name}.",
        min_order_quantity_kg=Decimal(str(payload.min_order_quantity_kg)),
        in_stock=payload.in_stock,
        is_active=True,
    )
    session.add(prod)
    await session.commit()
    await session.refresh(prod)

    # Add initial packaging variant
    variant_sku = f"{clean_sku}-{int(payload.weight_kg)}KG"
    variant = ProductVariant(
        product_id=prod.id,
        sku=variant_sku,
        name=f"{int(payload.weight_kg)}kg {payload.packaging_type.title()}",
        packaging_type=payload.packaging_type,
        weight_kg=Decimal(str(payload.weight_kg)),
        base_price_per_kg=Decimal(str(payload.base_price_per_kg)),
        in_stock=payload.in_stock,
        is_active=True,
    )
    session.add(variant)
    await session.commit()
    await session.refresh(prod)

    # Reload with variants
    stmt = select(Product).where(Product.id == prod.id).options(selectinload(Product.variants))
    refreshed = (await session.execute(stmt)).scalar_one()
    return refreshed


@router.patch("/products/{product_id}")
async def update_product(
    product_id: str,
    payload: ProductUpdateInput,
    session: AsyncSession = Depends(get_db),
):
    """
    Updates product details, including in_stock toggle, MOQ, or base prices.
    """
    stmt = select(Product).where(Product.id == product_id).options(selectinload(Product.variants))
    prod = (await session.execute(stmt)).scalar_one_or_none()
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    if payload.name is not None:
        prod.name = payload.name
    if payload.category is not None:
        prod.category = payload.category
    if payload.tea_grade is not None:
        prod.tea_grade = payload.tea_grade
    if payload.origin is not None:
        prod.origin = payload.origin
    if payload.description is not None:
        prod.description = payload.description
    if payload.min_order_quantity_kg is not None:
        prod.min_order_quantity_kg = Decimal(str(payload.min_order_quantity_kg))
    if payload.in_stock is not None:
        prod.in_stock = payload.in_stock
        # Sync variants in_stock status
        for v in prod.variants:
            v.in_stock = payload.in_stock

    if payload.base_price_per_kg is not None and prod.variants:
        for v in prod.variants:
            v.base_price_per_kg = Decimal(str(payload.base_price_per_kg))

    await session.commit()
    return {"status": "updated", "product_id": prod.id, "in_stock": prod.in_stock}


@router.delete("/products/{product_id}")
async def delete_product(
    product_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Deactivates / deletes a product from the catalog."""
    prod = await session.get(Product, product_id)
    if not prod:
        raise HTTPException(status_code=404, detail="Product not found.")

    await session.delete(prod)
    await session.commit()
    return {"status": "deleted", "product_id": product_id}


# ==============================================================================
# PRICING RULES ENDPOINTS
# ==============================================================================

@router.get("/pricing/rules", response_model=List[PricingRuleResponse])
async def list_pricing_rules(session: AsyncSession = Depends(get_db)):
    """Lists deterministic pricing rules and volume tiers."""
    stmt = (
        select(PricingRule)
        .where(PricingRule.org_id == settings.DEFAULT_ORG_ID, PricingRule.is_active == True)
        .order_by(PricingRule.min_quantity_kg.asc())
    )
    res = await session.execute(stmt)
    return list(res.scalars().all())


@router.post("/pricing/rules", response_model=PricingRuleResponse)
async def create_pricing_rule(
    payload: PricingRuleCreateInput,
    session: AsyncSession = Depends(get_db),
):
    """Creates a new volume tier or discount rule."""
    rule = PricingRule(
        org_id=settings.DEFAULT_ORG_ID,
        product_id=payload.product_id,
        rule_name=payload.rule_name,
        rule_type=payload.rule_type,
        min_quantity_kg=Decimal(str(payload.min_quantity_kg)),
        max_quantity_kg=Decimal(str(payload.max_quantity_kg)) if payload.max_quantity_kg else None,
        discount_percentage=Decimal(str(payload.discount_percentage)),
        max_autonomous_discount_percentage=Decimal(str(payload.max_autonomous_discount_percentage)),
        customer_segment=payload.customer_segment,
        requires_human_approval=payload.requires_human_approval,
        is_active=True,
    )
    session.add(rule)
    await session.commit()
    await session.refresh(rule)
    return rule


@router.patch("/pricing/rules/{rule_id}", response_model=PricingRuleResponse)
async def update_pricing_rule(
    rule_id: str,
    payload: PricingRuleUpdateInput,
    session: AsyncSession = Depends(get_db),
):
    """Updates a pricing rule volume tier or discount percentage."""
    rule = await session.get(PricingRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found.")

    if payload.rule_name is not None:
        rule.rule_name = payload.rule_name
    if payload.min_quantity_kg is not None:
        rule.min_quantity_kg = Decimal(str(payload.min_quantity_kg))
    if payload.max_quantity_kg is not None:
        rule.max_quantity_kg = Decimal(str(payload.max_quantity_kg))
    if payload.discount_percentage is not None:
        rule.discount_percentage = Decimal(str(payload.discount_percentage))
    if payload.max_autonomous_discount_percentage is not None:
        rule.max_autonomous_discount_percentage = Decimal(str(payload.max_autonomous_discount_percentage))
    if payload.requires_human_approval is not None:
        rule.requires_human_approval = payload.requires_human_approval
    if payload.is_active is not None:
        rule.is_active = payload.is_active

    await session.commit()
    await session.refresh(rule)
    return rule


@router.delete("/pricing/rules/{rule_id}")
async def delete_pricing_rule(
    rule_id: str,
    session: AsyncSession = Depends(get_db),
):
    """Deactivates a pricing rule."""
    rule = await session.get(PricingRule, rule_id)
    if not rule:
        raise HTTPException(status_code=404, detail="Pricing rule not found.")

    await session.delete(rule)
    await session.commit()
    return {"status": "deleted", "rule_id": rule_id}


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
