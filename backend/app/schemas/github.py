from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class GitHubAnalysisRequest(BaseModel):
    username: Optional[str] = None
    resume_id: Optional[str] = None


class GitHubProfileSchema(BaseModel):
    username: str
    name: Optional[str] = None
    profile_url: str
    avatar_url: Optional[str] = None
    bio: Optional[str] = None
    public_repos: int = 0
    followers: int = 0
    following: int = 0


class GitHubProjectMatchSchema(BaseModel):
    project_name: str
    matched_repo_name: Optional[str] = None
    repo_url: Optional[str] = None
    overall_score: float
    name_similarity: float
    description_similarity: float
    readme_similarity: float
    technology_overlap: float
    code_evidence: float
    verified_technologies: List[str] = []
    verification_status: str


class GitHubSkillMatchSchema(BaseModel):
    skill: str
    usage_level: str
    evidence_strength: str
    confidence: float
    evidence_score: float
    verification_status: str
    evidence_sources: List[str] = []
    repositories_count: int = 0


class GitHubEvidenceResponse(BaseModel):
    is_available: bool
    status_message: str
    github_profile: Optional[Dict[str, Any]] = None
    github_evidence_score: float = 0.0
    enhanced_ats_score: float = 0.0
    original_ats_score: float = 0.0
    repositories_analyzed: int = 0
    relevant_repositories_count: int = 0
    projects_verified_count: int = 0
    total_projects_count: int = 0
    skills_verified_count: int = 0
    total_skills_count: int = 0
    project_matches: List[GitHubProjectMatchSchema] = []
    skill_matches: List[GitHubSkillMatchSchema] = []
    activity_metrics: Optional[Dict[str, Any]] = None
    maturity_metrics: Optional[Dict[str, Any]] = None
    authenticity_analysis: Optional[Dict[str, Any]] = None
    cross_validation_matrix: List[Dict[str, Any]] = []
    mismatches: List[str] = []
