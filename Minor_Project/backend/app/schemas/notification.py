from pydantic import BaseModel
from typing import Optional
from datetime import datetime

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

    class Config:
        from_attributes = True
