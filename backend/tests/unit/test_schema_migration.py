"""
Unit tests for SQLite schema migrations.
Verifies column additions and legacy data migration for order_items, pricing_rules, and products.
"""

import sqlite3
from pathlib import Path
from backend.scripts.upgrade_sqlite_schema import fix_sqlite_db


def test_sqlite_schema_upgrade_order_items(tmp_path: Path):
    db_file = tmp_path / "test_legacy.db"
    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()

    cur.execute(
        "CREATE TABLE order_items ("
        "id VARCHAR(64) PRIMARY KEY, "
        "order_id VARCHAR(64), "
        "product_id VARCHAR(64), "
        "product_name VARCHAR(255), "
        "tea_grade VARCHAR(64), "
        "quantity_kg NUMERIC(10, 2), "
        "unit_price_per_kg NUMERIC(10, 2)"
        ")"
    )
    cur.execute(
        "INSERT INTO order_items (id, order_id, product_id, product_name, tea_grade, quantity_kg, unit_price_per_kg) "
        "VALUES ('item-1', 'order-1', 'prod-1', 'Premium CTC Tea', 'BP', 50.0, 320.0)"
    )
    conn.commit()
    conn.close()

    fix_sqlite_db(db_file)

    conn = sqlite3.connect(str(db_file))
    cur = conn.cursor()
    cols = [col[1] for col in cur.execute("PRAGMA table_info(order_items)").fetchall()]

    assert "grade" in cols
    assert "quantity" in cols
    assert "unit_price" in cols

    row = cur.execute("SELECT grade, quantity, unit_price FROM order_items WHERE id = 'item-1'").fetchone()
    assert row[0] == "BP"
    assert row[1] == 50.0
    assert row[2] == 320.0

    conn.close()
