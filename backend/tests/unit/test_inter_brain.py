"""
Unit Tests for Dual-Brain Operating System (Friday & EDITH)
and Live Codebase Self-Inspection / Meta-Cognitive APIs.
"""

import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.config import settings
from app.database.base import Base
from app.database.models import Organization, Product, PricingRule, InterBrainMessage
from app.brain.inter_brain_bus import FridayBrain, EdithBrain, inter_brain_bus
from app.brain.code_service import CodebaseService


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
async def test_friday_self_identity(test_session: AsyncSession):
    """
    Verifies that Friday accurately identifies herself, references Gemini 3.1 Flash Live Preview,
    and explains that EDITH manages external WhatsApp sales.
    """
    friday = FridayBrain()
    res = await friday.chat(
        user_message="What is your name?",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert res["speaker"] == "Friday"
    assert "Friday" in res["reply"]
    assert "EDITH" in res["reply"]
    assert "gemini-3.1-flash-live-preview" in res["model"]
    assert res["consulted_edith"] is False


@pytest.mark.asyncio
async def test_edith_autonomous_refusal_with_suggestion(test_session: AsyncSession):
    """
    Verifies that EDITH autonomously evaluates a 35% discount request from Friday,
    DENIES it because it breaches the 15% threshold, and supplies a strategic counter-suggestion.
    """
    edith = EdithBrain()
    res = await edith.evaluate_task_request(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        task_description="Please send a special promo with 35% discount to this client.",
        target_phone="+91 98001 23456",
        requested_discount=35.0,
    )
    assert res["decision"] == "DENIED"
    assert res["policy_checked"] == "MAX_AUTONOMOUS_DISCOUNT_LIMIT"
    assert "35.0%" in res["reasoning"]
    assert "Strategic Suggestion" in res.get("suggestion", "")


@pytest.mark.asyncio
async def test_edith_autonomous_approval(test_session: AsyncSession):
    """
    Verifies that EDITH autonomously evaluates a compliant 10% volume discount request,
    and ACCEPTS the task.
    """
    edith = EdithBrain()
    res = await edith.evaluate_task_request(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        task_description="Please quote 10% volume discount for standard commercial package.",
        target_phone="+91 98001 99999",
        requested_discount=10.0,
    )
    assert res["decision"] == "ACCEPTED"
    assert "10.0%" in res["reasoning"]
    assert res["action_executed"] is True


@pytest.mark.asyncio
async def test_edith_emotional_debrief(test_session: AsyncSession):
    """
    Verifies that EDITH can post a customer tone debrief or knowledge gap to Friday over the bus.
    """
    debrief_res = await inter_brain_bus.post_edith_debrief(
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
        category="RUDE_CUSTOMER",
        details={
            "phone": "+91 98765 43210",
            "customer_message": "Your prices are ridiculous!",
            "sentiment_score": -0.85,
        },
    )
    assert debrief_res["id"] is not None
    assert debrief_res["category"] == "RUDE_CUSTOMER"
    assert "Friday" in debrief_res["content"] or "commercial policy" in debrief_res["content"].lower() or "hostile" in debrief_res["reasoning"].lower()


@pytest.mark.asyncio
async def test_codebase_service_inspection():
    """
    Verifies that Friday/EDITH code self-inspection can read files and prevent path traversal.
    """
    # 1. Valid file read
    read_res = CodebaseService.read_code_file("backend/app/config.py", 1, 30)
    assert read_res["total_lines"] > 20
    assert "Settings" in read_res["raw_content"]

    # 2. Path traversal security protection
    with pytest.raises(ValueError, match="Access denied"):
        CodebaseService.read_code_file("../../etc/passwd")


@pytest.mark.asyncio
async def test_codebase_service_search():
    """
    Verifies that AI brains can search their own codebase for symbols.
    """
    search_res = CodebaseService.search_codebase("GEMINI_MODEL", "backend/app", 10)
    assert search_res["matches_found"] > 0
    assert any("config.py" in m["file"] for m in search_res["matches"])


@pytest.mark.asyncio
async def test_codebase_service_diagnose_error():
    """
    Verifies that Friday/EDITH can analyze an exception traceback and formulate root cause diagnosis.
    """
    sample_error = (
        'AttributeError: \'Order\' object has no attribute \'total_cents\' in '
        'File "backend/app/api/routes/orders.py", line 167'
    )
    diag = CodebaseService.diagnose_error(sample_error)
    assert "Missing Attribute" in diag["diagnosis"]
    assert "total_cents" in diag["diagnosis"]
    assert diag["identified_file"] == "backend/app/api/routes/orders.py"
    assert diag["identified_line"] == 167


@pytest.mark.asyncio
async def test_system_diagnostics_endpoint(test_session: AsyncSession):
    """
    Verifies system diagnostics gathering table counts and active models.
    """
    diag = await CodebaseService.get_system_diagnostics(test_session, settings.DEFAULT_ORG_ID)
    assert diag["status"] == "healthy"
    assert "Google Gemini 3.1 Flash Live Preview" in diag["active_models"]["friday"]
    assert "leads" in diag["database_tables"]
    assert "inter_brain_messages" in diag["database_tables"]


@pytest.mark.asyncio
async def test_friday_database_stats_and_purge(test_session: AsyncSession):
    """
    Verifies that Friday can query live database stats and collaborate with EDITH to purge simulations.
    """
    friday = FridayBrain()

    # 1. Ask Friday to check full database
    res = await friday.chat(
        user_message="Check the full database stats",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert res["speaker"] == "Friday"
    assert "Full Database Integrity & Storage Summary" in res["reply"]
    assert "database_stats" in res

    # 2. Ask Friday to purge simulation history
    purge_res = await friday.chat(
        user_message="Friday, please purge simulation history",
        session=test_session,
        org_id=settings.DEFAULT_ORG_ID,
    )
    assert purge_res["speaker"] == "Friday"
    assert "Simulation History Purged Successfully" in purge_res["reply"]
    assert purge_res["consulted_edith"] is True


@pytest.mark.asyncio
async def test_friday_ui_agency_actions(test_session: AsyncSession):
    """
    Verifies that Friday can execute universal UI actions (clicking, navigating, theme setting)
    and log audit trails and notifications.
    """
    from app.services import friday_actions
    org_id = settings.DEFAULT_ORG_ID

    # 1. Click element action
    click_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="click_ui_element",
        params={"element_query": "Suggest Reply"},
    )
    assert click_res["success"] is True
    assert click_res["payload"]["action"] == "click"
    assert click_res["payload"]["target"] == "Suggest Reply"

    # 2. Navigate page action
    nav_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="navigate_page",
        params={"path": "/conversations"},
    )
    assert nav_res["success"] is True
    assert nav_res["payload"]["action"] == "navigate"
    assert nav_res["payload"]["path"] == "/conversations"

    # 3. Theme switch action
    theme_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="set_ui_theme",
        params={"theme": "dark"},
    )
    assert theme_res["success"] is True
    assert theme_res["payload"]["action"] == "theme"
    assert theme_res["payload"]["theme"] == "dark"


