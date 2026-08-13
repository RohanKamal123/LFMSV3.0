import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlmodel import Session

from database import get_session
from models import User, UserRole

JWT_ALGORITHM = "HS256"
JWT_EXPIRES_DAYS = 7
QR_TOKEN_EXPIRES_SECONDS = 90

_secret = os.environ.get("JWT_SECRET")
if not _secret:
    if os.environ.get("RENDER"):
        # Refuse to boot on a real deployment with an unset secret - a
        # random per-process fallback would invalidate every token on every
        # restart and silently accept whatever the next process generates.
        raise RuntimeError("JWT_SECRET must be set in the environment for a deployed instance.")
    # Local/dev fallback only. Not persisted, not used when RENDER is set.
    _secret = "dev-only-insecure-secret-do-not-use-in-production"
JWT_SECRET = _secret

security = HTTPBearer()
optional_security = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    if not password_hash:
        return False
    try:
        return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))
    except ValueError:
        return False


def create_access_token(user: User) -> str:
    payload = {
        "sub": str(user.id),
        "uiu_id": user.uiu_id,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRES_DAYS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def create_qr_token(user: User) -> str:
    """Short-lived, purpose-scoped token for the handover identity QR. Unlike
    the long-lived session token, this is meant to be displayed on-screen and
    scanned by someone else, so it expires quickly and can't be reused as a
    session credential (a different "purpose" claim than create_access_token)."""
    payload = {
        "sub": str(user.id),
        "uiu_id": user.uiu_id,
        "purpose": "handover_qr",
        "exp": datetime.utcnow() + timedelta(seconds=QR_TOKEN_EXPIRES_SECONDS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_qr_token(token: str) -> dict:
    """Verifies a handover QR token and returns its payload. Raises 401/400
    on expiry, tampering, or a token that isn't actually a QR token (e.g.
    someone passing their own long-lived session token instead)."""
    payload = decode_token(token)
    if payload.get("purpose") != "handover_qr":
        raise HTTPException(status_code=400, detail="Not a valid handover QR token.")
    return payload


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Session expired. Please sign in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid session token.")


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    session: Session = Depends(get_session),
) -> User:
    payload = decode_token(credentials.credentials)
    user = session.get(User, int(payload["sub"]))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User no longer exists.")
    return user


def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(optional_security),
    session: Session = Depends(get_session),
) -> Optional[User]:
    """Same as get_current_user, but returns None instead of raising when no
    (or an invalid) token is present - for endpoints that stay public but
    adjust what they reveal based on the caller's role when logged in."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except HTTPException:
        return None
    return session.get(User, int(payload["sub"]))


def require_role(*allowed_roles: UserRole):
    """Dependency factory: raises 403 unless the authenticated user has one of the allowed roles."""
    def _check(user: User = Depends(get_current_user)) -> User:
        if user.role not in allowed_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You don't have permission to do this.")
        return user
    return _check
