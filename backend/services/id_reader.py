import google.generativeai as genai
import os
import re
import PIL.Image
from typing import Optional, Dict, Any
import cv2
import numpy as np

async def extract_id_from_image(image_path: str) -> Dict[str, Any]:
    """
    Uses Gemini Vision API to extract student ID.
    Now uses a multi-stage approach for higher accuracy.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return {"success": False, "error": "Gemini API key not found", "raw_text": "API_KEY_MISSING"}

    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-1.5-flash')

    prompt = """
    You are an OCR specialist for United International University (UIU). 
    Extract the STUDENT ID NUMBER from this ID card image.
    
    CRITICAL INSTRUCTIONS:
    1. Look for a 9 or 10 digit number.
    2. Common formats: '011 233 0047', '0112330047', '211-233-004'.
    3. The ID is often located at the bottom or near the text 'STUDENT ID:'.
    4. Return ONLY the 9-10 digits. No other text.
    5. If not found, return 'NOT_FOUND'.
    """

    try:
        # STAGE 1: Try Original Image (often best for modern AI)
        print(f"DEBUG: Stage 1 - Processing original image {image_path}")
        img_orig = PIL.Image.open(image_path)
        response = model.generate_content([prompt, img_orig])
        
        extracted_text = response.text.strip() if response and response.text else "NOT_FOUND"
        digits_only = re.sub(r'\D', '', extracted_text)

        if 9 <= len(digits_only) <= 12: # UIU IDs are 9-10, giving some buffer
             # Truncate to 10 if it captured extra noise but starts with recognized pattern
             id_val = digits_only[:10]
             return {"success": True, "id_number": id_val, "confidence": 1.0, "raw_text": extracted_text}

        # STAGE 2: Try Moderated OpenCV Preprocessing if Stage 1 failed
        print(f"DEBUG: Stage 2 - Preprocessing image with OpenCV...")
        img_cv = cv2.imread(image_path)
        if img_cv is not None:
            # Simple contrast enhancement instead of heavy thresholding
            gray = cv2.cvtColor(img_cv, cv2.COLOR_BGR2GRAY)
            # Increase contrast
            alpha = 1.5 # Contrast control
            beta = 0    # Brightness control
            adjusted = cv2.convertScaleAbs(gray, alpha=alpha, beta=beta)
            
            # Temporary path for stage 2
            temp_path = f"{image_path}_stage2.jpg"
            cv2.imwrite(temp_path, adjusted)
            
            img_stage2 = PIL.Image.open(temp_path)
            response2 = model.generate_content([prompt, img_stage2])
            
            # Cleanup
            if os.path.exists(temp_path): os.remove(temp_path)
            
            if response2 and response2.text:
                extracted_text2 = response2.text.strip()
                digits_only2 = re.sub(r'\D', '', extracted_text2)
                if 9 <= len(digits_only2) <= 10:
                    return {"success": True, "id_number": digits_only2, "confidence": 0.9, "raw_text": extracted_text2}

        return {
            "success": False,
            "id_number": None,
            "error": "Could not find a valid Student ID",
            "raw_text": extracted_text
        }

    except Exception as e:
        print(f"ERROR: ID Extraction failed: {str(e)}")
        return {"success": False, "error": str(e), "raw_text": f"EXCEPTION: {str(e)}"}

def validate_id_format(id_str: str) -> bool:
    """Validates if the provided string is a 9-10 digit integer."""
    return bool(re.match(r'^\d{9,10}$', id_str))
