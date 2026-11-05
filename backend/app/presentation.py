"""Tipos de apresentação; somente URLs locais de mídia ou provedores explícitos."""
import re
from typing import Literal
from urllib.parse import urlsplit, parse_qs

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator
from .engagement_schemas import validate_funding_url

MEDIA = re.compile(r"^/uploads/[0-9a-f]{32}$")


def video_url(value):
    parsed = urlsplit(value)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.port not in (None, 443):
        raise ValueError("Use um vídeo HTTPS do YouTube ou Vimeo")
    host = parsed.hostname
    ident = None
    if host in ("www.youtube.com", "youtube.com", "www.youtube-nocookie.com"):
        if parsed.path == "/watch":
            ident = parse_qs(parsed.query).get("v", [None])[0]
        elif parsed.path.startswith(("/embed/", "/shorts/")):
            ident = parsed.path.split("/")[-1]
    elif host == "youtu.be":
        ident = parsed.path.lstrip("/")
    if ident and re.fullmatch(r"[A-Za-z0-9_-]{11}", ident):
        return "https://www.youtube-nocookie.com/embed/" + ident
    if host in ("vimeo.com", "www.vimeo.com", "player.vimeo.com"):
        parts = parsed.path.strip("/").split("/")
        if host == "player.vimeo.com" and parts[0] == "video":
            parts = parts[1:]
        ident = parts[0]
        privacy = parse_qs(parsed.query).get("h", [None])[0]
        if len(parts) == 2:
            privacy = parts[1]
        if len(parts) <= 2 and re.fullmatch(r"[0-9]{1,12}", ident):
            if privacy and not re.fullmatch(r"[A-Za-z0-9]{6,64}", privacy):
                raise ValueError("Link privado do Vimeo inválido")
            return "https://player.vimeo.com/video/" + ident + ("?h=" + privacy if privacy else "")
    raise ValueError("Use um link válido de vídeo do YouTube ou Vimeo")


class PortfolioItem(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    kind: Literal["image", "pdf", "video"]
    title: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=500)
    url: str = Field(max_length=2048)

    @model_validator(mode="after")
    def validate_source(self):
        if self.kind == "video":
            self.url = video_url(self.url)
        elif not MEDIA.fullmatch(self.url):
            raise ValueError("Envie imagens e PDFs pelo formulário de portfólio")
        return self


class Partner(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    name: str = Field(min_length=1, max_length=100)
    description: str = Field(default="", max_length=300)
    url: str | None = Field(default=None, max_length=2048)
    _url = field_validator("url")(validate_funding_url)


def project_media(project):
    return [project.cover_url, project.logo_url] + [item["url"] for item in project.portfolio if item["kind"] != "video"]
