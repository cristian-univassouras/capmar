import os
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from .. import models, schemas
from ..config import settings
from ..deps import get_current_user

router = APIRouter(tags=["uploads"])

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB
EXT_BY_TYPE = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}


@router.post("/upload", response_model=schemas.UploadResponse)
def upload_image(
    file: UploadFile = File(...),
    _: models.User = Depends(get_current_user),
):
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Envie uma imagem (JPEG, PNG, WEBP ou GIF)")

    data = file.file.read()
    if len(data) > MAX_BYTES:
        raise HTTPException(status_code=400, detail="Imagem muito grande (máx. 5 MB)")

    os.makedirs(settings.upload_dir, exist_ok=True)
    name = f"{uuid.uuid4().hex}{EXT_BY_TYPE[file.content_type]}"
    with open(os.path.join(settings.upload_dir, name), "wb") as out:
        out.write(data)

    return schemas.UploadResponse(url=f"/uploads/{name}")
