"""
Consultative Sales Engine & Next-Best-Action Decision Maker for EDITH (Sections 10, 11, 12, 24, 25, 33).
Implements SPIN-style discovery, consultative objection handling, single-question selection,
and deterministic purchase-intent handoff triggers.
"""

import re
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional, Set
from app.agent.extractor import ExtractedFacts


@dataclass
class SalesDecision:
    """Structured decision output dictating EDITH's next conversational action."""
    action: str  # ASK_DISCOVERY_QUESTION, RECOMMEND_PRODUCT, PROVIDE_QUOTE, HANDLE_OBJECTION, HANDOFF_READY_BUYER, ANSWER, ESCALATE_HUMAN
    reason: str
    customer_goal: str
    target_stage: str
    score_delta: int
    missing_information: List[str] = field(default_factory=list)
    suggested_question: Optional[str] = None
    recommended_product: Optional[str] = None
    handoff_required: bool = False
    is_unknown_question: bool = False


class QuestionSelectionEngine:
    """
    Selects the single most valuable missing information to advance the sale without interrogation.
    Ensures EDITH never asks questions that are already answered in lead data, customer memory, or current turn.
    """

    # Priority of discovery attributes: (field_name, prompt_suggestion, business_importance)
    DISCOVERY_PRIORITY = [
        ("quantity", "What approximate volume or monthly quantity does your establishment typically require?", 10),
        ("use_case", "Are you primarily brewing strong milk tea (chai) or offering light orthodox liquor tea?", 8),
        ("location", "Which city or destination pin-code would we be dispatching this to?", 7),
        ("business_type", "Could you share the type of establishment you operate (e.g. café, restaurant, hotel, or retail)?", 6),
        ("packaging", "Do you prefer bulk 20kg food-grade jute bags or vacuum-sealed foil chests?", 5),
    ]

    @classmethod
    def select_next_question(
        cls,
        known_keys: Set[str],
        current_stage: str,
    ) -> Optional[tuple[str, str]]:
        """
        Returns (field_name, suggested_question) for the highest-value missing attribute.
        Returns None if all essential operational parameters are already known.
        """
        for field_name, question, _ in cls.DISCOVERY_PRIORITY:
            if field_name not in known_keys:
                return field_name, question
        return None


