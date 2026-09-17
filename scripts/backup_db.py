"""
Database Backup & Snapshot Utility.
Uses SQLite online backup API (conn.backup) to take consistent, non-blocking snapshots
of the database into the backups/ directory. Supports retention pruning.
"""

import os
import sys
import sqlite3
import datetime
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def backup_database(db_path: Path, backup_dir: Path, max_retentions: int = 10) -> Path | None:
    if not db_path.exists():
        print(f"[SKIP] Database not found: {db_path}")
        return None

    backup_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"{db_path.stem}_backup_{timestamp}.db"

    print(f"\n[*] Creating snapshot for {db_path.name}...")
    source_conn = sqlite3.connect(str(db_path))
    dest_conn = sqlite3.connect(str(backup_file))

    try:
        # SQLite online backup API ensures transaction safety while server runs
        source_conn.backup(dest_conn)
        dest_conn.close()
        source_conn.close()
        print(f"[OK] Backup snapshot created: {backup_file.name} ({backup_file.stat().st_size / 1024:.1f} KB)")

        # Verify backup integrity
        verify_conn = sqlite3.connect(str(backup_file))
        res = verify_conn.execute("PRAGMA quick_check").fetchone()[0]
        verify_conn.close()
        if res != "ok":
            print(f"[ERROR] Backup integrity check failed: {res}")
            return None
        print(f"[OK] Verified backup integrity: {res}")

        # Prune old backups exceeding retention
        existing_backups = sorted(backup_dir.glob(f"{db_path.stem}_backup_*.db"), key=os.path.getmtime)
        if len(existing_backups) > max_retentions:
            for old_file in existing_backups[:-max_retentions]:
                old_file.unlink()
                print(f"[PRUNE] Removed old backup: {old_file.name}")

        return backup_file
    except Exception as e:
        print(f"[ERROR] Failed to backup {db_path.name}: {e}")
        return None


def main():
    print("=" * 60)
    print("  WB-Agent Database Snapshot & Backup Utility")
    print("=" * 60)
    repo_root = Path(__file__).resolve().parents[1]
    backup_dir = repo_root / "backups" / "db"
    
    db_file = repo_root / "wb_agent.db"
    result = backup_database(db_file, backup_dir)

    print("\n" + "=" * 60)
    if result:
        print(f"[PASS] Snapshot successfully completed at {result}")
    else:
        print("[WARN] Backup completed with warnings.")
    print("=" * 60)


if __name__ == "__main__":
    main()
