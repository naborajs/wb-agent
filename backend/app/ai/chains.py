"""
Data-driven capability chains for NVIDIA NIM Multi-Model Layer.
Defines the primary and ordered fallback models for Capabilities A through G
per Directive §3, §4, §5, and §7.
"""

from typing import Dict, List
from app.ai.types import Capability
from app.config import settings

# Directive §7: At-risk model deprecation notice
# TODO: remove minimaxai/minimax-m3 deprecated model once upstream catalogue deprecation finishes
AT_RISK_MODELS: List[str] = (
    ["minimaxai/minimax-m3"] if getattr(settings, "ENABLE_MINIMAX_M3", False) else []
)

# Ordered fallback chains per capability (Directive §3)
# Every NIM model entry is tried on Primary Key then Fallback Key before moving to next model
CAPABILITY_CHAINS: Dict[Capability, List[str]] = {
    # Capability A: Core sales conversation brain
    # Deep reasoning with internal reasoning_content captured
    Capability.CORE_BRAIN: [
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-3.5-lightning-30b-a3b",
        "openai/gpt-oss-20b",
    ],
    # Capability B: Message-level intent routing + live lead scoring (0-100)
    # Ultra-low latency priority
    Capability.INTENT_SCORING: [
        "nvidia/nemotron-3.5-lightning-30b-a3b",
        "google/diffusiongemma-26b-a4b-it",
        "openai/gpt-oss-20b",
    ],
    # Capability C: Structured pricing / invoice data extraction
    # Structured JSON schemas, multi-item handling, arithmetic cross-check
    Capability.PRICING_EXTRACTION: [
        "nvidia/nemotron-3.5-lightning-30b-a3b",
        "nvidia/nemotron-3-super-120b-a12b",
        "openai/gpt-oss-20b",
    ],
    # Capability D: Voice note understanding (English / Hindi / Hinglish)
    # Primary: Nemotron Omni; Fallback 1: Gemini Live (audio-to-audio/transcribe); Fallback 2: Riva translate
    Capability.VOICE_UNDERSTANDING: [
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        "gemini-3.1-flash-live-preview",  # Handled via scoped Gemini Live audio client
        "nvidia/riva-translate-4b-instruct-v2",
    ],
    # Capability E: Image / document understanding (Tea specs, quotes, invoices, KYC docs)
    Capability.VISION_DOCUMENT: [
        "meta/llama-3.2-11b-vision-instruct",
        "meta/muse-glimmer-30b",
        "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
    ],
    # Capability F: Multilingual translation layer (37 languages)
    # Pure translation model; falls through to core conversational models without Gemini
    Capability.TRANSLATION: [
        "nvidia/riva-translate-4b-instruct-v2",
        "nvidia/nemotron-3-super-120b-a12b",
        "nvidia/nemotron-3.5-lightning-30b-a3b",
    ],
    # Capability G: Two-stage safety & guardrails (Fail-Closed)
    # These do NOT fall back to other models upon error or unsafe verdict
    Capability.SAFETY_INPUT: [
        "nvidia/nemotron-3.5-content-safety",
    ],
    Capability.SAFETY_OUTPUT: [
        "nvidia/llama-3.1-nemotron-safety-guard-8b-v3",
    ],
    # Capability H: Autonomous Quality Watchdog & System Supervisor
    # Impartial diagnostic logic, stalled lead detection, pricing sanity auditing
    Capability.SYSTEM_WATCHDOG: [
        "openai/gpt-oss-20b",
        "nvidia/nemotron-3.5-lightning-30b-a3b",
        "google/diffusiongemma-26b-a4b-it",
    ],
    # Capability: Modular Prompt Architect & Engineering Copilot
    # Primary: NemoTron 3 Ultra 550B; Fallback: NemoTron 3 Super 120B
    Capability.PROMPT_ARCHITECT: [
        "nvidia/nemotron-3-ultra-550b-a55b",
        "nvidia/nemotron-3-super-120b-a12b",
    ],
}


def get_capability_chain(capability: Capability) -> List[str]:
    """Returns the ordered model fallback chain for the specified capability."""
    chain = list(CAPABILITY_CHAINS.get(capability, []))
    if AT_RISK_MODELS and capability in (Capability.VISION_DOCUMENT, Capability.CORE_BRAIN):
        # Insert at-risk model at the tail only if explicitly enabled
        chain.extend(AT_RISK_MODELS)
    return chain
