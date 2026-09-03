"""
Proposals API: endpoints to preview, customize, and dispatch personalized B2B proposals to imported leads.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database.models import Lead
from app.database.session import get_db
from app.leads.proposal_generator import ProposalGenerator

router = APIRouter(prefix="/proposals", tags=["Proposals"])


class SendProposalRequest(BaseModel):
    custom_message: Optional[str] = None


class BatchSendProposalsRequest(BaseModel):
    lead_ids: List[str]


@router.get("/preview/{lead_id}")
async def preview_proposal(
    lead_id: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Previews the customized proposal and 24-48h follow-up message for a lead.
    """
    lead = await session.get(Lead, lead_id)
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    bundle = ProposalGenerator.craft_proposal(lead)
    return {
        "lead_id": lead.id,
        "name": lead.name,
        "company_name": lead.company_name,
        "phone": lead.phone,
        "city": lead.city,
        "proposal_text": bundle["proposal_text"],
        "followup_text": bundle["followup_text"],
    }


@router.post("/send/{lead_id}")
async def send_proposal(
    lead_id: str,
    req: SendProposalRequest = SendProposalRequest(),
    session: AsyncSession = Depends(get_db),
):
    """
    Sends the tailored B2B proposal to the lead via WhatsApp and schedules follow-up.
    """
    generator = ProposalGenerator(session, settings.DEFAULT_ORG_ID)
    try:
        res = await generator.send_proposal_to_lead(lead_id, custom_message=req.custom_message)
        return {"status": "success", "data": res}
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to dispatch proposal: {e}")


@router.post("/batch_send")
async def batch_send_proposals(
    req: BatchSendProposalsRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Dispatches tailored proposals to multiple selected leads in batch.
    """
    generator = ProposalGenerator(session, settings.DEFAULT_ORG_ID)
    results: List[Dict[str, Any]] = []

    for lead_id in req.lead_ids:
        try:
            res = await generator.send_proposal_to_lead(lead_id)
            results.append({"lead_id": lead_id, "status": "sent", "details": res})
        except Exception as e:
            results.append({"lead_id": lead_id, "status": "failed", "error": str(e)})

    return {"total": len(req.lead_ids), "results": results}
