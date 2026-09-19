"""
Modular System Prompt Management API (Sections 66, 67, 68).
Provides endpoints to view, create, update, diff, test, and rollback dynamic prompt sections.
Integrates with real-time WebSocket broadcasts and NVIDIA Nemotron Prompt Architect.
"""

from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from pydantic import BaseModel, Field
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.prompts import DEFAULT_PROMPT_SECTIONS, PromptService, compute_line_diff, count_tokens
from app.config import settings
from app.database.models import PromptSection, PromptVersion
from app.database.session import get_db
from app.realtime.connection_manager import ws_manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/prompts", tags=["Prompts"])


def _set_no_cache_headers(response: Response) -> None:
    """Sets strict HTTP no-cache headers to guarantee clients never receive stale prompt data."""
    response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"


# -------------------------------------------------------------
# Pydantic Request Models
# -------------------------------------------------------------
class SectionCreateRequest(BaseModel):
    key: str = Field(..., min_length=2, max_length=64, description="Slug identifier (e.g. returns_policy)")
    display_name: str = Field(..., min_length=2, max_length=128, description="Human title")
    description: Optional[str] = Field(None, max_length=500)
    icon: Optional[str] = Field("Sparkles", max_length=64)
    starter_instructions: Optional[str] = Field(None, description="Initial prompt instructions")
    order_index: Optional[int] = None
    preferred_model_tier: Optional[str] = "ultra-550b"


class SectionUpdateRequest(BaseModel):
    display_name: Optional[str] = None
    description: Optional[str] = None
    icon: Optional[str] = None
    order_index: Optional[int] = None
    is_active: Optional[bool] = None
    preferred_model_tier: Optional[str] = None


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
    model_tier: Optional[str] = Field("ultra-550b", description="Preferred model tier")


class PromptAIDraftSectionRequest(BaseModel):
    domain_description: str = Field(..., min_length=3, description="Plain English description of the new module domain (e.g. 'returns and refund rules')")


class RollbackRequest(BaseModel):
    reason: Optional[str] = Field(None, description="Reason for rollback")
    author: Optional[str] = Field("operator", description="Author identifier")


class PruneRequest(BaseModel):
    keep_latest: Optional[int] = Field(0, ge=0, description="Number of recent inactive versions to retain")


