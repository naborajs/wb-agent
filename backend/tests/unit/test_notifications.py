import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.database.base import Base
from app.database.models import Organization
from app.database.session import get_db
from app.config import settings
from app.main import app


@pytest.fixture
async def app_client():
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    test_session_factory = async_sessionmaker(bind=test_engine, class_=AsyncSession, expire_on_commit=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    org_id = settings.DEFAULT_ORG_ID
    async with test_session_factory() as session:
        org = Organization(id=org_id, name="Commercial Enterprise", slug="commercial-enterprise")
        session.add(org)
        await session.commit()

    async def override_get_db():
        async with test_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

    app.dependency_overrides.clear()
    await test_engine.dispose()


@pytest.mark.asyncio
async def test_notifications_crud_and_counts(app_client: AsyncClient):
    # 1. Create notification from EDITH
    create_res = await app_client.post(
        "/api/v1/notifications",
        json={
            "sender_brain": "EDITH",
            "title": "Commercial Policy Alert",
            "content": "Customer offered unacceptable 40% discount; autonomously denied.",
            "category": "POLICY_REFUSAL",
            "severity": "warning",
            "action_url": "/brain",
        },
    )
    assert create_res.status_code == 201
    data = create_res.json()
    notif_id = data["id"]
    assert data["sender_brain"] == "EDITH"
    assert data["is_read"] is False

    # 2. List notifications
    list_res = await app_client.get("/api/v1/notifications")
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["unread_count"] >= 1
    assert any(n["id"] == notif_id for n in list_data["notifications"])

    # 3. Mark single as read
    read_res = await app_client.post(f"/api/v1/notifications/{notif_id}/read")
    assert read_res.status_code == 200
    assert read_res.json()["is_read"] is True

    # 4. Mark all as read
    all_read_res = await app_client.post("/api/v1/notifications/mark-all-read")
    assert all_read_res.status_code == 200

    # 5. Delete notification
    del_res = await app_client.delete(f"/api/v1/notifications/{notif_id}")
    assert del_res.status_code == 200
    assert del_res.json()["deleted_id"] == notif_id
