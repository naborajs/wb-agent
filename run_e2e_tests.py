"""
Standalone E2E Test Suite Runner for EDITH Autonomous Sales Platform Enterprise Upgrades.
Executes all 60 tests across Tier 1, Tier 2, Tier 3, and Tier 4.
"""

import os
import sys
from pathlib import Path
import pytest


def main():
    root_dir = Path(__file__).resolve().parent
    backend_dir = root_dir / "backend"
    if str(backend_dir) not in sys.path:
        sys.path.insert(0, str(backend_dir))
    if str(root_dir) not in sys.path:
        sys.path.insert(0, str(root_dir))

    e2e_test_dir = backend_dir / "tests" / "e2e"
    print("=" * 70)
    print("Starting EDITH Enterprise E2E Test Suite (Tiers 1-4)")
    print(f"Target Directory: {e2e_test_dir}")
    print("=" * 70)

    pytest_args = [
        str(e2e_test_dir),
        "-v",
        "--tb=short",
        "-o",
        f"pythonpath={backend_dir}",
    ]

    exit_code = pytest.main(pytest_args)
    if exit_code == 0:
        print("\n" + "=" * 70)
        print("ALL 60 E2E TESTS PASSED (100% SUCCESS RATE)")
        print("=" * 70)
    else:
        print("\n" + "!" * 70)
        print(f"TEST SUITE FAILED WITH EXIT CODE {exit_code}")
        print("!" * 70)

    return exit_code


if __name__ == "__main__":
    sys.exit(main())
