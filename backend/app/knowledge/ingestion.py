"""
End-to-end Knowledge Ingestion Pipeline: versioning, chunking, and embedding generation
for unified KnowledgeItem entities (Business Info, Pricing Rules, Catalog Products, Agent Guidance).
"""

from decimal import Decimal
import hashlib
from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.database.models import (
    KnowledgeCategory,
    KnowledgeChunk,
    KnowledgeDocument,
    KnowledgeItem,
    PricingRule,
    Product,
    ProductVariant,
)
from app.knowledge.chunker import chunk_markdown_document
from app.knowledge.embeddings import EmbeddingProvider, LocalMockEmbeddingProvider
from app.utils.logging import logger


class KnowledgeIngestionService:
    """
    Ingests, versions, chunks, and indexes knowledge assets across all categories
    into relational and vector storage.
    """

    def __init__(
        self,
        session: AsyncSession,
        org_id: str,
        embedding_provider: Optional[EmbeddingProvider] = None,
    ):
        self.session = session
        self.org_id = org_id
        self.embedding_provider = embedding_provider or LocalMockEmbeddingProvider()

    async def ingest_knowledge_item(
        self,
        title: str,
        content_text: str,
        category: str = KnowledgeCategory.BUSINESS_INFO.value,
        source_type: str = "manual",
        file_path: Optional[str] = None,
        structured_data: Optional[Dict[str, Any]] = None,
        created_by_brain: str = "OPERATOR",
        sku: Optional[str] = None,
        base_price: Optional[Decimal] = None,
        currency: Optional[str] = "INR",
        unit: Optional[str] = "unit",
        min_order_quantity: Optional[Decimal] = None,
        min_quantity: Optional[Decimal] = None,
        max_quantity: Optional[Decimal] = None,
        discount_percentage: Optional[Decimal] = None,
        max_autonomous_discount: Optional[Decimal] = None,
        customer_segment: Optional[str] = None,
        priority: int = 0,
        item_id: Optional[str] = None,
    ) -> KnowledgeItem:
        """
        Ingests a unified KnowledgeItem with versioning, chunking, and vector embedding.
        Maintains deterministic synchronization for PricingRule and Product records.
        """
        file_hash = hashlib.sha256(content_text.encode("utf-8")).hexdigest()
        structured_data = structured_data or {}

        # 1. Check for existing item
        existing_item = None
        if item_id:
            existing_item = (await self.session.execute(
                select(KnowledgeItem).where(KnowledgeItem.id == item_id, KnowledgeItem.org_id == self.org_id)
            )).scalar_one_or_none()

        if not existing_item:
            stmt = (
                select(KnowledgeItem)
                .where(
                    KnowledgeItem.org_id == self.org_id,
                    KnowledgeItem.category == category,
                    (KnowledgeItem.title == title) | ((KnowledgeItem.sku == sku) if sku else False),
                )
                .order_by(KnowledgeItem.version.desc())
            )
            existing_item = (await self.session.execute(stmt)).scalars().first()

        new_version = 1
        if existing_item:
            new_version = (existing_item.version or 1) + 1
            existing_item.is_active = False

        item = KnowledgeItem(
            id=item_id if (item_id and not existing_item) else None,
            org_id=self.org_id,
            category=category,
            title=title,
            source_type=source_type,
            content_text=content_text,
            structured_data=structured_data,
            sku=sku,
            base_price=base_price,
            currency=currency or "INR",
            unit=unit or "unit",
            min_order_quantity=min_order_quantity,
            min_quantity=min_quantity,
            max_quantity=max_quantity,
            discount_percentage=discount_percentage,
            max_autonomous_discount=max_autonomous_discount,
            customer_segment=customer_segment,
            priority=priority,
            file_path=file_path,
            file_hash=file_hash,
            version=new_version,
            is_active=True,
            created_by_brain=created_by_brain,
            audit_metadata={"version_bump_reason": f"Ingested v{new_version}"},
        )
        self.session.add(item)
        await self.session.flush()

        # 2. Chunk content and generate vector embeddings
        chunks = chunk_markdown_document(content_text)
        if chunks:
            chunk_texts = [c.content for c in chunks]
            embeddings = await self.embedding_provider.embed_texts(chunk_texts)

            for c, emb in zip(chunks, embeddings):
                k_chunk = KnowledgeChunk(
                    org_id=self.org_id,
                    item_id=item.id,
                    version=item.version,
                    chunk_index=c.chunk_index,
                    section_heading=c.section_heading or title,
                    content=c.content,
                    chunk_metadata={"category": category, "char_length": len(c.content)},
                    embedding_model=getattr(self.embedding_provider, "model", "local_mock"),
                    embedding=emb,
                )
                self.session.add(k_chunk)

            item.chunk_count = len(chunks)
        else:
            item.chunk_count = 0

        # 3. Synchronize with deterministic relational tables
        if category == KnowledgeCategory.PRICING_RULE.value:
            # Sync to PricingRule table
            rule_stmt = select(PricingRule).where(
                PricingRule.org_id == self.org_id,
                PricingRule.rule_name == title,
            )
            existing_pr = (await self.session.execute(rule_stmt)).scalar_one_or_none()
            if not existing_pr:
                pr = PricingRule(
                    org_id=self.org_id,
                    rule_name=title,
                    rule_type=structured_data.get("rule_type", "volume_tier"),
                    min_quantity=min_quantity or Decimal("0.0"),
                    max_quantity=max_quantity,
                    discount_percentage=discount_percentage or Decimal("0.0"),
                    max_autonomous_discount_percentage=max_autonomous_discount or discount_percentage or Decimal("0.0"),
                    customer_segment=customer_segment,
                    is_active=True,
                )
                self.session.add(pr)
            else:
                existing_pr.min_quantity = min_quantity or existing_pr.min_quantity
                existing_pr.max_quantity = max_quantity
                existing_pr.discount_percentage = discount_percentage or existing_pr.discount_percentage
                existing_pr.max_autonomous_discount_percentage = max_autonomous_discount or existing_pr.max_autonomous_discount_percentage
                existing_pr.customer_segment = customer_segment or existing_pr.customer_segment

        elif category == KnowledgeCategory.CATALOG_PRODUCT.value and sku:
            # Sync to Product and ProductVariant table
            prod_stmt = select(Product).where(Product.org_id == self.org_id, Product.sku == sku)
            existing_prod = (await self.session.execute(prod_stmt)).scalar_one_or_none()
            if not existing_prod:
                prod = Product(
                    org_id=self.org_id,
                    sku=sku,
                    name=title,
                    category=structured_data.get("category", "General"),
                    description=structured_data.get("description", content_text[:200]),
                    min_order_quantity=min_order_quantity or Decimal("1.0"),
                    in_stock=structured_data.get("in_stock", True),
                    is_active=True,
                    attributes={"base_price": float(base_price or 0.0), "unit": unit},
                )
                self.session.add(prod)
                await self.session.flush()

                var = ProductVariant(
                    product_id=prod.id,
                    sku=f"{sku}-STD",
                    name="Standard Unit",
                    packaging_type="standard",
                    unit_quantity=Decimal("1.0"),
                    base_price_per_unit=base_price or Decimal("0.0"),
                    in_stock=True,
                    is_active=True,
                )
                self.session.add(var)
            else:
                existing_prod.name = title
                existing_prod.min_order_quantity = min_order_quantity or existing_prod.min_order_quantity
                if base_price is not None and existing_prod.variants:
                    existing_prod.variants[0].base_price_per_unit = base_price

        await self.session.commit()
        logger.info(f"Ingested KnowledgeItem '{title}' ({category}) v{item.version} with {item.chunk_count} embedded chunks.")
        return item

    async def ingest_document(
        self,
        title: str,
        text_content: str,
        source_type: str = "markdown",
        file_path: Optional[str] = None,
    ) -> KnowledgeDocument:
        """
        Legacy document ingestion for backwards compatibility with existing endpoints.
        Also synchronizes into the unified KnowledgeItem master model.
        """
        file_hash = hashlib.sha256(text_content.encode("utf-8")).hexdigest()

        # Check existing document by title within org
        stmt = (
            select(KnowledgeDocument)
            .where(
                KnowledgeDocument.org_id == self.org_id,
                KnowledgeDocument.title == title,
            )
            .order_by(KnowledgeDocument.version.desc())
        )
        res = await self.session.execute(stmt)
        existing_doc = res.scalars().first()

        if existing_doc:
            if existing_doc.file_hash == file_hash and existing_doc.is_active:
                logger.info(f"Document '{title}' already ingested with identical hash. Skipping.")
                return existing_doc
            new_version = existing_doc.version + 1
            existing_doc.is_active = False
            doc = KnowledgeDocument(
                org_id=self.org_id,
                title=title,
                source_type=source_type,
                file_path=file_path,
                file_hash=file_hash,
                version=new_version,
                is_active=True,
            )
        else:
            doc = KnowledgeDocument(
                org_id=self.org_id,
                title=title,
                source_type=source_type,
                file_path=file_path,
                file_hash=file_hash,
                version=1,
                is_active=True,
            )

        self.session.add(doc)
        await self.session.flush()

        # Also ingest into KnowledgeItem
        k_item = await self.ingest_knowledge_item(
            title=title,
            content_text=text_content,
            category=KnowledgeCategory.BUSINESS_INFO.value,
            source_type=source_type,
            file_path=file_path,
            structured_data={"legacy_document_id": doc.id},
        )

        doc.chunk_count = k_item.chunk_count
        await self.session.commit()
        return doc
