"""
Unit tests for FastAPI security and correlation ID middleware.
"""

from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.api.middleware import CorrelationIdMiddleware, SecurityHeadersMiddleware


def test_middleware_headers_and_correlation_id():
    app = FastAPI()
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CorrelationIdMiddleware)

    @app.get("/ping")
    def ping():
        return {"status": "pong"}

    client = TestClient(app)
    response = client.get("/ping")

    assert response.status_code == 200
    assert response.json() == {"status": "pong"}

    # Check correlation ID and response time headers
    assert "X-Request-ID" in response.headers
    assert response.headers["X-Request-ID"].startswith("req_")
    assert "X-Response-Time-Ms" in response.headers

    # Check defensive security headers
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert response.headers["X-XSS-Protection"] == "1; mode=block"
    assert response.headers["Referrer-Policy"] == "strict-origin-when-cross-origin"
    assert response.headers["Strict-Transport-Security"] == "max-age=31536000; includeSubDomains"


def test_custom_correlation_id_propagation():
    app = FastAPI()
    app.add_middleware(CorrelationIdMiddleware)

    @app.get("/echo")
    def echo():
        return {"ok": True}

    client = TestClient(app)
    response = client.get("/echo", headers={"X-Request-ID": "custom-uuid-12345"})

    assert response.status_code == 200
    assert response.headers["X-Request-ID"] == "custom-uuid-12345"
