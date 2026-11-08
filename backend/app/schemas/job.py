from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field
from app.models.application import ApplicationStatus


class CompanyCreateRequest(BaseModel):
    name: str = Field(..., min_length=2)
    logo_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None


class CompanyResponse(BaseModel):
    id: str
    name: str
    slug: str
    logo_url: Optional[str] = None
    website: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    industry: Optional[str] = None


class JobCreateRequest(BaseModel):
    title: str = Field(..., min_length=2)
    company_id: str
    company_name: Optional[str] = None
    company_logo_url: Optional[str] = None
    location: str = "Remote"
    job_type: str = "Full-time"
    experience_level: str = "Mid"
    salary_range: Optional[str] = None
    description: str = Field(..., min_length=20)
    responsibilities: List[str] = []
    qualifications: List[str] = []
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    min_ats_score: float = Field(default=60.0, ge=0.0, le=100.0)
    enforce_threshold: bool = True
    disclose_threshold: bool = True
    deadline: Optional[datetime] = None
    status: str = "active"


class JobUpdateRequest(BaseModel):
    title: Optional[str] = None
    location: Optional[str] = None
    job_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_range: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[List[str]] = None
    qualifications: Optional[List[str]] = None
    required_skills: Optional[List[str]] = None
    preferred_skills: Optional[List[str]] = None
    min_ats_score: Optional[float] = Field(default=None, ge=0.0, le=100.0)
    enforce_threshold: Optional[bool] = None
    disclose_threshold: Optional[bool] = None
    deadline: Optional[datetime] = None
    status: Optional[str] = None
    is_active: Optional[bool] = None


class JobResponse(BaseModel):
    id: str
    title: str
    company_name: str
    company_id: str
    company_logo_url: Optional[str] = None
    location: str
    job_type: str
    experience_level: str
    salary_range: Optional[str] = None
    description: str
    responsibilities: List[str] = []
    qualifications: List[str] = []
    required_skills: List[str]
    preferred_skills: List[str]
    min_ats_score: float
    enforce_threshold: bool = True
    disclose_threshold: bool = True
    deadline: Optional[datetime] = None
    status: str = "active"
    is_active: bool
    applicant_count: int = 0
    has_applied: Optional[bool] = None
    created_at: datetime


class ApplicationCreateRequest(BaseModel):
    resume_id: Optional[str] = None
    ats_report_id: Optional[str] = None
    cover_letter: Optional[str] = None


class StudentApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: str
    company_name: str
    company_logo_url: Optional[str] = None
    location: str
    job_type: str
    ats_score: float
    enhanced_ats_score: Optional[float] = None
    min_ats_score: float
    match_percentage: float
    status: ApplicationStatus
    applied_at: datetime
    updated_at: Optional[datetime] = None
    recruiter_notes: Optional[str] = None
    ats_report_id: Optional[str] = None
    skill_gap_report_id: Optional[str] = None
    resume_id: str


class ValidatedSkillItem(BaseModel):
    skill: str
    evidence: List[str] = []
    similarity: Optional[float] = 1.0
    source: str = "project"


class CandidateProjectItem(BaseModel):
    title: str
    description: Optional[str] = ""
    technologies: List[str] = []
    github_url: Optional[str] = None
    live_url: Optional[str] = None
    verification_status: str = "Resume Project"  # "Verified on GitHub", "Repository Linked", "Resume Project"
    relevance_score: float = 0.0
    matched_skills: List[str] = []


class CandidateApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: str
    student_id: str
    student_name: str
    student_email: str
    resume_id: str
    ats_report_id: Optional[str] = None
    skill_gap_report_id: Optional[str] = None
    ats_score: float
    enhanced_ats_score: Optional[float] = 0.0
    min_ats_score: float = 60.0
    is_eligible: bool = True
    score_difference: float = 0.0
    github_evidence_score: Optional[float] = 0.0
    formatting_score: Optional[float] = 0.0
    keywords_score: Optional[float] = 0.0
    content_score: Optional[float] = 0.0
    skill_validation_score: Optional[float] = 0.0
    ats_compatibility_score: Optional[float] = 0.0
    match_percentage: float
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    recruiter_notes: Optional[str] = None
    ai_candidate_summary: Optional[str] = None
    ai_interview_questions: Optional[list] = None
    github_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    website_url: Optional[str] = None
    phone: Optional[str] = None
    file_url: Optional[str] = None
    extracted_skills: Optional[List[str]] = []
    matching_skills: Optional[List[str]] = []
    validated_skills: Optional[List[str]] = []
    validated_skills_items: Optional[List[ValidatedSkillItem]] = []
    unverified_skills: Optional[List[str]] = []
    missing_skills: Optional[List[str]] = []
    projects: Optional[List[CandidateProjectItem]] = []
    experience: Optional[List[Dict[str, Any]]] = []
    education: Optional[List[Dict[str, Any]]] = []
    certifications: Optional[List[str]] = []
    raw_text: Optional[str] = None
    filename: Optional[str] = None
    file_type: Optional[str] = "pdf"
    audit_logs: Optional[List[Dict[str, Any]]] = []
    applied_at: datetime


class JobAnalyticsItem(BaseModel):
    job_id: str
    title: str
    company_name: str
    status: str
    is_active: bool
    min_ats_score: float
    total_applications: int
    meeting_threshold: int
    shortlisted_count: int
    avg_ats_score: float
    created_at: datetime


class ApplicationTrendItem(BaseModel):
    date: str
    applications: int
    meeting_threshold: int


class RecruiterStatsResponse(BaseModel):
    total_jobs: int
    active_jobs: int
    total_applications: int
    total_candidates: int = 0
    meeting_threshold_candidates: int = 0
    reviewing_candidates: int = 0
    shortlisted_candidates: int = 0
    rejected_candidates: int = 0
    offered_candidates: int = 0
    avg_ats_score: float = 0.0
    average_candidate_ats_score: float = 0.0
    job_analytics: List[JobAnalyticsItem] = []
    application_trends: List[ApplicationTrendItem] = []


class CandidateCompareRequest(BaseModel):
    application_ids: List[str] = Field(..., min_length=2, max_length=5)


class CandidateCompareItem(BaseModel):
    application_id: str
    student_id: str
    student_name: str
    student_email: str
    job_id: str
    job_title: str
    ats_score: float
    enhanced_ats_score: float
    min_ats_score: float
    score_difference: float
    is_eligible: bool
    match_percentage: float
    github_evidence_score: float
    status: ApplicationStatus
    validated_skills_count: int
    validated_skills: List[str]
    unverified_skills: List[str]
    missing_skills: List[str]
    skill_coverage_percentage: float
    projects_count: int
    top_projects: List[CandidateProjectItem]
    experience_summary: str
    education_summary: str
    certifications: List[str] = []
    applied_at: datetime


class CandidateCompareResponse(BaseModel):
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    min_ats_score: Optional[float] = 0.0
    candidates: List[CandidateCompareItem]

