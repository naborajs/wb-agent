"""
Real-time WebSocket and Event Streaming Manager (Section 83).

Broadcasting real-time conversational events to active dashboard operators:
- new_message: Inbound customer text arrived
- stage_changed: Conversation moved forward/backward in sales funnel
- score_updated: Lead score shifted
- hot_lead: Hot buyer alert triggered
- handoff_alert: Human intervention required
"""

import json
from typing import Any, Dict, List, Set
from fastapi import WebSocket
from app.utils.logging import logger


class ConnectionManager:
    """
    Manages active WebSocket connections grouped by organization.
    """

    def __init__(self):
        self.active_connections: Dict[str, Set[WebSocket]] = {}

    async def connect(self, websocket: WebSocket, org_id: str):
        """Accepts and tracks an operator WebSocket connection."""
        await websocket.accept()
        if org_id not in self.active_connections:
            self.active_connections[org_id] = set()
        self.active_connections[org_id].add(websocket)
        logger.info(f"WebSocket client connected for org '{org_id}'. Total: {len(self.active_connections[org_id])}")

    def disconnect(self, websocket: WebSocket, org_id: str):
        """Removes a disconnected WebSocket client."""
        if org_id in self.active_connections:
            self.active_connections[org_id].discard(websocket)
            if not self.active_connections[org_id]:
                del self.active_connections[org_id]

    async def broadcast_to_org(self, org_id: str, event_type: str, data: Dict[str, Any]):
        """
        Broadcasts an event payload to all active dashboard operator sessions in the organization.
        """
        if org_id not in self.active_connections:
            return

        payload_text = json.dumps({"event": event_type, "data": data})
        stale_connections = []

        for connection in list(self.active_connections[org_id]):
            try:
                await connection.send_text(payload_text)
            except Exception as e:
                logger.warning(f"Error sending to WebSocket client: {e}")
                stale_connections.append(connection)

        for stale in stale_connections:
            self.disconnect(stale, org_id)


# Singleton instance shared across FastAPI routers and background workers
ws_manager = ConnectionManager()
