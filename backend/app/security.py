import datetime as dt
import secrets
import time

import bcrypt
import jwt
from sqlalchemy import delete, select

from .config import settings

ALGORITHM = "HS256"


def password_bytes(password: str) -> bytes:
    encoded = password.encode("utf-8")
    if len(encoded) > 72:
        raise ValueError("Senha deve ter no máximo 72 bytes UTF-8; ela não será truncada")
    return encoded


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password_bytes(password), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password_bytes(password), hashed.encode())
    except (ValueError, TypeError):
        return False


def create_access_token(subject: str | int, session_id: str) -> str:
    now = dt.datetime.now(dt.timezone.utc)
    return jwt.encode({"sub": str(subject), "jti": session_id, "iat": now,
                       "exp": now + dt.timedelta(minutes=settings.access_token_expire_minutes)},
                      settings.secret_key, algorithm=ALGORITHM)


def new_session(db, user_id: int, admin_verified=False) -> str:
    from .models import AuthSession, User

    # Serializa criação de sessões inclusive entre workers.
    db.execute(select(User.user_id).where(User.user_id == user_id).with_for_update())
    existing = list(db.scalars(select(AuthSession).where(AuthSession.user_id == user_id)
                              .order_by(AuthSession.expires_at.desc())))
    for session in existing[9:]:
        db.delete(session)
    db.execute(delete(AuthSession).where(AuthSession.user_id == user_id, AuthSession.expires_at <= int(time.time())))
    session_id = secrets.token_hex(32)
    db.add(AuthSession(session_id=session_id, user_id=user_id,
                       expires_at=int(time.time()) + settings.access_token_expire_minutes * 60,
                       admin_verified_until=int(time.time()) + 600 if admin_verified else 0))
    db.flush()
    return create_access_token(user_id, session_id)