# -------------------------------------------------------------
# Dynamic Sections CRUD Endpoints
# -------------------------------------------------------------
@router.get("/sections")
async def list_prompt_sections(
    response: Response,
    include_archived: bool = Query(False, description="Include soft-deleted sections"),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns full list of dynamic prompt sections with their active version and metadata.
    """
    _set_no_cache_headers(response)
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sections = await prompt_svc.list_sections(include_archived=include_archived)

    result = []
    for sec in sections:
        content = await prompt_svc.get_active_section(sec.key)
        stmt = (
            select(PromptVersion)
            .where(
                PromptVersion.org_id == settings.DEFAULT_ORG_ID,
                (PromptVersion.section_id == sec.id) | (PromptVersion.section_name == sec.key),
                PromptVersion.is_active == True,
            )
            .order_by(desc(PromptVersion.version))
            .limit(1)
        )
        v_obj = (await session.execute(stmt)).scalar_one_or_none()
        tok_cnt = v_obj.token_count if v_obj and v_obj.token_count > 0 else count_tokens(content)

        result.append({
            "id": sec.id,
            "key": sec.key,
            "display_name": sec.display_name,
            "icon": sec.icon,
            "description": sec.description,
            "order_index": sec.order_index,
            "is_active": sec.is_active,
            "is_system": sec.is_system,
            "is_archived": sec.is_archived,
            "preferred_model_tier": sec.preferred_model_tier,
            "active_version": v_obj.version if v_obj else 1,
            "active_content": content,
            "token_count": tok_cnt,
            "author": v_obj.author if v_obj else "system",
            "quality_score": v_obj.quality_score if v_obj else (v_obj.test_results or {}).get("rating_score", 95),
            "quality_grade": v_obj.quality_grade if v_obj else (v_obj.test_results or {}).get("rating_grade", "A+"),
            "pinned": v_obj.pinned if v_obj else False,
            "change_summary": v_obj.change_summary if v_obj else None,
            "updated_at": sec.updated_at.isoformat() if sec.updated_at else None,
        })

    return {"sections": result, "count": len(result)}


@router.post("/sections", status_code=status.HTTP_201_CREATED)
async def create_prompt_section(
    req: SectionCreateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Creates a brand new custom prompt section with starter version 1."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)

    # Check key collision
    existing = await prompt_svc.get_section(req.key)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Section with key '{req.key}' already exists.",
        )

    sec = await prompt_svc.create_section(
        key=req.key,
        display_name=req.display_name,
        description=req.description,
        icon=req.icon or "Sparkles",
        starter_instructions=req.starter_instructions,
        order_index=req.order_index,
        created_by="operator",
        preferred_model_tier=req.preferred_model_tier or "ultra-550b",
    )

    # Broadcast real-time event
    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "section_created",
            {
                "id": sec.id,
                "key": sec.key,
                "display_name": sec.display_name,
                "order_index": sec.order_index,
                "is_active": sec.is_active,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": {
            "id": sec.id,
            "key": sec.key,
            "display_name": sec.display_name,
            "icon": sec.icon,
            "description": sec.description,
            "order_index": sec.order_index,
            "is_active": sec.is_active,
            "is_system": sec.is_system,
        },
    }


@router.get("/sections/{identifier}")
async def get_prompt_section_details(
    identifier: str,
    response: Response,
    session: AsyncSession = Depends(get_db),
):
    """Retrieves single section details by id or slug key."""
    _set_no_cache_headers(response)
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sec = await prompt_svc.get_section(identifier)
    if not sec:
        raise HTTPException(status_code=404, detail=f"Section '{identifier}' not found.")

    content = await prompt_svc.get_active_section(sec.key)
    stmt = (
        select(PromptVersion)
        .where(
            PromptVersion.org_id == settings.DEFAULT_ORG_ID,
            (PromptVersion.section_id == sec.id) | (PromptVersion.section_name == sec.key),
            PromptVersion.is_active == True,
        )
        .order_by(desc(PromptVersion.version))
        .limit(1)
    )
    v_obj = (await session.execute(stmt)).scalar_one_or_none()

    return {
        "id": sec.id,
        "key": sec.key,
        "display_name": sec.display_name,
        "icon": sec.icon,
        "description": sec.description,
        "order_index": sec.order_index,
        "is_active": sec.is_active,
        "is_system": sec.is_system,
        "is_archived": sec.is_archived,
        "preferred_model_tier": sec.preferred_model_tier,
        "active_version": v_obj.version if v_obj else 1,
        "content": content,
        "token_count": count_tokens(content),
        "author": v_obj.author if v_obj else "system",
        "quality_score": v_obj.quality_score if v_obj else (v_obj.test_results or {}).get("rating_score"),
        "quality_grade": v_obj.quality_grade if v_obj else (v_obj.test_results or {}).get("rating_grade"),
        "pinned": v_obj.pinned if v_obj else False,
        "change_summary": v_obj.change_summary if v_obj else None,
    }


@router.patch("/sections/{identifier}")
async def update_prompt_section_meta(
    identifier: str,
    req: SectionUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Updates section metadata, reorders, or toggles active status."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    updated = await prompt_svc.update_section(
        identifier=identifier,
        display_name=req.display_name,
        description=req.description,
        icon=req.icon,
        order_index=req.order_index,
        is_active=req.is_active,
        preferred_model_tier=req.preferred_model_tier,
    )
    if not updated:
        raise HTTPException(status_code=404, detail=f"Section '{identifier}' not found.")

    # Broadcast WebSocket
    try:
        event = "section_toggled" if req.is_active is not None else "section_updated"
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            event,
            {
                "id": updated.id,
                "key": updated.key,
                "is_active": updated.is_active,
                "order_index": updated.order_index,
                "display_name": updated.display_name,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": {
            "id": updated.id,
            "key": updated.key,
            "display_name": updated.display_name,
            "is_active": updated.is_active,
            "order_index": updated.order_index,
        },
    }


@router.delete("/sections/{identifier}")
async def archive_prompt_section(
    identifier: str,
    session: AsyncSession = Depends(get_db),
):
    """
    Soft-deletes (archives) a custom section.
    System sections (the original 5) reject with 409 Conflict.
    """
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sec = await prompt_svc.get_section(identifier)
    if not sec:
        raise HTTPException(status_code=404, detail="Section not found.")
    if sec.is_system:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"System section '{sec.display_name}' is protected and cannot be deleted or archived.",
        )

    success, msg = await prompt_svc.archive_section(identifier)
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    # Broadcast WS
    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "section_archived",
            {"id": sec.id, "key": sec.key, "display_name": sec.display_name},
        )
    except Exception:
        pass

    return {"success": True, "message": msg, "section_id": sec.id}


@router.post("/sections/{identifier}/restore")
async def restore_prompt_section(
    identifier: str,
    session: AsyncSession = Depends(get_db),
):
    """Restores a soft-deleted (archived) section."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    success, msg = await prompt_svc.restore_section(identifier)
    if not success:
        raise HTTPException(status_code=404, detail=msg)

    sec = await prompt_svc.get_section(identifier)
    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "section_restored",
            {"id": sec.id, "key": sec.key, "display_name": sec.display_name},
        )
    except Exception:
        pass

    return {"success": True, "message": msg}


