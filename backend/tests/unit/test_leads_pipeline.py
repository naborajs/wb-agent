"""
Unit and integration tests for the Lead Ingestion Pipeline and Lead Sources (CSV & Apify).
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.database.base import Base
from app.database.models import Organization, Lead, LeadEvent
from app.leads.normalizer import normalize_lead_data, split_full_name
from app.leads.validator import validate_lead_record
from app.leads.sources.csv import CsvLeadSource
from app.leads.sources.apify import ApifyLeadSource
from app.leads.importer import LeadImportPipeline


def test_split_full_name():
    first, last = split_full_name("Rahul Sharma")
    assert first == "Rahul"
    assert last == "Sharma"

    first, last = split_full_name("Cher")
    assert first == "Cher"
    assert last is None

    first, last = split_full_name(None)
    assert first is None
    assert last is None


def test_normalize_lead_data():
    raw = {
        "phone": "8900653250",
        "name": "Subhashish Bose",
        "email": "Subhashish@Example.com ",
        "company_name": "Darjeeling Chai Co",
    }
    norm = normalize_lead_data(raw)
    assert norm["phone"] == "+918900653250"
    assert norm["first_name"] == "Subhashish"
    assert norm["last_name"] == "Bose"
    assert norm["email"] == "subhashish@example.com"
    assert norm["country"] == "India"


def test_validate_lead_record():
    # Valid lead
    valid_lead = {"phone": "+918900653250", "opt_in_status": True}
    is_valid, errors, is_eligible = validate_lead_record(valid_lead)
    assert is_valid is True
    assert len(errors) == 0
    assert is_eligible is True

    # Opted-out lead (ineligible)
    opted_out = {"phone": "+918900653250", "opt_in_status": False}
    is_valid, errors, is_eligible = validate_lead_record(opted_out)
    assert is_eligible is False

    # Missing phone
    missing_phone = {"opt_in_status": True}
    is_valid, errors, is_eligible = validate_lead_record(missing_phone)
    assert is_valid is False
    assert any("phone" in e for e in errors)


@pytest.mark.asyncio
async def test_csv_import_pipeline_with_row_errors_and_deduplication():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = "org_tea_leads_test"
    async with session_factory() as session:
        org = Organization(id=org_id, name="Tea Test", slug="tea-test")
        session.add(org)
        await session.commit()

    csv_content = """phone,name,company_name,company_type,opt_in_status,estimated_quantity
8900653250,Rajiv Sen,Sen Tea Bar,Cafe,true,50kg
+918900653250,Rajiv Sen (Duplicate),Sen Tea Bar,Cafe,true,50kg
9832012345,Anita Paul,Paul Sweets & Tea,Restaurant,true,100kg
invalid_phone,Bad Record,Nowhere,None,true,10kg
9832099999,No Consent,Opted Out Cafe,Cafe,false,20kg
"""

    csv_source = CsvLeadSource(csv_content)

    async with session_factory() as session:
        pipeline = LeadImportPipeline(session, org_id)
        summary = await pipeline.run(csv_source)

        assert summary.total_rows == 5
        assert summary.imported == 2  # Rajiv Sen and Anita Paul
        assert summary.duplicate == 1  # Rajiv Sen duplicate phone
        assert summary.invalid == 1  # invalid_phone
        assert summary.ineligible == 1  # false opt-in

        # Verify leads in database
        stmt = select(Lead).where(Lead.org_id == org_id)
        res = await session.execute(stmt)
        leads = res.scalars().all()
        assert len(leads) == 2

        # Verify LeadEvent emitted
        event_stmt = select(LeadEvent).where(LeadEvent.org_id == org_id)
        ev_res = await session.execute(event_stmt)
        events = ev_res.scalars().all()
        assert len(events) == 2

    await engine.dispose()


@pytest.mark.asyncio
async def test_apify_lead_source_mock():
    mock_dataset = [
        {
            "phone_number": "+919876543210",
            "business_name": "Himalayan Brews",
            "category": "Cafe",
            "city": "Darjeeling",
            "opt_in_status": True,
        }
    ]
    apify_source = ApifyLeadSource(
        api_token="mock_token",
        mock_items=mock_dataset
    )
    items = []
    async for item in apify_source.fetch_leads():
        items.append(item)

    assert len(items) == 1
    assert items[0]["phone"] == "+919876543210"
    assert items[0]["company_name"] == "Himalayan Brews"
    assert items[0]["lead_source"] == "apify"
