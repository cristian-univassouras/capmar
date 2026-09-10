import jwt
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from . import crud, models
from .config import settings
from .database import get_db
from .security import ALGORITHM

bearer_scheme = HTTPBearer(auto_error=False)


def _token_from_request(
    request: Request, creds: HTTPAuthorizationCredentials | None
) -> str | None:
    """Extrai o JWT das duas origens aceitas durante a migração (US-026).

    1. O cookie HttpOnly emitido por /auth/login e /auth/register — origem
       oficial, invisível para o JavaScript.
    2. O header `Authorization: Bearer` — fallback TEMPORÁRIO, mantido apenas
       para não quebrar clientes durante a sprint. REMOVER no fechamento
       (ver F5 do plano de implementação).
    """
    cookie_token = request.cookies.get(settings.cookie_name)
    if cookie_token:
        return cookie_token
    if creds is not None:
        return creds.credentials
    return None


def _user_from_credentials(
    request: Request, creds: HTTPAuthorizationCredentials | None, db: Session
) -> models.User | None:
    token = _token_from_request(request, creds)
    if token is None:
        return None
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, ValueError):
        return None
    return crud.get_user(db, user_id)


def get_current_user(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User:
    user = _user_from_credentials(request, creds, db)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Não autenticado",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_user_optional(
    request: Request,
    creds: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> models.User | None:
    return _user_from_credentials(request, creds, db)
