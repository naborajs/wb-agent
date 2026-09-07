"""
Migration Runner: Zero-data-loss migration from legacy knowledge_documents,
pricing_rules, and products into the unified KnowledgeItem master table.
"""

from decimal import Decimal
from typing import Any, Dict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.base import Base
from app.database.session import get_engine
from app.database.models import (
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeItem,
    KnowledgeCategory,
    PricingRule,
    Product,
)
from app.knowledge.embeddings import LocalMockEmbeddingProvider
from app.utils.logging import logger


async def run_knowledge_hub_migration(session: AsyncSession, org_id: str = "org_default_tea") -> Dict[str, Any]:
    """
    Executes an idempotent, zero-data-loss migration into knowledge_items.
    """
    # 1. Ensure table schema exists
    bind = getattr(session, "bind", None) or get_engine()
    async with bind.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    mock_embedder = LocalMockEmbeddingProvider()
    docs_migrated = 0
    rules_migrated = 0
    prods_migrated = 0
    chunks_linked = 0

    # -------------------------------------------------------------
    # 2. Migrate KnowledgeDocument records
    # -------------------------------------------------------------
    doc_stmt = select(KnowledgeDocument).where(KnowledgeDocument.org_id == org_id)
    doc_res = await session.execute(doc_stmt)
    documents = doc_res.scalars().all()

    for doc in documents:
        # Check if already migrated
        item_stmt = select(KnowledgeItem).where(
            KnowledgeItem.org_id == org_id,
            (KnowledgeItem.id == doc.id) | (KnowledgeItem.file_hash == doc.file_hash)
        )
        existing_item = (await session.execute(item_stmt)).scalar_one_or_none()

        if not existing_item:
            # Fetch content from chunks if available
            chunk_stmt = select(KnowledgeChunk).where(
                KnowledgeChunk.document_id == doc.id
            ).order_by(KnowledgeChunk.chunk_index.asc())
            chunks = (await session.execute(chunk_stmt)).scalars().all()
            
            combined_text = "\n\n".join([c.content for c in chunks]) if chunks else doc.title

            item = KnowledgeItem(
                id=doc.id,
                org_id=doc.org_id,
                category=KnowledgeCategory.BUSINESS_INFO.value,
                title=doc.title,
                source_type=doc.source_type or "file_upload",
                content_text=combined_text,
                structured_data={"doc_metadata": doc.doc_metadata or {}, "legacy_document_id": doc.id},
                file_path=doc.file_path,
                file_hash=doc.file_hash,
                chunk_count=doc.chunk_count or len(chunks),
                version=doc.version or 1,
                is_active=doc.is_active,
                created_by_brain="SYSTEM",
                audit_metadata={"migrated_from": "knowledge_documents"},
            )
            session.add(item)
            await session.flush()
            docs_migrated += 1

            # Link existing chunks
            for c in chunks:
                c.item_id = item.id
                chunks_linked += 1
        else:
            # Link chunks if not yet linked
            chunk_stmt = select(KnowledgeChunk).where(
                KnowledgeChunk.document_id == doc.id,
                KnowledgeChunk.item_id.is_(None),
            )
            unlinked_chunks = (await session.execute(chunk_stmt)).scalars().all()
            for c in unlinked_chunks:
                c.item_id = existing_item.id
                chunks_linked += 1

    # -------------------------------------------------------------
    # 3. Migrate PricingRule records
    # -------------------------------------------------------------
    rule_stmt = select(PricingRule).where(PricingRule.org_id == org_id)
    rule_res = await session.execute(rule_stmt)
    rules = rule_res.scalars().all()

    for r in rules:
        r_name = getattr(r, "rule_name", getattr(r, "name", "Pricing Rule"))
        item_id = f"item_pr_{r.id}"
        item_stmt = select(KnowledgeItem).where(KnowledgeItem.id == item_id)
        existing_rule_item = (await session.execute(item_stmt)).scalar_one_or_none()

        if not existing_rule_item:
            content_text = (
                f"### Pricing Rule: {r_name}\n"
                f"- **Rule Type:** {r.rule_type}\n"
                f"- **Volume Tier:** {r.min_quantity} to {r.max_quantity or 'Unlimited'} units\n"
                f"- **Base Discount:** {r.discount_percentage}%\n"
                f"- **Max Autonomous Ceiling:** {r.max_autonomous_discount_percentage}%\n"
                f"- **Target Customer Segment:** {r.customer_segment or 'All Commercial Buyers'}\n"
                f"- **Status:** {'Active' if r.is_active else 'Inactive'}"
            )
            structured_data = {
                "legacy_rule_id": r.id,
                "rule_name": r_name,
                "rule_type": r.rule_type,
                "min_quantity": float(r.min_quantity) if r.min_quantity is not None else None,
                "max_quantity": float(r.max_quantity) if r.max_quantity is not None else None,
                "discount_percentage": float(r.discount_percentage) if r.discount_percentage is not None else 0.0,
                "max_autonomous_discount_percentage": float(r.max_autonomous_discount_percentage) if r.max_autonomous_discount_percentage is not None else 0.0,
                "customer_segment": r.customer_segment,
                "currency": getattr(r, "currency", "INR"),
            }
            rule_item = KnowledgeItem(
                id=item_id,
                org_id=r.org_id,
                category=KnowledgeCategory.PRICING_RULE.value,
                title=r_name,
                source_type="pricing_rule",
                content_text=content_text,
                structured_data=structured_data,
                min_quantity=r.min_quantity,
                max_quantity=r.max_quantity,
                discount_percentage=r.discount_percentage,
                max_autonomous_discount=r.max_autonomous_discount_percentage,
                customer_segment=r.customer_segment,
                currency=getattr(r, "currency", "INR"),
                chunk_count=1,
                is_active=r.is_active,
                created_by_brain="SYSTEM",
                audit_metadata={"migrated_from": "pricing_rules"},
            )
            session.add(rule_item)
            await session.flush()

            # Create vector chunk for RAG
            emb = (await mock_embedder.embed_texts([content_text]))[0]
            chunk = KnowledgeChunk(
                org_id=r.org_id,
                item_id=rule_item.id,
                version=1,
                chunk_index=0,
                section_heading=f"Pricing Rule: {r_name}",
                content=content_text,
                chunk_metadata={"category": "pricing_rule", "rule_id": r.id},
                embedding_model="local_mock",
                embedding=emb,
            )
            session.add(chunk)
            rules_migrated += 1
            chunks_linked += 1

    # -------------------------------------------------------------
    # 4. Migrate Product records
    # -------------------------------------------------------------
    from sqlalchemy.orm import selectinload
    prod_stmt = select(Product).options(selectinload(Product.variants)).where(Product.org_id == org_id)
    prod_res = await session.execute(prod_stmt)
    products = prod_res.scalars().all()

    for p in products:
        item_id = f"item_prod_{p.id}"
        item_stmt = select(KnowledgeItem).where(KnowledgeItem.id == item_id)
        existing_prod_item = (await session.execute(item_stmt)).scalar_one_or_none()

        if not existing_prod_item:
            currency = getattr(p, "currency", "INR") or "INR"
            curr_sym = "₹" if currency == "INR" else "$"
            uom = getattr(p, "unit_of_measure", "unit") or "unit"
            
            # Determine base price
            base_price = Decimal("0.0")
            if p.variants:
                base_price = getattr(p.variants[0], "base_price_per_unit", Decimal("0.0"))
            elif isinstance(p.attributes, dict) and "base_price" in p.attributes:
                base_price = Decimal(str(p.attributes["base_price"]))

            content_text = (
                f"### Catalog Product: {p.name} (SKU: {p.sku})\n"
                f"- **Category:** {p.category or 'General'}\n"
                f"- **Base Price:** {curr_sym}{base_price} per {uom}\n"
                f"- **Minimum Order Quantity (MOQ):** {p.min_order_quantity or 1.0} {uom}\n"
                f"- **Availability:** {'In Stock' if p.in_stock else 'Out of Stock'}\n"
                f"- **Description:** {p.description or 'Commercial grade wholesale product.'}"
            )
            structured_data = {
                "legacy_product_id": p.id,
                "sku": p.sku,
                "name": p.name,
                "category": p.category,
                "base_price": float(base_price),
                "currency": currency,
                "unit": uom,
                "min_order_quantity": float(p.min_order_quantity) if p.min_order_quantity is not None else 1.0,
                "in_stock": p.in_stock,
                "description": p.description,
            }
            prod_item = KnowledgeItem(
                id=item_id,
                org_id=p.org_id,
                category=KnowledgeCategory.CATALOG_PRODUCT.value,
                title=p.name,
                sku=p.sku,
                source_type="catalog_product",
                content_text=content_text,
                structured_data=structured_data,
                base_price=base_price,
                currency=currency,
                unit=uom,
                min_order_quantity=p.min_order_quantity,
                chunk_count=1,
                is_active=p.is_active,
                created_by_brain="SYSTEM",
                audit_metadata={"migrated_from": "products"},
            )
            session.add(prod_item)
            await session.flush()

            # Create vector chunk for RAG
            emb = (await mock_embedder.embed_texts([content_text]))[0]
            chunk = KnowledgeChunk(
                org_id=p.org_id,
                item_id=prod_item.id,
                version=1,
                chunk_index=0,
                section_heading=f"Product: {p.name}",
                content=content_text,
                chunk_metadata={"category": "catalog_product", "sku": p.sku, "product_id": p.id},
                embedding_model="local_mock",
                embedding=emb,
            )
            session.add(chunk)
            prods_migrated += 1
            chunks_linked += 1

    await session.commit()
    logger.info(
        f"[KnowledgeHub Migration] Finished: {docs_migrated} documents, {rules_migrated} pricing rules, "
        f"{prods_migrated} products migrated; {chunks_linked} chunks linked."
    )
    return {
        "documents_migrated": docs_migrated,
        "pricing_rules_migrated": rules_migrated,
        "products_migrated": prods_migrated,
        "chunks_linked": chunks_linked,
    }
