import json
import random
from typing import List, Dict

from services.ai_client import get_client, MODEL_NAME

def generate_quiz_mock(title: str, public_desc: str, private_desc: str, location: str) -> List[Dict]:
    """Fallback mock quiz data - generates challenging similar options."""
    # Extract key details for crafting plausible distractors
    words = private_desc.split()
    key_detail = private_desc[:30] if len(private_desc) > 30 else private_desc
    
    # Create similar-sounding but incorrect options
    similar_locations = {
        "Room": ["Room 105", "Room 112", "Room 203", "Room 110"],
        "Building": ["Building A", "Building B", "Building C", "Building D"],
        "Lab": ["Computer Lab 1", "Computer Lab 2", "Physics Lab", "Chemistry Lab"],
        "Library": ["Main Library", "Digital Library", "Science Library", "Law Library"],
        "Cafeteria": ["Main Cafeteria", "Faculty Cafeteria", "Building B Cafeteria", "Student Cafeteria"],
    }
    
    # Find matching location type or use generic
    loc_distractors = ["Main Building Lobby", "Student Center", "Academic Block A", "Faculty Office Area"]
    for loc_type, options in similar_locations.items():
        if loc_type.lower() in location.lower():
            loc_distractors = [opt for opt in options if opt.lower() != location.lower()][:3]
            break
    
    return [
        {
            "question": f"What specific hidden detail or mark was noted on this '{title}'?",
            "options": [
                key_detail,
                f"Small scratch on the {random.choice(['left', 'right', 'top', 'bottom'])} side",
                f"A faded {random.choice(['sticker', 'mark', 'label', 'tag'])} on the surface",
                f"Minor {random.choice(['dent', 'crack', 'wear', 'damage'])} near the edge"
            ],
            "correct_index": 0,
            "justification": "Direct private detail verification."
        },
        {
            "question": f"Where exactly was this '{title}' found on campus?",
            "options": [location] + loc_distractors[:3],
            "correct_index": 0,
            "justification": "Location verification."
        },
        {
            "question": f"Based on the reported description, which statement is accurate about this item?",
            "options": [
                public_desc[:50] if len(public_desc) > 50 else public_desc,
                f"A {random.choice(['brand new', 'vintage', 'slightly used', 'refurbished'])} item in {random.choice(['good', 'excellent', 'fair', 'poor'])} condition",
                f"Item has {random.choice(['manufacturer', 'custom', 'generic', 'unknown'])} branding visible",
                f"Appears to be {random.choice(['recently purchased', 'well-maintained', 'heavily used', 'rarely used'])}"
            ],
            "correct_index": 0,
            "justification": "Public description verification."
        }
    ]

