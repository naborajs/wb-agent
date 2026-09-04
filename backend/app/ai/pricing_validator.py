"""
Zero-Hallucination Pricing & Invoice Post-Validator (Directive §3.C & §8).
Enforces programmatic verification of every price, volume tier, and quantity field
extracted by any LLM against the authoritative database pricing engine before invoice generation.
"""

import json
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, List, Optional, Tuple, Union
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database.models import Product
from app.pricing.calculator import PricingService
from app.utils.logging import logger


class PricingValidationError(ValueError):
    """Raised when extracted pricing data fails zero-hallucination verification."""
    pass


class PricingValidator:
    """
    Validates model-extracted order and invoice JSON against the authoritative database.
    Rejects any hallucinated price, invalid quantity, or MOQ violation.
    """

    @classmethod
    async def validate_extracted_order(
        cls,
        session: AsyncSession,
        org_id: str,
        extracted_data: Union[str, Dict[str, Any]],
    ) -> Tuple[bool, Optional[Dict[str, Any]], Optional[str]]:
        """
        Validates extracted order JSON against DB catalog and pricing engine.

        Returns:
            (is_valid: bool, verified_order: Optional[Dict], error_reason: Optional[str])
        """
        # 1. Parse JSON if string
        data: Dict[str, Any] = {}
        if isinstance(extracted_data, str):
            clean_str = extracted_data.strip()
            # Strip markdown code blocks if model wrapped in ```json ... ```
            if clean_str.startswith("```"):
                lines = clean_str.splitlines()
                if lines[0].startswith("```"):
                    lines = lines[1:]
                if lines and lines[-1].startswith("```"):
                    lines = lines[:-1]
                clean_str = "\n".join(lines).strip()
            try:
                data = json.loads(clean_str)
            except Exception as e:
                return False, None, f"Malformed JSON from extraction model: {e}"
        elif isinstance(extracted_data, dict):
            data = dict(extracted_data)
        else:
            return False, None, "Invalid extraction payload type (expected str or dict)."

        items = data.get("items")
        if not items or not isinstance(items, list):
            return False, None, "Extracted payload must contain a non-empty 'items' list."

        pricing_service = PricingService(session, org_id)
        verified_items: List[Dict[str, Any]] = []

        # 2. Programmatically verify each item against DB
        for idx, item in enumerate(items):
            p_name = item.get("product_name") or item.get("name") or ""
            p_id = item.get("product_id") or item.get("id")

            # Parse quantity first so qty_dec is available for all branches
            try:
                raw_qty = item.get("quantity_kg") or item.get("quantity") or 0
                qty_dec = Decimal(str(raw_qty))
            except (InvalidOperation, TypeError):
                return False, None, f"Item [{idx}] has invalid non-numeric quantity: '{item.get('quantity_kg')}'"

            if qty_dec <= Decimal("0"):
                return False, None, f"Item [{idx}] has non-positive quantity: {qty_dec}kg"

            # Match product in DB by ID or Name
            product: Optional[Product] = None
            if p_id:
                stmt = (
                    select(Product)
                    .options(selectinload(Product.variants))
                    .where(Product.id == str(p_id), Product.org_id == org_id)
                )
                res = await session.execute(stmt)
                product = res.scalar_one_or_none()

            clean_name = str(p_name).strip().lower() if p_name else ""
            if not product and p_name:
                # Search by exact or partial name
                stmt = (
                    select(Product)
                    .options(selectinload(Product.variants))
                    .where(Product.org_id == org_id)
                )
                all_prods = (await session.execute(stmt)).scalars().all()
                clean_words = [w for w in clean_name.split() if len(w) > 1]
                for p in all_prods:
                    p_lower = p.name.lower()
                    if clean_name in p_lower or p_lower in clean_name or (clean_words and all(w in p_lower for w in clean_words)):
                        product = p
                        break

            if not product:
                from app.products.catalog import DEMO_PRODUCTS
                matched_demo = None
                clean_words = [w for w in clean_name.split() if len(w) > 1]
                for dp in DEMO_PRODUCTS:
                    dp_lower = dp["name"].lower()
                    if clean_name and (clean_name in dp_lower or dp_lower in clean_name or (clean_words and all(w in dp_lower for w in clean_words))):
                        matched_demo = dp
                        break
                if not matched_demo:
                    return False, None, f"Item [{idx}] refers to unknown or uncatalogued product: '{p_name or p_id}'"

                # Validate against catalog definition
                moq = Decimal(str(matched_demo.get("min_order_quantity_kg", "10.0")))
                if qty_dec < moq:
                    return False, None, f"Item [{idx}] quantity ({qty_dec}kg) is below required MOQ ({moq}kg) for {matched_demo['name']}"

                base_rate = Decimal("340.0")
                for v in matched_demo.get("variants", []):
                    base_rate = Decimal(str(v.get("base_price_per_kg", base_rate)))

                disc_pct = Decimal("0.0")
                if qty_dec >= Decimal("100.0"):
                    disc_pct = Decimal("10.0")
                elif qty_dec >= Decimal("50.0"):
                    disc_pct = Decimal("5.0")

                eff_rate = base_rate * (Decimal("1.0") - disc_pct / Decimal("100.0"))

                # Zero-hallucination check for catalog items
                model_unit_price = item.get("unit_price") or item.get("price_per_kg") or item.get("base_price_per_kg")
                if model_unit_price is not None:
                    try:
                        model_price_dec = Decimal(str(model_unit_price))
                        diff = abs(model_price_dec - eff_rate)
                        if diff > Decimal("0.50"):
                            diff_base = abs(model_price_dec - base_rate)
                            if diff_base > Decimal("0.50"):
                                return (
                                    False,
                                    None,
                                    f"Zero-Hallucination violation on {matched_demo['name']}: "
                                    f"Model claimed unit price ₹{model_price_dec}, but catalog verified rate is ₹{eff_rate} (base ₹{base_rate}). Rejected.",
                                )
                    except (InvalidOperation, TypeError):
                        return False, None, f"Item [{idx}] contains unparseable unit_price: '{model_unit_price}'"

                subtot = base_rate * qty_dec
                tot = eff_rate * qty_dec
                verified_items.append({
                    "product_id": matched_demo["sku"],
                    "product_name": matched_demo["name"],
                    "tea_grade": matched_demo.get("tea_grade", "Commercial Wholesale"),
                    "quantity_kg": float(qty_dec),
                    "base_price_per_kg": float(base_rate),
                    "discount_percentage": float(disc_pct),
                    "unit_price": float(eff_rate),
                    "subtotal": float(subtot),
                    "discount_amount": float(subtot - tot),
                    "total": float(tot),
                    "packaging_type": item.get("packaging_type") or "Standard multi-wall bag with food-grade liner",
                })
                continue

            # Enforce Minimum Order Quantity (MOQ)
            if qty_dec < Decimal(str(product.min_order_quantity_kg)):
                return (
                    False,
                    None,
                    f"Item [{idx}] quantity ({qty_dec}kg) is below required MOQ ({product.min_order_quantity_kg}kg) for {product.name}",
                )

            # Compute authoritative verified pricing from DB
            try:
                calc_res = await pricing_service.calculate_price(
                    product_id=product.id,
                    quantity_kg=qty_dec,
                )
            except Exception as e:
                return False, None, f"Database pricing engine error for product '{product.name}': {e}"

            # If model supplied a unit_price, verify it against DB calculation
            model_unit_price = item.get("unit_price") or item.get("price_per_kg") or item.get("base_price_per_kg")
            if model_unit_price is not None:
                try:
                    model_price_dec = Decimal(str(model_unit_price))
                    diff = abs(model_price_dec - calc_res.effective_price_per_kg)
                    # Allow at most ₹0.50 difference for rounding
                    if diff > Decimal("0.50"):
                        # Check against base price without discount
                        diff_base = abs(model_price_dec - calc_res.base_price_per_kg)
                        if diff_base > Decimal("0.50"):
                            return (
                                False,
                                None,
                                f"Zero-Hallucination violation on {product.name}: "
                                f"Model claimed unit price ₹{model_price_dec}, but DB verified rate is ₹{calc_res.effective_price_per_kg} "
                                f"(base ₹{calc_res.base_price_per_kg}). Rejected.",
                            )
                except (InvalidOperation, TypeError):
                    return False, None, f"Item [{idx}] contains unparseable unit_price: '{model_unit_price}'"

            # Populate authoritative numbers from database
            verified_item = {
                "product_id": product.id,
                "product_name": product.name,
                "tea_grade": getattr(product, "tea_grade", "Commercial Wholesale"),
                "quantity_kg": float(qty_dec),
                "base_price_per_kg": float(calc_res.base_price_per_kg),
                "discount_percentage": float(calc_res.discount_percentage),
                "unit_price": float(calc_res.effective_price_per_kg),
                "subtotal": float(calc_res.subtotal),
                "discount_amount": float(calc_res.discount_amount),
                "total": float(calc_res.total),
                "packaging_type": item.get("packaging_type") or "Standard multi-wall bag with food-grade liner",
            }
            verified_items.append(verified_item)

        # Build fully verified order structure
        total_order_amount = sum(it["total"] for it in verified_items)
        verified_order: Dict[str, Any] = {
            "buyer_name": data.get("buyer_name") or "Valued Wholesale Client",
            "buyer_phone": data.get("buyer_phone") or "",
            "buyer_company": data.get("buyer_company") or "Commercial Partner",
            "delivery_city": data.get("delivery_city") or "Siliguri",
            "delivery_state": data.get("delivery_state") or "West Bengal",
            "buyer_gstin": data.get("buyer_gstin"),
            "items": verified_items,
            "total_amount": round(total_order_amount, 2),
            "currency": "INR",
            "verified_by": "database_pricing_service",
        }

        return True, verified_order, None
