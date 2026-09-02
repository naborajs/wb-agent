"""
Production & Demo Seeding Script for North Bengal Tea Co. (Section 112).

Populates:
1. Default Organization & Admin User
2. Wholesale Tea Product Catalog & Variants
3. Deterministic Volume Pricing Rules
4. Ingested & Versioned Knowledge Base Documents (Quality, Shipping, Sampling)
5. Initial Inbound Sample Leads
"""

import asyncio
from decimal import Decimal
from app.auth.passwords import hash_password
from app.config import settings
from app.database.base import Base
from app.database.models import (
    Customer,
    KnowledgeDocument,
    KnowledgeChunk,
    Lead,
    Organization,
    PricingRule,
    Product,
    ProductVariant,
    User,
)
from app.database.session import get_engine, get_session_factory
from app.knowledge.chunker import chunk_markdown_document
from app.knowledge.embeddings import get_embedding_provider
from app.utils.logging import logger


async def seed_database():
    logger.info("Initializing database schema...")
    engine = get_engine()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = settings.DEFAULT_ORG_ID
    session_factory = get_session_factory()

    async with session_factory() as session:
        # 1. Organization
        org = await session.get(Organization, org_id)
        if not org:
            org = Organization(
                id=org_id,
                name="North Bengal Tea Co.",
                slug="north-bengal-tea",
                settings={
                    "business_phone": "+918900653250",
                    "support_email": "sales@northbengaltea.com",
                },
            )
            session.add(org)

        # 2. Admin User
        admin_user = await session.get(User, "user_admin_rajiv")
        if not admin_user:
            admin_user = User(
                id="user_admin_rajiv",
                org_id=org_id,
                email="rajiv@northbengaltea.com",
                hashed_password=hash_password("WBAdmin2026!Secure"),
                full_name="Rajiv Sen",
                role="owner",
                is_active=True,
            )
            session.add(admin_user)

        # 3. Product Catalog
        products_data = [
            {
                "id": "prod_darjeeling_ff",
                "sku": "NBT-DARJ-FF",
                "name": "Darjeeling Spring First Flush Special",
                "category": "Darjeeling",
                "description": "Single-estate hand-plucked spring harvest. Floral, delicate astringency with celebrated muscatel bouquet.",
                "tea_grade": "FTGFOP1",
                "origin": "Kurseong & Mirik Valley, Darjeeling",
                "moq": Decimal("10.0"),
                "variants": [
                    ("NBT-DARJ-FF-5KG", "5kg Premium Barrier Foil", Decimal("5.0"), Decimal("1600.00"), "foil_bag"),
                    ("NBT-DARJ-FF-20KG", "20kg Estate Lined Chest", Decimal("20.0"), Decimal("1450.00"), "chest"),
                ],
            },
            {
                "id": "prod_assam_kadak_ctc",
                "sku": "NBT-ASSAM-CTC",
                "name": "Assam Kadak CTC Granules",
                "category": "Assam CTC",
                "description": "High-density heavy CTC tea from Upper Assam. Rapid color extraction, brisk malty liquor engineered for milk tea.",
                "tea_grade": "BP",
                "origin": "Upper Assam, Brahmaputra Valley",
                "moq": Decimal("25.0"),
                "variants": [
                    ("NBT-ASSAM-CTC-10KG", "10kg Food-grade Poly Sack", Decimal("10.0"), Decimal("380.00"), "sack"),
                    ("NBT-ASSAM-CTC-30KG", "30kg Commercial Master Sack", Decimal("30.0"), Decimal("340.00"), "sack"),
                ],
            },
            {
                "id": "prod_dooars_hotel_blend",
                "sku": "NBT-DOOARS-HB",
                "name": "Dooars Terai Hotel Master Blend",
                "category": "Dooars",
                "description": "High cuppage commercial blend designed for roadside tea stalls, canteens, and bulk hospitality brewing.",
                "tea_grade": "BOP / OF",
                "origin": "Dooars & Terai, West Bengal",
                "moq": Decimal("20.0"),
                "variants": [
                    ("NBT-DOOARS-HB-20KG", "20kg Commercial Sack", Decimal("20.0"), Decimal("260.00"), "sack"),
                    ("NBT-DOOARS-HB-50KG", "50kg Jute Wholesale Sack", Decimal("50.0"), Decimal("230.00"), "sack"),
                ],
            },
        ]

        for p_data in products_data:
            existing = await session.get(Product, p_data["id"])
            if not existing:
                prod = Product(
                    id=p_data["id"],
                    org_id=org_id,
                    sku=p_data["sku"],
                    name=p_data["name"],
                    category=p_data["category"],
                    description=p_data["description"],
                    tea_grade=p_data["tea_grade"],
                    origin=p_data["origin"],
                    min_order_quantity_kg=p_data["moq"],
                    in_stock=True,
                )
                session.add(prod)
                for sku_v, name_v, wt_v, price_v, pkg_v in p_data["variants"]:
                    var = ProductVariant(
                        product_id=prod.id,
                        sku=sku_v,
                        name=name_v,
                        weight_kg=wt_v,
                        base_price_per_kg=price_v,
                        packaging_type=pkg_v,
                    )
                    session.add(var)

        # 4. Deterministic Pricing Rules
        pricing_rules_data = [
            ("rule_vol_50", "Tier 1: 50kg+ Volume Discount", "volume_tier", Decimal("50.0"), Decimal("5.0"), Decimal("5.0")),
            ("rule_vol_100", "Tier 2: 100kg+ Volume Discount", "volume_tier", Decimal("100.0"), Decimal("10.0"), Decimal("7.5")),
            ("rule_vol_500", "Tier 3: 500kg+ Wholesale / Distributor Tier", "volume_tier", Decimal("500.0"), Decimal("15.0"), Decimal("10.0")),
        ]

        for r_id, r_name, r_type, min_qty, disc, max_auto in pricing_rules_data:
            existing_rule = await session.get(PricingRule, r_id)
            if not existing_rule:
                rule = PricingRule(
                    id=r_id,
                    org_id=org_id,
                    rule_name=r_name,
                    rule_type=r_type,
                    min_quantity_kg=min_qty,
                    discount_percentage=disc,
                    max_autonomous_discount_percentage=max_auto,
                    is_active=True,
                )
                session.add(rule)

        # 5. Seed Knowledge Base Documents & Chunks
        kb_docs = [
            (
                "doc_quality_cert",
                "North Bengal Tea Co. Quality Standards & Certifications",
                """# Quality Standards and Origin Authenticity

North Bengal Tea Co. is directly affiliated with single estates across Darjeeling, Dooars, and Assam.
Every batch is tested for:
- Maximum moisture content under 6.5%
- Heavy metal and pesticide residues compliant with FSSAI standards
- 100% authentic GI (Geographical Indication) certified Darjeeling leaf

We do not blend cheap auction sweepings into our orthodox whole-leaf offerings.
""",
            ),
            (
                "doc_sampling_policy",
                "Commercial Sampling Policy for Hospitality Buyers",
                """# Commercial Sampling Policy

For genuine B2B buyers (cafes, hotels, restaurants, distributors):
- We dispatch a 3-blend tasting kit (100g each: Darjeeling First Flush, Assam Kadak CTC, Dooars Hotel Blend).
- Standard sample kit charge is ₹499 covering express air courier across India.
- 100% of the sample charge is refunded or credited against your first commercial order of 50kg+.
- Typical courier transit time is 3 to 4 business days.
""",
            ),
        ]

        embedder = get_embedding_provider()
        for doc_id, title, text in kb_docs:
            existing_doc = await session.get(KnowledgeDocument, doc_id)
            if not existing_doc:
                import hashlib
                f_hash = hashlib.sha256(text.encode("utf-8")).hexdigest()
                doc = KnowledgeDocument(
                    id=doc_id,
                    org_id=org_id,
                    title=title,
                    source_type="markdown",
                    file_hash=f_hash,
                    version=1,
                    is_active=True,
                )
                session.add(doc)
                chunks = chunk_markdown_document(text)
                doc.chunk_count = len(chunks)
                for idx, chunk in enumerate(chunks):
                    emb = await embedder.embed_text(f"{chunk.section_heading}\n{chunk.content}")
                    chunk_rec = KnowledgeChunk(
                        document_id=doc.id,
                        org_id=org_id,
                        chunk_index=idx,
                        section_heading=chunk.section_heading,
                        content=chunk.content,
                        embedding=emb,
                    )
                    session.add(chunk_rec)

        # 6. Sample Initial Leads
        sample_leads = [
            ("Rahul Sharma", "+918900653250", "Heritage Cafe & Bakery", "Cafe", "qualified", 85, "Darjeeling First Flush"),
            ("Anita Paul", "+919832012345", "Paul Sweets & Tea Stall", "Restaurant", "new", 30, "Assam Kadak CTC"),
            ("Suresh Khosla", "+919832054321", "Khosla Tea Mart Siliguri", "Wholesaler", "converted", 95, "Dooars Hotel Blend"),
        ]

        for name, phone, comp, comp_type, st, sc, prod_interest in sample_leads:
            lead = Lead(
                org_id=org_id,
                phone=phone,
                name=name,
                company_name=comp,
                company_type=comp_type,
                status=st,
                score=sc,
                product_interest=prod_interest,
                opt_in_status=True,
            )
            session.add(lead)

        await session.commit()
        logger.info("Database seeding successfully completed for North Bengal Tea Co.!")


if __name__ == "__main__":
    asyncio.run(seed_database())
