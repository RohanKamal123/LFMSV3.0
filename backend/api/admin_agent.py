from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session

from database import get_session
from models import User, UserRole
from services.auth import require_role
from services.admin_agent import ask_admin_agent

router = APIRouter()
admin_only = require_role(UserRole.ADMIN)


@router.post("/ask")
def ask(payload: dict, session: Session = Depends(get_session), current_user: User = Depends(admin_only)):
    question = (payload.get("message") or "").strip()
    if not question:
        raise HTTPException(status_code=400, detail="message is required")
    return ask_admin_agent(session, question)
