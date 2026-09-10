from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _set_auth_cookie(response: Response, token: str) -> None:
    """Grava o JWT num cookie HttpOnly (US-026).

    Com HttpOnly o token deixa de ser legível por JavaScript, o que fecha a
    porta para o roubo de sessão via XSS. As flags `secure` e `samesite` vêm
    da configuração — ver `app/config.py`.
    """
    response.set_cookie(
        key=settings.cookie_name,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=settings.access_token_expire_minutes * 60,
        path="/",
    )


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, response: Response, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email) is not None:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    if crud.get_user_by_username(db, payload.username) is not None:
        raise HTTPException(status_code=400, detail="Nome de usuário já em uso")
    user = crud.create_user(db, payload)
    token = create_access_token(user.user_id)
    _set_auth_cookie(response, token)
    # access_token continua no corpo apenas durante a migração para cookie.
    return schemas.AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.user_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(user.user_id)
    _set_auth_cookie(response, token)
    # access_token continua no corpo apenas durante a migração para cookie.
    return schemas.AuthResponse(access_token=token, user=user)


@router.post("/logout")
def logout(response: Response) -> dict[str, str]:
    """Encerra a sessão apagando o cookie. Idempotente: sem cookie, também 200."""
    response.delete_cookie(
        key=settings.cookie_name,
        path="/",
        samesite=settings.cookie_samesite,
        secure=settings.cookie_secure,
        httponly=True,
    )
    return {"detail": "Sessão encerrada"}


@router.get("/me", response_model=schemas.UserRead)
def me(current_user: models.User = Depends(get_current_user)):
    """Fonte de verdade da sessão para o frontend, já que o token não é legível por JS."""
    return current_user
