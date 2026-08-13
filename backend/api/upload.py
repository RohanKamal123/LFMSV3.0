from fastapi import APIRouter, UploadFile, File
import os

from services.uploads import save_validated_image, save_validated_attachment

router = APIRouter()

UPLOAD_DIR = os.path.join(os.environ.get("DATA_DIR", "."), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    file_path = await save_validated_image(file, UPLOAD_DIR)
    filename = os.path.basename(file_path)
    return {"url": f"/uploads/{filename}"}

@router.post("/attachment")
async def upload_attachment(file: UploadFile = File(...)):
    """Images or short videos - for support-ticket evidence, not item
    photos (those stay image-only via the endpoint above)."""
    file_path = await save_validated_attachment(file, UPLOAD_DIR)
    filename = os.path.basename(file_path)
    return {"url": f"/uploads/{filename}"}
