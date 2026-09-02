"""
Audit Logging Service: records immutable trails of operator and system actions (Section 77).
"""

from typing import Any, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import AuditLog
from app.utils.logging import logger


class AuditLogService:
    """
    Appends audit log records for administrative and operator actions.
    """

    def __init__(self, session: AsyncSession, org_id: str):
        self.session = session
        self.org_id = org_id

    async def log_action(
        self,
        action: str,
        resource_type: str,
        resource_id: Optional[str] = None,
        user_id: Optional[str] = None,
        changes: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
    ) -> AuditLog:
        """
        Records an audit entry.
        """
        entry = AuditLog(
            org_id=self.org_id,
            user_id=user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            changes=changes or {},
            ip_address=ip_address,
        )
        self.session.add(entry)
        await self.session.commit()
        logger.info(f"AuditLog [{action}]: {resource_type}:{resource_id} by user '{user_id}'")
        return entry
