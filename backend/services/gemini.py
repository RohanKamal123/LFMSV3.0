import google.generativeai as genai
import os
import json
from typing import List, Dict

# Configuration Placeholder
# genai.configure(api_key=os.environ.get("GEMINI_API_KEY", "YOUR_KEY_HERE"))

def generate_quiz_mock(public_desc: str, private_desc: str) -> List[Dict]:
    """Fallback mock quiz data."""
    return [
        {
            "question": f"Based on the private description, what color or mark is unique to this '{public_desc}'?",
            "justification": "Verifies specific knowledge from private description."
        },
        {
            "question": "Does the item have any specific internal contents you mentioned?",
            "justification": "Ensures the claimant knows the internals of the found asset."
        },
        {
            "question": "Where exactly was the item placed when you lost it?",
            "justification": "Matches finder's location report with owner's memory."
        }
    ]

async def generate_quiz(public_desc: str, private_desc: str) -> List[Dict]:
    """
    Core AI logic for ownership verification.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    
    if not api_key:
        print("Warning: GEMINI_API_KEY not found. Using fallback mock.")
        return generate_quiz_mock(public_desc, private_desc)

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')
        
        prompt = f"""
        You are a Security Auditor for a University Lost & Found system.
        An item was found with the following details:
        - Public Description: {public_desc}
        - Private/Hidden Description (Known only to owner): {private_desc}
        
        Generate 3 high-security verification questions that an owner must answer to prove ownership.
        The questions should be derived from the Private Description but should NOT reveal the answer in the question itself.
        
        Output format must be a raw JSON list like this:
        [
          {{"question": "What is the specific color of the sticker?", "justification": "Checks for sticker detail"}},
          ...
        ]
        """
        
        response = model.generate_content(prompt)
        # Handle potential markdown formatting in response
        cleaned_text = response.text.strip().replace("```json", "").replace("```", "")
        return json.loads(cleaned_text)
        
    except Exception as e:
        print(f"Gemini API Error: {str(e)}")
        return generate_quiz_mock(public_desc, private_desc)
