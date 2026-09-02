"""
Unit tests for realtime ConnectionManager and WebSocket broadcasting.
"""

from unittest.mock import AsyncMock
import pytest
from app.realtime.connection_manager import ConnectionManager


@pytest.mark.asyncio
async def test_connection_manager_lifecycle():
    mgr = ConnectionManager()
    org_id = "org_ws_test"

    # Mock WebSockets
    ws1 = AsyncMock()
    ws2 = AsyncMock()

    # Connect clients
    await mgr.connect(ws1, org_id)
    await mgr.connect(ws2, org_id)

    assert org_id in mgr.active_connections
    assert len(mgr.active_connections[org_id]) == 2
    ws1.accept.assert_called_once()
    ws2.accept.assert_called_once()

    # Broadcast event
    await mgr.broadcast_to_org(
        org_id,
        "new_message",
        {"conversation_id": "conv_1", "text": "Hello WebSocket"}
    )
    ws1.send_text.assert_called_once()
    ws2.send_text.assert_called_once()

    # Disconnect one client
    mgr.disconnect(ws1, org_id)
    assert len(mgr.active_connections[org_id]) == 1

    # Disconnect last client
    mgr.disconnect(ws2, org_id)
    assert org_id not in mgr.active_connections
