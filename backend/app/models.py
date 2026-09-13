from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
    LargeBinary,
)
from sqlalchemy.orm import relationship, deferred, column_property
from sqlalchemy import select, CheckConstraint
from sqlalchemy.sql import func

from .database import Base

# --- Tabelas de associação (muitos-para-muitos) ---

project_users = Table(
    "project_users",
    Base.metadata,
    Column("project_id", ForeignKey("project.project_id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
)

team_users = Table(
    "team_users",
    Base.metadata,
    Column("team_id", ForeignKey("team.team_id", ondelete="CASCADE"), primary_key=True),
    Column("user_id", ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
)

projects_keywords = Table(
    "projects_keywords",
    Base.metadata,
    Column("project_id", ForeignKey("project.project_id", ondelete="CASCADE"), primary_key=True),
    Column("keyword_id", ForeignKey("keywords.keyword_id", ondelete="CASCADE"), primary_key=True),
)

team_keywords = Table(
    "team_keywords",
    Base.metadata,
    Column("team_id", ForeignKey("team.team_id", ondelete="CASCADE"), primary_key=True),
    Column("keyword_id", ForeignKey("keywords.keyword_id", ondelete="CASCADE"), primary_key=True),
)

user_keywords = Table(
    "user_keywords",
    Base.metadata,
    Column("user_id", ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True),
    Column("keyword_id", ForeignKey("keywords.keyword_id", ondelete="CASCADE"), primary_key=True),
)


# --- Tabelas principais ---


class Category(Base):
    __tablename__ = "category"

    id = Column(Integer, primary_key=True)
    description = Column(Text, nullable=False)

    projects = relationship("Project", back_populates="category")


class Project(Base):
    __tablename__ = "project"

    project_id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    template = Column(String(100), nullable=True)
    status = Column(String(15), nullable=False, default="rascunho")
    visibility = Column(Boolean, nullable=False, default=True)
    created_at = Column(Date, nullable=False, server_default=func.current_date())
    category_id = Column(Integer, ForeignKey("category.id", ondelete="SET NULL"), nullable=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True, index=True)
    cover_url = Column(String(255), nullable=True)
    logo_url = Column(String(255), nullable=True)

    category = relationship("Category", back_populates="projects")
    owner = relationship("User", foreign_keys=[owner_id])
    teams = relationship("Team", back_populates="project", cascade="all, delete-orphan", passive_deletes=True)
    members = relationship("User", secondary=project_users, back_populates="projects")
    keywords = relationship("Keyword", secondary=projects_keywords, order_by="Keyword.word")
    likes = relationship("ProjectLike", cascade="all, delete-orphan", passive_deletes=True)
    comments = relationship("ProjectComment", cascade="all, delete-orphan", passive_deletes=True)



class Team(Base):
    __tablename__ = "team"

    team_id = Column(Integer, primary_key=True)
    # Nome corrigido do schema original ("tem_name").
    team_name = Column(String(255), nullable=False)
    # Nome corrigido do schema original ("propose" -> "purpose").
    purpose = Column(Text, nullable=True)
    created_at = Column(Date, nullable=False, server_default=func.current_date())
    project_id = Column(Integer, ForeignKey("project.project_id", ondelete="CASCADE"), nullable=False)
    leader_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)

    project = relationship("Project", back_populates="teams")
    leader = relationship("User", foreign_keys=[leader_id])
    members = relationship("User", secondary=team_users)
    keywords = relationship("Keyword", secondary=team_keywords)


class User(Base):
    __tablename__ = "users"

    user_id = Column(Integer, primary_key=True)
    username = Column(String(20), unique=True, nullable=False)
    first_name = Column(String(20), nullable=True)
    last_name = Column(String(100), nullable=True)
    email = Column(String(50), unique=True, nullable=False)
    user_password = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)

    projects = relationship("Project", secondary=project_users, back_populates="members")
    keywords = relationship("Keyword", secondary=user_keywords)


class Keyword(Base):
    __tablename__ = "keywords"
    __table_args__ = (CheckConstraint("length(trim(word)) BETWEEN 1 AND 20", name="keyword_word_length"),)

    keyword_id = Column(Integer, primary_key=True)
    word = Column(String(20), unique=True, nullable=False)
    popularity = Column(Integer, nullable=False, default=0)


class Post(Base):
    """Publicação no feed. Não estava no schema original — adicionada para o feed."""

    __tablename__ = "post"

    post_id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    image_url = Column(String(255), nullable=True)
    created_at = Column(Date, nullable=False, server_default=func.current_date())
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    project_id = Column(Integer, ForeignKey("project.project_id", ondelete="CASCADE"), nullable=True)

    author = relationship("User")
    project = relationship("Project")


class ProjectLike(Base):
    __tablename__ = "project_likes"

    project_id = Column(
        Integer, ForeignKey("project.project_id", ondelete="CASCADE"), primary_key=True
    )
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), primary_key=True
    )


