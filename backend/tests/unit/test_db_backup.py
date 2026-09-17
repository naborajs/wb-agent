"""
Unit test for database backup utility.
Verifies snapshot integrity and max_retentions pruning.
"""

import sqlite3
from pathlib import Path
from scripts.backup_db import backup_database


def test_backup_database_creates_intact_snapshot(tmp_path: Path):
    source_db = tmp_path / "source.db"
    backup_dir = tmp_path / "backups"

    # Create dummy source db
    conn = sqlite3.connect(str(source_db))
    conn.execute("CREATE TABLE users (id INT PRIMARY KEY, name TEXT)")
    conn.execute("INSERT INTO users VALUES (1, 'Alice'), (2, 'Bob')")
    conn.commit()
    conn.close()

    # Perform backup
    backup_file = backup_database(source_db, backup_dir, max_retentions=2)
    assert backup_file is not None
    assert backup_file.exists()

    # Check contents of backup
    b_conn = sqlite3.connect(str(backup_file))
    rows = b_conn.execute("SELECT name FROM users ORDER BY id").fetchall()
    b_conn.close()
    assert [r[0] for r in rows] == ["Alice", "Bob"]


def test_backup_database_pruning(tmp_path: Path):
    source_db = tmp_path / "source.db"
    backup_dir = tmp_path / "backups"
    backup_dir.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(source_db))
    conn.execute("CREATE TABLE t (x INT)")
    conn.commit()
    conn.close()

    # Create 3 older backup files
    (backup_dir / "source_backup_20260101_000001.db").write_text("dummy")
    (backup_dir / "source_backup_20260101_000002.db").write_text("dummy")
    (backup_dir / "source_backup_20260101_000003.db").write_text("dummy")

    # Run backup with max_retentions=2
    backup_database(source_db, backup_dir, max_retentions=2)

    remaining = list(backup_dir.glob("source_backup_*.db"))
    assert len(remaining) == 2
