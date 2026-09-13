"""TOTP RFC 6238; segredo cifrado e rejeição de códigos já usados."""
import base64
import hashlib
import hmac
import secrets
import struct
import time
from urllib.parse import quote

from cryptography.fernet import Fernet
from fastapi import HTTPException
from sqlalchemy import select

from .config import settings
from .models import User


def cipher():
    # Separação de domínio; rotação de SECRET_KEY requer recifrar os segredos MFA.
    key = hmac.new(settings.secret_key.encode(), b"capmar-mfa-encryption-v1", hashlib.sha256).digest()
    return Fernet(base64.urlsafe_b64encode(key))


def generate_secret():
    return base64.b32encode(secrets.token_bytes(20)).decode()


def totp(secret, step=None):
    step = int(time.time()) // 30 if step is None else step
    digest = hmac.new(base64.b32decode(secret), struct.pack(">Q", step), hashlib.sha1).digest()
    offset = digest[-1] & 15
    return str((struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7fffffff) % 1000000).zfill(6)


def verify_mfa(db, user, code, encrypted=None):
    locked = db.scalar(select(User).where(User.user_id == user.user_id).with_for_update()
                       .execution_options(populate_existing=True))
    token = encrypted or locked.mfa_secret
    if not token or not code:
        raise HTTPException(403, "Informe um código válido do autenticador")
    secret = cipher().decrypt(token.encode()).decode()
    now = int(time.time()) // 30
    for step in (now, now - 1, now + 1):
        if step > locked.mfa_last_step and hmac.compare_digest(totp(secret, step), code):
            locked.mfa_last_step = step
            db.flush()
            return
    raise HTTPException(403, "Código inválido ou já usado. Aguarde o próximo código do autenticador")


def provisioning(secret, email):
    return "otpauth://totp/" + quote("CapMar:" + email, safe="") + "?secret=" + secret + "&issuer=CapMar&digits=6&period=30"