@pytest.mark.asyncio
async def test_friday_suggest_reply_and_agency_chat(test_session: AsyncSession):
    """
    Verifies Friday's chat abilities to suggest replies for groups and trigger website agency commands.
    """
    from app.brain.inter_brain_bus import FridayBrain
    from app.database.models import Conversation, Customer, Message
    org_id = settings.DEFAULT_ORG_ID

    customer = Customer(
        org_id=org_id,
        name="Siliguri Group Admin",
        primary_phone="+919832011111",
    )
    test_session.add(customer)
    await test_session.flush()

    # Create a test group conversation
    conv = Conversation(
        org_id=org_id,
        customer_id=customer.id,
        channel="whatsapp",
        channel_id="120363029999999999@g.us",
        mode="HUMAN",
        metadata_json={"is_group": True, "group_name": "Siliguri Wholesale Buyers"},
    )
    test_session.add(conv)
    await test_session.flush()

    msg = Message(
        org_id=org_id,
        conversation_id=conv.id,
        direction="inbound",
        sender_type="customer",
        sender_id="+919832011111",
        content="Hello, what is the best wholesale price for 200kg Assam CTC?",
        delivery_status="received",
    )
    test_session.add(msg)
    await test_session.commit()

    friday = FridayBrain()

    # 1. Ask Friday to suggest reply for group
    sugg_res = await friday.chat(
        user_message="Friday, please suggest reply for group with 5% volume discount",
        session=test_session,
        org_id=org_id,
    )
    assert sugg_res["speaker"] == "Friday"
    assert "suggested_reply" in sugg_res
    assert len(sugg_res["suggested_reply"]) > 10
    assert "1-Click AI Reply Suggested" in sugg_res["reply"]

    # 2. Command Friday to click an element
    click_res = await friday.chat(
        user_message="Click on 'Suggest Reply'",
        session=test_session,
        org_id=org_id,
    )
    assert click_res["speaker"] == "Friday"
    assert "clicked" in click_res["reply"].lower()
    assert click_res.get("ui_action", {}).get("action") == "click"

    # 3. Command Friday to navigate to conversations
    nav_res = await friday.chat(
        user_message="Go to conversations",
        session=test_session,
        org_id=org_id,
    )
    assert nav_res["speaker"] == "Friday"
    assert "/conversations" in nav_res["reply"]
    assert nav_res.get("ui_action", {}).get("action") == "navigate"


