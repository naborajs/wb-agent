"""
Unit test for lead CSV export endpoint.
"""

from fastapi.testclient import TestClient
from app.main import app


def test_export_leads_csv():
    client = TestClient(app)
    response = client.get("/api/v1/leads/export/csv")

    assert response.status_code == 200
    assert "text/csv" in response.headers.get("content-type", "")
    assert "attachment; filename=leads_export.csv" in response.headers.get("content-disposition", "")

    csv_text = response.text
    assert "ID,Name,Phone,Email,Company,Company Type,Status,Score,City,State,Created At" in csv_text
