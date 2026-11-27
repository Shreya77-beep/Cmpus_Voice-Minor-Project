import asyncio
import datetime
import json
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.database import SessionLocal
from app.core.realtime import realtime_hub
from app.core.security import SESSION_COOKIE_NAME, verify_access_token
from app.models.user import User

router = APIRouter()


@router.websocket("/events")
async def websocket_events(websocket: WebSocket):
    """Authenticated real-time event stream for Student, Department, and Admin portals."""
    realtime_hub.set_loop(asyncio.get_running_loop())

    token = websocket.cookies.get(SESSION_COOKIE_NAME)
    payload = verify_access_token(token) if token else None
    if not payload or "sub" not in payload:
        await websocket.close(code=4401)
        return

    with SessionLocal() as db:
        user = db.query(User).filter(User.id == payload["sub"]).first()
        if not user:
            await websocket.close(code=4401)
            return
        user_ctx = {
            "user_id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "student_id": user.student_id,
            "department_name": user.department_name,
        }

    await realtime_hub.connect(websocket, user_ctx)
    try:
        await websocket.send_text(json.dumps({
            "type": "connected",
            "payload": {"role": user_ctx["role"], "department": user_ctx["department_name"]},
            "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
        }))
        while True:
            msg = await websocket.receive_text()
            if msg == "ping":
                await websocket.send_text(json.dumps({
                    "type": "pong",
                    "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
                }))
    except WebSocketDisconnect:
        realtime_hub.disconnect(websocket)
    except Exception:
        realtime_hub.disconnect(websocket)
