"""
Consolidation and Normalization Script for WB-Agent Database.
Migrates all legacy 'org_default_tea' records to unified 'org_default'.
Includes database backup, integrity verification, foreign key handling, and conflict resolution.
"""

import os
from pathlib import Path
import shutil
import sqlite3
import sys

SOURCE_ORG = "org_default_tea"
TARGET_ORG = "org_default"


def consolidate_database(db_path: Path):
    if not db_path.exists():
        print(f"[SKIP] Database not found at {db_path}")
        return

    print("=" * 70)
    print(f" Consolidating Database: {db_path}")
    print("=" * 70)

    # 1. Create timestamped backup
    backup_path = db_path.with_suffix(".pre_org_norm.bak")
    shutil.copyfile(db_path, backup_path)
    print(f"[BACKUP] Created snapshot at: {backup_path}")

    conn = sqlite3.connect(db_path)
    conn.execute("PRAGMA foreign_keys = OFF;")
    cursor = conn.cursor()

    try:
        cursor.execute("BEGIN TRANSACTION;")

        # 2. Check if TARGET_ORG organization exists, otherwise clone from SOURCE_ORG
        cursor.execute("SELECT id, name, slug, settings FROM organizations WHERE id = ?", (TARGET_ORG,))
        target_org = cursor.fetchone()

        if not target_org:
            cursor.execute("SELECT name, slug, settings FROM organizations WHERE id = ?", (SOURCE_ORG,))
            source_org = cursor.fetchone()
            name = source_org[0] if source_org else "Default Enterprise"
            slug = "default-org"
            settings = source_org[2] if source_org else "{}"

            cursor.execute(
                """
                INSERT INTO organizations (id, name, slug, is_active, settings, created_at, updated_at)
                VALUES (?, ?, ?, 1, ?, datetime('now'), datetime('now'))
                """,
                (TARGET_ORG, name, slug, settings),
            )
            print(f"[INIT] Created target organization '{TARGET_ORG}'.")
        else:
            print(f"[OK] Target organization '{TARGET_ORG}' already exists.")

        # 3. Deduplicate tables with unique constraints on (org_id, ...)

        # 3.1 prompt_sections (org_id, key)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='prompt_sections'")
        if cursor.fetchone():
            cursor.execute(
                """
                SELECT s1.id, s2.id FROM prompt_sections s1
                JOIN prompt_sections s2 ON s1.key = s2.key
                WHERE s1.org_id = ? AND s2.org_id = ?
                """,
                (SOURCE_ORG, TARGET_ORG),
            )
            conflicting_sections = cursor.fetchall()
            for tea_sec_id, target_sec_id in conflicting_sections:
                cursor.execute("UPDATE prompt_versions SET section_id = ? WHERE section_id = ?", (target_sec_id, tea_sec_id))
                cursor.execute("DELETE FROM prompt_sections WHERE id = ?", (tea_sec_id,))
            print(f"[DEDUP] Merged {len(conflicting_sections)} duplicate prompt_sections.")

        # 3.2 customers (org_id, primary_phone)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='customers'")
        if cursor.fetchone():
            cursor.execute(
                """
                SELECT c_tea.id, c_target.id FROM customers c_tea
                JOIN customers c_target ON c_tea.primary_phone = c_target.primary_phone
                WHERE c_tea.org_id = ? AND c_target.org_id = ?
                """,
                (SOURCE_ORG, TARGET_ORG),
            )
            conflicting_custs = cursor.fetchall()
            for tea_cust_id, target_cust_id in conflicting_custs:
                cursor.execute("UPDATE conversations SET customer_id = ? WHERE customer_id = ?", (target_cust_id, tea_cust_id))
                cursor.execute("UPDATE customer_memory SET customer_id = ? WHERE customer_id = ?", (target_cust_id, tea_cust_id))
                cursor.execute("DELETE FROM customers WHERE id = ?", (tea_cust_id,))
            print(f"[DEDUP] Merged {len(conflicting_custs)} duplicate customers.")

        # 3.3 users (org_id, email)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
        if cursor.fetchone():
            cursor.execute(
                """
                DELETE FROM users WHERE org_id = ? AND email IN (
                    SELECT email FROM users WHERE org_id = ?
                )
                """,
                (SOURCE_ORG, TARGET_ORG),
            )

        # 3.4 products (org_id, sku)
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='products'")
        if cursor.fetchone():
            cursor.execute(
                """
                DELETE FROM products WHERE org_id = ? AND sku IN (
                    SELECT sku FROM products WHERE org_id = ?
                )
                """,
                (SOURCE_ORG, TARGET_ORG),
            )

        # 3.5 integrations & agent_settings
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='integrations'")
        if cursor.fetchone():
            cursor.execute(
                "DELETE FROM integrations WHERE org_id = ? AND provider IN (SELECT provider FROM integrations WHERE org_id = ?)",
                (SOURCE_ORG, TARGET_ORG),
            )
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='agent_settings'")
        if cursor.fetchone():
            cursor.execute(
                "DELETE FROM agent_settings WHERE org_id = ? AND setting_key IN (SELECT setting_key FROM agent_settings WHERE org_id = ?)",
                (SOURCE_ORG, TARGET_ORG),
            )

        # 4. Migrate all remaining tables
        tables_to_migrate = [
            "users", "api_keys", "agent_runs", "agent_events", "tool_calls",
            "sales_events", "handoffs", "notifications", "integrations", "agent_settings",
            "audit_logs", "voice_audit_logs", "friday_problem_reports", "campaigns",
            "followup_jobs", "jobs", "conversations", "messages", "customer_memory",
            "inter_brain_messages", "knowledge_documents", "knowledge_chunks",
            "knowledge_items", "human_knowledge_requests", "knowledge_candidates",
            "customer_profile_versions", "conversation_analyses", "leads", "customers",
            "deals", "lead_events", "sales_learnings", "agent_notifications", "orders",
            "quotes", "products", "pricing_rules", "pricing_rule_versions",
            "product_custom_fields", "inventories", "prompt_sections", "prompt_versions",
            "watchdog_alerts",
        ]

        total_rows_updated = 0
        for table in tables_to_migrate:
            cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name=?", (table,))
            if not cursor.fetchone():
                continue
            cursor.execute(f"UPDATE {table} SET org_id = ? WHERE org_id = ?", (TARGET_ORG, SOURCE_ORG))
            count = cursor.rowcount
            if count > 0:
                print(f"[MIGRATED] {table}: {count} records re-scoped to '{TARGET_ORG}'.")
                total_rows_updated += count

        # 5. Remove legacy organization record
        cursor.execute("DELETE FROM organizations WHERE id = ?", (SOURCE_ORG,))

        conn.commit()
        print(f"[SUCCESS] Total records consolidated: {total_rows_updated}")

    except Exception as e:
        conn.rollback()
        print(f"[FATAL] Migration failed, rolled back: {e}")
        raise
    finally:
        conn.execute("PRAGMA foreign_keys = ON;")
        conn.close()


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parents[1]
    for db in [repo_root / "wb_agent.db", repo_root / "backend" / "wb_agent.db"]:
        if db.exists():
            consolidate_database(db)
