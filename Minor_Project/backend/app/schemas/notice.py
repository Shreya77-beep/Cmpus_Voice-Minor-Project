from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime, timezone

class NoticeBase(BaseModel):
    title: str
    category: str = "General" # Exam, Holiday, Academic, Event, Placement
    department: str = "Administration"
    content: str
    deadline_date: Optional[str] = None
    is_pinned: bool = False
    pdf_filename: Optional[str] = None

class NoticeCreate(NoticeBase):
    attachment_data: Optional[str] = None
    attachment_mime: Optional[str] = None

class NoticeOut(NoticeBase):
    id: int
    published_date: datetime
    has_attachment: Optional[bool] = False

    @field_serializer("published_date")
    def _serialize_dt(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    class Config:
        from_attributes = True
