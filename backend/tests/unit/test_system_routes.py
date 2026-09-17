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
