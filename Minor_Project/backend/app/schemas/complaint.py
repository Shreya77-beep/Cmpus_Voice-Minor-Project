from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime

class TimelineEvent(BaseModel):
    title: str
    description: str
    timestamp: str
    status: str

class UserInputRequest(BaseModel):
    query: str = Field(..., description="The spoken or typed natural language query from student")
    language: Optional[str] = Field("en", description="en, hi, or bn")
    student_id: Optional[str] = Field("STU-2023-01", description="Student roll or enrollment ID")
    student_name: Optional[str] = Field("Rahul Sharma", description="Student's full name")
    student_department: Optional[str] = Field("Computer Science & Engineering", description="Student's department")

class ExtractedEntities(BaseModel):
    intent: str = Field("unknown", description="register_complaint | check_status | campus_inquiry | emergency | notice_inquiry | chitchat")
    category: Optional[str] = Field("Maintenance", description="Maintenance, IT/Network, Hostel, Academic, Sanitation, Security")
    issue: Optional[str] = Field(None, description="Concise summary of the reported problem")
    location: Optional[str] = Field(None, description="Classroom, building, hostel room, etc.")
    priority: Optional[str] = Field("Medium", description="Low, Medium, High, Critical")
    sentiment: Optional[str] = Field("Neutral", description="Frustrated, Urgent, Concerned, Neutral")
    urgency_score: Optional[int] = Field(50, description="Calculated urgency between 0 and 100")
    urgency_factors: Optional[List[str]] = Field(default_factory=list, description="Reasoning factors behind urgency score")
    duplicate_detected: Optional[bool] = Field(False, description="True if a similar issue was recently reported")
    duplicate_of_ticket: Optional[str] = Field(None, description="Ticket ID of previously existing open issue")
    ticket_id: Optional[str] = Field(None, description="Ticket ID CVxxxx if inquiring about an existing ticket")
    confidence: float = Field(0.95, description="Confidence score")
    engine_used: str = Field("rule-engine", description="llm or rule-engine")
    detected_language: str = Field("en", description="Detected language code")

class ComplaintBase(BaseModel):
    category: str
    issue: str
    location: str
    priority: str = "Medium"

class ComplaintCreate(ComplaintBase):
    title: Optional[str] = None
    raw_query: str
    student_id: Optional[str] = "STU-2023-01"
    student_name: Optional[str] = "Rahul Sharma"
    student_department: Optional[str] = "Computer Science & Engineering"
    student_contact: Optional[str] = "+91 98765 43210"
    image_url: Optional[str] = None
    sentiment: Optional[str] = "Neutral"
    urgency_score: Optional[int] = 50

class ComplaintStatusUpdate(BaseModel):
    status: str
    admin_notes: Optional[str] = None
    assigned_technician: Optional[str] = None

class ComplaintOut(ComplaintBase):
    id: int
    ticket_id: str
    student_id: str
    student_name: str
    student_department: str
    student_contact: Optional[str]
    title: Optional[str]
    raw_query: str
    status: str
    sentiment: Optional[str]
    urgency_score: Optional[int]
    is_duplicate_of: Optional[str]
    image_url: Optional[str]
    assigned_technician: Optional[str]
    admin_notes: Optional[str]
    timeline: Optional[List[TimelineEvent]] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class AssistantResponse(BaseModel):
    spoken_response: str
    display_text: str
    intent: str
    language: str = "en"
    extracted_data: ExtractedEntities
    ticket: Optional[ComplaintOut] = None
    faq_data: Optional[dict] = None
    notices_found: Optional[List[dict]] = None
