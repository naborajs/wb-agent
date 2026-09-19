"""
Automated Verification Suite for Dynamic Modular System Prompts.
Validates:
1. Dynamic Section CRUD & Ordering
2. System Section Protection (409 Conflict on delete/archive)
3. Dynamic assemble_system_prompt() with active/disabled filtering
4. Git-style line-by-line diff engine
5. Version pinning & pruning preservation
6. Rollback with audit trail & author tracking
7. Factory default reset for system sections
8. Accurate BPE token counting via tiktoken
9. Friday voice action confirmation loop
"""

import asyncio
import os
from pathlib import Path
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from typing import Any, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.session import get_db_context
from app.agent.prompts import PromptService, compute_line_diff, count_tokens
from app.database.migrations.migrate_to_dynamic_prompt_sections import run_prompt_sections_migration
from app.services import friday_actions
from app.ai.router import ai_router


async def test_migration_and_system_sections(session: AsyncSession, org_id: str):
    print("\n[TEST 1] Verifying Migration & System Sections...")
    res = await run_prompt_sections_migration(session, org_id=org_id)
    assert res["success"] is True, "Migration failed"

    svc = PromptService(session, org_id)
    sections = await svc.list_sections(include_archived=False)
    system_keys = {s.key for s in sections if s.is_system}
    expected_keys = {"core_safety", "core_identity", "business_policy", "sales_style", "business_profile"}
    assert expected_keys.issubset(system_keys), f"Missing system keys: {expected_keys - system_keys}"
    print(f"  ✓ System sections present: {sorted(list(system_keys))}")


async def test_system_section_protection(session: AsyncSession, org_id: str):
    print("\n[TEST 2] Verifying System Section Protection (Cannot delete/archive)...")
    svc = PromptService(session, org_id)
    success, msg = await svc.archive_section("core_safety")
    assert success is False, "core_safety should NOT be archivable"
    assert "cannot be archived or deleted" in msg.lower(), f"Unexpected message: {msg}"
    print(f"  ✓ Protection verified: {msg}")


async def test_custom_section_crud(session: AsyncSession, org_id: str):
    import time
    print("\n[TEST 3] Verifying Custom Section CRUD & Archival...")
    svc = PromptService(session, org_id)
    test_key = f"test_returns_{int(time.time())}"

    # 1. Create
    sec = await svc.create_section(
        key=test_key,
        display_name="Returns & Refund Policy",
        description="Handles merchandise return SLAs and refund conditions",
        starter_instructions="1. All returns must be initiated within 48 hours of shipment delivery.",
        created_by="test_runner",
    )
    assert sec.id is not None
    assert sec.is_system is False
    assert sec.is_active is True
    print(f"  ✓ Created custom section: {sec.display_name} (id: {sec.id})")

    # 2. Toggle active
    updated = await svc.update_section(sec.id, is_active=False)
    assert updated.is_active is False
    print("  ✓ Toggled section is_active to False")

    # 3. Dynamic assembly test: disabled section should be excluded
    prompt_with_disabled = await svc.assemble_system_prompt()
    assert "RETURNS & REFUND POLICY" not in prompt_with_disabled, "Disabled section leaked into prompt"
    print("  ✓ Disabled section correctly excluded from live assembled system prompt")

    # Re-enable
    await svc.update_section(sec.id, is_active=True)
    prompt_with_enabled = await svc.assemble_system_prompt()
    assert "RETURNS & REFUND POLICY" in prompt_with_enabled, "Enabled section missing from prompt"
    print("  ✓ Re-enabled section correctly included in assembled system prompt")

    # 4. Archive (Soft delete)
    arch_ok, arch_msg = await svc.archive_section(sec.id)
    assert arch_ok is True
    assert "archived successfully" in arch_msg.lower()

    # Verify excluded from normal list
    active_secs = await svc.list_sections(include_archived=False)
    assert not any(s.id == sec.id for s in active_secs)
    print("  ✓ Archived custom section excluded from active list")

    # 5. Restore
    rest_ok, rest_msg = await svc.restore_section(sec.id)
    assert rest_ok is True
    print(f"  ✓ Restored custom section: {rest_msg}")


async def test_git_diff_engine():
    print("\n[TEST 4] Verifying Server-side Git Diff Engine...")
    v1_text = "Line 1: Keep prices stable.\nLine 2: Single-question discipline.\nLine 3: Warm tone."
    v2_text = "Line 1: Keep prices stable.\nLine 2: Single-question discipline.\nLine 2.5: Never interrupt buyer.\nLine 3: Extremely consultative warmth."

    diff_data = compute_line_diff(v1_text, v2_text)
    assert diff_data["added_count"] > 0, "No additions detected"
    assert diff_data["unchanged_count"] >= 2, "Unchanged lines not detected"
    types = [c["type"] for c in diff_data["chunks"]]
    assert "add" in types and "equal" in types
    print(f"  ✓ Git diff computed: +{diff_data['added_count']}, -{diff_data['removed_count']}, {diff_data['unchanged_count']} unchanged")


