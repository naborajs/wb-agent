"""
Unit tests for Knowledge RAG Hub Migration:
Verifies zero-data-loss transition of documents, pricing rules, and products
into the unified KnowledgeItem master model.
"""

from decimal import Decimal
import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.database.base import Base
from app.database.models import (
    KnowledgeCategory,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeItem,
    Organization,
    PricingRule,
    Product,
    ProductVariant,
)
from app.database.migrations.migrate_to_knowledge_items import run_knowledge_hub_migration


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


@pytest.mark.asyncio
async def test_zero_data_loss_migration(test_session: AsyncSession):
    org_id = settings.DEFAULT_ORG_ID

    # 1. Seed a legacy KnowledgeDocument with KnowledgeChunk
    doc = KnowledgeDocument(
        id="doc_legacy_101",
        org_id=org_id,
        title="Standard Commercial Warranty Policy",
        source_type="markdown",
        file_hash="hash_doc_101",
        version=1,
        is_active=True,
        chunk_count=1,
    )
    test_session.add(doc)
    await test_session.flush()

    chunk = KnowledgeChunk(
        id="chunk_legacy_101",
        org_id=org_id,
        document_id=doc.id,
        version=1,
        chunk_index=0,
        section_heading="Warranty Terms",
        content="All products carry a 12-month commercial replacement guarantee.",
        embedding_model="local_mock",
        embedding=[0.1, 0.2, 0.3],
    )
    test_session.add(chunk)

    # 2. Seed a legacy PricingRule
    rule = PricingRule(
        id="rule_legacy_201",
        org_id=org_id,
        rule_name="Tier 2: 100+ Commercial Volume",
        rule_type="volume_tier",
        min_quantity=Decimal("100.0"),
        max_quantity=Decimal("499.99"),
        discount_percentage=Decimal("10.0"),
        max_autonomous_discount_percentage=Decimal("7.5"),
        customer_segment="wholesale",
        is_active=True,
    )
    test_session.add(rule)

    # 3. Seed a legacy Product with Variant
    product = Product(
        id="prod_legacy_301",
        org_id=org_id,
        sku="SKU-COMM-001",
        name="Industrial Grade Component A",
        category="Hardware",
        description="High-durability stainless commercial unit",
        min_order_quantity=Decimal("25.0"),
        in_stock=True,
        is_active=True,
        attributes={"currency": "INR", "unit_of_measure": "unit", "base_price": 450.0},
    )
    test_session.add(product)
    await test_session.flush()

    variant = ProductVariant(
        id="var_legacy_301",
        product_id=product.id,
        sku="SKU-COMM-001-STD",
        name="Standard Unit",
        packaging_type="standard",
        unit_quantity=Decimal("1.0"),
        base_price_per_unit=Decimal("450.00"),
        in_stock=True,
        is_active=True,
    )
    test_session.add(variant)
    await test_session.commit()

    # 4. Run Migration
    res = await run_knowledge_hub_migration(test_session, org_id=org_id)

    assert res["documents_migrated"] == 1
    assert res["pricing_rules_migrated"] == 1
    assert res["products_migrated"] == 1
    assert res["chunks_linked"] >= 3

    # 5. Verify KnowledgeItem records
    items_stmt = select(KnowledgeItem).where(KnowledgeItem.org_id == org_id)
    items = (await test_session.execute(items_stmt)).scalars().all()
    assert len(items) == 3

    # Verify Document item
    doc_item = next(i for i in items if i.category == KnowledgeCategory.BUSINESS_INFO.value)
    assert doc_item.id == doc.id
    assert doc_item.title == "Standard Commercial Warranty Policy"
    assert "12-month commercial replacement" in doc_item.content_text

    # Verify Pricing Rule item
    rule_item = next(i for i in items if i.category == KnowledgeCategory.PRICING_RULE.value)
    assert rule_item.title == "Tier 2: 100+ Commercial Volume"
    assert rule_item.min_quantity == Decimal("100.0")
    assert rule_item.discount_percentage == Decimal("10.0")
    assert rule_item.max_autonomous_discount == Decimal("7.5")
    assert "Tier 2" in rule_item.content_text

    # Verify Product item
    prod_item = next(i for i in items if i.category == KnowledgeCategory.CATALOG_PRODUCT.value)
    assert prod_item.sku == "SKU-COMM-001"
    assert prod_item.base_price == Decimal("450.00")
    assert prod_item.min_order_quantity == Decimal("25.0")
    assert "Industrial Grade Component A" in prod_item.content_text

    # 6. Verify chunks linkage
    chunks_stmt = select(KnowledgeChunk).where(KnowledgeChunk.org_id == org_id)
    all_chunks = (await test_session.execute(chunks_stmt)).scalars().all()
    assert len(all_chunks) == 3
    for c in all_chunks:
        assert c.item_id is not None

    # 7. Test Idempotency: running migration again does NOT duplicate
    res_second = await run_knowledge_hub_migration(test_session, org_id=org_id)
    assert res_second["documents_migrated"] == 0
    assert res_second["pricing_rules_migrated"] == 0
    assert res_second["products_migrated"] == 0

    items_after = (await test_session.execute(items_stmt)).scalars().all()
    assert len(items_after) == 3
