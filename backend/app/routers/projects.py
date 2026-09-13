from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..access import require_project
from ..media import bind_media

router = APIRouter(prefix="/projects", tags=["projects"])


def _annotate(project: models.Project, user: models.User | None, db: Session) -> models.Project:
    """Marca liked_by_me de acordo com o usuário atual (se houver)."""
    project.liked_by_me = bool(
        user is not None and crud.get_like(db, project.project_id, user.user_id) is not None
    )
    return project


def _require_owner(project: models.Project, user: models.User) -> None:
    if project.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Você só pode alterar seus próprios projetos")


@router.get("", response_model=list[schemas.ProjectRead])
def list_projects(
    skip: int = Query(0, ge=0, le=10000),
    limit: int = Query(100, ge=1, le=100),
    q: str = Query("", max_length=100),
    category_id: int | None = Query(None, ge=1),
    public_only: bool = False,
    owner_id: int | None = Query(None, ge=1),
    db: Session = Depends(get_db, scope="function"),
    user: models.User | None = Depends(get_current_user_optional),
):
    _validate_search(q)
    return [_annotate(p, user, db) for p in crud.list_projects(
        db, skip=skip, limit=limit, user=user, q=q, category_id=category_id,
        public_only=public_only, owner_id=owner_id)]


def _validate_search(q):
    if len(q.strip()) == 1:
        raise HTTPException(422, "Digite pelo menos 2 caracteres para buscar")


@router.get("/search", response_model=schemas.ProjectPage)
def search_projects(skip: int = Query(0, ge=0, le=10000), limit: int = Query(12, ge=1, le=100),
                    q: str = Query("", max_length=100), category_id: int | None = Query(None, ge=1),
                    public_only: bool = False, owner_id: int | None = Query(None, ge=1),
                    db: Session = Depends(get_db, scope="function"),
                    user: models.User | None = Depends(get_current_user_optional)):
    _validate_search(q)
    filters = dict(user=user, q=q, category_id=category_id, public_only=public_only, owner_id=owner_id)
    return schemas.ProjectPage(
        items=[_annotate(p, user, db) for p in crud.list_projects(db, skip=skip, limit=limit, **filters)],
        total=crud.count_projects(db, **filters), skip=skip, limit=limit)


@router.post("", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    if payload.category_id is not None and crud.get_category(db, payload.category_id) is None:
        raise HTTPException(status_code=400, detail="Categoria não encontrada")
    project = crud.create_project(db, payload, owner_id=user.user_id)
    bind_media(db, user, "project", project.project_id, [project.cover_url, project.logo_url])
    return _annotate(project, user, db)


@router.get("/{project_id}", response_model=schemas.ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User | None = Depends(get_current_user_optional),
):
    project = require_project(db, project_id, user)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _annotate(project, user, db)


@router.patch("/{project_id}", response_model=schemas.ProjectRead)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    project = require_project(db, project_id, user)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    _require_owner(project, user)
    if payload.category_id is not None and crud.get_category(db, payload.category_id) is None:
        raise HTTPException(status_code=400, detail="Categoria não encontrada")
    project = crud.update_project(db, project, payload)
    bind_media(db, user, "project", project.project_id, [project.cover_url, project.logo_url])
    return _annotate(project, user, db)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    project = require_project(db, project_id, user)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    _require_owner(project, user)
    crud.delete_project(db, project)


# --- Likes ---


@router.post("/{project_id}/like", response_model=schemas.LikeStatus)
def like_project(
    project_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    if require_project(db, project_id, user) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    crud.add_like(db, project_id, user.user_id)
    return schemas.LikeStatus(liked=True, likes_count=crud.count_likes(db, project_id))


@router.delete("/{project_id}/like", response_model=schemas.LikeStatus)
def unlike_project(
    project_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    if require_project(db, project_id, user) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    crud.remove_like(db, project_id, user.user_id)
    return schemas.LikeStatus(liked=False, likes_count=crud.count_likes(db, project_id))


# --- Comentários ---


@router.get("/{project_id}/comments", response_model=list[schemas.CommentRead])
def list_comments(project_id: int, db: Session = Depends(get_db, scope="function"),
                  user: models.User | None = Depends(get_current_user_optional),
                  skip: int = Query(0, ge=0, le=10000), limit: int = Query(100, ge=1, le=100)):
    if require_project(db, project_id, user) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return crud.list_comments(db, project_id, skip=skip, limit=limit)


@router.post(
    "/{project_id}/comments",
    response_model=schemas.CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    project_id: int,
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    project = require_project(db, project_id, user)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return crud.create_comment(db, project_id, user.user_id, payload.content)


@router.delete(
    "/{project_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    project_id: int,
    comment_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    comment = crud.get_comment(db, comment_id)
    if comment is None or comment.project_id != project_id:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    project = require_project(db, project_id, user)
    is_owner = project is not None and project.owner_id == user.user_id
    if comment.user_id != user.user_id and not is_owner:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir este comentário")
    crud.delete_comment(db, comment)
