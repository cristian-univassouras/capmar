from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from . import models, schemas
from .security import hash_password


# --- User / Auth ---


def get_user_by_email(db: Session, email: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.email == email))


def get_user_by_username(db: Session, username: str) -> models.User | None:
    return db.scalar(select(models.User).where(models.User.username == username))


def create_user(db: Session, data: schemas.UserCreate) -> models.User:
    user = models.User(
        username=data.username,
        first_name=data.first_name,
        last_name=data.last_name,
        email=data.email,
        user_password=hash_password(data.password),
    )
    db.add(user)
    db.flush()
    db.refresh(user)
    return user


def get_user(db: Session, user_id: int) -> models.User | None:
    return db.get(models.User, user_id)


def list_users(db: Session) -> list[models.User]:
    return list(db.scalars(select(models.User).order_by(models.User.user_id)))


def update_user(db: Session, user: models.User, data: schemas.UserUpdate) -> models.User:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.flush()
    db.refresh(user)
    return user


# --- Category ---


def list_categories(db: Session) -> list[models.Category]:
    return list(db.scalars(select(models.Category).order_by(models.Category.id)))


def get_category(db: Session, category_id: int) -> models.Category | None:
    return db.get(models.Category, category_id)


def create_category(db: Session, data: schemas.CategoryCreate) -> models.Category:
    category = models.Category(**data.model_dump())
    db.add(category)
    db.flush()
    db.refresh(category)
    return category


# --- Project ---


_PROJECT_LOADS = (
    selectinload(models.Project.category),
    selectinload(models.Project.owner),
    selectinload(models.Project.likes),
    selectinload(models.Project.comments),
)


def list_projects(db: Session, skip: int = 0, limit: int = 100) -> list[models.Project]:
    stmt = (
        select(models.Project)
        .options(*_PROJECT_LOADS)
        .order_by(models.Project.project_id.desc())
        .offset(skip)
        .limit(limit)
    )
    return list(db.scalars(stmt))


def get_project(db: Session, project_id: int) -> models.Project | None:
    stmt = select(models.Project).options(*_PROJECT_LOADS).where(
        models.Project.project_id == project_id
    )
    return db.scalar(stmt)


def create_project(db: Session, data: schemas.ProjectCreate, owner_id: int) -> models.Project:
    project = models.Project(**data.model_dump(), owner_id=owner_id)
    db.add(project)
    db.flush()
    db.refresh(project)
    return get_project(db, project.project_id)


def update_project(
    db: Session, project: models.Project, data: schemas.ProjectUpdate
) -> models.Project:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(project, field, value)
    db.flush()
    db.refresh(project)
    return project


def delete_project(db: Session, project: models.Project) -> None:
    db.delete(project)
    db.flush()


# --- Team ---


_TEAM_LOADS = (
    selectinload(models.Team.project),
    selectinload(models.Team.leader),
    selectinload(models.Team.members),
)


def list_teams(db: Session, project_id: int | None = None) -> list[models.Team]:
    stmt = select(models.Team).options(*_TEAM_LOADS).order_by(models.Team.team_id.desc())
    if project_id is not None:
        stmt = stmt.where(models.Team.project_id == project_id)
    return list(db.scalars(stmt))


def get_team(db: Session, team_id: int) -> models.Team | None:
    stmt = select(models.Team).options(*_TEAM_LOADS).where(models.Team.team_id == team_id)
    return db.scalar(stmt)


def create_team(db: Session, data: schemas.TeamCreate, leader_id: int) -> models.Team:
    team = models.Team(**data.model_dump(), leader_id=leader_id)
    db.add(team)
    db.flush()
    db.refresh(team)
    # O criador é o líder e já entra como membro.
    leader = db.get(models.User, leader_id)
    if leader is not None:
        team.members.append(leader)
        db.flush()
    return get_team(db, team.team_id)


def update_team(db: Session, team: models.Team, data: schemas.TeamUpdate) -> models.Team:
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(team, field, value)
    db.flush()
    return get_team(db, team.team_id)


def delete_team(db: Session, team: models.Team) -> None:
    db.delete(team)
    db.flush()


def add_team_member(db: Session, team: models.Team, user: models.User) -> models.Team:
    if all(m.user_id != user.user_id for m in team.members):
        team.members.append(user)
        db.flush()
    return get_team(db, team.team_id)


def remove_team_member(db: Session, team: models.Team, user_id: int) -> models.Team:
    team.members = [m for m in team.members if m.user_id != user_id]
    db.flush()
    return get_team(db, team.team_id)


# --- Post / Publicação ---


def list_posts(db: Session, user_id: int | None = None) -> list[models.Post]:
    stmt = (
        select(models.Post)
        .options(selectinload(models.Post.author), selectinload(models.Post.project))
        .order_by(models.Post.post_id.desc())
    )
    if user_id is not None:
        stmt = stmt.where(models.Post.user_id == user_id)
    return list(db.scalars(stmt))


def get_post(db: Session, post_id: int) -> models.Post | None:
    return db.get(models.Post, post_id)


def create_post(db: Session, data: schemas.PostCreate, user_id: int) -> models.Post:
    post = models.Post(**data.model_dump(), user_id=user_id)
    db.add(post)
    db.flush()
    db.refresh(post)
    return post


def delete_post(db: Session, post: models.Post) -> None:
    db.delete(post)
    db.flush()


# --- Likes de projeto ---


def get_like(db: Session, project_id: int, user_id: int) -> models.ProjectLike | None:
    return db.get(models.ProjectLike, {"project_id": project_id, "user_id": user_id})


def add_like(db: Session, project_id: int, user_id: int) -> None:
    if get_like(db, project_id, user_id) is None:
        db.add(models.ProjectLike(project_id=project_id, user_id=user_id))
        db.flush()


def remove_like(db: Session, project_id: int, user_id: int) -> None:
    like = get_like(db, project_id, user_id)
    if like is not None:
        db.delete(like)
        db.flush()


def count_likes(db: Session, project_id: int) -> int:
    return db.scalar(
        select(func.count())
        .select_from(models.ProjectLike)
        .where(models.ProjectLike.project_id == project_id)
    ) or 0


# --- Comentários de projeto ---


def list_comments(db: Session, project_id: int) -> list[models.ProjectComment]:
    stmt = (
        select(models.ProjectComment)
        .options(selectinload(models.ProjectComment.author))
        .where(models.ProjectComment.project_id == project_id)
        .order_by(models.ProjectComment.comment_id.desc())
    )
    return list(db.scalars(stmt))


def get_comment(db: Session, comment_id: int) -> models.ProjectComment | None:
    return db.get(models.ProjectComment, comment_id)


def create_comment(
    db: Session, project_id: int, user_id: int, content: str
) -> models.ProjectComment:
    comment = models.ProjectComment(project_id=project_id, user_id=user_id, content=content)
    db.add(comment)
    db.flush()
    db.refresh(comment)
    return comment


def delete_comment(db: Session, comment: models.ProjectComment) -> None:
    db.delete(comment)
    db.flush()
