from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import crud, schemas
from ..database import get_db
from ..security import create_access_token, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def register(payload: schemas.UserCreate, db: Session = Depends(get_db)):
    if crud.get_user_by_email(db, payload.email) is not None:
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    if crud.get_user_by_username(db, payload.username) is not None:
        raise HTTPException(status_code=400, detail="Nome de usuário já em uso")
    user = crud.create_user(db, payload)
    token = create_access_token(user.user_id)
    return schemas.AuthResponse(access_token=token, user=user)


@router.post("/login", response_model=schemas.AuthResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = crud.get_user_by_email(db, payload.email)
    if user is None or not verify_password(payload.password, user.user_password):
        raise HTTPException(status_code=401, detail="E-mail ou senha inválidos")
    token = create_access_token(user.user_id)
    return schemas.AuthResponse(access_token=token, user=user)
