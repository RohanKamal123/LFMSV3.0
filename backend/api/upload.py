from fastapi import APIRouter, UploadFile, File
import os

from services.uploads import save_validated_image

router = APIRouter()

UPLOAD_DIR = os.path.join(os.environ.get("DATA_DIR", "."), "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/")
async def upload_image(file: UploadFile = File(...)):
    file_path = await save_validated_image(file, UPLOAD_DIR)
    filename = os.path.basename(file_path)
    return {"url": f"/uploads/{filename}"}
