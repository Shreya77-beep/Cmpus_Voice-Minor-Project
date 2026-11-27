from typing import Optional, Dict, Any, List
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
from fastapi import HTTPException
from app.core.security import hash_password, is_password_hashed, verify_password
from app.models.user import User, UserRole
from app.schemas.user import LoginRequest, UserResponse, LoginResponse, StudentSignupRequest

class AuthService:
    def find_user(self, db: Session, identifier: str) -> Optional[User]:
        u = (identifier or "").strip().lower()
        if not u:
            return None
        # Look up by username, student_id, or email
        return db.query(User).filter(
            (User.username.ilike(u)) | (User.student_id.ilike(u)) | (User.email.ilike(u))
        ).first()

    def authenticate(self, db: Session, login_data: LoginRequest) -> Optional[User]:
        p = login_data.password.strip()
        user = self.find_user(db, login_data.username)

        if user and verify_password(p, user.password):
            return user
        return None

    def register_student(self, db: Session, data: StudentSignupRequest) -> User:
        sid = data.student_id.strip().upper()
        email = data.email.strip().lower()
        uname = sid.lower()

        # Check existing by student_id, email, or username
        existing = db.query(User).filter(
            (User.student_id == sid) | (User.email == email) | (User.username == uname)
        ).first()

        if existing:
            raise HTTPException(
                status_code=400, 
                detail=f"An account with Student ID '{sid}' or Email '{email}' already exists. Please sign in."
            )

        new_user = User(
            username=uname,
            password=hash_password(data.password.strip()),
            full_name=data.full_name.strip(),
            role=UserRole.STUDENT.value,
            student_id=sid,
            department_name=data.department_name.strip(),
            semester=data.semester.strip() if data.semester else "1st Semester",
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

    def migrate_plaintext_passwords(self, db: Session):
        """Ensure all stored passwords (including seeded demo accounts) use salted PBKDF2 hashes."""
        users = db.query(User).all()
        updated = False
        for u in users:
            if not is_password_hashed(u.password):
                u.password = hash_password(u.password)
                updated = True
        if updated:
            db.commit()

    def ensure_schema(self, db: Session):
        """Ensure additive columns exist on pre-existing SQLite databases."""
        engine = db.get_bind()
        insp = inspect(engine)
        if "users" in insp.get_table_names():
            cols = [c["name"] for c in insp.get_columns("users")]
            if "semester" not in cols:
                db.execute(text("ALTER TABLE users ADD COLUMN semester VARCHAR(50)"))
                db.execute(text("UPDATE users SET semester = '6th Semester' WHERE username = 'student' AND semester IS NULL"))
                db.commit()
            if "avatar_url" not in cols:
                db.execute(text("ALTER TABLE users ADD COLUMN avatar_url TEXT"))
                db.commit()

    def update_avatar(self, db: Session, user: User, avatar_url: Optional[str]) -> User:
        if avatar_url is None or not avatar_url.strip():
            user.avatar_url = None
        else:
            cleaned = avatar_url.strip()
            if not cleaned.startswith("data:image/"):
                raise HTTPException(status_code=400, detail="Invalid image format. Please upload a valid image file.")
            if len(cleaned) > 2_000_000:
                raise HTTPException(status_code=400, detail="Image size is too large. Please choose a smaller photo.")
            user.avatar_url = cleaned
        db.commit()
        db.refresh(user)
        return user

    def seed_users(self, db: Session):
        self.ensure_schema(db)
        if db.query(User).count() > 0:
            self.migrate_plaintext_passwords(db)
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
                "semester": "6th Semester",
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
            item_copy = dict(item)
            item_copy["password"] = hash_password(item_copy["password"])
            user = User(**item_copy)
            db.add(user)
        db.commit()

auth_service = AuthService()
