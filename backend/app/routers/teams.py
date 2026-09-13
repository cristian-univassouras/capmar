from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import crud, models, schemas
from ..database import get_db
from ..deps import get_current_user, get_current_user_optional
from ..access import require_project, require_project_writer

router = APIRouter(prefix="/teams", tags=["teams"])


def _require_leader(team: models.Team, user: models.User) -> None:
    if team.leader_id != user.user_id:
        raise HTTPException(
            status_code=403, detail="Apenas o líder da equipe pode realizar esta ação"
        )


def _get_team_or_404(db: Session, team_id: int, user) -> models.Team:
    team = crud.get_team(db, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Equipe não encontrada")
    require_project(db, team.project_id, user)
    return team


@router.get("", response_model=list[schemas.TeamRead])
def list_teams(project_id: int | None = None, db: Session = Depends(get_db, scope="function"),
               user: models.User | None = Depends(get_current_user_optional),
               skip: int = Query(0, ge=0, le=10000), limit: int = Query(100, ge=1, le=100)):
    return crud.list_teams(db, project_id=project_id, user=user, skip=skip, limit=limit)


@router.post("", response_model=schemas.TeamRead, status_code=status.HTTP_201_CREATED)
def create_team(
    payload: schemas.TeamCreate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    require_project_writer(db, payload.project_id, user, owner_only=True)
    return crud.create_team(db, payload, leader_id=user.user_id)


@router.get("/{team_id}", response_model=schemas.TeamRead)
def get_team(team_id: int, db: Session = Depends(get_db, scope="function"),
             user: models.User | None = Depends(get_current_user_optional)):
    return _get_team_or_404(db, team_id, user)


@router.patch("/{team_id}", response_model=schemas.TeamRead)
def update_team(
    team_id: int,
    payload: schemas.TeamUpdate,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    team = _get_team_or_404(db, team_id, user)
    _require_leader(team, user)
    if payload.project_id is not None:
        if payload.project_id != team.project_id:
            raise HTTPException(403, "Não é permitido transferir equipes entre projetos")
    return crud.update_team(db, team, payload)


@router.delete("/{team_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_team(
    team_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    team = _get_team_or_404(db, team_id, user)
    _require_leader(team, user)
    crud.delete_team(db, team)


# --- Membros ---


@router.post("/{team_id}/members", response_model=schemas.TeamRead)
def add_member(
    team_id: int,
    payload: schemas.MemberAdd,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    team = _get_team_or_404(db, team_id, user)
    _require_leader(team, user)
    member = crud.get_user(db, payload.user_id)
    if member is None:
        raise HTTPException(status_code=404, detail="Usuário não encontrado")
    return crud.add_team_member(db, team, member)


@router.delete("/{team_id}/members/{user_id}", response_model=schemas.TeamRead)
def remove_member(
    team_id: int,
    user_id: int,
    db: Session = Depends(get_db, scope="function"),
    user: models.User = Depends(get_current_user),
):
    team = _get_team_or_404(db, team_id, user)
    _require_leader(team, user)
    if user_id == team.leader_id:
        raise HTTPException(status_code=400, detail="O líder não pode sair da própria equipe")
    return crud.remove_team_member(db, team, user_id)
