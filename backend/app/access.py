from fastapi import HTTPException
from sqlalchemy import or_, select

from . import models


def project_access(user):
    public = models.Project.visibility.is_(True)
    if user is None:
        return public
    uid = user.user_id
    team_access = select(models.Team.project_id).where(or_(
        models.Team.leader_id == uid,
        models.Team.members.any(models.User.user_id == uid),
    ))
    return or_(public, models.Project.owner_id == uid,
               models.Project.members.any(models.User.user_id == uid),
               models.Project.project_id.in_(team_access))


def can_read_project(db, project_id, user):
    return db.scalar(select(models.Project.project_id).where(
        models.Project.project_id == project_id, project_access(user))) is not None


def require_project(db, project_id, user):
    if not can_read_project(db, project_id, user):
        raise HTTPException(404, "Projeto não encontrado")
    return db.get(models.Project, project_id)


def require_project_writer(db, project_id, user, owner_only=False):
    project = require_project(db, project_id, user)
    allowed = project.owner_id == user.user_id
    if not owner_only:
        allowed = allowed or db.scalar(select(models.Team.team_id).where(
            models.Team.project_id == project_id, models.Team.leader_id == user.user_id).limit(1)) is not None
    if not allowed:
        raise HTTPException(403, "Apenas proprietário ou líder autorizado pode realizar esta ação")
    return project
