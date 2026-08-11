from datetime import datetime, timezone
from typing import Any, Dict, List
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class CareerTestResult(SupabaseModel):
    __table_name__: str = "career_test_results"

    user_id: str
    answers: List[Dict[str, Any]] = Field(default_factory=list)
    career_path: str
    explanation: str
    strengths: List[str] = Field(default_factory=list)
    suggested_skills: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""
