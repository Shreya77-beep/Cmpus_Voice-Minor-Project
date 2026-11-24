from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, StudentSignupRequest
from app.services.auth_service import auth_service

router = APIRouter()

@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with username and password, returning their role and destination portal"""
    user = auth_service.authenticate(db, payload)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    user_resp = UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        department_name=user.department_name,
        student_id=user.student_id,
        email=user.email,
        contact=user.contact
    )

    redirect_url = auth_service.get_redirect_url(user.role)

    return LoginResponse(
        success=True,
        message=f"Welcome {user.full_name}!",
        user=user_resp,
        redirect_url=redirect_url
    )

@router.post("/signup", response_model=LoginResponse)
def register_student(payload: StudentSignupRequest, db: Session = Depends(get_db)):
    """Registers a new student and automatically returns an active login session"""
    new_user = auth_service.register_student(db, payload)
    
    user_resp = UserResponse(
        id=new_user.id,
        username=new_user.username,
        full_name=new_user.full_name,
        role=new_user.role,
        department_name=new_user.department_name,
        student_id=new_user.student_id,
        email=new_user.email,
        contact=new_user.contact
    )

    return LoginResponse(
        success=True,
        message="Registration successful! Welcome to CampusVoice.",
        user=user_resp,
        redirect_url="/student"
    )

@router.get("/demo-accounts")
def get_demo_accounts():
    """Returns sample pre-configured accounts for evaluators to easily test any role"""
    return [
        {"role": "Student", "username": "student", "password": "student123", "name": "Rahul Sharma (CSE 6th Sem)", "portal": "Student Portal"},
        {"role": "Department", "username": "dept_it", "password": "it123", "name": "IT & Network Services", "portal": "Department Portal"},
        {"role": "Department", "username": "dept_maintenance", "password": "maint123", "name": "Classroom Maintenance", "portal": "Department Portal"},
        {"role": "Department", "username": "dept_hostel", "password": "hostel123", "name": "Hostel Management", "portal": "Department Portal"},
        {"role": "Admin", "username": "admin", "password": "admin123", "name": "Dr. S. K. Verma (Campus Dean)", "portal": "Admin Dashboard"}
    ]
