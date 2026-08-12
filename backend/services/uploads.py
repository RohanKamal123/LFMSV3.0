import io
import os
import uuid

import PIL.Image
import PIL.ImageOps
from fastapi import HTTPException, UploadFile

MAX_UPLOAD_BYTES = 8 * 1024 * 1024  # 8MB
ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"}
FORMAT_EXTENSION = {"JPEG": "jpg", "PNG": "png", "WEBP": "webp"}


async def save_validated_image(file: UploadFile, dest_dir: str) -> str:
    """Validates an uploaded file is actually a well-formed image within a
    size limit, then re-encodes and saves it under a random filename.
    Re-encoding (rather than a raw byte copy) is what strips EXIF metadata
    (e.g. GPS coordinates embedded in phone photos) and guarantees the saved
    file matches its claimed image type - not just its extension or the
    client-supplied Content-Type header, either of which can be spoofed.
    Returns the file's relative URL path under /uploads. Raises 400 on
    anything that isn't a genuine, reasonably-sized image.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WEBP, or HEIC images are accepted.")

    raw = await file.read()
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Image is too large (max 8MB).")
    if not raw:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        img = PIL.Image.open(io.BytesIO(raw))
        img.verify()
        # verify() leaves the image unusable for further ops - reopen fresh.
        img = PIL.Image.open(io.BytesIO(raw))
        img.load()
    except Exception:
        raise HTTPException(status_code=400, detail="File is not a valid image.")

    fmt = img.format if img.format in FORMAT_EXTENSION else "JPEG"
    ext = FORMAT_EXTENSION[fmt]

    # Phone photos often carry an EXIF orientation tag rather than storing
    # pixels pre-rotated. Bake that rotation into the pixel data *before*
    # the EXIF-dropping re-save below, or the stripped image would come out
    # sideways/upside-down instead of just metadata-free.
    img = PIL.ImageOps.exif_transpose(img)

    if img.mode in ("RGBA", "P") and fmt == "JPEG":
        img = img.convert("RGB")

    os.makedirs(dest_dir, exist_ok=True)
    filename = f"{uuid.uuid4()}.{ext}"
    file_path = os.path.join(dest_dir, filename)

    save_kwargs = {"quality": 88} if fmt == "JPEG" else {}
    img.save(file_path, format=fmt, **save_kwargs)  # no exif= kwarg -> metadata dropped

    return file_path
