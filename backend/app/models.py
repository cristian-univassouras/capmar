from sqlalchemy import (
    Boolean,
    Column,
    Date,
    ForeignKey,
    Integer,
    String,
    Table,
    Text,
)
from sqlalchemy.orm import relationship
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
    category_id = Column(Integer, ForeignKey("category.id", ondelete="SET NULL"), nullable=True)
    owner_id = Column(Integer, ForeignKey("users.user_id", ondelete="SET NULL"), nullable=True)
    cover_url = Column(String(255), nullable=True)
    logo_url = Column(String(255), nullable=True)

    category = relationship("Category", back_populates="projects")
    owner = relationship("User", foreign_keys=[owner_id])
    teams = relationship("Team", back_populates="project", cascade="all, delete-orphan")
    members = relationship("User", secondary=project_users, back_populates="projects")
    keywords = relationship("Keyword", secondary=projects_keywords)
    likes = relationship("ProjectLike", cascade="all, delete-orphan")
    comments = relationship("ProjectComment", cascade="all, delete-orphan")

    @property
    def likes_count(self) -> int:
        return len(self.likes)

    @property
    def comments_count(self) -> int:
        return len(self.comments)


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
    project_id = Column(Integer, ForeignKey("project.project_id", ondelete="SET NULL"), nullable=True)

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
