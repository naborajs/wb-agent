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
    """Returns version history for a prompt section."""
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
            }
            for v in versions
        ],
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

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    new_version = await prompt_svc.create_version(
        section_name=section,
        content=req.content,
        author=req.author or "operator",
        change_summary=req.change_summary,
        activate=True,
    )

    return {
        "success": True,
        "section": section,
        "version": new_version.version,
        "is_active": new_version.is_active,
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
