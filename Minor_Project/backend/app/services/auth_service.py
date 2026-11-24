from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, UserResponse, LoginResponse, StudentSignupRequest

class AuthService:
    def authenticate(self, db: Session, login_data: LoginRequest) -> Optional[User]:
        u = login_data.username.strip().lower()
        p = login_data.password.strip()

        # Look up by username or student_id
        user = db.query(User).filter(
            (User.username.ilike(u)) | (User.student_id.ilike(u))
        ).first()

        if user and user.password == p:
            return user
        return None

    def register_student(self, db: Session, data: StudentSignupRequest) -> User:
        sid = data.student_id.strip().upper()
        email = data.email.strip().lower()

        # Check existing by student_id or email
        existing = db.query(User).filter(
            (User.student_id == sid) | (User.email == email)
        ).first()

        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"An account with Student ID '{sid}' or Email '{email}' already exists. Please sign in."
            )

        new_user = User(
            username=sid.lower(),
            password=data.password.strip(),
            full_name=data.full_name.strip(),
            role=UserRole.STUDENT.value,
            student_id=sid,
            department_name=data.department_name.strip(),
            email=email,
            contact=data.contact.strip() if data.contact else None
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)

        # Trigger welcome notification
        try:
            from app.services.notification_service import notification_service
            notification_service.create_notification(
                db=db,
                student_id=sid,
                title="Welcome to CampusVoice!",
                message=f"Hello {new_user.full_name}, your student account has been registered. You can now lodge complaints, track updates, and query college information via voice or forms.",
                type="system"
            )
        except Exception as e:
            print(f"[AuthService] Welcome notification error: {e}")

        return new_user

    def get_redirect_url(self, role: str) -> str:
        if role == UserRole.ADMIN.value:
            return "/admin"
        elif role == UserRole.DEPARTMENT.value:
            return "/department"
        return "/student"

    def seed_users(self, db: Session):
        if db.query(User).count() > 0:
            return

        demo_users = [
            # 1. Student Account
            {
                "username": "student",
                "password": "student123",
                "full_name": "Rahul Sharma",
                "role": UserRole.STUDENT.value,
                "student_id": "STU-2023-01",
                "department_name": "Computer Science & Engineering",
                "email": "rahul.sharma@campus.edu.in",
                "contact": "+91 98765 43210"
            },
            # 2. Department Accounts
            {
                "username": "dept_maintenance",
                "password": "maint123",
                "full_name": "Rajesh Kumar (Facility Officer)",
                "role": UserRole.DEPARTMENT.value,
                "department_name": "Maintenance",
                "email": "maintenance@campus.edu.in",
                "contact": "Ext. 301"
            },
            {
                "username": "dept_it",
                "password": "it123",
                "full_name": "Vikram Singh (IT Network Lead)",
                "role": UserRole.DEPARTMENT.value,
                "department_name": "IT/Network",
                "email": "ithelpdesk@campus.edu.in",
                "contact": "Ext. 204"
            },
            {
                "username": "dept_hostel",
                "password": "hostel123",
                "full_name": "Dr. Sunita Rao (Hostel Warden)",
                "role": UserRole.DEPARTMENT.value,
                "department_name": "Hostel",
                "email": "hostel.warden@campus.edu.in",
                "contact": "Ext. 402"
            },
            {
                "username": "dept_sanitation",
                "password": "sanitation123",
                "full_name": "Manoj Tiwari (Sanitation Lead)",
                "role": UserRole.DEPARTMENT.value,
                "department_name": "Sanitation",
                "email": "sanitation@campus.edu.in",
                "contact": "Ext. 108"
            },
            # 3. University Administration
            {
                "username": "admin",
                "password": "admin123",
                "full_name": "Dr. S. K. Verma (Campus Dean)",
                "role": UserRole.ADMIN.value,
                "department_name": "University Administration",
                "email": "dean.affairs@campus.edu.in",
                "contact": "Office A-101"
            }
        ]

        for item in demo_users:
            user = User(**item)
            db.add(user)
        db.commit()

auth_service = AuthService()
