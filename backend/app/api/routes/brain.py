"""
API Endpoints for Dual-Brain Architecture: FRIDAY (Google Gemini) & EDITH (NVIDIA NIM).
Exposes endpoints for:
1. Conversing directly with Friday (Web Assistant & Executive Copilot)
2. Task delegation to EDITH with independent commercial evaluation and refusal rights
3. Autonomous debriefing from EDITH to Friday (emotional reflections, feature gaps)
4. Inter-Brain thought and dialogue history retrieval
5. Real-time dual-brain status and telemetry
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.brain import inter_brain_bus
from app.config import settings
from app.database.session import get_db
from app.utils.logging import logger

router = APIRouter(prefix="/brain", tags=["Dual-Brain System"])


class BrainChatRequest(BaseModel):
    message: str = Field(..., min_length=1, description="Operator message to Friday")
    history: Optional[List[Dict[str, str]]] = Field(default_factory=list, description="Recent conversation turns")


class BrainChatResponse(BaseModel):
    speaker: str = "Friday"
    model: str
    reply: str
    consulted_edith: bool = False
    edith_verdict: Optional[Dict[str, Any]] = None


class BrainTaskRequest(BaseModel):
    task: str = Field(..., min_length=2, description="Task instruction for EDITH")
    target_phone: Optional[str] = Field(None, description="Optional recipient phone number")
    requested_discount: Optional[float] = Field(None, description="Optional discount percentage")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")


class BrainTaskResponse(BaseModel):
    task_id: str
    decision: str  # ACCEPTED or DENIED
    reasoning: str
    details: Dict[str, Any]
    target_phone: Optional[str] = None
    created_at: Optional[str] = None


class BrainDebriefRequest(BaseModel):
    category: str = Field(..., description="'RUDE_CUSTOMER', 'FEATURE_GAP', 'KNOWLEDGE_GAP', 'STRATEGIC_OBSERVATION'")
    details: Dict[str, Any] = Field(default_factory=dict, description="Contextual facts, phone, customer message, or topic")


@router.post("/chat", response_model=BrainChatResponse)
async def chat_with_friday(
    req: BrainChatRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Chat directly with Friday, your personal executive web assistant.
    Friday answers queries, explains platform operations, and coordinates with EDITH
    when sales tasks or WhatsApp dispatches are requested.
    """
    org_id = settings.DEFAULT_ORG_ID
    result = await inter_brain_bus.friday.chat(
        user_message=req.message,
        session=session,
        org_id=org_id,
        history=req.history,
    )
    return BrainChatResponse(**result)


@router.post("/request-edith", response_model=BrainTaskResponse)
async def request_edith_task(
    req: BrainTaskRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Delegates a commercial sales or WhatsApp outreach task to EDITH.
    EDITH independently evaluates the request against pricing rules, maximum autonomous discounts,
    and anti-spam cooling-off periods, and autonomously ACCEPTS or DENIES the request with a justified rationale.
    """
    org_id = settings.DEFAULT_ORG_ID
    result = await inter_brain_bus.dispatch_task(
        session=session,
        org_id=org_id,
        task_text=req.task,
        target_phone=req.target_phone,
        requested_discount=req.requested_discount,
        metadata=req.metadata,
    )
    return BrainTaskResponse(**result)


@router.post("/edith-debrief")
async def post_edith_debrief(
    req: BrainDebriefRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Endpoint for EDITH to autonomously post an emotional debrief (e.g. rude customer interaction)
    or feature gap alert (e.g. missing knowledge document) to Friday.
    """
    org_id = settings.DEFAULT_ORG_ID
    result = await inter_brain_bus.post_edith_debrief(
        session=session,
        org_id=org_id,
        category=req.category,
        details=req.details,
    )
    return {
        "success": True,
        "debrief": result,
    }


@router.get("/dialogues")
async def get_dialogue_history(
    limit: int = Query(50, ge=1, le=200),
    sender: Optional[str] = Query(None, description="Filter by sender brain: 'FRIDAY' or 'EDITH'"),
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieves the chronological audit log of thoughts, requests, refusals, and debriefs
    exchanged between Friday and EDITH across the Inter-Brain Bus.
    """
    org_id = settings.DEFAULT_ORG_ID
    dialogues = await inter_brain_bus.get_dialogue_history(
        session=session,
        org_id=org_id,
        limit=limit,
        sender_brain=sender,
    )
    return {
        "count": len(dialogues),
        "dialogues": dialogues,
    }


@router.get("/status")
async def get_brain_status():
    """
    Returns live architectural telemetry and operational identity for both AI brains.
    """
    return {
        "friday": {
            "name": "Friday",
            "provider": "Google Gemini",
            "model": "gemini-2.5-flash",
            "role": "Personal AI Web Assistant & Direct Executive Copilot",
            "responsibilities": [
                "In-browser voice assistant and DOM execution",
                "Executive operations, settings, and catalog navigation",
                "Inter-brain collaboration and operator explanations",
            ],
            "active": True,
        },
        "edith": {
            "name": "EDITH",
            "provider": "NVIDIA NIM",
            "model": "meta/llama-3.3-70b-instruct / nemotron-3-ultra-550b",
            "role": "Autonomous B2B Commercial Sales & Negotiation Agent",
            "responsibilities": [
                "WhatsApp customer conversations and consultative discovery",
                "Deterministic pricing, volume tiers, and invoice dispatch",
                "Independent task evaluation, policy enforcement, and refusal rights",
                "Proactive emotional debriefing and feature gap reporting",
            ],
            "active": True,
        },
        "inter_brain_bus": {
            "status": "operational",
            "protocol": "InterBrainMessage (Persistent DB + Realtime WebSocket)",
            "independent_agency_enabled": True,
        },
    }
