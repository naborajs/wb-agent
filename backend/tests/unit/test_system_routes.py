"""
Unit tests for system diagnostics and database statistics endpoints.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app


def test_system_info_endpoint():
    client = TestClient(app)
    response = client.get("/api/v1/system/info")

    assert response.status_code == 200
    data = response.json()

    assert "platform" in data
    assert "service" in data
    assert "configuration" in data

    assert "WB-Agent" in data["service"]["name"]
    assert "uptime_seconds" in data["service"]
    assert "python_version" in data["platform"]
    assert "ai_model" in data["configuration"]


def test_system_database_stats_endpoint():
    client = TestClient(app)
    response = client.get("/api/v1/system/database-stats")

    assert response.status_code == 200
    data = response.json()

    assert "database_type" in data
    assert "counts" in data
    assert "leads" in data["counts"]
    assert "customers" in data["counts"]
    assert "orders" in data["counts"]
    assert "quotes" in data["counts"]
    assert "conversations" in data["counts"]


def test_system_vacuum_endpoint():
    client = TestClient(app)
    response = client.post("/api/v1/system/vacuum")

    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("success", "skipped")
    if data["status"] == "success":
        assert "integrity" in data
        assert "before_size_kb" in data
        assert "after_size_kb" in data
