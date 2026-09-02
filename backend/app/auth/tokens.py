"""
JWT Access Token creation and validation for operator authentication.
"""

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional
import jwt
from app.config import settings

ALGORITHM = "HS256"


def create_access_token(
    subject: str,
    org_id: str,
    role: str = "operator",
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Generates signed JWT bearer token."""
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(hours=24))
    payload: Dict[str, Any] = {
        "sub": subject,
        "org_id": org_id,
        "role": role,
        "exp": expire,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Decodes and validates a signed JWT token."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except Exception:
        return None
