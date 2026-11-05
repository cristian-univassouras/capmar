"""Recuperação por token opaco; e-mail sai exclusivamente pelo SMTP configurado."""
import hashlib
import logging
import secrets
import smtplib
import ssl
import time
from email.message import EmailMessage

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request, Response
from pydantic import EmailStr, Field, field_validator
from sqlalchemy import select, delete
from sqlalchemy.orm import Session

from .config import settings
from .database import get_db
from .models import User, PasswordReset, AuthSession
from .schemas import ValidatedInput
from .security import hash_password, password_bytes
from .mfa import verify_mfa
from .limits import consume, client_ip
from .audit import record

router = APIRouter(prefix="/auth", tags=["recovery"])
GENERIC = {"detail": "Se houver uma conta ativa para esse e-mail, você receberá um link para redefinir a senha."}


class Forgot(ValidatedInput):
    email: EmailStr = Field(max_length=50)


class Reset(ValidatedInput):
    token: str = Field(pattern=r"^[A-Za-z0-9_-]{43}$")
    password: str = Field(min_length=12, max_length=72)
    otp: str | None = Field(default=None, pattern=r"^\d{6}$")

    @field_validator("password")
    @classmethod
    def valid_password(cls, value):
        password_bytes(value)
        return value


def send_reset(email, token):
    if not settings.smtp_host:
        raise RuntimeError("SMTP não configurado")
    message = EmailMessage()
    message["Subject"] = "Redefina sua senha — CapMar"
    message["From"] = settings.smtp_from
    message["To"] = email
    message.set_content("Recebemos um pedido para redefinir sua senha do CapMar.\n\n"
        + settings.site_url.rstrip("/") + "/redefinir-senha#token=" + token
        + "\n\nO link expira em 30 minutos e só pode ser usado uma vez. Se ativou o autenticador, ele continua necessário. "
          "Se você não pediu esta alteração, ignore este e-mail. Sua senha permanece a mesma.")
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=5) as smtp:
        if settings.smtp_starttls:
            smtp.starttls(context=ssl.create_default_context())
        if settings.smtp_username:
            smtp.login(settings.smtp_username, settings.smtp_password)
        smtp.send_message(message)


def deliver_reset(email, token):
    try:
        send_reset(email, token)
    except Exception:
        logging.getLogger(__name__).error("Falha de entrega SMTP na recuperação de senha; verificar serviço")


@router.post("/forgot-password")
def forgot(payload: Forgot, request: Request, tasks: BackgroundTasks, db: Session = Depends(get_db, scope="function")):
    consume("reset-ip:" + client_ip(request), 10, 3600)
    consume("reset-email:" + str(payload.email), 3, 3600)
    user = db.scalar(select(User).where(User.email == str(payload.email), User.is_active.is_(True)).with_for_update())
    if user is None:
        return GENERIC
    token = secrets.token_urlsafe(32)
    # Só guardar o hash; nunca registrar conteúdo da mensagem/token nos logs.
    db.execute(delete(PasswordReset).where(PasswordReset.expires_at <= int(time.time())))
    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.user_id))
    db.add(PasswordReset(token_hash=hashlib.sha256(token.encode()).hexdigest(), user_id=user.user_id,
                         email=user.email, expires_at=int(time.time()) + 1800))
    # scope=function confirma a transação antes da resposta; SMTP só começa
    # depois dela, sem revelar existência da conta pela latência do servidor SMTP.
    tasks.add_task(deliver_reset, user.email, token)
    return GENERIC


@router.post("/reset-password")
def reset(payload: Reset, request: Request, response: Response, db: Session = Depends(get_db, scope="function")):
    consume("reset-attempt:" + client_ip(request), 10, 900)
    digest = hashlib.sha256(payload.token.encode()).hexdigest()
    consume("reset-token:" + digest, 6, 900)
    entry = db.get(PasswordReset, digest)
    if entry is None:
        raise HTTPException(400, "Link inválido ou expirado. Solicite um novo link.")
    user = db.scalar(select(User).where(User.user_id == entry.user_id).with_for_update().execution_options(populate_existing=True))
    db.expire(entry)
    entry = db.scalar(select(PasswordReset).where(PasswordReset.token_hash == digest).execution_options(populate_existing=True))
    if entry is None or entry.expires_at <= int(time.time()) or not user or not user.is_active or user.email != entry.email:
        raise HTTPException(400, "Link inválido ou expirado. Solicite um novo link.")
    if user.mfa_enabled:
        verify_mfa(db, user, payload.otp)
    user.user_password = hash_password(payload.password)
    user.mfa_pending, user.mfa_pending_until = None, 0
    db.execute(delete(AuthSession).where(AuthSession.user_id == user.user_id))
    db.execute(delete(PasswordReset).where(PasswordReset.user_id == user.user_id))
    record(db, user.user_id, "password.recovered", "user", user.user_id, "Recuperação por e-mail; sessões e links revogados")
    response.delete_cookie(settings.cookie_name, path="/", httponly=True, secure=settings.cookie_secure,
                           samesite=settings.cookie_samesite)
    return {"detail": "Senha redefinida. Entre com sua nova senha."}
