from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import select

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user
from ..media import bind_media

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[schemas.PublicUser])
def list_users(db: Session = Depends(get_db, scope="function"),
               q: str = Query("", max_length=100), skip: int = Query(0, ge=0, le=10000), limit: int = Query(100, ge=1, le=100)):
    term = "%" + q.replace("%", "\\%").replace("_", "\\_") + "%"
    return list(db.scalars(select(models.User).where(models.User.is_active, models.User.username.ilike(term)).order_by(models.User.user_id).offset(skip).limit(limit)))


@router.get("/{user_id}", response_model=schemas.PublicUser)
def get_user(user_id: int, db: Session = Depends(get_db, scope="function")):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.patch("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db, scope="function"),
    current: models.User = Depends(get_current_user),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if current.user_id != user_id:
        raise HTTPException(status_code=403, detail="Você só pode editar o seu próprio perfil")

    if current.role == "admin" and payload.email is not None and payload.email != current.email:
        raise HTTPException(403, "Alteração do e-mail administrativo exige procedimento de recuperação auditado")

    if payload.email is not None and payload.email != user.email:
        existing = crud.get_user_by_email(db, payload.email)
        if existing is not None and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    if payload.username is not None and payload.username != user.username:
        existing = crud.get_user_by_username(db, payload.username)
        if existing is not None and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="Nome de usuário já em uso")

    user = crud.update_user(db, user, payload)
    bind_media(db, current, "user", user.user_id, [user.avatar_url])
    return user
