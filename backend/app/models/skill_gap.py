from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class SkillGapReport(SupabaseModel):
    __table_name__: str = "skill_gap_reports"

    user_id: str
    resume_id: str
    job_id: Optional[str] = None
    target_company: str
    target_role: str
    match_percentage: float
    confidence_score: float = 0.0
    confidence_level: str = "Medium"
    fallback_used: str = "NONE"
    resume_skills: List[str] = Field(default_factory=list)
    job_skills: List[str] = Field(default_factory=list)
    matched_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    skill_gaps: List[Dict[str, Any]] = Field(default_factory=list)
    learning_roadmap: str = ""
    learning_resources: Dict[str, List[Dict[str, Any]]] = Field(default_factory=dict)
    company_dsa_problems: List[Dict[str, Any]] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", "resume_id", "job_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if hasattr(v, "id"):
            return str(v.id)
        return str(v)
