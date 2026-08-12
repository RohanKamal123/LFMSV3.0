from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import Session, select
from database import get_session
from models import User, UserRole, AuditLog
from services.auth import hash_password, verify_password, create_access_token, get_current_user, create_qr_token, QR_TOKEN_EXPIRES_SECONDS

router = APIRouter()


def _serialize_user(user: User) -> dict:
    return {
        "id": user.id,
        "uiu_id": user.uiu_id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else user.role,
    }


class RegisterRequest(BaseModel):
    uiu_id: str
    name: str
    contact: str
    password: str


class LoginRequest(BaseModel):
    uiu_id: str
    password: str


@router.post("/register")
def register(body: RegisterRequest, session: Session = Depends(get_session)):
    if len(body.password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters.")

    existing = session.exec(select(User).where(User.uiu_id == body.uiu_id)).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this UIU ID already exists. Please sign in.")

    email = body.contact if "@" in body.contact else f"{body.uiu_id}@uiu.ac.bd"
    phone = body.contact if "@" not in body.contact else None

    # Self-registration is always STUDENT - staff/admin accounts are
    # provisioned separately and never chosen by the registering client.
    user = User(
        uiu_id=body.uiu_id,
        name=body.name,
        email=email,
        phone=phone,
        role=UserRole.STUDENT,
        password_hash=hash_password(body.password),
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    session.add(AuditLog(actor_id=user.id, action_type="REGISTER", entity_id=user.id, details=f"Account created: {user.name} ({user.uiu_id})"))
    session.commit()

    token = create_access_token(user)
    return {"token": token, "user": _serialize_user(user)}


@router.post("/login")
def login(body: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.uiu_id == body.uiu_id)).first()
    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid UIU ID or password.")

    session.add(AuditLog(actor_id=user.id, action_type="LOGIN", entity_id=user.id, details=f"Successful login: {user.name} ({user.uiu_id}) as {user.role}"))
    session.commit()

    token = create_access_token(user)
    return {"token": token, "user": _serialize_user(user)}


@router.get("/me")
def get_me(user: User = Depends(get_current_user)):
    return _serialize_user(user)


@router.get("/qr-token")
def get_qr_token(user: User = Depends(get_current_user)):
    """Short-lived signed token to embed in the identity QR shown for
    handovers. Callers should re-fetch this periodically while the QR is on
    screen - it expires quickly so a photo of it is useless shortly after."""
    return {"token": create_qr_token(user), "expires_in": QR_TOKEN_EXPIRES_SECONDS}
