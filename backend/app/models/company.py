from datetime import datetime, timezone
from typing import Any, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class Company(SupabaseModel):
    __table_name__: str = "companies"

    name: str
    slug: str
    recruiter_id: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("recruiter_id", mode="before")
    @classmethod
    def convert_recruiter_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""
