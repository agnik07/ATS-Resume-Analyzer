from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class ApplicationStatus(str, Enum):
    APPLIED = "applied"
    REVIEWING = "reviewing"
    SHORTLISTED = "shortlisted"
    REJECTED = "rejected"
    OFFERED = "offered"


class Application(SupabaseModel):
    __table_name__: str = "applications"

    job_id: str
    student_id: str
    resume_id: str
    ats_report_id: Optional[str] = None
    ats_score: float = 0.0
    match_percentage: float = 0.0
    status: ApplicationStatus = ApplicationStatus.APPLIED
    cover_letter: Optional[str] = None
    recruiter_notes: Optional[str] = None
    ai_candidate_summary: Optional[str] = None
    ai_interview_questions: Optional[List[Any]] = Field(default_factory=list)
    applied_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("job_id", "student_id", "resume_id", "ats_report_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if hasattr(v, "id"):
            return str(v.id)
        return str(v)
