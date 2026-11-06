"""Baralho de projetos do evento: API pública e anônima (sem login) que grava tudo."""
import hashlib
import hmac
import json
import re
from typing import Literal

from fastapi import APIRouter, Depends, Query, Request
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, case, func, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.orm import Session, selectinload

from .. import models
from ..config import settings
from ..database import get_db
from ..deps import get_current_user_optional
from ..limits import client_ip, consume

router = APIRouter(prefix="/discover", tags=["discover"])

UUID = r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$"
EVENT_TYPES = Literal[
    "session_start", "deck_loaded", "tutorial_dismiss", "card_view", "like", "dislike", "drag_cancel", "undo",
    "details_open", "details_close", "project_link_click", "deck_end", "ranking_view", "signup_click",
    "page_hidden", "page_visible", "error",
]
PUBLIC_PROJECT = and_(models.Project.visibility.is_(True), models.Project.status != "rascunho")


class Device(BaseModel):
    model_config = ConfigDict(extra="ignore")
    language: str | None = Field(None, max_length=16)
    viewport_w: int | None = Field(None, ge=0, le=20000)
    viewport_h: int | None = Field(None, ge=0, le=20000)
    touch: bool | None = None
    referrer: str | None = Field(None, max_length=200)
    source: str | None = Field(None, max_length=40)


