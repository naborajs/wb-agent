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
from app.database.base import utc_now
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
    speak_text: Optional[str] = None
    delegation_flow: Optional[Dict[str, Any]] = None
    code_diagnosis: Optional[Dict[str, Any]] = None
    suggested_reply: Optional[str] = None
    conversation_id: Optional[str] = None
    ui_action: Optional[Dict[str, Any]] = None
    action_result: Optional[Dict[str, Any]] = None


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


class VoiceKnowledgeActionRequest(BaseModel):
    action: str = Field("create", description="'create', 'update', 'pause', 'activate', or 'delete'")
    instruction: str = Field(..., description="Natural language voice instruction from operator")
    category: Optional[str] = Field(None, description="'business_info', 'pricing_rule', 'catalog_product', 'agent_guidance', 'custom'")
    item_id_or_title: Optional[str] = Field(None, description="Optional target item ID or title substring")
    fields: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Extracted numerical or categorical parameters")


class BrainDeliberationRequest(BaseModel):
    topic: str = Field(..., min_length=2, description="Strategic question, objection, or commercial proposal for dual-brain deliberation")
    context: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Optional customer profile or parameters")
    requested_discount: Optional[float] = Field(None, description="Optional discount percentage being evaluated")


class BrainDeliberationResponse(BaseModel):
    topic: str
    friday_query: str
    edith_verdict: str
    edith_reasoning: str
    consensus: str
    deliberation_id: str
    resolved_at: Optional[str] = None


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


@router.post("/voice-knowledge-action")
async def handle_voice_knowledge_action(
    req: VoiceKnowledgeActionRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Voice-driven knowledge hub modification endpoint:
    Dispatches voice commands from Friday to EDITH to create, edit, pause, activate, or delete knowledge assets.
    """
    org_id = settings.DEFAULT_ORG_ID
    result = await inter_brain_bus.dispatch_voice_knowledge_action(
        session=session,
        org_id=org_id,
        action=req.action,
        instruction=req.instruction,
        category=req.category,
        item_id_or_title=req.item_id_or_title,
        fields=req.fields,
    )
    return result


@router.post("/deliberate", response_model=BrainDeliberationResponse)
async def deliberate_strategic_decision(
    req: BrainDeliberationRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Initiates live collaborative deliberation between Friday and EDITH over the Inter-Brain Bus.
    Exchanges strategic perspectives, audits commercial boundaries, persists thoughts,
    and returns a joint consensus.
    """
    org_id = settings.DEFAULT_ORG_ID
    result = await inter_brain_bus.deliberate(
        session=session,
        org_id=org_id,
        topic=req.topic,
        context=req.context,
        requested_discount=req.requested_discount,
    )
    return BrainDeliberationResponse(**result)


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
            "model": getattr(settings, "GEMINI_MODEL", "gemini-3.1-flash-live-preview"),
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
            "safe_mode_enabled": inter_brain_bus.safe_mode_enabled,
        },
    }


class EdithToFridayRequest(BaseModel):
    action: str = Field(..., description="'VOICE_ALERT', 'VOICE_INTERRUPT', 'OPERATOR_NOTE'")
    topic: Optional[str] = Field(None, description="Event or lead description")
    message: Optional[str] = Field(None, description="Detailed message payload")
    severity: Optional[str] = Field("medium", description="'low', 'medium', 'high', 'critical'")
    urgency: Optional[str] = Field("normal", description="'normal', 'urgent', 'critical'")
    target_phone: Optional[str] = Field(None, description="Optional customer phone")
    details: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")


class SafeModeRequest(BaseModel):
    enabled: Optional[bool] = None


@router.get("/briefing")
async def get_executive_briefing(
    timeframe: str = Query("today", description="'today' or 'yesterday'"),
    session: AsyncSession = Depends(get_db),
):
    """
    Returns executive morning/daily audio briefing script and aggregated operational metrics.
    """
    org_id = settings.DEFAULT_ORG_ID
    return await inter_brain_bus.get_executive_briefing(session, org_id, timeframe=timeframe)


