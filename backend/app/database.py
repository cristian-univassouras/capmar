from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.exc import IntegrityError, OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker

from .config import settings

engine = create_engine(settings.database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Usar Depends(scope='function'): commit antes de enviar qualquer resposta."""
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=409, detail="Conflito de integridade; atualize os dados e tente novamente") from exc
    except OperationalError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail="Banco indisponível ou operação concorrente; tente novamente") from exc
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()
