import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.core.database import Base

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    student_id = Column(String(50), index=True, nullable=False, default="all") # "all" or specific student_id
    ticket_id = Column(String(20), nullable=True) # Linked ticket if status update
    title = Column(String(200), nullable=False)
    message = Column(Text, nullable=False)
    type = Column(String(50), default="status_update") # status_update, technician_assigned, notice, urgent
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
