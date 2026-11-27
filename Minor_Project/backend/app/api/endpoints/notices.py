from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session
from typing import List, Optional
from app.core.database import get_db
from app.core.realtime import realtime_hub
from app.core.security import require_roles
from app.models.user import User, UserRole
from app.schemas.notice import NoticeOut, NoticeCreate
from app.services.notice_service import notice_service
from app.services.notification_service import notification_service

router = APIRouter()

def _to_notice_out(n) -> NoticeOut:
    out = NoticeOut.model_validate(n)
    out.has_attachment = bool(getattr(n, "attachment_data", None))
    return out

@router.get("/", response_model=List[NoticeOut])
def get_notices(
    category: Optional[str] = Query(None, description="Exam, Holiday, Academic, Placement, Event"),
    search: Optional[str] = Query(None, description="Search keyword"),
    db: Session = Depends(get_db)
):
    """List published college notices with optional category filtering and search"""
    rows = notice_service.list_notices(db=db, category=category, search=search)
    return [_to_notice_out(n) for n in rows]

@router.get("/{notice_id}", response_model=NoticeOut)
def get_notice_detail(
    notice_id: int,
    db: Session = Depends(get_db)
):
    """Fetch a single published college notice by ID."""
    notice = notice_service.get_by_id(db, notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    return _to_notice_out(notice)

@router.get("/{notice_id}/download")
def download_notice_circular(
    notice_id: int,
    db: Session = Depends(get_db)
):
    """Download uploaded attachment or auto-generated official PDF circular."""
    notice = notice_service.get_by_id(db, notice_id)
    if not notice:
        raise HTTPException(status_code=404, detail="Notice not found")
    raw_bytes, mime, filename = notice_service.get_download_payload(notice)
    return Response(
        content=raw_bytes,
        media_type=mime,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.post("/", response_model=NoticeOut)
def publish_notice(
    payload: NoticeCreate,
    current_user: User = Depends(require_roles(UserRole.ADMIN.value)),
    db: Session = Depends(get_db)
):
    """Admin endpoint to publish a new college circular or notice and push live notifications."""
    created = notice_service.create_notice(db=db, notice_in=payload)
    try:
        notification_service.create_notification(
            db=db,
            student_id="all",
            title=f"New Circular: {created.title[:80]}",
            message=f"{created.department} published a '{created.category}' circular" + (f" (Deadline: {created.deadline_date})." if created.deadline_date else "."),
            type="notice",
        )
    except Exception as e:
        print(f"[Notices] Notification broadcast error: {e}")

    out = _to_notice_out(created)
    realtime_hub.publish_sync(
        "notice_published",
        {"id": out.id, "title": out.title, "category": out.category, "department": out.department},
        target_student_id="all",
    )
    return out
