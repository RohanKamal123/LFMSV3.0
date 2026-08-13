import os

from fastapi import APIRouter, Depends, UploadFile, File
from sqlmodel import Session

from database import get_session, engine
from models import Item, ItemState
from services.uploads import save_validated_image
from services.visual_search import search_by_image

router = APIRouter()

UPLOAD_DIR = os.path.join(os.environ.get("DATA_DIR", "."), "uploads", "visual_search")
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/")
async def visual_search(file: UploadFile = File(...), session: Session = Depends(get_session)):
    """Upload a photo of a lost item; returns ACTIVE found items ranked by
    visual similarity. The query photo is scratch space, not a report -
    deleted right after the search regardless of outcome."""
    file_path = await save_validated_image(file, UPLOAD_DIR)
    try:
        result = search_by_image(session, engine, file_path)
    finally:
        if os.path.exists(file_path):
            os.remove(file_path)

    matches = []
    for item_id, similarity in result["matches"]:
        item = session.get(Item, item_id)
        if not item or item.state != ItemState.ACTIVE:
            continue
        primary_img = next((img.url for img in item.images if img.is_primary), item.images[0].url if item.images else None)
        matches.append({
            "id": item.id,
            "title": item.title,
            "description": item.public_description,
            "image_url": primary_img,
            "similarity": similarity,
        })

    return {"mode": result["mode"], "caption": result.get("caption"), "matches": matches}
