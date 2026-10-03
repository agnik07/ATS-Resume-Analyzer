from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import Field
from app.models.base import SupabaseModel


class GitHubProfile(SupabaseModel):
    __table_name__: str = "github_profiles"

    user_id: str
    username: str
    profile_url: str
    public_repo_count: int = 0
    followers: int = 0
    following: int = 0
    retrieved_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class GitHubEvidenceRecord(SupabaseModel):
    __table_name__: str = "github_evidence"

    user_id: str
    resume_id: str
    ats_report_id: str
    github_username: str
    github_evidence_score: float = 0.0
    enhanced_ats_score: float = 0.0
    repositories_analyzed: int = 0
    projects_verified_count: int = 0
    skills_verified_count: int = 0
    project_matches: List[Dict[str, Any]] = Field(default_factory=list)
    skill_matches: List[Dict[str, Any]] = Field(default_factory=list)
    activity_metrics: Dict[str, Any] = Field(default_factory=dict)
    maturity_metrics: Dict[str, Any] = Field(default_factory=dict)
    authenticity_analysis: Dict[str, Any] = Field(default_factory=dict)
    cross_validation_matrix: List[Dict[str, Any]] = Field(default_factory=list)
    mismatches: List[str] = Field(default_factory=list)
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
