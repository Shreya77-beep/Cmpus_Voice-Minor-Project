from pydantic import BaseModel, field_serializer
from typing import Optional
from datetime import datetime, timezone

class NotificationCreate(BaseModel):
    student_id: str = "all"
    ticket_id: Optional[str] = None
    title: str
    message: str
    type: str = "status_update"

class NotificationOut(BaseModel):
    id: int
    student_id: str
    ticket_id: Optional[str] = None
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    @field_serializer("created_at")
    def _serialize_dt(self, dt: datetime) -> str:
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")

    class Config:
        from_attributes = True