class EventIn(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(pattern=UUID)
    type: EVENT_TYPES
    project_id: int | None = Field(None, ge=1, le=2_147_483_647)
    method: Literal["swipe", "button", "keyboard", "details", "tap", "scroll"] | None = None
    position: int | None = Field(None, ge=0, le=100_000)
    dwell_ms: int | None = Field(None, ge=0, le=86_400_000)
    value: int | None = Field(None, ge=-1_000_000, le=2_000_000_000)
    meta: dict | None = None
    ts: int | None = Field(None, ge=0, le=9_999_999_999_999)


class Batch(BaseModel):
    model_config = ConfigDict(extra="ignore")
    session_id: str = Field(pattern=UUID)
    device: Device | None = None
    events: list[EventIn] = Field(default_factory=list, max_length=100)


def parse_user_agent(agent: str) -> tuple[str, str, str]:
    u = agent.lower()
    if "ipad" in u or "tablet" in u or ("android" in u and "mobile" not in u):
        device = "tablet"
    elif "mobi" in u or "iphone" in u or "android" in u:
        device = "mobile"
    else:
        device = "desktop"
    if "iphone" in u or "ipad" in u or "ipod" in u:
        system = "iOS"
    elif "android" in u:
        system = "Android"
    elif "windows" in u:
        system = "Windows"
    elif "mac os" in u or "macintosh" in u:
        system = "macOS"
    elif "cros" in u:
        system = "ChromeOS"
    elif "linux" in u:
        system = "Linux"
    else:
        system = "Outro"
    if any(k in u for k in ("instagram", "fban", "fbav", "whatsapp", "line/", "tiktok")):
        browser = "App embutido"
    elif "edg/" in u or "edga/" in u or "edgios" in u:
        browser = "Edge"
    elif "opr/" in u or "opera" in u:
        browser = "Opera"
    elif "samsungbrowser" in u:
        browser = "Samsung"
    elif "firefox" in u or "fxios" in u:
        browser = "Firefox"
    elif "chrome" in u or "crios" in u:
        browser = "Chrome"
    elif "safari" in u:
        browser = "Safari"
    else:
        browser = "Outro"
    return device, system, browser


def clean_source(value: str | None) -> str | None:
    value = (value or "").strip()
    return value if re.fullmatch(r"[A-Za-z0-9_.-]{1,40}", value) else None


def clean_meta(meta: dict | None) -> dict | None:
    if not meta:
        return None
    text = json.dumps(meta, ensure_ascii=False, default=str)
    return meta if len(text) <= 600 else {"truncated": True}


def hash_ip(ip: str) -> str:
    return hmac.new(settings.secret_key.encode(), ("discover-ip:" + ip).encode(), hashlib.sha256).hexdigest()


@router.post("/events")
def ingest(batch: Batch, request: Request, db: Session = Depends(get_db, scope="function"),
           user: models.User | None = Depends(get_current_user_optional)):
    ip = client_ip(request)
    # Limites próprios: a rede do evento compartilha IP; por aparelho o limite é bem mais baixo que o do IP.
    consume("discover-ip:" + ip, 6000, 60)
    consume("discover-session:" + batch.session_id, 240, 60)

    agent = request.headers.get("user-agent", "")[:300]
    device_type, system, browser = parse_user_agent(agent)
    info = batch.device or Device()
    insert = pg_insert(models.DiscoverSession).values(
        session_id=batch.session_id, source=clean_source(info.source), user_id=user.user_id if user else None,
        user_agent=agent, device_type=device_type, os=system, browser=browser, language=info.language,
        viewport_w=info.viewport_w, viewport_h=info.viewport_h, touch=info.touch,
        referrer=info.referrer, ip_hash=hash_ip(ip), visits=0)
    existing = models.DiscoverSession
    db.execute(insert.on_conflict_do_update(index_elements=["session_id"], set_={
        "last_seen_at": func.now(),
        "source": func.coalesce(existing.source, insert.excluded.source),
        "user_id": func.coalesce(insert.excluded.user_id, existing.user_id),
        "language": func.coalesce(insert.excluded.language, existing.language),
        "viewport_w": func.coalesce(insert.excluded.viewport_w, existing.viewport_w),
        "viewport_h": func.coalesce(insert.excluded.viewport_h, existing.viewport_h),
        "touch": func.coalesce(insert.excluded.touch, existing.touch),
        "referrer": func.coalesce(existing.referrer, insert.excluded.referrer),
    }))
    if not batch.events:
        return {"accepted": 0, "duplicates": 0, "rejected": 0}

    wanted = {e.project_id for e in batch.events if e.project_id}
    known = set(db.scalars(select(models.Project.project_id).where(models.Project.project_id.in_(wanted)))) if wanted else set()
    rows = []
    for e in batch.events:
        meta = clean_meta(e.meta)
        project_id = e.project_id if e.project_id in known else None
        if e.project_id and project_id is None:
            meta = {**(meta or {}), "unknown_project": e.project_id}
        rows.append(dict(session_id=batch.session_id, client_event_id=e.id, event_type=e.type, project_id=project_id,
                         method=e.method, position=e.position, dwell_ms=e.dwell_ms, value=e.value, meta=meta, client_ts=e.ts))
    stmt = pg_insert(models.DiscoverEvent).values(rows).on_conflict_do_nothing(constraint="discover_event_client")
    inserted = set(db.scalars(stmt.returning(models.DiscoverEvent.client_event_id)))
    # Visitas contam só eventos novos: reenviar o mesmo lote não infla o número.
    starts = sum(1 for e in batch.events if e.type == "session_start" and e.id in inserted)
    if starts:
        db.execute(update(models.DiscoverSession).where(models.DiscoverSession.session_id == batch.session_id)
                   .values(visits=models.DiscoverSession.visits + starts))

    # Votos atuais: só eventos novos contam (reenvios não duplicam), na ordem em que aconteceram.
    current = {v.project_id: v for v in db.scalars(select(models.DiscoverVote).where(
        models.DiscoverVote.session_id == batch.session_id, models.DiscoverVote.project_id.in_(known)))} if known else {}
    rejected = 0
    for e in batch.events:
        if e.id not in inserted or e.type not in ("like", "dislike", "undo"):
            continue
        if e.project_id not in known:
            rejected += 1
            continue
        vote = current.get(e.project_id)
        if e.type == "undo":
            if vote is not None:
                db.delete(vote)
                current.pop(e.project_id)
        elif vote is None:
            vote = models.DiscoverVote(session_id=batch.session_id, project_id=e.project_id, vote=e.type, changes=0)
            db.add(vote)
            current[e.project_id] = vote
        elif vote.vote != e.type:
            vote.vote = e.type
            vote.changes += 1
            vote.updated_at = func.now()
    return {"accepted": len(inserted), "duplicates": len(batch.events) - len(inserted), "rejected": rejected}


def _card(project: models.Project, my_vote: str | None) -> dict:
    owner = project.owner
    owner_name = project.responsible_names
    if not owner_name and owner:
        owner_name = " ".join(filter(None, [owner.first_name, owner.last_name])) or owner.username
    return {
        "project_id": project.project_id,
        "name": project.name,
        "description": project.description or "",
        "cover_url": project.cover_url,
        "logo_url": project.logo_url,
        "category": project.category.description if project.category else None,
        "keywords": [k.word for k in project.keywords][:8],
        "owner_name": owner_name,
        "status": project.status,
        "accepts_support": bool(project.funding_url),
        "my_vote": my_vote,
    }


@router.get("/deck")
def deck(session_id: str = Query(pattern=UUID), db: Session = Depends(get_db, scope="function")):
    projects = list(db.scalars(select(models.Project).options(
        selectinload(models.Project.category), selectinload(models.Project.owner), selectinload(models.Project.keywords),
    ).where(PUBLIC_PROJECT)))
    # Ordem embaralhada e estável por pessoa: projetos novos não mudam a ordem dos que já foram vistos.
    projects.sort(key=lambda p: hashlib.sha1(f"{session_id}:{p.project_id}".encode()).hexdigest())
    votes = {v.project_id: v.vote for v in db.scalars(select(models.DiscoverVote).where(models.DiscoverVote.session_id == session_id))}
    cards = [_card(p, votes.get(p.project_id)) for p in projects]
    return {"cards": cards, "total": len(cards), "voted": sum(1 for c in cards if c["my_vote"])}


@router.get("/ranking")
def ranking(limit: int = Query(10, ge=1, le=50), db: Session = Depends(get_db, scope="function")):
    likes = func.count(models.DiscoverVote.session_id).filter(models.DiscoverVote.vote == "like")
    total = func.count(models.DiscoverVote.session_id)
    rows = db.execute(
        select(models.Project.project_id, models.Project.name, models.Project.cover_url, models.Category.description,
               likes.label("likes"), total.label("total"))
        .select_from(models.Project).join(models.DiscoverVote, models.DiscoverVote.project_id == models.Project.project_id)
        .outerjoin(models.Category, models.Category.id == models.Project.category_id)
        .where(PUBLIC_PROJECT).group_by(models.Project.project_id, models.Category.description)
        .order_by(likes.desc(), (likes * 1.0 / case((total == 0, 1), else_=total)).desc(), models.Project.name).limit(limit)).all()
    people = db.scalar(select(func.count(func.distinct(models.DiscoverVote.session_id)))) or 0
    return {"people": people, "items": [
        {"project_id": r[0], "name": r[1], "cover_url": r[2], "category": r[3], "likes": r[4], "dislikes": r[5] - r[4],
         "approval": round(r[4] / r[5], 3) if r[5] else 0} for r in rows]}
