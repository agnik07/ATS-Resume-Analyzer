from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.models.user import User, UserRole
from app.schemas.auth import (
    RefreshTokenRequest,
    TokenResponse,
    UserLoginRequest,
    UserProfileResponse,
    UserRegisterRequest,
)
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _user_to_profile(user: User) -> UserProfileResponse:
    return UserProfileResponse(
        id=str(user.id),
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        company_name=user.company_name,
        avatar_url=user.avatar_url,
        bio=user.bio,
        phone=user.phone,
        headline=user.headline,
        github_url=user.github_url,
        linkedin_url=user.linkedin_url,
        created_at=user.created_at,
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(req: UserRegisterRequest):
    """Register a new student or recruiter user."""
    existing = await User.find_one(User.email == req.email.lower())
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email already exists.",
        )

    user = User(
        email=req.email.lower(),
        password_hash=hash_password(req.password),
        full_name=req.full_name.strip(),
        role=req.role,
        company_name=req.company_name.strip() if req.company_name else None,
    )
    await user.insert()

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_profile(user),
    )


@router.post("/login", response_model=TokenResponse)
async def login(req: UserLoginRequest):
    """Authenticate and retrieve JWT tokens."""
    user = await User.find_one(User.email == req.email.lower())
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been disabled.",
        )

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    refresh_token = create_refresh_token(subject=str(user.id))

    return TokenResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=_user_to_profile(user),
    )


@router.post("/refresh")
async def refresh_token(req: RefreshTokenRequest):
    """Issue a new access token via valid refresh token."""
    try:
        payload = decode_token(req.refresh_token, is_refresh=True)
        user_id = payload.get("sub")
        if not user_id or payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid refresh token")
    except Exception as e:
        raise HTTPException(status_code=401, detail=f"Refresh token expired or invalid: {e}")

    user = await User.get(user_id)
    if not user or not user.is_active:
        raise HTTPException(status_code=401, detail="User not found or disabled")

    access_token = create_access_token(subject=str(user.id), role=user.role.value)
    new_refresh_token = create_refresh_token(subject=str(user.id))

    return {
        "access_token": access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.get("/me", response_model=UserProfileResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    """Return currently authenticated profile."""
    return _user_to_profile(current_user)
