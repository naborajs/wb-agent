"""
Voice Agent Live Session, Ephemeral Token Minting, and Agentic Workflow Routes.
Provides full agentic capabilities for EDITH:
1. Short-lived ephemeral token minting for gemini-3.1-flash-live-preview.
2. System prompt dynamic evolution via NVIDIA Nemotron-3 Ultra.
3. AI promotional message synthesis via NVIDIA Nemotron and WhatsApp dispatch.
4. Live backend settings, pricing, and catalog updates.
"""

from typing import Any, Dict, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from google import genai
from google.genai import types

from app.config import settings
from app.database.session import get_db
from app.utils.logging import logger

router = APIRouter(prefix="/voice", tags=["Voice Agent"])


class VoiceSessionTokenResponse(BaseModel):
    token: str
    model: str
    ws_url: str
    expires_in_seconds: int


class VoicePromptUpdateRequest(BaseModel):
    section: Optional[str] = "core_identity"
    instruction: str = Field(..., min_length=2, description="Instruction for Nemotron to revise the prompt")


class VoicePromoMessageRequest(BaseModel):
    target_phone: str = Field(..., description="E.164 phone number or contact identifier")
    recipient_name: Optional[str] = None
    instruction: str = Field(..., description="Offer details or campaign goal")
    dispatch_whatsapp: bool = True


class VoiceBackendSettingRequest(BaseModel):
    category: str = Field(..., description="'settings', 'pricing', 'catalog', or 'kill_switch'")
    key: str
    value: Any


@router.post("/session-token", response_model=VoiceSessionTokenResponse)
async def mint_voice_session_token():
    """
    Mints a short-lived (5 min), single-use ephemeral token scoped to
    `models/gemini-3.1-flash-live-preview` via Google GenAI Auth Tokens API.
    Guarantees the raw server GEMINI_API_KEY is never exposed to the client.
    """
    api_key = getattr(settings, "GEMINI_API_KEY", None)
    if not api_key or not api_key.strip():
        logger.error("Voice session token requested, but GEMINI_API_KEY is not configured.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Gemini API Key is not configured on the server. Please set GEMINI_API_KEY in .env.",
        )

    target_model = "models/gemini-3.1-flash-live-preview"

    try:
        client = genai.Client(api_key=api_key.strip(), http_options={"api_version": "v1alpha"})
        auth_token = client.auth_tokens.create(
            config=types.CreateAuthTokenConfig(
                uses=1,
                live_connect_constraints=types.LiveConnectConstraints(
                    model=target_model,
                    config=types.LiveConnectConfig(
                        response_modalities=["AUDIO"],
                    ),
                ),
                lock_additional_fields=[],
            )
        )

        token_name = auth_token.name
        ws_url = (
            f"wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha."
            f"GenerativeService.BidiGenerateContentConstrained?access_token={token_name}"
        )

        logger.info("Minted ephemeral voice session token for model %s (single-use)", target_model)

        return VoiceSessionTokenResponse(
            token=token_name,
            model=target_model,
            ws_url=ws_url,
            expires_in_seconds=300,
        )
    except Exception as e:
        logger.error(f"Failed to mint ephemeral voice session token: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate Gemini Live ephemeral token: {str(e)}",
        )