# -------------------------------------------------------------
# Version History, Git Diff, Rollback & Pinning
# -------------------------------------------------------------
@router.get("/sections/{identifier}/history")
async def get_section_history_api(
    identifier: str,
    response: Response,
    session: AsyncSession = Depends(get_db),
):
    """Returns complete version history with quality scores, pinned state, and exact token counts."""
    _set_no_cache_headers(response)
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sec = await prompt_svc.get_section(identifier)
    sec_id = sec.id if sec else None
    slug_key = sec.key if sec else identifier

    stmt = (
        select(PromptVersion)
        .where(
            PromptVersion.org_id == settings.DEFAULT_ORG_ID,
            (PromptVersion.section_id == sec_id) if sec_id else (PromptVersion.section_name == slug_key),
        )
        .order_by(desc(PromptVersion.version))
    )
    res = await session.execute(stmt)
    versions = res.scalars().all()

    return {
        "section": slug_key,
        "section_id": sec_id,
        "history": [
            {
                "version": v.version,
                "content": v.content,
                "is_active": v.is_active,
                "pinned": v.pinned,
                "author": v.author,
                "change_summary": v.change_summary,
                "created_at": v.created_at.isoformat() if v.created_at else None,
                "token_count": v.token_count if v.token_count > 0 else count_tokens(v.content),
                "quality_score": v.quality_score or (v.test_results or {}).get("rating_score"),
                "quality_grade": v.quality_grade or (v.test_results or {}).get("rating_grade"),
                "rating_breakdown": (v.test_results or {}).get("rating_breakdown") or {
                    "clarity": v.clarity_score,
                    "constraint_strength": v.constraint_score,
                    "b2b_effectiveness": v.b2b_score,
                    "safety_grounding": v.safety_score,
                },
                "model_used": (v.test_results or {}).get("model_used"),
            }
            for v in versions
        ],
    }


