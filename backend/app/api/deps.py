import logging
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sentence_transformers import SentenceTransformer
import spacy
from app.core.security import decode_token
from app.models.user import User, UserRole

logger = logging.getLogger(__name__)
security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> User:
    """Validate Bearer token and return active User instance."""
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization Bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        payload = decode_token(credentials.credentials, is_refresh=False)
        user_id = payload.get("sub")
        token_type = payload.get("type")

        if not user_id or token_type != "access":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token claims",
            )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token verification failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await User.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user account",
        )

    return user


def require_role(allowed_roles: list[UserRole]):
    """Decorator factory enforcing Role-Based Access Control."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles and current_user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Requires one of roles: {[r.value for r in allowed_roles]}",
            )
        return current_user
    return role_checker


require_student = require_role([UserRole.STUDENT])
require_recruiter = require_role([UserRole.RECRUITER])
require_admin = require_role([UserRole.ADMIN])


def get_embedder(request: Request) -> Optional[SentenceTransformer]:
    """Retrieve SentenceTransformer model from FastAPI app state."""
    return getattr(request.app.state, "embedder", None)


def get_spacy_nlp(request: Request) -> Optional[spacy.Language]:
    """Retrieve spaCy NLP instance from FastAPI app state."""
    return getattr(request.app.state, "nlp", None)
