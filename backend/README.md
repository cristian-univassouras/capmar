# CapMar - Backend ⚙️

Este é o cérebro da plataforma CapMar. Uma API RESTful projetada para lidar com cadastros de projetos, equipes, usuários e comunicação com o banco de dados.

## 🛠️ Tecnologias Utilizadas
- **Linguagem:** Python 3.12+
- **Framework Web:** FastAPI
- **Servidor ASGI:** Uvicorn
- **ORM:** SQLAlchemy 2.0
- **Validação de Dados:** Pydantic v2
- **Banco de Dados:** PostgreSQL 16

## 📂 Estrutura
```
backend/
  app/
    main.py        # cria o app, CORS, proteção de requisições, verifica versão do schema
    config.py      # settings via env (.env) — DATABASE_URL, CORS_ORIGINS
    database.py    # engine, SessionLocal, Base, get_db()
    models.py      # todas as tabelas do schema (CATEGORY, PROJECT, TEAM, USERS, KEYWORDS + M2M)
    schemas.py     # Pydantic v2 (Category, Project)
    crud.py        # funções de acesso a dados
    routers/
      projects.py    # CRUD de projetos
      categories.py  # listar categorias; escrita administrativa desabilitada
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
alembic upgrade head
uvicorn app.main:app --reload
```

## 🗄️ Banco de Dados
A evolução do schema usa migrações Alembic versionadas. Execute `alembic upgrade head` antes de iniciar a API; o compose inclui um serviço de migração. A API não cria nem altera tabelas no startup.

Configuração obrigatória de produção, papéis do banco, cookies/CSRF, matriz de acesso, importação de uploads legados e testes estão em [Segurança e integridade](../docs/seguranca-integridade.md).