@router.get("/sections/{identifier}/diff")
async def get_prompt_version_diff(
    identifier: str,
    from_v: int = Query(..., alias="from", description="Base version number"),
    to_v: int = Query(..., alias="to", description="Target version number"),
    response: Response = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Computes a server-side line-level git-style diff between two prompt versions.
    Returns structured chunks with additions (green), deletions (red), and change metrics.
    """
    if response:
        _set_no_cache_headers(response)

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sec = await prompt_svc.get_section(identifier)
    sec_id = sec.id if sec else None
    slug_key = sec.key if sec else identifier

    # Fetch from_v version
    stmt_from = select(PromptVersion).where(
        PromptVersion.org_id == settings.DEFAULT_ORG_ID,
        (PromptVersion.section_id == sec_id) if sec_id else (PromptVersion.section_name == slug_key),
        PromptVersion.version == from_v,
    )
    v_from = (await session.execute(stmt_from)).scalar_one_or_none()
    if not v_from:
        raise HTTPException(status_code=404, detail=f"Version v{from_v} not found for section '{slug_key}'.")

    # Fetch to_v version
    stmt_to = select(PromptVersion).where(
        PromptVersion.org_id == settings.DEFAULT_ORG_ID,
        (PromptVersion.section_id == sec_id) if sec_id else (PromptVersion.section_name == slug_key),
        PromptVersion.version == to_v,
    )
    v_to = (await session.execute(stmt_to)).scalar_one_or_none()
    if not v_to:
        raise HTTPException(status_code=404, detail=f"Version v{to_v} not found for section '{slug_key}'.")

    diff_result = compute_line_diff(v_from.content, v_to.content)

    return {
        "section": slug_key,
        "from_version": from_v,
        "to_version": to_v,
        "from_author": v_from.author,
        "to_author": v_to.author,
        "from_summary": v_from.change_summary,
        "to_summary": v_to.change_summary,
        **diff_result,
    }


@router.post("/sections/{identifier}/activate/{version}")
async def activate_prompt_version(
    identifier: str,
    version: int,
    req: Optional[RollbackRequest] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Rollback action: Activates a specific prior version and logs the full audit trail.
    """
    author = req.author if req and req.author else "operator"
    reason = req.reason if req else None

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    rolled_back = await prompt_svc.activate_version(
        identifier=identifier,
        target_version=version,
        author=author,
        reason=reason,
    )
    if not rolled_back:
        raise HTTPException(status_code=404, detail=f"Target version v{version} not found.")

    sec = await prompt_svc.get_section(identifier)

    # Broadcast WebSocket
    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "version_rolled_back",
            {
                "section": sec.key if sec else identifier,
                "version": rolled_back.version,
                "author": rolled_back.author,
                "change_summary": rolled_back.change_summary,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": sec.key if sec else identifier,
        "version": rolled_back.version,
        "is_active": rolled_back.is_active,
        "change_summary": rolled_back.change_summary,
        "author": rolled_back.author,
    }


@router.post("/sections/{identifier}/reset-to-default")
async def reset_section_to_default_api(
    identifier: str,
    session: AsyncSession = Depends(get_db),
):
    """Restores pristine factory instructions for system sections."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    success, msg, new_ver = await prompt_svc.reset_to_default(identifier, author="operator")
    if not success:
        raise HTTPException(status_code=400, detail=msg)

    sec = await prompt_svc.get_section(identifier)

    # Broadcast WS
    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "prompt_updated",
            {
                "section": sec.key if sec else identifier,
                "version": new_ver.version,
                "content": new_ver.content,
                "author": new_ver.author,
                "change_summary": new_ver.change_summary,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "message": msg,
        "version": new_ver.version,
        "content": new_ver.content,
    }


@router.post("/sections/{identifier}/versions/{version}/pin")
async def toggle_pin_version_api(
    identifier: str,
    version: int,
    session: AsyncSession = Depends(get_db),
):
    """Toggles pinning on a prompt version so it survives history pruning."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    ver = await prompt_svc.toggle_pin_version(identifier, version)
    if not ver:
        raise HTTPException(status_code=404, detail="Version not found.")

    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "version_pinned",
            {"section": ver.section_name, "version": ver.version, "pinned": ver.pinned},
        )
    except Exception:
        pass

    return {
        "success": True,
        "version": ver.version,
        "pinned": ver.pinned,
    }


