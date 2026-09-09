"""
Schema migration: Add new campaign and campaign_lead columns for
scheduling, jitter, stop conditions, personalization, delivery tracking.

Safe to run multiple times — uses IF NOT EXISTS / try-except pattern.
"""

import sqlite3
import sys
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "..", "wb_agent.db")
if not os.path.exists(DB_PATH):
    DB_PATH = os.path.join(os.path.dirname(__file__), "..", "wb_agent.db")


def migrate():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}. Skipping migration (tables will be created at startup).")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # New columns for campaigns table
    campaign_columns = [
        ("lead_filter", "TEXT"),
        ("scheduling_window", "TEXT"),
        ("jitter_min_seconds", "INTEGER DEFAULT 25"),
        ("jitter_max_seconds", "INTEGER DEFAULT 45"),
        ("stop_on_replies", "INTEGER"),
        ("stop_below_response_rate", "REAL"),
        ("retry_max_attempts", "INTEGER DEFAULT 3"),
        ("retry_delay_hours", "INTEGER DEFAULT 24"),
        ("personalization_enabled", "BOOLEAN DEFAULT 0"),
        ("opt_out_handling", "VARCHAR(32) DEFAULT 'stop'"),
        ("actor", "VARCHAR(64)"),
    ]

    for col_name, col_type in campaign_columns:
        try:
            cursor.execute(f"ALTER TABLE campaigns ADD COLUMN {col_name} {col_type}")
            print(f"  Added campaigns.{col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                pass  # Already exists
            else:
                print(f"  Warning: campaigns.{col_name}: {e}")

    # New columns for campaign_leads table
    campaign_lead_columns = [
        ("delivery_status", "VARCHAR(32) DEFAULT 'pending'"),
        ("personalized_message", "TEXT"),
        ("sent_at", "DATETIME"),
        ("replied_at", "DATETIME"),
    ]

    for col_name, col_type in campaign_lead_columns:
        try:
            cursor.execute(f"ALTER TABLE campaign_leads ADD COLUMN {col_name} {col_type}")
            print(f"  Added campaign_leads.{col_name}")
        except sqlite3.OperationalError as e:
            if "duplicate column" in str(e).lower():
                pass
            else:
                print(f"  Warning: campaign_leads.{col_name}: {e}")

    # Widen initial_message_template from VARCHAR(128) to TEXT
    # SQLite doesn't enforce column types strictly, so this is a no-op in practice,
    # but we note it here for PostgreSQL migrations.

    conn.commit()
    conn.close()
    print("Campaign schema migration complete.")


if __name__ == "__main__":
    migrate()
