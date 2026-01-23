from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List
from database import get_session
from models import Claim, Item, ItemState, User, QuizLog
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Claim)
def create_claim(claim_data: dict, session: Session = Depends(get_session)):
    # Expected claim_data: { item_id, claimant_id, owner_private_info, quiz_answers: [{question, answer, is_correct}] }
    
    item = session.get(Item, claim_data["item_id"])
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # Create Claim
    new_claim = Claim(
        item_id=claim_data["item_id"],
        claimant_id=claim_data["claimant_id"],
        owner_private_info=claim_data["owner_private_info"],
        is_verified=True, # For now, auto-verify if answers submitted
        status="PENDING"
    )
    session.add(new_claim)
    session.commit()
    session.refresh(new_claim)
    
    # Add Quiz Logs
    for q in claim_data.get("quiz_answers", []):
        log = QuizLog(
            claim_id=new_claim.id,
            question_text=q["question"],
            answer_text=q["answer"],
            is_correct=q.get("is_correct", True)
        )
        session.add(log)
    
    # Update Item State
    item.state = ItemState.READY_FOR_PICKUP
    session.add(item)
    
    session.commit()
    session.refresh(new_claim)
    return new_claim

@router.get("/", response_model=List[Claim])
def read_claims(session: Session = Depends(get_session)):
    return session.exec(select(Claim)).all()

@router.get("/item/{item_id}", response_model=List[Claim])
def read_item_claims(item_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Claim).where(Claim.item_id == item_id)).all()