@router.post("/sections/{identifier}/prune")
async def prune_prompt_history_api(
    identifier: str,
    req: Optional[PruneRequest] = None,
    session: AsyncSession = Depends(get_db),
):
    """
    Bulk-deletes unpinned inactive versions, strictly preserving the active version and any pinned versions.
    """
    keep_latest = req.keep_latest if req else 0
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    deleted_count = await prompt_svc.prune_inactive_history(identifier, keep_latest=keep_latest)

    return {
        "success": True,
        "deleted_count": deleted_count,
        "message": f"Pruned {deleted_count} unpinned inactive versions.",
    }


# -------------------------------------------------------------
# AI Prompt Architect & Meta-Prompt Endpoints
# -------------------------------------------------------------
@router.post("/ai-draft-section")
async def ai_draft_new_section(
    req: PromptAIDraftSectionRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    NemoTron drafts a complete new custom system prompt section from scratch.
    Proposes slug key, display name, icon, description, and starter prompt.
    """
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sections = await prompt_svc.list_sections(include_archived=False)

    # Gather existing active sections as read-only context for non-redundancy
    other_sections = {}
    for s in sections:
        c = await prompt_svc.get_active_section(s.key)
        if c:
            other_sections[s.key] = c

    from app.ai.router import ai_router
    proposal = await ai_router.draft_new_section(
        domain_description=req.domain_description,
        other_sections=other_sections,
        business_context={
            "business_name": settings.BUSINESS_NAME,
            "business_industry": settings.BUSINESS_INDUSTRY,
            "agent_name": settings.AGENT_NAME,
        },
    )

    return {
        "success": True,
        "proposal": proposal.model_dump(),
        "token_count": count_tokens(proposal.starter_instructions),
    }


@router.post("/{section}/ai-optimize")
async def ai_optimize_prompt_section_api(
    section: str,
    req: PromptAIOptimizeRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Upgrades a prompt section using NVIDIA Nemotron 3 Ultra 550B.
    Injects all other active sections as read-only context to guarantee cross-section policy consistency.
    """
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    base_prompt = req.current_prompt
    if not base_prompt or not base_prompt.strip():
        base_prompt = await prompt_svc.get_active_section(section)

    # Gather all other active sections for cross-section consistency
    all_sections = await prompt_svc.list_sections(include_archived=False)
    other_sections = {}
    for s in all_sections:
        if s.key != section and s.id != section:
            c = await prompt_svc.get_active_section(s.key)
            if c:
                other_sections[s.key] = c

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
        other_sections=other_sections,
        model_tier=req.model_tier or "ultra-550b",
    )

    if not result.optimized_prompt or not result.optimized_prompt.strip():
        raise HTTPException(
            status_code=422,
            detail="Nemotron could not generate an optimized prompt. Please adjust your instructions.",
        )

    # Persist and activate new version
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
        quality_score=result.rating_score,
        quality_grade=result.rating_grade,
        clarity_score=result.rating_breakdown.clarity,
        constraint_score=result.rating_breakdown.constraint_strength,
        b2b_score=result.rating_breakdown.b2b_effectiveness,
        safety_score=result.rating_breakdown.safety_grounding,
    )

    # Broadcast real-time update
    try:
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
                "token_count": new_version.token_count,
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
        "token_count": new_version.token_count,
        "latency_ms": result.latency_ms,
    }


