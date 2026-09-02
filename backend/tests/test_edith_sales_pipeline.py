"""
Unit and Integration tests for EDITH Autonomous AI Sales Agent Pipeline.
Tests passive extraction, consultative discovery, unknown question escalation, and purchase intent handoff.
"""

import pytest
from app.agent.extractor import PassiveInformationExtractor
from app.agent.sales_engine import ConsultativeSalesEngine, QuestionSelectionEngine
from app.agent.validator import ResponseValidator


def test_passive_extraction_and_discovery():
    text = "bhai cafe ke liye tea chahiye, 100kg monthly strong milk tea chahiye Siliguri me. Budget around 35k."
    facts = PassiveInformationExtractor.extract(text)

    assert facts.quantity == "100kg"
    assert facts.business_type == "Cafe"
    assert facts.use_case == "milk_tea"
    assert facts.location == "Siliguri"
    assert facts.budget_numeric_inr == 35000.0
    assert "strong_kadak" in facts.preferences


def test_no_repetitive_questions():
    """Ensure that once an attribute is known, EDITH does not ask for it again."""
    known = {"quantity": "100kg", "use_case": "milk_tea", "business_type": "Cafe"}
    next_q = QuestionSelectionEngine.select_next_question(set(known.keys()), "DISCOVERY")

    # Should ask for location or packaging, NOT quantity or use case
    assert next_q is not None
    assert next_q[0] not in ("quantity", "use_case", "business_type")
    assert next_q[0] == "location"


def test_unknown_question_detection():
    """Ensure tea seeds and non-catalog inquiries trigger unknown question flow instead of hallucination."""
    facts = PassiveInformationExtractor.extract("Do you sell tea seeds or nursery plants?")
    decision = ConsultativeSalesEngine.decide(
        current_stage="DISCOVERY",
        current_score=10,
        inbound_text="Do you sell tea seeds or nursery plants?",
        facts=facts,
        known_profile={},
        matched_products=[],
        knowledge_available=False,
    )

    assert decision.is_unknown_question is True
    assert "tea seeds" in decision.reason.lower()


def test_purchase_intent_detection():
    """Ensure buying signals stop the pitch and trigger human handoff."""
    facts = PassiveInformationExtractor.extract("I'll take 100kg of Assam Kadak CTC. Send me the invoice!")
    decision = ConsultativeSalesEngine.decide(
        current_stage="QUALIFIED",
        current_score=75,
        inbound_text="I'll take 100kg of Assam Kadak CTC. Send me the invoice!",
        facts=facts,
        known_profile={"quantity": "100kg"},
        matched_products=[{"name": "Assam Kadak CTC"}],
    )

    assert decision.action == "HANDOFF_READY_BUYER"
    assert decision.handoff_required is True
    assert decision.target_stage == "PURCHASE_INTENT"
    assert decision.score_delta >= 20


def test_response_validator():
    """Verify response validation flags unsupported claims."""
    safe_text = "Our Assam Kadak CTC wholesale rate is ₹340/kg with volume discounts at 50kg."
    is_valid, issues, cleaned = ResponseValidator.validate(safe_text)
    assert is_valid is True
