from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field
from app.models.user import UserRole


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    full_name: str = Field(..., min_length=2)
    role: UserRole = UserRole.STUDENT
    company_name: Optional[str] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class UserProfileResponse(BaseModel):
    id: str
    email: EmailStr
    full_name: str
    role: UserRole
    company_name: Optional[str] = None
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    phone: Optional[str] = None
    headline: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserProfileResponse
