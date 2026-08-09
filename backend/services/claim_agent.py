import json
from typing import Optional

from sqlmodel import Session, select
from google.genai import types

from services.ai_client import get_client, MODEL_NAME
from models import Item, Claim, QuizLog, ClaimReview


def review_claim(session: Session, claim_id: int) -> Optional[ClaimReview]:
    """Runs an agentic second-opinion review of a claim: the model calls
    tools to pull the item's real (private) details and the already-graded
    quiz history, then produces a structured recommendation + reasoning for
    staff. This NEVER overrides claim.is_verified/status or item.state -
    the deterministic quiz-score gate (api/claims.py) is still the only
    thing that auto-approves a claim. This is purely an assistive flag for
    the staff/admin claims-review UI, best-effort: returns None on any
    failure so it never blocks a claim submission.
    """
    client = get_client()
    if not client:
        return None

    claim = session.get(Claim, claim_id)
    if not claim:
        return None

    def get_item_context(item_id: int) -> dict:
        """Fetch the found item's title, public description, private (secret, owner-only) description, and location name."""
        item = session.get(Item, item_id)
        if not item:
            return {"error": "item not found"}
        return {
            "title": item.title,
            "public_description": item.public_description,
            "private_description": item.private_description,
            "location": item.location_rel.name if item.location_rel else "Unknown",
        }

    def get_quiz_history(claim_id: int) -> list:
        """Fetch the graded multiple-choice quiz questions/answers already recorded for this claim."""
        logs = session.exec(select(QuizLog).where(QuizLog.claim_id == claim_id)).all()
        return [
            {"question": l.question_text, "answer": l.answer_text, "is_correct": l.is_correct}
            for l in logs
        ]

    prompt = f"""
You are assisting Find-X lost & found staff by giving a second opinion on a claim, AFTER the system's
automatic multiple-choice quiz grading has already run. Your output does NOT change that automatic
decision - a human reads your assessment and decides whether to double-check the claim.

Claim ID: {claim_id}
Item ID: {claim.item_id}
Claimant's free-text ownership description: "{claim.owner_private_info}"
Automatic quiz result: {claim.quiz_score} correct, auto is_verified={claim.is_verified}

Use the available tools to fetch the item's real details and this claim's quiz history, then assess:
1. Does the claimant's free-text description plausibly match the item's PRIVATE (secret) description,
   or does it read like a guess, or like it was copied from the PUBLIC description instead?
2. Does the quiz history look consistent with genuine ownership knowledge?
3. Any inconsistencies or red flags a human should double-check, regardless of the automatic verdict?

Respond with ONLY strict JSON, no markdown fences:
{{"recommendation": "APPROVE" | "REJECT" | "NEEDS_HUMAN_REVIEW", "confidence": 0.0-1.0, "reasoning": "one or two sentences", "flags": ["short-flag-1", ...]}}
"""

    try:
        response = client.models.generate_content(
            model=MODEL_NAME,
            contents=prompt,
            config=types.GenerateContentConfig(tools=[get_item_context, get_quiz_history]),
        )
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()
        data = json.loads(text)
    except Exception as e:
        print(f"Claim agent review failed (model={MODEL_NAME}): {e!r}")
        return None

    review = ClaimReview(
        claim_id=claim_id,
        recommendation=data.get("recommendation", "NEEDS_HUMAN_REVIEW"),
        confidence=float(data.get("confidence", 0.5)),
        reasoning=data.get("reasoning", ""),
        flags_json=json.dumps(data.get("flags", [])),
    )
    session.add(review)
    session.commit()
    session.refresh(review)
    return review