@router.get("/hourly-velocity")
async def get_hourly_velocity(session: AsyncSession = Depends(get_db)):
    """
    Returns 24-hour inbound traffic velocity, peak hours, autonomous conversions vs handoffs, and latency curve.
    """
    org_id = settings.DEFAULT_ORG_ID
    return await inter_brain_bus.get_hourly_velocity(session, org_id)


@router.post("/edith-to-friday")
async def edith_request_friday(
    req: EdithToFridayRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    EDITH delegates an action to Friday. Friday independently evaluates and may accept or deny.
    If Friday denies with reason, EDITH executes its fallback system to notify the operator directly.
    """
    org_id = settings.DEFAULT_ORG_ID
    details = {
        "topic": req.topic or req.message,
        "message": req.message or req.topic,
        "severity": req.severity,
        "urgency": req.urgency,
        "target_phone": req.target_phone,
        **(req.details or {}),
    }
    return await inter_brain_bus.edith_request_friday(
        session=session,
        org_id=org_id,
        action=req.action,
        details=details,
    )


@router.post("/background-think")
async def trigger_background_thinking(session: AsyncSession = Depends(get_db)):
    """
    Triggers mutual background thinking & idle synaptic audit cycle across EDITH and Friday.
    """
    org_id = settings.DEFAULT_ORG_ID
    return await inter_brain_bus.run_background_thinking_cycle(session, org_id)


@router.post("/toggle-safe-mode")
async def toggle_safe_mode(req: Optional[SafeModeRequest] = None):
    """
    Toggles or sets the autonomous safe mode / pause AI guardrail.
    """
    enabled = req.enabled if req else None
    status = inter_brain_bus.toggle_safe_mode(enabled)
    return {"safe_mode_enabled": status}


@router.get("/safe-mode")
async def get_safe_mode():
    """Returns whether autonomous safe mode is currently enabled."""
    return {"safe_mode_enabled": inter_brain_bus.safe_mode_enabled}


class BenchmarkModelRequest(BaseModel):
    model_id: str = Field(..., description="Model identifier to test (e.g. 'gemini-2.5-flash', 'meta/llama-3.3-70b-instruct')")
    prompt: Optional[str] = Field("What wholesale discount can we offer for a 500kg commitment?", description="Prompt to test")
    api_key_override: Optional[str] = None
    temperature: Optional[float] = 0.2
    max_tokens: Optional[int] = 256


class ModelRolesUpdateRequest(BaseModel):
    friday_web_model: Optional[str] = None
    edith_sales_model: Optional[str] = None
    friday_voice_model: Optional[str] = None
    edith_policy_model: Optional[str] = None
    system_watchdog_model: Optional[str] = None


class PlaygroundChatRequest(BaseModel):
    model_id: str = Field(..., description="Model identifier to chat with")
    messages: List[Dict[str, str]] = Field(..., description="List of messages: [{'role': 'user', 'content': '...'}]")
    system_prompt: Optional[str] = Field(None, description="Optional system prompt / persona")
    temperature: Optional[float] = Field(0.3, description="Sampling temperature")
    max_tokens: Optional[int] = Field(1024, description="Max output tokens")


@router.get("/telemetry")
async def get_brain_telemetry(session: AsyncSession = Depends(get_db)):
    """
    Returns exhaustive live token usage, model telemetry, context utilization, and comparative economics.
    """
    org_id = settings.DEFAULT_ORG_ID
    return await inter_brain_bus.get_telemetry(session, org_id)


@router.get("/model-roles")
async def get_model_roles():
    """
    Returns current active model assignments for Friday, EDITH, Voice, and System roles,
    along with the full available model catalog.
    """
    catalog = [
        # Google Gemini Suite
        {"id": "gemini-2.5-flash", "name": "Gemini 2.5 Flash (Recommended)", "provider": "Google", "category": "Fast Reasoning & Low Latency", "context": "1,048,576 tok", "pricing": "$0.10 / $0.40 per 1M", "is_free": False},
        {"id": "gemini-2.5-pro", "name": "Gemini 2.5 Pro", "provider": "Google", "category": "Deep Reasoning & Analysis", "context": "2,097,152 tok", "pricing": "$1.25 / $5.00 per 1M", "is_free": False},
        {"id": "gemini-3.1-flash-live-preview", "name": "Gemini 3.1 Flash Live", "provider": "Google", "category": "Realtime Voice Streaming (PCM)", "context": "1,048,576 tok", "pricing": "$0.10 / $0.40 per 1M", "is_free": False},
        {"id": "gemini-2.5-flash-lite", "name": "Gemini 2.5 Flash-Lite", "provider": "Google", "category": "Ultra-Low Latency Lightweight", "context": "1,048,576 tok", "pricing": "$0.075 / $0.30 per 1M", "is_free": False},
        {"id": "gemini-3.1-flash-lite", "name": "Gemini 3.1 Flash-Lite Preview", "provider": "Google", "category": "Next-Gen Lightweight", "context": "1,048,576 tok", "pricing": "$0.075 / $0.30 per 1M", "is_free": False},
        {"id": "gemini-3.5-flash", "name": "Gemini 3.5 Flash", "provider": "Google", "category": "High-Throughput Multimodal", "context": "1,048,576 tok", "pricing": "$0.10 / $0.40 per 1M", "is_free": False},
        {"id": "gemini-flash-latest", "name": "Gemini Flash Latest Alias", "provider": "Google", "category": "Auto-Updated Production Flash", "context": "1,048,576 tok", "pricing": "$0.10 / $0.40 per 1M", "is_free": False},
        # NVIDIA NIM Suite (Zero-Cost under user key)
        {"id": "meta/llama-3.3-70b-instruct", "name": "Llama 3.3 70B Instruct", "provider": "NVIDIA", "category": "Commercial Sales Closer", "context": "131,072 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", "name": "Nemotron-3 Nano Omni 30B", "provider": "NVIDIA", "category": "Cadence & Anti-Spam", "context": "32,768 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "nvidia/nemotron-3-super-120b-a12b", "name": "Nemotron-3 Super 120B", "provider": "NVIDIA", "category": "Balanced Commercial Evaluator", "context": "65,536 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "nvidia/nemotron-4-340b-instruct", "name": "Nemotron-4 340B Instruct", "provider": "NVIDIA", "category": "Enterprise Contract Negotiator", "context": "131,072 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "nvidia/nemotron-3-ultra-550b-a55b", "name": "Nemotron-3 Ultra 550B", "provider": "NVIDIA", "category": "Deep Policy & Governance Audit", "context": "131,072 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "deepseek-ai/deepseek-r1", "name": "DeepSeek R1 (Reasoning)", "provider": "NVIDIA", "category": "Open Reasoning Flagship", "context": "65,536 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "qwen/qwen2.5-72b-instruct", "name": "Qwen 2.5 72B Instruct", "provider": "NVIDIA", "category": "High-Accuracy Multilingual", "context": "131,072 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "mistralai/mistral-large-2411", "name": "Mistral Large 2411", "provider": "NVIDIA", "category": "Multilingual Complex Reasoning", "context": "128,000 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "google/gemma-4-31b-it", "name": "Gemma 4 31B IT", "provider": "NVIDIA", "category": "Compact Multilingual Agent", "context": "32,768 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "google/diffusiongemma-26b-a4b-it", "name": "DiffusionGemma 26B IT", "provider": "NVIDIA", "category": "Ultra Low-Latency Triage", "context": "32,768 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
        {"id": "openai/gpt-oss-20b", "name": "OpenAI GPT-OSS 20B", "provider": "NVIDIA", "category": "Logic & Arithmetic Sanity", "context": "32,768 tok", "pricing": "Free (NVIDIA Key)", "is_free": True},
    ]

    return {
        "friday_web_model": getattr(settings, "FRIDAY_WEB_MODEL", "gemini-3.1-flash-live-preview"),
        "edith_sales_model": getattr(settings, "EDITH_SALES_MODEL", "meta/llama-3.3-70b-instruct"),
        "friday_voice_model": getattr(settings, "FRIDAY_VOICE_MODEL", "gemini-3.1-flash-live-preview"),
        "edith_policy_model": getattr(settings, "EDITH_POLICY_MODEL", "nvidia/nemotron-3-super-120b-a12b"),
        "system_watchdog_model": getattr(settings, "SYSTEM_WATCHDOG_MODEL", "openai/gpt-oss-20b"),
        "catalog": catalog,
    }


@router.post("/model-roles")
async def update_model_roles(req: ModelRolesUpdateRequest):
    """
    Updates model role assignments, updating active runtime memory and persisting to local .env file.
    """
    from app.api.routes.settings import update_local_env_file

    env_updates: Dict[str, str] = {}
    if req.friday_web_model is not None:
        setattr(settings, "FRIDAY_WEB_MODEL", req.friday_web_model)
        env_updates["FRIDAY_WEB_MODEL"] = req.friday_web_model
    if req.edith_sales_model is not None:
        setattr(settings, "EDITH_SALES_MODEL", req.edith_sales_model)
        env_updates["EDITH_SALES_MODEL"] = req.edith_sales_model
    if req.friday_voice_model is not None:
        setattr(settings, "FRIDAY_VOICE_MODEL", req.friday_voice_model)
        env_updates["FRIDAY_VOICE_MODEL"] = req.friday_voice_model
    if req.edith_policy_model is not None:
        setattr(settings, "EDITH_POLICY_MODEL", req.edith_policy_model)
        env_updates["EDITH_POLICY_MODEL"] = req.edith_policy_model
    if req.system_watchdog_model is not None:
        setattr(settings, "SYSTEM_WATCHDOG_MODEL", req.system_watchdog_model)
        env_updates["SYSTEM_WATCHDOG_MODEL"] = req.system_watchdog_model

    if env_updates:
        update_local_env_file(env_updates)

    logger.info(f"[Brain API] Updated model role assignments: {env_updates}")
    return {
        "success": True,
        "message": "Model role assignments updated and persisted.",
        "roles": {
            "friday_web_model": settings.FRIDAY_WEB_MODEL,
            "edith_sales_model": settings.EDITH_SALES_MODEL,
            "friday_voice_model": settings.FRIDAY_VOICE_MODEL,
            "edith_policy_model": settings.EDITH_POLICY_MODEL,
            "system_watchdog_model": settings.SYSTEM_WATCHDOG_MODEL,
        },
    }


@router.post("/benchmark-model")
async def benchmark_model(req: BenchmarkModelRequest):
    """
    Executes an authentic, non-simulated inference request against Google Gemini or NVIDIA NIM
    using genuine API keys. Measures real response latency and provider token usage.
    NVIDIA models are strictly zero-cost ($0.00). Only Gemini models calculate dollar cost.
    """
    import time
    import httpx

    start_t = time.perf_counter()
    model_id = req.model_id.strip()
    prompt = req.prompt or "What wholesale discount can we offer for a 500kg commitment?"
    temp = req.temperature if req.temperature is not None else 0.2
    max_tok = req.max_tokens or 256

    is_gemini = "gemini" in model_id.lower() or model_id.lower().startswith("google/gemma") is False and "google" in model_id.lower()
    
    output_text = ""
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0
    cost_cents = 0.0
    cost_per_million = "Included / Free (NVIDIA Key)"
    is_free = True
    provider_name = "NVIDIA NIM"
    status_str = "success"
    error_msg = None

    if is_gemini:
        provider_name = "Google Gemini"
        clean_model = model_id.replace("models/", "")
        if clean_model == "gemini-3.1-flash-live-preview":
            clean_model = "gemini-2.5-flash"

        gemini_key = req.api_key_override or getattr(settings, "GEMINI_API_KEY", "")
        if not gemini_key or gemini_key.startswith("mock"):
            elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
            return {
                "model_id": model_id,
                "provider": provider_name,
                "status": "error",
                "error": "No valid GEMINI_API_KEY configured in environment.",
                "latency_ms": elapsed_ms,
                "output_text": "",
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "cost_cents": 0.0,
                "cost_per_million": "$0.10 in / $0.40 out",
                "is_free": False,
                "timestamp": utc_now().isoformat(),
            }

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={gemini_key}"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": temp, "maxOutputTokens": max_tok},
        }

        try:
            async with httpx.AsyncClient(timeout=25.0) as client:
                resp = await client.post(url, json=payload)
                elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            output_text = parts[0].get("text", "").strip()

                    usage = data.get("usageMetadata", {})
                    prompt_tokens = usage.get("promptTokenCount", max(1, len(prompt) // 4))
                    completion_tokens = usage.get("candidatesTokenCount", max(1, len(output_text) // 4))
                    total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)

                    in_rate = 1.25 if "pro" in clean_model else 0.10
                    out_rate = 5.00 if "pro" in clean_model else 0.40
                    cost_usd = (prompt_tokens * in_rate / 1_000_000) + (completion_tokens * out_rate / 1_000_000)
                    cost_cents = round(cost_usd * 100, 4)
                    cost_per_million = f"${in_rate:.2f} in / ${out_rate:.2f} out"
                    is_free = False
                else:
                    status_str = "error"
                    error_msg = f"Gemini API returned {resp.status_code}: {resp.text[:200]}"
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
            status_str = "error"
            error_msg = f"Gemini connection failure: {str(e)}"

    else:
        # NVIDIA NIM API Call
        provider_name = "NVIDIA NIM"
        is_free = True
        cost_cents = 0.0
        cost_per_million = "Included / Free (NVIDIA Key)"

        nvidia_key = req.api_key_override or getattr(settings, "nvidia_primary_key", "")
        fallback_key = getattr(settings, "nvidia_fallback_key", "")

        keys_to_try = [k for k in [nvidia_key, fallback_key] if k and not k.startswith("mock") and not k.startswith("nvapi-mock")]
        if not keys_to_try:
            elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
            return {
                "model_id": model_id,
                "provider": provider_name,
                "status": "error",
                "error": "No valid NVIDIA API key configured in environment.",
                "latency_ms": elapsed_ms,
                "output_text": "",
                "input_tokens": 0,
                "output_tokens": 0,
                "total_tokens": 0,
                "cost_cents": 0.0,
                "cost_per_million": cost_per_million,
                "is_free": True,
                "timestamp": utc_now().isoformat(),
            }

        headers_base = {"Content-Type": "application/json"}
        payload = {
            "model": model_id,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": temp,
            "max_tokens": max_tok,
        }

        succeeded = False
        last_error_text = ""
        for key in keys_to_try:
            try:
                headers = {**headers_base, "Authorization": f"Bearer {key}"}
                async with httpx.AsyncClient(timeout=25.0) as client:
                    resp = await client.post(
                        f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            output_text = choices[0].get("message", {}).get("content", "").strip()
                        usage = data.get("usage", {})
                        prompt_tokens = usage.get("prompt_tokens", max(1, len(prompt) // 4))
                        completion_tokens = usage.get("completion_tokens", max(1, len(output_text) // 4))
                        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
                        succeeded = True
                        break
                    else:
                        last_error_text = f"HTTP {resp.status_code}: {resp.text[:200]}"
            except Exception as e:
                last_error_text = f"Connection error: {str(e)}"

        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
        if not succeeded:
            status_str = "error"
            error_msg = f"NVIDIA NIM error on '{model_id}': {last_error_text}"

    return {
        "model_id": model_id,
        "provider": provider_name,
        "status": status_str,
        "error": error_msg,
        "latency_ms": elapsed_ms,
        "output_text": output_text,
        "input_tokens": prompt_tokens,
        "output_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "cost_cents": cost_cents,
        "cost_per_million": cost_per_million,
        "is_free": is_free,
        "timestamp": utc_now().isoformat(),
    }


@router.post("/playground/chat")
async def playground_chat(req: PlaygroundChatRequest):
    """
    Powers the dedicated Google Gemini / ChatGPT-style Playground.
    Executes real-time conversational inference against any selected model,
    returning authentic response text, latency, token usage, and pricing telemetry.
    """
    import time
    import httpx

    start_t = time.perf_counter()
    model_id = req.model_id.strip()
    is_gemini = "gemini" in model_id.lower() or model_id.lower().startswith("google/gemma") is False and "google" in model_id.lower()
    
    clean_model = model_id.replace("models/", "")
    if clean_model == "gemini-3.1-flash-live-preview":
        clean_model = "gemini-2.5-flash"

    # Assemble conversation prompt / messages
    messages = list(req.messages)
    if req.system_prompt and not is_gemini:
        messages = [{"role": "system", "content": req.system_prompt}] + messages

    output_text = ""
    prompt_tokens = 0
    completion_tokens = 0
    total_tokens = 0
    cost_cents = 0.0
    cost_label = "Included / Free (NVIDIA Key)"
    is_free = True
    provider_name = "NVIDIA NIM"
    status_str = "success"
    error_msg = None

    if is_gemini:
        provider_name = "Google Gemini"
        gemini_key = getattr(settings, "GEMINI_API_KEY", "")
        if not gemini_key or gemini_key.startswith("mock"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid GEMINI_API_KEY is not configured in backend environment.",
            )

        url = f"https://generativelanguage.googleapis.com/v1beta/models/{clean_model}:generateContent?key={gemini_key}"
        
        # Convert messages to Gemini contents format
        contents = []
        for m in req.messages:
            role = "user" if m.get("role") in ("user", "human") else "model"
            contents.append({"role": role, "parts": [{"text": m.get("content", "")}]})
        
        payload: Dict[str, Any] = {
            "contents": contents,
            "generationConfig": {
                "temperature": req.temperature or 0.3,
                "maxOutputTokens": req.max_tokens or 1024,
            },
        }
        if req.system_prompt:
            payload["systemInstruction"] = {"parts": [{"text": req.system_prompt}]}

        try:
            async with httpx.AsyncClient(timeout=45.0) as client:
                resp = await client.post(url, json=payload)
                elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
                if resp.status_code == 200:
                    data = resp.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts:
                            output_text = parts[0].get("text", "").strip()

                    usage = data.get("usageMetadata", {})
                    prompt_tokens = usage.get("promptTokenCount", 10)
                    completion_tokens = usage.get("candidatesTokenCount", max(1, len(output_text) // 4))
                    total_tokens = usage.get("totalTokenCount", prompt_tokens + completion_tokens)

                    in_rate = 1.25 if "pro" in clean_model else 0.10
                    out_rate = 5.00 if "pro" in clean_model else 0.40
                    cost_usd = (prompt_tokens * in_rate / 1_000_000) + (completion_tokens * out_rate / 1_000_000)
                    cost_cents = round(cost_usd * 100, 4)
                    cost_label = f"${in_rate:.2f} in / ${out_rate:.2f} out"
                    is_free = False
                else:
                    raise HTTPException(
                        status_code=resp.status_code,
                        detail=f"Google Gemini Error: {resp.text[:200]}",
                    )
        except HTTPException:
            raise
        except Exception as e:
            elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"Gemini connection failure: {str(e)}",
            )
    else:
        # NVIDIA NIM
        provider_name = "NVIDIA NIM"
        is_free = True
        cost_cents = 0.0
        cost_label = "Included / Free (NVIDIA Key)"

        nvidia_key = getattr(settings, "nvidia_primary_key", "")
        fallback_key = getattr(settings, "nvidia_fallback_key", "")
        keys = [k for k in [nvidia_key, fallback_key] if k and not k.startswith("mock") and not k.startswith("nvapi-mock")]
        if not keys:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Valid NVIDIA API Key is not configured in backend environment.",
            )

        payload = {
            "model": model_id,
            "messages": messages,
            "temperature": req.temperature or 0.3,
            "max_tokens": req.max_tokens or 1024,
        }

        succeeded = False
        last_err = ""
        for key in keys:
            try:
                headers = {"Authorization": f"Bearer {key}", "Content-Type": "application/json"}
                async with httpx.AsyncClient(timeout=45.0) as client:
                    resp = await client.post(
                        f"{settings.NVIDIA_BASE_URL.rstrip('/')}/chat/completions",
                        headers=headers,
                        json=payload,
                    )
                    elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
                    if resp.status_code == 200:
                        data = resp.json()
                        choices = data.get("choices", [])
                        if choices:
                            output_text = choices[0].get("message", {}).get("content", "").strip()
                        usage = data.get("usage", {})
                        prompt_tokens = usage.get("prompt_tokens", 10)
                        completion_tokens = usage.get("completion_tokens", max(1, len(output_text) // 4))
                        total_tokens = usage.get("total_tokens", prompt_tokens + completion_tokens)
                        succeeded = True
                        break
                    else:
                        last_err = f"HTTP {resp.status_code}: {resp.text[:200]}"
            except Exception as e:
                last_err = str(e)

        elapsed_ms = round((time.perf_counter() - start_t) * 1000, 1)
        if not succeeded:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"NVIDIA NIM error on '{model_id}': {last_err}",
            )

    return {
        "content": output_text,
        "latency_ms": elapsed_ms,
        "input_tokens": prompt_tokens,
        "output_tokens": completion_tokens,
        "total_tokens": total_tokens,
        "provider": provider_name,
        "is_free": is_free,
        "cost_cents": cost_cents,
        "cost_label": cost_label,
        "model_id": model_id,
        "status": "success",
    }


# -----------------------------------------------------------------------------
# Codebase Self-Inspection, Diagnostics, and Meta-Cognitive APIs
# -----------------------------------------------------------------------------

class CodeReadRequest(BaseModel):
    path: str = Field(..., description="File path relative to repository root (e.g. 'backend/app/config.py')")
    start_line: Optional[int] = Field(1, ge=1, description="1-indexed starting line number")
    end_line: Optional[int] = Field(150, ge=1, description="1-indexed ending line number")


class CodeSearchRequest(BaseModel):
    query: str = Field(..., min_length=2, description="Search term, symbol, or error string")
    directory: Optional[str] = Field("backend/app", description="Directory to search in (e.g. 'backend/app', 'dashboard')")
    max_results: Optional[int] = Field(30, ge=1, le=100, description="Maximum results to return")


class ErrorDiagnoseRequest(BaseModel):
    error_message: str = Field(..., min_length=3, description="Exception message or error text")
    traceback: Optional[str] = Field(None, description="Optional stack trace string")


@router.post("/code/read")
async def read_codebase_file(req: CodeReadRequest):
    """
    Allows Friday and EDITH to inspect any source code file in the repository.
    Safely restricted to within project boundaries.
    """
    from app.brain.code_service import CodebaseService
    try:
        return CodebaseService.read_code_file(
            rel_path=req.path,
            start_line=req.start_line or 1,
            end_line=req.end_line or 150,
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/code/search")
async def search_codebase(req: CodeSearchRequest):
    """
    Searches the codebase for functions, classes, configuration keys, or error messages.
    """
    from app.brain.code_service import CodebaseService
    try:
        return CodebaseService.search_codebase(
            query=req.query,
            directory=req.directory or "backend/app",
            max_results=req.max_results or 30,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/code/tree")
async def get_codebase_tree(
    subdir: str = Query("backend/app", description="Subdirectory to traverse"),
    max_depth: int = Query(3, ge=1, le=5),
):
    """
    Returns file and directory tree hierarchy for AI architecture inspection.
    """
    from app.brain.code_service import CodebaseService
    try:
        return CodebaseService.get_structure(subdir=subdir, max_depth=max_depth)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/code/diagnose")
async def diagnose_code_error(req: ErrorDiagnoseRequest):
    """
    Takes an error message and optional traceback, locates the relevant codebase file and lines,
    and returns a root-cause explanation and fix recommendation.
    """
    from app.brain.code_service import CodebaseService
    try:
        return CodebaseService.diagnose_error(
            error_message=req.error_message,
            traceback_str=req.traceback,
        )
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.get("/diagnostics")
async def get_system_diagnostics(session: AsyncSession = Depends(get_db)):
    """
    Returns operational diagnostics, database table counts, and active model telemetry.
    """
    from app.brain.code_service import CodebaseService
    return await CodebaseService.get_system_diagnostics(
        session=session,
        org_id=settings.DEFAULT_ORG_ID,
    )


# ---------------------------------------------------------------------------
# Chat-Driven Agentic Campaign Creation (Section 6)
# ---------------------------------------------------------------------------

class CampaignDraftLaunchRequest(BaseModel):
    draft: Dict[str, Any] = Field(..., description="The validated campaign draft spec")
    launch: bool = Field(True, description="Whether to enroll leads and launch immediately")


@router.post("/campaign-draft", summary="Draft a campaign via Friday and validate with EDITH")
async def draft_campaign(
    payload: Dict[str, Any],
    session: AsyncSession = Depends(get_db),
):
    """
    Agentic campaign drafting flow:
    1. Operator describes campaign intent in natural language.
    2. Friday drafts a structured campaign specification.
    3. Friday submits draft to EDITH over the Inter-Brain Bus for guardrail validation.
    4. Returns structured draft + EDITH verdict + reasoning + live matching lead count.
    """
    from app.services import campaign_drafting
    import uuid

    message = payload.get("message", "")
    if not message or len(message.strip()) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Please provide a descriptive prompt for the campaign you wish to create.",
        )

    history = payload.get("history", [])

    try:
        # Step 1: Friday drafts campaign specification from prompt
        draft = await campaign_drafting.draft_campaign_from_text(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            operator_message=message,
            history=history,
        )

        # Step 2: EDITH validates against commercial & operational guardrails
        validation = await campaign_drafting.validate_draft_with_edith(
            session=session,
            org_id=settings.DEFAULT_ORG_ID,
            draft=draft,
        )

        draft_id = f"draft_{uuid.uuid4().hex[:8]}"

        friday_explanation = (
            f"I have drafted campaign '{draft['name']}' targeting segment '{draft['target_segment']}' "
            f"with a daily volume of {draft['daily_limit']} messages. "
            f"EDITH has completed validation: verdict is **{validation['verdict']}**."
        )

        return {
            "draft_id": draft_id,
            "draft": draft,
            "validation": validation,
            "friday_explanation": friday_explanation,
            "edith_verdict": validation["verdict"],
            "edith_reasoning": validation["reasoning"],
            "matched_lead_count": validation["matched_lead_count"],
            "ready_to_launch": validation["is_valid"],
        }
    except Exception as e:
        logger.error(f"[Brain] Error drafting campaign: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to draft campaign: {str(e)}",
        )


@router.post("/campaign-draft/launch", summary="Approve and launch a drafted campaign")
async def launch_drafted_campaign(
    payload: CampaignDraftLaunchRequest,
    session: AsyncSession = Depends(get_db),
):
    """
    Approves and launches a campaign drafted through the Friday chat flow.
    Creates Campaign row and enrolls matching leads as CampaignLead records.
    """
    from app.services import campaign_drafting

    draft = payload.draft
    if not draft or "name" not in draft or "initial_message_template" not in draft:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid draft payload: missing required fields 'name' or 'initial_message_template'.",
        )

    success, message, campaign = await campaign_drafting.create_and_launch_from_draft(
        session=session,
        org_id=settings.DEFAULT_ORG_ID,
        draft=draft,
        launch=payload.launch,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=message,
        )

    return {
        "success": True,
        "message": message,
        "campaign_id": campaign.id if campaign else None,
        "campaign_name": campaign.name if campaign else None,
        "status": campaign.status if campaign else "draft",
        "total_leads": campaign.total_leads if campaign else 0,
    }

