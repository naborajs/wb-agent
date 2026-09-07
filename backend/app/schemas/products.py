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
    packaging_type: str = "standard"
    unit_quantity: Optional[Decimal] = None
    weight_kg: Optional[Decimal] = None
    base_price_per_unit: Optional[Decimal] = None
    base_price_per_kg: Optional[Decimal] = None
    in_stock: bool = True
    is_active: bool = True

    model_config = ConfigDict(from_attributes=True)


class ProductResponse(BaseModel):
    id: str
    sku: str
    name: str
    category: str
    description: Optional[str] = None
    grade: Optional[str] = None
    tea_grade: Optional[str] = None
    origin: Optional[str] = None
    harvest_season: Optional[str] = None
    min_order_quantity: Optional[Decimal] = None
    min_order_quantity_kg: Optional[Decimal] = None
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
    min_quantity: Optional[Decimal] = None
    min_quantity_kg: Optional[Decimal] = None
    max_quantity: Optional[Decimal] = None
    max_quantity_kg: Optional[Decimal] = None
    discount_percentage: Decimal
    fixed_price: Optional[Decimal] = None
    fixed_price_per_kg: Optional[Decimal] = None
    customer_segment: Optional[str] = None
    min_margin_percentage: Decimal = Decimal("15.0")
    requires_human_approval: bool = False
    max_autonomous_discount_percentage: Decimal = Decimal("5.0")
    is_active: bool = True
    rule_metadata: Dict[str, Any] = Field(default_factory=dict)

    model_config = ConfigDict(from_attributes=True)


class PriceCalculationRequest(BaseModel):
    product_id: str
    quantity: Optional[Decimal] = None
    quantity_kg: Optional[Decimal] = None
    customer_segment: Optional[str] = None
    requested_discount_percentage: Optional[Decimal] = Decimal("0.0")

    def resolved_quantity(self) -> Decimal:
        if self.quantity is not None:
            return self.quantity
        if self.quantity_kg is not None:
            return self.quantity_kg
        return Decimal("1.0")


class PriceCalculationResponse(BaseModel):
    product_id: str
    product_name: str
    quantity: Optional[Decimal] = None
    quantity_kg: Optional[Decimal] = None
    base_price_per_unit: Optional[Decimal] = None
    base_price_per_kg: Optional[Decimal] = None
    discount_percentage: Decimal
    effective_price_per_unit: Optional[Decimal] = None
    effective_price_per_kg: Optional[Decimal] = None
    subtotal: Decimal
    discount_amount: Decimal
    total: Decimal
    currency: str = "INR"
    applied_rules: List[str] = Field(default_factory=list)
    requires_human_approval: bool = False
    approval_reason: Optional[str] = None
