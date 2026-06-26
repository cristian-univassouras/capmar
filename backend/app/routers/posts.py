from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[schemas.PostRead])
def list_posts(user_id: int | None = None, db: Session = Depends(get_db)):
    return crud.list_posts(db, user_id=user_id)


@router.post("", response_model=schemas.PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: schemas.PostCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.project_id is not None and crud.get_project(db, payload.project_id) is None:
        raise HTTPException(status_code=400, detail="Projeto não encontrado")
    return crud.create_post(db, payload, user_id=user.user_id)


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    post = crud.get_post(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    if post.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Você só pode excluir suas publicações")
    crud.delete_post(db, post)
