import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean
from app.core.database import Base

class Notice(Base):
    __tablename__ = "notices"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(255), nullable=False)
    category = Column(String(50), nullable=False, default="General") # Exam, Holiday, Academic, Event, Placement
    department = Column(String(100), default="Administration")
    content = Column(Text, nullable=False)
    pdf_filename = Column(String(255), nullable=True)
    attachment_data = Column(Text, nullable=True)
    attachment_mime = Column(String(100), nullable=True)
    is_pinned = Column(Boolean, default=False)
    deadline_date = Column(String(50), nullable=True)
    published_date = Column(DateTime, default=datetime.datetime.utcnow)
