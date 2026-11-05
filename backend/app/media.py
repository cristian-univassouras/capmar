import io
import re
import time
import uuid
import warnings

from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from sqlalchemy import func, select

from . import models
from .access import can_read_project
from .config import settings
from .presentation import project_media

MAX_BYTES = 5 * 1024 * 1024
MAX_PIXELS = 16_000_000
MAX_DIMENSION = 8000
FORMATS = {"JPEG", "PNG", "WEBP", "GIF"}
MEDIA_PATH = re.compile(r"^/uploads/([0-9a-f]{32})$")


def normalize_image(data: bytes) -> tuple[bytes, str]:
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(413, "Imagem deve ter no máximo 5 MB e não pode ser vazia")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(data)) as im:
                if im.format not in FORMATS:
                    raise ValueError("Formato não permitido")
                if im.width > MAX_DIMENSION or im.height > MAX_DIMENSION or im.width * im.height > MAX_PIXELS:
                    raise ValueError("Dimensões excedem 8000 por lado ou 16 milhões de pixels")
                if getattr(im, "is_animated", False):
                    raise ValueError("Imagens animadas não são aceitas")
                im.verify()
            with Image.open(io.BytesIO(data)) as im:
                im.load()
                # Reencodifica só pixels: descarta metadados e conteúdo anexado ao arquivo.
                pixels = im.convert("RGBA" if "A" in im.getbands() or "transparency" in im.info else "RGB")
                pixels.info.clear()
                output = io.BytesIO()
                pixels.save(output, format="WEBP", quality=85, method=0)
                clean = output.getvalue()
                if len(clean) > MAX_BYTES:
                    raise ValueError("Imagem normalizada excede 5 MB")
                return clean, "image/webp"
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombWarning, Image.DecompressionBombError) as exc:
        raise HTTPException(400, "Imagem inválida, animada ou com dimensões excessivas") from exc


def store_upload(db, user, data: bytes, document=False):
    clean, content_type = normalize_pdf(data) if document else normalize_image(data)
    # Lock do usuário serializa cota entre processos e transações.
    db.execute(select(models.User.user_id).where(models.User.user_id == user.user_id).with_for_update())
    count, total = db.execute(select(func.count(models.Upload.upload_id),
                                    func.coalesce(func.sum(models.Upload.size), 0))
                              .where(models.Upload.owner_id == user.user_id)).one()
    if count >= settings.upload_quota_count or total + len(clean) > settings.upload_quota_bytes:
        raise HTTPException(429, "Cota de imagens excedida; remova imagens sem uso")
    upload = models.Upload(upload_id=uuid.uuid4().hex, owner_id=user.user_id, data=clean,
                           content_type=content_type, size=len(clean), created_at=int(time.time()))
    db.add(upload)
    db.flush()
    return upload


def bind_media(db, user, kind, resource_id, urls):
    ids = set()
    for url in filter(None, urls):
        match = MEDIA_PATH.fullmatch(url)
        if not match:
            raise HTTPException(422, "Use apenas imagens enviadas por /upload")
        uid = match[1]
        upload = db.scalar(select(models.Upload).where(models.Upload.upload_id == uid).with_for_update())
        if upload is None or upload.owner_id != user.user_id:
            raise HTTPException(403, "Imagem não pertence ao usuário")
        expected_pdf = kind == "project" and any(item["kind"] == "pdf" and item["url"] == url for item in db.get(models.Project, resource_id).portfolio)
        if kind == "project" and expected_pdf:
            project = db.get(models.Project, resource_id)
            if url in (project.cover_url, project.logo_url) or any(item["kind"] == "image" and item["url"] == url for item in project.portfolio):
                raise HTTPException(422, "Um PDF não pode ser usado como imagem")
        if upload.content_type != ("application/pdf" if expected_pdf else "image/webp"):
            raise HTTPException(422, "O tipo do arquivo não corresponde ao campo do projeto")
        if upload.resource_type is not None and (upload.resource_type, upload.resource_id) != (kind, resource_id):
            raise HTTPException(409, "Imagem já vinculada a outro recurso; envie uma nova cópia")
        upload.resource_type, upload.resource_id = kind, resource_id
        ids.add(uid)
    previous = db.scalars(select(models.Upload).where(
        models.Upload.resource_type == kind, models.Upload.resource_id == resource_id).with_for_update())
    for upload in previous:
        if upload.upload_id not in ids:
            upload.resource_type = upload.resource_id = None
            upload.created_at = int(time.time())
    db.flush()


def can_read_upload(db, upload, user):
    kind, rid = upload.resource_type, upload.resource_id
    url = "/uploads/" + upload.upload_id
    if kind is None:
        return user is not None and user.user_id == upload.owner_id
    if kind == "user":
        owner = db.get(models.User, rid)
        return owner is not None and owner.avatar_url == url
    if kind == "project":
        project = db.get(models.Project, rid)
        return project is not None and url in project_media(project) and can_read_project(db, rid, user)
    if kind == "post":
        post = db.get(models.Post, rid)
        return (post is not None and not post.is_hidden and post.image_url == url and
                (post.project_id is None or can_read_project(db, post.project_id, user)))
    return False


def normalize_pdf(data):
    import subprocess
    import sys
    if not data or len(data) > MAX_BYTES:
        raise HTTPException(413, "PDF deve ter no máximo 5 MB")
    if not data.startswith(b"%PDF-"):
        raise HTTPException(400, "Envie um PDF válido e sem senha")
    try:
        result = subprocess.run([sys.executable, "-m", "app.pdf_worker"], input=data,
                                capture_output=True, timeout=10, check=True)
        if not result.stdout or len(result.stdout) > MAX_BYTES:
            raise ValueError()
        return result.stdout, "application/pdf"
    except (subprocess.SubprocessError, ValueError):
        raise HTTPException(400, "PDF inválido, protegido ou excessivamente complexo (máximo 50 páginas)") from None
