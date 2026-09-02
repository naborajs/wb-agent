"""
FastAPI Request Dependencies: DB sessions, JWT user authentication, and API key scopes.
"""

from typing import List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.auth.api_keys import hash_api_key
from app.auth.tokens import decode_access_token
from app.database.models import ApiKey, User
from app.database.session import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/token", auto_error=False)


async def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_db),
) -> Optional[User]:
    """
    Validates JWT bearer token and retrieves authenticated User entity.
    """
    if not token:
        return None

    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_id = payload["sub"]
    user = await session.get(User, user_id)
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is inactive or not found.",
        )
    return user


async def require_auth(
    user: Optional[User] = Depends(get_current_user),
) -> User:
    """Enforces that an active authenticated user is present."""
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def verify_api_key(
    x_api_key: Optional[str] = Header(None),
    session: AsyncSession = Depends(get_db),
) -> Optional[ApiKey]:
    """Validates X-API-Key header against database records."""
    if not x_api_key:
        return None

    key_hash = hash_api_key(x_api_key)
    stmt = select(ApiKey).where(ApiKey.key_hash == key_hash, ApiKey.is_revoked == False)
    res = await session.execute(stmt)
    key_obj = res.scalar_one_or_none()
    return key_obj
