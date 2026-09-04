"""
Core AI layer types, schemas, and capability definitions for WB-Agent (EDITH).
Supports dual-key NIM routing, fail-closed safety verdicts, and reasoning trace capture.
"""

from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class Capability(str, Enum):
    """
    Standard capability routes defined in Directive §3.
    Each capability maps to a configured fallback chain.
    """
    CORE_BRAIN = "core_brain"
    INTENT_SCORING = "intent_scoring"
    PRICING_EXTRACTION = "pricing_extraction"
    VOICE_UNDERSTANDING = "voice_understanding"
    VISION_DOCUMENT = "vision_document"
    TRANSLATION = "translation"
    SAFETY_INPUT = "safety_input"
    SAFETY_OUTPUT = "safety_output"
    SYSTEM_WATCHDOG = "system_watchdog"


# §6 Dev-tooling model (flagged for developer / internal tooling, not wired into WhatsApp)
DEV_TOOLING_MODEL = "poolside/laguna-xs-2.1"


class ModelMessage(BaseModel):
    """Single conversational turn message."""
    role: str
    content: str
    name: Optional[str] = None


class ModelRequest(BaseModel):
    """Standardized invocation request for any model in the router."""
    messages: List[ModelMessage]
    temperature: float = 0.2
    max_tokens: int = 1024
    tools: Optional[List[Dict[str, Any]]] = None
    response_format: Optional[Dict[str, Any]] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ModelResponse(BaseModel):
    """Standardized model response with reasoning traces and observability metadata."""
    content: str
    reasoning_content: Optional[str] = None
    model: str
    provider: str = "nvidia"
    key_alias: str = "primary"  # 'primary' or 'fallback'
    fallback_depth: int = 0
    latency_ms: int = 0
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0
    tool_calls: Optional[List[Dict[str, Any]]] = None
    raw_data: Optional[Dict[str, Any]] = None


class SafetyVerdict(BaseModel):
    """
    Two-stage fail-closed safety verdict (§3.G).
    If either stage fails or is unsafe, it fails closed to hold for human review.
    """
    is_safe: bool
    reason: Optional[str] = None
    held_for_human: bool = False
    model_used: Optional[str] = None
    key_used: Optional[str] = None
    latency_ms: int = 0


class WatchdogIssue(BaseModel):
    """Single diagnostic issue discovered by the Autonomous Watchdog Model."""
    severity: str = "WARNING"  # CRITICAL, WARNING, INFO
    category: str  # STALLED_LEAD, PRICING_MISMATCH, BRIDGE_HEALTH, SAFETY_HOLD, LATENCY_SPIKE, GENERAL
    title: str
    description: str
    target_link: Optional[str] = None
    recommended_action: Optional[str] = None


class WatchdogAuditReport(BaseModel):
    """Structured report produced by the Autonomous Watchdog model."""
    overall_health: str = "HEALTHY"  # HEALTHY, DEGRADED, CRITICAL
    issues_found: List[WatchdogIssue] = Field(default_factory=list)
    system_verdict: str
    model_used: str = "openai/gpt-oss-20b"
    latency_ms: int = 0
