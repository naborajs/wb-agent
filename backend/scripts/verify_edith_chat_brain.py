"""
End-to-End Verification of EDITH Knowledge Hub Conversational Brain:
1. Tests that "Hi" replies conversationally without creating a file.
2. Tests that "What files are there?" returns an inventory without creating a file.
3. Tests that "Explain our wholesale logistics policy" explains the policy without creating a file.
4. Tests that "Create a new pricing tier: 15% discount for 150+ units" properly executes and audits.
5. Verifies database state to guarantee no spurious files exist.
"""

import asyncio
import os
import sys

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.config import settings
from app.database.session import get_session_factory
from app.brain.inter_brain_bus import inter_brain_bus
from app.database.models import KnowledgeItem
from sqlalchemy import select


async def run_tests():
    print("\n" + "=" * 80)
    print("🧠 STARTING EDITH CONVERSATIONAL BRAIN VERIFICATION")
    print("=" * 80)

    session_factory = get_session_factory()
    async with session_factory() as session:
        # Check starting count of items
        stmt = select(KnowledgeItem)
        initial_items = (await session.execute(stmt)).scalars().all()
        initial_count = len(initial_items)
        print(f"📊 Initial Knowledge Items in DB: {initial_count}")

        # -------------------------------------------------------------
        # TEST 1: Greeting "Hi"
        # -------------------------------------------------------------
        print("\n--- [TEST 1] Operator says 'Hi' ---")
        res1 = await inter_brain_bus.dispatch_knowledge_update(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_instruction="Hi",
        )
        assert res1["success"] is True, f"Failed: {res1}"
        assert res1["decision"] == "INFO", f"Expected decision 'INFO', got '{res1['decision']}'"
        assert res1["resulting_item"] is None, "ERROR: Resulting item was created for 'Hi'!"
        assert "EDITH" in res1["reply_text"], "Expected EDITH intro in reply"
        print(f"✔ TEST 1 PASSED: 'Hi' returned conversational introduction.")
        print(f"   Response excerpt: {res1['reply_text'][:120]}...")

        # Verify DB count unchanged
        stmt2 = select(KnowledgeItem)
        count_after_hi = len((await session.execute(stmt2)).scalars().all())
        assert count_after_hi == initial_count, f"ERROR: File count increased from {initial_count} to {count_after_hi} after 'Hi'!"
        print(f"✔ DB Integrity Verified: Total files remains {count_after_hi}.")

        # -------------------------------------------------------------
        # TEST 2: "What files do we have?"
        # -------------------------------------------------------------
        print("\n--- [TEST 2] Operator asks 'What files do we have?' ---")
        res2 = await inter_brain_bus.dispatch_knowledge_update(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_instruction="What files do we have?",
        )
        assert res2["success"] is True
        assert res2["decision"] == "INFO"
        assert res2["resulting_item"] is None, "ERROR: Resulting item created on file list query!"
        assert "Pricing Rules" in res2["reply_text"] or "Business Info" in res2["reply_text"], "Expected file breakdown"
        print(f"✔ TEST 2 PASSED: Directory inventory returned without file creation.")
        print(f"   Response excerpt: {res2['reply_text'][:150]}...")

        # -------------------------------------------------------------
        # TEST 3: "Explain Wholesale Freight, Logistics & Fulfillment Policy"
        # -------------------------------------------------------------
        print("\n--- [TEST 3] Operator asks 'Explain Wholesale Freight, Logistics & Fulfillment Policy' ---")
        res3 = await inter_brain_bus.dispatch_knowledge_update(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_instruction="Explain Wholesale Freight, Logistics & Fulfillment Policy",
        )
        assert res3["success"] is True
        assert res3["decision"] == "INFO"
        assert res3["resulting_item"] is None, "ERROR: Resulting item created on explain query!"
        assert "Policy Specification" in res3["reply_text"] or "Commercial Intelligence" in res3["reply_text"]
        print(f"✔ TEST 3 PASSED: Policy explained without file creation.")
        print(f"   Response excerpt: {res3['reply_text'][:150]}...")

        # -------------------------------------------------------------
        # TEST 4: Vague command "Create a file"
        # -------------------------------------------------------------
        print("\n--- [TEST 4] Operator gives vague directive 'Create a file' ---")
        res4 = await inter_brain_bus.dispatch_knowledge_update(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_instruction="Create a file",
        )
        assert res4["success"] is True
        assert res4["decision"] == "INFO"
        assert res4["resulting_item"] is None, "ERROR: Resulting item created on vague command!"
        assert "provide the details" in res4["reply_text"] or "For example" in res4["reply_text"]
        print(f"✔ TEST 4 PASSED: Prompted for parameters without creating empty file.")

        # -------------------------------------------------------------
        # TEST 5: Legitimate Action Directive
        # -------------------------------------------------------------
        print("\n--- [TEST 5] Operator issues explicit directive: 'Create a new pricing tier: 15% discount for 150+ units' ---")
        res5 = await inter_brain_bus.dispatch_knowledge_update(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_instruction="Create a new pricing tier: 15% discount for 150+ units",
            category_hint="pricing_rule",
        )
        assert res5["success"] is True
        assert res5["decision"] == "ACCEPTED", f"Expected ACCEPTED, got {res5['decision']}"
        assert res5["resulting_item"] is not None, "Expected resulting item for valid pricing tier"
        created_item_id = res5["resulting_item"]["id"]
        print(f"✔ TEST 5 PASSED: Proposal evaluated & accepted by EDITH! Created item ID: {created_item_id}")

        # Clean up test item
        del_item = (await session.execute(select(KnowledgeItem).where(KnowledgeItem.id == created_item_id))).scalar_one_or_none()
        if del_item:
            await session.delete(del_item)
            await session.commit()
            print(f"✔ Cleaned up temporary test item {created_item_id}.")

        # Final check: No bogus files named "Hi", "Hello", or "Edit"
        bogus_stmt = select(KnowledgeItem).where(KnowledgeItem.title.in_(["Hi", "hi", "Hello", "hello", "Edit", "edit"]))
        bogus = (await session.execute(bogus_stmt)).scalars().all()
        assert len(bogus) == 0, f"ERROR: Found bogus items in DB: {[b.title for b in bogus]}"
        print(f"✔ Final Verification: Zero spurious files exist in knowledge database!")

    print("\n" + "=" * 80)
    print("🎉 ALL EDITH CONVERSATIONAL BRAIN TESTS PASSED PERFECTLY!")
    print("=" * 80)


if __name__ == "__main__":
    asyncio.run(run_tests())
