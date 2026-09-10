from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db

router = APIRouter(prefix="/keywords", tags=["keywords"])


@router.get("", response_model=list[schemas.KeywordRead])
def list_keywords(
    limit: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Palavras-chave mais populares — alimenta o autocomplete de tags (US-009)."""
    return crud.list_keywords(db, limit=limit)
