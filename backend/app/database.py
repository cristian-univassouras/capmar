from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency do FastAPI: uma sessão — e uma transação — por request.

    A fronteira transacional fica aqui, não no `crud.py`: as funções de CRUD
    usam `db.flush()` e quem dá o `commit()` é esta dependency, ao final do
    request. Qualquer exceção que suba do endpoint (inclusive `HTTPException`)
    dispara o `rollback()`, de modo que uma requisição com erro não deixa
    escrita parcial no banco (US-036).
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
