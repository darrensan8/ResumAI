import os
import re
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnalysisHistory, User

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
TOKEN_TTL = timedelta(days=30)

# Mirrored in frontend/src/lib/password.ts — keep the two lists in sync.
PASSWORD_RULES = [
    (r".{10,}", "At least 10 characters"),
    (r"[A-Z]", "At least 1 uppercase letter"),
    (r"[a-z]", "At least 1 lowercase letter"),
    (r"[0-9]", "At least 1 number"),
    (r"[^A-Za-z0-9]", "At least 1 special character"),
]


def validate_password(password: str) -> list[str]:
    """Return the rules the password fails (empty list means it is valid)."""
    return [label for pattern, label in PASSWORD_RULES if not re.search(pattern, password)]


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode(), password_hash.encode())


def _secret() -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="Server auth is not configured.")
    return JWT_SECRET


def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + TOKEN_TTL}
    return jwt.encode(payload, _secret(), algorithm=JWT_ALGORITHM)


def _user_from_header(db: Session, authorization: str | None) -> User | None:
    if not authorization or not authorization.lower().startswith("bearer "):
        return None
    try:
        payload = jwt.decode(authorization[7:], _secret(), algorithms=[JWT_ALGORITHM])
    except jwt.PyJWTError:
        return None
    return db.query(User).filter(User.id == payload.get("sub")).first()


def get_current_user(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
) -> User:
    user = _user_from_header(db, authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Not logged in.")
    return user


def get_optional_user(
    authorization: str = Header(default=None),
    db: Session = Depends(get_db),
) -> User | None:
    """Like get_current_user, but anonymous (or expired-token) requests get None instead of a 401."""
    return _user_from_header(db, authorization)


def claim_session(db: Session, user_id: str, session_id: str | None) -> None:
    """Attach analyses run anonymously in this session to the user who just logged in."""
    if not session_id:
        return
    db.query(AnalysisHistory).filter(
        AnalysisHistory.session_id == session_id,
        AnalysisHistory.user_id.is_(None),
    ).update({AnalysisHistory.user_id: user_id}, synchronize_session=False)
    db.commit()