@pytest.mark.asyncio
async def test_friday_model_management_actions_and_chat(test_session: AsyncSession):
    """
    Verifies that Friday can assign model roles, update inference hyperparameters,
    and open/configure the model testing playground via both direct actions and natural language commands.
    """
    from app.services import friday_actions
    from app.brain.inter_brain_bus import FridayBrain
    org_id = settings.DEFAULT_ORG_ID
    friday = FridayBrain()

    # 1. Direct Action: Assign model role
    role_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="set_model_role",
        params={"role": "edith_sales_model", "model_id": "meta/llama-3.3-70b-instruct"},
    )
    assert role_res["success"] is True
    assert role_res["role"] == "edith_sales_model"
    assert role_res["model_id"] == "meta/llama-3.3-70b-instruct"
    assert settings.EDITH_SALES_MODEL == "meta/llama-3.3-70b-instruct"

    # 2. Direct Action: Update model settings (temperature, tokens)
    settings_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="update_model_settings",
        params={"temperature": 0.45, "max_tokens": 1500, "timeout": 45},
    )
    assert settings_res["success"] is True
    assert settings.LLM_TEMPERATURE == 0.45
    assert settings.LLM_MAX_TOKENS == 1500
    assert settings.LLM_REQUEST_TIMEOUT == 45

    # 3. Direct Action: Open playground
    play_res = await friday_actions.execute_action(
        session=test_session,
        org_id=org_id,
        action_name="open_playground",
        params={"model_id": "gemini-2.5-pro"},
    )
    assert play_res["success"] is True
    assert "playground" in play_res["path"]
    assert "gemini-2.5-pro" in play_res["path"]

    # 4. Chat Command: Switch model for Friday
    chat_switch = await friday.chat(
        user_message="Friday, switch model to gemini-2.5-pro",
        session=test_session,
        org_id=org_id,
    )
    assert chat_switch["speaker"] == "Friday"
    assert "gemini-2.5-pro" in chat_switch["reply"]
    assert settings.FRIDAY_WEB_MODEL == "gemini-2.5-pro"

    # 5. Chat Command: Set EDITH to Llama
    chat_edith = await friday.chat(
        user_message="Friday, set EDITH to meta/llama-3.3-70b-instruct",
        session=test_session,
        org_id=org_id,
    )
    assert chat_edith["speaker"] == "Friday"
    assert "meta/llama-3.3-70b-instruct" in chat_edith["reply"]

    # 6. Chat Command: Set temperature
    chat_temp = await friday.chat(
        user_message="Friday, set temperature to 0.35",
        session=test_session,
        org_id=org_id,
    )
    assert chat_temp["speaker"] == "Friday"
    assert "0.35" in chat_temp["reply"]
    assert settings.LLM_TEMPERATURE == 0.35

    # 7. Chat Command: Open playground
    chat_play = await friday.chat(
        user_message="Friday, open playground to test gemini-2.5-flash",
        session=test_session,
        org_id=org_id,
    )
    assert chat_play["speaker"] == "Friday"
    assert "Playground" in chat_play["reply"]


