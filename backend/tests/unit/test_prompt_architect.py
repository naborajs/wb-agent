"""
Unit tests for NemoTron 3 Ultra 550B Prompt Architect System and Modularity (Sections 66, 67, 68).
Verifies:
- PROMPT_ARCHITECT fallback chain: nvidia/nemotron-3-ultra-550b-a55b -> nvidia/nemotron-3-super-120b-a12b
- ai_router.optimize_system_prompt() synthesis & quality scoring
- POST /api/v1/prompts/{section}/ai-optimize endpoint
- History audit log & rollback with quality metadata
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.ai.chains import get_capability_chain
from app.ai.router import AIRouter, ai_router
from app.ai.types import Capability
from app.database.base import Base
from app.database.models import Organization
from app.database.session import get_db
from app.main import app


@pytest.fixture
def clean_chains():
    chain = get_capability_chain(Capability.PROMPT_ARCHITECT)
    assert "nvidia/nemotron-3-ultra-550b-a55b" in chain
    assert "nvidia/nemotron-3-super-120b-a12b" in chain
    assert chain[0] == "nvidia/nemotron-3-ultra-550b-a55b"
    assert chain[1] == "nvidia/nemotron-3-super-120b-a12b"


@pytest.mark.asyncio
async def test_prompt_architect_fallback_chain(clean_chains):
    """Verifies that NemoTron 3 Ultra 550B is the primary thinking model and Super 120B is fallback."""
    chain = get_capability_chain(Capability.PROMPT_ARCHITECT)
    assert len(chain) >= 2
    assert chain[0] == "nvidia/nemotron-3-ultra-550b-a55b"
    assert chain[1] == "nvidia/nemotron-3-super-120b-a12b"


@pytest.mark.asyncio
async def test_optimize_system_prompt_synthesis():
    """Verifies that optimize_system_prompt produces an enhanced prompt with rating scores."""
    router = AIRouter()
    res = await router.optimize_system_prompt(
        section_name="sales_style",
        user_intent="Ensure EDITH asks only one question at a time and qualifies daily cafe footfall",
        current_prompt="You are a sales agent. Ask questions about the buyer.",
    )

    assert res.section == "sales_style"
    assert len(res.optimized_prompt) > len("You are a sales agent.")
    assert res.rating_score >= 80
    assert res.rating_grade in ("A+", "A", "B+", "B")
    assert res.rating_breakdown.clarity >= 80
    assert res.rating_breakdown.constraint_strength >= 80
    assert res.rating_breakdown.b2b_effectiveness >= 80
    assert res.rating_breakdown.safety_grounding >= 80
    assert len(res.summary_of_changes) > 0


@pytest.fixture
async def prompt_client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_factory = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with session_factory() as session:
        org = Organization(id="org_default_tea", name="North Bengal Tea Co.", slug="north-bengal-tea")
        session.add(org)
        await session.commit()

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
            except Exception:
                await session.rollback()
                raise
            finally:
                await session.close()

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_ai_optimize_endpoint_and_version_persistence(prompt_client):
    """
    Verifies POST /api/v1/prompts/{section}/ai-optimize and subsequent version creation and rollback.
    """
    # 1. Optimize sales_style prompt
    req = {
        "user_intent": "Make the agent sound like a seasoned Darjeeling wholesale expert with strict single-question SPIN inquiries.",
        "current_prompt": "You are a sales rep for tea.",
    }
    opt_res = await prompt_client.post("/api/v1/prompts/sales_style/ai-optimize", json=req)
    assert opt_res.status_code == 200
    data = opt_res.json()
    assert data["success"] is True
    assert data["section"] == "sales_style"
    assert data["rating_score"] >= 80
    assert data["rating_grade"] in ("A+", "A", "B+")
    assert "optimized_prompt" in data
    assert "summary_of_changes" in data

    # 2. Save new version with rating metadata
    save_req = {
        "content": data["optimized_prompt"],
        "change_summary": "Upgraded via NemoTron 3 Ultra 550B",
        "author": "NemoTron-550B-Copilot",
        "rating_score": data["rating_score"],
        "rating_grade": data["rating_grade"],
        "model_used": data["model_used"],
    }
    save_res = await prompt_client.put("/api/v1/prompts/sales_style", json=save_req)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["version"] >= 1
    assert save_data["rating_score"] == data["rating_score"]

    # 3. Verify history records rating score
    hist_res = await prompt_client.get("/api/v1/prompts/sales_style/history")
    assert hist_res.status_code == 200
    hist = hist_res.json()["history"]
    assert len(hist) >= 1
    assert hist[0]["rating_score"] == data["rating_score"]
    assert hist[0]["rating_grade"] == data["rating_grade"]
    assert hist[0]["author"] == "NemoTron-550B-Copilot"

    # 4. Create second version and rollback
    save_req_2 = {
        "content": "Temporary instruction that user wants to rollback.",
        "change_summary": "Accidental edit",
        "author": "operator",
    }
    save_res_2 = await prompt_client.put("/api/v1/prompts/sales_style", json=save_req_2)
    assert save_res_2.status_code == 200
    v2 = save_res_2.json()["version"]

    rollback_res = await prompt_client.post(f"/api/v1/prompts/sales_style/rollback/{save_data['version']}")
    assert rollback_res.status_code == 200
    assert rollback_res.json()["version"] == save_data["version"]