class ConsultativeSalesEngine:
    """
    Coordinates consultative sales methodology, active listening, and next-best-action decisions for EDITH.
    """

    @classmethod
    def decide(
        cls,
        current_stage: str,
        current_score: int,
        inbound_text: str,
        facts: ExtractedFacts,
        known_profile: Dict[str, Any],
        matched_products: List[Dict[str, Any]],
        knowledge_available: bool = True,
    ) -> SalesDecision:
        lower = inbound_text.lower()
        known_keys = set(known_profile.keys())

        # Update known keys from current turn facts
        if facts.quantity or facts.quantity_numeric_kg:
            known_keys.add("quantity")
        if facts.business_type:
            known_keys.add("business_type")
        if facts.use_case:
            known_keys.add("use_case")
        if facts.location:
            known_keys.add("location")
        if facts.packaging:
            known_keys.add("packaging")
        if facts.budget_raw or facts.budget_numeric_inr:
            known_keys.add("budget")

        # 1. Purchase Intent Detection (Highest Priority, Section 25)
        if facts.is_ready_to_buy or any(w in lower for w in ["send invoice", "how do i pay", "i want to order", "place order", "i'll buy", "lets proceed"]):
            return SalesDecision(
                action="HANDOFF_READY_BUYER",
                reason="Explicit purchase intent detected from customer message. Handoff to human operator for order closing.",
                customer_goal="Finalize purchase and receive commercial invoice",
                target_stage="PURCHASE_INTENT",
                score_delta=+25,
                handoff_required=True,
            )

        # 2. Urgent / Frustrated / Human Escalation
        if facts.emotional_state in ("ANGRY", "FRUSTRATED") or any(w in lower for w in ["talk to human", "speak to owner", "call me", "scam", "useless"]):
            return SalesDecision(
                action="ESCALATE_HUMAN",
                reason="Customer frustration or explicit request for human authority detected.",
                customer_goal="Speak with business representative directly",
                target_stage="HUMAN_HANDOFF",
                score_delta=-5,
                handoff_required=True,
            )

        # 3. Unknown Business Information Detection (Section 19 & 21)
        # Questions asking for things outside normal tea catalog, e.g. tea seeds, land, investments, private label contracts
        unsupported_topics = [
            "tea seeds", "seeds", "seed", "beej", "bij", "plant seeds", "gardening",
            "farming", "khet", "ket", "zameen", "acres", "bagan seeds", "horticulture",
            "machinery", "fertilizer", "land", "nursery", "sapling", "saplings", "trees"
        ]
        if any(topic in lower for topic in unsupported_topics) and not knowledge_available:
            return SalesDecision(
                action="ANSWER",
                reason="Customer inquired about tea seeds/nursery/farming items which are outside verified business offerings.",
                customer_goal="Inquire about tea seeds / farming",
                target_stage=current_stage,
                score_delta=0,
                is_unknown_question=True,
            )

        # 4. Objection Handling (Section 33)
        if facts.objections:
            objection = facts.objections[0]
            if objection == "price_too_high":
                return SalesDecision(
                    action="HANDLE_OBJECTION",
                    reason="Price objection detected. Emphasize cuppage yield, volume discount tiers, or low-cost hotel blend alternative.",
                    customer_goal="Optimize cost-per-cup or negotiate wholesale rate",
                    target_stage="OBJECTION",
                    score_delta=+5,
                )
            elif objection == "needs_quality_proof":
                return SalesDecision(
                    action="HANDLE_OBJECTION",
                    reason="Quality verification concern. Offer 200g commercial tasting kit for registered commercial buyers.",
                    customer_goal="Verify tea grade, aroma, and liquor strength before bulk commitment",
                    target_stage="OBJECTION",
                    score_delta=+10,
                )

        # 5. Product Recommendation (When needs or use case are clear)
        if (facts.use_case or "use_case" in known_keys) and matched_products:
            best_match = matched_products[0]
            next_q = QuestionSelectionEngine.select_next_question(known_keys, current_stage)
            target = "DISCOVERY" if current_stage in ("NEW", "CONTACTED") else "RECOMMENDATION"
            return SalesDecision(
                action="RECOMMEND_PRODUCT" if current_stage not in ("NEW", "CONTACTED") else "ASK_DISCOVERY_QUESTION",
                reason=f"Recommended {best_match.get('name')} based on customer use-case and quality fit." if current_stage not in ("NEW", "CONTACTED") else f"Initiate discovery for operational requirement: {next_q[0] if next_q else 'volume'}.",
                customer_goal="Find optimal tea grade for menu/beverage service",
                target_stage=target,
                score_delta=+15 if target == "RECOMMENDATION" else +10,
                recommended_product=best_match.get("name"),
                missing_information=[next_q[0]] if next_q else [],
                suggested_question=next_q[1] if next_q else None,
            )

        # 6. Pricing Inquiry / Quote Request
        if (
            re.search(r"\b(?:price|rate|rates|cost|quote|quotation|pricing)\b", lower)
            or any(w in lower for w in ["how much", "kitna"])
        ):
            next_q = QuestionSelectionEngine.select_next_question(known_keys, current_stage)
            return SalesDecision(
                action="PROVIDE_QUOTE",
                reason="Customer asked for wholesale pricing. Provide verified catalog rates and volume discount structure.",
                customer_goal="Understand commercial wholesale pricing structure",
                target_stage="QUALIFIED" if current_stage in ("NEW", "CONTACTED", "DISCOVERY") else current_stage,
                score_delta=+10,
                missing_information=[next_q[0]] if next_q else [],
                suggested_question=next_q[1] if next_q else None,
            )

        # 7. Consultative Discovery Question
        next_q = QuestionSelectionEngine.select_next_question(known_keys, current_stage)
        if next_q:
            return SalesDecision(
                action="ASK_DISCOVERY_QUESTION",
                reason=f"Gather missing operational requirement: {next_q[0]}.",
                customer_goal="Explore commercial tea supply options",
                target_stage="DISCOVERY" if current_stage in ("NEW", "CONTACTED") else current_stage,
                score_delta=+5,
                missing_information=[next_q[0]],
                suggested_question=next_q[1],
            )

        # 8. Default Professional Consultative Response
        return SalesDecision(
            action="ANSWER",
            reason="Provide helpful, professional consultative response grounded in verified estate information.",
            customer_goal="Learn about North Bengal Tea Co. offerings",
            target_stage=current_stage,
            score_delta=+2,
        )
