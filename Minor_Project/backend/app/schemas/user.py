from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str

class StudentSignupRequest(BaseModel):
    full_name: str = Field(..., min_length=2, description="Student's official name")
    student_id: str = Field(..., min_length=3, description="University Roll / Enrollment Number")
    department_name: str = Field(..., description="Academic Department e.g. Computer Science")
    semester: Optional[str] = Field("1st Semester", description="Current Semester")
    email: str = Field(..., description="Campus or personal email")
    contact: Optional[str] = Field(None, description="Contact number")
    password: str = Field(..., min_length=4, description="Account password")

class UserResponse(BaseModel):
    id: int
    username: str
    full_name: str
    role: str
    department_name: Optional[str] = None
    student_id: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    redirect_url: str
