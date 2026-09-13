from fastapi import APIRouter, Depends, File, HTTPException, Response, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..media import MAX_BYTES, can_read_upload, store_upload

router = APIRouter(tags=["uploads"])


@router.post("/upload", response_model=schemas.UploadResponse)
def upload_image(file: UploadFile = File(...), user: models.User = Depends(get_current_user),
                 db: Session = Depends(get_db, scope="function")):
    # Também limita leitura no handler; Content-Type do cliente não determina formato.
    data = file.file.read(MAX_BYTES + 1)
    upload = store_upload(db, user, data)
    return schemas.UploadResponse(url="/uploads/" + upload.upload_id)


@router.get("/uploads/{upload_id}")
def read_upload(upload_id: str, user: models.User | None = Depends(get_current_user_optional),
                db: Session = Depends(get_db, scope="function")):
    if len(upload_id) != 32:
        raise HTTPException(404, "Imagem não encontrada")
    upload = db.get(models.Upload, upload_id)
    if upload is None or not can_read_upload(db, upload, user):
        raise HTTPException(404, "Imagem não encontrada")
    return Response(upload.data, media_type=upload.content_type,
                    headers={"Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff"})


@router.delete("/uploads/{upload_id}", status_code=204)
def delete_upload(upload_id: str, user: models.User = Depends(get_current_user),
                  db: Session = Depends(get_db, scope="function")):
    db.execute(select(models.User.user_id).where(models.User.user_id == user.user_id).with_for_update())
    upload = db.scalar(select(models.Upload).where(models.Upload.upload_id == upload_id).with_for_update())
    if upload is None or upload.owner_id != user.user_id:
        raise HTTPException(404, "Imagem não encontrada")
    if upload.resource_type is not None:
        raise HTTPException(409, "Desvincule a imagem antes de excluí-la")
    db.delete(upload)
