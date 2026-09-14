"""
Unit tests for CorrelationIdMiddleware and SecurityHeadersMiddleware.
"""

import pytest
from httpx import ASGITransport, AsyncClient
from app.main import app


@pytest.mark.asyncio
async def test_security_headers_middleware():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        headers = res.headers
        assert headers["X-Content-Type-Options"] == "nosniff"
        assert headers["X-Frame-Options"] == "DENY"
        assert headers["X-XSS-Protection"] == "1; mode=block"
        assert headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
        assert headers["Permissions-Policy"] == "camera=(), microphone=(), geolocation=()"


@pytest.mark.asyncio
async def test_correlation_id_middleware_generates_and_times():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/")
        assert res.status_code == 200
        assert "X-Request-ID" in res.headers
        assert res.headers["X-Request-ID"].startswith("req_")
        assert "X-Response-Time-Ms" in res.headers
        response_time = float(res.headers["X-Response-Time-Ms"])
        assert response_time >= 0.0


@pytest.mark.asyncio
async def test_correlation_id_middleware_propagates_existing():
    transport = ASGITransport(app=app)
    custom_id = "test-corr-id-12345"
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/", headers={"X-Request-ID": custom_id})
        assert res.status_code == 200
        assert res.headers["X-Request-ID"] == custom_id
