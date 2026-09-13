from datetime import date
from typing import Literal
from .security import password_bytes
from .keywords import normalize_keywords

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator



class ValidatedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    @field_validator("email", check_fields=False)
    @classmethod
    def normalize_email(cls, value):
        return str(value).lower() if value is not None else None

    @model_validator(mode="before")
    @classmethod
    def validate_values(cls, values):
        if isinstance(values, dict):
            required = {"username", "email", "name", "status", "visibility", "team_name", "content", "password"}
            if cls.__name__ == "TeamUpdate":
                required.add("project_id")
            for key, value in values.items():
                if key in required and (value is None or isinstance(value, str) and not value.strip()):
                    raise ValueError(f"{key} não pode ser nulo ou vazio")
            if "password" in values and isinstance(values["password"], str):
                password_bytes(values["password"])
        return values


# --- Auth / User ---


class UserCreate(ValidatedInput):
    username: str = Field(..., min_length=3, max_length=20)
    first_name: str | None = Field(default=None, max_length=20)
    last_name: str | None = Field(default=None, max_length=100)
    email: EmailStr = Field(max_length=50)
    password: str = Field(..., min_length=6, max_length=72)


class UserRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr = Field(max_length=50)
    avatar_url: str | None = None


class PublicUser(BaseModel):
    """Dados públicos de um usuário (sem e-mail), para embutir em posts/comentários/projetos."""

    model_config = ConfigDict(from_attributes=True)

    user_id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    avatar_url: str | None = None


class UserUpdate(ValidatedInput):
    first_name: str | None = Field(default=None, max_length=20)
    last_name: str | None = Field(default=None, max_length=100)
    username: str | None = Field(default=None, min_length=3, max_length=20)
    email: EmailStr | None = Field(default=None, max_length=50)
    avatar_url: str | None = Field(default=None, max_length=255)


class LoginRequest(ValidatedInput):
    email: EmailStr = Field(max_length=50)
    password: str = Field(min_length=1, max_length=72)


class AuthResponse(BaseModel):
    user: UserRead


# --- Referência leve de projeto (para embutir em outros recursos) ---


class ProjectRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    project_id: int
    name: str


# --- Category ---


class CategoryBase(ValidatedInput):
    description: str = Field(..., min_length=1, max_length=100)


class CategoryCreate(CategoryBase):
    pass


class CategoryRead(CategoryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# --- Project ---


class ProjectBase(ValidatedInput):
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=10000)
    template: str | None = Field(default=None, max_length=100)
    status: Literal["rascunho", "ativo", "pausado", "concluido"] = "rascunho"
    visibility: bool = True
    category_id: int | None = None
    cover_url: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=255)


class KeywordRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    keyword_id: int
    word: str


class ProjectCreate(ProjectBase):
    keywords: list[str] = Field(default_factory=list, max_length=8)

    _normalize_keywords = field_validator("keywords")(normalize_keywords)


class ProjectUpdate(ValidatedInput):
    """Todos os campos opcionais — atualização parcial (PATCH)."""

    name: str | None = Field(default=None, min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=10000)
    template: str | None = Field(default=None, max_length=100)
    status: Literal["rascunho", "ativo", "pausado", "concluido"] | None = None
    visibility: bool | None = None
    category_id: int | None = None
    cover_url: str | None = Field(default=None, max_length=255)
    logo_url: str | None = Field(default=None, max_length=255)
    # Ausente mantém os vínculos; [] remove todos; null é inválido.
    keywords: list[str] = Field(default_factory=list, max_length=8)

    _normalize_keywords = field_validator("keywords")(normalize_keywords)


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
    keywords: list[KeywordRead] = Field(default_factory=list)


class ProjectPage(BaseModel):
    items: list[ProjectRead]
    total: int
    skip: int
    limit: int


# --- Team ---


class TeamBase(ValidatedInput):
    team_name: str = Field(..., min_length=1, max_length=255)
    purpose: str | None = Field(default=None, max_length=5000)
    project_id: int


class TeamCreate(TeamBase):
    pass


class TeamUpdate(ValidatedInput):
    team_name: str | None = Field(default=None, min_length=1, max_length=255)
    purpose: str | None = Field(default=None, max_length=5000)
    project_id: int | None = None


class TeamRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    team_id: int
    team_name: str
    purpose: str | None = Field(default=None, max_length=5000)
    created_at: date
    project_id: int
    leader_id: int | None = None
    project: ProjectRef | None = None
    leader: PublicUser | None = None
    members: list[PublicUser] = []


class MemberAdd(ValidatedInput):
    user_id: int


# --- Post / Publicação ---


class PostCreate(ValidatedInput):
    content: str = Field(..., min_length=1, max_length=5000)
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


class CommentCreate(ValidatedInput):
    content: str = Field(..., min_length=1, max_length=5000)


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
