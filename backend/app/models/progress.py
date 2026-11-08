from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import Field, field_validator
from app.models.base import SupabaseModel


class UserRoadmapProgress(SupabaseModel):
    __table_name__: str = "user_roadmap_progress"

    user_id: str
    report_id: Optional[str] = None
    completed_resources: List[str] = Field(default_factory=list)  # URLs of completed resources
    completed_objectives: List[str] = Field(default_factory=list)  # IDs/strings of completed objectives
    week_completion: Dict[str, bool] = Field(default_factory=dict)
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", "report_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> Optional[str]:
        if v is None:
            return None
        if hasattr(v, "id"):
            return str(v.id)
        return str(v)


class UserDSAProgress(SupabaseModel):
    __table_name__: str = "user_dsa_progress"

    user_id: str
    problem_id: str
    problem_title: Optional[str] = None
    company: Optional[str] = None
    difficulty: Optional[str] = None
    is_solved: bool = True
    solved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

    @field_validator("user_id", mode="before")
    @classmethod
    def convert_reference_id(cls, v: Any) -> str:
        if hasattr(v, "id"):
            return str(v.id)
        return str(v) if v is not None else ""

