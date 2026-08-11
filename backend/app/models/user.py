from datetime import datetime, timezone
from enum import Enum
from typing import Optional
from pydantic import EmailStr, Field
from app.models.base import SupabaseModel


class UserRole(str, Enum):
    STUDENT = "student"
    RECRUITER = "recruiter"
    ADMIN = "admin"


class User(SupabaseModel):
    __table_name__: str = "users"

    email: EmailStr
    password_hash: str
    full_name: str
    role: UserRole = UserRole.STUDENT
    is_active: bool = True
    is_verified: bool = False
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    company_name: Optional[str] = None  # For recruiters
    phone: Optional[str] = None
    headline: Optional[str] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
