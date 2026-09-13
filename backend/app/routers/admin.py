import time
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, delete, func, text, or_
from sqlalchemy.orm import Session, selectinload
from .. import models, schemas
from ..audit import record
from ..database import get_db
from ..deps import get_current_user, session_from_request
from ..engagement_schemas import AdminUserUpdate, ModeratePost

router = APIRouter(prefix="/admin", tags=["administration"])


def require_admin(request: Request, db: Session = Depends(get_db, scope="function"), user=Depends(get_current_user)):
    if user.role != "admin" or not user.mfa_enabled:
        raise HTTPException(403, "Acesso exclusivo de administradores com MFA")
    session = session_from_request(request, db)
    if session is None or session.admin_verified_until <= int(time.time()):
        raise HTTPException(403, "Confirme sua senha e um novo código do autenticador para acessar o painel")
    return user


@router.get("/users")
def users(q: str = Query("", max_length=100), skip: int = Query(0, ge=0, le=10000),
          limit: int = Query(20, ge=1, le=100), db: Session = Depends(get_db, scope="function"),
          admin=Depends(require_admin)):
    term = "%" + q.replace("%", "\\%").replace("_", "\\_") + "%"
    condition = or_(models.User.username.ilike(term), models.User.email.ilike(term))
    rows = db.scalars(select(models.User).where(condition).order_by(models.User.user_id).offset(skip).limit(limit))
    record(db, admin.user_id, "admin.users.view", "users", None, "Consulta de gestão de usuários")
    return {"items": [schemas.UserRead.model_validate(u) for u in rows],
            "total": db.scalar(select(func.count()).select_from(models.User).where(condition))}


@router.patch("/users/{user_id}")
def update_user(user_id: int, payload: AdminUserUpdate, request: Request,
                db: Session = Depends(get_db, scope="function"), admin=Depends(require_admin)):
    # Um lock global serializa alterações de papéis e evita desativação concorrente do último admin.
    db.execute(text("SELECT pg_advisory_xact_lock(724001)"))
    db.refresh(admin, with_for_update=True)
    require_admin(request, db, admin)
    target = db.scalar(select(models.User).where(models.User.user_id == user_id).with_for_update())
    if target is None:
        raise HTTPException(404, "Usuário não encontrado")
    if target.user_id == admin.user_id and (not payload.is_active or payload.role != "admin"):
        raise HTTPException(409, "Você não pode desativar ou rebaixar sua própria conta")
    if payload.role == "admin" and not target.mfa_enabled:
        raise HTTPException(409, "O usuário precisa configurar MFA antes de se tornar administrador")
    if target.role == "admin" and target.is_active and (not payload.is_active or payload.role != "admin"):
        count = db.scalar(select(func.count()).select_from(models.User).where(models.User.role == "admin", models.User.is_active))
        if count <= 1:
            raise HTTPException(409, "Mantenha pelo menos um administrador ativo")
    previous = {"role": target.role, "is_active": target.is_active}
    target.role, target.is_active = payload.role, payload.is_active
    db.execute(delete(models.AuthSession).where(models.AuthSession.user_id == target.user_id))
    record(db, admin.user_id, "admin.user.update", "user", user_id, payload.reason,
           before=previous, after={"role": payload.role, "is_active": payload.is_active})
    return schemas.UserRead.model_validate(target)


@router.get("/posts")
def posts(skip: int = Query(0, ge=0, le=10000), limit: int = Query(20, ge=1, le=100),
          db: Session = Depends(get_db, scope="function"), admin=Depends(require_admin)):
    rows = db.scalars(select(models.Post).options(selectinload(models.Post.author), selectinload(models.Post.project))
                      .order_by(models.Post.post_id.desc()).offset(skip).limit(limit))
    record(db, admin.user_id, "admin.posts.view", "posts", None, "Consulta restrita para moderação")
    return {"items": [{**schemas.PostRead.model_validate(p).model_dump(), "is_hidden": p.is_hidden} for p in rows],
            "total": db.scalar(select(func.count()).select_from(models.Post))}


@router.patch("/posts/{post_id}")
def moderate(post_id: int, payload: ModeratePost, request: Request,
             db: Session = Depends(get_db, scope="function"), admin=Depends(require_admin)):
    db.execute(text("SELECT pg_advisory_xact_lock(724001)"))
    db.refresh(admin, with_for_update=True)
    require_admin(request, db, admin)
    post = db.scalar(select(models.Post).where(models.Post.post_id == post_id).with_for_update())
    if not post:
        raise HTTPException(404, "Publicação não encontrada")
    previous = post.is_hidden
    post.is_hidden = payload.is_hidden
    record(db, admin.user_id, "admin.post.moderate", "post", post_id, payload.reason,
           before={"is_hidden": previous}, after={"is_hidden": payload.is_hidden})
    return {"post_id": post_id, "is_hidden": post.is_hidden}


@router.get("/audit")
def audit(before: int | None = Query(None, ge=1), limit: int = Query(50, ge=1, le=100),
          db: Session = Depends(get_db, scope="function"), admin=Depends(require_admin)):
    stmt = select(models.AuditLog).order_by(models.AuditLog.audit_id.desc()).limit(limit)
    if before: stmt = stmt.where(models.AuditLog.audit_id < before)
    return [{key: getattr(row, key) for key in ("audit_id", "actor_id", "action", "target_type", "target_id", "reason", "details", "created_at")}
            for row in db.scalars(stmt)]
