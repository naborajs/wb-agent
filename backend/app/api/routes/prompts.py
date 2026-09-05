"""
Modular System Prompt Management API (Sections 66, 67, 68).
Provides endpoints to view, update, test, and rollback prompt sections.
"""

import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.prompts import DEFAULT_PROMPT_SECTIONS, PromptService
from app.config import settings
from app.database.models import PromptVersion
from app.database.session import get_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompts", tags=["Prompts"])


def _set_no_cache_headers(response: Response) -> None:
    """Sets strict HTTP no-cache headers to guarantee clients never receive stale prompt data."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"


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
async def get_all_prompt_sections(response: Response, session: AsyncSession = Depends(get_db)):
    """Returns all 5 modular prompt sections and their active content with no-cache guarantee."""
    _set_no_cache_headers(response)
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sections = {}
    for sec in ["core_safety", "core_identity", "business_policy", "sales_style", "business_profile"]:
        content = await prompt_svc.get_active_section(sec)
        # get latest active version and quality rating if stored in DB
        stmt = (
            select(PromptVersion)
            .where(
                PromptVersion.org_id == settings.DEFAULT_ORG_ID,
                PromptVersion.section_name == sec,
                PromptVersion.is_active == True,
            )
            .order_by(desc(PromptVersion.version))
            .limit(1)
        )
        v_obj = (await session.execute(stmt)).scalar_one_or_none()
        sections[sec] = {
            "name": sec,
            "version": v_obj.version if v_obj else 1,
            "content": content,
            "is_default": content == DEFAULT_PROMPT_SECTIONS.get(sec),
            "author": v_obj.author if v_obj else "system",
            "rating_score": (v_obj.test_results or {}).get("rating_score") if v_obj else None,
            "rating_grade": (v_obj.test_results or {}).get("rating_grade") if v_obj else None,
            "change_summary": v_obj.change_summary if v_obj else None,
        }

    return {"sections": sections}


@router.get("/{section}")
async def get_prompt_section(section: str, response: Response, session: AsyncSession = Depends(get_db)):
    """Returns active content and version metadata for a single prompt section with no-cache guarantee."""
    _set_no_cache_headers(response)
    if section not in DEFAULT_PROMPT_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid prompt section '{section}'")

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    content = await prompt_svc.get_active_section(section)
    stmt = (
        select(PromptVersion)
        .where(
            PromptVersion.org_id == settings.DEFAULT_ORG_ID,
            PromptVersion.section_name == section,
            PromptVersion.is_active == True,
        )
        .order_by(desc(PromptVersion.version))
        .limit(1)
    )
    v_obj = (await session.execute(stmt)).scalar_one_or_none()
    return {
        "name": section,
        "version": v_obj.version if v_obj else 1,
        "content": content,
        "is_default": content == DEFAULT_PROMPT_SECTIONS.get(section),
        "author": v_obj.author if v_obj else "system",
        "rating_score": (v_obj.test_results or {}).get("rating_score") if v_obj else None,
        "rating_grade": (v_obj.test_results or {}).get("rating_grade") if v_obj else None,
        "change_summary": v_obj.change_summary if v_obj else None,
    }


@router.get("/{section}/verify")
async def verify_prompt_section(
    section: str,
    response: Response,
    query: Optional[str] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Verifies that the backend database actively reflects the requested content or persona name.
    Used by the frontend to guarantee real-time backend-frontend parity.
    """
    _set_no_cache_headers(response)
    if section not in DEFAULT_PROMPT_SECTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid prompt section '{section}'")

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    content = await prompt_svc.get_active_section(section)
    stmt = (
        select(PromptVersion)
        .where(
            PromptVersion.org_id == settings.DEFAULT_ORG_ID,
            PromptVersion.section_name == section,
            PromptVersion.is_active == True,
        )
        .order_by(desc(PromptVersion.version))
        .limit(1)
    )
    v_obj = (await session.execute(stmt)).scalar_one_or_none()

    matched = True
    if query:
        matched = query.strip().lower() in content.lower()

    return {
        "section": section,
        "version": v_obj.version if v_obj else 1,
        "is_active": True,
        "verified": matched,
        "content_length": len(content),
        "preview": content[:200],
        "author": v_obj.author if v_obj else "system",
        "rating_score": (v_obj.test_results or {}).get("rating_score") if v_obj else None,
        "rating_grade": (v_obj.test_results or {}).get("rating_grade") if v_obj else None,
    }


