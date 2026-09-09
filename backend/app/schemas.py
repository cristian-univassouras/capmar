from datetime import date

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# --- Auth / User ---


class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    first_name: str | None = Field(default=None, max_length=20)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr
    avatar_url: str | None = None


class PublicUser(BaseModel):
    """Dados públicos de um usuário (sem e-mail), para embutir em posts/comentários/projetos."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class UserUpdate(BaseModel):
    first_name: str | None = Field(default=None, max_length=20)
    last_name: str | None = Field(default=None, max_length=100)
    username: str | None = Field(default=None, min_length=3, max_length=20)
    email: EmailStr | None = None
    avatar_url: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserRead


# --- Referência leve de projeto (para embutir em outros recursos) ---


class ProjectRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    name: str


# --- Category ---


class CategoryBase(BaseModel):
    description: str = Field(..., min_length=1)


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# --- Project ---


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    template: str | None = Field(default=None, max_length=100)
    status: str = Field(default="rascunho", max_length=15)
    visibility: bool = True
    category_id: int | None = None
    cover_url: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=255)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    """Todos os campos opcionais — atualização parcial (PATCH)."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = None
    template: str | None = Field(default=None, max_length=100)
    status: str | None = Field(default=None, max_length=15)
    visibility: bool | None = None
    category_id: int | None = None
    cover_url: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=255)


class ProjectRead(ProjectBase):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    created_at: date
    owner_id: int | None = None
    category: CategoryRead | None = None
    owner: PublicUser | None = None
    likes_count: int = 0
    comments_count: int = 0
    liked_by_me: bool = False


# --- Team ---


class TeamBase(BaseModel):
    team_name: str = Field(..., min_length=1, max_length=255)
    purpose: str | None = None
    project_id: int


class TeamCreate(TeamBase):
    pass


class TeamUpdate(BaseModel):
    team_name: str | None = Field(default=None, min_length=1, max_length=255)
    purpose: str | None = None
    project_id: int | None = None


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: int
    team_name: str
    purpose: str | None = None
    created_at: date
    project_id: int
    leader_id: int | None = None
    project: ProjectRef | None = None
    leader: PublicUser | None = None
    members: list[PublicUser] = []


class MemberAdd(BaseModel):
    user_id: int


# --- Post / Publicação ---


class PostCreate(BaseModel):
    content: str = Field(..., min_length=1)
    project_id: int | None = None
    image_url: str | None = Field(default=None, max_length=255)


class PostRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    post_id: int
    content: str
    image_url: str | None = None
    created_at: date
    user_id: int
    author: PublicUser | None = None
    project: ProjectRef | None = None


# --- Comentários / Likes de projeto ---


class CommentCreate(BaseModel):
    content: str = Field(..., min_length=1)


class CommentRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    comment_id: int
    content: str
    created_at: date
    user_id: int
    author: PublicUser | None = None


class LikeStatus(BaseModel):
    liked: bool
    likes_count: int


class UploadResponse(BaseModel):
    url: str
