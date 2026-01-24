from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from database import get_session
from models import HandoverSession, User, Item, Claim, ItemState
import secrets
from typing import Optional, List
from datetime import datetime

router = APIRouter()

@router.post("/start")
async def start_session(staff_id: int, session: Session = Depends(get_session)):
    """Staff starts a handover session to give items to a claimant."""
    # Deactivate any existing active sessions for this staff
    existing = session.exec(select(HandoverSession).where(HandoverSession.staff_id == staff_id, HandoverSession.is_active == True)).all()
    for s in existing:
        s.is_active = False
        session.add(s)
    
    token = secrets.token_urlsafe(16)
    new_session = HandoverSession(
        staff_id=staff_id,
        session_token=token,
        is_active=True
    )
    session.add(new_session)
    session.commit()
    session.refresh(new_session)
    return {"session_token": token}

@router.post("/join")
async def join_session(session_token: str, claimant_id: int, session: Session = Depends(get_session)):
    """Claimant scans staff QR and joins the session."""
    handover_session = session.exec(select(HandoverSession).where(HandoverSession.session_token == session_token, HandoverSession.is_active == True)).first()
    if not handover_session:
        raise HTTPException(status_code=404, detail="Active session not found")
    
    handover_session.claimant_id = claimant_id
    session.add(handover_session)
    session.commit()
    return {"status": "success", "message": "Joined session"}

@router.get("/{session_token}/status")
async def get_session_status(session_token: str, session: Session = Depends(get_session)):
    """Staff polls to see if a claimant has joined and what items they have approved."""
    handover_session = session.exec(select(HandoverSession).where(HandoverSession.session_token == session_token)).first()
    if not handover_session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if not handover_session.claimant_id:
        return {"status": "waiting"}
    
    claimant = session.get(User, handover_session.claimant_id)
    # Find approved claims for this user
    claims = session.exec(select(Claim).where(Claim.claimant_id == claimant.id, Claim.status == "APPROVED")).all()
    
    items = []
    for claim in claims:
        item = session.get(Item, claim.item_id)
        if item.state == ItemState.READY_FOR_PICKUP:
            items.append({
                "id": item.id,
                "title": item.title,
                "public_description": item.public_description
            })
            
    return {
        "status": "joined",
        "claimant": {
            "name": claimant.name,
            "uiu_id": claimant.uiu_id
        },
        "items": items
    }
