from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, or_
from app.models.notification import Notification
from app.schemas.notification import NotificationCreate

class NotificationService:
    def create_notification(
        self, 
        db: Session, 
        student_id: str, 
        title: str, 
        message: str, 
        type: str = "status_update", 
        ticket_id: Optional[str] = None
    ) -> Notification:
        notif = Notification(
            student_id=student_id,
            ticket_id=ticket_id,
            title=title,
            message=message,
            type=type,
            is_read=False
        )
        db.add(notif)
        db.commit()
        db.refresh(notif)
        return notif

    def list_notifications(self, db: Session, student_id: str = "STU-2023-01", limit: int = 20) -> List[Notification]:
        # Return notifications targeted to this student OR to "all"
        return db.query(Notification).filter(
            or_(Notification.student_id == student_id, Notification.student_id == "all")
        ).order_by(desc(Notification.created_at)).limit(limit).all()

    def get_unread_count(self, db: Session, student_id: str = "STU-2023-01") -> int:
        return db.query(Notification).filter(
            or_(Notification.student_id == student_id, Notification.student_id == "all"),
            Notification.is_read == False
        ).count()

    def mark_as_read(self, db: Session, notification_id: int) -> bool:
        n = db.query(Notification).filter(Notification.id == notification_id).first()
        if n:
            n.is_read = True
            db.commit()
            return True
        return False

    def mark_all_as_read(self, db: Session, student_id: str = "STU-2023-01"):
        db.query(Notification).filter(
            or_(Notification.student_id == student_id, Notification.student_id == "all")
        ).update({Notification.is_read: True}, synchronize_session=False)
        db.commit()

    def seed_mock_notifications(self, db: Session):
        if db.query(Notification).count() > 0:
            return

        mock_data = [
            {
                "student_id": "STU-2023-01",
                "ticket_id": "CV1020",
                "title": "Technician Dispatched for Library Wi-Fi",
                "message": "IT Technician Vikram Singh has been assigned to ticket CV1020. Work is In Progress.",
                "type": "technician_assigned"
            },
            {
                "student_id": "all",
                "ticket_id": None,
                "title": "Official Circular: Exam Form Submission Deadline",
                "message": "Final deadline for even semester examination forms is the 15th of next month.",
                "type": "notice"
            },
            {
                "student_id": "STU-2023-01",
                "ticket_id": "CV1022",
                "title": "Complaint Resolved: Room 301 Projector",
                "message": "Your complaint regarding classroom projector display flickering has been successfully resolved.",
                "type": "status_update"
            }
        ]

        for item in mock_data:
            n = Notification(**item)
            db.add(n)
        db.commit()

notification_service = NotificationService()
