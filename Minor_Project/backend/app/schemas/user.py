from pydantic import BaseModel, Field, EmailStr
from typing import Optional

class LoginRequest(BaseModel):
    username: str
    password: str
    expected_role: Optional[str] = Field(None, description="Optional portal role selected in login form")

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
    semester: Optional[str] = None
    email: Optional[str] = None
    contact: Optional[str] = None
    avatar_url: Optional[str] = None

class AvatarUpdateRequest(BaseModel):
    avatar_url: Optional[str] = Field(None, description="Data URL of uploaded profile photo, or null to clear")

class LoginResponse(BaseModel):
    success: bool
    message: str
    user: Optional[UserResponse] = None
    redirect_url: str
    access_token: Optional[str] = None
