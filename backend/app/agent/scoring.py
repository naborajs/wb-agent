"""
Transparent 0-100 Lead Scoring Engine (Section 29).

Calculates qualification scores with explicit audit reasons.
"""

from typing import Dict, List, Tuple
from pydantic import BaseModel


class ScoreChange(BaseModel):
    reason: str
    delta: int


class LeadScoringEngine:
    """
    Evaluates customer behavior and conversation signals to calculate 0-100 score.
    """

    FACTORS: Dict[str, int] = {
        "reply_received": 10,
        "company_name_provided": 10,
        "company_type_provided": 10,
        "product_inquiry": 10,
        "volume_specified": 15,
        "location_provided": 5,
        "sample_requested": 15,
        "price_requested": 10,
        "objection_resolved": 10,
        "purchase_intent": 25,
        "opt_out": -50,
        "inactivity_penalty": -10,
    }

    @classmethod
    def evaluate_signals(cls, current_score: int, signals: List[str]) -> Tuple[int, List[ScoreChange]]:
        """
        Applies a list of behavioral signal keys, clamping score between 0 and 100.
        """
        changes: List[ScoreChange] = []
        new_score = current_score

        for sig in signals:
            if sig in cls.FACTORS:
                delta = cls.FACTORS[sig]
                new_score = max(0, min(100, new_score + delta))
                changes.append(
                    ScoreChange(
                        reason=f"{'+' if delta >= 0 else ''}{delta} for {sig.replace('_', ' ')}",
                        delta=delta,
                    )
                )

        return new_score, changes

    @classmethod
    async def evaluate_live_scoring_with_llm(
        cls,
        inbound_text: str,
        current_score: int,
        detected_signals: List[str],
    ) -> Tuple[int, List[ScoreChange]]:
        """
        Live lead scoring refinement using Capability B router chain (Directive §3.B)
        to identify implicit high-intent wholesale buying signals.
        """
        base_score, changes = cls.evaluate_signals(current_score, detected_signals)
        from app.ai.router import ai_router
        from app.ai.types import Capability, ModelMessage, ModelRequest
        import json

        req = ModelRequest(
            messages=[
                ModelMessage(
                    role="system",
                    content=(
                        "Evaluate wholesale lead qualification for B2B tea buyer. Output JSON with any additional detected signals: "
                        "{\"additional_signals\": [\"sample_requested\", \"volume_specified\", \"purchase_intent\"]}"
                    ),
                ),
                ModelMessage(role="user", content=inbound_text),
            ],
            temperature=0.1,
            max_tokens=64,
            metadata={"capability": "intent_scoring"},
        )
        try:
            resp = await ai_router.execute(Capability.INTENT_SCORING, req)
            data = json.loads(resp.content)
            add_sigs = [s for s in data.get("additional_signals", []) if s in cls.FACTORS and s not in detected_signals]
            if add_sigs:
                base_score, extra_changes = cls.evaluate_signals(base_score, add_sigs)
                changes.extend(extra_changes)
        except Exception:
            pass
        return base_score, changes
