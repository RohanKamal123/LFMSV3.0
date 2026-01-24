from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List, Dict
from database import get_session
from models import Item, ItemState
from services.gemini import generate_quiz

router = APIRouter()

@router.post("/generate/{item_id}")
async def create_quiz_for_item(item_id: int, session: Session = Depends(get_session)):
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
    
    return {
        "item_title": item.title,
        "questions": questions
    }
