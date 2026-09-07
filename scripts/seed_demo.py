"""
Production & Demo Seeding Script for WhatsApp AI Agent by NS.

Supports:
- Default: Clean generic industry-agnostic business schema & sample products
- Optional demo flag: `--demo tea` for North Bengal Tea Co. sample dataset
"""

import argparse
import asyncio
from decimal import Decimal
import hashlib
import sys

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


async def seed_database(demo_mode: str = "generic"):
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
            if demo_mode == "tea":
                org_name = "North Bengal Tea Co."
                org_slug = "north-bengal-tea"
                support_email = "sales@northbengaltea.com"
            else:
                org_name = settings.DEFAULT_BUSINESS_NAME or "Enterprise Commerce Solutions"
                org_slug = "enterprise-commerce"
                support_email = "sales@enterprisecommerce.io"

            org = Organization(
                id=org_id,
                name=org_name,
                slug=org_slug,
                settings={
                    "business_phone": "+918900653250",
                    "support_email": support_email,
                },
            )
            session.add(org)

        # 2. Admin User
        admin_user = await session.get(User, "user_admin_owner")
        if not admin_user:
            admin_user = User(
                id="user_admin_owner",
                org_id=org_id,
                email="admin@enterprisecommerce.io" if demo_mode != "tea" else "rajiv@northbengaltea.com",
                hashed_password=hash_password("WBAdmin2026!Secure"),
                full_name="Operations Lead" if demo_mode != "tea" else "Rajiv Sen",
                role="owner",
                is_active=True,
            )
            session.add(admin_user)

        # 3. Product Catalog
        if demo_mode == "tea":
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
        else:
            products_data = [
                {
                    "id": "prod_std_001",
                    "sku": "PROD-STD-001",
                    "name": "Standard Commercial Package",
                    "category": "Commercial",
                    "description": "Comprehensive standard commercial product tier suited for business operations, reliable recurring supply, and enterprise delivery.",
                    "tea_grade": "Commercial Grade A",
                    "origin": "Main Distribution Facility",
                    "moq": Decimal("10.0"),
                    "variants": [
                        ("PROD-STD-V1", "Standard Pack (10 Units)", Decimal("10.0"), Decimal("350.00"), "box"),
                        ("PROD-STD-V2", "Master Carton (50 Units)", Decimal("50.0"), Decimal("310.00"), "carton"),
                    ],
                },
                {
                    "id": "prod_prem_002",
                    "sku": "PROD-PREM-002",
                    "name": "Premium Commercial Package",
                    "category": "Premium",
                    "description": "High-grade commercial selection with enhanced specifications, strict quality assurance, and priority fulfillment dispatch.",
                    "tea_grade": "Enterprise Select",
                    "origin": "Primary Facility",
                    "moq": Decimal("5.0"),
                    "variants": [
                        ("PROD-PREM-V1", "Premium Unit (5 Units)", Decimal("5.0"), Decimal("850.00"), "box"),
                        ("PROD-PREM-V2", "Bulk Premium Crate (25 Units)", Decimal("25.0"), Decimal("780.00"), "crate"),
                    ],
                },
                {
                    "id": "prod_ent_003",
                    "sku": "PROD-ENT-003",
                    "name": "Enterprise Bulk Package",
                    "category": "Enterprise",
                    "description": "High-volume wholesale supply tier engineered for large institutional accounts, custom service terms, and distributor operations.",
                    "tea_grade": "Industrial Grade 1",
                    "origin": "Regional Logistics Hub",
                    "moq": Decimal("25.0"),
                    "variants": [
                        ("PROD-ENT-V1", "Enterprise Pallet (25 Units)", Decimal("25.0"), Decimal("1200.00"), "pallet"),
                        ("PROD-ENT-V2", "Commercial Freight Pack (100 Units)", Decimal("100.0"), Decimal("1050.00"), "freight"),
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
                    grade=p_data["tea_grade"],
                    tea_grade=p_data["tea_grade"],
                    origin=p_data["origin"],
                    min_order_quantity=p_data["moq"],
                    min_order_quantity_kg=p_data["moq"],
                    in_stock=True,
                )
                session.add(prod)
                for sku_v, name_v, wt_v, price_v, pkg_v in p_data["variants"]:
                    var = ProductVariant(
                        product_id=prod.id,
                        sku=sku_v,
                        name=name_v,
                        unit_quantity=wt_v,
                        weight_kg=wt_v,
                        base_price_per_unit=price_v,
                        base_price_per_kg=price_v,
                        packaging_type=pkg_v,
                    )
                    session.add(var)

        # 4. Deterministic Pricing Rules
        pricing_rules_data = [
            ("rule_vol_50", "Tier 1: 50+ Units Commercial Volume Tier", "volume_tier", Decimal("50.0"), Decimal("5.0"), Decimal("5.0"), False),
            ("rule_vol_100", "Tier 2: 100+ Units Commercial Volume Tier", "volume_tier", Decimal("100.0"), Decimal("10.0"), Decimal("7.5"), False),
            ("rule_vol_500", "Tier 3: 500+ Units Wholesale / Distributor Tier", "volume_tier", Decimal("500.0"), Decimal("15.0"), Decimal("10.0"), True),
        ]

        for r_id, r_name, r_type, min_qty, disc, max_auto, req_app in pricing_rules_data:
            existing_rule = await session.get(PricingRule, r_id)
            if not existing_rule:
                rule = PricingRule(
                    id=r_id,
                    org_id=org_id,
                    rule_name=r_name,
                    rule_type=r_type,
                    min_quantity=min_qty,
                    min_quantity_kg=min_qty,
                    discount_percentage=disc,
                    max_autonomous_discount_percentage=max_auto,
                    requires_human_approval=req_app,
                    is_active=True,
                )
                session.add(rule)

        # 5. Seed Knowledge Base Documents & Chunks
        if demo_mode == "tea":
            kb_docs = [
                (
                    "doc_quality_cert",
                    "North Bengal Tea Co. Quality Standards & Certifications",
                    """# Quality Standards and Origin Authenticity\n\nNorth Bengal Tea Co. is directly affiliated with single estates across Darjeeling, Dooars, and Assam.\nEvery batch is tested for maximum moisture under 6.5% and FSSAI standards.\n""",
                ),
                (
                    "doc_sampling_policy",
                    "Commercial Sampling Policy for Hospitality Buyers",
                    """# Commercial Sampling Policy\n\nFor genuine B2B buyers:\n- Tasting kits dispatched across India.\n- 100% of sample charge refunded against first commercial order.\n""",
                ),
            ]
        else:
            kb_docs = [
                (
                    "doc_quality_cert",
                    "Commercial Quality Standards & Industry Certifications",
                    """# Commercial Quality Standards & Certifications\n\nWe provide certified commercial products adhering to rigorous quality management, origin traceability, and ISO/FSSAI manufacturing benchmarks.\nAll orders undergo pre-dispatch inspection and secure transit packaging.\n""",
                ),
                (
                    "doc_sampling_policy",
                    "Commercial Evaluation & Product Sampling Policy",
                    """# Commercial Evaluation & Product Sampling Policy\n\nFor verified B2B and institutional accounts:\n- Evaluation units available for quality assessment prior to contract signing.\n- Sample fees are fully credited toward subsequent commercial volume orders.\n- Typical dispatch timeline is 2 to 3 business days.\n""",
                ),
            ]

        embedder = get_embedding_provider()
        for doc_id, title, text in kb_docs:
            existing_doc = await session.get(KnowledgeDocument, doc_id)
            if not existing_doc:
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
        if demo_mode == "tea":
            sample_leads = [
                ("Rahul Sharma", "+919832099001", "Heritage Cafe & Bakery", "Cafe", "qualified", 85, "Darjeeling First Flush"),
                ("Anita Paul", "+919832012345", "Paul Sweets & Tea Stall", "Restaurant", "new", 30, "Assam Kadak CTC"),
                ("Suresh Khosla", "+919832054321", "Khosla Tea Mart Siliguri", "Wholesaler", "converted", 95, "Dooars Hotel Blend"),
            ]
        else:
            sample_leads = [
                ("Rahul Sharma", "+919832099001", "Heritage Commercial Partners", "Commercial Account", "qualified", 85, "Premium Commercial Package"),
                ("Anita Paul", "+919832012345", "Paul Enterprises", "Corporate", "new", 30, "Standard Commercial Package"),
                ("Suresh Khosla", "+919832054321", "Metro Distribution Network", "Wholesaler", "converted", 95, "Enterprise Bulk Package"),
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
        logger.info(f"Database seeding successfully completed! (Mode: {demo_mode})")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Database Seeder for WhatsApp AI Agent by NS")
    parser.add_argument(
        "--demo",
        choices=["generic", "tea"],
        default="generic",
        help="Seed profile: 'generic' (default industry-agnostic) or 'tea' (optional demo dataset)",
    )
    args = parser.parse_args()
    asyncio.run(seed_database(args.demo))
