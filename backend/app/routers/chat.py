import asyncio
import secrets
import time
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import delete, func, select, text
from sqlalchemy.orm import Session
from starlette.concurrency import run_in_threadpool
from .. import models, schemas
from ..config import settings
from ..database import get_db, SessionLocal
from ..deps import get_current_user, session_from_request
from ..engagement_schemas import ConversationCreate, MessageCreate, MessageRead
from ..limits import consume, client_ip

router = APIRouter(prefix="/chat", tags=["chat"])


def require_participant(db, cid, uid):
    if db.get(models.ConversationParticipant, (cid, uid)) is None:
        raise HTTPException(404, "Conversa não encontrada")


def conversation_read(row):
    return {"conversation_id": row.conversation_id, "title": row.title, "created_at": row.created_at,
            "participants": [schemas.PublicUser.model_validate(u) for u in row.participants]}


@router.post("/conversations", status_code=201)
def create(payload: ConversationCreate, db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    consume(f"chat-create:{user.user_id}", 10, 3600)
    ids = sorted(set(payload.participant_ids + [user.user_id]))
    if len(ids) < 2:
        raise HTTPException(422, "Selecione ao menos outra pessoa")
    users = list(db.scalars(select(models.User).where(models.User.user_id.in_(ids), models.User.is_active)))
    if len(users) != len(ids):
        raise HTTPException(422, "Participante inexistente ou indisponível")
    conversation = models.Conversation(title=payload.title, participants=users)
    db.add(conversation)
    db.flush()
    return conversation_read(conversation)


@router.get("/conversations")
def conversations(before: int | None = Query(None, ge=1), limit: int = Query(30, ge=1, le=100),
                  db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    stmt = select(models.Conversation).where(models.Conversation.conversation_id.in_(
        select(models.ConversationParticipant.conversation_id).where(models.ConversationParticipant.user_id == user.user_id)))
    if before: stmt = stmt.where(models.Conversation.conversation_id < before)
    return [conversation_read(c) for c in db.scalars(stmt.order_by(models.Conversation.conversation_id.desc()).limit(limit))]


@router.get("/conversations/{cid}/messages", response_model=list[MessageRead])
def messages(cid: int, after: int = Query(0, ge=0, le=9223372036854775807),
             before: int | None = Query(None, ge=1, le=9223372036854775807),
             limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    require_participant(db, cid, user.user_id)
    if after and before:
        raise HTTPException(422, "Escolha apenas um cursor")
    stmt = select(models.ChatMessage).where(models.ChatMessage.conversation_id == cid)
    if after:
        return list(db.scalars(stmt.where(models.ChatMessage.message_id > after).order_by(models.ChatMessage.message_id).limit(limit)))
    if before: stmt = stmt.where(models.ChatMessage.message_id < before)
    return list(reversed(list(db.scalars(stmt.order_by(models.ChatMessage.message_id.desc()).limit(limit)))))


@router.post("/conversations/{cid}/messages", response_model=MessageRead, status_code=201)
def send(cid: int, payload: MessageCreate, db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    require_participant(db, cid, user.user_id)
    consume(f"chat-send:{user.user_id}", 30, 60)
    # Serializa IDs/commits por conversa: nenhum cursor pula uma mensagem ainda não confirmada.
    db.execute(select(models.Conversation.conversation_id).where(models.Conversation.conversation_id == cid).with_for_update())
    existing = db.scalar(select(models.ChatMessage).where(models.ChatMessage.conversation_id == cid,
                         models.ChatMessage.sender_id == user.user_id, models.ChatMessage.client_id == str(payload.client_id)))
    if existing:
        if existing.content != payload.content:
            raise HTTPException(409, "Identificador de envio já usado para outra mensagem")
        return existing
    message = models.ChatMessage(conversation_id=cid, sender_id=user.user_id, content=payload.content, client_id=str(payload.client_id))
    db.add(message)
    db.flush()
    return message


def socket_user(db, websocket, cid):
    session = session_from_request(websocket, db)
    user = db.get(models.User, session.user_id) if session else None
    if not user or not user.is_active:
        raise HTTPException(401, "Sessão inválida")
    require_participant(db, cid, user.user_id)
    return user


def open_lease(websocket, cid, lid):
    consume("chat-connect-ip:" + client_ip(websocket), 60, 60)
    with SessionLocal.begin() as db:
        user = socket_user(db, websocket, cid)
        consume(f"chat-connect:{user.user_id}", 30, 60)
        db.execute(text("SELECT pg_advisory_xact_lock(724002)"))
        db.execute(delete(models.ChatLease).where(models.ChatLease.expires_at < int(time.time())))
        count = db.scalar(select(func.count()).select_from(models.ChatLease).where(models.ChatLease.user_id == user.user_id))
        total = db.scalar(select(func.count()).select_from(models.ChatLease))
        if count >= 3 or total >= 100:
            raise HTTPException(429, "Limite de conexões atingido")
        db.add(models.ChatLease(lease_id=lid, user_id=user.user_id, expires_at=int(time.time()) + 30))


def socket_batch(websocket, cid, lid, after):
    with SessionLocal.begin() as db:
        socket_user(db, websocket, cid)  # Revogação, suspensão e permissão verificadas a cada lote.
        lease = db.get(models.ChatLease, lid)
        if lease is None:
            raise HTTPException(401, "Conexão expirada")
        lease.expires_at = int(time.time()) + 30
        rows = db.scalars(select(models.ChatMessage).where(models.ChatMessage.conversation_id == cid,
                          models.ChatMessage.message_id > after).order_by(models.ChatMessage.message_id).limit(100))
        return [MessageRead.model_validate(m).model_dump(mode="json") for m in rows]


def close_lease(lid):
    with SessionLocal.begin() as db:
        db.execute(delete(models.ChatLease).where(models.ChatLease.lease_id == lid))


@router.websocket("/ws/{cid}")
async def realtime(websocket: WebSocket, cid: int, after: int = 0):
    if (websocket.headers.get("origin") not in settings.cors_origins_list or after < 0 or after > 9223372036854775807):
        await websocket.close(code=1008)
        return
    lid = secrets.token_hex(16)
    opened = False
    try:
        await run_in_threadpool(open_lease, websocket, cid, lid)
        opened = True
        await websocket.accept()
        while True:
            batch = await run_in_threadpool(socket_batch, websocket, cid, lid, after)
            await asyncio.wait_for(websocket.send_json({"type": "messages", "items": batch}), timeout=5)
            if batch: after = batch[-1]["message_id"]
            # Transporte de saída. Escrita usa POST com CSRF, validação e idempotência.
            try:
                await asyncio.wait_for(websocket.receive_text(), timeout=0.75)
                await websocket.close(code=1008, reason="Envie mensagens pelo formulário")
                break
            except asyncio.TimeoutError:
                continue
    except WebSocketDisconnect:
        pass
    except HTTPException as exc:
        await websocket.close(code=4401 if exc.status_code == 401 else 4403 if exc.status_code == 404 else 4429)
    except Exception:
        await websocket.close(code=1011)
    finally:
        if opened:
            await run_in_threadpool(close_lease, lid)
