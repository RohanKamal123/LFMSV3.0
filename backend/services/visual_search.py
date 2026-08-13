import io
import os
from typing import List, Optional, Tuple

import PIL.Image
import requests
from sqlmodel import Session, select

from services.ai_client import get_client, MODEL_NAME
from services.embeddings import find_similar, is_vec_available

# dHash is a 64-bit fingerprint (8x8 grid of brightness comparisons); two
# images of the same real-world object typically land within ~10 bits of
# each other, while unrelated photos land well past 25 - this is a coarse,
# non-AI substitute for the Gemini-captioned semantic search below, used
# only when no GEMINI_API_KEY is configured.
PHASH_SIZE = 8
PHASH_MAX_DISTANCE = 20


def _caption_image(image_path: str) -> Optional[str]:
    """Uses Gemini Vision to describe a lost-item photo the way a found-item
    report would - object type, color, material, brand, distinguishing
    marks - so the caption can be embedded and compared against found-item
    text embeddings via the existing semantic-matching infra. Returns None
    if no AI key is configured or the call fails for any reason."""
    client = get_client()
    if not client:
        return None
    try:
        img = PIL.Image.open(image_path)
        prompt = """
Describe this lost item in one or two dense sentences, the way someone
would describe it in a lost & found report: object type, color(s),
material, brand/model if visible, and any distinguishing marks, wear, or
accessories. Describe only the item itself - not the background, any
people, or the photo.
"""
        response = client.models.generate_content(model=MODEL_NAME, contents=[prompt, img])
        text = response.text.strip() if response and response.text else ""
        return text or None
    except Exception as e:
        print(f"Visual search captioning failed (model={MODEL_NAME}): {e!r}")
        return None


def _open_local_image(file_path: str) -> Optional[PIL.Image.Image]:
    """Opens an image already at a real, directly-openable filesystem path
    (the query photo, saved by save_validated_image before search_by_image
    is called)."""
    try:
        return PIL.Image.open(file_path)
    except Exception as e:
        print(f"Couldn't open image {file_path}: {e!r}")
        return None


def _open_item_image(image_url: str) -> Optional[PIL.Image.Image]:
    """Opens an item's stored photo from its DB url - either a remote URL
    (seeded demo items use external stock-photo links) or a '/uploads/<file>'
    path resolved against DATA_DIR the same way upload.py wrote it."""
    try:
        if image_url.startswith("http://") or image_url.startswith("https://"):
            resp = requests.get(image_url, timeout=8)
            resp.raise_for_status()
            return PIL.Image.open(io.BytesIO(resp.content))
        data_dir = os.environ.get("DATA_DIR", ".")
        local_path = os.path.join(data_dir, image_url.lstrip("/"))
        return PIL.Image.open(local_path)
    except Exception as e:
        print(f"Couldn't open image {image_url}: {e!r}")
        return None


def _dhash(img: Optional[PIL.Image.Image], hash_size: int = PHASH_SIZE) -> Optional[int]:
    if img is None:
        return None
    try:
        img = img.convert("L").resize((hash_size + 1, hash_size))
        pixels = list(img.getdata())
        value = 0
        for row in range(hash_size):
            offset = row * (hash_size + 1)
            for col in range(hash_size):
                value = (value << 1) | int(pixels[offset + col] > pixels[offset + col + 1])
        return value
    except Exception as e:
        print(f"Perceptual hash failed: {e!r}")
        return None


def _phash_search(session: Session, query_image_path: str, k: int) -> List[Tuple[int, float]]:
    from models import Item, ItemState

    query_hash = _dhash(_open_local_image(query_image_path))
    if query_hash is None:
        return []

    items = session.exec(select(Item).where(Item.state == ItemState.ACTIVE)).all()
    scored = []
    for item in items:
        if not item.images:
            continue
        primary = next((img for img in item.images if img.is_primary), item.images[0])
        item_hash = _dhash(_open_item_image(primary.url))
        if item_hash is None:
            continue
        distance = bin(query_hash ^ item_hash).count("1")
        if distance > PHASH_MAX_DISTANCE:
            continue
        similarity_pct = round((1 - distance / (PHASH_SIZE * PHASH_SIZE)) * 100, 1)
        scored.append((item.id, similarity_pct))

    scored.sort(key=lambda pair: pair[1], reverse=True)
    return scored[:k]


def search_by_image(session: Session, engine, query_image_path: str, k: int = 6) -> dict:
    """Finds ACTIVE found items visually similar to an uploaded photo.

    Prefers Gemini: captions the photo, then reuses the existing text
    embedding + cosine-similarity search (services/embeddings.py) against
    found-item descriptions. Falls back to a plain perceptual-hash
    comparison (services/visual_search._dhash) when no GEMINI_API_KEY is
    set or the caption call fails - cruder, but keeps the feature fully
    usable without AI, matching every other AI-backed feature in this app.
    """
    caption = _caption_image(query_image_path)
    if caption and is_vec_available():
        matches = find_similar(session, engine, caption, opposite_type="FOUND", k=k)
        # find_similar returns cosine distance (0=identical); convert to a
        # 0-100 "similarity" the frontend can show directly.
        scored = [(item_id, round(max(0.0, 1 - distance / 0.5) * 100, 1)) for item_id, distance in matches]
        return {"mode": "ai", "caption": caption, "matches": scored}

    return {"mode": "phash", "caption": None, "matches": _phash_search(session, query_image_path, k)}
