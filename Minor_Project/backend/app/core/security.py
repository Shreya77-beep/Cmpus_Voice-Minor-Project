import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from pathlib import Path
from typing import Optional, Dict, Any

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.config import BASE_DIR, settings
from app.core.database import get_db
from app.models.user import User

SESSION_COOKIE_NAME = "cv_session"
TOKEN_TTL_SECONDS = 60 * 60 * 24  # 24 hours
PBKDF2_ITERATIONS = 100_000


def _load_or_create_secret_key() -> str:
    env_key = os.getenv("SECRET_KEY", "").strip()
    if env_key:
        return env_key
    secret_file = Path(BASE_DIR) / ".secret_key"
    if secret_file.exists():
        content = secret_file.read_text(encoding="utf-8").strip()
        if content:
            return content
    generated = secrets.token_urlsafe(48)
    secret_file.write_text(generated, encoding="utf-8")
    return generated


SECRET_KEY = _load_or_create_secret_key()


def hash_password(password: str) -> str:
    """Hash a plaintext password using PBKDF2-HMAC-SHA256 with a random 16-byte salt."""
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, PBKDF2_ITERATIONS)
    return f"pbkdf2_sha256${salt.hex()}${dk.hex()}"


def is_password_hashed(stored_password: str) -> bool:
    return bool(stored_password and stored_password.startswith("pbkdf2_sha256$"))


def verify_password(plain_password: str, stored_password: str) -> bool:
    """Verify a password against a stored PBKDF2 hash (or legacy plaintext before migration)."""
    if not stored_password:
        return False
    if is_password_hashed(stored_password):
        try:
            _, salt_hex, hash_hex = stored_password.split("$", 2)
            salt = bytes.fromhex(salt_hex)
            expected = bytes.fromhex(hash_hex)
            actual = hashlib.pbkdf2_hmac(
                "sha256", plain_password.encode("utf-8"), salt, PBKDF2_ITERATIONS
            )
            return hmac.compare_digest(actual, expected)
        except Exception:
            return False
    return hmac.compare_digest(plain_password, stored_password)


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _b64url_decode(data: str) -> bytes:
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def create_access_token(user: User) -> str:
    """Create an HMAC-SHA256 signed session token bound to a single user account."""
    payload = {
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "student_id": user.student_id,
        "department_name": user.department_name,
        "exp": int(time.time()) + TOKEN_TTL_SECONDS,
    }
    payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    sig = hmac.new(SECRET_KEY.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256).digest()
    return f"{payload_b64}.{_b64url_encode(sig)}"


def verify_access_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify signature and expiry of a signed session token."""
    if not token or "." not in token:
        return None
    try:
        payload_b64, sig_b64 = token.split(".", 1)
        expected_sig = hmac.new(
            SECRET_KEY.encode("utf-8"), payload_b64.encode("ascii"), hashlib.sha256
        ).digest()
        actual_sig = _b64url_decode(sig_b64)
        if not hmac.compare_digest(actual_sig, expected_sig):
            return None
        payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
        if int(payload.get("exp", 0)) < int(time.time()):
            return None
        return payload
    except Exception:
        return None


def extract_token_from_request(request: Request) -> Optional[str]:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.lower().startswith("bearer "):
        return auth_header[7:].strip()
    cookie_token = request.cookies.get(SESSION_COOKIE_NAME)
    if cookie_token:
        return cookie_token.strip()
    return None


def get_current_user(request: Request, db: Session = Depends(get_db)) -> User:
    """FastAPI dependency enforcing an authenticated single-user session."""
    token = extract_token_from_request(request)
    payload = verify_access_token(token) if token else None
    if not payload or "sub" not in payload:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please sign in with your account credentials.",
        )
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session account no longer exists. Please sign in again.",
        )
    return user


def require_roles(*allowed_roles: str):
    """Dependency factory enforcing role-based access control."""
    def _checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied: insufficient privileges for this portal.",
            )
        return current_user

    return _checker
