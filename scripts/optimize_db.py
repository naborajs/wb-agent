"""
Database Optimization & Maintenance Script.
Executes PRAGMA integrity_check, PRAGMA optimize, and VACUUM on SQLite database instances.
Reports file size savings before and after optimization.
"""

import os
import sys
import sqlite3
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def optimize_database(db_path: Path):
    if not db_path.exists():
        print(f"[SKIP] Database not found: {db_path}")
        return

    before_size = db_path.stat().st_size
    print(f"\n[*] Optimizing database: {db_path.resolve()}")
    print(f"    Initial size: {before_size / 1024:.2f} KB")

    conn = sqlite3.connect(str(db_path))
    cur = conn.cursor()

    # 1. Quick integrity check
    cur.execute("PRAGMA integrity_check")
    result = cur.fetchone()[0]
    if result != "ok":
        print(f"[ERROR] Integrity check failed: {result}")
        conn.close()
        return
    print(f"[OK] Integrity check passed: {result}")

    # 2. Run PRAGMA optimize
    cur.execute("PRAGMA optimize")
    print("[OK] Executed PRAGMA optimize")

    # 3. VACUUM to reclaim space and rebuild indices
    conn.close()
    conn_vac = sqlite3.connect(str(db_path), isolation_level=None)
    conn_vac.execute("VACUUM")
    conn_vac.close()
    print("[OK] Executed VACUUM")

    after_size = db_path.stat().st_size
    saved_bytes = before_size - after_size
    print(f"    Final size: {after_size / 1024:.2f} KB (Saved: {saved_bytes / 1024:.2f} KB)")


def main():
    print("=" * 60)
    print("  WB-Agent Database Optimization Utility")
    print("=" * 60)
    repo_root = Path(__file__).resolve().parents[1]
    
    # Target primary and backend databases
    dbs = [
        repo_root / "wb_agent.db",
        repo_root / "backend" / "wb_agent.db",
    ]

    for db in dbs:
        optimize_database(db)

    print("\n" + "=" * 60)
    print("[PASS] Database optimization complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
