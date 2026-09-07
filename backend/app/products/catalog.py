"""
Generic Product Catalog specification and seeding data for WhatsApp AI Agent by NS.
Supports arbitrary product types, services, and optional tea demo catalog.
"""

from decimal import Decimal
from typing import Any, Dict, List

GENERIC_DEMO_PRODUCTS: List[Dict[str, Any]] = [
    {
        "sku": "PROD-STD-001",
        "name": "Standard Commercial Package",
        "category": "Commercial Supply",
        "description": "Comprehensive standard commercial product tier suited for business operations and daily supply.",
        "grade": "Standard Commercial",
        "tea_grade": "Standard Commercial",
        "origin": "Main Fulfillment Center",
        "harvest_season": "All-Season",
        "min_order_quantity": Decimal("10.0"),
        "min_order_quantity_kg": Decimal("10.0"),
        "in_stock": True,
        "attributes": {
            "specification": "Commercial Grade A",
            "lead_time": "2-3 business days",
            "ideal_for": "Retail, hospitality, corporate offices"
        },
        "variants": [
            {"sku": "PROD-STD-V1", "name": "Standard Pack (10 Units)", "packaging_type": "box", "weight_kg": Decimal("10.0"), "unit_quantity": Decimal("10.0"), "base_price_per_unit": Decimal("350.00"), "base_price_per_kg": Decimal("350.00")},
            {"sku": "PROD-STD-V2", "name": "Master Pack (50 Units)", "packaging_type": "carton", "weight_kg": Decimal("50.0"), "unit_quantity": Decimal("50.0"), "base_price_per_unit": Decimal("310.00"), "base_price_per_kg": Decimal("310.00")},
        ]
    },
    {
        "sku": "PROD-PREM-002",
        "name": "Premium Commercial Package",
        "category": "Premium Solutions",
        "description": "High-grade commercial selection with enhanced specifications and rigorous quality inspection.",
        "grade": "Premium Select",
        "tea_grade": "Premium Select",
        "origin": "Primary Facility",
        "harvest_season": "All-Season",
        "min_order_quantity": Decimal("5.0"),
        "min_order_quantity_kg": Decimal("5.0"),
        "in_stock": True,
        "attributes": {
            "specification": "Enterprise Grade Premium",
            "lead_time": "1-2 business days",
            "ideal_for": "Boutique establishments, luxury accounts, specialty businesses"
        },
        "variants": [
            {"sku": "PROD-PREM-V1", "name": "Premium Pack (5 Units)", "packaging_type": "box", "weight_kg": Decimal("5.0"), "unit_quantity": Decimal("5.0"), "base_price_per_unit": Decimal("850.00"), "base_price_per_kg": Decimal("850.00")},
            {"sku": "PROD-PREM-V2", "name": "Bulk Premium Crate (25 Units)", "packaging_type": "crate", "weight_kg": Decimal("25.0"), "unit_quantity": Decimal("25.0"), "base_price_per_unit": Decimal("780.00"), "base_price_per_kg": Decimal("780.00")},
        ]
    },
]

