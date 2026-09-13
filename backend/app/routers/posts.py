from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..access import require_project, require_project_writer
from ..media import bind_media

router = APIRouter(prefix="/posts", tags=["posts"])


@router.get("", response_model=list[schemas.PostRead])
def list_posts(user_id: int | None = None, db: Session = Depends(get_db, scope="function"),
               user: models.User | None = Depends(get_current_user_optional),
               skip: int = Query(0, ge=0, le=10000), limit: int = Query(100, ge=1, le=100)):
    return crud.list_posts(db, user_id=user_id, user=user, skip=skip, limit=limit)


@router.post("", response_model=schemas.PostRead, status_code=status.HTTP_201_CREATED)
def create_post(
    payload: schemas.PostCreate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    if payload.project_id is not None:
        require_project_writer(db, payload.project_id, user)
    post = crud.create_post(db, payload, user_id=user.user_id)
    bind_media(db, user, "post", post.post_id, [post.image_url])
    return post


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    post = crud.get_post(db, post_id)
    if post is None:
        raise HTTPException(status_code=404, detail="Publicação não encontrada")
    if post.project_id is not None:
        require_project(db, post.project_id, user)
    if post.user_id != user.user_id:
        raise HTTPException(status_code=403, detail="Você só pode excluir suas publicações")
    crud.delete_post(db, post)
