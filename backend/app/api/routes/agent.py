"""
AI Agent execution and simulation API endpoints (Section 58 & 87).
"""

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from app.agent.orchestrator import AgentOrchestrator
from app.config import settings
from app.conversations.service import ConversationService
from app.database.models import Customer
from app.database.session import get_db
from app.schemas.agent import AgentTurnRequest, AgentTurnResponse

router = APIRouter(prefix="/agent", tags=["Agent"])


class SimulationRequest(BaseModel):
    persona_name: str
    turns: List[str]
    business_name: str = "Simulated Cafe"
    phone: str = "+919876543210"


@router.post("/turn", response_model=AgentTurnResponse)
async def execute_agent_turn(req: AgentTurnRequest, session: AsyncSession = Depends(get_db)):
    """Executes a single conversational agent turn."""
    orchestrator = AgentOrchestrator(session, settings.DEFAULT_ORG_ID)
    try:
        resp = await orchestrator.process_turn(
            conversation_id=req.conversation_id,
            inbound_message=req.inbound_message,
        )
        return resp
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/simulate")
async def run_agent_simulation(req: SimulationRequest, session: AsyncSession = Depends(get_db)):
    """Runs a multi-turn simulation across a persona to evaluate decision accuracy."""
    org_id = settings.DEFAULT_ORG_ID
    conv_svc = ConversationService(session, org_id)

    # 1. Create temporary customer and conversation
    cust = Customer(
        org_id=org_id,
        primary_phone=req.phone,
        name=req.persona_name,
        company_name=req.business_name,
        company_type="Cafe",
        preferred_language="English",
        opt_in_status=True,
    )
    session.add(cust)
    await session.commit()

    conv = await conv_svc.get_or_create_conversation(cust.id, channel="simulator", channel_id=req.phone)

    orchestrator = AgentOrchestrator(session, org_id)
    history: List[Dict[str, Any]] = []

    for turn_text in req.turns:
        resp = await orchestrator.process_turn(conv.id, turn_text)
        history.append({
            "inbound": turn_text,
            "reply": resp.reply_text,
            "stage": resp.sales_stage_after,
            "score": resp.lead_score_after,
            "intent": resp.decision.intent,
            "action": resp.decision.recommended_action,
            "handoff": resp.handoff_created,
        })

    return {
        "persona": req.persona_name,
        "turns_completed": len(history),
        "final_stage": history[-1]["stage"] if history else "NEW",
        "final_score": history[-1]["score"] if history else 10,
        "history": history,
    }
