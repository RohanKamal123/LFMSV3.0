import google.generativeai as genai
import os
import re
import PIL.Image
from typing import Optional, Dict, Any

async def extract_id_from_image(image_path: str) -> Dict[str, Any]:
    """
    Uses Gemini Vision API to extract student ID from ID card image.
    Optimized for 9-10 digit integer IDs.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("CRITICAL: GEMINI_API_KEY not found in environment!")
        return {"success": False, "error": "Gemini API key not found", "raw_text": "API_KEY_MISSING"}

    try:
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-1.5-flash')

        # Load image
        img = PIL.Image.open(image_path)

        prompt = """
        You are an OCR specialist for United International University (UIU). 
        Analyze this student ID card image and extract the Student ID Number.
        The ID number is usually 9 or 10 digits long.
        It might be formatted like '011191234', '011 191 234', or '011-191-234'.
        
        Rules:
        1. Look for a sequence of approximately 9-10 digits.
        2. Return ONLY the number (even if it has spaces or dashes).
        3. If no ID is found, return "NOT_FOUND".
        """

        print(f"DEBUG: Processing image {image_path} with Gemini...")
        response = model.generate_content([prompt, img])
        
        if not response or not response.text:
            print(f"WARNING: Gemini returned empty response for {image_path}")
            return {"success": False, "error": "Empty AI response", "raw_text": str(response)}

        extracted_text = response.text.strip()
        print(f"DEBUG: Raw AI Response: '{extracted_text}'")

        # Step 1: Clean the extracted text
        digits_only = re.sub(r'\D', '', extracted_text)
        
        if 9 <= len(digits_only) <= 10:
            return {
                "success": True,
                "id_number": digits_only,
                "confidence": 0.98,
                "raw_text": extracted_text
            }
        
        # Step 2: Try to find a 9-10 digit block inside
        id_pattern = r'\b\d{3}[-\s]?\d{3}[-\s]?\d{3,4}\b|\b\d{9,10}\b'
        match = re.search(id_pattern, extracted_text)
        
        if match:
            found_id = re.sub(r'\D', '', match.group(0))
            if 9 <= len(found_id) <= 10:
                return {
                    "success": True,
                    "id_number": found_id,
                    "confidence": 0.90,
                    "raw_text": extracted_text
                }

        return {
            "success": False,
            "id_number": None,
            "error": "Could not find a valid 9-10 digit ID number",
            "raw_text": extracted_text
        }

    except Exception as e:
        print(f"ERROR: ID Extraction failed: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"success": False, "error": str(e), "raw_text": f"EXCEPTION: {str(e)}"}

def validate_id_format(id_str: str) -> bool:
    """Validates if the provided string is a 9-10 digit integer."""
    return bool(re.match(r'^\d{9,10}$', id_str))
