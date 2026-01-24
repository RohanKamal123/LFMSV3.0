from fastapi import APIRouter, Depends, HTTPException
from fastapi.encoders import jsonable_encoder
from sqlmodel import Session, select
from database import get_session
from models import User, UserRole, AuditLog

router = APIRouter()

@router.post("/login")
def login(uiu_id: str, role: UserRole, contact: str, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.uiu_id == uiu_id)).first()
    
    email = user.email if user else f"{uiu_id}@uiu.ac.bd"
    phone = user.phone if user else None
    
    if "@" in contact:
        email = contact
    else:
        phone = contact

    if not user:
        # Create user
        user = User(
            uiu_id=uiu_id,
            name=f"User {uiu_id}",
            email=email,
            phone=phone,
            role=role
        )
        session.add(user)
    else:
        # Update user
        user.role = role
        user.email = email
        user.phone = phone
        session.add(user)
    
    session.commit()
    session.refresh(user)

    # Log login (Non-blocking)
    try:
        log = AuditLog(
            actor_id=user.id,
            action_type="LOGIN",
            entity_id=user.id,
            details=f"Successful login: {user.name} ({user.uiu_id}) as {user.role}"
        )
        session.add(log)
        session.commit()
    except Exception as e:
        print(f"FAILED TO LOG LOGIN: {e}")
        session.rollback()

    return {
        "message": "Login successful", 
        "user": {
            "id": user.id,
            "uiu_id": user.uiu_id,
            "name": user.name,
            "email": user.email,
            "role": user.role.value if hasattr(user.role, 'value') else user.role
        }
    }

@router.get("/me/{user_id}")
def get_me(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "id": user.id,
        "uiu_id": user.uiu_id,
        "name": user.name,
        "email": user.email,
        "role": user.role.value if hasattr(user.role, 'value') else user.role
    }