@router.get("/{section}/history")
async def get_section_history(section: str, response: Response, session: AsyncSession = Depends(get_db)):
    """Returns version history for a prompt section including quality ratings with no-cache guarantee."""
    _set_no_cache_headers(response)
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
    Upgrades a prompt section using NemoTron 3 Ultra 550B (fallback: Super 120B / Lightning 30B).
    Takes a user's plain English intent, applies enterprise prompt engineering rules,
    automatically activates the new version in database, broadcasts real-time event via WebSocket,
    and returns the optimized prompt along with multidimensional quality ratings.
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

    # Safety check: only reject if the result is completely empty (should never happen with new router logic)
    if not result.optimized_prompt or not result.optimized_prompt.strip():
        logger.warning(f"[prompts.py] AI optimization for section '{section}' returned empty result.")
        raise HTTPException(
            status_code=422,
            detail="NemoTron could not generate a prompt for this request. Please try again with a different instruction.",
        )

    # Persist and activate the new version directly in the database
    meta = {
        "rating_score": result.rating_score,
        "rating_grade": result.rating_grade,
        "rating_breakdown": result.rating_breakdown.model_dump(),
        "model_used": result.model_used,
    }
    new_version = await prompt_svc.create_version(
        section_name=section,
        content=result.optimized_prompt,
        author="NemoTron-550B-Copilot",
        change_summary=f"NemoTron: {result.summary_of_changes}",
        activate=True,
        test_results=meta,
    )

    # Broadcast real-time update to all connected dashboard WebSockets
    try:
        from app.realtime.connection_manager import ws_manager
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "prompt_updated",
            {
                "section": section,
                "version": new_version.version,
                "content": new_version.content,
                "author": new_version.author,
                "rating_score": result.rating_score,
                "rating_grade": result.rating_grade,
                "rating_breakdown": meta["rating_breakdown"],
                "model_used": result.model_used,
                "change_summary": new_version.change_summary,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": section,
        "version": new_version.version,
        "is_active": True,
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
    """Creates a new version of a prompt section, sets it active, and broadcasts via WebSocket."""
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

    # Broadcast real-time update to all connected dashboard WebSockets
    try:
        from app.realtime.connection_manager import ws_manager
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "prompt_updated",
            {
                "section": section,
                "version": new_version.version,
                "content": new_version.content,
                "author": new_version.author,
                "rating_score": meta.get("rating_score"),
                "rating_grade": meta.get("rating_grade"),
                "rating_breakdown": meta.get("rating_breakdown"),
                "model_used": meta.get("model_used"),
                "change_summary": new_version.change_summary,
            },
        )
    except Exception:
        pass

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
    """Rolls back the active prompt to a previous version and broadcasts via WebSocket."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    rolled_back = await prompt_svc.rollback(section_name=section, target_version=version)
    if not rolled_back:
        raise HTTPException(status_code=404, detail="Target version not found")

    # Broadcast real-time update to all connected dashboard WebSockets
    try:
        from app.realtime.connection_manager import ws_manager
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "prompt_updated",
            {
                "section": section,
                "version": rolled_back.version,
                "content": rolled_back.content,
                "author": rolled_back.author,
                "change_summary": f"Rolled back to v{rolled_back.version}",
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": section,
        "version": rolled_back.version,
        "is_active": rolled_back.is_active,
    }
