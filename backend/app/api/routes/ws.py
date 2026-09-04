"""
Real-time WebSocket Endpoint for live inbox streaming (Section 83).
"""

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from app.config import settings
from app.realtime.connection_manager import ws_manager
from app.utils.logging import logger

router = APIRouter(tags=["Realtime"])


@router.websocket("/ws")
@router.websocket("/ws/conversations")
async def websocket_endpoint(
    websocket: WebSocket,
    org_id: str = Query(default=settings.DEFAULT_ORG_ID),
):
    """
    WebSocket connection endpoint for live dashboard event streaming.
    """
    await ws_manager.connect(websocket, org_id)
    try:
        while True:
            # Keep-alive ping/pong receiver
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, org_id)
        logger.info(f"WebSocket client disconnected from org '{org_id}'.")
    except Exception as e:
        ws_manager.disconnect(websocket, org_id)
        logger.warning(f"WebSocket error: {e}")
