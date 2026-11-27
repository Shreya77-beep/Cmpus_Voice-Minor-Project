import asyncio
import os
from contextlib import asynccontextmanager
from pathlib import Path
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal, get_db
from app.core.realtime import realtime_hub
from app.api.endpoints import assistant, complaints, notices, auth, notifications, qr, ws
from app.models.complaint import Complaint
from app.models.notice import Notice
from app.models.user import User, UserRole
from app.services.complaint_service import complaint_service
from app.services.notice_service import notice_service
from app.services.auth_service import auth_service
from app.services.notification_service import notification_service

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

# Migrate schema and ensure required institutional directory accounts & notices exist
with SessionLocal() as db_session:
    auth_service.seed_users(db_session)
    notice_service.ensure_schema(db_session)
    notice_service.seed_mock_notices(db_session)
    if os.getenv("SEED_SAMPLE_DATA", "false").lower() == "true":
        complaint_service.seed_mock_data(db_session)
        notification_service.seed_mock_notifications(db_session)

@asynccontextmanager
async def lifespan(app: FastAPI):
    realtime_hub.set_loop(asyncio.get_running_loop())
    yield

app = FastAPI(
    title="CampusVoice API",
    version=settings.VERSION,
    description="CampusVoice: AI-Powered Smart Campus Assistance and Grievance Management System",
    lifespan=lifespan,
)

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API endpoints
app.include_router(auth.router, prefix=f"{settings.API_V1_PREFIX}/auth", tags=["Authentication"])
app.include_router(assistant.router, prefix=f"{settings.API_V1_PREFIX}/assistant", tags=["Student Voice Assistant"])
app.include_router(complaints.router, prefix=f"{settings.API_V1_PREFIX}/complaints", tags=["Complaints & Analytics"])
app.include_router(notices.router, prefix=f"{settings.API_V1_PREFIX}/notices", tags=["College Notices"])
app.include_router(notifications.router, prefix=f"{settings.API_V1_PREFIX}/notifications", tags=["Real-time Notifications"])
app.include_router(qr.router, prefix=f"{settings.API_V1_PREFIX}/qr", tags=["QR Code Portal Access"])
app.include_router(ws.router, prefix=f"{settings.API_V1_PREFIX}/ws", tags=["Real-time WebSockets"])

@app.get("/api/public/stats")
def get_public_campus_stats(db: Session = Depends(get_db)):
    """Privacy-safe live aggregate platform telemetry for the landing page."""
    analytics = complaint_service.get_analytics(db)
    total = analytics.get("total", 0)
    resolved = analytics.get("resolved", 0)
    in_progress = analytics.get("in_progress", 0)
    sla_rate = round(((resolved + in_progress) / total) * 100, 1) if total > 0 else 100.0
    dept_count = (
        db.query(User.department_name)
        .filter(User.role == UserRole.DEPARTMENT.value, User.department_name.isnot(None))
        .distinct()
        .count()
    )
    return {
        "active_units": max(dept_count, 5),
        "total_complaints": total,
        "resolved_complaints": resolved,
        "sla_rate": sla_rate,
        "total_notices": db.query(Notice).count(),
        "online_clients": realtime_hub.get_online_summary().get("total", 0),
    }

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "app": "CampusVoice",
        "docs": "/docs",
        "realtime": True,
        "online_connections": realtime_hub.get_online_summary(),
    }

# Frontend directory paths
FRONTEND_DIR = Path(__file__).resolve().parent.parent.parent / "frontend"

if FRONTEND_DIR.exists():
    @app.get("/student")
    def serve_student_portal():
        return FileResponse(FRONTEND_DIR / "student.html")

    @app.get("/department")
    def serve_department_portal():
        return FileResponse(FRONTEND_DIR / "department.html")

    @app.get("/admin")
    def serve_admin_portal():
        return FileResponse(FRONTEND_DIR / "admin.html")

    # Serve static assets and landing page at root
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
