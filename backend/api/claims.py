from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Optional
from database import get_session
from models import Claim, Item, ItemState, User, QuizLog
from datetime import datetime

router = APIRouter()

from services.gemini import verify_answers

@router.post("/", response_model=Claim)
async def create_claim(claim_data: dict, session: Session = Depends(get_session)):
    # Expected claim_data: { item_id, claimant_id, owner_private_info, quiz_answers: [{question, answer}] }
    
    item = session.get(Item, claim_data["item_id"])
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    
    # AI Verification
    location_name = item.location_rel.name if item.location_rel else "Unknown Location"
    verification_results = await verify_answers(
        title=item.title,
        public_desc=item.public_description,
        private_desc=item.private_description,
        location=location_name,
        quiz_answers=claim_data.get("quiz_answers", [])
    )
    
    correct_count = sum(1 for r in verification_results if r["is_correct"])
    # Relaxed verification: Allow 1 mistake if 3 or more questions
    total_questions = len(verification_results)
    is_verified = False
    if total_questions > 0:
        if total_questions >= 3:
            is_verified = correct_count >= 2 
        else:
            is_verified = correct_count == total_questions
    
    # Create Claim with appropriate status
    new_claim = Claim(
        item_id=claim_data["item_id"],
        claimant_id=claim_data["claimant_id"],
        owner_private_info=claim_data["owner_private_info"],
        quiz_score=correct_count,
        is_verified=is_verified,
        status="APPROVED" if is_verified else "PENDING"
    )
    session.add(new_claim)
    session.commit()
    session.refresh(new_claim)
    
    # Add Quiz Logs
    for r in verification_results:
        log = QuizLog(
            claim_id=new_claim.id,
            question_text=r["question"],
            answer_text=r["answer"],
            is_correct=r["is_correct"]
        )
        session.add(log)
    
    # Update Item State if verified
    if is_verified:
        item.state = ItemState.PENDING_HANDOVER
        item.state_updated_at = datetime.now()
        session.add(item)
    
    session.commit()
    session.refresh(new_claim)
    return new_claim

@router.get("/")
def read_claims(claimant_id: Optional[int] = None, session: Session = Depends(get_session)):
    query = select(Claim)
    if claimant_id:
        query = query.where(Claim.claimant_id == claimant_id)
    
    claims = session.exec(query).all()
    
    # Enrich claims with item data
    enriched_claims = []
    for claim in claims:
        item = session.get(Item, claim.item_id)
        primary_img = next((img.url for img in item.images if img.is_primary), item.images[0].url if item.images else None)
        
        claim_dict = claim.dict()
        claim_dict["item"] = {
            "title": item.title,
            "image_url": primary_img if primary_img else None,
            "state": item.state
        }
        enriched_claims.append(claim_dict)
        
    return enriched_claims

@router.get("/item/{item_id}", response_model=List[Claim])
def read_item_claims(item_id: int, session: Session = Depends(get_session)):
    return session.exec(select(Claim).where(Claim.item_id == item_id)).all()
