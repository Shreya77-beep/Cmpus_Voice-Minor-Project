import asyncio
import datetime
import json
from typing import Any, Dict, List, Optional
from fastapi import WebSocket


class RealtimeHub:
    """Thread-safe WebSocket pub/sub hub pushing real-time college portal events."""

    def __init__(self) -> None:
        self._connections: List[Dict[str, Any]] = []
        self._loop: Optional[asyncio.AbstractEventLoop] = None

    def set_loop(self, loop: asyncio.AbstractEventLoop) -> None:
        self._loop = loop

    async def connect(self, websocket: WebSocket, user_ctx: Dict[str, Any]) -> None:
        self.set_loop(asyncio.get_running_loop())
        await websocket.accept()
        self._connections.append({"ws": websocket, "user": user_ctx})

    def disconnect(self, websocket: WebSocket) -> None:
        self._connections = [c for c in self._connections if c["ws"] is not websocket]

    def get_online_summary(self) -> Dict[str, int]:
        counts = {"total": len(self._connections), "student": 0, "department": 0, "admin": 0}
        for conn in self._connections:
            role = conn["user"].get("role")
            if role in counts:
                counts[role] += 1
        return counts

    async def broadcast(
        self,
        event_type: str,
        payload: Dict[str, Any],
        target_student_id: Optional[str] = None,
        target_category: Optional[str] = None,
    ) -> None:
        message = json.dumps({
            "type": event_type,
            "payload": payload,
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        })

        stale: List[WebSocket] = []
        for conn in list(self._connections):
            user = conn["user"]
            role = user.get("role")
            should_send = False

            if target_student_id == "all":
                should_send = True
            elif role == "admin":
                should_send = True
            elif role == "department":
                dept = user.get("department_name")
                should_send = (not target_category) or (dept == target_category)
            elif role == "student" and target_student_id:
                sid = user.get("student_id") or user.get("username")
                should_send = sid == target_student_id

            if not should_send:
                continue

            try:
                await conn["ws"].send_text(message)
            except Exception:
                stale.append(conn["ws"])

        for ws in stale:
            self.disconnect(ws)

    def publish_sync(
        self,
        event_type: str,
        payload: Dict[str, Any],
        target_student_id: Optional[str] = None,
        target_category: Optional[str] = None,
    ) -> None:
        """Safe trigger from synchronous FastAPI routes or SQLAlchemy services."""
        loop = self._loop
        if loop and loop.is_running():
            asyncio.run_coroutine_threadsafe(
                self.broadcast(
                    event_type=event_type,
                    payload=payload,
                    target_student_id=target_student_id,
                    target_category=target_category,
                ),
                loop,
            )


realtime_hub = RealtimeHub()
