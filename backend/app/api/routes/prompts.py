"""
Modular System Prompt Management API (Sections 66, 67, 68).
Provides endpoints to view, update, test, and rollback prompt sections.
"""

from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.prompts import DEFAULT_PROMPT_SECTIONS, PromptService
from app.config import settings
from app.database.models import PromptVersion
from app.database.session import get_db

router = APIRouter(prefix="/prompts", tags=["Prompts"])


class PromptUpdateRequest(BaseModel):
    content: str = Field(..., min_length=10)
    change_summary: Optional[str] = None
    author: Optional[str] = "operator"
    rating_score: Optional[int] = None
    rating_grade: Optional[str] = None
    rating_breakdown: Optional[Dict[str, int]] = None
    model_used: Optional[str] = None


class PromptAIOptimizeRequest(BaseModel):
    user_intent: str = Field(..., min_length=3, description="Plain English instruction or goal for what to change or improve")
    current_prompt: Optional[str] = Field(None, description="Optional base prompt text; if omitted, active section content is used")


@router.get("")
async def get_all_prompt_sections(session: AsyncSession = Depends(get_db)):
    """Returns all 5 modular prompt sections and their active content."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sections = {}
    for sec in ["core_safety", "core_identity", "business_policy", "sales_style", "business_profile"]:
        content = await prompt_svc.get_active_section(sec)
        # get version number if stored in DB
        stmt = (
            select(PromptVersion.version)
            .where(
                PromptVersion.org_id == settings.DEFAULT_ORG_ID,
                PromptVersion.section_name == sec,
                PromptVersion.is_active == True,
            )
            .limit(1)
        )
        v = (await session.execute(stmt)).scalar_one_or_none() or 1
        sections[sec] = {
            "name": sec,
            "version": v,
            "content": content,
            "is_default": content == DEFAULT_PROMPT_SECTIONS.get(sec),
        }

    return {"sections": sections}


@router.get("/{section}/history")
async def get_section_history(section: str, session: AsyncSession = Depends(get_db)):
    """Returns version history for a prompt section including quality ratings."""
    stmt = (
        select(PromptVersion)
        .where(
            PromptVersion.org_id == settings.DEFAULT_ORG_ID,
            PromptVersion.section_name == section,
        )
        .order_by(desc(PromptVersion.version))
    )
    res = await session.execute(stmt)
    versions = res.scalars().all()

    return {
        "section": section,
        "history": [
            {
                "version": v.version,
                "content": v.content,
                "is_active": v.is_active,
                "author": v.author,
                "change_summary": v.change_summary,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "rating_score": (v.test_results or {}).get("rating_score"),
                "rating_grade": (v.test_results or {}).get("rating_grade"),
                "rating_breakdown": (v.test_results or {}).get("rating_breakdown"),
                "model_used": (v.test_results or {}).get("model_used"),
            }
            for v in versions
        ],
    }


@router.post("/{section}/ai-optimize")
async def ai_optimize_prompt_section(
    section: str,
    req: PromptAIOptimizeRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Upgrades a prompt section using NemoTron 3 Ultra 550B (fallback: Super 120B).
    Takes a user's plain English intent, applies enterprise prompt engineering rules,
    and returns the optimized prompt along with a multidimensional quality rating.
    """
    if section not in DEFAULT_PROMPT_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid prompt section '{section}'")

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    base_prompt = req.current_prompt
    if not base_prompt or not base_prompt.strip():
        base_prompt = await prompt_svc.get_active_section(section)

    from app.ai.router import ai_router
    result = await ai_router.optimize_system_prompt(
        section_name=section,
        user_intent=req.user_intent,
        current_prompt=base_prompt,
        business_context={
            "business_name": settings.BUSINESS_NAME,
            "business_industry": settings.BUSINESS_INDUSTRY,
            "agent_name": settings.AGENT_NAME,
        },
    )

    return {
        "success": True,
        "section": section,
        "optimized_prompt": result.optimized_prompt,
        "rating_score": result.rating_score,
        "rating_grade": result.rating_grade,
        "rating_breakdown": result.rating_breakdown.model_dump(),
        "summary_of_changes": result.summary_of_changes,
        "model_used": result.model_used,
        "latency_ms": result.latency_ms,
    }


@router.put("/{section}")
@router.post("/{section}")
async def update_prompt_section(
    section: str,
    req: PromptUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Creates a new version of a prompt section and sets it active."""
    if section not in DEFAULT_PROMPT_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid prompt section '{section}'")

    meta = {}
    if req.rating_score is not None:
        meta["rating_score"] = req.rating_score
    if req.rating_grade is not None:
        meta["rating_grade"] = req.rating_grade
    if req.rating_breakdown is not None:
        meta["rating_breakdown"] = req.rating_breakdown
    if req.model_used is not None:
        meta["model_used"] = req.model_used

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    new_version = await prompt_svc.create_version(
        section_name=section,
        content=req.content,
        author=req.author or "operator",
        change_summary=req.change_summary,
        activate=True,
        test_results=meta,
    )

    return {
        "success": True,
        "section": section,
        "version": new_version.version,
        "is_active": new_version.is_active,
        "rating_score": meta.get("rating_score"),
        "rating_grade": meta.get("rating_grade"),
    }


@router.post("/{section}/rollback/{version}")
async def rollback_prompt_section(
    section: str,
    version: int,
    session: AsyncSession = Depends(get_db),
):
    """Rolls back the active prompt to a previous version."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    rolled_back = await prompt_svc.rollback(section_name=section, target_version=version)
    if not rolled_back:
        raise HTTPException(status_code=404, detail="Target version not found")

    return {
        "success": True,
        "section": section,
        "version": rolled_back.version,
        "is_active": rolled_back.is_active,
    }
