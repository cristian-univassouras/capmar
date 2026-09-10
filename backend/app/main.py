import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import select, text

from . import models
from .config import settings
from .database import Base, SessionLocal, engine
from .routers import auth, categories, keywords, posts, projects, teams, uploads, users

# Categorias iniciais para facilitar o cadastro de projetos.
SEED_CATEGORIES = [
    "Gastronomia",
    "Artesanato",
    "Tecnologia",
    "Turismo",
    "Moda",
    "Serviços",
    "Educação",
    "Sustentabilidade",
]


# Colunas adicionadas após a 1ª criação das tabelas. create_all() não altera
# tabelas existentes, então garantimos as novas colunas de forma idempotente.
# (Stopgap de MVP — substituir por Alembic quando o schema estabilizar.)
_SCHEMA_PATCHES = [
    "ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url VARCHAR(255)",
    "ALTER TABLE project ADD COLUMN IF NOT EXISTS owner_id INTEGER",
    "ALTER TABLE project ADD COLUMN IF NOT EXISTS cover_url VARCHAR(255)",
    "ALTER TABLE project ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255)",
    "ALTER TABLE post ADD COLUMN IF NOT EXISTS image_url VARCHAR(255)",
    "ALTER TABLE team ADD COLUMN IF NOT EXISTS leader_id INTEGER",
]


def ensure_schema() -> None:
    with engine.begin() as conn:
        for statement in _SCHEMA_PATCHES:
            conn.execute(text(statement))


def seed_categories() -> None:
    with SessionLocal() as db:
        if db.scalar(select(models.Category).limit(1)) is not None:
            return
        db.add_all([models.Category(description=desc) for desc in SEED_CATEGORIES])
        db.commit()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # MVP: cria as tabelas no startup. Trocar por Alembic quando o schema estabilizar.
    Base.metadata.create_all(bind=engine)
    ensure_schema()
    os.makedirs(settings.upload_dir, exist_ok=True)
    seed_categories()
    yield


app = FastAPI(title="CapMar API", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(categories.router)
app.include_router(keywords.router)
app.include_router(projects.router)
app.include_router(teams.router)
app.include_router(users.router)
app.include_router(posts.router)
app.include_router(uploads.router)

# Servir as imagens enviadas. O diretório é criado no lifespan.
os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
