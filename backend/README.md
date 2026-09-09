# CapMar - Backend ⚙️

Este é o cérebro da plataforma CapMar. Uma API RESTful projetada para lidar com cadastros de projetos, equipes, usuários e comunicação com o banco de dados.

## 🛠️ Tecnologias Utilizadas
- **Linguagem:** Python 3.10+
- **Framework Web:** FastAPI
- **Servidor ASGI:** Uvicorn
- **ORM:** SQLAlchemy 2.0
- **Validação de Dados:** Pydantic v2
- **Banco de Dados:** PostgreSQL 16

## 📂 Estrutura
```
backend/
  app/
    main.py        # cria o app, CORS, cria tabelas no startup, seed de categorias
    config.py      # settings via env (.env) — DATABASE_URL, CORS_ORIGINS
    database.py    # engine, SessionLocal, Base, get_db()
    models.py      # todas as tabelas do schema (CATEGORY, PROJECT, TEAM, USERS, KEYWORDS + M2M)
    schemas.py     # Pydantic v2 (Category, Project)
    crud.py        # funções de acesso a dados
    routers/
      projects.py    # CRUD de projetos
      categories.py  # listar/criar categorias
  Dockerfile
  requirements.txt
```

## 🌐 Endpoints
- `GET  /health`
- `GET  /categories`, `POST /categories`
- `GET  /projects`, `POST /projects`, `GET /projects/{id}`, `PATCH /projects/{id}`, `DELETE /projects/{id}`
- Docs interativas: `http://localhost:8000/docs`

## 🚀 Como Rodar

### Via Docker (recomendado — sobe API + Postgres juntos)
A partir da **raiz do repositório**:
```bash
docker compose up --build
```
API em `http://localhost:8000`, Postgres em `localhost:5432`.

### Localmente (sem Docker)
Requer um Postgres 16 acessível. Configure a `DATABASE_URL` em `.env` (veja `.env.example`).
```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

## 🗄️ Banco de Dados
As tabelas são criadas automaticamente no startup (`Base.metadata.create_all`) — adequado para o MVP.
Quando o schema estabilizar, migrar para **Alembic**. O schema de origem está em `Database Schema.txt`
(corrigidos no código: `tem_name` → `team_name`, `propose` → `purpose`).
