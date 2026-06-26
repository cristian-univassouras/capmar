import datetime as dt

import bcrypt
import jwt

from .config import settings

ALGORITHM = "HS256"
# bcrypt aceita no máximo 72 bytes na senha.
_MAX_PW_BYTES = 72


def hash_password(password: str) -> str:
    pw = password.encode("utf-8")[:_MAX_PW_BYTES]
    return bcrypt.hashpw(pw, bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    pw = password.encode("utf-8")[:_MAX_PW_BYTES]
    return bcrypt.checkpw(pw, hashed.encode("utf-8"))


def create_access_token(subject: str | int) -> str:
    expire = dt.datetime.now(dt.timezone.utc) + dt.timedelta(
        minutes=settings.access_token_expire_minutes
    )
    payload = {"sub": str(subject), "exp": expire}
    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)
