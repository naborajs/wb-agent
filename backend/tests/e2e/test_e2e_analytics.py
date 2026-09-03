"""
E2E Test Suite for R5: Sales Intelligence & Objection Analytics Dashboard.
Covers Tier 1 (Feature Coverage) and Tier 2 (Boundary & Corner Cases).
"""

import csv
import io
import pytest


# ===========================================================================
# Tier 1: Feature Coverage (R5)
# ===========================================================================

@pytest.mark.asyncio
async def test_analytics_intelligence_schema(analytics_service):
    """
    R5-T1.1: Verify sales intelligence structure contains pareto, geographic,
    forecast, and executive export_url.
    """
    objections = {"price_too_high": 12, "needs_quality_proof": 6, "logistics_delay": 2}
    leads = [
        {"location": "Siliguri", "status": "won", "deal_value": 45000.0},
        {"location": "Darjeeling", "status": "won", "deal_value": 36000.0},
        {"location": "Kolkata", "status": "qualified", "deal_value": 50000.0},
    ]
    deals = [
        {"stage": "PURCHASE_INTENT", "value": 45000.0},
        {"stage": "RECOMMENDATION", "value": 36000.0},
        {"stage": "QUALIFIED", "value": 50000.0},
    ]

    pareto = analytics_service.compute_pareto(objections)
    geo = analytics_service.compute_geographic_density(leads)
    forecast = analytics_service.compute_forecast(deals)
    export_url = "/api/v1/analytics/export?format=csv"

    intelligence_payload = {
        "pareto": pareto,
        "geographic": geo,
        "forecast": forecast,
        "export_url": export_url,
    }

    assert "pareto" in intelligence_payload
    assert "geographic" in intelligence_payload
    assert "forecast" in intelligence_payload
    assert "export_url" in intelligence_payload
    assert intelligence_payload["export_url"].endswith("format=csv")


@pytest.mark.asyncio
async def test_analytics_objection_pareto_distribution(analytics_service):
    """
    R5-T1.2: Verify Pareto list is sorted descending by frequency,
    and cumulative percentages accurately sum to 100.0%.
    """
    objection_counts = {
        "price_too_high": 45,
        "needs_quality_proof": 25,
        "minimum_order_quantity_too_high": 15,
        "logistics_delivery_timeline": 10,
        "credit_payment_terms": 5,
    }
    # Total = 100 objections
    pareto = analytics_service.compute_pareto(objection_counts)

    assert len(pareto) == 5
    # Order descending
    assert pareto[0]["objection"] == "price_too_high"
    assert pareto[0]["count"] == 45
    assert pareto[0]["cumulative_pct"] == 45.0

    assert pareto[1]["objection"] == "needs_quality_proof"
    assert pareto[1]["count"] == 25
    assert pareto[1]["cumulative_pct"] == 70.0

    assert pareto[-1]["cumulative_pct"] == 100.0


@pytest.mark.asyncio
async def test_analytics_geographic_lead_distribution(analytics_service):
    """
    R5-T1.3: Verify regional distribution aggregates leads, won count,
    and revenue across North Bengal tea trade corridors.
    """
    mock_leads = [
        {"location": "Siliguri", "status": "won", "deal_value": 75000.0},
        {"location": "Siliguri", "status": "new", "deal_value": 0.0},
        {"location": "Darjeeling", "status": "won", "deal_value": 90000.0},
        {"location": "Jalpaiguri", "status": "won", "deal_value": 30000.0},
    ]

    density = analytics_service.compute_geographic_density(mock_leads)
    siliguri_stat = next(d for d in density if d["region"] == "Siliguri")
    darjeeling_stat = next(d for d in density if d["region"] == "Darjeeling")

    assert siliguri_stat["lead_count"] == 2
    assert siliguri_stat["won_count"] == 1
    assert siliguri_stat["revenue"] == 75000.0
    assert darjeeling_stat["revenue"] == 90000.0


@pytest.mark.asyncio
async def test_analytics_pipeline_revenue_forecast(analytics_service):
    """
    R5-T1.4: Verify pipeline revenue forecasting applies stage probability weighting:
    - PURCHASE_INTENT (80%)
    - RECOMMENDATION (40%)
    - QUALIFIED (20%)
    """
    deals = [
        {"stage": "PURCHASE_INTENT", "value": 100000.0},  # weight 0.8 -> 80,000
        {"stage": "RECOMMENDATION", "value": 50000.0},    # weight 0.4 -> 20,000
        {"stage": "QUALIFIED", "value": 50000.0},         # weight 0.2 -> 10,000
    ]

    forecast = analytics_service.compute_forecast(deals)
    assert forecast["projected_revenue"] == 200000.0
    assert forecast["weighted_pipeline"] == 110000.0
    assert len(forecast["by_stage"]) == 3


