from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select, update
from typing import List, Optional
import json
from database import get_session
from models import Claim, Item, ItemState, User, UserRole, QuizLog, QuizAttempt, ClaimReview
from services.claim_agent import review_claim
from services.auth import get_current_user
from datetime import datetime

router = APIRouter()

@router.post("/", response_model=Claim)
async def create_claim(claim_data: dict, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Expected claim_data: { item_id, owner_private_info, attempt_id, quiz_answers: [{question, answer}] }
    # claimant identity comes from the authenticated session, never from the body.
    claimant_id = current_user.id

    item = session.get(Item, claim_data["item_id"])
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    if item.finder_id and item.finder_id == claimant_id:
        raise HTTPException(status_code=400, detail="You cannot claim an item you reported as found.")

    if item.state != ItemState.ACTIVE:
        raise HTTPException(status_code=409, detail="This item is no longer available to claim.")

    attempt = session.get(QuizAttempt, claim_data.get("attempt_id"))
    if not attempt or attempt.item_id != item.id:
        raise HTTPException(status_code=400, detail="Invalid or expired quiz attempt")

    # Grade deterministically against the server-held answer key - the
    # client never receives correct_index, so this can't be gamed by
    # reading the network response.
    correct_questions = json.loads(attempt.questions_json)
    submitted_answers = claim_data.get("quiz_answers", [])

    verification_results = []
    for i, q in enumerate(correct_questions):
        submitted = submitted_answers[i]["answer"] if i < len(submitted_answers) else None
        correct_option = q["options"][q["correct_index"]]
        verification_results.append({
            "question": q["question"],
            "answer": submitted,
            "is_correct": submitted == correct_option
        })

    correct_count = sum(1 for r in verification_results if r["is_correct"])
    # Relaxed verification: Allow 1 mistake if 3 or more questions
    total_questions = len(verification_results)
    is_verified = False
    if total_questions > 0:
        if total_questions >= 3:
            is_verified = correct_count >= 2
        else:
            is_verified = correct_count == total_questions

    # If verified, atomically flip the item to PENDING_HANDOVER only if it's
    # still ACTIVE. Two claimants can both pass their own quiz for the same
    # item at nearly the same time; this UPDATE...WHERE is what actually
    # decides which one wins - the WHERE clause is re-checked by the database
    # at write time, so only the first writer's condition still holds and the
    # loser's affected-row-count comes back 0, regardless of how the two
    # requests interleaved.
    lost_race = False
    if is_verified:
        result = session.exec(
            update(Item)
            .where(Item.id == item.id)
            .where(Item.state == ItemState.ACTIVE)
            .values(state=ItemState.PENDING_HANDOVER, state_updated_at=datetime.now())
        )
        if result.rowcount == 0:
            lost_race = True
            is_verified = False

    # Create Claim with appropriate status
    new_claim = Claim(
        item_id=claim_data["item_id"],
        claimant_id=claimant_id,
        owner_private_info=claim_data["owner_private_info"],
        quiz_score=correct_count,
        is_verified=is_verified,
        status="APPROVED" if is_verified else "REJECTED" if lost_race else "PENDING"
    )
    session.add(new_claim)
    session.commit()
    session.refresh(new_claim)

    # Add Quiz Logs
    for r in verification_results:
        log = QuizLog(
            claim_id=new_claim.id,
            question_text=r["question"],
            answer_text=r["answer"] or "",
            is_correct=r["is_correct"]
        )
        session.add(log)

    session.commit()
    session.refresh(new_claim)

    if lost_race:
        raise HTTPException(
            status_code=409,
            detail="Your answers were correct, but this item was just claimed by someone else. Your attempt has been logged."
        )

    # Agentic second opinion for staff review - best-effort, never blocks
    # or alters the deterministic decision above.
    try:
        review_claim(session, new_claim.id)
    except Exception as e:
        print(f"Claim review agent errored for claim {new_claim.id}: {e!r}")

    return new_claim

@router.get("/reviews")
def list_claim_reviews(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    """Returns the latest agentic review per claim, keyed by claim_id, for the staff review UI."""
    if current_user.role not in (UserRole.STAFF, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Staff or admin access required.")
    reviews = session.exec(select(ClaimReview).order_by(ClaimReview.created_at.desc())).all()
    result = {}
    for r in reviews:
        if r.claim_id not in result:
            result[r.claim_id] = {
                "recommendation": r.recommendation,
                "confidence": r.confidence,
                "reasoning": r.reasoning,
                "flags": json.loads(r.flags_json) if r.flags_json else [],
                "created_at": r.created_at,
            }
    return result

@router.get("/")
def read_claims(claimant_id: Optional[int] = None, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    # Students can only ever see their own claims, regardless of what
    # claimant_id they pass - staff/admin may look up any claimant.
    if current_user.role not in (UserRole.STAFF, UserRole.ADMIN):
        claimant_id = current_user.id

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
def read_item_claims(item_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    if current_user.role not in (UserRole.STAFF, UserRole.ADMIN):
        raise HTTPException(status_code=403, detail="Staff or admin access required.")
    return session.exec(select(Claim).where(Claim.item_id == item_id)).all()
