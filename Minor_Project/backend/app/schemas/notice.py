from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class NoticeBase(BaseModel):
    title: str
    category: str = "General" # Exam, Holiday, Academic, Event, Placement
    department: str = "Administration"
    content: str
    deadline_date: Optional[str] = None
    is_pinned: bool = False
    pdf_filename: Optional[str] = None

class NoticeCreate(NoticeBase):
    pass

class NoticeOut(NoticeBase):
    id: int
    published_date: datetime

    class Config:
        from_attributes = True
