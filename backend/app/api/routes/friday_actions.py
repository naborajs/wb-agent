"""
Friday Action API routes.
Exposes every actionable UI and operational system capability as a callable action
that Friday can invoke over the Inter-Brain Bus or via API, with full audit logging.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.session import get_db
from app.services import friday_actions
from app.utils.logging import logger

router = APIRouter(prefix="/friday/actions", tags=["Friday Actions"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class ActionSummary(BaseModel):
    action: str = Field(..., description="Unique action name")
    description: str = Field(..., description="What the action does")
    params: Dict[str, str] = Field(..., description="Expected parameters and their types")
    effect: str = Field(..., description="System changes or side effects produced")


class ActionDescribeResponse(BaseModel):
    found: bool
    action: Optional[str] = None
    description: Optional[str] = None
    params: Optional[Dict[str, str]] = None
    effect: Optional[str] = None
    available_actions: Optional[List[str]] = None


class ActionExecuteRequest(BaseModel):
    params: Dict[str, Any] = Field(default_factory=dict, description="Parameters for the action")


class ActionExecuteResponse(BaseModel):
    success: bool = Field(..., description="Whether the action succeeded")
    message: str = Field(..., description="Human-readable outcome or explanation")
    data: Optional[Dict[str, Any]] = Field(None, description="Action-specific output details")


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("", response_model=List[ActionSummary], summary="List all operational actions Friday can invoke")
async def list_actions():
    """
    Returns the complete registry of operational actions accessible to Friday.
    Every action is documented with its parameters and system effects.
    """
    return friday_actions.list_all_actions()


@router.get("/{action_name}/describe", response_model=ActionDescribeResponse, summary="Describe what a specific action does")
async def describe_action(action_name: str):
    """
    Returns detailed documentation for a specific action, including what parameters it accepts
    and what system state it modifies when invoked.
    """
    result = await friday_actions.describe_action(action_name)
    if not result.get("found"):
        raise HTTPException(
            status_code=404,
            detail=f"Action '{action_name}' not found. Available actions: {result.get('available_actions', [])}",
        )
    return result


@router.post("/{action_name}", response_model=ActionExecuteResponse, summary="Execute an operational action as Friday")
async def execute_action(
    action_name: str,
    payload: ActionExecuteRequest = ActionExecuteRequest(),
    session: AsyncSession = Depends(get_db),
):
    """
    Executes an action from the Friday Action Registry.
    Every execution is logged with actor='friday_agent' to AuditLog and AgentNotification.
    """
    if action_name not in friday_actions.FRIDAY_ACTION_REGISTRY:
        raise HTTPException(
            status_code=404,
            detail=f"Action '{action_name}' does not exist. Use GET /friday/actions to see available actions.",
        )

    result = await friday_actions.execute_action(
        session=session,
        org_id=settings.DEFAULT_ORG_ID,
        action_name=action_name,
        params=payload.params,
    )

    return ActionExecuteResponse(
        success=result.get("success", False),
        message=result.get("message", ""),
        data={k: v for k, v in result.items() if k not in ["success", "message"]},
    )