# -------------------------------------------------------------
# Low-bandwidth Delta Sync Endpoint
# -------------------------------------------------------------
@router.get("/delta")
async def get_prompts_delta(
    since: str = Query(..., description="ISO timestamp for incremental delta sync"),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns sections and versions created/modified since the provided timestamp.
    Optimizes mobile reconnection without requiring full list refetches.
    """
    try:
        since_dt = datetime.fromisoformat(since.replace("Z", "+00:00"))
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid ISO timestamp format for 'since'.")

    stmt = select(PromptSection).where(
        PromptSection.org_id == settings.DEFAULT_ORG_ID,
        PromptSection.updated_at >= since_dt,
    )
    changed_sections = (await session.execute(stmt)).scalars().all()

    v_stmt = select(PromptVersion).where(
        PromptVersion.org_id == settings.DEFAULT_ORG_ID,
        PromptVersion.created_at >= since_dt,
    )
    changed_versions = (await session.execute(v_stmt)).scalars().all()

    return {
        "delta_timestamp": datetime.now(timezone.utc).isoformat(),
        "sections": [
            {
                "id": s.id,
                "key": s.key,
                "display_name": s.display_name,
                "is_active": s.is_active,
                "is_archived": s.is_archived,
                "order_index": s.order_index,
            }
            for s in changed_sections
        ],
        "versions": [
            {
                "section_id": v.section_id,
                "section_name": v.section_name,
                "version": v.version,
                "is_active": v.is_active,
                "pinned": v.pinned,
                "quality_score": v.quality_score,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in changed_versions
        ],
    }


# -------------------------------------------------------------
# Legacy Compatibility Endpoints
# -------------------------------------------------------------
@router.get("")
async def get_all_prompt_sections_legacy(response: Response, session: AsyncSession = Depends(get_db)):
    """Legacy dictionary mapping of prompt sections for backwards compatibility."""
    _set_no_cache_headers(response)
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    sections = await prompt_svc.list_sections(include_archived=False)

    out = {}
    for sec in sections:
        content = await prompt_svc.get_active_section(sec.key)
        stmt = (
            select(PromptVersion)
            .where(
                PromptVersion.org_id == settings.DEFAULT_ORG_ID,
                (PromptVersion.section_id == sec.id) | (PromptVersion.section_name == sec.key),
                PromptVersion.is_active == True,
            )
            .order_by(desc(PromptVersion.version))
            .limit(1)
        )
        v_obj = (await session.execute(stmt)).scalar_one_or_none()
        out[sec.key] = {
            "name": sec.key,
            "display_name": sec.display_name,
            "version": v_obj.version if v_obj else 1,
            "content": content,
            "is_default": content == sec.default_content,
            "is_system": sec.is_system,
            "is_active": sec.is_active,
            "author": v_obj.author if v_obj else "system",
            "token_count": count_tokens(content),
            "rating_score": v_obj.quality_score if v_obj else None,
            "rating_grade": v_obj.quality_grade if v_obj else None,
            "change_summary": v_obj.change_summary if v_obj else None,
        }

    return {"sections": out}


@router.get("/{section}")
async def get_prompt_section_legacy(section: str, response: Response, session: AsyncSession = Depends(get_db)):
    """Legacy single section endpoint."""
    return await get_prompt_section_details(section, response, session)


@router.put("/{section}")
@router.post("/{section}")
async def update_prompt_section_content_legacy(
    section: str,
    req: PromptUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """Creates a new version of a section and broadcasts WebSocket event."""
    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    meta = {}
    if req.rating_score is not None:
        meta["rating_score"] = req.rating_score
    if req.rating_grade is not None:
        meta["rating_grade"] = req.rating_grade
    if req.rating_breakdown is not None:
        meta["rating_breakdown"] = req.rating_breakdown
    if req.model_used is not None:
        meta["model_used"] = req.model_used

    new_ver = await prompt_svc.create_version(
        section_name=section,
        content=req.content,
        author=req.author or "operator",
        change_summary=req.change_summary,
        activate=True,
        test_results=meta,
        quality_score=req.rating_score,
        quality_grade=req.rating_grade,
    )

    try:
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "prompt_updated",
            {
                "section": section,
                "version": new_ver.version,
                "content": new_ver.content,
                "author": new_ver.author,
                "rating_score": req.rating_score,
                "rating_grade": req.rating_grade,
                "token_count": new_ver.token_count,
            },
        )
    except Exception:
        pass

    return {
        "success": True,
        "section": section,
        "version": new_ver.version,
        "is_active": new_ver.is_active,
        "token_count": new_ver.token_count,
    }


@router.post("/{section}/rollback/{version}")
async def rollback_prompt_legacy(
    section: str,
    version: int,
    session: AsyncSession = Depends(get_db),
):
    """Legacy rollback endpoint."""
    return await activate_prompt_version(section, version, req=None, session=session)
