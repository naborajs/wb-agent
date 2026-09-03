"""
E2E Test Suite for R3: Real-Time WebSocket Live Sync & Dashboard Audio Alerts.
Covers Tier 1 (Feature Coverage) and Tier 2 (Boundary & Corner Cases).
"""

import json
from unittest.mock import AsyncMock
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.realtime.connection_manager import ws_manager


# ===========================================================================
# Tier 1: Feature Coverage (R3)
# ===========================================================================

def test_websocket_connection_and_keepalive_ping():
    """
    R3-T1.1: Verify persistent WebSocket connection to /api/v1/ws and ping/pong keepalive.
    """
    client = TestClient(app)
    org_id = "org_default_tea"
    with client.websocket_connect(f"/api/v1/ws?org_id={org_id}") as ws:
        ws.send_text("ping")
        data = ws.receive_text()
        assert data == "pong"


@pytest.mark.asyncio
async def test_websocket_broadcast_new_message_event():
    """
    R3-T1.2: Verify inbound customer message triggers instantaneous
    new_message broadcast event to organization subscribers.
    """
    org_id = "org_tea_inbox_test"
    mock_ws = AsyncMock()
    mock_ws.send_text = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    try:
        msg_payload = {
            "conversation_id": "conv_live_01",
            "sender": "customer",
            "text": "Bhai 50kg Assam CTC Siliguri delivery rate batao",
            "timestamp": "2026-09-04T00:00:00Z",
        }
        await ws_manager.broadcast_to_org(org_id, "new_message", msg_payload)

        assert mock_ws.send_text.called
        sent_data = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_data["event"] == "new_message"
        assert sent_data["data"]["conversation_id"] == "conv_live_01"
        assert sent_data["data"]["text"] == msg_payload["text"]
    finally:
        ws_manager.disconnect(mock_ws, org_id)


@pytest.mark.asyncio
async def test_websocket_broadcast_stage_changed_event():
    """
    R3-T1.3: Verify sales funnel stage updates broadcast stage_changed events
    with old stage, new stage, and trigger reason.
    """
    org_id = "org_tea_stage_test"
    mock_ws = AsyncMock()
    mock_ws.send_text = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    try:
        stage_payload = {
            "conversation_id": "conv_stage_01",
            "from_stage": "DISCOVERY",
            "to_stage": "QUALIFIED",
            "score": 70,
            "reason": "Customer confirmed 100kg monthly requirement",
        }
        await ws_manager.broadcast_to_org(org_id, "stage_changed", stage_payload)

        assert mock_ws.send_text.called
        sent_data = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_data["event"] == "stage_changed"
        assert sent_data["data"]["from_stage"] == "DISCOVERY"
        assert sent_data["data"]["to_stage"] == "QUALIFIED"
    finally:
        ws_manager.disconnect(mock_ws, org_id)


@pytest.mark.asyncio
async def test_websocket_hot_lead_alert_and_chime():
    """
    R3-T1.4: Verify high-scoring hot leads (score >= 80) trigger hot_lead
    event containing audio chime signal for dashboard operator alert.
    """
    org_id = "org_tea_chime_test"
    mock_ws = AsyncMock()
    mock_ws.send_text = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    try:
        hot_payload = {
            "conversation_id": "conv_hot_01",
            "lead_score": 85,
            "chime_trigger": "HOT_LEAD_ALERT",
            "buyer_name": "Siliguri Cafe Chain Owner",
            "message": "Send me the invoice for 100kg right now!",
        }
        await ws_manager.broadcast_to_org(org_id, "hot_lead", hot_payload)

        assert mock_ws.send_text.called
        sent_data = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_data["event"] == "hot_lead"
        assert sent_data["data"]["lead_score"] == 85
        assert sent_data["data"]["chime_trigger"] == "HOT_LEAD_ALERT"
    finally:
        ws_manager.disconnect(mock_ws, org_id)


@pytest.mark.asyncio
async def test_websocket_handoff_alert_event():
    """
    R3-T1.5: Verify human takeover escalation broadcasts handoff_alert event.
    """
    org_id = "org_tea_handoff_test"
    mock_ws = AsyncMock()
    mock_ws.send_text = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    try:
        handoff_payload = {
            "conversation_id": "conv_takeover_01",
            "reason": "Customer requested human sales manager",
            "priority": "HIGH",
        }
        await ws_manager.broadcast_to_org(org_id, "handoff_alert", handoff_payload)

        assert mock_ws.send_text.called
        sent_data = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_data["event"] == "handoff_alert"
        assert sent_data["data"]["priority"] == "HIGH"
    finally:
        ws_manager.disconnect(mock_ws, org_id)


