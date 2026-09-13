from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas, models
from ..deps import get_current_user
from ..database import get_db

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", response_model=list[schemas.CategoryRead])
def list_categories(db: Session = Depends(get_db, scope="function")):
    return crud.list_categories(db)


@router.post("", response_model=schemas.CategoryRead, status_code=status.HTTP_201_CREATED)
def create_category(payload: schemas.CategoryCreate, user: models.User = Depends(get_current_user)):
    raise HTTPException(403, "Criação de categorias desabilitada até existir papel administrativo")
