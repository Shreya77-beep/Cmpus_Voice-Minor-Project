from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import (
    SESSION_COOKIE_NAME,
    TOKEN_TTL_SECONDS,
    create_access_token,
    get_current_user,
    verify_password,
)
from app.models.user import User
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, StudentSignupRequest, AvatarUpdateRequest
from app.services.auth_service import auth_service

router = APIRouter()


def _build_user_response(user: User) -> UserResponse:
    return UserResponse(
        id=user.id,
        username=user.username,
        full_name=user.full_name,
        role=user.role,
        department_name=user.department_name,
        student_id=user.student_id,
        semester=user.semester,
        email=user.email,
        contact=user.contact,
        avatar_url=user.avatar_url,
    )


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=SESSION_COOKIE_NAME,
        value=token,
        httponly=True,
        samesite="lax",
        max_age=TOKEN_TTL_SECONDS,
        path="/",
    )


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, response: Response, db: Session = Depends(get_db)):
    """Authenticate user with username/student_id/email and password against database"""
    existing_user = auth_service.find_user(db, payload.username)
    if not existing_user:
        raise HTTPException(
            status_code=404,
            detail="No account found matching these credentials in the database. Please make a new registration of your own."
        )
    if not verify_password(payload.password.strip(), existing_user.password):
        raise HTTPException(
            status_code=401,
            detail="Incorrect password for this account. Please check your password or make a new registration of your own."
        )
    if payload.expected_role and existing_user.role != payload.expected_role:
        raise HTTPException(
            status_code=403,
            detail=f"Account '{existing_user.username}' belongs to the '{existing_user.role}' role. Please select the matching portal tab to sign in."
        )

    token = create_access_token(existing_user)
    _set_session_cookie(response, token)
    redirect_url = auth_service.get_redirect_url(existing_user.role)

    return LoginResponse(
        success=True,
        message=f"Welcome {existing_user.full_name}!",
        user=_build_user_response(existing_user),
        redirect_url=redirect_url,
        access_token=token,
    )


@router.post("/signup", response_model=LoginResponse)
def register_student(payload: StudentSignupRequest, response: Response, db: Session = Depends(get_db)):
    """Registers a new student and establishes an authenticated single-user session"""
    new_user = auth_service.register_student(db, payload)
    token = create_access_token(new_user)
    _set_session_cookie(response, token)

    return LoginResponse(
        success=True,
        message="Registration successful! Welcome to CampusVoice.",
        user=_build_user_response(new_user),
        redirect_url="/student",
        access_token=token,
    )


@router.get("/me", response_model=UserResponse)
def get_authenticated_me(current_user: User = Depends(get_current_user)):
    """Verify current session token/cookie and return authenticated account details"""
    return _build_user_response(current_user)


@router.patch("/profile/avatar", response_model=UserResponse)
def update_profile_avatar(
    payload: AvatarUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload or remove the authenticated user's own profile display picture"""
    updated = auth_service.update_avatar(db, current_user, payload.avatar_url)
    return _build_user_response(updated)


@router.post("/logout")
def logout(response: Response):
    """Clear active authenticated session cookie"""
    response.delete_cookie(key=SESSION_COOKIE_NAME, path="/")
    return {"success": True, "message": "Signed out cleanly."}
