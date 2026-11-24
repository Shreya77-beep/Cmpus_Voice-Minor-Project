import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey
from app.core.database import Base

class ComplaintStatus(str, enum.Enum):
    PENDING = "Pending"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    RESOLVED = "Resolved"
    REJECTED = "Rejected"

class PriorityLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class Complaint(Base):
    __tablename__ = "complaints"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ticket_id = Column(String(20), unique=True, index=True, nullable=False)
    student_id = Column(String(50), default="STU-2023-01")
    student_name = Column(String(100), default="Rahul Sharma")
    student_department = Column(String(100), default="Computer Science & Engineering")
    student_contact = Column(String(50), default="+91 98765 43210")
    
    title = Column(String(200), nullable=True)
    issue = Column(String(255), nullable=False)
    raw_query = Column(Text, nullable=False)
    category = Column(String(50), nullable=False, default="Maintenance")
    location = Column(String(150), nullable=False, default="Campus Area")
    priority = Column(String(20), nullable=False, default=PriorityLevel.MEDIUM.value)
    status = Column(String(20), nullable=False, default=ComplaintStatus.PENDING.value)
    
    # AI & Intelligence fields
    sentiment = Column(String(50), default="Neutral") # Frustrated, Urgent, Neutral
    urgency_score = Column(Integer, default=50) # 0 to 100
    is_duplicate_of = Column(String(20), nullable=True) # Linked Ticket ID if duplicate
    
    # Attachments & notes
    image_url = Column(Text, nullable=True) # Data URL or path
    assigned_technician = Column(String(100), nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    # Detailed timeline events stored as JSON string
    timeline_json = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
