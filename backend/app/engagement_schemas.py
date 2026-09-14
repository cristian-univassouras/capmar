import ipaddress
from datetime import datetime
from typing import Literal
from urllib.parse import urlsplit
from uuid import UUID
from pydantic import BaseModel, ConfigDict, Field, field_validator


def validate_funding_url(value):
    if value is None or value == "":
        return None
    if any(ord(c) < 33 for c in value) or "\\" in value:
        raise ValueError("URL de apoio inválida")
    parsed = urlsplit(value)
    host = parsed.hostname
    if parsed.scheme != "https" or not host or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Use uma URL HTTPS pública, sem credenciais e sem porta alternativa")
    try:
        address = ipaddress.ip_address(host)
    except ValueError:
        if "." not in host or host.endswith((".localhost", ".local", ".internal")):
            raise ValueError("Use um endereço público para apoio")
        if any(not part or not all(c.isalnum() or c == "-" for c in part) for part in host.split(".")):
            raise ValueError("Host inválido")
    else:
        if not address.is_global:
            raise ValueError("Use um endereço público para apoio")
    return value


class Input(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class Reauthenticate(Input):
    model_config = ConfigDict(extra="forbid")
    model_config = ConfigDict(extra="forbid")
    password: str = Field(min_length=1, max_length=72)
    otp: str | None = Field(default=None, pattern=r"^\d{6}$")


class Credentials(Reauthenticate):
    new_password: str = Field(min_length=12, max_length=72)


class AdminUserUpdate(Input):
    role: Literal["user", "admin"]
    is_active: bool
    reason: str = Field(min_length=5, max_length=500)


class ModeratePost(Input):
    is_hidden: bool
    reason: str = Field(min_length=5, max_length=500)


class DirectConversationCreate(Input):
    recipient_id: int = Field(gt=0, le=2147483647)


class MessageCreate(Input):
    content: str = Field(min_length=1, max_length=2000)
    client_id: UUID


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    message_id: int
    conversation_id: int
    sender_id: int
    client_id: str
    content: str
    created_at: datetime
