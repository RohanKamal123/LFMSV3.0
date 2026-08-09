import os
from typing import Optional

from google import genai

# "-latest" alias so this doesn't silently rot when Google retires a dated
# model version (which is what broke Fast ID / quiz generation before).
MODEL_NAME = os.environ.get("GEMINI_MODEL_NAME", "gemini-flash-latest")


def get_client() -> Optional[genai.Client]:
    """Returns a configured Gemini client, or None if no API key is set.

    Callers must still catch exceptions from actual API calls (revoked key,
    quota, network) separately - this only covers the "key not configured" case.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        return None
    return genai.Client(api_key=api_key)
