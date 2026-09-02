"""
Deterministic B2B Pricing Calculator and Negotiation Engine.

Enforces business rules (Section 31 & 32):
- Guarantees LLM never invents prices or discounts.
- Strict MOQ enforcement.
- Automated tier calculation based on volume and customer segment.
- Autonomous negotiation limits: flags human approval when exceeded.
"""

from decimal import Decimal, ROUND_HALF_UP
from typing import List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from app.database.models import PricingRule, Product, ProductVariant
from app.schemas.products import PriceCalculationResponse
from app.utils.logging import logger


class PricingService:
    """
    Deterministic pricing authority for North Bengal Tea Co.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def calculate_price(
        self,
        product_id: str,
        quantity_kg: Decimal,
        customer_segment: Optional[str] = None,
        requested_discount: Optional[Decimal] = Decimal("0.0"),
    ) -> PriceCalculationResponse:
        """
        Calculates verified pricing, applying volume tiers and checking negotiation boundaries.
        """
        # 1. Fetch product with variants
        stmt = (
            select(Product)
            .options(selectinload(Product.variants))
            .where(Product.id == product_id, Product.org_id == self.org_id)
        )
        res = await self.session.execute(stmt)
        product = res.scalar_one_or_none()
        if not product:
            raise ValueError(f"Product with ID '{product_id}' not found.")

        # 2. Check Minimum Order Quantity (MOQ)
        moq = product.min_order_quantity_kg
        if quantity_kg < moq:
            raise ValueError(
                f"Requested quantity {quantity_kg}kg is below the Minimum Order Quantity ({moq}kg) for {product.name}."
            )

        # 3. Determine Base Price per kg from largest matching variant or default variant
        base_price_per_kg = Decimal("0.0")
        if product.variants:
            # Sort variants by weight descending to match wholesale economies of scale
            sorted_variants = sorted(product.variants, key=lambda v: v.weight_kg, reverse=True)
            # Find the best variant that fits the quantity, or default to the largest pack
            matching_variant = sorted_variants[0]
            for var in sorted_variants:
                if quantity_kg >= var.weight_kg:
                    matching_variant = var
                    break
            base_price_per_kg = matching_variant.base_price_per_kg
        else:
            base_price_per_kg = Decimal("500.00")  # Fallback base rate

        # 4. Fetch applicable pricing rules from DB
        rules_stmt = select(PricingRule).where(
            PricingRule.org_id == self.org_id,
            PricingRule.is_active == True,
            (PricingRule.product_id == product.id) | (PricingRule.product_id.is_(None)),
        )
        rules_res = await self.session.execute(rules_stmt)
        rules = rules_res.scalars().all()

        applied_rules: List[str] = []
        max_rule_discount = Decimal("0.0")
        requires_human_approval = False
        approval_reasons: List[str] = []
        max_autonomous_discount = Decimal("5.0")  # Default autonomous ceiling

        # 5. Evaluate volume tier and segment rules
        norm_segment = customer_segment.strip().lower() if customer_segment else None

        for rule in rules:
            rule_applies = False

            if rule.rule_type == "volume_tier":
                if rule.min_quantity_kg <= quantity_kg:
                    if rule.max_quantity_kg is None or quantity_kg <= rule.max_quantity_kg:
                        rule_applies = True

            elif rule.rule_type == "customer_segment" and norm_segment:
                if rule.customer_segment and rule.customer_segment.lower() == norm_segment:
                    if rule.min_quantity_kg <= quantity_kg:
                        rule_applies = True

            if rule_applies:
                applied_rules.append(rule.rule_name)
                if rule.discount_percentage > max_rule_discount:
                    max_rule_discount = rule.discount_percentage
                if rule.max_autonomous_discount_percentage > max_autonomous_discount:
                    max_autonomous_discount = rule.max_autonomous_discount_percentage
                if rule.requires_human_approval:
                    requires_human_approval = True
                    approval_reasons.append(f"Rule '{rule.rule_name}' requires human confirmation.")

        # 6. Evaluate negotiation / requested extra discount
        effective_discount = max_rule_discount
        req_disc = requested_discount or Decimal("0.0")
        if req_disc > Decimal("0.0"):
            if req_disc > max_autonomous_discount:
                requires_human_approval = True
                approval_reasons.append(
                    f"Requested discount ({req_disc}%) exceeds autonomous authority limit ({max_autonomous_discount}%)."
                )
                effective_discount = max_autonomous_discount  # Cap at autonomous limit pending human review
            else:
                effective_discount = max(effective_discount, req_disc)

        # 7. Compute financial amounts
        subtotal = (base_price_per_kg * quantity_kg).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        discount_multiplier = effective_discount / Decimal("100.0")
        discount_amount = (subtotal * discount_multiplier).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        total = (subtotal - discount_amount).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        effective_price_per_kg = (total / quantity_kg).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

        approval_reason_text = " | ".join(approval_reasons) if approval_reasons else None

        return PriceCalculationResponse(
            product_id=product.id,
            product_name=product.name,
            quantity_kg=quantity_kg,
            base_price_per_kg=base_price_per_kg,
            discount_percentage=effective_discount,
            effective_price_per_kg=effective_price_per_kg,
            subtotal=subtotal,
            discount_amount=discount_amount,
            total=total,
            currency="INR",
            applied_rules=applied_rules,
            requires_human_approval=requires_human_approval,
            approval_reason=approval_reason_text,
        )
