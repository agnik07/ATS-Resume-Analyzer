from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class SkillGapAnalysisRequest(BaseModel):
    company: str = Field(..., min_length=1)
    role: str = Field(..., min_length=1)
    job_description: Optional[str] = None
    resume_id: Optional[str] = None  # If not provided, use latest uploaded resume
    ats_report_id: Optional[str] = None
    job_id: Optional[str] = None


class SkillGapItem(BaseModel):
    skill: str
    required_level: int
    current_level: int
    gap: int
    status: str
    importance: Optional[float] = 0.0
    demand_proficiency: Optional[float] = 0.0
    candidate_proficiency: Optional[float] = 0.0


class SkillGapResponse(BaseModel):
    id: str
    resume_id: str
    ats_report_id: Optional[str] = None
    job_id: Optional[str] = None
    target_company: str
    target_role: str
    job_description: Optional[str] = None
    match_percentage: float
    confidence_score: float
    confidence_level: str
    fallback_used: str
    resume_skills: List[str]
    job_skills: List[str]
    matched_skills: List[str]
    missing_skills: List[str]
    skill_gaps: List[SkillGapItem]
    learning_roadmap: str
    roadmap_weeks: Optional[List[Dict[str, Any]]] = None
    learning_resources: Dict[str, List[Dict[str, Any]]]
    company_dsa_problems: List[Dict[str, Any]] = []
    created_at: datetime
