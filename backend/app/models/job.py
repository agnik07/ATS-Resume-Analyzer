from datetime import datetime, timezone
from typing import Any, List, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class Job(SupabaseModel):
    __table_name__: str = "jobs"

    title: str
    company_id: str
    recruiter_id: str
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location: str
    job_type: str = "Full-time"  # Full-time, Remote, Hybrid, Internship
    experience_level: str = "Mid"  # Entry, Mid, Senior, Lead
    salary_range: Optional[str] = None
    description: str
    responsibilities: List[str] = Field(default_factory=list)
    qualifications: List[str] = Field(default_factory=list)
    required_skills: List[str] = Field(default_factory=list)
    preferred_skills: List[str] = Field(default_factory=list)
    keywords: List[str] = Field(default_factory=list)
    min_ats_score: float = 60.0
    enforce_threshold: bool = True
    disclose_threshold: bool = True
    deadline: Optional[datetime] = None
    status: str = "active"  # "active", "closed", "draft"
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("company_id", "recruiter_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""