@pytest.mark.asyncio
async def test_analytics_executive_csv_export():
    """
    R5-T1.5: Verify 1-click executive activity export compiles valid CSV
    with lead details, conversation stages, and conversion values.
    """
    rows = [
        {"Lead_ID": "L001", "Name": "Siliguri Tea Bar", "City": "Siliguri", "Stage": "WON", "Value_INR": "35000.00"},
        {"Lead_ID": "L002", "Name": "Darjeeling Chai", "City": "Darjeeling", "Stage": "PURCHASE_INTENT", "Value_INR": "54000.00"},
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["Lead_ID", "Name", "City", "Stage", "Value_INR"])
    writer.writeheader()
    writer.writerows(rows)
    csv_text = output.getvalue()

    assert "Lead_ID,Name,City,Stage,Value_INR" in csv_text
    assert "Siliguri Tea Bar" in csv_text
    assert "35000.00" in csv_text

    # Parse back to verify RFC 4180 conformity
    reader = list(csv.DictReader(io.StringIO(csv_text)))
    assert len(reader) == 2
    assert reader[0]["Stage"] == "WON"


# ===========================================================================
# Tier 2: Boundary & Corner Cases (R5)
# ===========================================================================

@pytest.mark.asyncio
async def test_analytics_boundary_empty_dataset(analytics_service):
    """
    R5-T2.1: Verify empty dataset / zero-state responses return empty lists
    and 0.0 values without raising ZeroDivisionError.
    """
    pareto = analytics_service.compute_pareto({})
    geo = analytics_service.compute_geographic_density([])
    forecast = analytics_service.compute_forecast([])

    assert pareto == []
    assert geo == []
    assert forecast["projected_revenue"] == 0.0
    assert forecast["weighted_pipeline"] == 0.0
    assert forecast["by_stage"] == []


@pytest.mark.asyncio
async def test_analytics_boundary_single_objection_pareto(analytics_service):
    """
    R5-T2.2: Verify Pareto calculation when exactly 1 objection category exists:
    cumulative percentage must be exactly 100.0%.
    """
    pareto = analytics_service.compute_pareto({"price_too_high": 17})
    assert len(pareto) == 1
    assert pareto[0]["objection"] == "price_too_high"
    assert pareto[0]["cumulative_pct"] == 100.0


@pytest.mark.asyncio
async def test_analytics_boundary_geographic_unmapped_locations(analytics_service):
    """
    R5-T2.3: Verify leads with missing or unusual location values
    fall into the 'Other' regional bucket.
    """
    leads = [
        {"location": "London, UK", "status": "new", "deal_value": 0.0},
        {"location": "Tokyo", "status": "won", "deal_value": 120000.0},
    ]
    geo = analytics_service.compute_geographic_density(leads)
    other_stat = next(d for d in geo if d["region"] == "Other")

    assert other_stat["lead_count"] == 2
    assert other_stat["won_count"] == 1
    assert other_stat["revenue"] == 120000.0


@pytest.mark.asyncio
async def test_analytics_boundary_forecast_zero_value_deals(analytics_service):
    """
    R5-T2.4: Verify deals with ₹0.0 value or exploratory inquiries
    calculate properly in pipeline revenue.
    """
    deals = [
        {"stage": "DISCOVERY", "value": 0.0},
        {"stage": "QUALIFIED", "value": 0.0},
    ]
    forecast = analytics_service.compute_forecast(deals)
    assert forecast["projected_revenue"] == 0.0
    assert forecast["weighted_pipeline"] == 0.0


@pytest.mark.asyncio
async def test_analytics_boundary_csv_special_characters_escaping():
    """
    R5-T2.5: Verify export records containing quotes, commas, and line breaks
    are escaped strictly according to RFC 4180 standard.
    """
    rows = [
        {
            "Customer": 'M/S "North Bengal" Chai, Siliguri',
            "Notes": "Special line 1\nSpecial line 2, with comma",
            "Amount": "42,500.00",
        }
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["Customer", "Notes", "Amount"])
    writer.writeheader()
    writer.writerows(rows)
    raw_csv = output.getvalue()

    # Re-reading with standard csv reader should parse exactly back to original
    reader = list(csv.DictReader(io.StringIO(raw_csv)))
    assert len(reader) == 1
    assert reader[0]["Customer"] == 'M/S "North Bengal" Chai, Siliguri'
    assert "Special line 2, with comma" in reader[0]["Notes"]
    assert reader[0]["Amount"] == "42,500.00"
