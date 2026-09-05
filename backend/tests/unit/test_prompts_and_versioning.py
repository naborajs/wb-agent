"""
Unit tests for modular prompt architecture, versioning, assembly, and rollback (Sections 66, 67, 68).
"""

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.agent.prompts import PromptService, DEFAULT_PROMPT_SECTIONS
from app.config import settings
from app.database.base import Base
from app.database.session import get_db
from app.main import app


@pytest.fixture
async def prompt_test_client():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client, test_session_factory

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_prompt_assembly_and_service(prompt_test_client):
    _, session_factory = prompt_test_client
    org_id = settings.DEFAULT_ORG_ID

    async with session_factory() as session:
        svc = PromptService(session, org_id)

        # 1. Assemble default prompt
        assembled = await svc.assemble_system_prompt()
        assert "CORE_SAFETY" in assembled
        assert "CORE_IDENTITY" in assembled
        assert "BUSINESS_POLICY" in assembled
        assert "SALES_STYLE" in assembled
        assert "BUSINESS_PROFILE" in assembled

        # 2. Create new version for sales_style
        custom_style = "Always focus on understanding cafe beverage menus before quoting rates."
        v2 = await svc.create_version("sales_style", custom_style, author="admin", change_summary="Cafe focus")
        assert v2.version == 1
        assert v2.is_active is True

        # Verify new assembled prompt includes the custom style
        assembled_v2 = await svc.assemble_system_prompt()
        assert custom_style in assembled_v2


@pytest.mark.asyncio
async def test_prompt_api_endpoints(prompt_test_client):
    client, _ = prompt_test_client

    # 1. Get all sections
    res = await client.get("/api/v1/prompts")
    assert res.status_code == 200
    data = res.json()["sections"]
    assert "core_safety" in data
    assert "core_identity" in data

    # 2. Update section via POST
    update_res = await client.post(
        "/api/v1/prompts/business_policy",
        json={
            "content": "Updated policy: Minimum order quantity for private blend is 50kg.",
            "change_summary": "Updated private blend MOQ",
            "author": "Ops Director",
        },
    )
    assert update_res.status_code == 200
    assert update_res.json()["version"] == 1

    # 3. Create another version
    update_res2 = await client.post(
        "/api/v1/prompts/business_policy",
        json={
            "content": "Updated policy: Minimum order quantity for private blend is 100kg.",
            "change_summary": "Increased private blend MOQ to 100kg",
            "author": "Owner",
        },
    )
    assert update_res2.status_code == 200
    assert update_res2.json()["version"] == 2

    # 4. View history
    hist_res = await client.get("/api/v1/prompts/business_policy/history")
    assert hist_res.status_code == 200
    history = hist_res.json()["history"]
    assert len(history) == 2

    # 5. Rollback to version 1
    rb_res = await client.post("/api/v1/prompts/business_policy/rollback/1")
    assert rb_res.status_code == 200
    assert rb_res.json()["version"] == 1
    assert rb_res.json()["is_active"] is True

    # 6. Attempt to delete active version 1 (should fail with 400)
    del_active_res = await client.delete("/api/v1/prompts/business_policy/history/1")
    assert del_active_res.status_code == 400

    # 7. Delete inactive version 2 (should succeed)
    del_res = await client.delete("/api/v1/prompts/business_policy/history/2")
    assert del_res.status_code == 200
    assert del_res.json()["deleted_version"] == 2

    # Verify history now only contains version 1
    hist_res2 = await client.get("/api/v1/prompts/business_policy/history")
    assert len(hist_res2.json()["history"]) == 1

    # 8. Create version 3 & 4 to test prune
    await client.post(
        "/api/v1/prompts/business_policy",
        json={"content": "Version 3 policy text", "change_summary": "v3"},
    )
    await client.post(
        "/api/v1/prompts/business_policy",
        json={"content": "Version 4 policy text", "change_summary": "v4"},
    )
    # At this point: v4 is active, v1 and v3 are inactive

    # Prune inactive history keeping 0
    prune_res = await client.delete("/api/v1/prompts/business_policy/history?keep_latest=0")
    assert prune_res.status_code == 200
    assert prune_res.json()["deleted_count"] == 2

    # Verify only active v3 remains
    hist_res3 = await client.get("/api/v1/prompts/business_policy/history")
    assert len(hist_res3.json()["history"]) == 1
    assert hist_res3.json()["history"][0]["version"] == 3
    assert hist_res3.json()["history"][0]["is_active"] is True

