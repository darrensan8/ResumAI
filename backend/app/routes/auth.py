import uuid

from fastapi import APIRouter, Cookie, Depends, Header, HTTPException
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.services.auth import (
    claim_session,
    create_token,
    get_current_user,
    hash_password,
    validate_password,
    verify_password,
)

router = APIRouter()


class Credentials(BaseModel):
    email: EmailStr
    # bcrypt only uses the first 72 bytes of a password.
    password: str = Field(min_length=1, max_length=72)


def _auth_response(user: User) -> dict:
    return {"token": create_token(user.id), "user": {"id": user.id, "email": user.email}}


@router.post("/signup")
def signup(
    credentials: Credentials,
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    db: Session = Depends(get_db),
):
    failed = validate_password(credentials.password)
    if failed:
        raise HTTPException(status_code=422, detail={"message": "Password is too weak.", "failed_rules": failed})

    email = credentials.email.lower()
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="An account with this email already exists.")

    user = User(id=str(uuid.uuid4()), email=email, password_hash=hash_password(credentials.password))
    db.add(user)
    db.commit()

    claim_session(db, user.id, session_id or x_session_id)
    return _auth_response(user)


@router.post("/login")
def login(
    credentials: Credentials,
    session_id: str = Cookie(default=None),
    x_session_id: str = Header(default=None),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.email == credentials.email.lower()).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    claim_session(db, user.id, session_id or x_session_id)
    return _auth_response(user)


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {"id": user.id, "email": user.email}