async def generate_quiz(title: str, public_desc: str, private_desc: str, location: str) -> List[Dict]:
    """
    Advanced AI quiz generation with challenging, similar options.
    """
    client = get_client()
    if not client:
        return generate_quiz_mock(title, public_desc, private_desc, location)

    try:
        prompt = f"""
You are a Security Auditor for a University Lost & Found system designing CHALLENGING ownership verification questions.

ITEM DETAILS:
- Title: {title}
- Found Location: {location}
- Public Description: {public_desc}
- Private/Hidden Description (CONFIDENTIAL - only owner knows): {private_desc}

CRITICAL REQUIREMENTS FOR QUESTION DESIGN:

1. **SIMILAR OPTIONS ARE MANDATORY**: All 4 options for each question MUST be semantically similar and plausible:
   - If asking about a color, all options should be colors (e.g., "Navy blue", "Dark blue", "Royal blue", "Midnight blue")
   - If asking about a location, all options should be similar locations (e.g., "Room 105", "Room 107", "Room 203", "Room 110")
   - If asking about a mark/scratch, all options should describe marks/scratches
   - NEVER mix unrelated options like "a red watch" with "sea" or "chair"

2. **QUESTION TYPES TO USE**:
   - Specific color/shade questions (use similar color variations)
   - Exact location details (use nearby/similar locations)
   - Hidden marks, scratches, or identifying features
   - Brand/model specifics (use similar brands if applicable)
   - Contents or accessories (if mentioned)

3. **DIFFICULTY LEVEL**: Questions should distinguish the real owner who KNOWS the item from someone who is guessing. A random guesser should have only ~25% chance of getting each question right.

4. **FORMAT**: Generate exactly 3 questions. At least 1 MUST be about the private/hidden description.

OUTPUT FORMAT (strict JSON):
[
  {{
    "question": "What specific [aspect] was noted about this item?",
    "options": ["Correct answer", "Similar wrong 1", "Similar wrong 2", "Similar wrong 3"],
    "correct_index": 0,
    "justification": "Why this verifies ownership"
  }}
]

EXAMPLE OF GOOD OPTIONS:
- For a blue backpack: ["Navy blue with gray trim", "Royal blue with black trim", "Sky blue with white trim", "Dark blue with navy trim"]
- For location Room 205: ["Room 205, Building A", "Room 203, Building A", "Room 205, Building B", "Room 207, Building A"]

EXAMPLE OF BAD OPTIONS (NEVER DO THIS):
- ["A red watch", "The ocean", "A wooden chair", "Nothing special"] ← These are unrelated and easy to guess!

Generate the quiz now:
"""

        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        quiz_data = json.loads(text)

        # Shuffle options for each question (keeping track of correct answer)
        for q in quiz_data:
            if "correct_index" in q:
                correct_answer = q["options"][q["correct_index"]]
                random.shuffle(q["options"])
                q["correct_index"] = q["options"].index(correct_answer)

        return quiz_data

    except Exception as e:
        print(f"Gemini quiz generation failed (model={MODEL_NAME}): {e!r}")
        return generate_quiz_mock(title, public_desc, private_desc, location)

async def verify_answers(title: str, public_desc: str, private_desc: str, location: str, quiz_answers: List[Dict]) -> List[Dict]:
    """
    Evaluates claimant answers with full item context to ensure accurate judgment
    of both private details and public facts (like location).
    """
    def fallback_verify(t, pub, priv, loc, answers):
        results = []
        context_blob = f"{t} {pub} {priv} {loc}".lower()
        for q in answers:
            ans_lower = q["answer"].lower()
            # Simple keyword overlap with full context
            is_correct = ans_lower in context_blob or any(word in context_blob for word in ans_lower.split() if len(word) > 3)
            results.append({
                **q,
                "is_correct": is_correct,
                "reason": "Fallback semantic verification (Full Context)"
            })
        return results

    client = get_client()
    if not client:
        return fallback_verify(title, public_desc, private_desc, location, quiz_answers)

    try:
        answers_str = json.dumps(quiz_answers)
        prompt = f"""
OWNERSHIP VERIFICATION JUDGMENT.

ITEM CONTEXT:
- Title: {title}
- Found at: {location}
- Public Description: {public_desc}
- Private/Hidden Details: {private_desc}

USER'S RESPONSES:
{answers_str}

YOUR TASK:
Judge if each response is correct based on the ITEM CONTEXT provided above. 
Some questions are about the location, some about the title, and at least one is about the PRIVATE/HIDDEN details.

JUDGMENT CRITERIA:
1. Be FLEXIBLE but accurate. 
2. If the user's selected answer matches the location, description, or private detail, mark it CORRECT.
3. Use the FULL CONTEXT (location, title, etc.) to judge questions that aren't about the private detail.
4. If an answer is semantically a match (e.g., "Library" matches "Main Library"), mark it CORRECT.

OUTPUT FORMAT (JSON array only):
[
  {{"question": "...", "answer": "...", "is_correct": true/false, "reason": "Explanation citing the context"}}
]
"""

        response = client.models.generate_content(model=MODEL_NAME, contents=prompt)
        text = response.text.strip()
        if "```json" in text:
            text = text.split("```json")[1].split("```")[0].strip()
        elif "```" in text:
            text = text.split("```")[1].split("```")[0].strip()

        return json.loads(text)

    except Exception as e:
        print(f"Gemini answer verification failed (model={MODEL_NAME}): {e!r}")
        return fallback_verify(title, public_desc, private_desc, location, quiz_answers)