SAMPLE_TEA_DEMO_PRODUCTS: List[Dict[str, Any]] = [
    {
        "sku": "NBT-DARJ-FF",
        "name": "Darjeeling Spring First Flush Special",
        "category": "Darjeeling",
        "description": "Hand-plucked high-altitude first flush from Kurseong & Mirik estates. Delicate floral aroma with crisp muscatel notes.",
        "grade": "FTGFOP1",
        "tea_grade": "FTGFOP1",
        "origin": "Darjeeling, West Bengal",
        "harvest_season": "First Flush (Spring)",
        "min_order_quantity": Decimal("10.0"),
        "min_order_quantity_kg": Decimal("10.0"),
        "in_stock": True,
        "attributes": {
            "aroma": "Delicate floral & fresh grass",
            "liquor": "Light golden amber",
            "ideal_for": "Fine dining, boutique cafés, gourmet tea bars"
        },
        "variants": [
            {"sku": "NBT-DARJ-FF-5KG", "name": "5kg Foil Bag", "packaging_type": "foil_bag", "weight_kg": Decimal("5.0"), "unit_quantity": Decimal("5.0"), "base_price_per_unit": Decimal("1600.00"), "base_price_per_kg": Decimal("1600.00")},
            {"sku": "NBT-DARJ-FF-20KG", "name": "20kg Wooden Chest", "packaging_type": "chest", "weight_kg": Decimal("20.0"), "unit_quantity": Decimal("20.0"), "base_price_per_unit": Decimal("1450.00"), "base_price_per_kg": Decimal("1450.00")},
        ]
    },
    {
        "sku": "NBT-DARJ-SF",
        "name": "Darjeeling Muscatel Second Flush",
        "category": "Darjeeling",
        "description": "Sun-drenched summer harvest with distinctive ripe fruit and rich muscatel notes. Amber cup with full-bodied smoothness.",
        "grade": "FTGFOP1",
        "tea_grade": "FTGFOP1",
        "origin": "Darjeeling, West Bengal",
        "harvest_season": "Second Flush (Summer)",
        "min_order_quantity": Decimal("10.0"),
        "min_order_quantity_kg": Decimal("10.0"),
        "in_stock": True,
        "attributes": {
            "aroma": "Sweet muscatel grape & honey",
            "liquor": "Rich copper red",
            "ideal_for": "Luxury hotels, afternoon tea services, specialty gifting"
        },
        "variants": [
            {"sku": "NBT-DARJ-SF-5KG", "name": "5kg Foil Bag", "packaging_type": "foil_bag", "weight_kg": Decimal("5.0"), "unit_quantity": Decimal("5.0"), "base_price_per_unit": Decimal("1800.00"), "base_price_per_kg": Decimal("1800.00")},
            {"sku": "NBT-DARJ-SF-25KG", "name": "25kg Vacuum Sack", "packaging_type": "sack", "weight_kg": Decimal("25.0"), "unit_quantity": Decimal("25.0"), "base_price_per_unit": Decimal("1650.00"), "base_price_per_kg": Decimal("1650.00")},
        ]
    },
    {
        "sku": "NBT-ASSAM-CTC",
        "name": "Assam Kadak CTC Granules",
        "category": "Assam CTC",
        "description": "Extra strong, malty CTC tea granules harvested from Upper Assam estates. Produces thick, brisk liquor with dark reddish color.",
        "grade": "BP",
        "tea_grade": "BP",
        "origin": "Upper Assam",
        "harvest_season": "Monsoon / Autumnal",
        "min_order_quantity": Decimal("25.0"),
        "min_order_quantity_kg": Decimal("25.0"),
        "in_stock": True,
        "attributes": {
            "aroma": "Malty & pungent",
            "liquor": "Deep brisk red with high milk tolerance",
            "ideal_for": "High-volume cafés, roadside tea shops, restaurants, corporate cafeterias"
        },
        "variants": [
            {"sku": "NBT-ASSAM-CTC-10KG", "name": "10kg Commercial Sack", "packaging_type": "sack", "weight_kg": Decimal("10.0"), "unit_quantity": Decimal("10.0"), "base_price_per_unit": Decimal("380.00"), "base_price_per_kg": Decimal("380.00")},
            {"sku": "NBT-ASSAM-CTC-30KG", "name": "30kg Master Bag", "packaging_type": "sack", "weight_kg": Decimal("30.0"), "unit_quantity": Decimal("30.0"), "base_price_per_unit": Decimal("340.00"), "base_price_per_kg": Decimal("340.00")},
        ]
    },
    {
        "sku": "NBT-DOOARS-HB",
        "name": "Dooars Terai Hotel Master Blend",
        "category": "Dooars",
        "description": "Specially formulated blend of Dooars and Terai CTC cuts engineered for maximum cuppage and fast liquor release.",
        "grade": "BOP / OF",
        "tea_grade": "BOP / OF",
        "origin": "Dooars & Terai, West Bengal",
        "harvest_season": "Year-round blend",
        "min_order_quantity": Decimal("20.0"),
        "min_order_quantity_kg": Decimal("20.0"),
        "in_stock": True,
        "attributes": {
            "aroma": "Robust earthy tea notes",
            "liquor": "Bright mahogany, extremely cost-effective per cup",
            "ideal_for": "Hotels, railway canteens, catering services, institutional dining"
        },
        "variants": [
            {"sku": "NBT-DOOARS-HB-20KG", "name": "20kg Poly Sack", "packaging_type": "sack", "weight_kg": Decimal("20.0"), "unit_quantity": Decimal("20.0"), "base_price_per_unit": Decimal("260.00"), "base_price_per_kg": Decimal("260.00")},
            {"sku": "NBT-DOOARS-HB-50KG", "name": "50kg Bulk Jute Sack", "packaging_type": "sack", "weight_kg": Decimal("50.0"), "unit_quantity": Decimal("50.0"), "base_price_per_unit": Decimal("230.00"), "base_price_per_kg": Decimal("230.00")},
        ]
    },
    {
        "sku": "NBT-GREEN-LEAF",
        "name": "Sub-Himalayan Green Tea Whole Leaf",
        "category": "Green Tea",
        "description": "Non-fermented, gently steamed whole green tea leaves packed with natural antioxidants and polyphenols.",
        "grade": "Green Pekoe",
        "tea_grade": "Green Pekoe",
        "origin": "Dooars Foothills, West Bengal",
        "harvest_season": "Spring & Autumn",
        "min_order_quantity": Decimal("10.0"),
        "min_order_quantity_kg": Decimal("10.0"),
        "in_stock": True,
        "attributes": {
            "aroma": "Fresh vegetal & nutty sweetness",
            "liquor": "Pale emerald yellow",
            "ideal_for": "Wellness cafés, yoga centers, corporate wellness programs"
        },
        "variants": [
            {"sku": "NBT-GREEN-LEAF-5KG", "name": "5kg Zipper Pouch", "packaging_type": "pouch", "weight_kg": Decimal("5.0"), "unit_quantity": Decimal("5.0"), "base_price_per_unit": Decimal("850.00"), "base_price_per_kg": Decimal("850.00")},
            {"sku": "NBT-GREEN-LEAF-25KG", "name": "25kg Drum", "packaging_type": "drum", "weight_kg": Decimal("25.0"), "unit_quantity": Decimal("25.0"), "base_price_per_unit": Decimal("750.00"), "base_price_per_kg": Decimal("750.00")},
        ]
    },
]

DEMO_PRODUCTS: List[Dict[str, Any]] = GENERIC_DEMO_PRODUCTS + SAMPLE_TEA_DEMO_PRODUCTS
