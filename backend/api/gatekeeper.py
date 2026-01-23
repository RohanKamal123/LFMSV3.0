from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import User, UserRole

router = APIRouter()

@router.post("/login")
def login(uiu_id: str, role: UserRole, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.uiu_id == uiu_id)).first()
    if not user:
        # Create user with selected role
        user = User(
            name=f"User {uiu_id}", 
            email=f"{uiu_id}@uiu.ac.bd", 
            uiu_id=uiu_id, 
            role=role
        )
        session.add(user)
        session.commit()
        session.refresh(user)
    else:
        # Sync role if it changed for the demo (optional, but requested for "connect all dots")
        user.role = role
        session.add(user)
        session.commit()
        session.refresh(user)
    
    return {"message": "Login successful", "user": user}

@router.get("/me/{user_id}", response_model=User)
def get_me(user_id: int, session: Session = Depends(get_session)):
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user
