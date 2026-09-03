"""
Self-Reflective Critic & Response Refinement Engine for EDITH (Section 75, 135).
Performs internal pre-send evaluation to verify that drafted responses are consultative,
grounded in verified business facts, free of pushy language, and optimized for deal progression.
"""

import re
from typing import Any, Dict, List, Tuple
from app.utils.logging import logger


class SelfReflectiveCritic:
    """
    Evaluates and refines drafted responses before final WhatsApp dispatch.
    """

    CRITIQUE_RULES = [
        ("no_hallucinated_delivery", r"\b(?:zero[\s-]damage|guaranteed\s*1[\s-]day|100%\s*damage[\s-]free)\b"),
        ("no_desperate_pressure", r"\b(?:buy\s*now\s*or\s*miss|limited\s*time\s*only|last\s*chance|hurry\s*up)\b"),
        ("no_fake_horticulture", r"\b(?:we\s*grow\s*tea\s*seeds|tea\s*seeds\s*for\s*sale|nursery\s*saplings)\b"),
    ]

    @classmethod
    def evaluate(
        cls,
        draft: str,
        customer_goal: str = "",
        emotional_state: str = "NEUTRAL",
    ) -> Tuple[bool, List[str]]:
        """
        Runs quality and grounding audit on the drafted message.
        Returns (passes_all_checks, list_of_defects).
        """
        defects = []
        lower = draft.lower()

        # 1. Check for prohibited claims or aggressive sales language
        for rule_name, pattern in cls.CRITIQUE_RULES:
            if re.search(pattern, lower):
                defects.append(rule_name)

        # 2. Check length (WhatsApp messages should not be 1000-word walls of text)
        if len(draft.split()) > 180:
            defects.append("overly_verbose")

        # 3. Check for multiple interrogations (never ask more than 2 questions)
        question_count = draft.count("?")
        if question_count > 2:
            defects.append("too_many_questions")

        # 4. Check tone appropriateness for frustrated customers
        if emotional_state in ("FRUSTRATED", "ANGRY") and question_count > 1:
            defects.append("frustrated_customer_interrogation")

        return (len(defects) == 0, defects)

    @classmethod
    def critique_and_refine(
        cls,
        draft: str,
        customer_goal: str = "",
        emotional_state: str = "NEUTRAL",
    ) -> str:
        """
        Evaluates the draft. If defects are found, refines the response into a polished,
        consultative response before sending.
        """
        passes, defects = cls.evaluate(draft, customer_goal, emotional_state)
        if passes:
            return draft

        logger.info(f"Self-reflective critic detected issues {defects}. Applying consultative refinement.")
        refined = draft

        # Refine rule 1: remove unsupported delivery guarantees
        refined = re.sub(
            r"\b(?:we promise zero damage|guaranteed 100% damage-free|zero damage)\b",
            "secure food-grade bulk packaging with moisture barriers",
            refined,
            flags=re.IGNORECASE,
        )

        # Refine rule 2: remove fake seeds / horticulture claims
        if "no_fake_horticulture" in defects:
            refined = (
                "North Bengal Tea Co. specializes directly in finished commercial wholesale black, green, "
                "and CTC teas for hospitality and retail. We do not supply agricultural tea seeds or planting stock, "
                "but we would be glad to share our estate tea catalog for your beverage menu."
            )

        # Refine rule 3: prune excessive questions if interrogating
        if "too_many_questions" in defects or "frustrated_customer_interrogation" in defects:
            # Keep only the first question, prune subsequent interrogations
            parts = refined.split("?")
            if len(parts) >= 2:
                refined = parts[0] + "?"

        return refined.strip()
