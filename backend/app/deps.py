import time

import jwt
from fastapi import Depends, HTTPException, Request
from sqlalchemy.orm import Session

from . import models
from .config import settings
from .database import get_db
from .security import ALGORITHM


def session_from_request(request: Request, db: Session) -> models.AuthSession | None:
    # Bearer encerrado: clientes antigos devem autenticar novamente por cookie.
    token = request.cookies.get(settings.cookie_name)
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM],
                             options={"require": ["exp", "iat", "sub", "jti"]})
        if not isinstance(payload["jti"], str) or len(payload["jti"]) != 64:
            return None
        if not isinstance(payload["sub"], str) or not payload["sub"].isdigit() or len(payload["sub"]) > 10:
            return None
        session = db.get(models.AuthSession, payload["jti"], populate_existing=True)
        if session and session.user_id == int(payload["sub"]) and session.expires_at > int(time.time()):
            return session
    except (jwt.PyJWTError, KeyError, ValueError, TypeError):
        pass
    return None


def get_current_user_optional(request: Request, db: Session = Depends(get_db, scope="function")) -> models.User | None:
    session = session_from_request(request, db)
    user = db.get(models.User, session.user_id) if session else None
    return user if user and user.is_active else None


def get_current_user(request: Request, user: models.User | None = Depends(get_current_user_optional)) -> models.User:
    if user is None:
        raise HTTPException(status_code=401, detail="Sessão inválida ou expirada")
    if request.method not in ("GET", "HEAD", "OPTIONS") and not request.url.path.startswith("/auth/"):
        from .limits import consume
        consume(f"write-user:{user.user_id}", settings.write_limit, 60)
    return user
