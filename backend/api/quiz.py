from fastapi import APIRouter, Depends, HTTPException, Request
from sqlmodel import Session, select
from typing import List, Dict
import json
from database import get_session
from models import Item, ItemState, QuizAttempt, User
from services.gemini import generate_quiz
from services.auth import get_current_user
from services.rate_limit import limiter

router = APIRouter()

@router.post("/generate/{item_id}")
@limiter.limit("15/minute")
async def create_quiz_for_item(request: Request, item_id: int, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    item = session.get(Item, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")

    # Only generate quiz for active items
    if item.state != ItemState.ACTIVE and item.state != ItemState.PENDING_HANDOVER:
        # We allow it for flow demo, but ideally skip archived/resolved
        pass

    location_name = item.location_rel.name if item.location_rel else "Unknown Location"
    questions = await generate_quiz(
        title=item.title,
        public_desc=item.public_description,
        private_desc=item.private_description,
        location=location_name
    )

    # Persist the full question set (with correct answers) server-side only.
    # The client only ever sees question text + options - never correct_index.
    attempt = QuizAttempt(item_id=item_id, questions_json=json.dumps(questions))
    session.add(attempt)
    session.commit()
    session.refresh(attempt)

    sanitized_questions = [
        {"question": q.get("question"), "options": q.get("options")}
        for q in questions
    ]

    return {
        "attempt_id": attempt.id,
        "item_title": item.title,
        "questions": sanitized_questions
    }
