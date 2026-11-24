from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.schemas.notification import NotificationOut
from app.services.notification_service import notification_service

router = APIRouter()

@router.get("/", response_model=List[NotificationOut])
def list_student_notifications(
    student_id: str = Query("STU-2023-01", description="Student enrollment ID or all"),
    limit: int = Query(20, description="Max notifications to fetch"),
    db: Session = Depends(get_db)
):
    """Retrieve real-time notifications for a student"""
    return notification_service.list_notifications(db=db, student_id=student_id, limit=limit)

@router.get("/unread-count")
def get_unread_count(
    student_id: str = Query("STU-2023-01"),
    db: Session = Depends(get_db)
):
    """Get count of unread notifications for badge display"""
    count = notification_service.get_unread_count(db=db, student_id=student_id)
    return {"unread_count": count}

@router.patch("/{notification_id}/read")
def mark_read(
    notification_id: int,
    db: Session = Depends(get_db)
):
    """Mark a specific notification as read"""
    success = notification_service.mark_as_read(db=db, notification_id=notification_id)
    if not success:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"success": True}

@router.post("/read-all")
def mark_all_read(
    student_id: str = Query("STU-2023-01"),
    db: Session = Depends(get_db)
):
    """Mark all notifications as read for a student"""
    notification_service.mark_all_as_read(db=db, student_id=student_id)
    return {"success": True}
