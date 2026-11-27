from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.core.realtime import realtime_hub
from app.core.security import get_current_user
from app.models.notification import Notification
from app.models.user import User, UserRole
from app.schemas.notification import NotificationOut
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/", response_model=List[NotificationOut])
def list_student_notifications(
    limit: int = Query(20, description="Max notifications to fetch"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Retrieve real-time notifications strictly for the authenticated user"""
    sid = current_user.student_id or current_user.username
    return notification_service.list_notifications(db=db, student_id=sid, limit=limit)

@router.get("/unread-count")
def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for the authenticated user"""
    sid = current_user.student_id or current_user.username
    count = notification_service.get_unread_count(db=db, student_id=sid)
    return {"unread_count": count}

@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark a specific notification belonging to the authenticated user as read"""
    n = db.query(Notification).filter(Notification.id == notification_id).first()
    if not n:
        raise HTTPException(status_code=404, detail="Notification not found")
    sid = current_user.student_id or current_user.username
    if current_user.role != UserRole.ADMIN.value and n.student_id not in (sid, "all"):
        raise HTTPException(status_code=403, detail="Access denied.")
    notification_service.mark_as_read(db=db, notification_id=notification_id)
    realtime_hub.publish_sync("notification_sync", {"student_id": sid}, target_student_id=sid)
    return {"success": True}

@router.post("/read-all")
def mark_all_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for the authenticated user"""
    sid = current_user.student_id or current_user.username
    notification_service.mark_all_as_read(db=db, student_id=sid)
    realtime_hub.publish_sync("notification_sync", {"student_id": sid}, target_student_id=sid)
    return {"success": True}
