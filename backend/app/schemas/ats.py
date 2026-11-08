from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel


class ComponentScores(BaseModel):
    formatting: float
    keywords: float
    content: float
    skill_validation: float
    ats_compatibility: float


class SkillValidationDetails(BaseModel):
    validated: List[Dict[str, Any]] = []
    unvalidated: List[str] = []
    total: int = 0
    validated_count: int = 0
    validation_pct: float = 0.0


class ATSAnalysisResponse(BaseModel):
    id: str
    resume_id: str
    filename: str
    overall_score: float
    component_scores: ComponentScores
    interpretation: str
    strengths: List[str] = []
    critical_issues: List[str] = []
    suggestions: List[str] = []
    issues_summary: List[str] = []
    detailed_feedback: List[Dict[str, Any]] = []
    recommendations: List[Dict[str, Any]] = []
    skill_validation_details: SkillValidationDetails
    extracted_skills: List[str] = []
    github_evidence_score: Optional[float] = 0.0
    enhanced_ats_score: Optional[float] = 0.0
    github_evidence: Optional[Dict[str, Any]] = None
    target_company: Optional[str] = None
    target_role: Optional[str] = None
    job_description: Optional[str] = None
    job_id: Optional[str] = None
    skill_gap_report_id: Optional[str] = None
    match_percentage: Optional[float] = None
    created_at: datetime


class ATSReportListItem(BaseModel):
    id: str
    resume_id: str
    filename: str
    overall_score: float
    enhanced_ats_score: Optional[float] = 0.0
    target_company: Optional[str] = None
    target_role: Optional[str] = None
    interpretation: str
    created_at: datetime
