from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from starlette.responses import JSONResponse

from .config import settings
from .database import engine
from .middleware import RequestProtection
from .limits import consume, client_ip
from .recovery import router as recovery_router
from .routers import admin, account_security, chat, auth, categories, posts, projects, teams, uploads, users


@asynccontextmanager
async def lifespan(app: FastAPI):
    # DDL e seeds pertencem ao comando de migração, nunca ao usuário da aplicação.
    with engine.connect() as conn:
        if conn.scalar(text("SELECT version_num FROM alembic_version")) != "0006_portfolio_recovery":
            raise RuntimeError("Banco desatualizado: execute alembic upgrade head com a credencial de migração")
    yield


app = FastAPI(title="CapMar API", version="0.2.0", lifespan=lifespan)
app.include_router(recovery_router)


@app.middleware("http")
async def write_limits(request: Request, call_next):
    if request.method not in ("GET", "HEAD", "OPTIONS") and not request.url.path.startswith("/auth/"):
        from starlette.concurrency import run_in_threadpool
        try:
            await run_in_threadpool(consume, "write-ip:" + client_ip(request), settings.write_limit, 60)
        except HTTPException as exc:
            return JSONResponse({"detail": exc.detail}, exc.status_code, headers=exc.headers)
    return await call_next(request)


app.add_middleware(RequestProtection)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins_list,
                   allow_credentials=True,
                   allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
                   allow_headers=["Content-Type", "X-CSRF-Protection"])

for router in (admin.router, account_security.router, chat.router, auth.router, categories.router, projects.router, teams.router,
               users.router, posts.router, uploads.router):
    app.include_router(router)


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}
