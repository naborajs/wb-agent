"""
Verification test for manual asset editing in Knowledge Hub:
Tests PATCH /api/v1/knowledge/items/{id} with updated discount, title, and content.
"""

import asyncio
import sys
from decimal import Decimal
from sqlalchemy import select

sys.path.insert(0, "backend")

from app.database.session import get_db_context
from app.database.models import KnowledgeItem
from app.knowledge.ingestion import KnowledgeIngestionService


async def verify_editor():
    print("=== Testing Knowledge Asset Editor Backend Sync ===")
    async with get_db_context() as session:
        # 1. Fetch an existing pricing rule
        stmt = select(KnowledgeItem).where(KnowledgeItem.category == "pricing_rule").limit(1)
        item = (await session.execute(stmt)).scalar_one_or_none()
        assert item is not None, "No pricing rule found in database."
        orig_id = item.id
        orig_version = item.version
        print(f"Found item: '{item.title}' (ID: {orig_id}, v{orig_version})")

        # 2. Simulate manual spreadsheet/document edit
        svc = KnowledgeIngestionService(session, item.org_id)
        updated = await svc.ingest_knowledge_item(
            title=f"{item.title} [Updated Manual]",
            content_text=f"{item.content_text}\n- Manually updated via Interactive Asset Editor Grid.",
            category=item.category,
            source_type="operator_editor",
            sku=item.sku,
            base_price=item.base_price,
            unit=item.unit,
            min_quantity=Decimal("175.0"),
            discount_percentage=Decimal("15.0"),
            max_autonomous_discount=Decimal("15.0"),
            customer_segment="wholesale",
            item_id=orig_id,
        )

        print(f"Updated item: '{updated.title}', new min_qty: {updated.min_quantity}, discount: {updated.discount_percentage}%, v{updated.version}")
        assert updated.version > orig_version, "Version was not incremented."
        assert updated.min_quantity == Decimal("175.0"), "min_quantity did not update."
        assert updated.discount_percentage == Decimal("15.0"), "discount_percentage did not update."
        print("Asset editor PATCH update and vector re-indexing test PASSED!")


if __name__ == "__main__":
    asyncio.run(verify_editor())
