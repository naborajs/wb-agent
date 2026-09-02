"""
API Key generation, hashing, and permission scoping (Section 59).
"""

import hashlib
import secrets
from typing import Tuple


def generate_api_key(environment: str = "live") -> Tuple[str, str, str]:
    """
    Generates a secure cryptographically random API key.

    Returns:
        (raw_key: str, prefix: str, key_hash: str)
    """
    token = secrets.token_hex(24)
    raw_key = f"wb_{environment}_{token}"
    prefix = raw_key[:12]
    key_hash = hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
    return raw_key, prefix, key_hash


def hash_api_key(raw_key: str) -> str:
    """Computes SHA-256 hash of raw API key for database lookup."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()
