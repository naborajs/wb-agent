"""
Pydantic schemas for Products, Variants, and Deterministic Pricing rules.
"""

from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field


class ProductVariantSchema(BaseModel):
    id: Optional[str] = None
    sku: str
    name: str
    packaging_type: str
    weight_kg: Decimal
    base_price_per_kg: Decimal
    in_stock: bool = True
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    tea_grade: Optional[str] = None
    origin: str
    harvest_season: Optional[str] = None
    min_order_quantity_kg: Decimal
    in_stock: bool
    is_active: bool
    attributes: Dict[str, Any] = Field(default_factory=dict)
    variants: List[ProductVariantSchema] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class PricingRuleResponse(BaseModel):
    id: str
    product_id: Optional[str] = None
    rule_name: str
    rule_type: str
    min_quantity_kg: Decimal
    max_quantity_kg: Optional[Decimal] = None
    discount_percentage: Decimal
    fixed_price_per_kg: Optional[Decimal] = None
    customer_segment: Optional[str] = None
    min_margin_percentage: Decimal
    requires_human_approval: bool
    max_autonomous_discount_percentage: Decimal
    is_active: bool

    model_config = ConfigDict(from_attributes=True)


class PriceCalculationRequest(BaseModel):
    product_id: str
    quantity_kg: Decimal
    customer_segment: Optional[str] = None
    requested_discount_percentage: Optional[Decimal] = Decimal("0.0")


class PriceCalculationResponse(BaseModel):
    product_id: str
    product_name: str
    quantity_kg: Decimal
    base_price_per_kg: Decimal
    discount_percentage: Decimal
    effective_price_per_kg: Decimal
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str = "INR"
    applied_rules: List[str] = Field(default_factory=list)
    requires_human_approval: bool = False
    approval_reason: Optional[str] = None