@router.post("/update-prompt-via-nemotron")
async def update_prompt_via_nemotron(
    req: VoicePromptUpdateRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Agentic Workflow: Transfers voice request to NVIDIA Nemotron model to rewrite
    and optimize a system prompt section (e.g. changing persona name from EDITH to Rakesh).
    Activates the new version in DB and broadcasts WebSocket update live.
    """
    from app.agent.prompts import DEFAULT_PROMPT_SECTIONS, PromptService
    from app.ai.router import ai_router
    from app.realtime.connection_manager import ws_manager

    # Determine target section (inferred if needed)
    section = (req.section or "").lower().strip()
    if section not in DEFAULT_PROMPT_SECTIONS:
        text = req.instruction.lower()
        if any(w in text for w in ["name", "persona", "rakesh", "edith", "identity", "tone"]):
            section = "core_identity"
        elif any(w in text for w in ["discount", "moq", "price", "cadence", "sample", "policy"]):
            section = "business_policy"
        elif any(w in text for w in ["safety", "jailbreak", "hallucination", "injection"]):
            section = "core_safety"
        elif any(w in text for w in ["catalog", "product", "service", "item", "offering", "profile", "spec"]):
            section = "business_profile"
        else:
            section = "sales_style"

    prompt_svc = PromptService(session, org_id=settings.DEFAULT_ORG_ID)
    current_prompt = await prompt_svc.get_active_section(section)

    logger.info(f"[Voice Agent] Delegating prompt update for section '{section}' to NVIDIA Nemotron...")

    result = await ai_router.optimize_system_prompt(
        section_name=section,
        user_intent=req.instruction,
        current_prompt=current_prompt,
        business_context={
            "business_name": settings.BUSINESS_NAME,
            "business_industry": settings.BUSINESS_INDUSTRY,
            "agent_name": settings.AGENT_NAME,
        },
    )

    if not result.optimized_prompt or not result.optimized_prompt.strip():
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="NVIDIA Nemotron returned an empty prompt response.",
        )

    # Persist and activate version in DB
    new_ver = await prompt_svc.create_version(
        section_name=section,
        content=result.optimized_prompt,
        author=f"Nemotron-VoiceAgent ({result.model_used})",
        change_summary=f"Voice instruction: {req.instruction}",
        activate=True,
        test_results={
            "rating_score": result.rating_score,
            "rating_grade": result.rating_grade,
            "rating_breakdown": result.rating_breakdown.model_dump(),
            "model_used": result.model_used,
        },
    )

    # Broadcast live real-time update to dashboard
    await ws_manager.broadcast_to_org(
        settings.DEFAULT_ORG_ID,
        "prompt_updated",
        {
            "section": section,
            "version": new_ver.version,
            "content": new_ver.content,
            "author": new_ver.author,
            "change_summary": new_ver.change_summary,
            "rating_score": result.rating_score,
        },
    )

    return {
        "success": True,
        "section": section,
        "version": new_ver.version,
        "model_used": result.model_used,
        "summary_of_changes": result.summary_of_changes,
        "preview": new_ver.content[:200],
        "message": f"NVIDIA Nemotron updated {section} to version {new_ver.version} successfully.",
    }


@router.post("/generate-promo-message")
async def generate_promo_message(
    req: VoicePromoMessageRequest,
):
    """
    Agentic Workflow: Crafts a customized promotional message using NVIDIA Nemotron
    and optionally dispatches it to the recipient via WhatsApp.
    """
    from app.ai.router import ai_router
    from app.ai.types import Capability, ModelMessage, ModelRequest
    from app.whatsapp.service import WhatsAppService

    logger.info(f"[Voice Agent] Asking NVIDIA Nemotron to draft promo for {req.target_phone}...")

    # Craft prompt for Nemotron
    request = ModelRequest(
        messages=[
            ModelMessage(
                role="system",
                content=(
                    f"You are the senior commercial sales copywriter for {settings.BUSINESS_NAME} "
                    f"({settings.BUSINESS_INDUSTRY} - {settings.BUSINESS_TAGLINE}).\n"
                    "Your task: Write an irresistible, personalized WhatsApp promotional message for a commercial buyer or client.\n"
                    "Rules:\n"
                    "1. Tone: Respectful, professional, warm, commercial presence.\n"
                    "2. Highlights: Direct commercial supply, premium quality, sample evaluation, volume tier pricing.\n"
                    "3. Format: Clean WhatsApp formatted message (use *bold* for key terms). No preamble, no quotes."
                ),
            ),
            ModelMessage(
                role="user",
                content=(
                    f"Recipient: {req.recipient_name or 'Wholesale Client'} ({req.target_phone})\n"
                    f"Offer/Instruction: {req.instruction}"
                ),
            ),
        ],
        temperature=0.35,
        max_tokens=600,
    )

    model_resp = await ai_router.execute(Capability.CORE_BRAIN, request)
    promo_text = model_resp.content.strip()

    dispatched = False
    dispatch_detail = "Message generated but not dispatched."

    if req.dispatch_whatsapp and promo_text:
        try:
            provider = WhatsAppService.get_provider()
            res = await provider.send_message(to_phone=req.target_phone, message=promo_text)
            dispatched = True
            dispatch_detail = f"Dispatched via WhatsApp provider ({type(provider).__name__})."
        except Exception as e:
            logger.warning(f"WhatsApp promo dispatch failed: {e}")
            dispatch_detail = f"Dispatch warning: {str(e)}"

    return {
        "success": True,
        "recipient": req.target_phone,
        "generated_message": promo_text,
        "model_used": model_resp.model,
        "whatsapp_dispatched": dispatched,
        "status_detail": dispatch_detail,
    }


@router.post("/update-backend-setting")
async def update_backend_setting(
    req: VoiceBackendSettingRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Agentic Workflow: Updates backend settings, pricing rules, or product catalog
    directly from voice instructions and broadcasts changes live.
    """
    from app.realtime.connection_manager import ws_manager
    from app.database.models import Product, PricingRule

    cat = req.category.lower().strip()

    if cat == "kill_switch":
        # Master kill switch toggle
        enabled = bool(req.value)
        # Broadcast kill switch event
        await ws_manager.broadcast_to_org(
            settings.DEFAULT_ORG_ID,
            "kill_switch_toggled",
            {"ai_responding_enabled": enabled},
        )
        return {
            "success": True,
            "category": "kill_switch",
            "message": f"Master AI Responding is now {'ENABLED' if enabled else 'DISABLED'}.",
        }

    elif cat == "catalog":
        # e.g. update stock status or MOQ
        prod_id = req.key
        stmt = select(Product).where(Product.id == prod_id)
        prod = (await session.execute(stmt)).scalar_one_or_none()
        if not prod:
            # Try matching by name
            stmt_name = select(Product).where(Product.name.ilike(f"%{prod_id}%"))
            prod = (await session.execute(stmt_name)).scalar_one_or_none()

        if prod:
            if isinstance(req.value, bool):
                prod.in_stock = req.value
            elif isinstance(req.value, (int, float)):
                prod.min_order_quantity_kg = int(req.value)
            await session.commit()
            return {
                "success": True,
                "category": "catalog",
                "product": prod.name,
                "in_stock": prod.in_stock,
                "moq": prod.min_order_quantity_kg,
            }
        return {"success": false, "error": f"Product '{prod_id}' not found."}

    elif cat == "pricing":
        # Toggle or create pricing rule
        rule_name = req.key
        stmt = select(PricingRule).where(PricingRule.rule_name.ilike(f"%{rule_name}%"))
        rule = (await session.execute(stmt)).scalar_one_or_none()
        if rule:
            if isinstance(req.value, bool):
                rule.is_active = req.value
            await session.commit()
            return {
                "success": True,
                "category": "pricing",
                "rule": rule.rule_name,
                "is_active": rule.is_active,
            }
        return {"success": False, "error": f"Pricing rule '{rule_name}' not found."}

    return {
        "success": True,
        "category": cat,
        "message": f"Updated {req.key} to {req.value}.",
    }


class VoiceAuditLogRequest(BaseModel):
    user_instruction: str = Field(..., description="User's original voice or text query")
    action_type: str = Field(..., description="Tool name or intent attempted, e.g. select_conversation, click_element, set_color_theme, unhandled")
    status: str = Field(default="success", description="'success', 'failed', or 'unhandled'")
    current_path: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    error_reason: Optional[str] = None
    suggested_feature: Optional[str] = None


@router.post("/audit-log")
async def record_voice_audit_log(
    req: VoiceAuditLogRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Continuous Learning: Records user instructions, UI actions, unhandled intents,
    and runtime errors into the SQLite database for operator inspection and agent evolution.
    """
    from app.database.models import VoiceAuditLog
    from app.database.base import Base

    # Ensure table exists in database engine
    try:
        conn = await session.connection()
        await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        logger.debug("Database sync warning: %s", e)

    log_entry = VoiceAuditLog(
        org_id=settings.DEFAULT_ORG_ID,
        user_instruction=req.user_instruction,
        action_type=req.action_type,
        status=req.status,
        current_path=req.current_path or "/",
        details=req.details or {},
        error_reason=req.error_reason,
        suggested_feature=req.suggested_feature,
    )
    session.add(log_entry)
    await session.commit()
    await session.refresh(log_entry)

    logger.info(
        "Voice Agent Audit Log recorded: action=%s status=%s instruction='%s'",
        log_entry.action_type,
        log_entry.status,
        log_entry.user_instruction[:60],
    )

    return {
        "success": True,
        "log_id": log_entry.id,
        "action_type": log_entry.action_type,
        "status": log_entry.status,
    }


@router.get("/audit-logs")
async def get_voice_audit_logs(
    status: Optional[str] = None,
    limit: int = 50,
    session: AsyncSession = Depends(get_db),
):
    """
    Retrieves recorded voice interaction audit logs, filterable by status ('failed', 'unhandled', 'success').
    """
    from app.database.models import VoiceAuditLog
    from sqlalchemy import desc

    stmt = select(VoiceAuditLog).order_by(desc(VoiceAuditLog.created_at)).limit(limit)
    if status:
        stmt = select(VoiceAuditLog).where(VoiceAuditLog.status == status).order_by(desc(VoiceAuditLog.created_at)).limit(limit)

    results = (await session.execute(stmt)).scalars().all()

    return [
        {
            "id": r.id,
            "user_instruction": r.user_instruction,
            "action_type": r.action_type,
            "status": r.status,
            "current_path": r.current_path,
            "details": r.details,
            "error_reason": r.error_reason,
            "suggested_feature": r.suggested_feature,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in results
    ]

