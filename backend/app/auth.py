import os
import jwt
from fastapi import Header, HTTPException
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
# Only needed for projects still signing tokens with the legacy shared HS256 secret.
SUPABASE_JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")

_jwks_client = jwt.PyJWKClient(f"{SUPABASE_URL}/auth/v1/.well-known/jwks.json") if SUPABASE_URL else None


def _decode(token: str) -> dict:
    if jwt.get_unverified_header(token).get("alg") == "HS256":
        if not SUPABASE_JWT_SECRET:
            raise jwt.InvalidTokenError("HS256 tokens require SUPABASE_JWT_SECRET")
        key = SUPABASE_JWT_SECRET
    else:
        if not _jwks_client:
            raise jwt.InvalidTokenError("SUPABASE_URL is not configured")
        key = _jwks_client.get_signing_key_from_jwt(token).key
    return jwt.decode(token, key, algorithms=["ES256", "RS256", "HS256"], audience="authenticated")


def get_optional_user_id(authorization: str = Header(default=None)) -> str | None:
    """Supabase user ID from a `Bearer` token, or None for anonymous requests."""
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid authorization header.")
    try:
        return _decode(token)["sub"]
    except (jwt.PyJWTError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid or expired login. Please log in again.")


def get_current_user_id(authorization: str = Header(default=None)) -> str:
    user_id = get_optional_user_id(authorization)
    if not user_id:
        raise HTTPException(status_code=401, detail="Please log in.")
    return user_id
