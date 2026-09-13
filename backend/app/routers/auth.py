import bcrypt
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..config import settings
from ..database import get_db
from ..deps import get_current_user, session_from_request
from ..limits import client_ip, consume
from ..security import new_session, verify_password
from ..mfa import verify_mfa

router = APIRouter(prefix="/auth", tags=["auth"])
DUMMY_HASH = bcrypt.hashpw(b"invalid-password", bcrypt.gensalt()).decode()


def _set_auth_cookie(response, token):
    response.set_cookie(settings.cookie_name, token, httponly=True, secure=settings.cookie_secure,
                        samesite=settings.cookie_samesite,
                        max_age=settings.access_token_expire_minutes * 60, path="/")


def _start_session(request, response, db, user):
    previous = session_from_request(request, db)
    if previous:
        db.delete(previous)
        db.flush()
    _set_auth_cookie(response, new_session(db, user.user_id, admin_verified=user.role == "admin" and user.mfa_enabled))
    return schemas.AuthResponse(user=user)


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, request: Request, response: Response,
             db: Session = Depends(get_db, scope="function")):
    consume("register:" + client_ip(request), settings.register_limit, 3600)
    if crud.get_user_by_email(db, payload.email) is not None:
        raise HTTPException(409, "E-mail já cadastrado")
    if crud.get_user_by_username(db, payload.username) is not None:
        raise HTTPException(409, "Nome de usuário já em uso")
    user = crud.create_user(db, payload)
    return _start_session(request, response, db, user)


@router.post("/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, request: Request, response: Response,
          db: Session = Depends(get_db, scope="function")):
    consume("login-ip:" + client_ip(request), settings.login_limit * 3, 900)
    consume("login-account:" + str(payload.email).lower(), settings.login_limit, 900)
    user = crud.get_user_by_email(db, payload.email)
    valid = verify_password(payload.password, user.user_password if user else DUMMY_HASH)
    if user is None or not valid or not user.is_active:
        raise HTTPException(401, "E-mail ou senha inválidos")
    if user.mfa_enabled:
        verify_mfa(db, user, payload.otp)
    return _start_session(request, response, db, user)


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db, scope="function")):
    session = session_from_request(request, db)
    if session:
        db.delete(session)
    response.delete_cookie(settings.cookie_name, path="/", httponly=True,
                           secure=settings.cookie_secure, samesite=settings.cookie_samesite)
    return {"detail": "Sessão encerrada"}


@router.get("/me", response_model=schemas.UserRead)
def me(user: models.User = Depends(get_current_user)):
    return user