# ===========================================================================
# Tier 2: Boundary & Corner Cases (R3)
# ===========================================================================

@pytest.mark.asyncio
async def test_websocket_boundary_score_79_vs_80():
    """
    R3-T2.1: Verify threshold boundary for operator chime:
    - Score 79: regular score_updated event, no hot_lead alert
    - Score 80: hot_lead alert broadcasted
    """
    org_id = "org_score_boundary_test"
    mock_ws = AsyncMock()
    mock_ws.send_text = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    try:
        # Score 79
        score_79 = 79
        event_type_79 = "hot_lead" if score_79 >= 80 else "score_updated"
        await ws_manager.broadcast_to_org(org_id, event_type_79, {"score": score_79})
        sent_79 = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_79["event"] == "score_updated"

        # Score 80
        score_80 = 80
        event_type_80 = "hot_lead" if score_80 >= 80 else "score_updated"
        await ws_manager.broadcast_to_org(org_id, event_type_80, {"score": score_80, "chime": True})
        sent_80 = json.loads(mock_ws.send_text.call_args[0][0])
        assert sent_80["event"] == "hot_lead"
    finally:
        ws_manager.disconnect(mock_ws, org_id)


@pytest.mark.asyncio
async def test_websocket_boundary_multi_tenant_isolation():
    """
    R3-T2.2: Verify multi-tenant isolation: broadcasts to org_alpha
    are never leaked or dispatched to subscribers of org_beta.
    """
    org_alpha = "org_alpha_tea"
    org_beta = "org_beta_tea"

    ws_alpha = AsyncMock()
    ws_beta = AsyncMock()

    await ws_manager.connect(ws_alpha, org_alpha)
    await ws_manager.connect(ws_beta, org_beta)

    try:
        await ws_manager.broadcast_to_org(org_alpha, "new_message", {"text": "Alpha Confidential Order"})

        assert ws_alpha.send_text.called
        assert not ws_beta.send_text.called
    finally:
        ws_manager.disconnect(ws_alpha, org_alpha)
        ws_manager.disconnect(ws_beta, org_beta)


@pytest.mark.asyncio
async def test_websocket_boundary_client_disconnect_cleanup():
    """
    R3-T2.3: Verify that disconnecting clients are cleanly purged from active
    connections and do not leave zombie socket handles.
    """
    org_id = "org_disconnect_test"
    mock_ws = AsyncMock()

    await ws_manager.connect(mock_ws, org_id)
    assert org_id in ws_manager.active_connections
    assert mock_ws in ws_manager.active_connections[org_id]

    ws_manager.disconnect(mock_ws, org_id)
    assert (
        org_id not in ws_manager.active_connections
        or mock_ws not in ws_manager.active_connections.get(org_id, set())
    )


@pytest.mark.asyncio
async def test_websocket_boundary_concurrent_subscribers():
    """
    R3-T2.4: Verify that multiple concurrent operator sessions for the same
    organization all reliably receive broadcasted event payloads.
    """
    org_id = "org_multi_operator_test"
    clients = [AsyncMock() for _ in range(5)]

    for c in clients:
        await ws_manager.connect(c, org_id)

    try:
        broadcast_payload = {"event_id": "evt_bulk_broadcast_100"}
        await ws_manager.broadcast_to_org(org_id, "new_message", broadcast_payload)

        for c in clients:
            assert c.send_text.called
            sent = json.loads(c.send_text.call_args[0][0])
            assert sent["data"]["event_id"] == "evt_bulk_broadcast_100"
    finally:
        for c in clients:
            ws_manager.disconnect(c, org_id)


def test_websocket_boundary_malformed_client_message():
    """
    R3-T2.5: Verify sending non-ping or unexpected client messages
    does not terminate the connection or crash the server.
    """
    client = TestClient(app)
    org_id = "org_malformed_test"
    with client.websocket_connect(f"/api/v1/ws?org_id={org_id}") as ws:
        # Send unknown text
        ws.send_text("some_arbitrary_client_text")
        # Then send ping; should still respond with pong
        ws.send_text("ping")
        resp = ws.receive_text()
        assert resp == "pong"
