from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional

router = APIRouter(prefix="/projects", tags=["projects"])


def _annotate(project: models.Project, user: models.User | None) -> models.Project:
    """Marca liked_by_me de acordo com o usuário atual (se houver)."""
    project.liked_by_me = bool(
        user is not None and any(like.user_id == user.user_id for like in project.likes)
    )
    return project


def _require_owner(project: models.Project, user: models.User) -> None:
    if project.owner_id != user.user_id:
        raise HTTPException(status_code=403, detail="Você só pode alterar seus próprios projetos")


@router.get("", response_model=list[schemas.ProjectRead])
def list_projects(
    skip: int = 0,
    limit: int = 100,
    q: str | None = None,
    category_id: int | None = None,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    """Lista projetos (US-007/US-008).

    `q` busca no nome, na descrição e nas palavras-chave; `category_id` restringe
    à categoria. Ambos são opcionais e combináveis. O `response_model` não muda,
    de modo que quem já consome a rota sem filtro continua valendo.
    """
    projects = crud.list_projects(
        db, skip=skip, limit=limit, q=q, category_id=category_id
    )
    return [_annotate(p, user) for p in projects]


@router.post("", response_model=schemas.ProjectRead, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: schemas.ProjectCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if payload.category_id is not None and crud.get_category(db, payload.category_id) is None:
        raise HTTPException(status_code=400, detail="Categoria não encontrada")
    return _annotate(crud.create_project(db, payload, owner_id=user.user_id), user)


@router.get("/{project_id}", response_model=schemas.ProjectRead)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User | None = Depends(get_current_user_optional),
):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return _annotate(project, user)


@router.patch("/{project_id}", response_model=schemas.ProjectRead)
def update_project(
    project_id: int,
    payload: schemas.ProjectUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    _require_owner(project, user)
    if payload.category_id is not None and crud.get_category(db, payload.category_id) is None:
        raise HTTPException(status_code=400, detail="Categoria não encontrada")
    return _annotate(crud.update_project(db, project, payload), user)


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    _require_owner(project, user)
    crud.delete_project(db, project)


# --- Likes ---


@router.post("/{project_id}/like", response_model=schemas.LikeStatus)
def like_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if crud.get_project(db, project_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    crud.add_like(db, project_id, user.user_id)
    return schemas.LikeStatus(liked=True, likes_count=crud.count_likes(db, project_id))


@router.delete("/{project_id}/like", response_model=schemas.LikeStatus)
def unlike_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    if crud.get_project(db, project_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    crud.remove_like(db, project_id, user.user_id)
    return schemas.LikeStatus(liked=False, likes_count=crud.count_likes(db, project_id))


# --- Comentários ---


@router.get("/{project_id}/comments", response_model=list[schemas.CommentRead])
def list_comments(project_id: int, db: Session = Depends(get_db)):
    if crud.get_project(db, project_id) is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return crud.list_comments(db, project_id)


@router.post(
    "/{project_id}/comments",
    response_model=schemas.CommentRead,
    status_code=status.HTTP_201_CREATED,
)
def create_comment(
    project_id: int,
    payload: schemas.CommentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    project = crud.get_project(db, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Projeto não encontrado")
    return crud.create_comment(db, project_id, user.user_id, payload.content)


@router.delete(
    "/{project_id}/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT
)
def delete_comment(
    project_id: int,
    comment_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    comment = crud.get_comment(db, comment_id)
    if comment is None or comment.project_id != project_id:
        raise HTTPException(status_code=404, detail="Comentário não encontrado")
    project = crud.get_project(db, project_id)
    is_owner = project is not None and project.owner_id == user.user_id
    if comment.user_id != user.user_id and not is_owner:
        raise HTTPException(status_code=403, detail="Sem permissão para excluir este comentário")
    crud.delete_comment(db, comment)
