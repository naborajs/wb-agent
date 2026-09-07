"""
Default B2B configurable pricing rules and discount policies for WhatsApp AI Agent by NS.
"""

from decimal import Decimal
from typing import Any, Dict, List

DEFAULT_PRICING_RULES: List[Dict[str, Any]] = [
    # Volume tier discounts (applies across catalog)
    {
        "rule_name": "Tier 1: 50+ Volume Discount",
        "rule_type": "volume_tier",
        "min_quantity": Decimal("50.0"),
        "max_quantity": Decimal("99.99"),
        "min_quantity_kg": Decimal("50.0"),
        "max_quantity_kg": Decimal("99.99"),
        "discount_percentage": Decimal("5.0"),
        "min_margin_percentage": Decimal("15.0"),
        "requires_human_approval": False,
        "max_autonomous_discount_percentage": Decimal("5.0"),
    },
    {
        "rule_name": "Tier 2: 100+ Commercial Volume Discount",
        "rule_type": "volume_tier",
        "min_quantity": Decimal("100.0"),
        "max_quantity": Decimal("499.99"),
        "min_quantity_kg": Decimal("100.0"),
        "max_quantity_kg": Decimal("499.99"),
        "discount_percentage": Decimal("10.0"),
        "min_margin_percentage": Decimal("15.0"),
        "requires_human_approval": False,
        "max_autonomous_discount_percentage": Decimal("7.5"),
    },
    {
        "rule_name": "Tier 3: 500+ Wholesale / Distributor Tier",
        "rule_type": "volume_tier",
        "min_quantity": Decimal("500.0"),
        "max_quantity": None,
        "min_quantity_kg": Decimal("500.0"),
        "max_quantity_kg": None,
        "discount_percentage": Decimal("15.0"),
        "min_margin_percentage": Decimal("12.0"),
        "requires_human_approval": True,  # Large wholesale orders require human confirmation
        "max_autonomous_discount_percentage": Decimal("10.0"),
    },
    # Customer segment specific rules
    {
        "rule_name": "Distributor Base Discount",
        "rule_type": "customer_segment",
        "customer_segment": "distributor",
        "min_quantity": Decimal("100.0"),
        "min_quantity_kg": Decimal("100.0"),
        "discount_percentage": Decimal("8.0"),
        "min_margin_percentage": Decimal("15.0"),
        "requires_human_approval": False,
        "max_autonomous_discount_percentage": Decimal("5.0"),
    },
    {
        "rule_name": "Commercial Starter Partner Discount",
        "rule_type": "customer_segment",
        "customer_segment": "commercial_starter",
        "min_quantity": Decimal("25.0"),
        "min_quantity_kg": Decimal("25.0"),
        "discount_percentage": Decimal("5.0"),
        "min_margin_percentage": Decimal("15.0"),
        "requires_human_approval": False,
        "max_autonomous_discount_percentage": Decimal("5.0"),
    },
]
