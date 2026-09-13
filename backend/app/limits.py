import hashlib
import hmac
import time

from fastapi import HTTPException
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.dialects.sqlite import insert as sqlite_insert
from sqlalchemy.exc import SQLAlchemyError

from . import database, models
from .config import settings


def consume(key: str, limit: int, seconds: int):
    """Contador atômico compartilhado; tentativas com falha também consomem limite."""
    now = int(time.time())
    window = now // seconds * seconds
    digest = hmac.new(settings.secret_key.encode(), key.encode(), hashlib.sha256).hexdigest()
    try:
        with database.SessionLocal.begin() as db:
            insert = pg_insert if db.bind.dialect.name == "postgresql" else sqlite_insert
            stmt = insert(models.RateBucket).values(key=digest, window=window, count=1)
            count = db.scalar(stmt.on_conflict_do_update(
                index_elements=["key", "window"],
                set_={"count": models.RateBucket.count + 1},
            ).returning(models.RateBucket.count))
    except SQLAlchemyError as exc:
        raise HTTPException(503, "Controle de uso indisponível; tente novamente") from exc
    if count > limit:
        raise HTTPException(429, "Muitas tentativas; tente novamente mais tarde",
                            headers={"Retry-After": str(window + seconds - now)})


def client_ip(request):
    # Uvicorn só deve aceitar forwarded headers de proxies configurados explicitamente.
    return request.client.host if request.client else "unknown"
