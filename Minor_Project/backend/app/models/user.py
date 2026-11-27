import datetime
import enum
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.core.database import Base

class UserRole(str, enum.Enum):
    STUDENT = "student"
    DEPARTMENT = "department"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    password = Column(String(100), nullable=False)
    full_name = Column(String(100), nullable=False)
    role = Column(String(20), nullable=False, default=UserRole.STUDENT.value)
    
    # Specific attributes
    department_name = Column(String(100), nullable=True) # e.g. Maintenance, IT/Network, Hostel, Sanitation
    student_id = Column(String(50), nullable=True)       # e.g. STU-2023-01
    semester = Column(String(50), nullable=True)         # e.g. 6th Semester
    email = Column(String(100), nullable=True)
    contact = Column(String(50), nullable=True)
    avatar_url = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