class ProjectComment(Base):
    __tablename__ = "project_comments"

    comment_id = Column(Integer, primary_key=True)
    content = Column(Text, nullable=False)
    created_at = Column(Date, nullable=False, server_default=func.current_date())
    project_id = Column(
        Integer, ForeignKey("project.project_id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False
    )

    author = relationship("User")


class AuthSession(Base):
    __tablename__ = "auth_sessions"
    session_id = Column(String(64), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    expires_at = Column(Integer, nullable=False, index=True)


class RateBucket(Base):
    __tablename__ = "rate_buckets"
    key = Column(String(64), primary_key=True)
    window = Column(Integer, primary_key=True)
    count = Column(Integer, nullable=False)


class Upload(Base):
    __tablename__ = "media_uploads"
    upload_id = Column(String(32), primary_key=True)
    owner_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False, index=True)
    data = deferred(Column(LargeBinary, nullable=False))
    size = Column(Integer, nullable=False)
    content_type = Column(String(32), nullable=False)
    created_at = Column(Integer, nullable=False, index=True)
    resource_type = Column(String(16), nullable=True)
    resource_id = Column(Integer, nullable=True)

# Contagens no SQL: listagens não carregam todos os likes/comentários em memória.
Project.likes_count = column_property(select(func.count(ProjectLike.user_id)).where(
    ProjectLike.project_id == Project.project_id).correlate_except(ProjectLike).scalar_subquery())
Project.comments_count = column_property(select(func.count(ProjectComment.comment_id)).where(
    ProjectComment.project_id == Project.project_id).correlate_except(ProjectComment).scalar_subquery())

DATA_CHECKS = {'users': {'username_length': 'length(trim(username)) BETWEEN 3 AND 20',
           'email_length': 'length(email) BETWEEN 3 AND 50',
           'first_name_length': 'first_name IS NULL OR length(first_name) <= 20',
           'last_name_length': 'last_name IS NULL OR length(last_name) <= 100'},
 'project': {'project_name': 'length(trim(name)) BETWEEN 1 AND 100',
             'project_description': 'description IS NULL OR length(description) <= 10000',
             'project_status': "status IN ('rascunho', 'ativo', 'pausado', 'concluido')"},
 'team': {'team_name_length': 'length(trim(team_name)) BETWEEN 1 AND 255',
          'team_purpose': 'purpose IS NULL OR length(purpose) <= 5000'},
 'post': {'post_content': 'length(trim(content)) BETWEEN 1 AND 5000'},
 'project_comments': {'comment_content': 'length(trim(content)) BETWEEN 1 AND 5000'},
 'category': {'category_description': 'length(trim(description)) BETWEEN 1 AND 100'}}

for table, checks in DATA_CHECKS.items():
    for name, condition in checks.items():
        Base.metadata.tables[table].append_constraint(CheckConstraint(condition, name=name))
