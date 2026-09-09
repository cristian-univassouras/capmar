from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[schemas.UserRead])
def list_users(db: Session = Depends(get_db)):
    return crud.list_users(db)


@router.get("/{user_id}", response_model=schemas.UserRead)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return user


@router.patch("/{user_id}", response_model=schemas.UserRead)
def update_user(
    user_id: int,
    payload: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current: models.User = Depends(get_current_user),
):
    user = crud.get_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    if current.user_id != user_id:
        raise HTTPException(status_code=403, detail="Você só pode editar o seu próprio perfil")

    if payload.email is not None and payload.email != user.email:
        existing = crud.get_user_by_email(db, payload.email)
        if existing is not None and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="E-mail já cadastrado")

    if payload.username is not None and payload.username != user.username:
        existing = crud.get_user_by_username(db, payload.username)
        if existing is not None and existing.user_id != user_id:
            raise HTTPException(status_code=400, detail="Nome de usuário já em uso")

    return crud.update_user(db, user, payload)
