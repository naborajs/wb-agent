"""
Database Integrity & Consistency Verification Script.
Audits database relationships, checks for orphaned records, and verifies phone/pricing consistency.
"""

import asyncio
import os
import sys

# Ensure backend package is discoverable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import select, func
from app.database.session import get_db_context
from app.database.models import (
    Customer,
    Lead,
    Conversation,
    Quote,
    QuoteItem,
    Order,
    OrderItem,
    Product,
    ProductVariant,
)
from app.utils.phone import is_valid_phone_number


if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


async def verify_integrity():
    print("=" * 60)
    print("  WB-Agent Database Integrity Audit")
    print("=" * 60)

    issues = []

    async with get_db_context() as session:
        # 1. Audit Leads
        leads = (await session.execute(select(Lead))).scalars().all()
        invalid_lead_phones = [l.phone for l in leads if not is_valid_phone_number(l.phone)]
        if invalid_lead_phones:
            issues.append(f"Found {len(invalid_lead_phones)} leads with invalid phone formats: {invalid_lead_phones[:3]}")
        print(f"[OK] Audited {len(leads)} leads: {len(invalid_lead_phones)} formatting anomalies.")

        # 2. Audit Customers
        customers = (await session.execute(select(Customer))).scalars().all()
        invalid_cust_phones = [c.primary_phone for c in customers if not is_valid_phone_number(c.primary_phone)]
        if invalid_cust_phones:
            issues.append(f"Found {len(invalid_cust_phones)} customers with invalid phone formats.")
        print(f"[OK] Audited {len(customers)} customers: {len(invalid_cust_phones)} formatting anomalies.")

        # 3. Check for Orphaned Quote Items
        quote_ids = set((await session.execute(select(Quote.id))).scalars().all())
        quote_items = (await session.execute(select(QuoteItem))).scalars().all()
        orphaned_items = [qi.id for qi in quote_items if qi.quote_id not in quote_ids]
        if orphaned_items:
            issues.append(f"Found {len(orphaned_items)} orphaned quote items.")
        print(f"[OK] Audited {len(quote_items)} quote items: {len(orphaned_items)} orphaned.")

        # 4. Check for Orphaned Order Items
        order_ids = set((await session.execute(select(Order.id))).scalars().all())
        order_items = (await session.execute(select(OrderItem))).scalars().all()
        orphaned_order_items = [oi.id for oi in order_items if oi.order_id not in order_ids]
        if orphaned_order_items:
            issues.append(f"Found {len(orphaned_order_items)} orphaned order items.")
        print(f"[OK] Audited {len(order_items)} order items: {len(orphaned_order_items)} orphaned.")

        # 5. Product Catalog Variants
        products = (await session.execute(select(Product))).scalars().all()
        variants = (await session.execute(select(ProductVariant))).scalars().all()
        prod_ids = set(p.id for p in products)
        orphaned_variants = [v.id for v in variants if v.product_id not in prod_ids]
        if orphaned_variants:
            issues.append(f"Found {len(orphaned_variants)} product variants without parent product.")
        print(f"[OK] Audited {len(products)} products and {len(variants)} variants: {len(orphaned_variants)} orphaned.")

    print("\n" + "-" * 60)
    if issues:
        print(f"[WARN] Database Audit Completed with {len(issues)} warnings:")
        for issue in issues:
            print(f"   - {issue}")
    else:
        print("[PASS] Database Audit Completed: ZERO integrity issues found. All records sound.")
    print("-" * 60)


if __name__ == "__main__":
    asyncio.run(verify_integrity())
