"""
Unit tests for the Unified Knowledge Hub:
Tests tabular CSV/XLSX ingestion, multi-category RAG search, and deterministic sync.
"""

from decimal import Decimal
import io
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database.base import Base
from app.database.models import (
    KnowledgeCategory,
    KnowledgeChunk,
    KnowledgeItem,
    Organization,
    PricingRule,
    Product,
)
from app.knowledge.parser import parse_csv_structured, parse_tabular_or_document
from app.knowledge.ingestion import KnowledgeIngestionService
from app.knowledge.retrieval import KnowledgeRetrievalService


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        org = Organization(id=settings.DEFAULT_ORG_ID, name="Commercial Enterprise", slug="commercial-enterprise")
        session.add(org)
        await session.commit()
        yield session
    await engine.dispose()


def test_parse_csv_pricing_rules():
    csv_data = """rule_name,rule_type,min_quantity,max_quantity,discount_percentage,max_autonomous_discount_percentage,customer_segment
Starter Wholesale,volume_tier,50,99.99,5.0,5.0,all
Commercial Partner,volume_tier,100,499.99,10.0,7.5,wholesale
Bulk Enterprise,volume_tier,500,,15.0,10.0,enterprise
"""
    md_text, items = parse_csv_structured(csv_data, category="pricing_rule")
    assert len(items) == 3
    assert items[0]["rule_name"] == "Starter Wholesale"
    assert items[0]["min_quantity"] == 50.0
    assert items[0]["discount_percentage"] == 5.0
    assert items[1]["max_autonomous_discount_percentage"] == 7.5
    assert items[2]["max_quantity"] is None
    assert "| Starter Wholesale |" in md_text
    assert "| 10.0% |" in md_text


def test_parse_csv_catalog_products():
    csv_data = """sku,name,category,base_price,unit,min_order_quantity,in_stock,description
SKU-PROD-01,Heavy Duty Industrial Valve,Valves,850.00,unit,10,true,Cast iron valve
SKU-PROD-02,High Pressure Hose 5m,Hoses,320.00,unit,5,true,Reinforced rubber hose
"""
    md_text, items = parse_csv_structured(csv_data, category="catalog_product")
    assert len(items) == 2
    assert items[0]["sku"] == "SKU-PROD-01"
    assert items[0]["base_price"] == 850.00
    assert items[0]["min_order_quantity"] == 10.0
    assert items[0]["in_stock"] is True
    assert "| Heavy Duty Industrial Valve |" in md_text


@pytest.mark.asyncio
async def test_ingest_knowledge_item_and_sync(test_session: AsyncSession):
    org_id = settings.DEFAULT_ORG_ID
    svc = KnowledgeIngestionService(test_session, org_id)

    # 1. Ingest a Pricing Rule KnowledgeItem
    pr_item = await svc.ingest_knowledge_item(
        title="Tier 1: 50+ Volume Discount",
        content_text="Tier 1 volume discount provides 5% discount for 50-99 units.",
        category=KnowledgeCategory.PRICING_RULE.value,
        source_type="spreadsheet",
        min_quantity=Decimal("50.0"),
        max_quantity=Decimal("99.99"),
        discount_percentage=Decimal("5.0"),
        max_autonomous_discount=Decimal("5.0"),
        customer_segment="all",
    )
    assert pr_item.id is not None
    assert pr_item.chunk_count >= 1

    # Verify PricingRule table sync
    rule_stmt = select(PricingRule).where(PricingRule.org_id == org_id, PricingRule.rule_name == "Tier 1: 50+ Volume Discount")
    rule = (await test_session.execute(rule_stmt)).scalar_one_or_none()
    assert rule is not None
    assert rule.discount_percentage == Decimal("5.0")

    # 2. Ingest a Catalog Product KnowledgeItem
    prod_item = await svc.ingest_knowledge_item(
        title="Industrial Grade Hydraulic Pump",
        content_text="Industrial Grade Hydraulic Pump model HP-500. Base price ₹12,500. MOQ 2 units.",
        category=KnowledgeCategory.CATALOG_PRODUCT.value,
        sku="SKU-PUMP-500",
        base_price=Decimal("12500.00"),
        unit="unit",
        min_order_quantity=Decimal("2.0"),
    )
    assert prod_item.id is not None
    assert prod_item.chunk_count >= 1

    # Verify Product table sync
    prod_stmt = select(Product).where(Product.org_id == org_id, Product.sku == "SKU-PUMP-500")
    prod = (await test_session.execute(prod_stmt)).scalar_one_or_none()
    assert prod is not None
    assert prod.min_order_quantity == Decimal("2.0")

    # 3. Test Retrieval Service across categories
    retriever = KnowledgeRetrievalService(test_session, org_id)

    # Global search
    results_all = await retriever.search(query="volume discount for 50 units", top_k=5)
    assert len(results_all) >= 1

    # Category filtered search
    results_pricing = await retriever.search(
        query="volume discount",
        category=KnowledgeCategory.PRICING_RULE.value,
        top_k=3,
    )
    assert len(results_pricing) >= 1
    assert results_pricing[0].category == KnowledgeCategory.PRICING_RULE.value
    assert "Tier 1" in results_pricing[0].document_title
