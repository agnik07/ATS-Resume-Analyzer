from datetime import datetime
from typing import List, Optional
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
    location: str
    job_type: str = "Full-time"
    experience_level: str = "Mid"
    salary_range: Optional[str] = None
    description: str = Field(..., min_length=20)
    required_skills: List[str] = []
    preferred_skills: List[str] = []
    min_ats_score: float = 60.0


class JobResponse(BaseModel):
    id: str
    title: str
    company_name: str
    company_id: str
    location: str
    job_type: str
    experience_level: str
    salary_range: Optional[str] = None
    description: str
    required_skills: List[str]
    preferred_skills: List[str]
    min_ats_score: float
    is_active: bool
    applicant_count: int = 0
    created_at: datetime


class ApplicationCreateRequest(BaseModel):
    cover_letter: Optional[str] = None
    resume_id: Optional[str] = None


class CandidateApplicationResponse(BaseModel):
    id: str
    job_id: str
    job_title: str
    student_id: str
    student_name: str
    student_email: str
    resume_id: str
    ats_score: float
    match_percentage: float
    status: ApplicationStatus
    cover_letter: Optional[str] = None
    recruiter_notes: Optional[str] = None
    ai_candidate_summary: Optional[str] = None
    ai_interview_questions: Optional[list] = None
    applied_at: datetime
