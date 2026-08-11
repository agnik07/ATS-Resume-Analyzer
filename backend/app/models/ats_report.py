from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class ATSReport(SupabaseModel):
    __table_name__: str = "ats_reports"

    user_id: str
    resume_id: str
    filename: str
    overall_score: float = 0.0  # 0 to 100
    formatting_score: float = 0.0  # max 20
    keywords_score: float = 0.0  # max 25
    content_score: float = 0.0  # max 25
    skill_validation_score: float = 0.0  # max 15
    ats_compatibility_score: float = 0.0  # max 15
    interpretation: str = ""
    strengths: List[str] = Field(default_factory=list)
    critical_issues: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    issues_summary: List[str] = Field(default_factory=list)
    detailed_feedback: List[Dict[str, Any]] = Field(default_factory=list)
    recommendations: List[Dict[str, Any]] = Field(default_factory=list)
    skill_validation_details: Dict[str, Any] = Field(default_factory=dict)
    penalties: Dict[str, float] = Field(default_factory=dict)
    bonuses: Dict[str, float] = Field(default_factory=dict)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", "resume_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""
