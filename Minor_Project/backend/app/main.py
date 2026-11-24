from pathlib import Path
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from starlette.responses import FileResponse

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.api.endpoints import assistant, complaints, notices, auth, notifications, qr
from app.services.complaint_service import complaint_service
from app.services.notice_service import notice_service
from app.services.auth_service import auth_service
from app.services.notification_service import notification_service

# Ensure DB tables exist
Base.metadata.create_all(bind=engine)

# Seed demo data on startup
with SessionLocal() as db_session:
    auth_service.seed_users(db_session)
    complaint_service.seed_mock_data(db_session)
    notice_service.seed_mock_notices(db_session)
    notification_service.seed_mock_notifications(db_session)

app = FastAPI(
    title="CampusVoice API",
    version=settings.VERSION,
    description="CampusVoice: AI-Powered Smart Campus Assistance and Grievance Management System"
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

@app.get("/api/health")
def health():
    return {
        "status": "online",
        "app": "CampusVoice",
        "docs": "/docs"
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
