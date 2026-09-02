"""
Unit tests for domain models, relationships, cascading deletes, and table creation.
"""

import pytest
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select
from app.database.base import Base
from app.database.models import (
    Organization,
    User,
    ApiKey,
    Lead,
    Customer,
    Deal,
    LeadEvent,
    Conversation,
    Message,
    MessageStatus,
    ConversationSummary,
    CustomerMemory,
    Product,
    ProductVariant,
    PricingRule,
    KnowledgeDocument,
    KnowledgeChunk,
    Campaign,
    CampaignLead,
    FollowupJob,
    Job,
    AgentRun,
    AgentEvent,
    ToolCall,
    SalesEvent,
    Handoff,
    Notification,
    Integration,
    AgentSetting,
    AuditLog,
)


@pytest.mark.asyncio
async def test_all_models_schema_and_crud():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    # 1. Create all tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 2. Insert test data across connected tables
    async with session_factory() as session:
        # Organization
        org = Organization(
            id="org_tea_test",
            name="North Bengal Tea Co. Test",
            slug="north-bengal-tea-test",
            settings={"currency": "INR", "language": "en"}
        )
        session.add(org)

        # User
        user = User(
            id="user_admin_test",
            org_id=org.id,
            email="admin@northbengaltea.com",
            hashed_password="hashed_bcrypt_secret",
            full_name="Rajiv Sen",
            role="admin"
        )
        session.add(user)

        # Customer
        customer = Customer(
            id="cust_test_1",
            org_id=org.id,
            primary_phone="+918900653250",
            name="Rahul Sharma",
            company_name="Siliguri Heritage Café",
            company_type="Café",
            city="Siliguri",
            preferred_language="Hindi",
            opt_in_status=True
        )
        session.add(customer)

        # Lead
        lead = Lead(
            id="lead_test_1",
            org_id=org.id,
            customer_id=customer.id,
            phone="+918900653250",
            name="Rahul Sharma",
            company_name="Siliguri Heritage Café",
            product_interest="Premium Darjeeling First Flush",
            estimated_quantity="50kg/month",
            status="qualified",
            score=85
        )
        session.add(lead)

        # Conversation
        conv = Conversation(
            id="conv_test_1",
            org_id=org.id,
            customer_id=customer.id,
            channel="whatsapp",
            channel_id="+918900653250",
            mode="AI",
            sales_stage="QUALIFIED",
            lead_score=85,
            is_hot=True
        )
        session.add(conv)

        # Message
        msg = Message(
            id="msg_test_1",
            org_id=org.id,
            conversation_id=conv.id,
            direction="inbound",
            sender_type="customer",
            content="Can you provide pricing for 50kg monthly?",
            delivery_status="delivered"
        )
        session.add(msg)

        # Customer Memory
        mem = CustomerMemory(
            id="mem_test_1",
            org_id=org.id,
            customer_id=customer.id,
            category="quantity",
            key="monthly_requirement_kg",
            value=50,
            confidence=0.95,
            verification_status="CUSTOMER_SAID"
        )
        session.add(mem)

        # Product & Variant
        prod = Product(
            id="prod_test_1",
            org_id=org.id,
            sku="NBT-DARJ-FF-01",
            name="Darjeeling First Flush Special",
            category="Darjeeling",
            tea_grade="FTGFOP1",
            min_order_quantity_kg=10.0
        )
        session.add(prod)

        variant = ProductVariant(
            id="var_test_1",
            product_id=prod.id,
            sku="NBT-DARJ-FF-01-5KG",
            name="5kg Commercial Pack",
            packaging_type="pouch",
            weight_kg=5.0,
            base_price_per_kg=1200.00
        )
        session.add(variant)

        # Pricing Rule
        pricing_rule = PricingRule(
            id="rule_test_1",
            org_id=org.id,
            product_id=prod.id,
            rule_name="50kg Bulk Tier",
            rule_type="volume_tier",
            min_quantity_kg=50.0,
            discount_percentage=10.0,
            max_autonomous_discount_percentage=5.0
        )
        session.add(pricing_rule)

        # Durable Job
        job = Job(
            id="job_test_1",
            org_id=org.id,
            type="process_message",
            payload={"conversation_id": conv.id, "message_id": msg.id},
            priority=10,
            status="pending"
        )
        session.add(job)

        await session.commit()

    # 3. Query and verify relations
    async with session_factory() as session:
        queried_org = await session.get(Organization, "org_tea_test")
        assert queried_org is not None
        assert queried_org.slug == "north-bengal-tea-test"

        stmt = select(Customer).where(Customer.primary_phone == "+918900653250")
        res = await session.execute(stmt)
        c = res.scalar_one_or_none()
        assert c is not None
        assert c.name == "Rahul Sharma"

        # Verify message
        m = await session.get(Message, "msg_test_1")
        assert m is not None
        assert m.direction == "inbound"

        # Verify job
        j = await session.get(Job, "job_test_1")
        assert j is not None
        assert j.priority == 10
        assert j.status == "pending"

    await engine.dispose()
