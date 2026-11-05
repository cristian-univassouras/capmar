"""Comandos operacionais: python -m app.maintenance cleanup | import-legacy."""
import argparse
import time
from pathlib import Path

from sqlalchemy import delete, select

from . import models
from .config import settings
from .database import SessionLocal
from .media import bind_media, store_upload
from .presentation import project_media


def cleanup():
    now = int(time.time())
    removed = 0
    with SessionLocal.begin() as db:
        db.execute(delete(models.AuthSession).where(models.AuthSession.expires_at <= now))
        db.execute(delete(models.PasswordReset).where(models.PasswordReset.expires_at <= now))
        db.execute(delete(models.RateBucket).where(models.RateBucket.window < now - 7200))
        # Mesma ordem de locks do upload: usuário -> mídia.
        owners = list(db.scalars(select(models.Upload.owner_id).distinct()))
        for owner_id in owners:
            db.execute(select(models.User.user_id).where(models.User.user_id == owner_id).with_for_update())
            candidates = db.scalars(select(models.Upload).where(
                models.Upload.owner_id == owner_id,
                models.Upload.created_at < now - settings.upload_orphan_hours * 3600,
            ).with_for_update())
            for upload in candidates:
                target = {"project": models.Project, "post": models.Post, "user": models.User}.get(upload.resource_type)
                resource = db.get(target, upload.resource_id) if target else None
                fields = {"project": ("cover_url", "logo_url"), "post": ("image_url",), "user": ("avatar_url",)}
                referenced = resource is not None and any(
                    getattr(resource, field) == "/uploads/" + upload.upload_id
                    for field in fields[upload.resource_type])
                if resource is not None and upload.resource_type == "project":
                    referenced = "/uploads/" + upload.upload_id in project_media(resource)
                if not referenced:
                    db.delete(upload)
                    removed += 1
    return removed


def import_legacy():
    """Reencodifica referências legadas reconhecidas. Não apaga arquivos originais."""
    root = Path(settings.upload_dir).resolve()
    imported, pending = 0, 0
    for model, kind, pk, owner_field, fields in (
        (models.User, "user", "user_id", "user_id", ("avatar_url",)),
        (models.Project, "project", "project_id", "owner_id", ("cover_url", "logo_url")),
        (models.Post, "post", "post_id", "user_id", ("image_url",)),
    ):
        with SessionLocal() as db:
            ids = list(db.scalars(select(getattr(model, pk))))
        for rid in ids:
            # Cada recurso é atômico; falhas não corrompem outras importações.
            try:
                with SessionLocal.begin() as db:
                    resource = db.get(model, rid)
                    owner = db.get(models.User, getattr(resource, owner_field)) if getattr(resource, owner_field) else None
                    legacy = [field for field in fields if getattr(resource, field) and
                              "." in getattr(resource, field).split("/")[-1]]
                    if not legacy:
                        continue
                    if owner is None:
                        raise ValueError("Proprietário legado ausente")
                    for field in legacy:
                        url = getattr(resource, field)
                        if not url.startswith("/uploads/"):
                            raise ValueError("URL externa exige revisão manual")
                        path = (root / url.removeprefix("/uploads/")).resolve()
                        if not path.is_relative_to(root) or path.parent != root:
                            raise ValueError("Caminho fora do diretório legado")
                        with path.open("rb") as source:
                            data = source.read(5 * 1024 * 1024 + 1)
                        upload = store_upload(db, owner, data)
                        setattr(resource, field, "/uploads/" + upload.upload_id)
                    bind_media(db, owner, kind, rid, project_media(resource) if kind == "project" else [getattr(resource, field) for field in fields])
                imported += 1
            except Exception:
                # Não imprimir conteúdo, caminhos privados ou credenciais.
                pending += 1
                print(f"Revisão necessária: {kind} id={rid}")
    return imported, pending


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("command", choices=["cleanup", "import-legacy"])
    args = parser.parse_args()
    if args.command == "cleanup":
        print(f"Órfãos removidos: {cleanup()}")
    else:
        imported, pending = import_legacy()
        print(f"Recursos importados: {imported}; pendências: {pending}")
        raise SystemExit(1 if pending else 0)
