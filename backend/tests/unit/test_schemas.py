"""
Unit tests for Pydantic v2 schemas: validation, serialization, and constraints.
"""

from decimal import Decimal
import pytest
from app.schemas.leads import LeadCreate, LeadUpdate, LeadResponse
from app.schemas.products import PriceCalculationRequest, PriceCalculationResponse
from app.schemas.agent import StructuredDecision


def test_lead_create_validation():
    lead_data = {
        "phone": "+918900653250",
        "name": "Amit Roy",
        "company_name": "Roy Tea Corner",
        "company_type": "Tea Shop",
        "product_interest": "Assam CTC Blend"
    }
    lead = LeadCreate(**lead_data)
    assert lead.phone == "+918900653250"
    assert lead.name == "Amit Roy"
    assert lead.country == "India"
    assert lead.opt_in_status is True


def test_pricing_calculation_schemas():
    req = PriceCalculationRequest(
        product_id="prod_darj_01",
        quantity_kg=Decimal("100.0"),
        customer_segment="cafe"
    )
    assert req.quantity_kg == Decimal("100.0")

    resp = PriceCalculationResponse(
        product_id="prod_darj_01",
        product_name="Darjeeling Second Flush",
        quantity_kg=Decimal("100.0"),
        base_price_per_kg=Decimal("800.0"),
        discount_percentage=Decimal("10.0"),
        effective_price_per_kg=Decimal("720.0"),
        subtotal=Decimal("80000.0"),
        discount_amount=Decimal("8000.0"),
        total=Decimal("72000.0"),
        requires_human_approval=False
    )
    assert resp.total == Decimal("72000.0")
    assert resp.effective_price_per_kg == Decimal("720.0")


def test_structured_decision_schema():
    decision = StructuredDecision(
        intent="price_inquiry",
        customer_goal="Get bulk pricing for 100kg Darjeeling tea",
        sales_stage="DISCOVERY",
        confidence=0.92,
        important_context=["Customer operates 3 cafés in Kolkata"],
        missing_information=["Delivery location timeline"],
        recommended_action="quote_price",
        tools_required=["calculate_price"],
        knowledge_required=["delivery_zones"],
        handoff_required=False,
        followup_required=True,
        reason_code="BULK_PRICE_REQUEST"
    )
    assert decision.confidence == 0.92
    assert decision.recommended_action == "quote_price"
    assert not decision.handoff_required
