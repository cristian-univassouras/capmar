import time
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import delete, select
from sqlalchemy.orm import Session
from .. import models
from ..audit import record
from ..database import get_db, SessionLocal
from ..deps import get_current_user, session_from_request
from ..engagement_schemas import Reauthenticate, Credentials
from ..limits import consume
from ..mfa import cipher, generate_secret, provisioning, verify_mfa
from ..security import verify_password, hash_password, password_bytes

router = APIRouter(prefix="/auth", tags=["account security"])


def proof(db, user, payload, require_otp=False):
    consume(f"reauth:{user.user_id}", 6, 300)
    db.refresh(user, with_for_update=True)
    if not user.is_active:
        raise HTTPException(401, "Conta desativada")
    if not verify_password(payload.password, user.user_password):
        with SessionLocal.begin() as audit_db:
            record(audit_db, user.user_id, "reauth.failed", "user", user.user_id, "Falha na confirmação de identidade")
        raise HTTPException(403, "Senha atual inválida")
    if require_otp or user.mfa_enabled:
        verify_mfa(db, user, payload.otp)


@router.post("/mfa/setup")
def setup(payload: Reauthenticate, db: Session = Depends(get_db, scope="function"),
          user=Depends(get_current_user)):
    proof(db, user, payload)
    db.refresh(user, with_for_update=True)
    if user.mfa_enabled:
        raise HTTPException(409, "MFA já ativo; recuperação exige o procedimento auditado")
    secret = generate_secret()
    user.mfa_pending = cipher().encrypt(secret.encode()).decode()
    user.mfa_pending_until = int(time.time()) + 600
    record(db, user.user_id, "mfa.setup", "user", user.user_id, "Início do cadastro do autenticador")
    return {"secret": secret, "uri": provisioning(secret, user.email)}


@router.post("/mfa/confirm")
def confirm(payload: Reauthenticate, db: Session = Depends(get_db, scope="function"),
            user=Depends(get_current_user)):
    proof(db, user, payload)
    db.refresh(user, with_for_update=True)
    if user.mfa_enabled or not user.mfa_pending or user.mfa_pending_until < int(time.time()):
        raise HTTPException(409, "Inicie uma nova configuração de MFA")
    pending = user.mfa_pending
    verify_mfa(db, user, payload.otp, encrypted=pending)
    user.mfa_secret, user.mfa_pending, user.mfa_pending_until = pending, None, 0
    db.execute(delete(models.AuthSession).where(models.AuthSession.user_id == user.user_id))
    record(db, user.user_id, "mfa.enabled", "user", user.user_id, "Autenticador confirmado; sessões revogadas")
    return {"detail": "MFA ativado. Entre novamente com o próximo código do autenticador."}


@router.post("/reauthenticate")
def reauthenticate(payload: Reauthenticate, request: Request,
                   db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    proof(db, user, payload, require_otp=user.role == "admin")
    session = session_from_request(request, db)
    if not session:
        raise HTTPException(401, "Sessão expirada")
    session.admin_verified_until = int(time.time()) + 600
    record(db, user.user_id, "reauth.success", "user", user.user_id, "Identidade confirmada por dez minutos")
    return {"verified_until": session.admin_verified_until}


@router.post("/password")
def password(payload: Credentials, db: Session = Depends(get_db, scope="function"),
             user=Depends(get_current_user)):
    proof(db, user, payload)
    try:
        password_bytes(payload.new_password)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc
    db.refresh(user, with_for_update=True)
    user.user_password = hash_password(payload.new_password)
    db.execute(delete(models.AuthSession).where(models.AuthSession.user_id == user.user_id))
    record(db, user.user_id, "password.changed", "user", user.user_id, "Senha alterada; todas as sessões revogadas")
    return {"detail": "Senha alterada. Entre novamente."}