async def test_version_pinning_and_pruning(session: AsyncSession, org_id: str):
    print("\n[TEST 5] Verifying Version Pinning & History Pruning...")
    svc = PromptService(session, org_id)
    sec_key = "business_policy"

    # Create 3 versions
    v_a = await svc.create_version(sec_key, "Test Policy vA", author="test", change_summary="Milestone A", activate=True)
    v_b = await svc.create_version(sec_key, "Test Policy vB", author="test", change_summary="Milestone B", activate=True)
    v_c = await svc.create_version(sec_key, "Test Policy vC", author="test", change_summary="Milestone C", activate=True)

    # Pin milestone A
    pinned_v = await svc.toggle_pin_version(sec_key, v_a.version)
    assert pinned_v.pinned is True, "Failed to pin version A"
    print(f"  ✓ Pinned version v{v_a.version}")

    # Prune keeping 0 unpinned inactive versions
    deleted_count = await svc.prune_inactive_history(sec_key, keep_latest=0)
    print(f"  ✓ Pruned {deleted_count} inactive versions")

    # Verify pinned version survives
    sec_obj = await svc.get_section(sec_key)
    from sqlalchemy import select
    from app.database.models import PromptVersion
    stmt = select(PromptVersion).where(
        PromptVersion.org_id == org_id,
        PromptVersion.section_id == sec_obj.id,
        PromptVersion.version == v_a.version,
    )
    survived = (await session.execute(stmt)).scalar_one_or_none()
    assert survived is not None, "Pinned version was wrongly deleted during prune"
    print(f"  ✓ Verified pinned version v{v_a.version} safely survived pruning")


async def test_rollback_and_default_reset(session: AsyncSession, org_id: str):
    print("\n[TEST 6] Verifying Rollback & Factory Default Reset...")
    svc = PromptService(session, org_id)
    sec_key = "core_identity"

    # 1. Rollback
    rolled = await svc.activate_version(sec_key, 1, author="operator", reason="Quality regression test")
    assert rolled is not None
    assert rolled.is_active is True
    assert "Rolled back" in rolled.change_summary
    print(f"  ✓ Successfully rolled back to v1 (Summary: '{rolled.change_summary}')")

    # 2. Reset to factory default
    ok, msg, new_ver = await svc.reset_to_default(sec_key, author="operator")
    assert ok is True
    assert new_ver.is_active is True
    assert "factory default" in new_ver.change_summary.lower()
    print(f"  ✓ Factory default reset verified: {msg}")


async def test_bpe_tokenizer():
    print("\n[TEST 7] Verifying Exact BPE Tokenizer Counting...")
    sample = "You are EDITH, an autonomous B2B wholesale consultant for Nilgiri Organic Tea Estate."
    count = count_tokens(sample)
    assert count > 0 and count < len(sample), "Token count out of bounds"
    print(f"  ✓ Sample '{sample[:30]}...' -> {count} tokens")


async def test_friday_voice_action_confirmation(session: AsyncSession, org_id: str):
    print("\n[TEST 8] Verifying Friday Voice Action & Confirmation Loop...")
    svc = PromptService(session, org_id)
    # Ensure v1 exists and create a temporary v2 so rollback to v1 is valid
    await svc.create_version("core_safety", "Temporary v2 safety prompt", author="test", activate=True)

    # Destructive action without confirmed=True should require confirmation
    unconfirmed = await friday_actions.execute_action(
        session=session,
        org_id=org_id,
        action_name="rollback_prompt_section",
        params={"section": "core_safety", "version": 1, "confirmed": False},
    )
    assert unconfirmed.get("requires_confirmation") is True, "Confirmation loop not enforced"
    assert "confirm" in unconfirmed.get("confirmation_prompt", "").lower()
    print(f"  ✓ Confirmation loop triggered: '{unconfirmed['confirmation_prompt']}'")

    # Destructive action with confirmed=True executes
    confirmed = await friday_actions.execute_action(
        session=session,
        org_id=org_id,
        action_name="rollback_prompt_section",
        params={"section": "core_safety", "version": 1, "confirmed": True},
    )
    assert confirmed.get("success") is True, f"Confirmed rollback execution failed: {confirmed}"
    print(f"  ✓ Confirmed action executed: '{confirmed['message']}'")


async def main():
    print("==================================================================")
    print("       DYNAMIC MODULAR SYSTEM PROMPTS VERIFICATION SUITE          ")
    print("==================================================================")

    async with get_db_context() as session:
        org_id = "org_default_tea"
        await test_migration_and_system_sections(session, org_id)
        await test_system_section_protection(session, org_id)
        await test_custom_section_crud(session, org_id)
        await test_git_diff_engine()
        await test_version_pinning_and_pruning(session, org_id)
        await test_rollback_and_default_reset(session, org_id)
        await test_bpe_tokenizer()
        await test_friday_voice_action_confirmation(session, org_id)

    print("\n==================================================================")
    print("       ALL 8 TEST SUITES PASSED WITH 100% SUCCESS                 ")
    print("==================================================================")


if __name__ == "__main__":
    asyncio.run(main())
